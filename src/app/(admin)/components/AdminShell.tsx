"use client";

import Link from "next/link";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import HeaderAccountMenu from "@/app/components/ui/HeaderAccountMenu";

type AdminShellProps = {
  children: React.ReactNode;
};

/**
 * Chrome shared by every admin page, so the account menu and the way out of the
 * console live in one place rather than being repeated per view.
 */
function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f9ff]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3" aria-label="Platform admin home">
            <img
              src="/assets/images/logo/IcyPlay%20Logo.png"
              alt="IcyPlay"
              className="h-11 w-auto object-contain"
            />
            <span className="hidden rounded-full bg-[#071955] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white sm:inline">
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:shadow-sm sm:inline-flex"
            >
              View site
              <OpenInNewOutlined sx={{ fontSize: 15 }} />
            </Link>

            <HeaderAccountMenu />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

export default AdminShell;
