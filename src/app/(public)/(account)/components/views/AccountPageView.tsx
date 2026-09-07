"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import ComputerOutlined from "@mui/icons-material/ComputerOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import FuseLoading from "@fuse/core/FuseLoading";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";
import { formatDevice } from "@auth/formatDevice";
import { useActiveSessions } from "@auth/hooks/useActiveSessions";
import { useRevokeOtherSessions } from "@auth/hooks/useRevokeOtherSessions";
import { useRevokeAllSessions } from "@auth/hooks/useRevokeAllSessions";
import { useRevokeSession } from "@auth/hooks/useRevokeSession";
import type { ActiveSession } from "@auth/sessionsApi";

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

function formatLastUsed(session: ActiveSession) {
  const value = session.lastUsedAt ?? session.signedInAt;
  return `${formatDistanceToNow(new Date(value))} ago`;
}

function SessionRow({
  session,
  onRevoke,
  isRevoking,
}: {
  session: ActiveSession;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1264f7]">
          <ComputerOutlined fontSize="small" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-800">
            {formatDevice(session.userAgent)}
            {session.isCurrent && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                This device
              </span>
            )}
            {session.isPersistent && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                Remembered
              </span>
            )}
          </p>
          <p className="mt-1 break-words text-sm text-slate-500">
            {session.ipAddress ?? "Unknown location"} &middot; last active {formatLastUsed(session)}
          </p>
          <p className="mt-0.5 text-sm text-slate-400">
            Signed in {format(new Date(session.signedInAt), "d MMM yyyy, h:mm a")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRevoke(session.id)}
        disabled={isRevoking}
        className="shrink-0 self-start rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
      >
        {session.isCurrent ? "Sign out this device" : "Sign out"}
      </button>
    </li>
  );
}

/**
 * The account page for the signed-in IcyPlay user.
 */
function AccountPageView() {
  const { user, isAuthenticated, isLoading, signOut } = useIcyPlayAuth();
  const router = useRouter();
  const sessions = useActiveSessions(isAuthenticated);
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const revokeAll = useRevokeAllSessions(async () => {
    await signOut();
    router.push("/");
  });

  // Signing out the current row ends this session, so it has to clear the
  // local session too rather than just refetching a list we can no longer read.
  async function handleRevoke(session: ActiveSession) {
    if (!session.isCurrent) {
      revokeSession.mutate(session.id);
      return;
    }

    await signOut();
    router.push("/");
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !user) {
    return <FuseLoading />;
  }

  const sessionList = sessions.data ?? [];
  const otherSessionCount = sessionList.filter((session) => !session.isCurrent).length;

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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active sessions</h2>
              <p className="mt-1 text-slate-500">
                Where your account is signed in right now. Sign out any device you don&apos;t
                recognise.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              {otherSessionCount > 0 && (
                <button
                  type="button"
                  onClick={() => revokeOthers.mutate()}
                  disabled={revokeOthers.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-[#164eaa] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {revokeOthers.isPending ? "Signing out..." : "Sign out other devices"}
                </button>
              )}

              {sessionList.length > 0 && (
                <button
                  type="button"
                  onClick={() => revokeAll.mutate()}
                  disabled={revokeAll.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1264f7] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#071955] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <LogoutOutlined fontSize="small" />
                  {revokeAll.isPending ? "Signing out..." : "Sign out all devices"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5">
            {sessions.isPending && <p className="text-slate-500">Loading your sessions...</p>}

            {sessions.isError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
                We couldn&apos;t load your sessions. Please refresh the page.
              </p>
            )}

            {sessions.isSuccess && sessionList.length === 0 && (
              <p className="text-slate-500">No other active sessions.</p>
            )}

            {sessionList.length > 0 && (
              <ul className="list-none">
                {sessionList.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onRevoke={() => void handleRevoke(session)}
                    isRevoking={revokeSession.isPending}
                  />
                ))}
              </ul>
            )}
          </div>

          <p className="mt-5 text-sm text-slate-400">
            A signed-out device can stay active for up to 15 minutes before it is locked out.
          </p>
        </section>
      </div>
    </main>
  );
}

export default AccountPageView;
