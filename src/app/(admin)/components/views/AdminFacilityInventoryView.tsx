"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import type { FacilityInventoryItem } from "@auth/courtApi";
import { useFacilityInventory } from "@auth/hooks/useCourts";
import AdminBreadcrumbs from "../AdminBreadcrumbs";

const pageSize = 20;

/**
 * A facility is read and edited on its owner's page, where its courts, hours
 * and contract sit beside it. The anchor lands on the facility itself rather
 * than the top of a page that may list several.
 */
function facilityHref(facility: FacilityInventoryItem) {
  return `/admin/facility-owners/${facility.facilityOwnerId}#facility-${facility.id}`;
}

/**
 * Why a facility is not bookable, in the order the reader can act on. Only the
 * first reason is shown: fixing it reveals the next, and a list of four at once
 * reads as hopeless rather than as a next step.
 */
function blocker(facility: FacilityInventoryItem) {
  if (facility.maintenance) {
    return "Under maintenance";
  }

  if (facility.ownerStatus !== "Commenced") {
    return `Owner is ${facility.ownerStatus.toLowerCase()}`;
  }

  if (!facility.isActive) {
    return "Facility is inactive";
  }

  if (facility.activeCourtCount === 0) {
    return facility.courtCount === 0 ? "No courts yet" : "No active courts";
  }

  return null;
}

function BookableCell({ facility }: { facility: FacilityInventoryItem }) {
  const reason = blocker(facility);

  if (facility.isBookable) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
        Bookable
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        facility.maintenance ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
      }`}
    >
      {facility.maintenance && <BuildOutlined sx={{ fontSize: 13 }} />}
      {reason}
    </span>
  );
}

function AdminFacilityInventoryView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const inventory = useFacilityInventory({ search, page, pageSize });
  const rows = inventory.data?.data ?? [];
  const pagination = inventory.data?.pagination;
  const bookable = rows.filter((facility) => facility.isBookable).length;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <AdminBreadcrumbs
          trail={[{ label: "Platform admin", href: "/admin" }, { label: "Facility inventory" }]}
        />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Facility inventory
            </h1>
            <p className="mt-2 text-slate-500">
              Every venue on the platform, whoever owns it, and whether a customer can book it
              today.
            </p>
          </div>

          <Link
            href="/admin/courts/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            Add a court
          </Link>
        </div>

        <div className="relative mt-6">
          <SearchOutlined
            sx={{ fontSize: 20 }}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by facility, city or business"
            aria-label="Search facilities"
            className="min-h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {rows.length > 0 && (
          <p className="mt-4 text-sm text-slate-500">
            {bookable} of {rows.length} on this page can be booked right now.
          </p>
        )}

        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {inventory.isError ? (
            <p className="p-6 font-semibold text-red-700">
              We couldn&apos;t load the inventory. Please refresh the page.
            </p>
          ) : rows.length === 0 && !inventory.isPending ? (
            <div className="p-8 text-center">
              <p className="font-bold text-[#071955]">
                {search ? "No facilities match that search." : "No facilities yet."}
              </p>
              {!search && (
                <p className="mt-1 text-slate-500">
                  Facilities appear here once an owner has been onboarded.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Facility
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Owner
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Courts
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((facility) => (
                    <tr key={facility.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {facility.coverPhotoUrl ? (
                            <img
                              src={facility.coverPhotoUrl}
                              alt={facility.name}
                              className="h-12 w-16 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-400">
                              No photo
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={facilityHref(facility)}
                              className="font-bold text-[#2563EB] transition hover:text-[#071955] hover:underline"
                            >
                              {facility.name}
                            </Link>
                            <p className="text-sm text-slate-500">
                              {facility.city}, {facility.province}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/facility-owners/${facility.facilityOwnerId}`}
                          className="text-sm font-semibold text-slate-600 transition hover:text-[#071955]"
                        >
                          {facility.businessName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {facility.courtCount === 0 ? (
                          <span className="text-slate-400">None</span>
                        ) : facility.activeCourtCount === facility.courtCount ? (
                          facility.courtCount
                        ) : (
                          // Both numbers, because the gap is the interesting part.
                          `${facility.activeCourtCount} of ${facility.courtCount} active`
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <BookableCell facility={facility} />
                        {facility.maintenance && (
                          <p className="mt-1 text-sm text-slate-500">
                            {facility.maintenance.reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={facilityHref(facility)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50"
                        >
                          View &amp; edit
                          <ArrowForwardOutlined sx={{ fontSize: 15 }} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.totalItems}{" "}
              {pagination.totalItems === 1 ? "facility" : "facilities"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminFacilityInventoryView;
