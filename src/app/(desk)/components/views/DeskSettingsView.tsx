"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import {
  getDeskSettings,
  getDeskSettingsHistory,
  updateDeskSettings,
  type DeskSettingChange,
  type DeskSettings,
} from "@auth/deskApi";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";

/**
 * One dial, with the range it allows written under it.
 *
 * Saying what is possible beats refusing after the fact: somebody typing 600
 * into a box that only takes 240 should be told before they press save, not
 * after.
 */
function Dial({
  id,
  label,
  hint,
  value,
  unit,
  smallest,
  largest,
  note,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  unit: string;
  smallest: number;
  largest: number;
  /** What the number comes to in other terms, said under the range. */
  note?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <label htmlFor={id} className="block text-sm font-bold text-[#071955]">
        {label}
      </label>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">{hint}</p>

      <div className="mt-4 flex items-center gap-3">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={smallest}
          max={largest}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-28 rounded-xl border border-slate-200 px-4 py-2.5 text-base font-bold text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
        />
        <span className="text-sm font-semibold text-slate-500">{unit}</span>
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-400">
        Between {smallest} and {largest}.
      </p>

      {note && <p className="mt-1 text-sm font-bold text-[#1264f7]">{note}</p>}
    </div>
  );
}

/**
 * A notice in days, said in hours — which is how it is measured: two days is
 * forty-eight hours before the first hour, not two midnights. Nothing when the
 * box does not hold a whole number.
 */
function inHours(days: string) {
  const number = Number(days);

  return days.trim() !== "" && Number.isInteger(number) && number > 0
    ? `That is ${number * 24} hours before the booking starts.`
    : null;
}

/** What each dial is called in the history, and what its number counts. */
const settingWords: Record<string, { label: string; unit: (value: number) => string }> = {
  bookingWindowDays: {
    label: "Customers can book up to",
    unit: (value) => (value === 1 ? "day ahead" : "days ahead"),
  },
  partialBookingExpiryMinutes: {
    label: "Hold a court for",
    unit: (value) => (value === 1 ? "minute" : "minutes"),
  },
  moveLimit: {
    label: "Moves per booking",
    unit: (value) => (value === 1 ? "move" : "moves"),
  },
  moveNoticeDays: {
    label: "Moves close",
    unit: (value) => `${value === 1 ? "day" : "days"} (${value * 24} hours) before it starts`,
  },
};

function said(change: DeskSettingChange, value: string | null) {
  if (value === null || value === "") {
    return "—";
  }

  const words = settingWords[change.setting];
  const number = Number(value);

  return words && Number.isFinite(number) ? `${value} ${words.unit(number)}` : value;
}

/**
 * Every change to the dials, newest first.
 *
 * Kept on the same page as the dials because that is where somebody stands when
 * they wonder why the hold is fifteen minutes now — and the answer may be that
 * the platform set it for the venue, which is marked as such.
 */
function SettingsHistory() {
  const history = useQuery({
    queryKey: ["desk", "settings", "history"],
    queryFn: getDeskSettingsHistory,
  });

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-[#071955]">Change history</h2>
      <p className="mt-1 text-sm text-slate-500">
        Who changed these, when, and what each one was before.
      </p>

      {history.isPending ? (
        <div className="mt-4 h-24 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      ) : history.isError ? (
        <p className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          The history could not be loaded just now.
        </p>
      ) : history.data.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Nothing has been changed yet — these are the platform&apos;s starting values.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
          {history.data.map((entry) => (
            <li key={entry.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-bold text-[#071955]">
                  {entry.changedBy ?? "An account that no longer exists"}
                  {entry.byPlatform && (
                    <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">
                      IcyPlay admin
                    </span>
                  )}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {new Date(entry.changedAt).toLocaleString("en-PH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <ul className="mt-2 space-y-1">
                {entry.changes.map((change) => (
                  <li key={change.setting} className="text-sm">
                    <span className="text-slate-500">
                      {settingWords[change.setting]?.label ?? change.setting}:{" "}
                    </span>
                    <span className="text-slate-400 line-through">{said(change, change.from)}</span>
                    <span className="mx-1.5 text-slate-400">&rarr;</span>
                    <span className="font-semibold text-[#071955]">{said(change, change.to)}</span>
                  </li>
                ))}
              </ul>

              {entry.reason && (
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  &ldquo;{entry.reason}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * The dials this venue sets for itself.
 *
 * On the desk rather than in the platform console, and open to attendants as
 * well as owners: the person who hears "half an hour is too long to wait" is
 * the one standing at the desk when it is said.
 */
function DeskSettingsView() {
  const { enqueueSnackbar } = useSnackbar();
  const client = useQueryClient();

  const settings = useQuery({
    queryKey: ["desk", "settings"],
    queryFn: getDeskSettings,
    staleTime: 5 * 60 * 1000,
  });

  const [expiry, setExpiry] = useState("");
  const [moves, setMoves] = useState("");
  const [notice, setNotice] = useState("");
  const [windowDays, setWindowDays] = useState("");

  // Seeded once the server has answered, and again if somebody else changes it.
  useEffect(() => {
    if (settings.data) {
      setExpiry(String(settings.data.partialBookingExpiryMinutes));
      setMoves(String(settings.data.moveLimit));
      setNotice(String(settings.data.moveNoticeDays));
      setWindowDays(String(settings.data.bookingWindowDays));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (payload: {
      partialBookingExpiryMinutes: number;
      moveLimit: number;
      moveNoticeDays: number;
      bookingWindowDays: number;
    }) => updateDeskSettings(payload),
    onSuccess: (saved: DeskSettings) => {
      client.setQueryData(["desk", "settings"], saved);
      void client.invalidateQueries({ queryKey: ["desk", "settings", "history"] });
      enqueueSnackbar("Saved.", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not save. Please try again.",
        { variant: "error" },
      ),
  });

  const ranges = settings.data;
  const changed =
    ranges !== undefined &&
    (Number(expiry) !== ranges.partialBookingExpiryMinutes ||
      Number(moves) !== ranges.moveLimit ||
      Number(notice) !== ranges.moveNoticeDays ||
      Number(windowDays) !== ranges.bookingWindowDays);

  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-8 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Settings" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          How far ahead customers can book, how long you hold a court for somebody who has not paid
          yet, how often a booking may be moved, and how close to its start moves stop. They apply
          to every court at this venue.
        </p>

        {settings.isPending ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : settings.isError || ranges === undefined ? (
          <p className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
            These could not be loaded just now. Please refresh the page.
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Dial
                id="booking-window"
                label="Customers can book up to"
                hint="How many days of your courts customers see on the booking page, today included. At 30 the page shows two weeks and a button for the rest of the month."
                value={windowDays}
                unit="days ahead"
                smallest={ranges.smallestBookingWindowDays}
                largest={ranges.largestBookingWindowDays}
                onChange={setWindowDays}
              />

              <Dial
                id="hold-minutes"
                label="Hold a court for"
                hint="After this, an unpaid booking lets the court go and the hours are back on sale. Long enough to open GCash and pay; short enough that a court is not sitting dark because somebody wandered off."
                value={expiry}
                unit="minutes"
                smallest={ranges.smallestExpiry}
                largest={ranges.largestExpiry}
                onChange={setExpiry}
              />

              <Dial
                id="move-limit"
                label="A booking may be moved"
                hint="How many times a customer may move one booking to another court or time. Every move comes to you to approve, and only the ones you approve are counted."
                value={moves}
                unit="times"
                smallest={ranges.smallestMoveLimit}
                largest={ranges.largestMoveLimit}
                onChange={setMoves}
              />

              <Dial
                id="move-notice"
                label="Stop taking moves"
                hint="A booking closer than this to its start can no longer be moved, so the hours it would give back still have time to sell. Once a booking has started, what is left of it can still change court — with your approval."
                value={notice}
                unit="days before it starts"
                smallest={ranges.smallestMoveNoticeDays}
                largest={ranges.largestMoveNoticeDays}
                note={inHours(notice)}
                onChange={setNotice}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {changed && (
                <button
                  type="button"
                  onClick={() => {
                    setExpiry(String(ranges.partialBookingExpiryMinutes));
                    setMoves(String(ranges.moveLimit));
                    setNotice(String(ranges.moveNoticeDays));
                    setWindowDays(String(ranges.bookingWindowDays));
                  }}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Put them back
                </button>
              )}

              <button
                type="button"
                disabled={!changed || save.isPending}
                onClick={() =>
                  save.mutate({
                    partialBookingExpiryMinutes: Number(expiry),
                    moveLimit: Number(moves),
                    moveNoticeDays: Number(notice),
                    bookingWindowDays: Number(windowDays),
                  })
                }
                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                  changed && !save.isPending
                    ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              A figure outside the range is brought to the nearest end of it rather than refused —
              typing the largest number you can think of means &ldquo;the longest you allow&rdquo;.
            </p>

            <SettingsHistory />
          </>
        )}
      </div>
    </main>
  );
}

export default DeskSettingsView;
