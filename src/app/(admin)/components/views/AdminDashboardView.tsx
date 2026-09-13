"use client";

import Link from "next/link";
import ApartmentOutlined from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import SportsBasketballOutlined from "@mui/icons-material/SportsBasketballOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

type AdminSection = {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
};

/**
 * The areas the platform team works in. Each gains an href as it is
 * built; until then it is listed but not walkable, so the shape of the console
 * is visible without pretending a page exists.
 */
const sections: AdminSection[] = [
  {
    title: "Users",
    description:
      "Every account on the platform, with its roles and verification state. Read only.",
    href: "/admin/users",
    icon: <PeopleAltOutlined />,
  },
  {
    title: "Facility owner onboarding",
    description:
      "Encode a new facility owner: business details, permits, and the contract that commences them.",
    href: "/admin/facility-owners/new",
    icon: <BadgeOutlined />,
  },
  {
    title: "Facility owners",
    description:
      "Everyone you have onboarded, their contract status, and who is live right now.",
    href: "/admin/facility-owners",
    icon: <GroupsOutlined />,
  },
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
  {
    title: "Facility inventory",
    description:
      "Every facility and court on the platform, with its owner and booking status.",
    href: "/admin/facility-inventory",
    icon: <ApartmentOutlined />,
  },
];

function AdminDashboardView() {
  const { user } = useIcyPlayAuth();

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => {
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
                key={section.title}
                href={section.href}
                className={`${className} transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg`}
              >
                {content}
              </Link>
            ) : (
              <div key={section.title} className={`${className} opacity-70`}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default AdminDashboardView;
