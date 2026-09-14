"use client";

import Link from "next/link";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";
import { useDeskBookings, useDeskVenues } from "@auth/hooks/useDesk";

type DeskSection = {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
};

/**
 * What the desk can do, and what it will do.
 *
 * The unbuilt ones are named rather than hidden: an owner who cannot find
 * reports should be able to see that they are coming rather than wonder
 * whether they are looking in the wrong place.
 */
const sections: DeskSection[] = [
  {
    title: "Booking confirmations",
    description:
      "Payments waiting to be checked, and the ones already confirmed. Look at the receipt, then say yes or no.",
    href: "/desk/bookings",
    icon: <ReceiptLongOutlined />,
  },
  {
    title: "Court bookings",
    description: "Everything booked across your venues, by court and by day.",
    icon: <CalendarMonthOutlined />,
  },
  {
    title: "Reports",
    description: "What was taken, what is owed, and how busy each court has been.",
    icon: <AssessmentOutlined />,
  },
  {
    title: "Payouts and fees",
    description: "The platform fee against what you have taken, period by period.",
    icon: <PaymentsOutlined />,
  },
];

function SectionCard({ section }: { section: DeskSection }) {
  const content = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          section.href ? "bg-blue-50 text-[#1264f7]" : "bg-slate-100 text-slate-400"
        }`}
      >
        {section.icon}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-base font-bold text-[#071955]">
          {section.title}
          {!section.href && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
              <LockOutlined sx={{ fontSize: 13 }} />
              Not built yet
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">
          {section.description}
        </span>
      </span>
    </>
  );

  const shell =
    "flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition";

  return section.href ? (
    <Link href={section.href} className={`${shell} hover:border-slate-300 hover:shadow-sm`}>
      {content}
    </Link>
  ) : (
    <div className={`${shell} opacity-70`}>{content}</div>
  );
}

/**
 * Where an owner or attendant lands.
 *
 * The queue is the headline because it is the only thing on here that somebody
 * else is waiting on: a customer who has paid is sitting there not knowing
 * whether they have a court.
 */
function DeskOverviewView() {
  const { user } = useIcyPlayAuth();
  const venues = useDeskVenues();
  const waiting = useDeskBookings({ tab: "Waiting", page: 1, pageSize: 1 });

  const count = waiting.data?.pagination.totalItems ?? 0;
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Hello, {firstName}
          </h1>
          <span className="rounded-full bg-[#071955] px-3 py-1 text-xs font-bold tracking-[0.1em] text-white uppercase">
            Venue desk
          </span>
        </div>
        <p className="mt-2 text-slate-500">
          {venues.data === undefined
            ? "Your venues"
            : venues.data.length === 0
              ? "You are not on a venue's desk yet."
              : venues.data.map((venue) => venue.name).join(" · ")}
        </p>

        <Link
          href="/desk/bookings"
          className={`mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-6 transition ${
            count > 0
              ? "border-amber-200 bg-amber-50 hover:border-amber-300"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <span>
            <span className="block text-lg font-extrabold text-[#071955]">
              {waiting.isPending
                ? "Counting what is waiting…"
                : count === 0
                  ? "Nothing is waiting on you"
                  : count === 1
                    ? "One payment is waiting to be checked"
                    : `${count} payments are waiting to be checked`}
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              {count === 0
                ? "Everything paid for has been checked."
                : "Each one is somebody sitting there not knowing whether they have a court."}
            </span>
          </span>

          <span className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20">
            Open the queue
          </span>
        </Link>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <SectionCard key={section.title} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default DeskOverviewView;
