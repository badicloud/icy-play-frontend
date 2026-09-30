"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getOpenPlays } from "@auth/openPlayApi";
import { OpenPlayTeaser } from "./OpenPlayCard";

/**
 * A few open plays with a date coming up, and the way to the rest. On the
 * landing page for every venue; on a venue's page for that venue only.
 *
 * Renders nothing when there are none: an empty "open play" section on a
 * venue that does not run any reads as something broken.
 */
function OpenPlayHighlights({
  facilityId,
  heading,
  shown = 3,
}: {
  facilityId?: string;
  heading: React.ReactNode;
  shown?: number;
}) {
  const openPlays = useQuery({
    queryKey: ["catalog", "open-plays"],
    queryFn: () => getOpenPlays(),
    staleTime: 60 * 1000,
  });

  const rows = (openPlays.data ?? []).filter(
    (row) => facilityId === undefined || row.facilityId === facilityId,
  );

  if (rows.length === 0) {
    return null;
  }

  const allHref = facilityId === undefined ? "/open-play" : `/open-play?facility=${facilityId}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        {heading}
        <Link
          href={allHref}
          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-[#2563EB]"
        >
          See all {rows.length} open {rows.length === 1 ? "play" : "plays"}
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, shown).map((openPlay) => (
          <OpenPlayTeaser key={openPlay.openPlayId} openPlay={openPlay} />
        ))}
      </div>
    </div>
  );
}

export default OpenPlayHighlights;
