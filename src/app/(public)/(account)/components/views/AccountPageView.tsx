"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FuseLoading from "@fuse/core/FuseLoading";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

type DetailProps = {
  label: string;
  value: string;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-base font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/**
 * The account page for the signed-in IcyPlay user.
 */
function AccountPageView() {
  const { user, isAuthenticated, isLoading } = useIcyPlayAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !user) {
    return <FuseLoading />;
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] text-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] transition hover:text-[#071955]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
          </svg>
          Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">My account</h1>
        <p className="mt-2 text-slate-500">Your IcyPlay account details.</p>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Detail label="Full name" value={user.fullName} />
          <Detail label="Email address" value={user.email} />
          <Detail label="Roles" value={user.roles.length > 0 ? user.roles.join(", ") : "No role assigned"} />
        </section>
      </div>
    </main>
  );
}

export default AccountPageView;
