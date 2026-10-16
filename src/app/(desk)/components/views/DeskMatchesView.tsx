"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { checkInHref } from "@auth/checkInApi";
import {
  correctMatchResult,
  finishMatch,
  getMatchBoard,
  markPlayerDone,
  playNextMatch,
  putPlayerBackIn,
  moveToTeam,
  startMatch,
  type MatchBoard,
  type MatchBoardMatch,
  type MatchBoardPlayer,
} from "@auth/matchesApi";
import { formatClock, formatSessionDate } from "@auth/openPlayApi";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import MatchLeaderboard from "../MatchLeaderboard";
import MatchResultForm from "../MatchResultForm";

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-6xl px-6 pt-8 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Venue desk", href: "/desk" },
            { label: "Open play", href: "/desk/open-play" },
            { label: "Matches" },
          ]}
        />
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

const statusLabel: Record<MatchBoardMatch["status"], { text: string; tone: string }> = {
  Forming: { text: "Open slots", tone: "bg-amber-100 text-amber-900" },
  Ready: { text: "Ready", tone: "bg-blue-100 text-blue-900" },
  Playing: { text: "Now playing", tone: "bg-emerald-100 text-emerald-900" },
  Finished: { text: "Finished", tone: "bg-slate-100 text-slate-600" },
};

/** "Team A won · 21–17", "Draw · 15–15", "No result yet". */
function resultText(match: MatchBoardMatch) {
  if (match.result === null) return "No result yet";
  const who = match.result === "Draw" ? "Draw" : `Team ${match.result} won`;
  return match.scoreA !== null && match.scoreB !== null ? `${who} · ${match.scoreA}–${match.scoreB}` : who;
}

/**
 * The desk's matches for one open play session. Players who check in are put
 * into matches in the order they arrive, by the server; this shows them, and
 * starts and finishes the games, takes a tired player out and puts them back.
 * Everything is the server's answer: the page only asks it to move.
 */
function DeskMatchesView() {
  const params = useSearchParams();
  const openPlayId = params.get("openPlay") ?? "";
  const date = params.get("date") ?? "";
  const client = useQueryClient();
  const key = ["desk-matches", openPlayId, date];

  // Which player's "Done" or "Play next match" is being asked about, and which short match's start.
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const [nextFor, setNextFor] = useState<string | null>(null);
  // Who the desk picked to take the seat, for "Play next match".
  const [pick, setPick] = useState("");
  // Whose options menu is open.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [shortStart, setShortStart] = useState<string | null>(null);
  // The match whose "Who won?" is open: finishing it, or putting its result right.
  const [resultFor, setResultFor] = useState<{ matchId: string; correcting: boolean } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const board = useQuery({
    queryKey: key,
    queryFn: () => getMatchBoard(openPlayId, date),
    enabled: openPlayId !== "" && date !== "",
    staleTime: 0,
    refetchOnMount: "always",
    // Players checking in at another device fill the matches here too.
    refetchInterval: 5_000,
  });

  const act = useMutation({
    mutationFn: (run: () => Promise<MatchBoard>) => run(),
    onSuccess: (fresh) => {
      client.setQueryData(key, fresh);
      setProblem(null);
      setDoneFor(null);
      setNextFor(null);
      setMenuFor(null);
      setShortStart(null);
      setResultFor(null);
    },
    onError: (error) => setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  if (openPlayId === "" || date === "") {
    return (
      <Page>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">This link is missing the open play or the date.</p>
      </Page>
    );
  }

  if (board.isPending) {
    return (
      <Page>
        <div className="h-64 animate-pulse rounded-[24px] border border-slate-200 bg-white" />
      </Page>
    );
  }

  if (board.isError) {
    return (
      <Page>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
          {board.error instanceof ApiError ? board.error.message : "This session could not be loaded."}
        </p>
      </Page>
    );
  }

  const session = board.data;
  const playing = session.matches.filter((match) => match.status === "Playing");
  const upcoming = session.matches.filter((match) => match.status === "Forming" || match.status === "Ready");
  const finished = session.matches.filter((match) => match.status === "Finished").reverse();
  const nextUp = upcoming[0];
  const courtBusy = playing.length > 0;
  const busy = act.isPending;
  // Who can take a seat in the next match: the players in the matches after
  // it, fewest games first — nobody who hasn't played, then one game, then two
  // — and in line order among equals.
  const candidates = upcoming
    .slice(1)
    .flatMap((match) => [...match.teamA, ...match.teamB])
    .filter((seat): seat is MatchBoardPlayer => seat !== null)
    .map((player, order) => ({ player, order }))
    .sort((a, b) => a.player.played - b.player.played || a.order - b.order)
    .map(({ player }) => player);

  const gamesText = (played: number) =>
    played === 0 ? "No games yet" : `${played} ${played === 1 ? "game" : "games"}`;

  /**
   * One player in a match. `otherTeam`, for a player in the next match, is
   * the team they can be moved to; they can also go to the end of the line,
   * somebody from further back taking their seat.
   */
  function playerChip(
    player: MatchBoardPlayer | null,
    index: number,
    canMarkDone: boolean,
    canPlayNext: boolean,
    otherTeam: "A" | "B" | null,
  ) {
    if (player === null) {
      return (
        <li
          key={`open-${index}`}
          className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400"
        >
          Open slot
        </li>
      );
    }

    const asking = doneFor === player.participantId;
    const askingNext = nextFor === player.participantId;

    const menuOpen = menuFor === player.participantId;

    function open(which: "done" | "next") {
      setMenuFor(null);
      setDoneFor(which === "done" ? player!.participantId : null);
      setNextFor(which === "next" ? player!.participantId : null);
    }

    const item = "block w-full px-4 py-2 text-left text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60";

    return (
      <li key={player.participantId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-slate-900">
            {player.fullName}
            {player.isFree && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Free
              </span>
            )}
            <span
              title="Matches played this session"
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                player.played === 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {gamesText(player.played)}
            </span>
          </span>
          {canMarkDone && !asking && !askingNext && (
            <span className="relative shrink-0">
              <button
                type="button"
                aria-label={`Options for ${player.fullName}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuFor(menuOpen ? null : player.participantId)}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${
                  menuOpen ? "bg-slate-100 text-slate-800" : ""
                }`}
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  {/* A click anywhere else closes the menu. */}
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setMenuFor(null)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <span
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {otherTeam && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => act.mutate(() => moveToTeam(player.participantId, otherTeam))}
                        className={`${item} text-slate-800`}
                      >
                        Move to Team {otherTeam}
                      </button>
                    )}
                    {canPlayNext && candidates.length > 0 && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setPick(candidates[0].participantId);
                          open("next");
                        }}
                        className={`${item} text-slate-800`}
                      >
                        Play next match
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => open("done")}
                      className={`${item} text-red-700`}
                    >
                      Done for today
                    </button>
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        {askingNext && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-slate-600">
              {player.fullName} goes to the last open slot. Who takes this seat?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Player to take this seat"
                value={pick}
                onChange={(event) => setPick(event.target.value)}
                className="min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#2563EB]"
              >
                {candidates.map((candidate) => (
                  <option key={candidate.participantId} value={candidate.participantId}>
                    {candidate.fullName} — {gamesText(candidate.played)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !candidates.some((candidate) => candidate.participantId === pick)}
                onClick={() => act.mutate(() => playNextMatch(player.participantId, pick))}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563EB] hover:bg-blue-100 disabled:opacity-60"
              >
                Move them
              </button>
              <button type="button" onClick={() => setNextFor(null)} className="text-xs font-semibold text-slate-500">
                Keep
              </button>
            </div>
          </div>
        )}
        {asking && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">Done for today?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => act.mutate(() => markPlayerDone(player.participantId))}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Yes, take them out
            </button>
            <button
              type="button"
              onClick={() => setDoneFor(null)}
              className="text-xs font-semibold text-slate-500"
            >
              Keep
            </button>
          </div>
        )}
      </li>
    );
  }

  function matchCard(match: MatchBoardMatch, actions?: ReactNode) {
    const label = statusLabel[match.status];
    const canMarkDone = match.status !== "Finished" && !session.isOver;
    const finished = match.status === "Finished";
    const asking = resultFor?.matchId === match.matchId;
    // The next match to play: any of its players can go to the end of the line for somebody further back.
    const isNext = !session.isOver && match === nextUp;

    return (
      <section key={match.matchId} className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#071955]">Match {match.number}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${label.tone}`}>{label.text}</span>
            {finished && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  match.result === null ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {resultText(match)}
              </span>
            )}
          </div>
          {!asking && actions}
        </div>
        {asking && (
          <MatchResultForm
            initial={
              resultFor.correcting && match.result !== null
                ? { result: match.result, scoreA: match.scoreA, scoreB: match.scoreB }
                : null
            }
            submitLabel={resultFor.correcting ? "Save result" : "Finish match"}
            busy={busy}
            onCancel={() => setResultFor(null)}
            onSubmit={(input) =>
              act.mutate(() =>
                resultFor.correcting ? correctMatchResult(match.matchId, input) : finishMatch(match.matchId, input),
              )
            }
          />
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["A", "B"] as const).map((team) => {
            const won = finished && match.result === team;

            return (
              <div key={team} className={won ? "rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200" : undefined}>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Team {team}
                  {won && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">Winner</span>
                  )}
                </p>
                <ul className="space-y-2">
                  {(team === "A" ? match.teamA : match.teamB).map((player, index) =>
                    playerChip(player, index, canMarkDone, isNext, isNext ? (team === "A" ? "B" : "A") : null),
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <Page>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Matches</h1>
            <p className="mt-2 text-lg font-semibold text-[#071955]">{session.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {formatSessionDate(session.date)} · {formatClock(session.startsAt)}–{formatClock(session.endsAt)} ·{" "}
              {session.unitLabel} {session.courtName} · {session.sportName}, {session.playersPerTeam} per team
            </p>
          </div>
          <Link
            href={checkInHref(openPlayId, date)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            {session.isOver ? "View check-ins" : "Check in players"}
          </Link>
        </div>

        {problem && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {problem}
          </p>
        )}

        {session.isOver && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This session has ended. The matches below are what was played.
          </p>
        )}

        {session.matches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-slate-950">No matches yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Matches form by themselves as players check in, in the order they arrive.
            </p>
          </div>
        ) : (
          <>
            {playing.map((match) =>
              matchCard(
                match,
                !session.isOver && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setResultFor({ matchId: match.matchId, correcting: false })}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Finish
                  </button>
                ),
              ),
            )}

            {upcoming.length > 0 && !session.isOver && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Up next</h2>
                {upcoming.map((match) => {
                  const isNext = match === nextUp;
                  const full = match.status === "Ready";
                  const onA = match.teamA.filter((seat) => seat !== null).length;
                  const onB = match.teamB.filter((seat) => seat !== null).length;
                  // Never started 5 against 4: the server refuses it too.
                  const uneven = onA !== onB;

                  let actions: ReactNode = null;

                  if (isNext && !session.isOver) {
                    actions = courtBusy ? (
                      <span className="text-xs text-slate-500">Starts when the court is free</span>
                    ) : uneven ? (
                      <span className="flex flex-wrap items-center justify-end gap-3">
                        <span className="text-xs font-semibold text-amber-700">
                          Uneven teams ({onA} v {onB}). Move a player to even them.
                        </span>
                        <button
                          type="button"
                          disabled
                          className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white opacity-40"
                        >
                          Start
                        </button>
                      </span>
                    ) : shortStart === match.matchId ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600">Teams are not full. Start anyway?</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act.mutate(() => startMatch(match.matchId, true))}
                          className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                          Start anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => setShortStart(null)}
                          className="text-sm font-semibold text-slate-500"
                        >
                          Wait
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          full ? act.mutate(() => startMatch(match.matchId, false)) : setShortStart(match.matchId)
                        }
                        className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busy ? "Saving…" : "Start"}
                      </button>
                    );
                  }

                  return matchCard(match, actions);
                })}
              </div>
            )}

            <MatchLeaderboard openPlayId={openPlayId} standings={session.standings} />

            {finished.length > 0 && (
              <details className="rounded-[24px] border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer text-sm font-bold text-slate-700">
                  Finished matches ({finished.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {finished.map((match) =>
                    matchCard(
                      match,
                      // Once the session is over, what was played stands.
                      !session.isOver && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setResultFor({ matchId: match.matchId, correcting: true })}
                          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-60"
                        >
                          {match.result === null ? "Set result" : "Change result"}
                        </button>
                      ),
                    ),
                  )}
                </div>
              </details>
            )}
          </>
        )}

        {session.waiting.length > 0 && (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-[#071955]">Waiting</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {session.waiting.map((player) => (
                <li key={player.participantId} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {player.fullName}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-[#071955]">Done for today</h2>
          {session.done.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Nobody yet. Press Done beside a player who is tired, hurt or leaving, and the matches adjust.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {session.done.map((player) => (
                <li key={player.participantId} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{player.fullName}</span>
                  {!session.isOver && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act.mutate(() => putPlayerBackIn(player.participantId))}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-60"
                    >
                      Back in
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}

export default DeskMatchesView;
