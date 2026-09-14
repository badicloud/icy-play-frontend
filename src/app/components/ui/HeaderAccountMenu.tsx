"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { useIcyPlayAuth } from "@auth/contexts/IcyPlayAuthContext/useIcyPlayAuth";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** A receipt on a clipboard: the thing somebody at a desk is holding. */
function DeskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 21V5.5A1.5 1.5 0 0 1 6.5 4H16l3 3v14l-2.3-1.4-2.3 1.4-2.4-1.4L9.6 21l-2.3-1.4Z" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="m9.5 14.5 1.75 1.75L15 12.5" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 17v1.5A2.5 2.5 0 0 1 12.5 21h-6A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3h6A2.5 2.5 0 0 1 15 5.5V7" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const [first] = parts;
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getFirstName(fullName: string) {
  const [first] = fullName.trim().split(/\s+/).filter(Boolean);
  return first ?? fullName;
}

const rowStyle =
  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB]";

function MenuItem({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onSelect} className={rowStyle}>
      <span className="text-slate-400">{icon}</span>
      {label}
    </Link>
  );
}

/**
 * A heading over a run of rows.
 *
 * Only shown when the menu holds more than one kind of thing. Somebody who is
 * both an owner and a customer has "Venue desk" and "My bookings" in front of
 * them, which are not the same kind of errand; somebody who is only a customer
 * has nothing to tell apart and does not need to be told.
 */
function MenuGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 py-1.5 first:border-t-0">
      {label && (
        <p className="px-4 pt-1 pb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function HeaderAccountMenu() {
  const { user, isAuthenticated, isLoading, signOut } = useIcyPlayAuth();
  const isPlatformAdmin = Boolean(user?.roles.includes("PlatformAdmin"));
  // An owner or an attendant works a venue's desk. Without a way in from here
  // there is none: the desk is not linked from anywhere a customer can see.
  const worksADesk = Boolean(
    user?.roles.some((role) => role === "FacilityOwner" || role === "FacilityAttendant"),
  );
  // Whether this person has anywhere to go besides their own account. It is
  // what decides whether the menu needs headings at all.
  const runsSomething = isPlatformAdmin || worksADesk;
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setIsOpen(false);
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      setIsOpen(false);
      enqueueSnackbar("Signed out successfully.", { variant: "success" });
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return <div className="hidden h-12 w-40 animate-pulse rounded-full bg-slate-100 sm:block" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/sign-in"
        className="hidden rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:inline-flex"
      >
        Login / Register
      </Link>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:gap-3 sm:pr-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
          {getInitials(user.fullName)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[11px] font-medium text-slate-500">Welcome,</span>
          <span className="block max-w-[9rem] truncate text-sm font-bold text-slate-800">
            {getFirstName(user.fullName)}
          </span>
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-bold text-slate-800">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>

          {runsSomething && (
            <MenuGroup label="Manage">
              {isPlatformAdmin && (
                <MenuItem
                  href="/admin"
                  icon={<ShieldIcon />}
                  label="Platform admin"
                  onSelect={close}
                />
              )}
              {worksADesk && (
                <MenuItem
                  href="/desk"
                  icon={<DeskIcon />}
                  label="Venue desk"
                  onSelect={close}
                />
              )}
            </MenuGroup>
          )}

          <MenuGroup label={runsSomething ? "Your account" : undefined}>
            <MenuItem
              href="/bookings"
              icon={<BookingsIcon />}
              label="My bookings"
              onSelect={close}
            />
            <MenuItem
              href="/account"
              icon={<AccountIcon />}
              label="Account settings"
              onSelect={close}
            />
          </MenuGroup>

          <MenuGroup>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`${rowStyle} hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="text-slate-400">
                <LogoutIcon />
              </span>
              {isSigningOut ? "Logging out..." : "Log out"}
            </button>
          </MenuGroup>
        </div>
      )}
    </div>
  );
}

export default HeaderAccountMenu;
