"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCheckInRoster } from "@auth/checkInApi";
import { formatClock, formatSessionDate } from "@auth/openPlayApi";

/**
 * The roster on a wide screen by the court: who has arrived, as "Juan C.",
 * never a full name, since anybody walking past can read it.
 *
 * Covers the whole window, desk header and all, so a TV or a spare tablet
 * shows nothing else. It is still a desk page: whoever opens it is signed in
 * as the desk, and it reads the same roster the scanner writes to.
 */
function CheckInScreenView() {
  const params = useSearchParams();
  const openPlayId = params.get("openPlay") ?? "";
  const date = params.get("date") ?? "";

  const roster = useQuery({
    queryKey: ["desk-check-in-screen", openPlayId, date],
    queryFn: () => getCheckInRoster(openPlayId, date),
    enabled: openPlayId !== "" && date !== "",
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 5_000,
    // Left up for hours: keep polling when the tab is not focused.
    refetchIntervalInBackground: true,
  });

  const session = roster.data;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#071955] text-white">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col px-8 py-10">
        {!session ? (
          <p className="m-auto text-2xl font-semibold text-white/70">
            {roster.isError || openPlayId === "" || date === "" ? "This session could not be loaded." : "Loading…"}
          </p>
        ) : (
          <>
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-lg font-semibold uppercase tracking-widest text-sky-300">Open play check-in</p>
                <h1 className="mt-1 text-5xl font-extrabold tracking-tight">{session.title}</h1>
                <p className="mt-2 text-2xl text-white/75">
                  {formatSessionDate(session.date)} · {formatClock(session.startsAt)}–{formatClock(session.endsAt)} ·{" "}
                  {session.unitLabel} {session.courtName}
                </p>
              </div>

              <div className="text-right">
                <p className="text-7xl font-extrabold leading-none">
                  {session.checkedIn}
                  <span className="text-4xl font-semibold text-white/50"> / {session.registered}</span>
                </p>
                <p className="mt-2 text-xl font-semibold text-white/70">checked in</p>
              </div>
            </header>

            {!session.isOpen && (
              <p className="mt-8 rounded-2xl bg-white/10 px-6 py-4 text-2xl font-semibold">
                Check-in opens at {formatClock(session.checkInOpensAt.slice(11))}.
              </p>
            )}

            {session.players.length === 0 ? (
              <p className="m-auto text-3xl font-semibold text-white/60">No players registered yet.</p>
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {session.players.map((player) => {
                  const here = player.checkedInAt !== null;

                  return (
                    <li
                      key={player.registrationId}
                      className={`flex items-center gap-4 rounded-3xl px-6 py-5 text-3xl font-bold ${
                        here ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl ${
                          here ? "bg-white text-emerald-600" : "border-2 border-white/30"
                        }`}
                        aria-hidden
                      >
                        {here ? "✓" : ""}
                      </span>
                      <span className="truncate">{player.displayName}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {roster.isError && (
              <p className="mt-8 text-lg text-amber-300">Lost the connection. Showing the last list; retrying…</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CheckInScreenView;
