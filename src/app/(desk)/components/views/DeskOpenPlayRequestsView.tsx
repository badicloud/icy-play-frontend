"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";
import ReasonPicker, { emptyReason, reasonAnswerOf, type ReasonDraft } from "@/app/components/ui/ReasonPicker";
import { ApiError } from "@/services/api";
import { useDeskVenues } from "@auth/hooks/useDesk";
import {
  REJECT_NOTE_LIMIT,
  REJECT_REASONS,
  type RejectAnswer,
  type RejectReasonValue,
} from "@auth/deskApi";
import { formatClock, formatPeso, formatSessionDate } from "@auth/openPlayApi";
import {
  confirmDeskOpenPlayRequest,
  getDeskOpenPlayRequests,
  rejectDeskOpenPlayRequest,
  type DeskOpenPlayRequest,
  type DeskOpenPlayRequestTab,
} from "@auth/openPlayRegistrationApi";

const tabs: { id: DeskOpenPlayRequestTab; label: string }[] = [
  { id: "Waiting", label: "Waiting" },
  { id: "Confirmed", label: "Confirmed" },
];

function RequestCard({
  request,
  deciding,
  onConfirm,
  onReject,
}: {
  request: DeskOpenPlayRequest;
  deciding: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const waiting = request.status === "PendingVerification";

  return (
    <li className="rounded-3xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-bold text-[#071955]">{request.playerName}</p>
          <p className="text-sm text-slate-500">
            {request.playerEmail}
            {request.playerPhone ? ` · ${request.playerPhone}` : ""}
          </p>
          <p className="mt-2 font-semibold text-slate-700">{request.title}</p>
          <p className="text-sm text-slate-500">
            {formatSessionDate(request.date)} · {formatClock(request.startsAt)}–{formatClock(request.endsAt)} ·{" "}
            {request.facilityName} · {request.courtName} · {request.unitLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {request.registered} of {request.maxPlayers} registered on this session
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Should have sent</p>
          <p className="text-2xl font-extrabold text-[#071955]">{formatPeso(request.total)}</p>
          <p className="text-xs text-slate-500">
            {formatPeso(request.registrationFee)} fee
            {request.discount > 0 ? ` − ${formatPeso(request.discount)} early bird` : ""} +{" "}
            {formatPeso(request.platformFee)} platform
          </p>
        </div>
      </div>

      {request.receiptUrl && (
        <a
          href={request.receiptUrl}
          target="_blank"
          rel="noreferrer"
          title="Open full size"
          className="mt-4 inline-block"
        >
          <Image
            src={request.receiptUrl}
            alt={`${request.playerName}'s GCash receipt`}
            width={160}
            height={220}
            unoptimized
            className="max-h-60 w-auto rounded-2xl border border-slate-200 object-contain"
          />
        </a>
      )}

      {waiting && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={deciding}
            onClick={onConfirm}
            className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            Confirm payment
          </button>
          <button
            type="button"
            disabled={deciding}
            onClick={onReject}
            className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Turn it down
          </button>
        </div>
      )}
    </li>
  );
}

function RejectDialog({
  request,
  saving,
  onClose,
  onReject,
}: {
  request: DeskOpenPlayRequest | null;
  saving: boolean;
  onClose: () => void;
  onReject: (why: RejectAnswer) => void;
}) {
  const [why, setWhy] = useState<ReasonDraft<RejectReasonValue>>(emptyReason);

  // A reason picked against one player must not follow the dialog onto the next.
  useEffect(() => {
    setWhy(emptyReason());
  }, [request?.registrationId]);

  if (request === null) {
    return null;
  }

  const answer = reasonAnswerOf(why, REJECT_NOTE_LIMIT);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-[#071955]">Turn this registration down</h2>
        <p className="mt-1 text-sm text-slate-500">
          {request.playerName} for {request.title}. They are not registered and the spot is released for
          somebody else.
        </p>

        <ReasonPicker
          name="open-play-reject-reason"
          question="What was wrong with it?"
          hint="The player is emailed this and sees it on their registration."
          options={REJECT_REASONS}
          noteLimit={REJECT_NOTE_LIMIT}
          notePlaceholder="The amount sent was short"
          value={why}
          onChange={setWhy}
          disabled={saving}
        />

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || answer === null}
            onClick={() => answer !== null && onReject(answer)}
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Turning it down…" : "Turn it down"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The desk's queue of open play payments: check the GCash receipt against
 * what the player owes, then confirm it and they are registered, or turn it
 * down with a reason. The player is emailed either way.
 */
function DeskOpenPlayRequestsView() {
  const client = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const venues = useDeskVenues();
  const [tab, setTab] = useState<DeskOpenPlayRequestTab>("Waiting");
  const [facilityId, setFacilityId] = useState("");
  const [perPage, setPerPage] = useState<number>(perPageOptions[0]);
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<DeskOpenPlayRequest | null>(null);

  const query = { tab, facilityId: facilityId === "" ? null : facilityId, page, pageSize: perPage };

  const requests = useQuery({
    queryKey: ["desk", "open-play-requests", query],
    queryFn: () => getDeskOpenPlayRequests(query),
    placeholderData: keepPreviousData,
  });

  function refresh() {
    void client.invalidateQueries({ queryKey: ["desk"] });
    void client.invalidateQueries({ queryKey: ["catalog", "open-plays"] });
  }

  function report(error: unknown) {
    enqueueSnackbar(error instanceof ApiError ? error.message : "That did not work. Please try again.", {
      variant: "error",
    });
  }

  const confirm = useMutation({
    mutationFn: (request: DeskOpenPlayRequest) => confirmDeskOpenPlayRequest(request.registrationId),
    onSuccess: (_, request) => {
      enqueueSnackbar(`${request.playerName} is registered. They have been emailed.`, { variant: "success" });
      refresh();
    },
    onError: report,
  });

  const reject = useMutation({
    mutationFn: ({ request, why }: { request: DeskOpenPlayRequest; why: RejectAnswer }) =>
      rejectDeskOpenPlayRequest(request.registrationId, why),
    onSuccess: (_, { request }) => {
      enqueueSnackbar(`${request.playerName}'s registration was turned down and the spot released.`, {
        variant: "success",
      });
      setRejecting(null);
      refresh();
    },
    onError: report,
  });

  /** Changing what is being looked at starts at the first page of it. */
  function look(next: () => void) {
    next();
    setPage(1);
  }

  const rows = requests.data?.data ?? [];
  const pagination = requests.data?.pagination;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Open play requests" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Open play requests</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Players who have paid to join an open play. Check the GCash receipt against what they owe, then
          confirm it: only then are they registered. They are emailed the moment you decide.
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
                  tab === option.id ? "bg-[#2563EB] text-white" : "text-slate-500 hover:text-[#071955]"
                }`}
              >
                {option.label}
                {option.id === tab && pagination && ` (${pagination.totalItems})`}
              </button>
            ))}
          </div>

          {(venues.data?.length ?? 0) > 1 && (
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

        {requests.isPending && <p className="mt-6 text-slate-500">Loading…</p>}

        {requests.isError && <p className="mt-6 text-red-600">Could not load the queue. Please try again.</p>}

        {requests.data && rows.length === 0 && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-slate-500">
            {tab === "Waiting"
              ? "Nothing is waiting on you. Every open play payment has been checked."
              : "Nobody has been confirmed for an open play yet."}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="mt-6 space-y-3">
            {rows.map((request) => (
              <RequestCard
                key={request.registrationId}
                request={request}
                deciding={confirm.isPending || reject.isPending}
                onConfirm={() => confirm.mutate(request)}
                onReject={() => setRejecting(request)}
              />
            ))}
          </ul>
        )}

        <Pager
          page={page}
          pageSize={perPage}
          totalItems={pagination?.totalItems ?? 0}
          totalPages={pagination?.totalPages ?? 1}
          noun={{ one: "registration", many: "registrations" }}
          label="Registration pages"
          onPageChange={setPage}
          onPageSizeChange={(size) => look(() => setPerPage(size))}
        />

        <RejectDialog
          request={rejecting}
          saving={reject.isPending}
          onClose={() => setRejecting(null)}
          onReject={(why) => rejecting && reject.mutate({ request: rejecting, why })}
        />
      </div>
    </main>
  );
}

export default DeskOpenPlayRequestsView;
