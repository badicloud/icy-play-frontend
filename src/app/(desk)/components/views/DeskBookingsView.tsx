"use client";

import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import { ApiError } from "@/services/api";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";
import BookingDetails, { dates, day, peso } from "../BookingDetails";
import { activityIcon } from "@auth/catalogApi";
import { waitingFor, type DeskBooking, type DeskTab } from "@auth/deskApi";
import {
  useDeskBooking,
  useDeskBookings,
  useDeskDecision,
  useDeskVenues,
} from "@auth/hooks/useDesk";
import RejectBookingDialog from "../RejectBookingDialog";

const tabs: { id: DeskTab; label: string }[] = [
  { id: "Waiting", label: "Waiting on you" },
  { id: "Confirmed", label: "Confirmed" },
];

/**
 * One booking, shut until somebody opens it.
 *
 * Shut, it says who and when and how much — enough to work down the queue.
 * Open, it shows the receipt itself, because the whole job is looking at that
 * picture and deciding.
 */
function BookingCard({
  booking,
  onConfirm,
  onReject,
  isDeciding,
  startOpen = false,
}: {
  booking: DeskBooking;
  onConfirm: () => void;
  onReject: () => void;
  isDeciding: boolean;
  /** For a booking somebody was sent here to look at. */
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const { enqueueSnackbar } = useSnackbar();
  const waiting = booking.status === "PendingVerification";
  const icon = activityIcon(booking.sportKey);

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
              alt={booking.sportName}
              title={booking.sportName}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span className="text-xs font-bold text-[#1264f7]">
              {booking.sportName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-[#071955]">
            {booking.customerName}
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {booking.courtName} · {dates(booking)} · {booking.bookedHours}h
          </span>
        </span>

        <span className="hidden text-right sm:block">
          <span className="block font-bold text-[#071955]">{peso(booking.total)}</span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            {waiting
              ? waitingFor(booking.submittedForVerificationAt, new Date())
              : booking.confirmedAt && day(booking.confirmedAt)}
          </span>
        </span>

        {waiting ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            <HourglassEmptyOutlined sx={{ fontSize: 13 }} aria-hidden />
            Waiting
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            <CheckCircleOutlined sx={{ fontSize: 13 }} aria-hidden />
            Confirmed
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
          <BookingDetails booking={booking} />

          {waiting && (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={isDeciding}
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircleOutlined sx={{ fontSize: 17 }} />
                Confirm booking
              </button>

              <button
                type="button"
                disabled={isDeciding}
                onClick={onReject}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CloseOutlined sx={{ fontSize: 17 }} />
                Reject
              </button>

              <button
                type="button"
                // Deliberately inert, and visibly so. The thread it will open
                // is not built, and a button that looks alive and does nothing
                // is worse than one that says it is coming.
                onClick={() =>
                  enqueueSnackbar(
                    "Messaging the customer is not built yet. Ring or email them for now.",
                    { variant: "info" },
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-400 transition hover:border-slate-400"
              >
                <ChatBubbleOutlineOutlined sx={{ fontSize: 17 }} />
                Send a message
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                  Soon
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The queue of payments waiting to be checked.
 *
 * Two tabs rather than one list: what is waiting is work and what is confirmed
 * is a record, and three that need doing must not be buried under fifty that
 * are done.
 */
function DeskBookingsView() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<DeskTab>("Waiting");
  const [facilityId, setFacilityId] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(perPageOptions[0]);
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<DeskBooking | null>(null);

  const venues = useDeskVenues();
  // Read from the address bar rather than through useSearchParams, so this page
  // needs no Suspense boundary it would not otherwise have.
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(new URLSearchParams(window.location.search).get("booking"));
  }, []);

  const singled = useDeskBooking(picked);
  const bookings = useDeskBookings({
    tab,
    facilityId: facilityId === "" ? undefined : facilityId,
    page,
    pageSize: perPage,
  });
  const { confirm, reject, isDeciding } = useDeskDecision();

  function report(error: unknown) {
    enqueueSnackbar(
      error instanceof ApiError ? error.message : "That did not work. Please try again.",
      { variant: "error" },
    );
  }

  async function handleConfirm(booking: DeskBooking) {
    try {
      await confirm.mutateAsync(booking.id);
      enqueueSnackbar(`${booking.customerName}'s court is confirmed. They have been emailed.`, {
        variant: "success",
      });
    } catch (error) {
      report(error);
    }
  }

  async function handleReject(reason: string | null) {
    if (rejecting === null) {
      return;
    }

    try {
      await reject.mutateAsync({ bookingId: rejecting.id, reason });
      enqueueSnackbar(
        `${rejecting.customerName}'s booking was turned down and the hours are back on sale.`,
        { variant: "success" },
      );
      setRejecting(null);
    } catch (error) {
      report(error);
    }
  }

  /** Changing what is being looked at starts at the first page of it. */
  function look(next: () => void) {
    next();
    setPage(1);
  }

  const rows = bookings.data?.data ?? [];
  const pagination = bookings.data?.pagination;
  const pages = pagination?.totalPages ?? 1;
  const manyVenues = (venues.data?.length ?? 0) > 1;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Venue desk", href: "/desk" }, { label: "Booking confirmations" }]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Booking confirmations
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Check the GCash receipt against what was booked, then confirm it. The customer is
          emailed the moment you do.
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

        {/*
          Somebody sent here from a court's list came for one booking, and the
          queue is paged: it could be four pages down, or on the other tab. So
          it is picked out and opened above the queue rather than left to be
          found.
       */}
      {picked !== null && singled.data && (
        <section className="mt-6">
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            Opened from {singled.data.courtName}
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                window.history.replaceState(null, "", "/desk/bookings");
              }}
              className="font-bold text-[#164eaa] underline-offset-2 hover:underline"
            >
              Show the whole queue
            </button>
          </p>

          <ul>
            <BookingCard
              booking={singled.data}
              isDeciding={isDeciding}
              startOpen
              onConfirm={() => void handleConfirm(singled.data)}
              onReject={() => setRejecting(singled.data)}
            />
          </ul>
        </section>
      )}

      {bookings.isPending && <p className="mt-6 text-slate-500">Loading…</p>}

        {bookings.isError && (
          <p className="mt-6 text-red-600">Could not load the queue. Please try again.</p>
        )}

        {bookings.data && rows.length === 0 && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-slate-500">
            {tab === "Waiting"
              ? "Nothing is waiting on you. Everything paid for has been checked."
              : "Nothing has been confirmed here yet."}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="mt-6 space-y-3">
            {rows.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                isDeciding={isDeciding}
                onConfirm={() => void handleConfirm(booking)}
                onReject={() => setRejecting(booking)}
              />
            ))}
          </ul>
        )}

        <Pager
          page={page}
          pageSize={perPage}
          totalItems={pagination?.totalItems ?? 0}
          totalPages={pages}
          noun={{ one: "booking", many: "bookings" }}
          label="Booking pages"
          onPageChange={setPage}
          onPageSizeChange={(size) => look(() => setPerPage(size))}
        />

        <RejectBookingDialog
          booking={rejecting}
          isSaving={reject.isPending}
          onClose={() => setRejecting(null)}
          onReject={(reason) => void handleReject(reason)}
        />
      </div>
    </main>
  );
}

export default DeskBookingsView;
