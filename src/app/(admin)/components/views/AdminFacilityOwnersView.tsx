"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import AddOutlined from "@mui/icons-material/AddOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  facilityOwnerStatusLabels,
  type AdminFacilityOwner,
  type FacilityOwnerStatus,
} from "@auth/adminApi";
import { useAdminFacilityOwners } from "@auth/hooks/useAdminFacilityOwners";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager, { perPageOptions } from "@/app/components/ui/Pager";

const statusFilters = [
  { value: "", label: "All statuses" },
  { value: "Commenced", label: "Commenced" },
  { value: "Pending", label: "Pending" },
  { value: "Expired", label: "Expired" },
  { value: "Suspended", label: "Suspended" },
];

const statusStyles: Record<FacilityOwnerStatus, string> = {
  Commenced: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Expired: "bg-slate-200 text-slate-600",
  Suspended: "bg-red-100 text-red-700",
};

/**
 * The status is not a column anyone sets; it falls out of the contract dates.
 * Saying so on the row is what stops someone asking where the dropdown is.
 */
const statusHints: Record<FacilityOwnerStatus, string> = {
  Commenced: "A contract covers today. Bookable.",
  Pending: "Encoded. No contract covers today yet.",
  Expired: "The last contract has run out.",
  Suspended: "Switched off, whatever the contract says.",
};

function StatusBadge({ status }: { status: FacilityOwnerStatus }) {
  return (
    <span
      title={statusHints[status]}
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusStyles[status]}`}
    >
      {facilityOwnerStatusLabels[status] ?? status}
    </span>
  );
}

function ContractCell({ owner }: { owner: AdminFacilityOwner }) {
  if (!owner.contractStartDate || !owner.contractEndDate) {
    return <span className="text-sm text-slate-400">No contract</span>;
  }

  return (
    <span className="text-sm text-slate-500">
      {format(new Date(owner.contractStartDate), "d MMM yyyy")}
      {" – "}
      {format(new Date(owner.contractEndDate), "d MMM yyyy")}
    </span>
  );
}

function AdminFacilityOwnersView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
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

  const owners = useAdminFacilityOwners({ search, status, page, pageSize });
  const rows = owners.data?.data ?? [];
  const pagination = owners.data?.pagination;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[{ label: "Platform admin", href: "/admin" }, { label: "Facility owners" }]}
        />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Facility owners
            </h1>
            <p className="mt-2 text-slate-500">
              Everyone the platform team has encoded. Owners do not sign themselves up.
            </p>
          </div>

          <Link
            href="/admin/facility-owners/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <AddOutlined sx={{ fontSize: 18 }} />
            Onboard an owner
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchOutlined
              sx={{ fontSize: 20 }}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by business, owner or email"
              aria-label="Search facility owners"
              className="min-h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="min-h-13 rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 sm:w-56"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {owners.isError ? (
            <p className="p-6 font-semibold text-red-700">
              We couldn&apos;t load the facility owners. Please refresh the page.
            </p>
          ) : rows.length === 0 && !owners.isPending ? (
            <div className="p-8 text-center">
              <p className="font-bold text-[#071955]">
                {search || status ? "No owners match that search." : "No facility owners yet."}
              </p>
              {!search && !status && (
                <p className="mt-1 text-slate-500">
                  Owners appear here once the platform team encodes them.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Business
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Contract
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Facilities
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Onboarded
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((owner) => (
                    <tr key={owner.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/facility-owners/${owner.id}`}
                          className="font-bold text-[#2563EB] transition hover:text-[#071955] hover:underline"
                        >
                          {owner.businessName}
                        </Link>
                        <p className="text-sm text-slate-500">{owner.ownerName}</p>
                        <p className="break-all text-sm text-slate-400">{owner.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={owner.status} />
                      </td>
                      <td className="px-5 py-4">
                        <ContractCell owner={owner} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {owner.facilityCount}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {format(new Date(owner.createdAt), "d MMM yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {pagination && (
          <Pager
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            noun={{ one: "owner", many: "owners" }}
            label="Owner pages"
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

export default AdminFacilityOwnersView;
