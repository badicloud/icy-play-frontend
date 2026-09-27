"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * Who is reading a report, and so which of it they see.
 *
 * The desk's reports are the platform admin's reports too — the same pages,
 * the same figures. What differs is who decides which venues: at the desk it
 * is the venues that person works, and the page offers a venue picker; in the
 * admin console it is a facility owner and a venue, picked here and kept in
 * the address, so moving from one report to the next keeps them.
 */

export type ReportScope =
  | { kind: "desk" }
  | {
      kind: "admin";
      ownerId: string;
      facilityId: string;
      /** "?owner=…&venue=…", or empty: what the menu's links carry. */
      search: string;
      setScope: (ownerId: string, facilityId: string) => void;
    };

const ReportScopeContext = createContext<ReportScope>({ kind: "desk" });

export function useReportScope() {
  return useContext(ReportScopeContext);
}

/**
 * The admin's scope, read from and written to the address. Wraps the admin
 * reports layout; everything under the desk's layout sees the default.
 */
export function AdminReportScope({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const ownerId = params.get("owner") ?? "";
  const facilityId = params.get("venue") ?? "";

  const query = new URLSearchParams();
  if (ownerId) query.set("owner", ownerId);
  if (facilityId) query.set("venue", facilityId);
  const search = query.size > 0 ? `?${query.toString()}` : "";

  function setScope(nextOwner: string, nextVenue: string) {
    const next = new URLSearchParams();
    if (nextOwner) next.set("owner", nextOwner);
    if (nextVenue) next.set("venue", nextVenue);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  return (
    <ReportScopeContext.Provider value={{ kind: "admin", ownerId, facilityId, search, setScope }}>
      {children}
    </ReportScopeContext.Provider>
  );
}

/** Another report, in the same console and scope: "unsold" → its address there. */
export function reportHref(scope: ReportScope, path: string) {
  return scope.kind === "admin" ? `/admin/reports/${path}${scope.search}` : `/desk/reports/${path}`;
}

/** The breadcrumb for a report, back to the right console's reports. */
export function reportTrail(scope: ReportScope, title: string) {
  return scope.kind === "admin"
    ? [
        { label: "Admin", href: "/admin" },
        { label: "Reports", href: `/admin/reports${scope.search}` },
        { label: title },
      ]
    : [{ label: "Venue desk", href: "/desk" }, { label: "Reports", href: "/desk/reports" }, { label: title }];
}
