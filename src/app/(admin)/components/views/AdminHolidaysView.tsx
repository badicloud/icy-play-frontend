"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useSnackbar } from "notistack";
import AddOutlined from "@mui/icons-material/AddOutlined";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { ApiError } from "@/services/api";
import { holidayKinds, holidayKindHints, type Holiday } from "@auth/holidayApi";
import {
  useCreateHoliday,
  useHolidays,
  useSetHolidayActive,
  useUpdateHoliday,
} from "@auth/hooks/useHolidays";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import EditDialog from "../edit/EditDialog";
import { TextField } from "../onboarding/FormControls";

type Draft = {
  name: string;
  date: string;
  kind: string;
  repeatsAnnually: boolean;
};

function emptyDraft(): Draft {
  return {
    name: "",
    date: format(new Date(), "yyyy-MM-dd"),
    kind: holidayKinds[0],
    repeatsAnnually: true,
  };
}

function toDraft(holiday: Holiday): Draft {
  return {
    name: holiday.name,
    date: holiday.date.slice(0, 10),
    kind: holiday.kind,
    repeatsAnnually: holiday.repeatsAnnually,
  };
}

function HolidayDialog({
  holiday,
  open,
  onClose,
}: {
  /** Null when adding rather than correcting. */
  holiday: Holiday | null;
  open: boolean;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const [draft, setDraft] = useState<Draft>(() => (holiday ? toDraft(holiday) : emptyDraft()));

  const saving = create.isPending || update.isPending;

  async function handleSave() {
    const payload = {
      name: draft.name.trim(),
      date: draft.date,
      kind: draft.kind,
      repeatsAnnually: draft.repeatsAnnually,
    };

    try {
      if (holiday) {
        await update.mutateAsync({ id: holiday.id, payload });
      } else {
        await create.mutateAsync(payload);
      }

      enqueueSnackbar(holiday ? "The holiday is saved." : "The holiday is on the calendar.", {
        variant: "success",
      });
      onClose();
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <EditDialog
      title={holiday ? "Edit holiday" : "Add a holiday"}
      description="A day courts may charge their holiday rate on."
      open={open}
      isSaving={saving}
      error={create.error ?? update.error}
      reason=""
      onReasonChange={() => undefined}
      hideReason
      onClose={onClose}
      onSave={() => void handleSave()}
      canSave={draft.name.trim() !== "" && draft.date !== ""}
      confirmLabel={holiday ? "Save changes" : "Add holiday"}
    >
      <div className="grid gap-5">
        <TextField
          id="holiday-name"
          label="Name"
          required
          value={draft.name}
          onChange={(name) => setDraft((current) => ({ ...current, name }))}
          placeholder="Good Friday"
        />

        <TextField
          id="holiday-date"
          label="Date"
          type="date"
          required
          value={draft.date}
          onChange={(date) => setDraft((current) => ({ ...current, date }))}
          hint={
            draft.repeatsAnnually
              ? "Only the day and month are read, so the year here does not matter."
              : "This exact date only."
          }
        />

        <div>
          <label htmlFor="holiday-kind" className="block text-sm font-bold text-[#071955]">
            Kind
          </label>
          <select
            id="holiday-kind"
            value={draft.kind}
            onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}
            className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          >
            {holidayKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-slate-500">{holidayKindHints[draft.kind]}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-center gap-2.5 text-sm font-bold text-[#071955]">
            <input
              type="checkbox"
              checked={draft.repeatsAnnually}
              onChange={(event) =>
                setDraft((current) => ({ ...current, repeatsAnnually: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
            />
            Falls on the same date every year
          </label>
          <p className="mt-1.5 text-sm text-slate-500">
            Leave this off for a holiday that moves — Maundy Thursday, Eid&apos;l Fitr, or a
            proclaimed special day. Those have to be added again for each year.
          </p>
        </div>
      </div>
    </EditDialog>
  );
}

function AdminHolidaysView() {
  const { enqueueSnackbar } = useSnackbar();
  const [includeRetired, setIncludeRetired] = useState(false);
  const holidays = useHolidays(includeRetired);
  const setActive = useSetHolidayActive();
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [adding, setAdding] = useState(false);

  const rows = holidays.data ?? [];
  // A moving holiday whose date has gone needs adding again for next year, and
  // saying how many there are is more use than leaving them to be spotted.
  const stale = rows.filter((holiday) => holiday.isActive && holiday.nextOccurrence === null);

  async function toggle(holiday: Holiday) {
    try {
      await setActive.mutateAsync({ id: holiday.id, isActive: !holiday.isActive });
      enqueueSnackbar(
        holiday.isActive ? `${holiday.name} is retired.` : `${holiday.name} is back.`,
        { variant: "success" },
      );
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Platform admin", href: "/admin" }, { label: "Holidays" }]}
        />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Holidays
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              The days a court charges its holiday rate on. The fixed ones are here
              already; the movable ones — Maundy Thursday, Eid&apos;l Fitr, proclaimed
              special days — have to be added for each year they fall in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            Add a holiday
          </button>
        </div>

        {stale.length > 0 && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <WarningAmberOutlined sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
            <span>
              {stale.length} {stale.length === 1 ? "holiday has" : "holidays have"} a date
              that has already passed and does not repeat. Until{" "}
              {stale.length === 1 ? "it is" : "they are"} given a new date, no court will
              treat {stale.length === 1 ? "that day" : "those days"} as a holiday again.
            </span>
          </p>
        )}

        <label className="mt-5 flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(event) => setIncludeRetired(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
          />
          Show retired holidays
        </label>

        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {holidays.isError ? (
            <p className="p-6 font-semibold text-red-700">
              We couldn&apos;t load the calendar. Please refresh the page.
            </p>
          ) : holidays.isPending ? (
            <p className="p-6 text-slate-500">Loading the calendar…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center font-bold text-[#071955]">No holidays yet.</p>
          ) : (
            <ul>
              {rows.map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`font-bold ${
                          holiday.isActive ? "text-[#071955]" : "text-slate-400 line-through"
                        }`}
                      >
                        {holiday.name}
                      </p>
                      {holiday.repeatsAnnually && (
                        <span
                          title="Falls on the same date every year"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1257d5]"
                        >
                          <EventRepeatOutlined sx={{ fontSize: 12 }} aria-hidden />
                          Every year
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        {holiday.kind}
                      </span>
                      {!holiday.isActive && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                          Retired
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {holiday.nextOccurrence ? (
                        <>Next on {format(parseISO(holiday.nextOccurrence), "d MMMM yyyy")}</>
                      ) : (
                        <span className="text-amber-700">
                          {format(parseISO(holiday.date), "d MMMM yyyy")} has passed — give it a
                          new date for this year.
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(holiday)}
                      className="text-sm font-bold text-[#164eaa] transition hover:text-[#071955]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggle(holiday)}
                      disabled={setActive.isPending}
                      className={`text-sm font-bold transition disabled:cursor-wait disabled:text-slate-400 ${
                        holiday.isActive
                          ? "text-amber-700 hover:text-amber-900"
                          : "text-green-700 hover:text-green-900"
                      }`}
                    >
                      {holiday.isActive ? "Retire" : "Reinstate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 text-sm text-slate-400">
          Retiring a holiday leaves it on record. A booking already priced as a holiday
          needs the day that made it one to still be there when the receipt is questioned.
        </p>
      </div>

      {/* Keyed so a reopened dialog starts from what is saved, not from what
          was typed and abandoned last time. */}
      {adding && <HolidayDialog key="new" holiday={null} open onClose={() => setAdding(false)} />}
      {editing && (
        <HolidayDialog key={editing.id} holiday={editing} open onClose={() => setEditing(null)} />
      )}
    </main>
  );
}

export default AdminHolidaysView;
