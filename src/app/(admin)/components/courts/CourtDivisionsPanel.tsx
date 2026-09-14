"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import type { Court } from "@auth/courtApi";
import { useUpdateCourtDivisions } from "@auth/hooks/useCourts";
import { useSports } from "@auth/hooks/useSports";
import SportDivisions from "./SportDivisions";

/**
 * Re-marking a floor is a small, frequent change, so it is made here rather
 * than through the whole court: one number should not put every other field on
 * the court at risk.
 */
function CourtDivisionsPanel({ court }: { court: Court }) {
  const { enqueueSnackbar } = useSnackbar();
  const sports = useSports();
  const save = useUpdateCourtDivisions(court.id);

  const saved = Object.fromEntries(court.sports.map((sport) => [sport.sportId, sport.divisions]));
  const [divisions, setDivisions] = useState<Record<string, number>>(saved);
  const [reason, setReason] = useState("");

  const changed = court.sports.some(
    (sport) => (divisions[sport.sportId] ?? 1) !== sport.divisions,
  );

  async function handleSave() {
    try {
      await save.mutateAsync({
        sports: court.sports.map((sport) => ({
          sportId: sport.sportId,
          divisions: divisions[sport.sportId] ?? 1,
        })),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The court layout is saved.", { variant: "success" });
      setReason("");
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  if (court.sports.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
        Dividing the court
      </h2>

      <div className="mt-4">
        <SportDivisions
          courtName={court.name}
          sportIds={court.sports.map((sport) => sport.sportId)}
          primarySportId={court.sports.find((sport) => sport.isPrimary)?.sportId ?? ""}
          divisions={divisions}
          sports={sports.data}
          onChange={setDivisions}
        />
      </div>

      {changed && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <label htmlFor="divisions-reason" className="block text-sm font-bold text-[#071955]">
            Why are you changing this?
          </label>
          <input
            id="divisions-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Floor re-marked for pickleball"
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-1.5 text-sm text-slate-500">
            Recorded with the change, so the trail explains itself later.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={save.isPending}
              className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {save.isPending ? "Saving…" : "Save layout"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDivisions(saved);
                setReason("");
              }}
              className="text-sm font-bold text-slate-500 transition hover:text-[#071955]"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-slate-400">
        Each court made this way is booked and priced on its own, and they run
        side by side — that is what marking out a floor is for.
      </p>
    </section>
  );
}

export default CourtDivisionsPanel;
