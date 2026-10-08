"use client";

import { useEffect, useRef, useState } from "react";

/** Under this, the clock turns red: it is no longer "later", it is "now". */
const NearlyGoneMinutes = 5;

/**
 * How long a court is held for.
 *
 * Counted down on screen because a deadline stated once, in a sentence, is a
 * deadline a customer does not feel. Ticking it also means the moment it runs
 * out is the moment the page says so, rather than the next time the customer
 * happens to reload.
 *
 * `compact` is for a list, where this is one fact among several on a card;
 * the full form is for the page where paying is the only thing to do.
 *
 * `onExpired` fires once when the clock runs out. It exists because a page
 * showing a hold has to do something when the hold ends — leaving an upload
 * button on screen for hours that have gone back on sale invites somebody to
 * pay for a court they no longer have.
 */
function HoldCountdown({
  holdsUntil,
  compact = false,
  onExpired,
  what = "court",
  paidOnline = false,
}: {
  holdsUntil: string;
  compact?: boolean;
  onExpired?: () => void;
  /** What is being held: a court for a booking, a spot for an open play. */
  what?: string;
  /**
   * Paid through the payment gateway rather than by receipt. There is
   * nothing to upload, and what stops the clock is the payment going through.
   */
  paidOnline?: boolean;
}) {
  const [left, setLeft] = useState(() => Date.parse(holdsUntil) - Date.now());
  const told = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setLeft(Date.parse(holdsUntil) - Date.now()), 1000);

    return () => clearInterval(timer);
  }, [holdsUntil]);

  // A new hold is a new clock, so it gets a fresh chance to say it has ended.
  useEffect(() => {
    told.current = false;
  }, [holdsUntil]);

  // Once, and only once. The clock reads the browser's time, which is not the
  // one the hold was set by — so this does not decide anything, it only asks
  // whoever is listening to go and find out.
  useEffect(() => {
    if (left > 0 || told.current) {
      return;
    }

    told.current = true;
    onExpired?.();
  }, [left, onExpired]);

  const seconds = Math.max(0, Math.floor(left / 1000));
  const minutes = Math.floor(seconds / 60);
  const nearlyGone = minutes < NearlyGoneMinutes;
  const shown = `${minutes}:${`${seconds % 60}`.padStart(2, "0")}`;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
          nearlyGone ? "bg-red-50 text-red-700" : "bg-blue-50 text-[#164eaa]"
        }`}
      >
        <ClockIcon />
        {seconds === 0 ? "Hold has run out" : `${shown} left to pay`}
      </span>
    );
  }

  return (
    <p
      className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        nearlyGone
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-blue-200 bg-blue-50 text-[#071955]"
      }`}
    >
      Your {what} is held for <span className="font-extrabold">{shown}</span>.{" "}
      {paidOnline
        ? "Finish paying online before then and it is yours."
        : "Upload your receipt before then and the clock stops."}
    </p>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default HoldCountdown;
