"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import EditDialog from "./edit/EditDialog";
import { ApiError } from "@/services/api";
import { formatClock, openPlayLevel } from "@auth/openPlayApi";
import {
  buildSampleOpenPlays,
  removeSampleOpenPlays,
  seedAllowance,
  seededOpenPlays,
  type OpenPlaySeedRemoval,
  type OpenPlaySeedResult,
  type SeededOpenPlay,
} from "@auth/seedApi";

function describe(openPlay: SeededOpenPlay) {
  return `${openPlay.sportName}, ${openPlayLevel(openPlay.level)}, ${openPlay.days} ${formatClock(
    openPlay.startsAt,
  )}–${formatClock(openPlay.endsAt)}`;
}

/**
 * Puts sample open plays on the demo venues, and takes them away again.
 *
 * The same two halves as the demo venue panel above, on the same allowance:
 * building for the named accounts, removing for the narrower list. Demo venues
 * only, because an open play blocks its court hours and a sample one would
 * turn real customers away from a real venue.
 */
function SeedOpenPlayPanel() {
  const client = useQueryClient();
  const [built, setBuilt] = useState<OpenPlaySeedResult | null>(null);
  const [removed, setRemoved] = useState<OpenPlaySeedRemoval | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const allowance = useQuery({
    queryKey: ["seed", "allowance"],
    queryFn: seedAllowance,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const mayRemove = allowance.data?.mayRemove === true;

  const standing = useQuery({
    queryKey: ["seed", "open-plays"],
    queryFn: seededOpenPlays,
    enabled: mayRemove,
    retry: false,
  });

  const refresh = () => {
    // The public listing and the court calendars both just changed.
    void client.invalidateQueries({ queryKey: ["catalog"] });
    void client.invalidateQueries({ queryKey: ["admin"] });
    void client.invalidateQueries({ queryKey: ["seed", "open-plays"] });
  };

  const build = useMutation({
    mutationFn: buildSampleOpenPlays,
    onSuccess: (result) => {
      setBuilt(result);
      setRemoved(null);
      setProblem(null);
      refresh();
    },
    onError: (error: unknown) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Please try again."),
  });

  const remove = useMutation({
    mutationFn: removeSampleOpenPlays,
    onSuccess: (result) => {
      setRemoved(result);
      setBuilt(null);
      setProblem(null);
      setAsking(false);
      refresh();
    },
  });

  if (allowance.data?.mayBuild !== true) {
    return null;
  }

  const openPlays = standing.data ?? [];
  const registrations = openPlays.reduce((sum, openPlay) => sum + openPlay.registrations, 0);

  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            <GroupsOutlined sx={{ fontSize: 18 }} />
            Sample open plays
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puts five open plays on every demo venue: pickleball for all levels, beginners and
            advanced, badminton for intermediates, and weekend basketball. Different weekdays,
            fixed and percentage early birds, and one that ends after eight weeks.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Demo venues only. An open play blocks its court hours, so a sample on a real venue
            would turn real customers away. A court whose hours are already booked is skipped
            rather than double-sold. Build a demo venue above first.
          </p>
        </div>

        <button
          type="button"
          disabled={build.isPending}
          onClick={() => build.mutate()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-wait disabled:text-slate-400"
        >
          {build.isPending ? "Building…" : "Build sample open plays"}
        </button>
      </div>

      {mayRemove && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          {openPlays.length === 0 ? (
            <p className="text-sm text-slate-400">
              No sample open plays at the moment. Anything built here can be taken away again
              from this same panel.
            </p>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-sm font-bold text-[#071955]">
                  {openPlays.length} sample open {openPlays.length === 1 ? "play" : "plays"}{" "}
                  standing, with {registrations}{" "}
                  {registrations === 1 ? "registration" : "registrations"} on them.
                </p>
                <ul className="mt-2 space-y-1">
                  {openPlays.map((openPlay) => (
                    <li key={openPlay.openPlayId} className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-600">{openPlay.title}</span> —{" "}
                      {openPlay.facilityName}, {openPlay.courtName}: {describe(openPlay)}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setAsking(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
              >
                Remove sample open plays
              </button>
            </div>
          )}
        </div>
      )}

      <EditDialog
        title="Remove sample open plays"
        description="Every open play the seeder built, with its sessions and registrations."
        open={asking}
        isSaving={remove.isPending}
        error={remove.error}
        onClose={() => setAsking(false)}
        onSave={() => remove.mutate()}
        confirmLabel="Remove them all"
        busyLabel="Removing…"
        destructive
        hideReason
        reason=""
        onReasonChange={() => {}}
      >
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <WarningAmberOutlined sx={{ fontSize: 20 }} className="mt-0.5 shrink-0 text-red-700" />
          <p className="text-sm leading-6 text-red-900">
            This cannot be undone. The demo venues stay, and so does any open play somebody made
            by hand: the removal goes on the marker the seeder writes, never on the title.
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Going: {openPlays.length} open {openPlays.length === 1 ? "play" : "plays"} and{" "}
          {registrations} {registrations === 1 ? "registration" : "registrations"}. Their court
          hours go back on sale.
        </p>
      </EditDialog>

      {problem && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {problem}
        </p>
      )}

      {removed && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-[#071955]">
            {removed.openPlays === 0
              ? "There were no sample open plays to remove."
              : `${removed.openPlays} open ${removed.openPlays === 1 ? "play" : "plays"} removed, with ${removed.registrations} ${removed.registrations === 1 ? "registration" : "registrations"}.`}
          </p>
        </div>
      )}

      {built && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-bold text-green-900">
            {built.openPlays.length === 0
              ? "Nothing new was built."
              : `${built.openPlays.length} open ${built.openPlays.length === 1 ? "play" : "plays"} built on ${built.venues} demo ${built.venues === 1 ? "venue" : "venues"}.`}
          </p>
          {built.skipped.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-green-900">
              {built.skipped.map((line) => (
                <li key={line}>Skipped {line}</li>
              ))}
            </ul>
          )}
          <Link
            href="/open-play"
            className="mt-2 inline-block text-sm font-bold text-[#164eaa] underline underline-offset-2"
          >
            See them on the open play page
          </Link>
        </div>
      )}
    </section>
  );
}

export default SeedOpenPlayPanel;
