"use client";

import Link from "next/link";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import AppHeader from "@/app/components/ui/AppHeader";

type DeskShellProps = {
  children: React.ReactNode;
};

/**
 * Chrome shared by every desk page, the same as AdminShell is for the console:
 * the shared header, its own badge, and a way back out to the public site.
 *
 * No navigation bar of its own. Each page states where it sits with a
 * breadcrumb trail, the way the admin pages do — a second pattern for the same
 * job would leave the two consoles looking like two products.
 */
function DeskShell({ children }: DeskShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f9ff]">
      <AppHeader
        homeHref="/desk"
        badge="Venue desk"
        actions={
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:shadow-sm sm:inline-flex"
          >
            View site
            <OpenInNewOutlined sx={{ fontSize: 15 }} />
          </Link>
        }
      />

      {children}
    </div>
  );
}

export default DeskShell;
