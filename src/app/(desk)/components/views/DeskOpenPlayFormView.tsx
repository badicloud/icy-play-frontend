"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { ApiError } from "@/services/api";
import OpenPlayCoverPhoto, { type CoverPhoto } from "../OpenPlayCoverPhoto";
import {
  deskOpenPlaySource,
  weekdays,
  type DeskOpenPlay,
  type OpenPlayClash,
  type OpenPlayInput,
  type OpenPlaySource,
} from "@auth/deskOpenPlayApi";
import { formatClock, formatPeso, formatSessionDate, openPlayLevelLabels } from "@auth/openPlayApi";

const input =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-500";

const label = "block text-sm font-bold text-[#071955]";

type Unit = "minutes" | "hours" | "days";

const unitMinutes: Record<Unit, number> = { minutes: 1, hours: 60, days: 24 * 60 };

/** The largest unit a number of minutes divides into evenly, so 4320 reads as 3 days. */
function split(minutes: number): { amount: string; unit: Unit } {
  if (minutes > 0 && minutes % unitMinutes.days === 0) {
    return { amount: String(minutes / unitMinutes.days), unit: "days" };
  }

  if (minutes > 0 && minutes % unitMinutes.hours === 0) {
    return { amount: String(minutes / unitMinutes.hours), unit: "hours" };
  }

  return { amount: String(minutes), unit: "minutes" };
}

type Form = {
  facilityId: string;
  bookableCourtId: string;
  title: string;
  level: string;
  maxPlayers: string;
  registrationFee: string;
  startsAt: string;
  endsAt: string;
  days: number[];
  startDate: string;
  endDate: string;
  runsUntilEnded: boolean;
  cutoffAmount: string;
  cutoffUnit: Unit;
  earlyBird: boolean;
  discountKind: "Fixed" | "Percentage";
  discountValue: string;
  leadAmount: string;
  leadUnit: Unit;
  /** Minutes before each session that check-in opens. */
  checkInMinutes: string;
};

const blank: Form = {
  facilityId: "",
  bookableCourtId: "",
  title: "",
  level: "AllLevels",
  maxPlayers: "16",
  registrationFee: "",
  startsAt: "18:00",
  endsAt: "21:00",
  days: [],
  startDate: "",
  endDate: "",
  runsUntilEnded: true,
  cutoffAmount: "1",
  cutoffUnit: "hours",
  earlyBird: false,
  discountKind: "Fixed",
  discountValue: "",
  leadAmount: "3",
  leadUnit: "days",
  checkInMinutes: "60",
};

function fromOpenPlay(openPlay: DeskOpenPlay): Form {
  const cutoff = split(openPlay.registrationCutoffMinutes);
  const lead = split(openPlay.earlyBird?.leadMinutes ?? 3 * unitMinutes.days);

  return {
    facilityId: openPlay.facilityId,
    bookableCourtId: openPlay.bookableCourtId,
    title: openPlay.title,
    level: openPlay.level,
    maxPlayers: String(openPlay.maxPlayers),
    registrationFee: String(openPlay.registrationFee),
    startsAt: openPlay.startsAt.slice(0, 5),
    endsAt: openPlay.endsAt.slice(0, 5),
    days: openPlay.days,
    startDate: openPlay.startDate,
    endDate: openPlay.endDate ?? "",
    runsUntilEnded: openPlay.endDate === null,
    cutoffAmount: cutoff.amount,
    cutoffUnit: cutoff.unit,
    earlyBird: openPlay.earlyBird !== null,
    discountKind: openPlay.earlyBird?.discountKind === "Percentage" ? "Percentage" : "Fixed",
    discountValue: openPlay.earlyBird ? String(openPlay.earlyBird.discountValue) : "",
    leadAmount: lead.amount,
    leadUnit: lead.unit,
    checkInMinutes: String(openPlay.checkInOpensMinutes),
  };
}

/**
 * What the form sends. Checks only what the browser can know for certain —
 * that numbers are numbers and something is picked. The rules (opening hours,
 * dates at the venue, what is already booked) are the server's, which is where
 * the venue's clock and the court's diary are.
 */
function toInput(form: Form): { input: OpenPlayInput | null; problem: string | null } {
  const number = (value: string) => (value.trim() === "" ? NaN : Number(value));

  if (form.bookableCourtId === "") {
    return { input: null, problem: "Pick the court and sport it is played on." };
  }

  if (form.days.length === 0) {
    return { input: null, problem: "Tick at least one day of the week." };
  }

  if (form.startDate === "") {
    return { input: null, problem: "Pick the date of the first session." };
  }

  if (!form.runsUntilEnded && form.endDate === "") {
    return { input: null, problem: "Pick the last date, or tick that it runs until you end it." };
  }

  const values = {
    maxPlayers: number(form.maxPlayers),
    fee: number(form.registrationFee),
    cutoff: number(form.cutoffAmount),
    discount: number(form.discountValue),
    lead: number(form.leadAmount),
  };

  if ([values.maxPlayers, values.fee, values.cutoff].some(Number.isNaN)) {
    return { input: null, problem: "Fill in the number of players, the fee, and the cut-off." };
  }

  if (form.earlyBird && [values.discount, values.lead].some(Number.isNaN)) {
    return { input: null, problem: "Fill in the early-bird discount and how early players must register." };
  }

  return {
    problem: null,
    input: {
      bookableCourtId: form.bookableCourtId,
      title: form.title.trim(),
      level: form.level,
      maxPlayers: values.maxPlayers,
      registrationFee: values.fee,
      startsAt: `${form.startsAt}:00`,
      endsAt: `${form.endsAt}:00`,
      days: form.days,
      startDate: form.startDate,
      endDate: form.runsUntilEnded ? null : form.endDate,
      registrationCutoffMinutes: Math.round(values.cutoff * unitMinutes[form.cutoffUnit]),
      earlyBird: form.earlyBird
        ? {
            discountKind: form.discountKind,
            discountValue: values.discount,
            leadMinutes: Math.round(values.lead * unitMinutes[form.leadUnit]),
          }
        : null,
      checkInOpensMinutes: Number.isNaN(Number(form.checkInMinutes)) ? undefined : Number(form.checkInMinutes),
    },
  };
}

function UnitSelect({
  id,
  value,
  onChange,
  disabled,
  units,
}: {
  id: string;
  value: Unit;
  onChange: (unit: Unit) => void;
  disabled: boolean;
  units: Unit[];
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as Unit)}
      className={`${input} w-36`}
    >
      {units.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}

/**
 * Creates a draft open play, or changes one. A published open play opens here
 * read only: players are registering for what it says.
 *
 * One page for both, told apart by ?id=. After the first save it stays on this
 * page with the id in the address, so the clash warnings from the save are
 * still on screen beside the fields they are about.
 */
export function OpenPlayForm({ source }: { source: OpenPlaySource }) {
  const router = useRouter();
  const search = useSearchParams();
  const client = useQueryClient();
  const openPlayId = search.get("id");

  // The venues (each with its own today) and their courts, through whichever
  // door this form was opened from.
  const places = useQuery({
    queryKey: [...source.key, "places"],
    queryFn: source.places,
    staleTime: 5 * 60 * 1000,
  });
  const venues = { data: places.data?.venues };
  const courts = { data: places.data?.courts };
  const [form, setForm] = useState<Form>(blank);
  const [problem, setProblem] = useState<string | null>(null);
  const [clashes, setClashes] = useState<OpenPlayClash[] | null>(null);

  const existing = useQuery({
    queryKey: [...source.key, openPlayId],
    queryFn: () => source.get(openPlayId!),
    enabled: openPlayId !== null,
  });

  const refresh = () => {
    void client.invalidateQueries({ queryKey: source.key });

    for (const key of source.alsoInvalidates) {
      void client.invalidateQueries({ queryKey: key });
    }
  };

  // Fill the form once, when the open play arrives. Later refetches must not
  // overwrite what somebody is typing.
  const [filledFor, setFilledFor] = useState<string | null>(null);

  useEffect(() => {
    if (existing.data && filledFor !== existing.data.openPlayId) {
      setForm(fromOpenPlay(existing.data));
      setFilledFor(existing.data.openPlayId);
    }
  }, [existing.data, filledFor]);

  // One venue needs no picker: it is the venue.
  useEffect(() => {
    if (form.facilityId === "" && venues.data?.length === 1) {
      setForm((current) => ({ ...current, facilityId: venues.data![0].id }));
    }
  }, [venues.data, form.facilityId]);

  const locked = existing.data !== undefined && existing.data.status !== "Draft";

  // The venue's today, from the server. The pickers grey out everything
  // before it; the server still refuses a past date typed in by hand.
  const venueToday =
    venues.data?.find((venue) => venue.id === form.facilityId)?.today ?? undefined;
  const lastDateFrom =
    form.startDate !== "" && (venueToday === undefined || form.startDate > venueToday)
      ? form.startDate
      : venueToday;

  const units = useMemo(
    () =>
      (courts.data ?? [])
        .filter((court) => court.facilityId === form.facilityId)
        .flatMap((court) =>
          court.units.map((unit) => ({
            value: unit.bookableCourtId,
            label: `${court.name} · ${unit.label}`,
          })),
        ),
    [courts.data, form.facilityId],
  );

  // A photo picked before the first save has nowhere to be recorded yet. It
  // is held here and recorded the moment the draft exists.
  const [pendingPhoto, setPendingPhoto] = useState<CoverPhoto | null>(null);

  const photo = useMutation({
    mutationFn: ({ id, picked }: { id: string; picked: CoverPhoto | null }) =>
      picked === null ? source.removePhoto(id) : source.setPhoto(id, picked),
    onSuccess: (updated) => {
      client.setQueryData([...source.key, updated.openPlayId], updated);
      refresh();
      // The public cards show it too.
      void client.invalidateQueries({ queryKey: ["catalog"] });
    },
  });

  // The check-in time on a published open play, saved on its own: the rest
  // of the form is locked.
  const checkInWindow = useMutation({
    mutationFn: (minutes: number) => source.setCheckInWindow(openPlayId!, minutes),
    onSuccess: (updated) => {
      client.setQueryData([...source.key, updated.openPlayId], updated);
      refresh();
    },
  });

  const save = useMutation({
    mutationFn: (payload: OpenPlayInput) =>
      openPlayId === null ? source.create(payload) : source.update(openPlayId, payload),
    onSuccess: (saved) => {
      setClashes(saved.clashes);
      setProblem(null);
      refresh();

      if (openPlayId === null && pendingPhoto !== null) {
        photo.mutate({ id: saved.openPlay.openPlayId, picked: pendingPhoto });
        setPendingPhoto(null);
      }

      if (openPlayId === null) {
        // Onto the saved draft's own address, on this same page, so another
        // save changes it rather than making a second one.
        setFilledFor(saved.openPlay.openPlayId);
        router.replace(source.editHref(saved.openPlay.openPlayId));
      }
    },
    onError: (error) => {
      setClashes(null);
      setProblem(error instanceof ApiError ? error.message : "That could not be saved. Please try again.");
    },
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const built = toInput(form);

    if (built.input === null) {
      setProblem(built.problem);
      return;
    }

    setProblem(null);
    save.mutate(built.input);
  };

  const fee = Number(form.registrationFee);
  const platformFee = existing.data?.platformFee;

  if (openPlayId !== null && existing.isError) {
    return (
      <main className="min-h-screen bg-[#f5f9ff] pb-16">
        <div className="mx-auto max-w-3xl px-6 pt-8 lg:px-8">
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
            That open play is not at one of these venues, or it no longer exists.
          </p>
          <Link href={source.listHref} className="mt-4 inline-block font-semibold text-[#2563EB]">
            Back to open play
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-8 lg:px-8">
        <Breadcrumbs
          trail={[
            ...source.trail,
            { label: openPlayId === null ? "New open play" : (existing.data?.title ?? "Edit") },
          ]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
          {openPlayId === null ? "New open play" : locked ? existing.data?.title : "Edit draft"}
        </h1>
        <p className="mt-2 text-slate-500">
          {locked
            ? "Published open plays cannot be edited: players are registering for what they say. Only the cover photo can still change."
            : "Saved as a draft. Customers see nothing and the court stays on sale until you publish it from the open play list."}
        </p>

        {locked && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
            <LockOutlined sx={{ fontSize: 18 }} />
            This open play is {existing.data?.status.toLowerCase()}.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-6">
          <fieldset disabled={locked || save.isPending} className="space-y-6">
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-[#071955]">Where</h2>

              {(venues.data?.length ?? 0) > 1 && (
                <div>
                  <label htmlFor="op-venue" className={label}>
                    Venue
                  </label>
                  <select
                    id="op-venue"
                    value={form.facilityId}
                    // A draft stays at its venue once saved; the court can change.
                    disabled={openPlayId !== null}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, facilityId: event.target.value, bookableCourtId: "" }))
                    }
                    className={`${input} mt-1.5`}
                  >
                    <option value="">Pick a venue</option>
                    {venues.data!.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="op-court" className={label}>
                  Court and sport
                </label>
                <select
                  id="op-court"
                  value={form.bookableCourtId}
                  onChange={(event) => set("bookableCourtId", event.target.value)}
                  className={`${input} mt-1.5`}
                >
                  <option value="">Pick the court it is played on</option>
                  {units.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-sm text-slate-500">
                  The same rule as a booking: a whole-floor sport holds every part of the floor, and the
                  parts of one sport run side by side.
                </p>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-[#071955]">What</h2>

              <div>
                <label htmlFor="op-title" className={label}>
                  Title
                </label>
                <input
                  id="op-title"
                  value={form.title}
                  maxLength={150}
                  placeholder="Saturday Night Dinkers"
                  onChange={(event) => set("title", event.target.value)}
                  className={`${input} mt-1.5`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="op-level" className={label}>
                    Level
                  </label>
                  <select
                    id="op-level"
                    value={form.level}
                    onChange={(event) => set("level", event.target.value)}
                    className={`${input} mt-1.5`}
                  >
                    {Object.entries(openPlayLevelLabels).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="op-players" className={label}>
                    Most players
                  </label>
                  <input
                    id="op-players"
                    type="number"
                    min={2}
                    max={200}
                    value={form.maxPlayers}
                    onChange={(event) => set("maxPlayers", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </div>

                <div>
                  <label htmlFor="op-fee" className={label}>
                    Fee per player (₱)
                  </label>
                  <input
                    id="op-fee"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.registrationFee}
                    onChange={(event) => set("registrationFee", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </div>
              </div>

              <p className="text-sm text-slate-500">
                {platformFee !== undefined && !Number.isNaN(fee) && form.registrationFee !== ""
                  ? `Players pay ${formatPeso(fee + platformFee)}: your ${formatPeso(fee)} plus the ${formatPeso(platformFee)} IcyPlay booking fee.`
                  : "Players pay your fee plus the IcyPlay booking fee, added once per registration."}
              </p>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-[#071955]">When</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="op-starts" className={label}>
                    Starts
                  </label>
                  <input
                    id="op-starts"
                    type="time"
                    step={1800}
                    value={form.startsAt}
                    onChange={(event) => set("startsAt", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </div>
                <div>
                  <label htmlFor="op-ends" className={label}>
                    Ends
                  </label>
                  <input
                    id="op-ends"
                    type="time"
                    step={1800}
                    value={form.endsAt}
                    onChange={(event) => set("endsAt", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </div>
              </div>

              <div>
                <span className={label}>Every</span>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Days of the week">
                  {weekdays.map((day) => {
                    const checked = form.days.includes(day.value);

                    return (
                      <label
                        key={day.value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          checked
                            ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-[#2563EB]"
                          checked={checked}
                          onChange={() =>
                            set(
                              "days",
                              checked ? form.days.filter((value) => value !== day.value) : [...form.days, day.value],
                            )
                          }
                        />
                        {day.short}
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => set("days", form.days.length === 7 ? [] : weekdays.map((day) => day.value))}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-[#2563EB] hover:underline"
                  >
                    {form.days.length === 7 ? "Clear" : "Every day"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="op-start-date" className={label}>
                    First date
                  </label>
                  <input
                    id="op-start-date"
                    type="date"
                    min={venueToday}
                    value={form.startDate}
                    onChange={(event) => set("startDate", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </div>
                <div>
                  <label htmlFor="op-end-date" className={label}>
                    Last date
                  </label>
                  <input
                    id="op-end-date"
                    type="date"
                    min={lastDateFrom}
                    value={form.endDate}
                    disabled={form.runsUntilEnded}
                    onChange={(event) => set("endDate", event.target.value)}
                    className={`${input} mt-1.5`}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB]"
                      checked={form.runsUntilEnded}
                      onChange={(event) => set("runsUntilEnded", event.target.checked)}
                    />
                    Runs until I end it
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-[#071955]">Registration</h2>

              <div>
                <label htmlFor="op-cutoff" className={label}>
                  Registration closes
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="op-cutoff"
                    type="number"
                    min={0}
                    value={form.cutoffAmount}
                    onChange={(event) => set("cutoffAmount", event.target.value)}
                    className={`${input} w-28`}
                  />
                  <UnitSelect
                    id="op-cutoff-unit"
                    value={form.cutoffUnit}
                    disabled={locked}
                    units={["minutes", "hours"]}
                    onChange={(unit) => set("cutoffUnit", unit)}
                  />
                  <span className="text-sm text-slate-500">before each session starts</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-[#071955]">
                <input
                  type="checkbox"
                  className="accent-[#2563EB]"
                  checked={form.earlyBird}
                  onChange={(event) => set("earlyBird", event.target.checked)}
                />
                Early-bird discount
              </label>

              {form.earlyBird && (
                <div className="space-y-4 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Kind of discount"
                      value={form.discountKind}
                      onChange={(event) => set("discountKind", event.target.value as Form["discountKind"])}
                      className={`${input} w-40`}
                    >
                      <option value="Fixed">₱ off</option>
                      <option value="Percentage">% off</option>
                    </select>
                    <input
                      aria-label="Discount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.discountValue}
                      placeholder={form.discountKind === "Fixed" ? "30" : "10"}
                      onChange={(event) => set("discountValue", event.target.value)}
                      className={`${input} w-28`}
                    />
                    <span className="text-sm text-slate-500">off your fee</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">for players who register at least</span>
                    <input
                      aria-label="How early"
                      type="number"
                      min={1}
                      value={form.leadAmount}
                      onChange={(event) => set("leadAmount", event.target.value)}
                      className={`${input} w-24`}
                    />
                    <UnitSelect
                      id="op-lead-unit"
                      value={form.leadUnit}
                      disabled={locked}
                      units={["hours", "days"]}
                      onChange={(unit) => set("leadUnit", unit)}
                    />
                    <span className="text-sm text-slate-500">before each session starts</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Counted back from every session on its own, to the hour: with 3 days, a Monday
                    6 PM session is early-bird until Friday 6 PM, and a Wednesday 6 PM session
                    until Sunday 6 PM. The discount comes off your fee only; the booking fee stays
                    the same.
                  </p>
                </div>
              )}
            </section>
          </fieldset>

          {/* Outside the fieldset on purpose: the photo is the one thing a
              published open play can still change. */}
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
            <h2 className="text-lg font-bold text-[#071955]">Cover photo</h2>
            <OpenPlayCoverPhoto
              upload={source.uploadPhoto}
              url={openPlayId === null ? (pendingPhoto?.secureUrl ?? null) : (existing.data?.coverPhotoUrl ?? null)}
              busy={photo.isPending}
              disabled={existing.data?.status === "Ended"}
              hint={
                openPlayId === null
                  ? "Shown on the open play's card. It is saved with the draft."
                  : locked
                    ? "The photo can still be changed after publishing. Nothing else can."
                    : "Shown on the open play's card. Without one, the court's or the venue's photo is used."
              }
              onUploaded={(picked) =>
                openPlayId === null ? setPendingPhoto(picked) : photo.mutate({ id: openPlayId, picked })
              }
              onRemove={() =>
                openPlayId === null ? setPendingPhoto(null) : photo.mutate({ id: openPlayId, picked: null })
              }
            />
            {photo.isError && (
              <p className="text-sm font-semibold text-red-700">
                {photo.error instanceof ApiError ? photo.error.message : "The photo could not be saved."}
              </p>
            )}
          </section>

          {/* Outside the fieldset too: how the venue runs its door, not part
              of what a player paid for, so it can move after publishing. */}
          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white px-6 py-5">
            <h2 className="text-lg font-bold text-[#071955]">Check-in</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="op-check-in" className="text-sm text-slate-600">
                Check-in opens
              </label>
              <input
                id="op-check-in"
                type="number"
                min={0}
                max={1440}
                step={5}
                value={form.checkInMinutes}
                disabled={existing.data?.status === "Ended"}
                onChange={(event) => set("checkInMinutes", event.target.value)}
                className={`${input} w-28`}
              />
              <span className="text-sm text-slate-600">minutes before each session, until it ends</span>
              {locked && existing.data?.status === "Published" && (
                <button
                  type="button"
                  disabled={
                    checkInWindow.isPending ||
                    form.checkInMinutes === String(existing.data.checkInOpensMinutes)
                  }
                  onClick={() => checkInWindow.mutate(Number(form.checkInMinutes))}
                  className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {checkInWindow.isPending ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {locked
                ? "This can still change after publishing."
                : "Saved with the draft. It can still change after publishing."}
            </p>
            {checkInWindow.isError && (
              <p className="text-sm font-semibold text-red-700">
                {checkInWindow.error instanceof ApiError
                  ? checkInWindow.error.message
                  : "The check-in time could not be saved."}
              </p>
            )}
            {checkInWindow.isSuccess && <p className="text-sm font-semibold text-green-700">Check-in time saved.</p>}
          </section>

          {problem && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {problem}
            </p>
          )}

          {clashes !== null && clashes.length === 0 && (
            <p className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
              <CheckCircleOutlined sx={{ fontSize: 18 }} />
              Draft saved, and nothing is in its way. Publish it from the open play list when it is final.
            </p>
          )}

          {clashes !== null && clashes.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <WarningAmberOutlined sx={{ fontSize: 18 }} />
                Draft saved, but these hours are already taken. It cannot be published until they are clear:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {clashes.map((clash, index) => (
                  <li key={`${clash.date}-${clash.startsAt}-${index}`}>
                    {formatSessionDate(clash.date)}, {formatClock(clash.startsAt)}–{formatClock(clash.endsAt)} ·{" "}
                    {clash.kind === "OpenPlay" ? `Open play “${clash.description}”` : `Booking by ${clash.description}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!locked && (
              <button
                type="submit"
                disabled={save.isPending}
                className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save draft"}
              </button>
            )}
            <Link
              href={source.listHref}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Back to open play
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

/** The venue desk's form: owners and attendants, on the venues they work. */
function DeskOpenPlayFormView() {
  return <OpenPlayForm source={deskOpenPlaySource} />;
}

export default DeskOpenPlayFormView;
