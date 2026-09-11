"use client";

import { useEffect, useRef } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { ApiError } from "@/services/api";
import { TextField } from "../onboarding/FormControls";

type EditDialogProps = {
  title: string;
  description: string;
  open: boolean;
  isSaving: boolean;
  error: unknown;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSave: () => void;
  canSave?: boolean;
  /** Wording for the confirm button. Defaults to saving an edit. */
  confirmLabel?: string;
  busyLabel?: string;
  /** Red confirm button and a red border: this one takes something away. */
  destructive?: boolean;
  reasonLabel?: string;
  reasonHint?: string;
  /**
   * A destructive action asks for the reason rather than offering it. The one
   * change most worth explaining is the one that removes something.
   */
  reasonRequired?: boolean;
  children: React.ReactNode;
};

/**
 * The shell every edit shares. Each one asks for a reason, because the audit
 * entry says what changed and only the person changing it can say why — and a
 * trail of what-without-why is half a trail.
 */
function EditDialog({
  title,
  description,
  open,
  isSaving,
  error,
  reason,
  onReasonChange,
  onClose,
  onSave,
  canSave = true,
  confirmLabel = "Save changes",
  busyLabel = "Saving…",
  destructive = false,
  reasonLabel = "Why are you changing this?",
  reasonHint = "Recorded with the change, so the trail explains itself later.",
  reasonRequired = false,
  children,
}: EditDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);

  // Escape closes, and focus moves into the panel so a keyboard user is not
  // left behind on the page underneath.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    dialog.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isSaving, onClose]);

  if (!open) {
    return null;
  }

  const message = error
    ? error instanceof ApiError
      ? error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl outline-none"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <CloseOutlined sx={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="px-6 py-5">
          {children}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <TextField
              id="edit-reason"
              label={reasonLabel}
              required={reasonRequired}
              value={reason}
              onChange={onReasonChange}
              placeholder="The owner called to correct it"
              hint={reasonHint}
            />
          </div>

          {message && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {message}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !canSave || (reasonRequired && reason.trim() === "")}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none ${
              destructive
                ? "bg-red-600 shadow-red-600/20 hover:bg-red-700"
                : "bg-[#2563EB] shadow-blue-600/20 hover:bg-blue-700"
            }`}
          >
            {isSaving ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditDialog;
