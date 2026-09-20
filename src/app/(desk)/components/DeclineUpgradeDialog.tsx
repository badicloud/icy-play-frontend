"use client";

import { useEffect, useState } from "react";
import type { DeskUpgrade } from "@auth/deskApi";

type DeclineUpgradeDialogProps = {
  /** Null when nothing is being turned down. */
  upgrade: DeskUpgrade | null;
  isSaving: boolean;
  onClose: () => void;
  onDecline: (reason: string | null) => void;
};

/**
 * Turning an upgrade down.
 *
 * Asks for a reason before it will do it, the same as a rejected booking does.
 * This one matters more, not less: the customer has sent money for it, and
 * "declined" with nothing written against it leaves both the next person at the
 * desk and the customer ringing up about it with nothing to go on.
 */
function DeclineUpgradeDialog({
  upgrade,
  isSaving,
  onClose,
  onDecline,
}: DeclineUpgradeDialogProps) {
  const [reason, setReason] = useState("");

  // A reason typed against one upgrade must not follow the dialog onto the
  // next one.
  useEffect(() => {
    setReason("");
  }, [upgrade?.id]);

  if (upgrade === null) {
    return null;
  }

  const tooShort = reason.trim().length < 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-extrabold text-[#071955]">
          Decline {upgrade.customerName}&rsquo;s upgrade
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Their booking stays exactly where it is, on {upgrade.fromCourtName}. They have sent you
          money for this, so say what was wrong — they are shown what you write.
        </p>

        <label className="mt-4 block text-sm font-bold text-[#071955]">
          Why
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="We could not find that payment in our GCash account."
            className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 focus:border-[#2563EB] focus:outline-none"
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Keep it waiting
          </button>
          <button
            type="button"
            disabled={tooShort || isSaving}
            onClick={() => onDecline(reason.trim())}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Declining…" : "Decline the upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeclineUpgradeDialog;
