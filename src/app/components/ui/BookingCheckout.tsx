"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";
import {
  attachReceipt,
  checkoutStep,
  clock,
  createReceiptUploadSignature,
  getBooking,
  peso,
  startBookingCheckout,
  type BookingDetail,
} from "@auth/bookingApi";
import CheckoutSteps from "./CheckoutSteps";
import HoldCountdown from "./HoldCountdown";
import {
  ConfirmingPayment,
  OnlinePaymentPanel,
  PaidLate,
  useReturnedFromGateway,
  useVerifyWhileConfirming,
} from "./OnlinePaymentPanel";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";
import VenueContactCard from "./VenueContactCard";

/** A receipt is a screenshot. Anything this size is something else. */
const maximumSizeInBytes = 10 * 1024 * 1024;

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Steps two and three: pay the venue, send the proof, wait for a person to
 * check it.
 *
 * Which step shows is read from the booking, never from the URL — so a refresh,
 * a new tab, or a customer coming back after lunch all land where they actually
 * are rather than where a query parameter says.
 */
function BookingCheckout({ bookingId }: { bookingId: string }) {
  const client = useQueryClient();

  // This booking has changed, so both the page showing it and the list
  // listing it have to hear about it.
  //
  // The list keeps its own copy and nothing else tells it. Without this, a
  // customer who sends their receipt here and then walks to My bookings is
  // shown the booking exactly as they left it — still asking to be paid for
  // — and the only way out is a reload nobody should have to think of.
  function changed(updated: BookingDetail) {
    client.setQueryData(["booking", bookingId], updated);
    void client.invalidateQueries({ queryKey: ["my-bookings"] });
  }

  const returned = useReturnedFromGateway();

  const booking = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: bookingId !== "",
    // Back from paying, and the gateway's word not in yet: ask again every few
    // seconds until it is. It usually lands before the page does.
    refetchInterval: (query) =>
      returned === "success" &&
      query.state.data?.paymentChannel === "Direct" &&
      query.state.data.status === "PendingPayment" &&
      !query.state.data.hasLapsed
        ? 3000
        : false,
  });

  // The webhook usually says it first; this is for when it does not.
  useVerifyWhileConfirming({
    purpose: "Booking",
    subjectId: bookingId === "" ? null : bookingId,
    active:
      returned === "success" &&
      booking.data?.paymentChannel === "Direct" &&
      booking.data.status === "PendingPayment" &&
      !booking.data.hasLapsed,
    refreshKey: ["booking", bookingId],
  });

  if (booking.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading your booking…</p>
      </Shell>
    );
  }

  if (booking.isError || !booking.data) {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-[#071955]">We could not find that booking</h1>
        <p className="mt-2 font-medium text-slate-600">
          It may belong to another account, or the link may be wrong.
        </p>
        <Link
          href="/#venues"
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
        >
          Back to courts
        </Link>
      </Shell>
    );
  }

  const detail = booking.data;
  const step = checkoutStep(detail);
  const direct = detail.paymentChannel === "Direct";

  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <CheckoutSteps current={step} />

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#071955]">
          {detail.courtName}
        </h1>
        <p className="mt-1 font-medium text-slate-600">
          {detail.facilityName} · {detail.sportName}
        </p>

        {detail.hasLapsed && direct && returned === "success" ? (
          <PaidLateWithContact detail={detail} />
        ) : detail.hasLapsed ? (
          <Lapsed detail={detail} />
        ) : (
          <>
            <Summary detail={detail} />

            {step === 2 && direct && returned === "success" && <ConfirmingPayment />}

            {step === 2 && direct && returned !== "success" && (
              <OnlinePaymentPanel
                amount={detail.total}
                holdsUntil={detail.holdsUntil}
                cancelled={returned === "cancelled"}
                onExpired={() => void booking.refetch()}
                startCheckout={() => startBookingCheckout(detail.id)}
              />
            )}

            {step === 2 && !direct && (
              <Pay
                detail={detail}
                onExpired={() => void booking.refetch()}
                onAttached={changed}
              />
            )}

            {step === 4 && (
              <>
                <Waiting
                  detail={detail}
                  onReplace={changed}
                />
                <VenueContactCard
                  venueName={detail.facilityName}
                  phone={detail.contactPhone}
                  email={detail.contactEmail}
                />
              </>
            )}
          </>
        )}

        {/* Only once there is nothing left to do here.
                
            It used to sit under every step, including the one where somebody
            is part-way through paying — and "Book another court" beside a
            running hold is an invitation to wander off and lose it. A lapsed
            booking does not get it either: that panel already offers "Try
            again", which is the better door, and two competing ways out is
            worse than one. */}
        {!detail.hasLapsed && step === 4 && <Elsewhere note={noteFor(detail)} />}
      </div>

      <PublicFooter />
    </main>
  );
}

/** What was booked and what it costs. The same on every step. */
function Summary({ detail }: { detail: BookingDetail }) {
  return (
    <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {detail.bookedHours} {detail.bookedHours === 1 ? "hour" : "hours"}
        </h2>
      </div>

      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
        {detail.slots.map((slot) => (
          <li
            key={`${slot.date}-${slot.startsAt}`}
            className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-3"
          >
            <span className="font-semibold text-[#071955]">
              {longDate(slot.date)} · {clock(slot.startsAt)} – {clock(slot.endsAt)}
            </span>
            <span className="font-bold text-[#071955]">{peso(slot.amount)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-slate-100 px-6 py-5">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="font-semibold text-slate-600">Court rental</dt>
          <dd className="font-bold text-[#071955]">{peso(detail.rentalTotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="font-semibold text-slate-600">Platform fee</dt>
          <dd className="font-bold text-[#071955]">{peso(detail.platformFeeTotal)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
          {/* Online, the money goes through the gateway rather than to the
              venue's own GCash, and a processing fee is added on its page. */}
          <dt className="font-extrabold text-[#071955]">
            {detail.paymentChannel === "Direct" ? "Total" : "Pay the venue"}
          </dt>
          <dd className="text-2xl font-extrabold tracking-tight text-[#071955]">
            {peso(detail.total)}
          </dd>
        </div>
        {detail.paymentChannel === "Direct" && (
          <p className="text-xs font-medium text-slate-500">
            Plus a small processing fee, shown on the payment page once you pick how to pay.
          </p>
        )}
      </dl>
    </section>
  );
}

/**
 * How to reach the venue, shown when there is no way to pay them.
 *
 * "Get in touch with them" is not help unless it says how. This is the only
 * road left on that screen, so the details are links rather than text: on a
 * phone, tapping the number should ring it.
 */
function ReachTheVenue({ detail }: { detail: BookingDetail }) {
  if (detail.contactPhone === null && detail.contactEmail === null) {
    return (
      <p className="mt-3 text-sm font-medium text-amber-900">
        They have not left a phone number or an email either. Your court is held in the meantime.
      </p>
    );
  }

  return (
    <dl className="mt-3 space-y-1.5 text-sm">
      {detail.contactPhone !== null && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold text-amber-900">Phone</dt>
          <dd>
            <a
              href={`tel:${detail.contactPhone.replace(/\s+/g, "")}`}
              className="font-bold text-[#164eaa] underline underline-offset-2"
            >
              {detail.contactPhone}
            </a>
          </dd>
        </div>
      )}

      {detail.contactEmail !== null && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold text-amber-900">Email</dt>
          <dd>
            <a
              href={`mailto:${detail.contactEmail}`}
              className="font-bold text-[#164eaa] underline underline-offset-2"
            >
              {detail.contactEmail}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

/** Step two: how to pay, and somewhere to put the proof. */
function Pay({
  detail,
  onExpired,
  onAttached,
}: {
  detail: BookingDetail;
  /** The hold ran out. Read the booking again and let the server say so. */
  onExpired: () => void;
  onAttached: (updated: BookingDetail) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const attach = useMutation({
    mutationFn: (receiptUrl: string) => attachReceipt(detail.id, receiptUrl),
    onSuccess: onAttached,
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  async function handleFile(file: File) {
    setProblem(null);

    // Checked here as well as on the server, so the customer is told before the
    // file spends a minute uploading rather than after.
    if (!imageTypes.includes(file.type)) {
      setProblem("The receipt has to be a picture — a screenshot or a photo.");

      return;
    }

    if (file.size > maximumSizeInBytes) {
      setProblem("That picture is over 10 MB. A screenshot will be far smaller.");

      return;
    }

    setUploading(true);

    try {
      const signature = await createReceiptUploadSignature();
      const uploaded = await uploadToCloudinary(file, signature);
      attach.mutate(uploaded.secureUrl);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const canBePaid = detail.gcashNumber !== null || detail.gcashQrCodeUrl !== null;

  return (
    <>
      <HoldCountdown holdsUntil={detail.holdsUntil} onExpired={onExpired} />

      <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#071955]">Pay {detail.facilityName} by GCash</h2>
        <p className="mt-1 font-medium text-slate-600">
          You pay the venue directly. IcyPlay does not handle the money.
        </p>

        {!canBePaid ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              This venue has not set up GCash yet. Get in touch with them to arrange payment — your
              court is held in the meantime.
            </p>
            <ReachTheVenue detail={detail} />
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-start gap-6">
            {detail.gcashQrCodeUrl !== null && (
              <div className="rounded-2xl border border-slate-200 p-3">
                <Image
                  src={detail.gcashQrCodeUrl}
                  alt={`GCash QR code for ${detail.facilityName}`}
                  width={180}
                  height={180}
                  unoptimized
                  className="h-44 w-44 object-contain"
                />
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">Scan to pay</p>
              </div>
            )}

            <dl className="flex min-w-56 flex-col gap-3">
              {detail.gcashNumber !== null && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    GCash number
                  </dt>
                  <dd className="text-xl font-extrabold tracking-tight text-[#071955]">
                    {detail.gcashNumber}
                  </dd>
                </div>
              )}
              {detail.gcashAccountName !== null && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Account name
                  </dt>
                  <dd className="font-bold text-[#071955]">{detail.gcashAccountName}</dd>
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Check this matches before you send.
                  </p>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount</dt>
                <dd className="text-xl font-extrabold tracking-tight text-[#071955]">
                  {peso(detail.total)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Only when there is somewhere the money could have gone. A venue with
          no GCash number and no QR code has no account for a payment to have
          reached, so offering to take a receipt for one invites somebody to
          send money into the dark and then prove it. The server refuses this
          too — this is the half that stops it being offered. */}
      {canBePaid && (
      <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#071955]">Send us the receipt</h2>
        <p className="mt-1 font-medium text-slate-600">
          A screenshot of your GCash confirmation. The venue checks it against their account.
        </p>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || attach.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm font-bold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed"
        >
          {uploading || attach.isPending ? "Uploading…" : "Upload your GCash receipt"}
        </button>

        <input
          ref={fileInput}
          type="file"
          accept={imageTypes.join(",")}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (file) {
              void handleFile(file);
            }
          }}
        />

        {problem && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
      </section>
      )}
    </>
  );
}

/**
 * What to say above the way out.
 *
 * The doors used to sit under every step, on the reasoning that every step is
 * a place somebody stops — to open the GCash app, to think about it, to book
 * the other court they came for. The trouble is the one step where stopping
 * costs them: "Book another court" beside a running hold is an invitation to
 * wander off and lose the one they have.
 *
 * So they appear once the booking is out of their hands, and this says what is
 * true at that point rather than hurrying anybody.
 */
function noteFor(detail: BookingDetail) {
  // No PendingPayment or lapsed cases: this only renders once the booking is
  // out of the customer's hands, and a branch that cannot be reached is a
  // sentence the next reader has to work out is dead.
  switch (detail.status) {
    case "PendingVerification":
      return "Nothing more to do here. We will email you when the venue confirms it.";
    case "Confirmed":
      return "This one is settled.";
    default:
      return null;
  }
}

/** Where a customer can go instead of finishing this. */
function Elsewhere({ note }: { note: string | null }) {
  return (
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
      {note && <p className="text-sm font-medium text-slate-600">{note}</p>}

      <div className={`flex flex-wrap gap-3 ${note ? "mt-4" : ""}`}>
        <Link
          href="/#venues"
          className="inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Book another court
        </Link>
        <Link
          href="/bookings"
          className="inline-block rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          My bookings
        </Link>
      </div>
    </section>
  );
}

/**
 * The receipt the venue is looking at, and a way to swap it for a better one.
 *
 * All that is left of the step that used to sit between uploading and sending.
 * Sending the wrong picture is the one mistake worth being able to undo here,
 * and without this the only way out is to ring the venue.
 */
function SentReceipt({
  detail,
  onReplace,
}: {
  detail: BookingDetail;
  onReplace: (updated: BookingDetail) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const attach = useMutation({
    mutationFn: (receiptUrl: string) => attachReceipt(detail.id, receiptUrl),
    onSuccess: onReplace,
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  async function replace(file: File) {
    setProblem(null);

    if (!imageTypes.includes(file.type)) {
      setProblem("The receipt has to be a picture.");

      return;
    }

    if (file.size > maximumSizeInBytes) {
      setProblem("That picture is over 10 MB. A screenshot will be far smaller.");

      return;
    }

    setUploading(true);

    try {
      const signature = await createReceiptUploadSignature();
      const uploaded = await uploadToCloudinary(file, signature);
      attach.mutate(uploaded.secureUrl);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || attach.isPending;

  return (
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-[#071955]">The receipt you sent</h2>

      {detail.receiptUrl !== null && (
        <div className="mt-4 flex flex-wrap items-start gap-4">
          <a href={detail.receiptUrl} target="_blank" rel="noreferrer" title="Open full size">
            <Image
              src={detail.receiptUrl}
              alt="Your GCash receipt"
              width={150}
              height={200}
              unoptimized
              className="max-h-52 w-auto rounded-2xl border border-slate-200 object-contain"
            />
          </a>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline disabled:text-slate-400"
          >
            {busy ? "Uploading…" : "Sent the wrong one? Upload a different one"}
          </button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={imageTypes.join(",")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];

          event.target.value = "";

          if (file) {
            void replace(file);
          }
        }}
      />

      {problem && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
    </section>
  );
}

/** Step four: nothing left for the customer to do. */
function Waiting({
  detail,
  onReplace,
}: {
  detail: BookingDetail;
  onReplace: (updated: BookingDetail) => void;
}) {
  if (detail.status === "Confirmed") {
    return (
      <div className="mt-6 rounded-[24px] border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-bold text-green-900">Your booking is confirmed</h2>
        <p className="mt-1.5 text-green-800">
          {detail.paymentChannel === "Direct"
            ? "Your payment went through. The court is yours — turn up and play. We have emailed you the details."
            : `${detail.facilityName} has checked your payment. The court is yours — turn up and play.`}
        </p>
        <Link
          href={`/bookings/${detail.id}/receipt`}
          className="mt-4 inline-block rounded-full border border-green-300 bg-white px-5 py-2.5 text-sm font-bold text-green-800 transition hover:border-green-500"
        >
          View your receipt
        </Link>
      </div>
    );
  }

  if (detail.status === "PendingVerification") {
    return (
      <>
        <div className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-[#071955]">With the venue now</h2>
          <p className="mt-1.5 text-slate-600">
            {detail.facilityName} is checking your receipt. Your court is held while they do, and
            we will email you as soon as they confirm it.
          </p>
        </div>

        <SentReceipt detail={detail} onReplace={onReplace} />
      </>
    );
  }

  // Declined by the venue: said in red, with the reason they gave — the same
  // sentence the customer was emailed — because somebody who paid and reads
  // only a grey "rejected" does not know whether to turn up or what went wrong.
  if (detail.status === "Rejected") {
    return (
      <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-900">This booking was declined</h2>
        {detail.cancellationReason && (
          <p className="mt-1.5 font-semibold text-red-900">{detail.cancellationReason}</p>
        )}
        <p className="mt-1.5 text-red-800">
          {detail.facilityName} checked your payment and could not accept it, so the court is not
          held for you and the hours are back on sale. If you sent money, speak to the venue — you
          paid them directly.
        </p>
        {/* No button of its own: the panel under this already offers
            "Book another court", and two of them read as two different
            places to go. */}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-[#071955]">This booking is {detail.status.toLowerCase()}</h2>
      <p className="mt-1.5 font-medium text-slate-600">The hours are back on sale.</p>
      <Link
        href="/#venues"
        className="mt-4 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
      >
        Book another court
      </Link>
    </div>
  );
}

/** Paid after the hold ran out, with who to talk to about it. */
function PaidLateWithContact({ detail }: { detail: BookingDetail }) {
  return (
    <>
      <PaidLate venueName={detail.facilityName} />
      <VenueContactCard
        venueName={detail.facilityName}
        phone={detail.contactPhone}
        email={detail.contactEmail}
      />
    </>
  );
}

function Lapsed({ detail }: { detail: BookingDetail }) {
  return (
    <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-bold text-amber-900">This hold has run out</h2>
      <p className="mt-1.5 text-amber-800">
        The court was held while you paid, and the time is up, so the hours have gone back on sale.
        Nothing was charged.
      </p>
      <Link
        href={`/book/${detail.bookableCourtId}`}
        className="mt-4 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
      >
        Try again
      </Link>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default BookingCheckout;
