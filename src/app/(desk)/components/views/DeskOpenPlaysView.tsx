"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AddOutlined from "@mui/icons-material/AddOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import EditDialog from "@/app/(admin)/components/edit/EditDialog";
import { ApiError } from "@/services/api";
import {
  clashesOf,
  describeDays,
  deskOpenPlaySource,
  openPlayStatusTone,
  type DeskOpenPlay,
  type OpenPlayClash,
  type OpenPlaySource,
  type OpenPlayStatus,
} from "@auth/deskOpenPlayApi";
import {
  formatClock,
  formatEarlyBird,
  formatPeso,
  formatSessionDate,
  openPlayHref,
  openPlayLevel,
} from "@auth/openPlayApi";

type Tab = "All" | OpenPlayStatus;

const tabs: { id: Tab; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Draft", label: "Drafts" },
  { id: "Published", label: "Published" },
  { id: "Ended", label: "Ended" },
];

type Action = "publish" | "unpublish" | "end" | "delete";

/** What each action does, said before it is done. */
const confirmations: Record<
  Action,
  { title: string; description: string; confirm: string; busy: string; destructive: boolean; body: string }
> = {
  publish: {
    title: "Publish this open play",
    description: "Open it for registration and hold the court for it.",
    confirm: "Publish",
    busy: "Publishing…",
    destructive: false,
    body:
      "Customers will see it and can register straight away, and its hours are taken off sale for regular bookings. " +
      "Once published it cannot be edited, because players are signing up for what it says. Check the details first.",
  },
  unpublish: {
    title: "Take it back to a draft",
    description: "Hide it from customers and release the court.",
    confirm: "Back to draft",
    busy: "Saving…",
    destructive: false,
    body:
      "Nobody has registered yet, so it can go back to a draft and be edited. Its hours go back on sale until it is published again.",
  },
  end: {
    title: "End this open play",
    description: "Today's session still runs. Every later date is released.",
    confirm: "End it",
    busy: "Ending…",
    destructive: true,
    body:
      "Every date after today is cancelled and goes back on sale for regular bookings. " +
      "This cannot be undone: to run it again, create a new open play.",
  },
  delete: {
    title: "Delete this draft",
    description: "It has never been published, so nobody has seen it.",
    confirm: "Delete draft",
    busy: "Deleting…",
    destructive: true,
    body: "The draft is removed. This cannot be undone.",
  },
};

function Clashes({ clashes }: { clashes: OpenPlayClash[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <WarningAmberOutlined sx={{ fontSize: 18 }} />
        These hours are already taken, so it cannot be published yet:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {clashes.map((clash, index) => (
          <li key={`${clash.date}-${clash.startsAt}-${index}`}>
            {formatSessionDate(clash.date)}, {formatClock(clash.startsAt)}–{formatClock(clash.endsAt)} ·{" "}
            {clash.kind === "OpenPlay" ? `Open play “${clash.description}”` : `Booking by ${clash.description}`}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-amber-900">
        Move or cancel what is in the way, or edit the draft to other hours, then publish again.
      </p>
    </div>
  );
}

function OpenPlayRow({
  openPlay,
  editHref,
  requestsHref,
  checkInHref,
  clashes,
  onAction,
}: {
  openPlay: DeskOpenPlay;
  /** Where Edit goes: the desk's form or the admin's, for this open play. */
  editHref: string;
  requestsHref: string | null;
  checkInHref: ((openPlayId: string, date: string) => string) | null;
  clashes: OpenPlayClash[];
  onAction: (action: Action) => void;
}) {
  const button =
    "rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {openPlay.coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={openPlay.coverPhotoUrl}
            alt=""
            className="h-20 w-28 shrink-0 rounded-2xl border border-slate-200 object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#071955]">{openPlay.title}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${openPlayStatusTone[openPlay.status]}`}>
              {openPlay.status}
            </span>
            {openPlay.isSeeded && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                Sample
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {openPlay.facilityName} · {openPlay.courtName} · {openPlay.unitLabel} · {openPlayLevel(openPlay.level)}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {describeDays(openPlay.days)} · {formatClock(openPlay.startsAt)}–{formatClock(openPlay.endsAt)}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            From {formatSessionDate(openPlay.startDate)}
            {openPlay.endDate ? ` to ${formatSessionDate(openPlay.endDate)}` : ", until you end it"} · up to{" "}
            {openPlay.maxPlayers} players a session
          </p>
          {/* Across every date. Registered means confirmed by the desk; a
              receipt nobody has checked yet is waiting, not registered. */}
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-semibold text-green-700">{openPlay.registrations} registered</span>
            {openPlay.waiting > 0 && (
              <>
                {" · "}
                {requestsHref ? (
                  <Link href={requestsHref} className="font-semibold text-amber-700 hover:underline">
                    {openPlay.waiting} waiting for you to check
                  </Link>
                ) : (
                  <span className="font-semibold text-amber-700">
                    {openPlay.waiting} waiting for the venue to check
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-slate-950">{formatPeso(openPlay.price)}</p>
          <p className="text-xs text-slate-500">
            {formatPeso(openPlay.registrationFee)} yours + {formatPeso(openPlay.platformFee)} booking fee
          </p>
          {openPlay.earlyBird && (
            <p className="mt-1 text-xs font-semibold text-green-800">{formatEarlyBird(openPlay.earlyBird)}</p>
          )}
        </div>
      </div>

      {clashes.length > 0 && <Clashes clashes={clashes} />}

      <div className="mt-4 flex flex-wrap gap-2">
        {openPlay.status === "Draft" && (
          <>
            <Link
              href={editHref}
              className={`${button} border-slate-200 text-slate-700 hover:border-slate-300`}
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onAction("publish")}
              className={`${button} border-[#2563EB] bg-[#2563EB] text-white hover:bg-blue-700`}
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => onAction("delete")}
              className={`${button} border-red-200 text-red-700 hover:bg-red-50`}
            >
              Delete
            </button>
          </>
        )}

        {/* Today's session's door. Open while the check-in window is, on the
            server's clock; before then it says when it opens. */}
        {openPlay.status === "Published" && checkInHref && openPlay.sessionToday && (
          openPlay.checkInOpen ? (
            <Link
              href={checkInHref(openPlay.openPlayId, openPlay.sessionToday)}
              className={`${button} border-green-600 bg-green-600 text-white hover:bg-green-700`}
            >
              Check in players
            </Link>
          ) : (
            <span className={`${button} border-slate-200 bg-slate-50 text-slate-500`}>
              {openPlay.checkInOpensAt
                ? `Check-in opens ${formatClock(openPlay.checkInOpensAt.slice(11))}`
                : "Check-in is closed"}
            </span>
          )
        )}

        {openPlay.status === "Published" && (
          <>
            <Link
              href={openPlayHref(openPlay.openPlayId)}
              target="_blank"
              className={`${button} inline-flex items-center gap-1.5 border-slate-200 text-slate-700 hover:border-slate-300`}
            >
              See it on the site
              <OpenInNewOutlined sx={{ fontSize: 15 }} />
            </Link>
            <button
              type="button"
              disabled={openPlay.registrations > 0}
              title={
                openPlay.registrations > 0
                  ? "Players have registered, so it cannot go back to a draft. End it instead."
                  : undefined
              }
              onClick={() => onAction("unpublish")}
              className={`${button} border-slate-200 text-slate-700 hover:border-slate-300`}
            >
              Back to draft
            </button>
            <button
              type="button"
              onClick={() => onAction("end")}
              className={`${button} border-red-200 text-red-700 hover:bg-red-50`}
            >
              End
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/**
 * An owner's open plays: drafts being worked on, the published ones players
 * are registering for, and the ended ones, with every action on them.
 *
 * The same list on the venue desk and on the platform admin's owner page; the
 * source says which door it goes through. A draft is invisible to customers
 * and holds nothing; publishing opens it for registration, takes its hours off
 * sale, and locks it.
 */
export function OpenPlayList({ source }: { source: OpenPlaySource }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("All");
  const [venue, setVenue] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ openPlay: DeskOpenPlay; action: Action } | null>(null);
  const [clashes, setClashes] = useState<Record<string, OpenPlayClash[]>>({});

  const openPlays = useQuery({
    queryKey: source.key,
    queryFn: source.list,
  });

  const places = useQuery({
    queryKey: [...source.key, "places"],
    queryFn: source.places,
    staleTime: 5 * 60 * 1000,
  });

  const act = useMutation({
    mutationFn: ({
      openPlay,
      action,
    }: {
      openPlay: DeskOpenPlay;
      action: Action;
    }): Promise<DeskOpenPlay | void> => {
      switch (action) {
        case "publish":
          return source.publish(openPlay.openPlayId);
        case "unpublish":
          return source.unpublish(openPlay.openPlayId);
        case "end":
          return source.end(openPlay.openPlayId);
        default:
          return source.remove(openPlay.openPlayId);
      }
    },
    onSuccess: (_, { openPlay }) => {
      setClashes((current) => ({ ...current, [openPlay.openPlayId]: [] }));
      setAsking(null);
      void client.invalidateQueries({ queryKey: source.key });

      for (const key of source.alsoInvalidates) {
        void client.invalidateQueries({ queryKey: key });
      }

      // The public listing and every court calendar just changed.
      void client.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (error, { openPlay }) => {
      const found = clashesOf(error);

      // A clash is shown on the open play itself, where it can be read
      // beside the hours it is about. Any other refusal stays in the dialog.
      if (found.length > 0) {
        setClashes((current) => ({ ...current, [openPlay.openPlayId]: found }));
        setAsking(null);
      }
    },
  });

  const rows = useMemo(() => openPlays.data ?? [], [openPlays.data]);
  const inVenue = rows.filter((row) => venue === null || row.facilityId === venue);
  const shown = inVenue.filter((row) => tab === "All" || row.status === tab);
  const venues = places.data?.venues ?? [];

  const chip = (selected: boolean) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
      selected
        ? "border-[#2563EB] bg-[#2563EB] text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
    }`;

  const confirmation = asking ? confirmations[asking.action] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={chip(tab === entry.id)}
            >
              {entry.label}
              <span className={tab === entry.id ? "text-blue-100" : "text-slate-400"}>
                {entry.id === "All" ? inVenue.length : inVenue.filter((row) => row.status === entry.id).length}
              </span>
            </button>
          ))}
        </div>

        <Link
          href={source.editHref()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <AddOutlined sx={{ fontSize: 18 }} />
          New open play
        </Link>
      </div>

      {venues.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by venue">
          <button type="button" aria-pressed={venue === null} onClick={() => setVenue(null)} className={chip(venue === null)}>
            Every venue
          </button>
          {venues.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={venue === entry.id}
              onClick={() => setVenue(entry.id)}
              className={chip(venue === entry.id)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {openPlays.isPending && <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" />}

        {openPlays.isError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
            {openPlays.error instanceof ApiError ? openPlays.error.message : "The open plays could not be read."}
          </p>
        )}

        {openPlays.isSuccess && shown.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-lg font-semibold text-slate-950">
              {rows.length === 0 ? "No open plays yet" : "Nothing here"}
            </p>
            <p className="mt-1 text-slate-500">
              {rows.length === 0
                ? "Create one and it is saved as a draft until it is published."
                : "Try another tab or venue."}
            </p>
          </div>
        )}

        {shown.map((openPlay) => (
          <OpenPlayRow
            key={openPlay.openPlayId}
            openPlay={openPlay}
            editHref={source.editHref(openPlay.openPlayId)}
            requestsHref={source.requestsHref}
            checkInHref={source.checkInHref}
            clashes={clashes[openPlay.openPlayId] ?? []}
            onAction={(action) => {
              act.reset();
              setAsking({ openPlay, action });
            }}
          />
        ))}
      </div>

      {confirmation && asking && (
        <EditDialog
          title={confirmation.title}
          description={confirmation.description}
          open
          isSaving={act.isPending}
          error={act.error}
          onClose={() => setAsking(null)}
          onSave={() => act.mutate(asking)}
          confirmLabel={confirmation.confirm}
          busyLabel={confirmation.busy}
          destructive={confirmation.destructive}
          hideReason
          reason=""
          onReasonChange={() => {}}
        >
          <p className="text-sm font-bold text-[#071955]">{asking.openPlay.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            {asking.openPlay.courtName} · {asking.openPlay.unitLabel} · {describeDays(asking.openPlay.days)}{" "}
            {formatClock(asking.openPlay.startsAt)}–{formatClock(asking.openPlay.endsAt)}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{confirmation.body}</p>
        </EditDialog>
      )}
    </div>
  );
}

/** The venue desk's page: owners and attendants alike, on the venues they work. */
function DeskOpenPlaysView() {
  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-5xl px-6 pt-8 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Open play" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Open play</h1>
        <p className="mt-2 mb-6 max-w-2xl text-slate-500">
          Group sessions players join per head. Save a draft, check it, then publish it: publishing opens it
          for registration, takes its hours off sale, and locks it.
        </p>

        <OpenPlayList source={deskOpenPlaySource} />
      </div>
    </main>
  );
}

export default DeskOpenPlaysView;
