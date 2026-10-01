"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";
import {
  formatClock,
  formatSessionDate,
  formatPeso,
  getOpenPlays,
  openPlayHref,
  openPlayLevel,
} from "@auth/openPlayApi";
import { registerForOpenPlay } from "@auth/openPlayRegistrationApi";
import CheckoutSteps from "./CheckoutSteps";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">{children}</div>
      <PublicFooter />
    </main>
  );
}

/**
 * Step one of joining an open play: what the player is joining, what they
 * will pay the venue, and the policy they agree to before anything is held.
 *
 * Nothing is held yet. The spot is held only when they press Proceed, and
 * only then does signing in matter: reading the price is free.
 */
function OpenPlayJoinView() {
  const router = useRouter();
  const search = useSearchParams();
  const openPlayId = search.get("openPlay") ?? "";
  const date = search.get("date") ?? "";
  const { isAuthenticated } = useIcyPlayAuth();
  const client = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const openPlays = useQuery({
    queryKey: ["catalog", "open-plays"],
    queryFn: () => getOpenPlays(),
    staleTime: 30 * 1000,
  });

  const openPlay = openPlays.data?.find((entry) => entry.openPlayId === openPlayId);
  const session = openPlay?.upcomingSessions.find((entry) => entry.date === date);

  const register = useMutation({
    mutationFn: () => registerForOpenPlay(openPlayId, date),
    onSuccess: (registration) => {
      // A spot is now held: the player's own list and the spots left on the
      // public page have both changed, and the cache would otherwise keep
      // showing them as they were for minutes.
      client.setQueryData(["open-play-registration", registration.registrationId], registration);
      void client.invalidateQueries({ queryKey: ["my-open-plays"] });
      void client.invalidateQueries({ queryKey: ["catalog", "open-plays"] });
      router.push(`/open-play/registrations/${registration.registrationId}`);
    },
  });

  if (openPlays.isPending) {
    return (
      <Shell>
        <p className="text-slate-500">Loading the open play…</p>
      </Shell>
    );
  }

  if (!openPlay || !session) {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-[#071955]">That session is not open</h1>
        <p className="mt-2 font-medium text-slate-600">
          It may have been cancelled, filled up, or passed. Other dates may still have spots.
        </p>
        <Link
          href={openPlayId ? openPlayHref(openPlayId) : "/open-play"}
          className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
        >
          See the open plays
        </Link>
      </Shell>
    );
  }

  // The quote is the listing's, worked out on the server on the venue's clock.
  // The registration keeps its own copy once the spot is held, and that is
  // what the next step shows.
  const discount = session.earlyBirdNow ? openPlay.registrationFee + openPlay.platformFee - session.priceNow : 0;
  const closed = !session.isOpenForRegistration || session.spotsLeft === 0;
  const here = `/open-play/join?openPlay=${openPlayId}&date=${date}`;

  function proceed() {
    if (!isAuthenticated) {
      // Signing in is the price of holding a spot, not of reading the price, so
      // the choice travels through the redirect and comes back intact.
      router.push(`/sign-in?redirectUrl=${encodeURIComponent(here)}`);
      return;
    }

    register.mutate();
  }

  return (
    <Shell>
      <CheckoutSteps current={1} />

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#071955]">{openPlay.title}</h1>
      <p className="mt-1 font-medium text-slate-600">
        {openPlay.facilityName} · {openPlay.courtName} · {openPlay.sportName} · {openPlayLevel(openPlay.level)}
      </p>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="font-semibold text-[#071955]">
            {formatSessionDate(session.date)} · {formatClock(openPlay.startsAt)} – {formatClock(openPlay.endsAt)}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {session.spotsLeft} of {openPlay.maxPlayers} spots left
          </p>
        </div>

        <dl className="flex flex-col gap-2 px-6 py-5">
          <div className="flex justify-between gap-4 text-sm">
            <dt className="font-semibold text-slate-600">Registration fee</dt>
            <dd className="font-bold text-[#071955]">{formatPeso(openPlay.registrationFee)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-4 text-sm">
              <dt className="font-semibold text-green-700">Early-bird discount</dt>
              <dd className="font-bold text-green-700">−{formatPeso(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 text-sm">
            <dt className="font-semibold text-slate-600">Platform fee</dt>
            <dd className="font-bold text-[#071955]">{formatPeso(openPlay.platformFee)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
            <dt className="font-extrabold text-[#071955]">Pay the venue</dt>
            <dd className="text-2xl font-extrabold tracking-tight text-[#071955]">{formatPeso(session.priceNow)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-bold text-amber-900">Before you join</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-amber-900">
          <li>
            You pay <strong>{openPlay.facilityName}</strong> directly by GCash. IcyPlay does not receive or hold
            the money, so <strong>there is no refund through IcyPlay</strong>.
          </li>
          <li>
            If you cannot make it, or something is wrong with the payment, speak to the venue directly.
          </li>
          <li>
            Your spot is held while you pay. You are registered only once the venue has checked your receipt.
          </li>
        </ul>

        <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-amber-950">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#2563EB]"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span>
            I have read and agree to the{" "}
            <Link href="/open-play-policy" target="_blank" className="font-bold text-[#164eaa] underline underline-offset-2">
              Open Play Policy
            </Link>
            , including that there are no refunds through IcyPlay.
          </span>
        </label>
      </section>

      {register.isError && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {register.error instanceof ApiError ? register.error.message : "That did not work. Try again."}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!agreed || closed || register.isPending}
          onClick={proceed}
          className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {register.isPending
            ? "Holding your spot…"
            : closed
              ? session.spotsLeft === 0
                ? "This session is full"
                : "Registration has closed"
              : isAuthenticated
                ? "Proceed to payment"
                : "Sign in to proceed"}
        </button>
        <Link
          href={openPlayHref(openPlayId)}
          className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Back
        </Link>
      </div>
    </Shell>
  );
}

export default OpenPlayJoinView;
