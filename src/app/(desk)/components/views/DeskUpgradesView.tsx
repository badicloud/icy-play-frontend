"use client";

import { useState } from "react";
import { useSnackbar } from "notistack";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import { ApiError } from "@/services/api";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";
import { day, hour, peso } from "../BookingDetails";
import { activityIcon } from "@auth/catalogApi";
import { isUpgrade, waitingFor, type DeskUpgrade, type DeskUpgradeTab } from "@auth/deskApi";
import { useDeskUpgradeDecision, useDeskUpgrades, useDeskVenues } from "@auth/hooks/useDesk";
import DeclineUpgradeDialog from "../DeclineUpgradeDialog";

const tabs: { id: DeskUpgradeTab; label: string }[] = [
  { id: "Waiting", label: "Waiting on you" },
  { id: "Settled", label: "Settled" },
];

/** One side of the swap: a court and the hours on it. */
function Side({
  heading,
  courtName,
  slots,
  tone,
}: {
  heading: string;
  courtName: string;
  slots: { date: string; startsAt: string; endsAt: string }[];
  tone: "now" | "wanted";
}) {
  // The hours gathered under their date. Almost always one date, but grouped
  // rather than assumed so a booking spanning two days does not print one twice.
  const byDate: [string, string[]][] = [
    ...slots
      .reduce((gathered, slot) => {
        gathered.set(slot.date, [...(gathered.get(slot.date) ?? []), hour(slot.startsAt)]);

        return gathered;
      }, new Map<string, string[]>())
      .entries(),
  ].sort(([left], [right]) => left.localeCompare(right));

  return (
    <div
      className={`flex-1 rounded-2xl border px-4 py-3 ${
        tone === "wanted" ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">{heading}</p>
      <p className="mt-1 font-bold text-[#071955]">{courtName}</p>

      {byDate.map(([date, times]) => (
        <p key={date} className="mt-1 text-sm text-slate-600">
          <span className="font-semibold">{day(date)}</span> · {times.join(", ")}
        </p>
      ))}
    </div>
  );
}

/**
 * One move request, shut until somebody opens it.
 *
 * Shut, it says who and which court, and for an upgrade how much — enough to
 * work down the queue. Open, it shows both sides of the swap and, for an
 * upgrade, the receipt itself, because then the job is that picture as well as
 * whether that court is free.
 */
function UpgradeCard({
  upgrade,
  onApprove,
  onDecline,
  isDeciding,
}: {
  upgrade: DeskUpgrade;
  onApprove: () => void;
  onDecline: () => void;
  isDeciding: boolean;
}) {
  const [open, setOpen] = useState(false);
  const waiting = upgrade.status === "AwaitingApproval";
  const paid = isUpgrade(upgrade);
  const icon = activityIcon(upgrade.sportKey);

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt={upgrade.sportName}
              title={upgrade.sportName}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span className="text-xs font-bold text-[#1264f7]">
              {upgrade.sportName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold text-[#071955]">{upgrade.customerName}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                paid ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {paid ? "Upgrade" : "Move"}
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
            <span className="truncate">{upgrade.fromCourtName}</span>
            <ArrowForwardOutlined sx={{ fontSize: 14 }} className="shrink-0" aria-hidden />
            <span className="truncate font-semibold text-[#071955]">{upgrade.toCourtName}</span>
          </span>
        </span>

        <span className="hidden text-right sm:block">
          <span className="block font-bold text-[#071955]">
            {paid ? peso(upgrade.balanceDue) : "Nothing to pay"}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            {waiting
              ? // An upgrade has waited since it was paid, a move since it was asked for.
                waitingFor(upgrade.receiptUploadedAt ?? upgrade.requestedAt, new Date())
              : upgrade.settledAt && day(upgrade.settledAt)}
          </span>
        </span>

        {waiting ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <HourglassEmptyOutlined sx={{ fontSize: 13 }} aria-hidden />
            Waiting
          </span>
        ) : upgrade.status === "Approved" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            <CheckCircleOutlined sx={{ fontSize: 13 }} aria-hidden />
            Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            <CloseOutlined sx={{ fontSize: 13 }} aria-hidden />
            Declined
          </span>
        )}

        <ExpandMoreOutlined
          sx={{ fontSize: 20 }}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Side
              heading="Booked now"
              courtName={upgrade.fromCourtName}
              slots={upgrade.hoursNow}
              tone="now"
            />
            <Side
              heading="Asking for"
              courtName={upgrade.toCourtName}
              slots={upgrade.hoursWanted}
              tone="wanted"
            />
          </div>

          <dl className="mt-5 space-y-1 text-sm">
            <Row label="Court rental they have paid" value={peso(upgrade.rentalNow)} />
            <Row label="Court rental for the new hours" value={peso(upgrade.rentalNew)} />
            {paid ? (
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                <dt className="font-bold text-[#071955]">They sent you</dt>
                <dd className="text-lg font-extrabold text-[#071955]">{peso(upgrade.balanceDue)}</dd>
              </div>
            ) : (
              <p className="border-t border-slate-100 pt-2 text-slate-500">
                The new hours cost the same or less, so there is nothing to pay and nothing to
                refund.
              </p>
            )}
          </dl>

          <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <Row label="Customer" value={upgrade.customerName} />
            <Row label="Email" value={upgrade.customerEmail} />
            {upgrade.customerPhone !== null && (
              <Row label="Phone" value={upgrade.customerPhone} />
            )}
            <Row label="Asked for" value={day(upgrade.requestedAt)} />
          </dl>

          {upgrade.receiptUrl !== null && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Their receipt
              </p>
              <a
                href={upgrade.receiptUrl}
                target="_blank"
                rel="noreferrer"
                title="Open full size"
                className="mt-2 inline-block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upgrade.receiptUrl}
                  alt={`GCash receipt from ${upgrade.customerName}`}
                  className="max-h-72 w-auto rounded-2xl border border-slate-200 object-contain"
                />
              </a>
            </div>
          )}

          {upgrade.declineReason !== null && (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              Declined: {upgrade.declineReason}
            </p>
          )}

          {waiting && (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={isDeciding}
                onClick={onApprove}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircleOutlined sx={{ fontSize: 17 }} />
                Approve and move the booking
              </button>

              <button
                type="button"
                disabled={isDeciding}
                onClick={onDecline}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CloseOutlined sx={{ fontSize: 17 }} />
                Decline
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-bold text-[#071955]">{value}</dd>
    </div>
  );
}

/**
 * The queue of moves waiting on the desk: free ones, and upgrades once paid.
 *
 * Its own page rather than a row in the booking queue, because it is a
 * different decision. Confirming a booking asks whether a payment is real;
 * this asks whether a particular court is free, and for an upgrade whether
 * the difference arrived too.
 */
function DeskUpgradesView() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<DeskUpgradeTab>("Waiting");
  const [facilityId, setFacilityId] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(perPageOptions[0]);
  const [page, setPage] = useState(1);
  const [declining, setDeclining] = useState<DeskUpgrade | null>(null);

  const venues = useDeskVenues();
  const upgrades = useDeskUpgrades({
    tab,
    facilityId: facilityId === "" ? undefined : facilityId,
    page,
    pageSize: perPage,
  });
  const { approve, decline, isDeciding } = useDeskUpgradeDecision();

  function report(error: unknown) {
    enqueueSnackbar(
      error instanceof ApiError ? error.message : "That did not work. Please try again.",
      { variant: "error" },
    );
  }

  async function handleApprove(upgrade: DeskUpgrade) {
    try {
      await approve.mutateAsync(upgrade.id);
      enqueueSnackbar(
        `${upgrade.customerName}'s booking is now on ${upgrade.toCourtName}. The hours they left are back on sale.`,
        { variant: "success" },
      );
    } catch (error) {
      report(error);
    }
  }

  async function handleDecline(reason: string | null) {
    if (declining === null) {
      return;
    }

    try {
      await decline.mutateAsync({ upgradeId: declining.id, reason });
      enqueueSnackbar(
        `${declining.customerName}'s ${isUpgrade(declining) ? "upgrade" : "move"} was declined. Their booking has not moved.`,
        { variant: "success" },
      );
      setDeclining(null);
    } catch (error) {
      report(error);
    }
  }

  /** Changing what is being looked at starts at the first page of it. */
  function look(next: () => void) {
    next();
    setPage(1);
  }

  const rows = upgrades.data?.data ?? [];
  const pagination = upgrades.data?.pagination;
  const manyVenues = (venues.data?.length ?? 0) > 1;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Move requests" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Move requests
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Customers asking to move their booking to another court or time. Check the court is free
          — and for an <b>upgrade</b>, that their payment for the difference arrived — then approve
          it, and the booking moves the moment you do. A move you decline is not counted against
          them.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
            {tabs.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => look(() => setTab(option.id))}
                aria-current={tab === option.id ? "true" : undefined}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  tab === option.id
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-500 hover:text-[#071955]"
                }`}
              >
                {option.label}
                {option.id === tab && pagination && ` (${pagination.totalItems})`}
              </button>
            ))}
          </div>

          {manyVenues && (
            <select
              value={facilityId}
              onChange={(event) => look(() => setFacilityId(event.target.value))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              aria-label="Venue"
            >
              <option value="">All venues</option>
              {venues.data?.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {upgrades.isPending && <p className="mt-6 text-slate-500">Loading…</p>}

        {upgrades.isError && (
          <p className="mt-6 text-red-600">Could not load the queue. Please try again.</p>
        )}

        {upgrades.data && rows.length === 0 && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-slate-500">
            {tab === "Waiting"
              ? "No move requests are waiting on you."
              : "No move request has been settled here yet."}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="mt-6 space-y-3">
            {rows.map((upgrade) => (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                isDeciding={isDeciding}
                onApprove={() => void handleApprove(upgrade)}
                onDecline={() => setDeclining(upgrade)}
              />
            ))}
          </ul>
        )}

        <Pager
          page={page}
          pageSize={perPage}
          totalItems={pagination?.totalItems ?? 0}
          totalPages={pagination?.totalPages ?? 1}
          noun={{ one: "request", many: "requests" }}
          label="Move request pages"
          onPageChange={setPage}
          onPageSizeChange={(size) => look(() => setPerPage(size))}
        />

        <DeclineUpgradeDialog
          upgrade={declining}
          isSaving={decline.isPending}
          onClose={() => setDeclining(null)}
          onDecline={(reason) => void handleDecline(reason)}
        />
      </div>
    </main>
  );
}

export default DeskUpgradesView;
