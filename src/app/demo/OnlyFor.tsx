"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

/**
 * Who may read the deck.
 *
 * Lower case, and compared lower case: an address typed with a capital is the
 * same address, and being locked out of your own presentation by the shift key
 * is not a security feature.
 */
const allowed = ["badicloud2011@gmail.com", "hr.icypay2022@gmail.com"];

/**
 * Keeps the presentation to the people presenting it.
 *
 * This is a curtain, not a lock. The page holds nothing but our own description
 * of what we have built, and the check happens in the browser — the markup is
 * still served to anybody who asks for the address. It keeps the deck off the
 * public site and out of search; it would not keep out somebody determined.
 *
 * A real lock would mean the server deciding, and the server cannot: the
 * session lives in browser storage. Worth doing if this page ever carries
 * numbers rather than screens.
 */
function OnlyFor({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useIcyPlayAuth();
  const welcome = Boolean(user && allowed.includes(user.email.trim().toLowerCase()));

  useEffect(() => {
    // Off search engines regardless of who is reading.
    document.title = "IcyPlay — walkthrough";
  }, []);

  if (isLoading) {
    return <Curtain>Checking…</Curtain>;
  }

  if (!isAuthenticated) {
    return (
      <Curtain>
        <p className="text-slate-300">This walkthrough is not public.</p>
        <Link
          href="/sign-in?redirectUrl=%2Fdemo"
          className="mt-6 inline-block rounded-full bg-[#2563EB] px-7 py-3.5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </Curtain>
    );
  }

  if (!welcome) {
    return (
      <Curtain>
        <p className="text-slate-300">
          This walkthrough is not open to {user?.email}.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-white"
        >
          Back to IcyPlay
        </Link>
      </Curtain>
    );
  }

  return <>{children}</>;
}

function Curtain({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#071955] px-6 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-blue-300 uppercase">IcyPlay</p>
      <div className="mt-3 text-lg font-semibold text-white">{children}</div>
    </main>
  );
}

export default OnlyFor;
