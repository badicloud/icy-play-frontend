"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AddOutlined from "@mui/icons-material/AddOutlined";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import type { CourtInventoryItem } from "@auth/courtApi";
import { useCourtInventory, useFacilityInventory } from "@auth/hooks/useCourts";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";

/** Every option starts at All: the whole platform is the useful default. */
const anything = "";

function SportChips({ court }: { court: CourtInventoryItem }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {court.sports.map((sport) => (
        <span
          key={sport.sportId}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            sport.isPrimary ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-[#1257d5]"
          }`}
        >
          {sport.isPrimary && <StarOutlined sx={{ fontSize: 12 }} aria-hidden />}
          {sport.name}
          {sport.divisions > 1 && (
            <span className="font-normal opacity-70">&times;{sport.divisions}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function AdminCourtInventoryView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState(anything);
  const [facilityId, setFacilityId] = useState(anything);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(perPageOptions[0]);

  // Debounce so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // The facility list doubles as the owner list: every facility carries its
  // owner, so one read fills both menus.
  const facilities = useFacilityInventory({ pageSize: 100 });
  const allFacilities = useMemo(() => facilities.data?.data ?? [], [facilities.data]);

  const owners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const facility of allFacilities) {
      seen.set(facility.facilityOwnerId, facility.businessName);
    }
    return [...seen].sort((left, right) => left[1].localeCompare(right[1]));
  }, [allFacilities]);

  // Narrowed by owner, so the menu cannot offer a facility the owner has not got.
  const facilityOptions = useMemo(
    () =>
      allFacilities
        .filter((facility) => ownerId === anything || facility.facilityOwnerId === ownerId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [allFacilities, ownerId],
  );

  const courts = useCourtInventory({
    search,
    facilityOwnerId: ownerId || undefined,
    facilityId: facilityId || undefined,
    page,
    pageSize,
  });

  const rows = courts.data?.data ?? [];
  const pagination = courts.data?.pagination;
  const bookable = rows.reduce((total, court) => total + court.bookableUnits, 0);

  function chooseOwner(next: string) {
    setOwnerId(next);
    // A facility from the previous owner would filter everything away.
    setFacilityId(anything);
    setPage(1);
  }

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Platform admin", href: "/admin" }, { label: "Courts" }]}
        />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Courts
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Every court on the platform, whichever venue it sits in. Filter by owner or
              facility, or search for one by name.
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

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="relative">
            <SearchOutlined
              sx={{ fontSize: 20 }}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by court, facility or business"
              aria-label="Search courts"
              className="min-h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="filter-owner" className="sr-only">
              Facility owner
            </label>
            <select
              id="filter-owner"
              value={ownerId}
              onChange={(event) => chooseOwner(event.target.value)}
              className="min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            >
              <option value={anything}>All facility owners</option>
              {owners.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-facility" className="sr-only">
              Facility
            </label>
            <select
              id="filter-facility"
              value={facilityId}
              onChange={(event) => {
                setFacilityId(event.target.value);
                setPage(1);
              }}
              className="min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            >
              <option value={anything}>All facilities</option>
              {facilityOptions.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length > 0 && (
          <p className="mt-4 text-sm text-slate-500">
            {bookable} bookable {bookable === 1 ? "court" : "courts"} on this page, counting
            every division separately.
          </p>
        )}

        <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {courts.isError ? (
            <p className="p-6 font-semibold text-red-700">
              We couldn&apos;t load the courts. Please refresh the page.
            </p>
          ) : rows.length === 0 && !courts.isPending ? (
            <div className="p-8 text-center">
              <p className="font-bold text-[#071955]">
                {search || ownerId || facilityId
                  ? "No courts match that."
                  : "No courts yet."}
              </p>
              <p className="mt-1 text-slate-500">
                {search || ownerId || facilityId
                  ? "Try a wider filter."
                  : "Add one and it will appear here."}
              </p>
            </div>
          ) : (
            <ul>
              {rows.map((court) => (
                <li
                  key={court.id}
                  className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                >
                  {court.coverPhotoUrl ? (
                    <img
                      src={court.coverPhotoUrl}
                      alt={court.name}
                      className="h-14 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-400">
                      No photo
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/courts/${court.id}`}
                        className="font-bold text-[#2563EB] transition hover:text-[#071955] hover:underline"
                      >
                        {court.name}
                      </Link>
                      {!court.isActive && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                          Inactive
                        </span>
                      )}
                      {court.maintenance && (
                        <span
                          title={
                            court.maintenance.appliesToWholeFacility
                              ? "The whole facility is closed."
                              : "This court alone is closed."
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800"
                        >
                          <BuildOutlined sx={{ fontSize: 12 }} />
                          {court.maintenance.appliesToWholeFacility
                            ? "Facility closed"
                            : "Under maintenance"}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-sm text-slate-500">
                      <Link
                        href={`/admin/facility-owners/${court.facilityOwnerId}#facility-${court.facilityId}`}
                        className="font-semibold transition hover:text-[#071955]"
                      >
                        {court.facilityName}
                      </Link>
                      {" · "}
                      {court.businessName}
                      {" · "}
                      {court.city}, {court.province}
                    </p>

                    <div className="mt-1.5">
                      <SportChips court={court} />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-[#071955]">{court.bookableUnits}</p>
                    <p className="text-xs text-slate-400">
                      {court.bookableUnits === 1 ? "court" : "courts"}
                    </p>
                  </div>

                  <Link
                    href={`/admin/courts/${court.id}`}
                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-[#164eaa] transition hover:bg-slate-50"
                  >
                    View &amp; edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pagination && (
          <Pager
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            noun={{ one: "court", many: "courts" }}
            label="Court pages"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </main>
  );
}

export default AdminCourtInventoryView;
