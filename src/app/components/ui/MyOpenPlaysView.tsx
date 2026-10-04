"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { activityIcon } from "@auth/catalogApi";
import { formatClock, formatPeso, formatSessionDate } from "@auth/openPlayApi";
import {
  getMyOpenPlayRegistrations,
  registrationState,
  type OpenPlayRegistration,
} from "@auth/openPlayRegistrationApi";
import CheckInPassCard from "./CheckInPassCard";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

type Filter = "upcoming" | "past";

/**
 * What a row asks the player to do next, if anything: pay while the hold runs,
 * show their QR at the door, or nothing but wait.
 */
function nextStep(registration: OpenPlayRegistration) {
  if (registration.hasLapsed) {
    return null;
  }

  if (registration.checkInPassState === "Active") {
    return "Show QR";
  }

  return registration.status === "PendingPayment" ? "Finish paying" : null;
}

/**
 * One registration. A registered one opens in place to show its check-in QR,
 * so the player has it at the desk in one tap; the rest go straight to the
 * registration's page.
 */
function Row({
  registration,
  open,
  onToggle,
}: {
  registration: OpenPlayRegistration;
  open: boolean;
  onToggle: () => void;
}) {
  const state = registrationState(registration);
  const icon = activityIcon(registration.sportKey);
  const next = nextStep(registration);
  const href = `/open-play/registrations/${registration.registrationId}`;
  const opens = registration.checkInPassState !== null;
  const headerClass = "flex w-full flex-wrap items-center gap-4 p-5 text-left";

  const header = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="h-7 w-7 object-contain" aria-hidden />
        ) : (
          <span className="font-bold text-[#2563EB]">{registration.sportName.slice(0, 1)}</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#071955]">{registration.title}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${state.tone}`}>{state.label}</span>
          {registration.checkInPassState === "Used" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">Checked in</span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-slate-500">
          {formatSessionDate(registration.date)} · {formatClock(registration.startsAt)}–
          {formatClock(registration.endsAt)} · {registration.facilityName}
        </span>
      </span>

      <span className="text-right">
        <span className="block font-bold text-[#071955]">{formatPeso(registration.total)}</span>
        {opens ? (
          <span className="block text-xs font-bold text-[#2563EB]">
            {open ? "Hide QR ▴" : registration.checkInPassState === "Active" ? "Show QR ▾" : "Details ▾"}
          </span>
        ) : (
          next && <span className="block text-xs font-bold text-[#2563EB]">{next} ›</span>
        )}
      </span>
    </>
  );

  const card = `overflow-hidden rounded-[24px] border bg-white transition ${
    open ? "border-blue-200 shadow-md" : "border-slate-200 hover:border-blue-200 hover:shadow-md"
  }`;

  if (!opens) {
    return (
      <Link href={href} className={`${card} ${headerClass}`}>
        {header}
      </Link>
    );
  }

  return (
    <div className={card}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={headerClass}>
        {header}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <CheckInPassCard registration={registration} bare />
          <div className="mt-4 flex justify-end">
            <Link
              href={href}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              More details ›
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The open plays a player has joined or is joining. Upcoming first, with the
 * ones still to pay for and the ones waiting on the venue alongside the
 * registered ones; the past ones behind a tab.
 */
function MyOpenPlaysView() {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ["my-open-plays"],
    queryFn: getMyOpenPlayRegistrations,
    // Always read fresh on opening: the venue may have confirmed one since.
    staleTime: 0,
    refetchOnMount: "always",
    // A QR held up at the desk turns to "Used" here once scanned, without a reload.
    refetchInterval: (query) =>
      query.state.data?.some((row) => row.registrationId === openId && row.checkInPassState === "Active")
        ? 10_000
        : false,
  });

  // Past is the server's word, on the venue's clock: a session is past once it
  // has ended there. The browser's clock is never asked.
  const rows = mine.data ?? [];
  const upcoming = rows.filter((row) => !row.sessionHasEnded).reverse();
  const past = rows.filter((row) => row.sessionHasEnded);
  const shown = filter === "upcoming" ? upcoming : past;

  const chip = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition ${
      selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-200 bg-white text-slate-600"
    }`;

  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#071955]">My open plays</h1>
        <p className="mt-1 text-slate-600">
          You are registered once the venue has checked your payment. Until then your spot is kept for you.
        </p>

        <div className="mt-6 flex gap-2" role="tablist">
          <button type="button" role="tab" aria-selected={filter === "upcoming"} onClick={() => setFilter("upcoming")} className={chip(filter === "upcoming")}>
            Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
          </button>
          <button type="button" role="tab" aria-selected={filter === "past"} onClick={() => setFilter("past")} className={chip(filter === "past")}>
            Past
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {mine.isPending && <div className="h-24 animate-pulse rounded-[24px] border border-slate-200 bg-white" />}

          {mine.isError && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">Your open plays could not be loaded.</p>
          )}

          {mine.isSuccess && shown.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-semibold text-slate-950">
                {filter === "upcoming" ? "No open plays coming up" : "Nothing here yet"}
              </p>
              <Link
                href="/open-play"
                className="mt-4 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white"
              >
                Find an open play
              </Link>
            </div>
          )}

          {shown.map((registration) => (
            <Row
              key={registration.registrationId}
              registration={registration}
              open={openId === registration.registrationId}
              onToggle={() =>
                setOpenId((current) => (current === registration.registrationId ? null : registration.registrationId))
              }
            />
          ))}
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

export default MyOpenPlaysView;
