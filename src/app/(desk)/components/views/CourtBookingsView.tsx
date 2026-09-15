"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";
import { activityIcon } from "@auth/catalogApi";
import {
  bookingState,
  filterableStatuses,
  type DeskBooking,
  type DeskCourt,
  type DeskCourtUnit,
} from "@auth/deskApi";
import { useCourtBookings, useDeskCourts } from "@auth/hooks/useDesk";
import BookingDetails, { dates, day, peso } from "../BookingDetails";
import CourtCalendar from "../CourtCalendar";

/**
 * Which view a court is being read in.
 *
 * The calendar is what a desk opens a court to see — what is on today, what is
 * on this week. The list is for the other question: what happened, including
 * what fell through, which the calendar does not draw because none of it holds
 * an hour.
 */
type CourtView = "Calendar" | "List";

/** Today, as the browser reckons it, in the form the API takes. */
function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function inDays(days: number) {
  const when = new Date();
  when.setDate(when.getDate() + days);

  return format(when, "yyyy-MM-dd");
}

/**
 * The latest date anything in a group starts on, for ordering the groups
 * against each other. Dates arrive as yyyy-MM-dd, which sorts as text.
 */
function newest(bookings: DeskBooking[]) {
  return bookings.reduce(
    (latest, booking) => (booking.startDate > latest ? booking.startDate : latest),
    '',
  );
}

/**
 * One booking in a court's list: shut to a line, open to everything.
 */
function BookingRow({ booking }: { booking: DeskBooking }) {
  const [open, setOpen] = useState(false);
  const state = bookingState(booking.status);

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-[#071955]">{booking.customerName}</span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {dates(booking)} · {booking.bookedHours}h · booked {day(booking.createdAt)}
          </span>
        </span>

        <span className="hidden font-bold text-[#071955] sm:block">{peso(booking.total)}</span>

        <span className={`rounded-full px-3 py-1 text-xs font-bold ${state.tone}`}>
          {state.label}
        </span>

        <ExpandMoreOutlined
          sx={{ fontSize: 20 }}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-5">
          <BookingDetails booking={booking} />

          {booking.status === "PendingVerification" && (
            // Named for what happens there, not for where it is: somebody
            // reading a court's list is not thinking "confirmations queue",
            // they are thinking "this one is waiting on me".
            <Link
              href={`/desk/bookings?booking=${booking.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Check the payment
              <ArrowForwardOutlined sx={{ fontSize: 17 }} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * One court's bookings as a list, grouped by the part of the floor they were
 * sold on.
 *
 * Grouping is applied to the page rather than paged per group: a reader working
 * through a busy month wants the next twenty bookings, not the next twenty of
 * each of five parts.
 */
function CourtList({ court }: { court: DeskCourt }) {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(inDays(30));
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState<number>(perPageOptions[0]);
  const [page, setPage] = useState(1);

  const bookings = useCourtBookings({
    courtId: court.id,
    from: from === "" ? undefined : from,
    to: to === "" ? undefined : to,
    status: status === "" ? undefined : status,
    page,
    pageSize,
  });

  /** Narrowing what is being read starts at the first page of it. */
  function narrow(change: () => void) {
    change();
    setPage(1);
  }

  const rows = bookings.data?.data ?? [];
  const pagination = bookings.data?.pagination;

  // Every part of the floor holding whatever of this page belongs to it,
  // newest first.
  //
  // The server hands the page back newest first, and grouping it by the part it
  // was sold on would throw that away: a booking for tomorrow would sit under
  // the heading below one from last week, purely because its sport is listed
  // second. So the groups take their order from the newest booking in each.
  const groups = court.units
    .map((unit) => ({
      unit,
      bookings: rows.filter((booking) => booking.bookableCourtId === unit.bookableCourtId),
    }))
    .filter((group) => group.bookings.length > 0)
    .sort((a, b) => newest(b.bookings).localeCompare(newest(a.bookings)));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => narrow(() => setFrom(event.target.value))}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#071955] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="text-sm text-slate-500">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => narrow(() => setTo(event.target.value))}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#071955] outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="text-sm text-slate-500">
          Status
          <select
            value={status}
            onChange={(event) => narrow(() => setStatus(event.target.value))}
            className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#071955] outline-none focus:border-[#2563EB]"
          >
            <option value="">Everything</option>
            {filterableStatuses.map((value) => (
              <option key={value} value={value}>
                {bookingState(value).label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() =>
            narrow(() => {
              setFrom("");
              setTo("");
              setStatus("");
            })
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300"
        >
          All time
        </button>
      </div>

      {bookings.isPending && <p className="mt-5 text-sm text-slate-500">Loading…</p>}

      {bookings.isError && (
        <p className="mt-5 text-sm text-red-600">Could not load this court&apos;s bookings.</p>
      )}

      {bookings.data && rows.length === 0 && (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          Nothing booked on this court in that stretch.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.unit.bookableCourtId} className="mt-5">
          <UnitHeading unit={group.unit} count={group.bookings.length} />

          <ul className="mt-2 space-y-2">
            {group.bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </ul>
        </section>
      ))}

      {pagination && (
        <Pager
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          noun={{ one: "booking", many: "bookings" }}
          label={`${court.name} pages`}
          onPageChange={setPage}
          onPageSizeChange={(size) => narrow(() => setPageSize(size))}
        />
      )}
    </div>
  );
}

function UnitHeading({ unit, count }: { unit: DeskCourtUnit; count: number }) {
  const icon = activityIcon(unit.sportKey);

  return (
    <h4 className="flex items-center gap-2 text-sm font-bold text-[#071955]">
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="h-4 w-4 object-contain" aria-hidden />
      )}
      {unit.label}
      <span className="font-semibold text-slate-400">
        · {count} {count === 1 ? "booking" : "bookings"}
      </span>
    </h4>
  );
}

/**
 * One court, shut until somebody opens it.
 *
 * A venue with eight courts should not be handed eight calendars at once: the
 * one being asked about is opened, and the rest stay a line each.
 */
function CourtPanel({ court }: { court: DeskCourt }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CourtView>("Calendar");

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold text-[#071955]">
            {court.name}
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {court.units.map((unit) => unit.label).join(" · ")}
          </span>
        </span>

        <ExpandMoreOutlined
          sx={{ fontSize: 22 }}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-[#fbfdff] px-5 py-5">
          <div className="mb-4 flex gap-1 rounded-full border border-slate-200 bg-white p-1 w-fit">
            {(["Calendar", "List"] as CourtView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-current={view === option ? "true" : undefined}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  view === option
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-500 hover:text-[#071955]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {view === "Calendar" ? (
            <CourtCalendar court={court} />
          ) : (
            <CourtList court={court} />
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Every court a venue has registered, and what is booked on each.
 *
 * Organised by the court rather than by the part of it: the court is what
 * somebody walks onto and unlocks, and a floor marked out three ways for
 * pickleball is still one floor to the person standing at it.
 */
function CourtBookingsView() {
  const courts = useDeskCourts();
  const [facilityId, setFacilityId] = useState("");

  const venues = [
    ...new Map(
      (courts.data ?? []).map((court) => [court.facilityId, court.facilityName]),
    ).entries(),
  ];

  const shown = (courts.data ?? []).filter(
    (court) => facilityId === "" || court.facilityId === facilityId,
  );

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Venue desk", href: "/desk" }, { label: "Court bookings" }]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Court bookings
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Everything booked on each of your courts. Open a court to read its diary or its list.
        </p>

        {venues.length > 1 && (
          <select
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value)}
            className="mt-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            aria-label="Venue"
          >
            <option value="">All venues</option>
            {venues.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}

        {courts.isPending && <p className="mt-8 text-slate-500">Loading your courts…</p>}

        {courts.isError && (
          <p className="mt-8 text-red-600">Could not load your courts. Please try again.</p>
        )}

        {courts.data && shown.length === 0 && (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-slate-500">
            No courts have been set up at your venues yet.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {shown.map((court) => (
            <CourtPanel key={court.id} court={court} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default CourtBookingsView;
