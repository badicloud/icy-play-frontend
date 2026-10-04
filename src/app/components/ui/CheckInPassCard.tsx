"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { formatClock, formatSessionDate } from "@auth/openPlayApi";
import type { OpenPlayRegistration } from "@auth/openPlayRegistrationApi";

/** When they walked in. A display only: nothing is decided from it. */
function arrivedAt(moment: string) {
  return new Date(moment).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

/**
 * One registration's check-in QR: it gets its player into that one session
 * and no other, and is spent the moment the desk checks them in.
 *
 * Drawn here in the browser from the token; no picture of it is stored
 * anywhere. The server only hands the token over while the QR is Active, so a
 * used or expired one shows its stamp and nothing that could be saved or
 * shared. Renders nothing before the venue has confirmed the payment.
 *
 * @param bare Without its own border and padding, for inside a container
 *   that already has them: a row opened on "My open plays".
 */
function CheckInPassCard({ registration, bare = false }: { registration: OpenPlayRegistration; bare?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = bare ? "" : "rounded-[24px] border border-slate-200 bg-white p-6";
  const state = registration.checkInPassState;

  if (!state) {
    return null;
  }

  function save() {
    const picture = canvas.current?.toDataURL("image/png");

    if (!picture) {
      return;
    }

    const link = document.createElement("a");
    link.href = picture;
    link.download = `icyplay-checkin-${registration.date}.png`;
    link.click();
  }

  if (state !== "Active" || !registration.checkInQr) {
    const used = state === "Used";

    return (
      <section className={frame}>
        <div className="flex flex-wrap items-center gap-5">
          <span
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed text-xs font-extrabold uppercase tracking-wider ${
              used ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-500"
            }`}
          >
            {used ? "Used" : "Expired"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#071955]">
              {used ? "Checked in" : "This QR has expired"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {used
                ? `You checked in${registration.checkedInAt ? ` at ${arrivedAt(registration.checkedInAt)}` : ""}. This QR has been used and no longer works.`
                : "The session has ended without a check-in, so this QR no longer works."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={frame}>
      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          {/* Large enough to read across a desk, with a quiet zone so a phone
              camera finds its edges. */}
          <QRCodeCanvas ref={canvas} value={registration.checkInQr} size={208} marginSize={2} level="M" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#071955]">Your check-in QR</h2>
          <p className="mt-1 text-sm text-slate-600">
            Show this at the desk when you arrive. It is for {registration.title} on{" "}
            {formatSessionDate(registration.date)} at {formatClock(registration.startsAt)} only, and works once.
            Turn your screen brightness up if it is hard to scan.
          </p>

          <button
            type="button"
            onClick={save}
            className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Save QR to phone
          </button>
        </div>
      </div>
    </section>
  );
}

export default CheckInPassCard;
