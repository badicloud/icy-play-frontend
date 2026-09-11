"use client";

import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import { dayNames, type DayHours } from "../draft";
import type { FieldErrors } from "../validation";
import { StepHeading } from "../FormControls";

const timeClass =
  "min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-base text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400";

type HoursStepProps = {
  value: DayHours[];
  errors: FieldErrors;
  onChange: (hours: DayHours[]) => void;
};

function HoursStep({ value, errors, onChange }: HoursStepProps) {
  function setDay(dayOfWeek: number, change: Partial<DayHours>) {
    onChange(value.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...change } : day)));
  }

  /** Nobody wants to type the same two times seven times over. */
  function copyToEveryOpenDay(source: DayHours) {
    onChange(
      value.map((day) =>
        day.closed ? day : { ...day, opensAt: source.opensAt, closesAt: source.closesAt },
      ),
    );
  }

  return (
    <div>
      <StepHeading
        title="Opening hours"
        description="The facility's normal week. A court that keeps different hours can override this later."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {value.map((day) => {
          const error = errors[`day-${day.dayOfWeek}`];

          return (
            <div
              key={day.dayOfWeek}
              className="border-b border-slate-100 px-4 py-3 last:border-b-0 even:bg-slate-50/60"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="w-24 font-bold text-[#071955]">{dayNames[day.dayOfWeek]}</span>

                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={(event) => setDay(day.dayOfWeek, { closed: event.target.checked })}
                    className="size-4 rounded border-slate-300 text-[#2563EB]"
                  />
                  Closed
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${dayNames[day.dayOfWeek]} opens at`}
                    value={day.opensAt}
                    disabled={day.closed}
                    onChange={(event) => setDay(day.dayOfWeek, { opensAt: event.target.value })}
                    className={timeClass}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    aria-label={`${dayNames[day.dayOfWeek]} closes at`}
                    value={day.closesAt}
                    disabled={day.closed}
                    onChange={(event) => setDay(day.dayOfWeek, { closesAt: event.target.value })}
                    className={timeClass}
                  />
                </div>

                {!day.closed && (
                  <button
                    type="button"
                    onClick={() => copyToEveryOpenDay(day)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-[#2563EB] transition hover:bg-blue-50"
                  >
                    <ContentCopyOutlined sx={{ fontSize: 15 }} />
                    Copy to open days
                  </button>
                )}
              </div>

              {error && <p className="mt-1.5 text-sm font-semibold text-red-700">{error}</p>}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        A closed day is one with no hours at all, not a flag beside them. That way the two can
        never disagree.
      </p>
    </div>
  );
}

export default HoursStep;
