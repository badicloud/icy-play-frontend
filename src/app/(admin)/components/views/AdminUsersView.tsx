"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { roleLabels, type AdminUser } from "@auth/adminApi";
import { useAdminUsers } from "@auth/hooks/useAdminUsers";

const pageSize = 20;

const roleFilters = [
  { value: "", label: "All roles" },
  { value: "Customer", label: "Customers" },
  { value: "FacilityOwner", label: "Facility owners" },
  { value: "PlatformAdmin", label: "Platform admins" },
];

function RoleBadges({ roles }: { roles: string[] }) {
  if (roles.length === 0) {
    return <span className="text-sm text-slate-400">No role</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <span
          key={role}
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            role === "PlatformAdmin"
              ? "bg-[#071955] text-white"
              : role === "FacilityOwner"
                ? "bg-blue-100 text-[#164eaa]"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {roleLabels[role] ?? role}
        </span>
      ))}
    </span>
  );
}

function StatusCell({ user }: { user: AdminUser }) {
  if (!user.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
        <ErrorOutlineOutlined sx={{ fontSize: 16 }} />
        Inactive
      </span>
    );
  }

  if (!user.isEmailVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
        <ErrorOutlineOutlined sx={{ fontSize: 16 }} />
        Unverified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
      <CheckCircleOutlined sx={{ fontSize: 16 }} />
      Verified
    </span>
  );
}

function AdminUsersView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  // Debounce so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const users = useAdminUsers({ search, role, page, pageSize });
  const rows = users.data?.data ?? [];
  const pagination = users.data?.pagination;

  return (
    <main className="min-h-screen bg-[#f5f9ff] text-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <Link
          href="/admin"
          className="text-sm font-semibold text-[#2563EB] transition hover:text-[#071955]"
        >
          &larr; Platform admin
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Users</h1>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
            Read only
          </span>
        </div>
        <p className="mt-2 text-slate-500">
          Every account on the platform. Nothing on this page changes an account.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchOutlined
              sx={{ fontSize: 20 }}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by email or name"
              aria-label="Search users"
              className="min-h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className="min-h-13 rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 sm:w-56"
          >
            {roleFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {users.isError ? (
            <p className="p-6 font-semibold text-red-700">
              We couldn&apos;t load the users. Please refresh the page.
            </p>
          ) : rows.length === 0 && !users.isPending ? (
            <p className="p-6 text-slate-500">No users match that search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      User
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Roles
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#071955]">{user.fullName}</p>
                        <p className="break-all text-sm text-slate-500">{user.email}</p>
                        {user.phoneNumber && (
                          <p className="text-sm text-slate-400">{user.phoneNumber}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadges roles={user.roles} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusCell user={user} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {format(new Date(user.createdAt), "d MMM yyyy")}
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
              {pagination.totalItems === 1 ? "user" : "users"}
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

export default AdminUsersView;
