"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import { ApiError } from "@/services/api";
import type { Court, CourtSportItem } from "@auth/courtApi";
import { useUpdateCourtPricing } from "@auth/hooks/useCourts";
import TimePicker, { formatTime } from "../ui/TimePicker";

/** The four rates, as typed. Strings, because a half-typed "12." is not a number yet. */
type RateForm = {
  standardHourlyRate: string;
  peakHourlyRate: string;
  weekendRate: string;
  holidayRate: string;
};

const emptyRates: RateForm = {
  standardHourlyRate: "",
  peakHourlyRate: "",
  weekendRate: "",
  holidayRate: "",
};

const rateFields = [
  {
    key: "standardHourlyRate" as const,
    label: "Standard hourly rate",
    hint: "What an ordinary weekday hour costs.",
  },
  {
    key: "peakHourlyRate" as const,
    label: "Peak hours rate",
    hint: "Set one and you can pick the hours below. Blank charges the standard rate.",
  },
  {
    key: "weekendRate" as const,
    label: "Weekend rate",
    hint: "Leave blank to charge the standard rate.",
  },
  {
    key: "holidayRate" as const,
    label: "Holiday rate",
    hint: "Leave blank to charge the standard rate.",
  },
];

function toForm(sport: CourtSportItem): RateForm {
  return {
    standardHourlyRate: sport.standardHourlyRate === null ? "" : String(sport.standardHourlyRate),
    peakHourlyRate: sport.peakHourlyRate === null ? "" : String(sport.peakHourlyRate),
    weekendRate: sport.weekendRate === null ? "" : String(sport.weekendRate),
    holidayRate: sport.holidayRate === null ? "" : String(sport.holidayRate),
  };
}

/** "18:00:00" from the API, "18:00" in an input. */
function toInputTime(value: string | null) {
  return value === null ? "" : value.slice(0, 5);
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const weekendNames = ["Saturday", "Sunday"];

/**
 * The hours the peak window has to fit inside: the latest the court opens and
 * the earliest it closes across the days the window applies to. Measured at the
 * narrowest, because a window that fits Monday but overruns an early Saturday
 * close is wrong on the Saturday.
 */
function boundsFor(court: Court, onWeekdays: boolean, onWeekends: boolean) {
  const days = [
    ...(onWeekdays ? [1, 2, 3, 4, 5] : []),
    ...(onWeekends ? [6, 0] : []),
  ];

  const open = court.operatingHours.filter(
    (hour) => days.includes(hour.dayOfWeek) && hour.opensAt !== null && hour.closesAt !== null,
  );

  if (open.length === 0) {
    return null;
  }

  return {
    opensAt: open.map((hour) => toInputTime(hour.opensAt)).sort().at(-1) as string,
    closesAt: open.map((hour) => toInputTime(hour.closesAt)).sort().at(0) as string,
  };
}

/**
 * What the whole court charges, when every sport charges the same. Blank when
 * they differ: this box says "the rate for every sport", and there is no single
 * figure to show when there isn't one.
 */
function commonRates(court: Court): RateForm | null {
  if (court.sports.length === 0) {
    return null;
  }

  const first = toForm(court.sports[0]);
  const shared = court.sports.every((sport) => {
    const form = toForm(sport);
    return rateFields.every((field) => form[field.key] === first[field.key]);
  });

  return shared && first.standardHourlyRate !== "" ? first : null;
}

function toNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A rate is wrong if it is not a number, or is negative. Blank is allowed. */
function rateError(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return "That is not an amount.";
  }

  return parsed < 0 ? "A rate cannot be negative." : undefined;
}

function RateInputs({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: RateForm;
  onChange: (next: RateForm) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rateFields.map((field) => {
        const error = rateError(value[field.key]);
        return (
          <div key={field.key}>
            <label
              htmlFor={`${idPrefix}-${field.key}`}
              className="block text-sm font-bold text-[#071955]"
            >
              {field.label}
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ₱
              </span>
              <input
                id={`${idPrefix}-${field.key}`}
                inputMode="decimal"
                value={value[field.key]}
                placeholder="0.00"
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                className={`min-h-13 w-full rounded-xl border bg-white pl-9 pr-4 text-base text-[#071955] shadow-sm outline-none transition focus:ring-2 focus:ring-blue-200 ${
                  error ? "border-red-500" : "border-slate-200 focus:border-[#1264f7]"
                }`}
              />
            </div>
            <p className={`mt-1.5 text-sm ${error ? "font-semibold text-red-700" : "text-slate-500"}`}>
              {error ?? field.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A line of what this sport actually charges, with the fallbacks resolved. The
 * stored blank means "same as standard", and a reader should not have to
 * remember that to know what a customer pays.
 */
function Summary({ rates }: { rates: RateForm }) {
  const standard = toNumber(rates.standardHourlyRate);

  if (standard === null) {
    return <span className="text-sm text-slate-400">No price yet</span>;
  }

  const parts = [
    `${peso(standard)}/hr`,
    ...[
      { label: "peak", value: toNumber(rates.peakHourlyRate) },
      { label: "weekend", value: toNumber(rates.weekendRate) },
      { label: "holiday", value: toNumber(rates.holidayRate) },
    ]
      .filter((entry) => entry.value !== null && entry.value !== standard)
      .map((entry) => `${peso(entry.value as number)} ${entry.label}`),
  ];

  return <span className="text-sm text-slate-500">{parts.join(" · ")}</span>;
}

function CourtPricingPanel({ court }: { court: Court }) {
  const { enqueueSnackbar } = useSnackbar();
  const save = useUpdateCourtPricing(court.id);

  // Seeded from what is saved, so reopening the page shows the court's rates
  // rather than an empty box beside a peak window that clearly remembers.
  const shared = commonRates(court);
  const [defaults, setDefaults] = useState<RateForm>(shared ?? emptyRates);
  const [rates, setRates] = useState<Record<string, RateForm>>(() =>
    Object.fromEntries(court.sports.map((sport) => [sport.sportId, toForm(sport)])),
  );
  // The primary sport opens first: it is the one most likely to be priced, and
  // the rest stay shut so the list still reads as a list.
  const [openIds, setOpenIds] = useState<string[]>(() => {
    const first = court.sports.find((sport) => sport.isPrimary) ?? court.sports[0];
    return first ? [first.sportId] : [];
  });

  const allOpen = openIds.length === court.sports.length;

  const [peak, setPeak] = useState({
    startsAt: toInputTime(court.peakStartsAt),
    endsAt: toInputTime(court.peakEndsAt),
    // A court that has never had a peak rate starts on weekdays, which is what
    // a venue means by "peak" far more often than the weekend.
    onWeekdays: court.peakStartsAt === null ? true : court.peakOnWeekdays,
    onWeekends: court.peakOnWeekends,
  });
  const [reason, setReason] = useState("");

  const anyError = [defaults, ...Object.values(rates)].some((form) =>
    rateFields.some((field) => rateError(form[field.key])),
  );

  // Shown the moment a peak rate is typed anywhere, defaults included: a rate
  // with no window can never be charged, so asking for both together is the
  // only honest order.
  const wantsPeak =
    defaults.peakHourlyRate.trim() !== "" ||
    Object.values(rates).some((form) => form.peakHourlyRate.trim() !== "");

  const bounds = boundsFor(court, peak.onWeekdays, peak.onWeekends);

  const peakError = !wantsPeak
    ? undefined
    : !peak.onWeekdays && !peak.onWeekends
      ? "Pick weekdays, weekends, or both."
      : bounds === null
        ? "This court is closed on the days you picked."
        : peak.startsAt === "" || peak.endsAt === ""
          ? "Say when the peak window starts and ends."
          : peak.endsAt <= peak.startsAt
            ? "The peak window has to end after it starts."
            : peak.startsAt < bounds.opensAt || peak.endsAt > bounds.closesAt
              ? `Keep it inside ${formatTime(bounds.opensAt)} to ${formatTime(bounds.closesAt)}, when this court is open.`
              : undefined;

  // A special rate with no standard one to be special against would be charged
  // as the standard anyway, which is not what typing it meant.
  const orphanedSpecial = Object.values(rates).some(
    (form) =>
      form.standardHourlyRate.trim() === "" &&
      [form.peakHourlyRate, form.weekendRate, form.holidayRate].some(
        (value) => value.trim() !== "",
      ),
  );

  function applyToAll() {
    setRates(Object.fromEntries(court.sports.map((sport) => [sport.sportId, { ...defaults }])));
    enqueueSnackbar(
      `Filled in ${court.sports.length} ${court.sports.length === 1 ? "sport" : "sports"}. Nothing is saved until you press Save.`,
      { variant: "info" },
    );
  }

  async function handleSave() {
    try {
      await save.mutateAsync({
        peakWindow: wantsPeak
          ? {
              startsAt: toApiTime(peak.startsAt),
              endsAt: toApiTime(peak.endsAt),
              onWeekdays: peak.onWeekdays,
              onWeekends: peak.onWeekends,
            }
          : null,
        sports: court.sports.map((sport) => ({
          sportId: sport.sportId,
          standardHourlyRate: toNumber(rates[sport.sportId].standardHourlyRate),
          peakHourlyRate: toNumber(rates[sport.sportId].peakHourlyRate),
          weekendRate: toNumber(rates[sport.sportId].weekendRate),
          holidayRate: toNumber(rates[sport.sportId].holidayRate),
        })),
        reason: reason.trim() === "" ? null : reason.trim(),
      });
      enqueueSnackbar("Pricing is saved.", { variant: "success" });
      setReason("");
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  if (court.sports.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-[#071955]">Nothing to price yet</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-500">
          Add a sport to this court first. Prices hang off the pair, so a court with
          no sports has nothing to charge for.
        </p>
      </section>
    );
  }

  return (
    <div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#071955]">Set a rate for every sport</h2>
        <p className="mt-1 text-slate-500">
          Fill these in and apply them to all {court.sports.length}{" "}
          {court.sports.length === 1 ? "sport" : "sports"} at once. Each sport can
          then be corrected on its own below.
        </p>

        {shared === null && court.sports.some((sport) => sport.standardHourlyRate !== null) && (
          <p className="mt-2 text-sm text-amber-700">
            These sports are priced differently, so there is no single rate to show
            here. Filling this in replaces all of them.
          </p>
        )}

        <div className="mt-5">
          <RateInputs idPrefix="default-rate" value={defaults} onChange={setDefaults} />
        </div>

        {wantsPeak && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-[#071955]">When is peak?</h3>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              The peak rate is charged inside these hours and nowhere else. It has to
              sit within the hours this court is open
              {bounds && ` — ${formatTime(bounds.opensAt)} to ${formatTime(bounds.closesAt)}`}.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <TimePicker
                id="peak-starts"
                label="Peak starts"
                value={peak.startsAt}
                onChange={(startsAt) => setPeak((current) => ({ ...current, startsAt }))}
                hint={bounds ? `Open ${formatTime(bounds.opensAt)} to ${formatTime(bounds.closesAt)}` : undefined}
              />
              <TimePicker
                id="peak-ends"
                label="Peak ends"
                value={peak.endsAt}
                onChange={(endsAt) => setPeak((current) => ({ ...current, endsAt }))}
                hint={bounds ? `Open ${formatTime(bounds.opensAt)} to ${formatTime(bounds.closesAt)}` : undefined}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
                <input
                  type="checkbox"
                  checked={peak.onWeekdays}
                  onChange={(event) =>
                    setPeak((current) => ({ ...current, onWeekdays: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                />
                Weekdays
                <span className="font-normal text-slate-400">
                  {weekdayNames[0]}–{weekdayNames[4]}
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-semibold text-[#071955]">
                <input
                  type="checkbox"
                  checked={peak.onWeekends}
                  onChange={(event) =>
                    setPeak((current) => ({ ...current, onWeekends: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                />
                Weekends
                <span className="font-normal text-slate-400">
                  {weekendNames[0]} and {weekendNames[1]}
                </span>
              </label>
            </div>

            {peakError && (
              <p className="mt-3 text-sm font-semibold text-red-700">{peakError}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={applyToAll}
          disabled={rateFields.some((field) => rateError(defaults[field.key]))}
          className="mt-5 rounded-full bg-[#071955] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2170] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Apply to all sports
        </button>
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
          Per sport
        </h3>
        {court.sports.length > 1 && (
          <button
            type="button"
            onClick={() =>
              setOpenIds(allOpen ? [] : court.sports.map((sport) => sport.sportId))
            }
            className="text-sm font-bold text-[#164eaa] transition hover:text-[#071955]"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      <div className="mt-2 space-y-3">
        {court.sports.map((sport) => {
          const expanded = openIds.includes(sport.sportId);
          const form = rates[sport.sportId];

          return (
            <section
              key={sport.sportId}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`pricing-${sport.sportId}`}
                  onClick={() =>
                    setOpenIds((current) =>
                      expanded
                        ? current.filter((id) => id !== sport.sportId)
                        : [...current, sport.sportId],
                    )
                  }
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#071955]">
                    {sport.isPrimary && (
                      <StarOutlined sx={{ fontSize: 15 }} className="text-amber-600" aria-hidden />
                    )}
                    {sport.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <Summary rates={form} />
                    <ExpandMoreOutlined
                      sx={{ fontSize: 20 }}
                      className={`text-slate-400 transition ${expanded ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                </button>
              </h3>

              <div id={`pricing-${sport.sportId}`} hidden={!expanded} className="border-t border-slate-100 p-5">
                <RateInputs
                  idPrefix={`rate-${sport.sportId}`}
                  value={form}
                  onChange={(next) =>
                    setRates((current) => ({ ...current, [sport.sportId]: next }))
                  }
                />
              </div>
            </section>
          );
        })}
      </div>

      {orphanedSpecial && (
        <p className="mt-4 text-sm font-semibold text-red-700">
          Set the standard rate before the peak, weekend or holiday one — without it
          there is nothing for them to be special against.
        </p>
      )}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="pricing-reason" className="block text-sm font-bold text-[#071955]">
          Why are you changing this?
        </label>
        <input
          id="pricing-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Owner sent a new rate card"
          className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
        />
        <p className="mt-1.5 text-sm text-slate-500">
          Recorded with the change, so the trail explains itself later.
        </p>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={save.isPending || anyError || orphanedSpecial || peakError !== undefined}
          className="mt-4 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {save.isPending ? "Saving…" : "Save pricing"}
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Peak and holiday rates need their windows defined before they can be charged.
        Until then every hour is billed at the standard rate.
      </p>
    </div>
  );
}

export default CourtPricingPanel;
