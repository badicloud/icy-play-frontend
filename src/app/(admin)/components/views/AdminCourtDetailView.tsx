"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSnackbar } from "notistack";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import { ApiError } from "@/services/api";
import type { Court } from "@auth/courtApi";
import { useCourt, useLiftMaintenance } from "@auth/hooks/useCourts";
import AdminBreadcrumbs from "../AdminBreadcrumbs";
import BookableCourtsPanel from "../courts/BookableCourtsPanel";
import CourtDivisionsPanel from "../courts/CourtDivisionsPanel";
import CourtPricingPanel from "../courts/CourtPricingPanel";
import MaintenanceDialog, { type MaintenanceTarget } from "../courts/MaintenanceDialog";
import CourtEditDialog from "../edit/CourtEditDialog";
import { dayNames } from "../onboarding/draft";

function Blank() {
  return <span className="text-slate-400">Not recorded</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right font-semibold text-[#071955]">{value}</span>
    </div>
  );
}

const tabs = [
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "bookings", label: "Bookings" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/**
 * What a tab shows when the thing it is for has not been built. Saying so
 * plainly beats an empty panel: an admin who finds nothing cannot tell whether
 * the feature is missing or their court is.
 */
function NotBuiltYet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-bold text-[#071955]">{title}</h2>
      <div className="mx-auto mt-2 max-w-xl text-slate-500">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Why this court cannot be booked, in the order the reader can act on it. Only
 * the first is shown: fixing it reveals the next, and a list of three at once
 * reads as hopeless rather than as a next step.
 */
function blocker(court: Court) {
  if (court.maintenance) {
    return court.maintenance.appliesToWholeFacility
      ? "The whole facility is closed"
      : "Under maintenance";
  }

  if (!court.isActive) {
    return "Taken off the booking portal";
  }

  if (court.operatingHours.every((hour) => hour.opensAt === null)) {
    return "Closed every day";
  }

  return null;
}

function AdminCourtDetailView({ courtId }: { courtId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const query = useCourt(courtId);
  const court = query.data;
  const lift = useLiftMaintenance(court?.facilityId ?? "");
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<MaintenanceTarget | null>(null);
  const [tab, setTab] = useState<TabId>("details");

  async function handleLift() {
    if (!court?.maintenance) {
      return;
    }

    try {
      await lift.mutateAsync(court.maintenance.periodId);
      enqueueSnackbar(`${court.name} is open again.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : "That did not work. Please try again.",
        { variant: "error" },
      );
    }
  }

  if (query.isError) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <p className="font-semibold text-red-700">
          We couldn&apos;t load this court. It may have been removed.
        </p>
      </main>
    );
  }

  if (query.isPending || !court) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <p className="text-slate-500">Loading the court…</p>
      </main>
    );
  }

  const closure = court.maintenance;
  const cover = court.photos.find((photo) => photo.isCover) ?? court.photos[0];
  const reason = blocker(court);
  const openDays = court.operatingHours.filter((hour) => hour.opensAt !== null);

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <AdminBreadcrumbs
          trail={[
            { label: "Platform admin", href: "/admin" },
            { label: "Facility inventory", href: "/admin/facility-inventory" },
            {
              label: court.facilityName,
              href: `/admin/facility-owners/${court.facilityOwnerId}#facility-${court.facilityId}`,
            },
            { label: court.name },
          ]}
        />

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {court.name}
            </h1>
            <p className="mt-2 text-slate-500">
              In{" "}
              <Link
                href={`/admin/facility-owners/${court.facilityOwnerId}#facility-${court.facilityId}`}
                className="font-semibold text-[#2563EB] transition hover:text-[#071955] hover:underline"
              >
                {court.facilityName}
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!closure && (
              <button
                type="button"
                onClick={() =>
                  setTarget({
                    facilityId: court.facilityId,
                    courtId: court.id,
                    name: court.name,
                    courtCount: 1,
                  })
                }
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
              >
                Set maintenance
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <EditOutlined sx={{ fontSize: 18 }} />
              Edit this court
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {reason ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                closure ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
              }`}
            >
              {closure && <BuildOutlined sx={{ fontSize: 14 }} />}
              {reason}
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
              Bookable
            </span>
          )}

          {court.sports.map((sport) => (
            <span
              key={sport.sportId}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                sport.isPrimary ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-[#1257d5]"
              }`}
            >
              {sport.isPrimary && <StarOutlined sx={{ fontSize: 13 }} aria-hidden />}
              {sport.name}
              {sport.divisions > 1 && (
                <span className="font-normal opacity-70">&times;{sport.divisions}</span>
              )}
            </span>
          ))}
        </div>

        {closure && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">
              &ldquo;{closure.reason}&rdquo;
            </p>
            <p className="mt-1 text-sm text-amber-800">
              From {format(new Date(closure.startsAt), "d MMM yyyy")}
              {closure.endsAt
                ? ` until ${format(new Date(closure.endsAt), "d MMM yyyy")}`
                : ", until further notice"}
            </p>
            <div className="mt-3">
              {closure.appliesToWholeFacility ? (
                // Saying which level is the point: the button that would lift
                // this one is not on this page.
                <p className="text-sm text-amber-800">
                  Set on the whole facility, so it is reopened from{" "}
                  <Link
                    href={`/admin/facility-owners/${court.facilityOwnerId}#facility-${court.facilityId}`}
                    className="font-bold underline"
                  >
                    {court.facilityName}
                  </Link>
                  .
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLift()}
                  disabled={lift.isPending}
                  className="text-sm font-bold text-green-700 transition hover:text-green-900 disabled:cursor-wait disabled:text-slate-400"
                >
                  End maintenance
                </button>
              )}
            </div>
          </div>
        )}

        {court.description && (
          <p className="mt-5 whitespace-pre-line text-slate-600">{court.description}</p>
        )}

        <div className="mt-8 border-b border-slate-200">
          <div role="tablist" aria-label="Court sections" className="-mb-px flex gap-1">
            {tabs.map((entry) => {
              const selected = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  id={`court-tab-${entry.id}`}
                  aria-selected={selected}
                  aria-controls={`court-panel-${entry.id}`}
                  onClick={() => setTab(entry.id)}
                  className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
                    selected
                      ? "border-[#2563EB] text-[#2563EB]"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-[#071955]"
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id="court-panel-details"
          aria-labelledby="court-tab-details"
          hidden={tab !== "details"}
          className="mt-6 grid gap-5 lg:grid-cols-2"
        >
          <Panel title="The space">
            <Row label="Venue type" value={court.venueType} />
            <Row label="Surface" value={court.surface ?? <Blank />} />
            <Row
              label="Lighting"
              value={
                court.hasLighting ? (
                  <span className="inline-flex items-center gap-1">
                    <LightbulbOutlined sx={{ fontSize: 15 }} />
                    Lit for evening play
                  </span>
                ) : (
                  "No"
                )
              }
            />
            <Row label="Size" value={court.sizeLabel ?? <Blank />} />
            <Row label="Capacity" value={court.capacity ?? <Blank />} />
            <Row label="Equipment" value={court.equipment ?? <Blank />} />
            <Row label="Display order" value={court.displayOrder} />
          </Panel>

          <Panel title="Booking rules">
            <Row label="Slot length" value={`${court.slotLengthMinutes} minutes`} />
            <Row
              label="Minimum booking"
              value={`${court.minimumDurationMinutes} minutes (${
                court.minimumDurationMinutes / court.slotLengthMinutes
              } ${court.minimumDurationMinutes === court.slotLengthMinutes ? "slot" : "slots"})`}
            />
            <Row
              label="Buffer between bookings"
              value={court.bufferMinutes === 0 ? "None" : `${court.bufferMinutes} minutes`}
            />
            <Row
              label="On the booking portal"
              value={court.isActive ? "Yes" : "No"}
            />
            <Row label="Added" value={format(new Date(court.createdAt), "d MMM yyyy")} />
          </Panel>

          <div className="lg:col-span-2">
            <CourtDivisionsPanel key={court.id} court={court} />
          </div>

          <div className="lg:col-span-2">
            <BookableCourtsPanel key={court.id} court={court} />
          </div>

          <div className="lg:col-span-2">
            <Panel title="Opening hours">
              <p className="mb-1 text-sm text-slate-500">
                {court.usesFacilityHours
                  ? `Follows ${court.facilityName}, so changing the facility changes this too.`
                  : "This court keeps its own hours."}
                {" · "}
                {openDays.length === 0
                  ? "closed every day"
                  : `open ${openDays.length} ${openDays.length === 1 ? "day" : "days"} a week`}
              </p>
              {court.operatingHours.map((hour) => (
                <Row
                  key={hour.dayOfWeek}
                  label={dayNames[hour.dayOfWeek]}
                  value={
                    hour.opensAt === null
                      ? "Closed"
                      : `${hour.opensAt.slice(0, 5)} – ${hour.closesAt?.slice(0, 5)}`
                  }
                />
              ))}
            </Panel>
          </div>

          <div className="lg:col-span-2">
            <Panel title={`Photos${court.photos.length > 0 ? ` (${court.photos.length})` : ""}`}>
              {court.photos.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No photos yet, so the booking list has nothing to show for this court.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {court.photos.map((photo) => (
                    <li
                      key={photo.id}
                      className={`overflow-hidden rounded-xl border bg-white ${
                        photo.isCover ? "border-[#2563EB] ring-2 ring-blue-200" : "border-slate-200"
                      }`}
                    >
                      <a
                        href={photo.secureUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open the full picture"
                      >
                        <img
                          src={photo.secureUrl}
                          alt={photo.caption ?? court.name}
                          className="h-28 w-full object-cover transition hover:opacity-90"
                        />
                      </a>
                      {(photo.isCover || photo.caption) && (
                        <div className="px-2.5 py-1.5">
                          {photo.isCover ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                              <StarOutlined sx={{ fontSize: 13 }} aria-hidden />
                              Primary
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{photo.caption}</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {cover && (
            <p className="text-sm text-slate-400 lg:col-span-2">
              The picture marked Primary is the one customers see first.
            </p>
          )}
        </div>

        <div
          role="tabpanel"
          id="court-panel-pricing"
          aria-labelledby="court-tab-pricing"
          hidden={tab !== "pricing"}
          className="mt-6"
        >
          <CourtPricingPanel key={court.id} court={court} />
        </div>

        <div
          role="tabpanel"
          id="court-panel-bookings"
          aria-labelledby="court-tab-bookings"
          hidden={tab !== "bookings"}
          className="mt-6"
        >
          <NotBuiltYet title="Bookings are not open yet">
            <p>
              Once customers can book, this is where the bookings on this court
              appear — and where you would check who to tell before closing it for
              maintenance.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              This court runs {court.slotLengthMinutes}-minute slots with a{" "}
              {court.minimumDurationMinutes}-minute minimum
              {court.bufferMinutes > 0
                ? ` and a ${court.bufferMinutes}-minute buffer between bookings.`
                : "."}
            </p>
          </NotBuiltYet>
        </div>
      </div>

      {/* Keyed on the court so a reopened dialog starts from what is saved,
          rather than from whatever was typed and abandoned last time. */}
      <CourtEditDialog
        key={`${court.id}-${editing}`}
        court={court}
        open={editing}
        onClose={() => setEditing(false)}
      />
      <MaintenanceDialog target={target} onClose={() => setTarget(null)} />
    </main>
  );
}

export default AdminCourtDetailView;
