"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import EditDialog from "./edit/EditDialog";
import { ApiError } from "@/services/api";
import {
  buildDemoVenue,
  removeSeededVenues,
  seedAllowance,
  seededVenues,
  type SeedRemoval,
  type SeedResult,
} from "@auth/seedApi";

/**
 * Builds a venue to demonstrate against, and takes them away again.
 *
 * Shown only to the accounts the server will actually let through, and the two
 * halves are offered separately because they are not the same risk. The server
 * is where both decisions are kept — this writes real rows, and a check the
 * browser holds is a check anybody can skip by calling the address directly.
 * Asking it first is only so a button is not offered to somebody it will then
 * refuse.
 */
function SeedVenuePanel() {
  const client = useQueryClient();
  const [built, setBuilt] = useState<SeedResult | null>(null);
  const [removed, setRemoved] = useState<SeedRemoval | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [email, setEmail] = useState("");

  const allowance = useQuery({
    queryKey: ["seed", "allowance"],
    queryFn: seedAllowance,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const mayRemove = allowance.data?.mayRemove === true;

  const standing = useQuery({
    queryKey: ["seed", "venues"],
    queryFn: seededVenues,
    enabled: mayRemove,
    retry: false,
  });

  const refresh = () => {
    // The court inventory and the public catalogue both just changed.
    void client.invalidateQueries({ queryKey: ["admin"] });
    void client.invalidateQueries({ queryKey: ["catalog"] });
    void client.invalidateQueries({ queryKey: ["seed", "venues"] });
  };

  const said = (error: unknown) =>
    setProblem(error instanceof ApiError ? error.message : "That did not work. Please try again.");

  const build = useMutation({
    mutationFn: () => buildDemoVenue(email),
    onSuccess: (result) => {
      setBuilt(result);
      setRemoved(null);
      setProblem(null);
      refresh();
    },
    onError: said,
  });

  const remove = useMutation({
    mutationFn: removeSeededVenues,
    onSuccess: (result) => {
      setRemoved(result);
      setBuilt(null);
      setProblem(null);
      setAsking(false);
      refresh();
    },
    // The dialog stays open and shows the failure itself, so nothing is set
    // here: closing it would take the message away with it.
  });

  if (allowance.data?.mayBuild !== true) {
    return null;
  }

  const venues = standing.data ?? [];
  const total = venues.reduce(
    (running, venue) => ({
      courts: running.courts + venue.courts,
      bookings: running.bookings + venue.bookings,
    }),
    { courts: 0, bookings: 0 },
  );

  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            <ScienceOutlined sx={{ fontSize: 18 }} />
            Demonstration data
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Builds one venue with five courts on it, each marked out for basketball, badminton two
            ways, pickleball three ways and volleyball, priced as CheChe Facility is. Open six to
            ten, shut on Sundays, peak five to eight. No events.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            It is built through the ordinary court screens rather than written into the database,
            so what comes out behaves like a real venue — thirty-five bookable courts that a
            customer can actually find and book. It is a venue of its own, not another court on
            one you already have.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2">
          <label htmlFor="seed-owner-email" className="text-xs font-bold text-slate-500">
            The owner&apos;s email
          </label>
          <input
            id="seed-owner-email"
            type="email"
            value={email}
            placeholder="demo-owner@mailinator.com"
            onChange={(event) => setEmail(event.target.value)}
            className="w-72 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          />
          <p className="max-w-72 text-xs leading-5 text-slate-400">
            The only way into that account is a password reset, so use an address you can read.
            Blank uses the Mailinator inbox above — a public one, which is fine for demonstration
            data and fine for nothing else.
          </p>

          <button
            type="button"
            disabled={build.isPending}
            onClick={() => build.mutate()}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-wait disabled:text-slate-400"
          >
            {build.isPending ? "Building…" : "Build a demo venue"}
          </button>
        </div>
      </div>

      {mayRemove && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          {venues.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nothing seeded at the moment. Anything built here can be taken away again from this
              same panel.
            </p>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-sm font-bold text-[#071955]">
                  {venues.length === 1 ? "One seeded venue" : `${venues.length} seeded venues`}{" "}
                  standing, with {total.courts} courts and {total.bookings}{" "}
                  {total.bookings === 1 ? "booking" : "bookings"} on them.
                </p>
                <ul className="mt-2 space-y-1">
                  {venues.map((venue) => (
                    <li key={venue.facilityOwnerId} className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-600">{venue.businessName}</span>{" "}
                      — <span className="font-mono">{venue.signInEmail}</span>, {venue.courts}{" "}
                      courts, {venue.bookings}{" "}
                      {venue.bookings === 1 ? "booking" : "bookings"}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setAsking(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50"
              >
                Remove demo data
              </button>
            </div>
          )}
        </div>
      )}

      {/*
        A dialog rather than a second button beside the first. This one takes
        away the bookings people made while trying the product, and there is no
        undo — so it is worth making somebody stop, read what is about to go,
        and answer. The counts are the live ones, not a remembered total.
      */}
      <EditDialog
        title="Remove demonstration data"
        description="Every venue the seeder built, and everything under it."
        open={asking}
        isSaving={remove.isPending}
        error={remove.error}
        onClose={() => setAsking(false)}
        onSave={() => remove.mutate()}
        confirmLabel="Remove it all"
        busyLabel="Removing…"
        destructive
        // No reason asked for. Every other destructive edit here wants one,
        // because the trail explains a change to a real venue. Demonstration
        // data is the exception: there is nobody to explain it to.
        hideReason
        reason=""
        onReasonChange={() => {}}
      >
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <WarningAmberOutlined sx={{ fontSize: 20 }} className="mt-0.5 shrink-0 text-red-700" />
          <p className="text-sm leading-6 text-red-900">
            This cannot be undone. Venues you did not seed are untouched — the removal goes on the
            marker the seeder writes, never on the name.
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {venues.map((venue) => (
            <li
              key={venue.facilityOwnerId}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <p className="text-sm font-bold text-[#071955]">{venue.businessName}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-500">{venue.signInEmail}</p>
              <p className="mt-1 text-sm text-slate-600">
                {venue.facilities} {venue.facilities === 1 ? "facility" : "facilities"},{" "}
                {venue.courts} courts, {venue.bookings}{" "}
                {venue.bookings === 1 ? "booking" : "bookings"}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Going with them: {total.courts} courts, {total.bookings}{" "}
          {total.bookings === 1 ? "booking" : "bookings"}, and the{" "}
          {venues.length === 1 ? "account" : "accounts"} the seeder created to own them.
        </p>
      </EditDialog>

      {problem && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {problem}
        </p>
      )}

      {removed && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-[#071955]">
            {removed.venues === 0
              ? "There was nothing seeded to remove."
              : `${removed.venues} ${removed.venues === 1 ? "venue" : "venues"} removed, with ${removed.courts} courts and ${removed.bookings} ${removed.bookings === 1 ? "booking" : "bookings"}.`}
          </p>
        </div>
      )}

      {built && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-bold text-green-900">
            {built.facilityName} is up, with {built.courts.length} courts on it.
          </p>
          <p className="mt-1 text-sm text-green-900">
            Its owner signs in as{" "}
            <span className="font-mono font-bold">{built.signInEmail}</span>. The account is a
            facility owner, verified, with no usable password: set one with{" "}
            <Link href="/forgot-password" className="font-bold underline underline-offset-2">
              forgot password
            </Link>{" "}
            and you are on its desk.
          </p>
          <Link
            href={`/admin/facility-owners/${built.facilityOwnerId}`}
            className="mt-2 inline-block text-sm font-bold text-[#164eaa] underline underline-offset-2"
          >
            Open the owner
          </Link>
        </div>
      )}
    </section>
  );
}

export default SeedVenuePanel;
