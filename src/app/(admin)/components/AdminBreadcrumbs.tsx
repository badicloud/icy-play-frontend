"use client";

import Link from "next/link";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";

export type Crumb = {
  label: string;
  /** Omitted on the last crumb: the page you are already on is not a link. */
  href?: string;
};

type AdminBreadcrumbsProps = {
  trail: Crumb[];
};

/**
 * Each page states its own trail rather than having one derived from the URL.
 * A derived trail would render "/admin/facility-owners/3f2a91c4-..." as a crumb
 * reading 3f2a91c4, which tells the reader nothing.
 *
 * Fuse ships a PageBreadcrumb, but it resolves titles from the Fuse navigation
 * config, and the admin console is not in it.
 */
function AdminBreadcrumbs({ trail }: AdminBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;

          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRightOutlined
                  sx={{ fontSize: 16 }}
                  className="text-slate-300"
                  aria-hidden
                />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="font-semibold text-[#2563EB] transition hover:text-[#071955]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-slate-500"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default AdminBreadcrumbs;
