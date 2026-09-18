"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { ApiError } from "@/services/api";
import { getDeskSettings, updateDeskSettings, type DeskSettings } from "@auth/deskApi";
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
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  unit: string;
  smallest: number;
  largest: number;
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
    </div>
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

  // Seeded once the server has answered, and again if somebody else changes it.
  useEffect(() => {
    if (settings.data) {
      setExpiry(String(settings.data.partialBookingExpiryMinutes));
      setMoves(String(settings.data.moveLimit));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (payload: { partialBookingExpiryMinutes: number; moveLimit: number }) =>
      updateDeskSettings(payload),
    onSuccess: (saved: DeskSettings) => {
      client.setQueryData(["desk", "settings"], saved);
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
      Number(moves) !== ranges.moveLimit);

  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-8 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Settings" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          How long you hold a court for somebody who has not paid yet, and how often a booking may
          be moved. Both apply to every court at this venue.
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
                hint="How many times a customer may move one booking to another court. A move you make yourself — because a court has a problem — is not counted against them."
                value={moves}
                unit="times"
                smallest={ranges.smallestMoveLimit}
                largest={ranges.largestMoveLimit}
                onChange={setMoves}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {changed && (
                <button
                  type="button"
                  onClick={() => {
                    setExpiry(String(ranges.partialBookingExpiryMinutes));
                    setMoves(String(ranges.moveLimit));
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
          </>
        )}
      </div>
    </main>
  );
}

export default DeskSettingsView;
