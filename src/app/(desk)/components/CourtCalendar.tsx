"use client";

import { useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { bookingState, type DeskCourt, type ScheduleEntry } from "@auth/deskApi";
import { useCourtSchedule, useDeskBooking } from "@auth/hooks/useDesk";
import BookingDetails from "./BookingDetails";

/**
 * How a booked hour is drawn, by what the booking is.
 *
 * Three states hold an hour and each means something different to the person
 * reading the diary: one is money in, one is money to check, and one is an hour
 * being held for somebody who has not paid and may yet let it go.
 */
const tones: Record<string, { fill: string; border: string; text: string }> = {
  Confirmed: { fill: "#dcfce7", border: "#16a34a", text: "#14532d" },
  PendingVerification: { fill: "#fef3c7", border: "#d97706", text: "#78350f" },
  PendingPayment: { fill: "#e2e8f0", border: "#94a3b8", text: "#334155" },
};

const views = [
  { id: "timeGridDay", label: "Day" },
  { id: "timeGridWeek", label: "Week" },
  { id: "dayGridMonth", label: "Month" },
] as const;

const stepStyle =
  "inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-[#071955]";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: { bookingId: string };
};

/**
 * One event per unbroken run of hours, rather than one per hour.
 *
 * The API answers hour by hour because that is how an hour is sold. Drawn that
 * way a three-hour booking is three stacked blocks with the same name on each,
 * which reads as three bookings.
 */
function runs(entries: ScheduleEntry[]): CalendarEvent[] {
  const ordered = [...entries].sort(
    (a, b) =>
      a.bookableCourtId.localeCompare(b.bookableCourtId) ||
      a.date.localeCompare(b.date) ||
      a.startsAt.localeCompare(b.startsAt),
  );

  const events: CalendarEvent[] = [];

  for (const entry of ordered) {
    const last = events[events.length - 1];
    const carriesOn =
      last !== undefined &&
      last.extendedProps.bookingId === entry.bookingId &&
      last.end === `${entry.date}T${entry.startsAt}`;

    if (carriesOn) {
      last.end = `${entry.date}T${entry.endsAt}`;
      continue;
    }

    const tone = tones[entry.status] ?? tones.PendingPayment;

    events.push({
      id: `${entry.bookingId}-${entry.date}-${entry.startsAt}`,
      title: `${entry.unitLabel} · ${entry.customerName}`,
      start: `${entry.date}T${entry.startsAt}`,
      end: `${entry.date}T${entry.endsAt}`,
      backgroundColor: tone.fill,
      borderColor: tone.border,
      textColor: tone.text,
      extendedProps: { bookingId: entry.bookingId },
    });
  }

  return events;
}

/**
 * One court's diary.
 *
 * What is drawn is only what still holds an hour — the server leaves out a hold
 * whose clock ran out, and everything that was turned down or called off. An
 * hour drawn as taken that anybody can book would send the desk away from an
 * hour it could have sold. What fell through is in the list, which is where
 * somebody goes looking for it.
 */
function CourtCalendar({ court }: { court: DeskCourt }) {
  const calendar = useRef<FullCalendar>(null);
  // The day is what a desk asks first: what is on today.
  const [view, setView] = useState<string>("timeGridDay");
  const [drawn, setDrawn] = useState({ from: "", to: "" });
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const schedule = useCourtSchedule(court.id, drawn.from, drawn.to);
  const booking = useDeskBooking(selected);

  const events = useMemo(() => runs(schedule.data ?? []), [schedule.data]);

  /**
   * FullCalendar tells us what it is about to draw, and that is what we ask the
   * server for. Its month view reaches into the weeks either side, which is why
   * the server allows six weeks rather than the thirty-one days of a month.
   */
  function handleDates(arg: DatesSetArg) {
    setView(arg.view.type);
    setTitle(arg.view.title);
    setDrawn({
      from: format(arg.start, "yyyy-MM-dd"),
      // FullCalendar's end is the morning after the last day it draws.
      to: format(subDays(arg.end, 1), "yyyy-MM-dd"),
    });
  }

  function show(id: string) {
    calendar.current?.getApi().changeView(id);
  }

  function step(move: "prev" | "next" | "today") {
    calendar.current?.getApi()[move]();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => step("prev")} className={stepStyle}>
            <ChevronLeftOutlined sx={{ fontSize: 17 }} aria-hidden />
            Previous
          </button>

          <button type="button" onClick={() => step("today")} className={stepStyle}>
            Today
          </button>

          <button type="button" onClick={() => step("next")} className={stepStyle}>
            Next
            <ChevronRightOutlined sx={{ fontSize: 17 }} aria-hidden />
          </button>

          <p className="ml-1 text-sm font-extrabold text-[#071955]">{title}</p>
        </div>

        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => show(option.id)}
              aria-current={view === option.id ? "true" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                view === option.id
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-500 hover:text-[#071955]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <ul className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
          {(["Confirmed", "PendingVerification", "PendingPayment"] as const).map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm border"
                style={{
                  backgroundColor: tones[status].fill,
                  borderColor: tones[status].border,
                }}
                aria-hidden
              />
              {bookingState(status).label}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`grid gap-5 ${selected === null ? "" : "lg:grid-cols-[320px_minmax(0,1fr)]"}`}
      >
        <div className="desk-calendar rounded-2xl border border-slate-200 bg-white p-3">
          <FullCalendar
            ref={calendar}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={false}
            height="auto"
            // A venue's day, not a machine's. Courts open at six and shut at ten.
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            allDaySlot={false}
            nowIndicator
            dayMaxEvents
            events={events}
            datesSet={handleDates}
            eventClick={(arg: EventClickArg) =>
              setSelected(arg.event.extendedProps.bookingId as string)
            }
          />

          {schedule.isError && (
            <p className="mt-3 text-sm text-red-600">Could not load this court&apos;s diary.</p>
          )}
        </div>

        {/* Beside the calendar rather than over it: reading a booking against
            the hours around it is the whole reason somebody clicked. On a phone
            there is no beside, so it falls underneath. */}
        {selected !== null && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:order-first">
          {booking.isPending ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : booking.isError || !booking.data ? (
            <p className="text-sm text-red-600">Could not load that booking.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#071955]">{booking.data.courtName}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      bookingState(booking.data.status).tone
                    }`}
                  >
                    {bookingState(booking.data.status).label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-sm font-bold text-slate-400 transition hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <BookingDetails booking={booking.data} stacked />
              </div>
            </>
          )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default CourtCalendar;
