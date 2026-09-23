"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { deskReportGroups } from "./reports";

/**
 * Moving between reports without going back out to the desk.
 *
 * A side menu here rather than in DeskShell, which deliberately has none: the
 * desk's pages are separate jobs and a breadcrumb says where you are. Reports
 * are siblings somebody reads one after another — "utilisation looks bad, when
 * are we actually busy" — and sending them back through the landing page each
 * time would be three clicks for a question that is one.
 *
 * The unbuilt ones stay on the list, greyed. A menu that showed only what
 * works would have one item on it and say nothing about what is coming.
 */
function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Reports" className="lg:sticky lg:top-6">
      {deskReportGroups.map((group, index) => (
        <div key={group.id} className={index > 0 ? "mt-5" : undefined}>
          <p className="px-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
            {group.title}
          </p>

          <ul className="mt-2 space-y-0.5">
            {group.reports.map((report) => {
              const active = report.href ? pathname.startsWith(report.href) : false;

              if (!report.href) {
                return (
                  <li key={report.id}>
                    <span
                      className="flex cursor-default items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-slate-500"
                      title="Not built yet"
                    >
                      <span className="truncate">{report.title}</span>
                      <LockOutlined
                        sx={{ fontSize: 16 }}
                        className="shrink-0"
                        aria-label="not built yet"
                      />
                    </span>
                  </li>
                );
              }

              return (
                <li key={report.id}>
                  <Link
                    href={report.href}
                    aria-current={active ? "page" : undefined}
                    className={`block truncate rounded-xl px-3 py-2.5 text-base font-semibold transition ${
                      active
                        ? "bg-[#1264f7] text-white"
                        : "text-slate-700 hover:bg-white hover:text-[#071955]"
                    }`}
                  >
                    {report.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <Link
        href="/desk"
        className="mt-6 block rounded-xl px-3 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-white hover:text-[#071955]"
      >
        ← Back to the desk
      </Link>
    </nav>
  );
}

export default ReportsNav;
