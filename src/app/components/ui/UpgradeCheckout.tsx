"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";
import {
  attachUpgradeReceipt,
  clock,
  createReceiptUploadSignature,
  getBooking,
  getOpenUpgrade,
  peso,
  quoteMove,
  requestUpgrade,
  upgradeStep,
  type BookingDetail,
  type MoveQuote,
  type MoveReasonAnswer,
  type MoveSlot,
  type UpgradeRequest,
} from "@auth/bookingApi";
import CheckoutSteps from "./CheckoutSteps";
import MoveReasonPicker, { answerOf, NO_REASON, type MoveReasonDraft } from "./MoveReasonPicker";
import HoldCountdown from "./HoldCountdown";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/** A receipt is a screenshot. Anything this size is something else. */
const maximumSizeInBytes = 10 * 1024 * 1024;

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Paying the difference to move a booking onto better hours.
 *
 * A move is otherwise immediate — the customer picks a court and it happens.
 * This is the one case that cannot be: money has to change hands, and the venue
 * has to see it arrive before it gives up the better court.
 *
 * The court and the hours travel in the address rather than in memory, so a
 * refresh or a link sent to oneself lands on the same upgrade rather than on an
 * empty page.
 */
function UpgradeCheckout({
  bookingId,
  bookableCourtId,
  hours,
}: {
  bookingId: string;
  bookableCourtId: string;
  /**
   * "2026-09-22T06:00:00,2026-09-22T07:00:00" — what the move screen picked.
   *
   * Null when there was nothing to pick: a booking being played keeps its
   * hours and only changes court, so the move screen sends no `hours` at all
   * and the server uses the ones the booking holds.
   */
  hours: string | null;
}) {
  const client = useQueryClient();

  // An upgrade has moved on a step, and the booking it belongs to says so:
  // the list shows which court it is waiting to move to and how far the
  // request has got. Both it and the booking behind this page are asked
  // again, because neither is told by writing to the upgrade alone.
  function moved() {
    void client.invalidateQueries({ queryKey: ["booking", bookingId] });
    void client.invalidateQueries({ queryKey: ["my-bookings"] });
  }

  // Null and empty are different answers and must stay different. Null is "the
  // booking keeps its hours", which is a perfectly good upgrade; empty is "the
  // address named no hours", which is a broken link. Folding them together is
  // what left a booking under way on "Working out what you owe…" for ever: the
  // quote below was disabled for having nothing to price, and a disabled query
  // never stops pending.
  const wanted: MoveSlot[] | null =
    hours === null
      ? null
      : hours
          .split(",")
          .filter(Boolean)
          .map((pair) => {
            const [date, startsAt] = pair.split("T");

            return { date, startsAt };
          });

  const booking = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
  });

  // Which step this is, asked of the server rather than held on the page.
  // Somebody who has paid and come back tomorrow should land on where they
  // are, not on a review of a decision they already made.
  const upgrade = useQuery({
    queryKey: ["upgrade", bookingId],
    queryFn: () => getOpenUpgrade(bookingId),
  });

  const open = upgrade.data ?? null;

  // Priced again here rather than carried from the last screen. A figure passed
  // through an address is a figure anybody can edit, and this one is what the
  // customer is about to be asked to pay. Not asked for once an upgrade exists:
  // from then on the figure that binds anybody is the one written down.
  const quote = useQuery({
    queryKey: ["move-quote", bookingId, bookableCourtId, wanted],
    queryFn: () => quoteMove(bookingId, bookableCourtId, wanted),
    enabled: open === null && !upgrade.isPending && (wanted === null || wanted.length > 0),
    retry: false,
  });

  const detail = booking.data;

  if (booking.isPending || upgrade.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading your upgrade…</p>
      </Shell>
    );
  }

  if (detail === undefined) {
    return <Lost />;
  }

  if (open !== null) {
    return (
      <Pay
        detail={detail}
        upgrade={open}
        onChanged={(updated) => {
          client.setQueryData(["upgrade", bookingId], updated);
          moved();
        }}
        onExpired={() => void upgrade.refetch()}
        onGoneBack={() => client.setQueryData(["upgrade", bookingId], null)}
      />
    );
  }

  if (quote.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Working out what you owe…</p>
      </Shell>
    );
  }

  if (quote.data === undefined || wanted?.length === 0) {
    return <Lost />;
  }

  return (
    <Review
      detail={detail}
      bookableCourtId={bookableCourtId}
      wanted={wanted}
      priced={quote.data}
      onAsked={(created) => {
        client.setQueryData(["upgrade", bookingId], created);
        moved();
      }}
    />
  );
}

/** Step one: what it comes to, the policy, and one way on. */
function Review({
  detail,
  bookableCourtId,
  wanted,
  priced,
  onAsked,
}: {
  detail: BookingDetail;
  bookableCourtId: string;
  /** Null keeps the booking's own hours, which is what a booking under way does. */
  wanted: MoveSlot[] | null;
  priced: MoveQuote;
  onAsked: (created: UpgradeRequest) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Asked here rather than on the move screen: the note is the customer's own
  // words, and the move screen hands over to this page through its address.
  const [why, setWhy] = useState<MoveReasonDraft>(NO_REASON);
  const answer = answerOf(why);
  const ready = agreed && answer !== null;

  const ask = useMutation({
    mutationFn: (because: MoveReasonAnswer) =>
      requestUpgrade(detail.id, bookableCourtId, wanted, because),
    onSuccess: onAsked,
    onError: (error) =>
      setProblem(
        error instanceof ApiError
          ? error.message
          : "We could not set that up just now. Please try again.",
      ),
  });

  return (
    <Shell>
      <Crumbs />

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Pay and upgrade
      </h1>
      <p className="mt-2 text-slate-500">
        You are moving to {priced.toCourtName}. Pay the difference and the venue will move your
        booking once they have seen it.
      </p>

      <div className="mt-6">
        <CheckoutSteps current={1} />
      </div>

      <Panel>
        <h2 className="text-lg font-extrabold text-[#071955]">What you are changing to</h2>

        {/* The hours the SERVER says are moving, not the ones the address
            named. On a booking under way the address names none — they are not
            changing — and only the server knows which of them are still ahead
            of the customer on the venue's clock. */}
        <Hours courtName={priced.toCourtName} slots={priced.movingSlots} />

        <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
          {/* Against the hours that are moving, not the whole booking. A
              customer moving the last hour of a long session has most of that
              session behind them, and it is not what they are being charged
              against. */}
          <Line label="What those hours cost you now" value={peso(priced.movingRentalNow)} />
          <Line
            label={`What they cost on ${priced.toCourtName}`}
            value={peso(priced.movingRentalNew)}
          />
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
            <dt className="font-bold text-[#071955]">Difference to pay</dt>
            <dd className="text-lg font-extrabold text-[#071955]">{peso(priced.balanceDue)}</dd>
          </div>
        </dl>

        {/* Said out loud, and given room: a customer who works the difference
            out themselves and gets another number assumes a mistake, and this
            is the line that stops them. */}
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-[#071955]">
            You pay {peso(priced.balanceDue)} — the difference only.
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            You have already paid {peso(priced.movingRentalNow)} of the{" "}
            {peso(priced.movingRentalNew)} these hours cost on {priced.toCourtName}. Your platform
            fee does not change, because you are booking the same number of hours.
          </p>
        </div>
      </Panel>

      <Panel>
        <MoveReasonPicker
          value={why}
          onChange={setWhy}
          disabled={ask.isPending}
          className=""
        />
      </Panel>

      {/* The same shape the booking checkout uses to take a policy: the warning
          and the box that accepts it in one amber panel, so nobody ticks a
          checkbox whose consequence is somewhere else on the page. */}
      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5">
        <p className="text-sm leading-6 font-semibold text-amber-900">
          Your booking stays exactly as it is until the venue approves this upgrade. Once they do,
          the hours you are leaving go back on sale.
        </p>
        <p className="mt-2 text-sm leading-6 font-semibold text-amber-900">
          You pay the venue directly. IcyPlay never holds your money, so we cannot refund it.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-amber-900">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#2563EB]"
          />
          <span>
            I have read and accept the{" "}
            <Link
              href="/booking-policy"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#164eaa] underline underline-offset-2"
            >
              booking policy
            </Link>
            .
          </span>
        </label>
      </div>

      {problem !== null && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {problem}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/bookings"
          className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
        >
          ← Back to my bookings
        </Link>

        <button
          type="button"
          disabled={!ready || ask.isPending}
          onClick={() => {
            if (answer === null) return;
            setProblem(null);
            ask.mutate(answer);
          }}
          className={`rounded-full px-8 py-3.5 text-sm font-bold transition ${
            ready && !ask.isPending
              ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          {ask.isPending ? "Holding your hours…" : "Pay and proceed"}
        </button>
      </div>

      {/* One line, and it does not move. A hint that rewrites itself the
          moment somebody ticks a box pulls the eye back to text they have
          finished with — the button lighting up is the answer they are
          waiting for. */}
      <p className="mt-3 text-right text-sm font-medium text-slate-500">
        Please say why you are moving and accept the booking policy to proceed.
      </p>
    </Shell>
  );
}

/**
 * Paying for an upgrade: the venue's details, the receipt, and the wait.
 *
 * The same three steps as paying for a booking, in the same order and the same
 * words. Somebody who has been through the checkout once should recognise this
 * rather than read it.
 */
function Pay({
  detail,
  upgrade,
  onChanged,
  onExpired,
  onGoneBack,
}: {
  detail: BookingDetail;
  upgrade: UpgradeRequest;
  onChanged: (updated: UpgradeRequest) => void;
  /** The hold ran out. Read the upgrade again and let the server say so. */
  onExpired: () => void;
  onGoneBack: () => void;
}) {
  const canBePaid = detail.gcashNumber !== null || detail.gcashQrCodeUrl !== null;
  const step = upgradeStep(upgrade);

  return (
    <Shell>
      <Crumbs />

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {step === 4 ? "With the venue now" : `Pay ${peso(upgrade.balanceDue)} to upgrade`}
      </h1>
      <p className="mt-2 text-slate-500">
        Your upgrade to {upgrade.toCourtName} is written down and waiting. Your booking has not
        changed yet.
      </p>

      <div className="mt-6">
        <CheckoutSteps current={step} />
      </div>

      {step === 4 && (
        <>
          <Waiting detail={detail} upgrade={upgrade} />
          <SentReceipt detail={detail} upgrade={upgrade} onChanged={onChanged} />
        </>
      )}

      {step === 2 && upgrade.hasLapsed && <Lapsed onGoneBack={onGoneBack} />}

      {step === 2 && !upgrade.hasLapsed && (
        <>
          <HoldCountdown holdsUntil={upgrade.holdsUntil} onExpired={onExpired} />

          <Panel>
            <h2 className="text-lg font-bold text-[#071955]">
              Pay {detail.facilityName} by GCash
            </h2>
            <p className="mt-1 font-medium text-slate-600">
              You pay the venue directly. IcyPlay does not handle the money.
            </p>

            {!canBePaid ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  This venue has not set up GCash yet. Get in touch with them to arrange payment —
                  your hours are held in the meantime.
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
                    <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                      Scan to pay
                    </p>
                  </div>
                )}

                <dl className="flex min-w-56 flex-col gap-3">
                  {detail.gcashNumber !== null && (
                    <div>
                      <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        GCash number
                      </dt>
                      <dd className="text-xl font-extrabold tracking-tight text-[#071955]">
                        {detail.gcashNumber}
                      </dd>
                    </div>
                  )}
                  {detail.gcashAccountName !== null && (
                    <div>
                      <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        Account name
                      </dt>
                      <dd className="font-bold text-[#071955]">{detail.gcashAccountName}</dd>
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Check this matches before you send.
                      </p>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Amount
                    </dt>
                    <dd className="text-xl font-extrabold tracking-tight text-[#071955]">
                      {peso(upgrade.balanceDue)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </Panel>
        </>
      )}

      <Panel>
        <h2 className="text-lg font-extrabold text-[#071955]">What you are changing to</h2>

        <Hours courtName={upgrade.toCourtName} slots={upgrade.slots} />

        <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
          {/* The upgrade records these against the hours that are moving, so
              they are named the same way here as on the review this came
              from — a figure that changes wording between two steps of one
              checkout reads as a figure that changed. */}
          <Line label="What those hours cost you now" value={peso(upgrade.rentalNow)} />
          <Line
            label={`What they cost on ${upgrade.toCourtName}`}
            value={peso(upgrade.rentalNew)}
          />
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
            <dt className="font-bold text-[#071955]">Difference to pay</dt>
            <dd className="text-lg font-extrabold text-[#071955]">{peso(upgrade.balanceDue)}</dd>
          </div>
        </dl>
      </Panel>

      {/* Same rule as the booking checkout: a receipt needs somewhere the
          money could have gone. */}
      {step === 2 && !upgrade.hasLapsed && canBePaid && (
        <Receipt
          bookingId={detail.id}
          onChanged={onChanged}
          heading="Send us the receipt"
          note="A screenshot of your GCash confirmation. The venue checks it against their account."
        />
      )}

      {/* Only once there is nothing left to do here. Part-way through paying,
          a way out is a way to abandon a hold that is still running — and the
          review step has its own, beside the button, where leaving costs
          nothing because nothing has been committed yet. */}
      {step === 4 && (
        <div className="mt-6">
          <Link
            href="/bookings"
            className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
          >
            ← Back to my bookings
          </Link>
        </div>
      )}
    </Shell>
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

/**
 * Uploading the proof.
 *
 * The upload goes browser-to-Cloudinary and only the link comes back here,
 * which is the same path a booking's own receipt takes. The size and type are
 * checked before the upload rather than after, so somebody who picked the wrong
 * file is told now instead of in a minute's time.
 */
function Receipt({
  bookingId,
  onChanged,
  heading,
  note,
}: {
  bookingId: string;
  onChanged: (updated: UpgradeRequest) => void;
  heading: string;
  note: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const attach = useMutation({
    mutationFn: (receiptUrl: string) => attachUpgradeReceipt(bookingId, receiptUrl),
    onSuccess: onChanged,
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  async function handleFile(file: File) {
    setProblem(null);

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

  const busy = uploading || attach.isPending;

  return (
    <Panel>
      <h2 className="text-lg font-bold text-[#071955]">{heading}</h2>
      <p className="mt-1 font-medium text-slate-600">{note}</p>

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm font-bold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed"
      >
        {busy ? "Uploading…" : "Upload your GCash receipt"}
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

      {problem !== null && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
    </Panel>
  );
}

/**
 * The receipt the venue is looking at, and a way to swap it for a better one.
 *
 * All that is left of the step that used to sit between uploading and sending.
 * Sending the wrong picture is the one mistake worth being able to undo here.
 */
function SentReceipt({
  detail,
  upgrade,
  onChanged,
}: {
  detail: BookingDetail;
  upgrade: UpgradeRequest;
  onChanged: (updated: UpgradeRequest) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const attach = useMutation({
    mutationFn: (receiptUrl: string) => attachUpgradeReceipt(detail.id, receiptUrl),
    onSuccess: onChanged,
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
    <Panel>
      <h2 className="text-lg font-bold text-[#071955]">The receipt you sent</h2>

      {upgrade.receiptUrl !== null && (
        <div className="mt-4 flex flex-wrap items-start gap-4">
          <a href={upgrade.receiptUrl} target="_blank" rel="noreferrer" title="Open full size">
            <Image
              src={upgrade.receiptUrl}
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

      {problem !== null && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
    </Panel>
  );
}

/** Step four: nothing left for the customer to do but wait. */
function Waiting({ detail, upgrade }: { detail: BookingDetail; upgrade: UpgradeRequest }) {
  return (
    <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6">
      <h2 className="text-lg font-bold text-[#071955]">{detail.facilityName} is checking it</h2>
      <p className="mt-1.5 text-slate-600">
        They have your {peso(upgrade.balanceDue)} to check against their GCash account. Those hours
        are held while they do, and your booking moves to {upgrade.toCourtName} the moment they say
        yes. We will email you either way.
      </p>
    </div>
  );
}

/**
 * The clock ran out before anything was paid.
 *
 * Said as what happened rather than as an error: nobody did anything wrong,
 * the hours simply went back on sale, and the way out is to pick again.
 */
function Lapsed({ onGoneBack }: { onGoneBack: () => void }) {
  return (
    <Panel>
      <h2 className="text-lg font-extrabold text-[#071955]">Those hours have gone back on sale</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The hold ran out before the payment arrived, so we let the hours go. Your booking is
        untouched — it is exactly where it was.
      </p>
      <button
        type="button"
        onClick={onGoneBack}
        className="mt-4 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
      >
        Choose hours again
      </button>
    </Panel>
  );
}

/**
 * The court and the hours, gathered under their date.
 *
 * Almost always one date — an hourly booking is a single afternoon — but
 * grouped rather than assumed, so a booking that ever spans two days does not
 * print one of them twice.
 */
function Hours({
  courtName,
  slots,
}: {
  courtName: string;
  slots: { date: string; startsAt: string }[];
}) {
  const byDate: [string, string[]][] = [
    ...slots
      .reduce((gathered, slot) => {
        gathered.set(slot.date, [...(gathered.get(slot.date) ?? []), slot.startsAt]);

        return gathered;
      }, new Map<string, string[]>())
      .entries(),
  ].sort(([left], [right]) => left.localeCompare(right));

  return (
    <dl className="mt-3 space-y-1 text-sm">
      <Line label="Court" value={courtName} />

      {byDate.map(([date, times]) => (
        <Line
          key={date}
          label={byDate.length === 1 ? "Date" : longDate(date)}
          value={
            byDate.length === 1 ? longDate(date) : times.map((startsAt) => clock(startsAt)).join(", ")
          }
        />
      ))}

      {byDate.length === 1 && (
        <Line
          label={byDate[0][1].length === 1 ? "Hour" : "Hours"}
          value={byDate[0][1].map((startsAt) => clock(startsAt)).join(", ")}
        />
      )}
    </dl>
  );
}

function Crumbs() {
  return (
    <nav className="text-sm font-semibold text-slate-500">
      <Link href="/bookings" className="hover:text-[#2563EB]">
        My bookings
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-700">Upgrade</span>
    </nav>
  );
}

function Lost() {
  return (
    <Shell>
      <Panel>
        <p className="text-slate-600">
          This upgrade could not be loaded. Go back to your booking and choose the hours again.
        </p>
        <Link
          href="/bookings"
          className="mt-3 inline-block text-sm font-bold text-[#2563EB] underline underline-offset-2"
        >
          Back to my bookings
        </Link>
      </Panel>
    </Shell>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">{children}</section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-bold text-[#071955]">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f9ff] text-slate-950">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 lg:px-8">{children}</main>
      <PublicFooter />
    </div>
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

export default UpgradeCheckout;
