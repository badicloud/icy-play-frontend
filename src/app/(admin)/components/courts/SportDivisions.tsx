"use client";

import StarOutlined from "@mui/icons-material/StarOutlined";
import { divisionName, maximumDivisions, type Sport } from "@auth/courtApi";

type SportDivisionsProps = {
  /** The court's name, so the preview shows what the divisions will be called. */
  courtName: string;
  sportIds: string[];
  primarySportId: string;
  divisions: Record<string, number>;
  sports: Sport[] | undefined;
  onChange: (divisions: Record<string, number>) => void;
};

/**
 * How many playable courts each sport makes here. A full basketball court is
 * three pickleball courts across, and each of those is booked and priced on its
 * own — so the number is asked per sport rather than once for the court.
 */
function SportDivisions({
  courtName,
  sportIds,
  primarySportId,
  divisions,
  sports,
  onChange,
}: SportDivisionsProps) {
  if (sportIds.length === 0) {
    return null;
  }

  const name = courtName.trim() === "" ? "This court" : courtName.trim();

  return (
    <div>
      <h3 className="text-sm font-bold text-[#071955]">How many courts does each sport make?</h3>
      <p className="mt-1 mb-3 text-sm text-slate-500">
        Leave it at 1 when the court is played whole. A basketball court marked out
        for pickleball is often three.
      </p>

      <ul className="space-y-2">
        {sportIds.map((sportId) => {
          const sport = sports?.find((candidate) => candidate.id === sportId);
          const count = divisions[sportId] ?? 1;
          const sportName = sport?.name ?? "This sport";

          return (
            <li
              key={sportId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-bold text-[#071955]">
                  {sportId === primarySportId && (
                    <StarOutlined sx={{ fontSize: 15 }} className="text-amber-600" aria-hidden />
                  )}
                  {sportName}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {count <= 1 ? (
                    <>Played whole, as &ldquo;{name}&rdquo;.</>
                  ) : (
                    <>
                      {divisionName(name, sportName, 1, count)} to{" "}
                      {divisionName(name, sportName, count, count)}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor={`divisions-${sportId}`} className="text-sm text-slate-500">
                  Courts
                </label>
                <select
                  id={`divisions-${sportId}`}
                  value={count}
                  onChange={(event) =>
                    onChange({ ...divisions, [sportId]: Number(event.target.value) })
                  }
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
                >
                  {Array.from({ length: maximumDivisions }, (_, index) => index + 1).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SportDivisions;
