"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import type { FacilityDetail } from "@auth/adminApi";
import { useUpdateHours } from "@auth/hooks/useFacilityOwnerEdits";
import { dayNames } from "../onboarding/draft";
import EditDialog from "./EditDialog";

const timeClass =
  "min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-base text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400";

type Day = { dayOfWeek: number; closed: boolean; opensAt: string; closesAt: string };

/** "06:00:00" from the API, "06:00" in the input. */
function fromApiTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function buildDays(facility: FacilityDetail): Day[] {
  return dayNames.map((_, dayOfWeek) => {
    const hour = facility.operatingHours.find((candidate) => candidate.dayOfWeek === dayOfWeek);
    const opensAt = fromApiTime(hour?.opensAt ?? null);
    const closesAt = fromApiTime(hour?.closesAt ?? null);

    return {
      dayOfWeek,
      closed: opensAt === "" || closesAt === "",
      opensAt: opensAt || "06:00",
      closesAt: closesAt || "22:00",
    };
  });
}

type HoursEditDialogProps = {
  facilityOwnerId: string;
  facility: FacilityDetail;
  open: boolean;
  onClose: () => void;
};

function HoursEditDialog({ facilityOwnerId, facility, open, onClose }: HoursEditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateHours(facilityOwnerId, facility.id);
  const [days, setDays] = useState<Day[]>(() => buildDays(facility));
  const [reason, setReason] = useState("");

  function setDay(dayOfWeek: number, change: Partial<Day>) {
    setDays((current) =>
      current.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...change } : day)),
    );
  }

  function copyToEveryOpenDay(source: Day) {
    setDays((current) =>
      current.map((day) =>
        day.closed ? day : { ...day, opensAt: source.opensAt, closesAt: source.closesAt },
      ),
    );
  }

  const invalidDay = days.find((day) => !day.closed && day.closesAt <= day.opensAt);

  async function handleSave() {
    try {
      await update.mutateAsync({
        operatingHours: days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          opensAt: day.closed ? null : toApiTime(day.opensAt),
          closesAt: day.closed ? null : toApiTime(day.closesAt),
        })),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("The opening hours are saved.", { variant: "success" });
      onClose();
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <EditDialog
      title="Opening hours"
      description={`The normal week at ${facility.name}, read in ${facility.timeZone}.`}
      open={open}
      isSaving={update.isPending}
      error={update.error}
      reason={reason}
      onReasonChange={setReason}
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={invalidDay === undefined}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {days.map((day) => (
          <div
            key={day.dayOfWeek}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-100 px-4 py-3 last:border-b-0 even:bg-slate-50/60"
          >
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
        ))}
      </div>

      {invalidDay && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {dayNames[invalidDay.dayOfWeek]} cannot close before it opens.
        </p>
      )}
    </EditDialog>
  );
}

export default HoursEditDialog;
