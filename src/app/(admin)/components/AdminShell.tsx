"use client";

import Link from "next/link";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import AppHeader from "@/app/components/ui/AppHeader";

type AdminShellProps = {
  children: React.ReactNode;
};

/**
 * Chrome shared by every admin page. The header itself is the shared AppHeader;
 * what the console adds is its own badge and a way back out to the public site.
 */
function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f9ff]">
      <AppHeader
        homeHref="/admin"
        badge="Admin"
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

export default AdminShell;
