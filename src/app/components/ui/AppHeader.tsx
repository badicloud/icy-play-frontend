"use client";

import Link from "next/link";
import HeaderAccountMenu from "./HeaderAccountMenu";

type AppHeaderProps = {
  /** Where the logo goes. The admin console points at its own home. */
  homeHref?: string;
  /** Optional pill beside the logo, for areas that need naming. */
  badge?: string;
  /** Anything that sits to the left of the account menu. */
  actions?: React.ReactNode;
};

/**
 * The signed-in header: logo on one side, account menu on the other. Shared so
 * the account and admin areas cannot drift apart, and so a change to one is a
 * change to both.
 */
function AppHeader({ homeHref = "/", badge, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <Link href={homeHref} className="flex items-center gap-3" aria-label="IcyPlay home">
          <img
            src="/assets/images/logo/IcyPlay%20Logo.png"
            alt="IcyPlay"
            className="h-11 w-auto object-contain"
          />
          {badge && (
            <span className="hidden rounded-full bg-[#071955] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white sm:inline">
              {badge}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          {actions}
          <HeaderAccountMenu />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
