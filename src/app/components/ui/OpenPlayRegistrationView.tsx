"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { uploadToCloudinary } from "@auth/cloudinaryUpload";
import { createReceiptUploadSignature } from "@auth/bookingApi";
import { formatClock, formatPeso, formatSessionDate, openPlayHref, openPlayLevel } from "@auth/openPlayApi";
import {
  getOpenPlayRegistration,
  registrationStep,
  sendOpenPlayReceipt,
  type OpenPlayRegistration,
} from "@auth/openPlayRegistrationApi";
import CheckoutSteps from "./CheckoutSteps";
import HoldCountdown from "./HoldCountdown";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

/** A receipt is a screenshot. Anything this size is something else. */
const maximumSizeInBytes = 10 * 1024 * 1024;

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

/** What was joined and what it costs. The same on every step. */
function Summary({ registration }: { registration: OpenPlayRegistration }) {
  return (
    <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="font-semibold text-[#071955]">
          {formatSessionDate(registration.date)} · {formatClock(registration.startsAt)} –{" "}
          {formatClock(registration.endsAt)}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          {registration.courtName} · {registration.unitLabel} · {openPlayLevel(registration.level)}
        </p>
      </div>

      <dl className="flex flex-col gap-2 px-6 py-5">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="font-semibold text-slate-600">Registration fee</dt>
          <dd className="font-bold text-[#071955]">{formatPeso(registration.registrationFee)}</dd>
        </div>
        {registration.discount > 0 && (
          <div className="flex justify-between gap-4 text-sm">
            <dt className="font-semibold text-green-700">Early-bird discount</dt>
            <dd className="font-bold text-green-700">−{formatPeso(registration.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 text-sm">
          <dt className="font-semibold text-slate-600">Platform fee</dt>
          <dd className="font-bold text-[#071955]">{formatPeso(registration.platformFee)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
          <dt className="font-extrabold text-[#071955]">Pay the venue</dt>
          <dd className="text-2xl font-extrabold tracking-tight text-[#071955]">{formatPeso(registration.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Puts a receipt into Cloudinary and records it. Shared by paying and by replacing a wrong picture. */
function useReceipt(registrationId: string, onSent: (updated: OpenPlayRegistration) => void) {
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: (receiptUrl: string) => sendOpenPlayReceipt(registrationId, receiptUrl),
    onSuccess: onSent,
    onError: (error) => setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  async function upload(file: File) {
    setProblem(null);

    // Checked here as well as on the server, so the player is told before the
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
      send.mutate(uploaded.secureUrl);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return { upload, problem, busy: uploading || send.isPending };
}

function FilePicker({ onFile, children, className }: {
  onFile: (file: File) => void;
  children: React.ReactNode;
  className: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={className}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={imageTypes.join(",")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            onFile(file);
          }
        }}
      />
    </>
  );
}

/** Step two: how to pay the venue, and somewhere to put the proof. */
function Pay({
  registration,
  onExpired,
  onSent,
}: {
  registration: OpenPlayRegistration;
  onExpired: () => void;
  onSent: (updated: OpenPlayRegistration) => void;
}) {
  const receipt = useReceipt(registration.registrationId, onSent);
  const canBePaid = registration.gcashNumber !== null || registration.gcashQrCodeUrl !== null;

  return (
    <>
      <HoldCountdown holdsUntil={registration.holdsUntil} onExpired={onExpired} what="spot" />

      <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#071955]">Pay {registration.facilityName} by GCash</h2>
        <p className="mt-1 font-medium text-slate-600">
          You pay the venue directly. IcyPlay does not handle the money.
        </p>

        {!canBePaid ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            This venue has not set up GCash. Speak to them to arrange payment: {registration.venueContact}.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap items-start gap-6">
            {registration.gcashQrCodeUrl !== null && (
              <div className="rounded-2xl border border-slate-200 p-3">
                <Image
                  src={registration.gcashQrCodeUrl}
                  alt={`GCash QR code for ${registration.facilityName}`}
                  width={180}
                  height={180}
                  unoptimized
                  className="h-44 w-44 object-contain"
                />
                <p className="mt-2 text-center text-xs font-semibold text-slate-500">Scan to pay</p>
              </div>
            )}

            <dl className="flex min-w-56 flex-col gap-3">
              {registration.gcashNumber !== null && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">GCash number</dt>
                  <dd className="text-xl font-extrabold tracking-tight text-[#071955]">{registration.gcashNumber}</dd>
                </div>
              )}
              {registration.gcashAccountName !== null && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Account name</dt>
                  <dd className="font-bold text-[#071955]">{registration.gcashAccountName}</dd>
                  <p className="mt-1 text-xs font-semibold text-amber-700">Check this matches before you send.</p>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount</dt>
                <dd className="text-xl font-extrabold tracking-tight text-[#071955]">{formatPeso(registration.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {canBePaid && (
        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-[#071955]">Send us the receipt</h2>
          <p className="mt-1 font-medium text-slate-600">
            A screenshot of your GCash confirmation. The venue checks it against their account.
          </p>

          <FilePicker
            onFile={(file) => void receipt.upload(file)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm font-bold text-slate-500 transition hover:border-slate-300 disabled:cursor-not-allowed"
          >
            {receipt.busy ? "Uploading…" : "Upload your GCash receipt"}
          </FilePicker>

          {receipt.problem && <p className="mt-3 text-sm font-semibold text-red-600">{receipt.problem}</p>}
        </section>
      )}
    </>
  );
}

/** Step three: with the venue, then registered or turned down. */
function Outcome({
  registration,
  onSent,
}: {
  registration: OpenPlayRegistration;
  onSent: (updated: OpenPlayRegistration) => void;
}) {
  const receipt = useReceipt(registration.registrationId, onSent);

  if (registration.status === "Confirmed") {
    return (
      <div className="mt-6 rounded-[24px] border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-bold text-green-900">You are registered</h2>
        <p className="mt-1.5 text-green-800">
          {registration.facilityName} has checked your payment. See you on {formatSessionDate(registration.date)} at{" "}
          {formatClock(registration.startsAt)}.
        </p>
        <p className="mt-2 text-sm text-green-800">
          Cannot make it? Speak to the venue: {registration.venueContact}.
        </p>
      </div>
    );
  }

  if (registration.status === "PendingVerification") {
    return (
      <>
        <div className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-[#071955]">With the venue now</h2>
          <p className="mt-1.5 text-slate-600">
            {registration.facilityName} is checking your receipt. Your spot is kept while they do, but you are
            not registered yet. We will email you the moment they confirm.
          </p>
        </div>

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-[#071955]">The receipt you sent</h2>
          {registration.receiptUrl !== null && (
            <div className="mt-4 flex flex-wrap items-start gap-4">
              <a href={registration.receiptUrl} target="_blank" rel="noreferrer" title="Open full size">
                <Image
                  src={registration.receiptUrl}
                  alt="Your GCash receipt"
                  width={150}
                  height={200}
                  unoptimized
                  className="max-h-52 w-auto rounded-2xl border border-slate-200 object-contain"
                />
              </a>
              <FilePicker
                onFile={(file) => void receipt.upload(file)}
                className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
              >
                {receipt.busy ? "Uploading…" : "Sent the wrong one? Upload a different one"}
              </FilePicker>
            </div>
          )}
          {receipt.problem && <p className="mt-3 text-sm font-semibold text-red-600">{receipt.problem}</p>}
        </section>
      </>
    );
  }

  if (registration.status === "Rejected") {
    return (
      <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-900">Your registration was not accepted</h2>
        {registration.cancellationReason && (
          <p className="mt-1.5 font-semibold text-red-900">{registration.cancellationReason}</p>
        )}
        <p className="mt-1.5 text-red-800">
          {registration.facilityName} checked your payment and could not accept it, so you are not registered and
          the spot has been released. If you sent money, speak to the venue — you paid them directly:{" "}
          {registration.venueContact}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-[#071955]">This registration was cancelled</h2>
      {registration.cancellationReason && (
        <p className="mt-1.5 font-medium text-slate-600">{registration.cancellationReason}</p>
      )}
      <p className="mt-1.5 text-slate-600">For anything about a payment, speak to the venue: {registration.venueContact}.</p>
    </div>
  );
}

/**
 * Steps two and three of joining an open play: pay the venue, send the
 * proof, and wait for a person to check it.
 *
 * Which step shows is read from the registration, never from the address, so
 * a refresh or a player coming back later lands where they actually are.
 */
function OpenPlayRegistrationView({ registrationId }: { registrationId: string }) {
  const client = useQueryClient();

  const registration = useQuery({
    queryKey: ["open-play-registration", registrationId],
    queryFn: () => getOpenPlayRegistration(registrationId),
    enabled: registrationId !== "",
  });

  function changed(updated: OpenPlayRegistration) {
    client.setQueryData(["open-play-registration", registrationId], updated);
    // The player's list, and the spots left on the public page.
    void client.invalidateQueries({ queryKey: ["my-open-plays"] });
    void client.invalidateQueries({ queryKey: ["catalog", "open-plays"] });
  }

  if (registration.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading your registration…</p>
      </Shell>
    );
  }

  if (registration.isError || !registration.data) {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-[#071955]">We could not find that registration</h1>
        <p className="mt-2 font-medium text-slate-600">It may belong to another account, or the link may be wrong.</p>
        <Link
          href="/open-play"
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
        >
          See the open plays
        </Link>
      </Shell>
    );
  }

  const detail = registration.data;
  const step = registrationStep(detail);

  return (
    <Shell>
      {/* Confirmed is every step done; waiting is the last one in hand. */}
      <CheckoutSteps current={detail.status === "Confirmed" ? 4 : step} />

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#071955]">{detail.title}</h1>
      <p className="mt-1 font-medium text-slate-600">
        {detail.facilityName} · {detail.sportName}
      </p>

      <Summary registration={detail} />

      {detail.hasLapsed ? (
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold text-amber-900">This hold has run out</h2>
          <p className="mt-1.5 text-amber-800">
            Your spot was held while you paid, and the time is up, so it has been released. Nothing was charged.
          </p>
          <Link
            href={openPlayHref(detail.openPlayId)}
            className="mt-4 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
          >
            Try again
          </Link>
        </div>
      ) : step === 2 ? (
        <Pay registration={detail} onExpired={() => void registration.refetch()} onSent={changed} />
      ) : (
        <Outcome registration={detail} onSent={changed} />
      )}

      {step === 3 && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/my-open-plays"
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            My open plays
          </Link>
          <Link
            href="/open-play"
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Find another open play
          </Link>
        </div>
      )}
    </Shell>
  );
}

export default OpenPlayRegistrationView;
