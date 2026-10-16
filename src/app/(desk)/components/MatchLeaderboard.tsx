"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { getSeriesLeaderboard, type MatchStanding } from "@auth/matchesApi";

type Props = {
  openPlayId: string;
  /** This session's, from the matches board. */
  standings: MatchStanding[];
};

type Row = {
  key: string;
  rank: number;
  name: string;
  isFree: boolean;
  isBest: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  sessions?: number;
};

const ordinal = (rank: number) => {
  const tens = rank % 100;
  if (tens >= 11 && tens <= 13) return `${rank}th`;
  return `${rank}${["th", "st", "nd", "rd"][rank % 10] ?? "th"}`;
};

/**
 * Who has won the most: this session's players, or every registered player
 * over all the open play's sessions. Places go by wins alone — the same wins,
 * the same place — and everyone level on the most wins is a best player.
 */
function MatchLeaderboard({ openPlayId, standings }: Props) {
  const [scope, setScope] = useState<"session" | "series">("session");

  const series = useQuery({
    queryKey: ["desk-open-play-leaderboard", openPlayId],
    queryFn: () => getSeriesLeaderboard(openPlayId),
    enabled: scope === "series",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const sessionRows: Row[] = standings.map((standing) => ({
    key: standing.player.participantId,
    rank: standing.rank,
    name: standing.player.fullName,
    isFree: standing.player.isFree,
    isBest: standing.isBest,
    played: standing.played,
    won: standing.won,
    drawn: standing.drawn,
    lost: standing.lost,
  }));

  const mostSeriesWins = series.data?.standings[0]?.won ?? 0;
  const seriesRows: Row[] = (series.data?.standings ?? []).map((standing, index) => ({
    key: `${index}-${standing.fullName}`,
    rank: standing.rank,
    name: standing.fullName,
    isFree: false,
    isBest: mostSeriesWins > 0 && standing.won === mostSeriesWins,
    played: standing.played,
    won: standing.won,
    drawn: standing.drawn,
    lost: standing.lost,
    sessions: standing.sessions,
  }));

  const rows = scope === "session" ? sessionRows : seriesRows;
  const best = rows.filter((row) => row.isBest);

  const tab = (value: typeof scope, label: string) => (
    <button
      type="button"
      onClick={() => setScope(value)}
      aria-pressed={scope === value}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        scope === value ? "bg-[#071955] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  let body;

  if (scope === "series" && series.isPending) {
    body = <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />;
  } else if (scope === "series" && series.isError) {
    body = (
      <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
        {series.error instanceof ApiError ? series.error.message : "The leaderboard could not be loaded."}
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <p className="mt-3 text-sm text-slate-500">
        {scope === "session"
          ? "No results yet. Finish a match and say who won, and the wins show here."
          : "No results yet in any session."}
      </p>
    );
  } else {
    body = (
      <>
        {best.length > 0 && (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-bold">{best.length === 1 ? "Best player: " : "Best players: "}</span>
            {best.map((row) => row.name).join(", ")} — {best[0].won} {best[0].won === 1 ? "win" : "wins"}
          </p>
        )}
        <div className="mt-3 max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3 text-right">W</th>
                <th className="py-2 pr-3 text-right">D</th>
                <th className="py-2 pr-3 text-right">L</th>
                <th className="py-2 pr-3 text-right">Played</th>
                {scope === "series" && <th className="py-2 text-right">Sessions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className={row.isBest ? "bg-amber-50/60" : undefined}>
                  <td className="py-2 pr-3 font-semibold text-slate-500">{ordinal(row.rank)}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-900">
                    {row.name}
                    {row.isFree && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Free
                      </span>
                    )}
                    {row.isBest && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                        Best
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-bold text-emerald-700">{row.won}</td>
                  <td className="py-2 pr-3 text-right text-slate-600">{row.drawn}</td>
                  <td className="py-2 pr-3 text-right text-slate-600">{row.lost}</td>
                  <td className="py-2 pr-3 text-right text-slate-600">{row.played}</td>
                  {scope === "series" && <td className="py-2 text-right text-slate-600">{row.sessions}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {scope === "series" && (
          <p className="mt-3 text-xs text-slate-500">
            Over {series.data?.sessions ?? 0} {series.data?.sessions === 1 ? "session" : "sessions"}. Free players
            count only in their own session.
          </p>
        )}
      </>
    );
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-[#071955]">Leaderboard</h2>
        <div className="flex gap-1 rounded-full border border-slate-200 p-1">
          {tab("session", "This session")}
          {tab("series", "All sessions")}
        </div>
      </div>
      {body}
    </section>
  );
}

export default MatchLeaderboard;
