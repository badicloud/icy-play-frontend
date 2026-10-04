"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Asks for the venue's six-digit check-in code before anything is done at the
 * door without a player's QR: checking somebody in by hand, or taking a
 * check-in back. The server is the one that checks it, and counts wrong
 * tries; this only collects it and shows what the server said.
 */
function CheckInCodeModal({
  title,
  playerName,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  playerName: string;
  confirmLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const ready = /^\d{6}$/.test(code);

  useEffect(() => {
    input.current?.focus();
  }, []);

  // A wrong code is cleared for the next try.
  useEffect(() => {
    if (error) {
      setCode("");
      input.current?.focus();
    }
  }, [error]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onClose();
        }
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-in-code-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();

          if (ready && !pending) {
            onConfirm(code);
          }
        }}
      >
        <h2 id="check-in-code-title" className="text-lg font-bold text-[#071955]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{playerName}</span>. Enter the venue&apos;s check-in code
          to continue.
        </p>

        <input
          ref={input}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Venue check-in code"
          placeholder="••••••"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-3xl font-bold tracking-[0.5em] text-slate-950 outline-none focus:border-[#2563EB]"
        />

        {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="flex-1 rounded-full bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {pending ? "Checking…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CheckInCodeModal;
