"use client";

import Link from "next/link";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ApartmentOutlined from "@mui/icons-material/ApartmentOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import SportsBasketballOutlined from "@mui/icons-material/SportsBasketballOutlined";
import SportsTennisOutlined from "@mui/icons-material/SportsTennisOutlined";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

type AdminSection = {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
};

type AdminGroup = {
  title: string;
  description: string;
  sections: AdminSection[];
};

/**
 * Grouped by what the reader came to do, not by when each page was built. A
 * flat list of seven makes the admin read all seven to find the one they want;
 * a heading lets them skip five.
 *
 * Onboarding is missing from these on purpose: it is an action rather than a
 * place, so it sits in the header as a button.
 */
const groups: AdminGroup[] = [
  {
    title: "Owners and venues",
    description: "Who is on the platform, and what they have put on it.",
    sections: [
      {
        title: "Facility owners",
        description:
          "Everyone you have onboarded, their contract status, and who is live right now.",
        href: "/admin/facility-owners",
        icon: <GroupsOutlined />,
      },
      {
        title: "Facility inventory",
        description: "Every venue, with its owner and whether a customer can book it today.",
        href: "/admin/facility-inventory",
        icon: <ApartmentOutlined />,
      },
      {
        title: "Courts",
        description:
          "Every court on the platform, whichever venue it sits in. Filter by owner or facility.",
        href: "/admin/courts",
        icon: <SportsTennisOutlined />,
      },
    ],
  },
  {
    title: "What courts are booked for",
    description: "The lists every venue draws on when it sets a court up and prices it.",
    sections: [
      {
        title: "Sports and events",
        description:
          "The games a court is played for and the occasions it is hired for, and what customers filter on.",
        href: "/admin/sports",
        icon: <SportsBasketballOutlined />,
      },
      {
        title: "Holidays",
        description:
          "The days courts charge a holiday rate on. The movable ones need adding each year.",
        href: "/admin/holidays",
        icon: <EventOutlined />,
      },
    ],
  },
  {
    title: "Accounts",
    description: "Everyone with a sign-in, whatever they use it for.",
    sections: [
      {
        title: "Users",
        description:
          "Every account on the platform, with its roles and verification state. Read only.",
        href: "/admin/users",
        icon: <PeopleAltOutlined />,
      },
    ],
  },
];

function SectionCard({ section }: { section: AdminSection }) {
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

  const className =
    "flex h-full items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm";

  return section.href ? (
    <Link
      href={section.href}
      className={`${className} transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg`}
    >
      {content}
    </Link>
  ) : (
    <div className={`${className} opacity-70`}>{content}</div>
  );
}

function AdminDashboardView() {
  const { user } = useIcyPlayAuth();

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Platform admin
              </h1>
              <span className="rounded-full bg-[#071955] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white">
                Platform admin
              </span>
            </div>
            <p className="mt-2 text-slate-500">
              Signed in as {user?.email}. Everything here affects the whole platform.
            </p>
          </div>

          {/* The one thing an admin comes here to start rather than to read. */}
          <Link
            href="/admin/facility-owners/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            Onboard a facility owner
          </Link>
        </div>

        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                {group.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{group.description}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {group.sections.map((section) => (
                  <SectionCard key={section.title} section={section} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

export default AdminDashboardView;
