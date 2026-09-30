"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getOpenPlays, openPlayLevel, openPlayLevelLabels } from "@auth/openPlayApi";
import { OpenPlayDetail } from "./OpenPlayCard";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

type Option = { value: string; label: string };

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  if (options.length < 2) {
    return null;
  }

  const chip = (selected: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
      selected
        ? "border-[#2563EB] bg-[#2563EB] text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="w-16 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <button type="button" aria-pressed={value === null} className={chip(value === null)} onClick={() => onChange(null)}>
        All
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={chip(value === option.value)}
          onClick={() => onChange(value === option.value ? null : option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Every open play on the platform, with its next dates, narrowed by sport,
 * level and venue.
 *
 * Opened from a card elsewhere on the site with ?id=, it scrolls to that one
 * and marks it. ?sport= and ?facility= set the filters, so a venue's page can
 * link straight to its own.
 */
function OpenPlayView() {
  const search = useSearchParams();
  const focusId = search.get("id");

  const [sport, setSport] = useState<string | null>(search.get("sport"));
  const [level, setLevel] = useState<string | null>(null);
  const [facility, setFacility] = useState<string | null>(search.get("facility"));

  const openPlays = useQuery({
    queryKey: ["catalog", "open-plays"],
    queryFn: () => getOpenPlays(),
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => openPlays.data ?? [], [openPlays.data]);

  const sports = useMemo<Option[]>(
    () =>
      [...new Map(rows.map((row) => [row.sportKey, row.sportName])).entries()].map(
        ([value, label]) => ({ value, label }),
      ),
    [rows],
  );

  const venues = useMemo<Option[]>(
    () =>
      [...new Map(rows.map((row) => [row.facilityId, row.facilityName])).entries()].map(
        ([value, label]) => ({ value, label }),
      ),
    [rows],
  );

  const levels = useMemo<Option[]>(
    () =>
      Object.keys(openPlayLevelLabels)
        .filter((key) => rows.some((row) => row.level === key))
        .map((value) => ({ value, label: openPlayLevel(value) })),
    [rows],
  );

  const shown = rows.filter(
    (row) =>
      (sport === null || row.sportKey === sport) &&
      (level === null || row.level === level) &&
      (facility === null || row.facilityId === facility),
  );

  // Once the list is in, bring the one somebody clicked into view.
  useEffect(() => {
    if (focusId === null || openPlays.data === undefined) {
      return;
    }

    document
      .getElementById(`open-play-${focusId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusId, openPlays.data]);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <nav className="text-sm font-semibold text-slate-500">
          <Link href="/" className="hover:text-[#2563EB]">
            Home
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">Open Play</span>
        </nav>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
          Open Play
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          No team? Join a game.
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Pay per player instead of renting the whole court. Pick a session at your level and
          play with whoever turns up.
        </p>

        <div className="mt-8 space-y-3">
          <FilterRow label="Sport" options={sports} value={sport} onChange={setSport} />
          <FilterRow label="Level" options={levels} value={level} onChange={setLevel} />
          <FilterRow label="Venue" options={venues} value={facility} onChange={setFacility} />
        </div>

        <div className="mt-8 space-y-5">
          {openPlays.isPending &&
            Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[24px] border border-slate-200 bg-slate-50"
                aria-busy
              />
            ))}

          {openPlays.isError && (
            <p className="rounded-[24px] border border-slate-200 bg-white p-6 text-slate-600">
              We couldn&apos;t load the open plays just now. Please refresh the page.
            </p>
          )}

          {openPlays.isSuccess && shown.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-semibold text-slate-950">
                {rows.length === 0 ? "No open plays are scheduled yet" : "Nothing matches those filters"}
              </p>
              <p className="mt-1 text-slate-600">
                {rows.length === 0
                  ? "Venues list their open play sessions here. You can still book a whole court."
                  : "Try another sport, level or venue."}
              </p>
              {rows.length === 0 && (
                <Link
                  href="/#venues"
                  className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
                >
                  Book a court
                </Link>
              )}
            </div>
          )}

          {shown.map((openPlay) => (
            <OpenPlayDetail
              key={openPlay.openPlayId}
              openPlay={openPlay}
              highlighted={openPlay.openPlayId === focusId}
            />
          ))}
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

export default OpenPlayView;
