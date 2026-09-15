"use client";

import { useEffect, useState } from "react";

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
 */
function HoldCountdown({
  holdsUntil,
  compact = false,
}: {
  holdsUntil: string;
  compact?: boolean;
}) {
  const [left, setLeft] = useState(() => Date.parse(holdsUntil) - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setLeft(Date.parse(holdsUntil) - Date.now()), 1000);

    return () => clearInterval(timer);
  }, [holdsUntil]);

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
      Your court is held for <span className="font-extrabold">{shown}</span>. Upload your receipt
      before then and the clock stops.
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
