"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import PhotoCarousel, { type CarouselPhoto } from "./PhotoCarousel";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";
import {
  activityIcon,
  directionsUrl,
  formatAddress,
  formatTime,
  getCatalogCourt,
  maintenanceMessage,
  peakDays,
  type CatalogCourtDetail,
} from "@auth/catalogApi";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * A group of details, shut by default unless it is the one most readers came
 * for. A page that opens everything at once is a wall; one that opens nothing
 * makes the reader work for the obvious.
 */
function Group({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
        >
          <span>
            <span className="block text-lg font-bold text-slate-950">{title}</span>
            {summary && <span className="mt-0.5 block text-sm text-slate-500">{summary}</span>}
          </span>
          <ExpandMoreOutlined
            sx={{ fontSize: 24 }}
            className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </h2>

      <div hidden={!open} className="border-t border-slate-100 px-6 py-5">
        {children}
      </div>
    </section>
  );
}

function PriceRow({
  label,
  amount,
  note,
}: {
  label: string;
  amount: number;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2.5 first:border-t-0 first:pt-0">
      <dt className="text-sm text-slate-600">
        {label}
        {note && <span className="mt-0.5 block text-sm font-semibold text-amber-700">{note}</span>}
      </dt>
      <dd className="text-base font-bold text-[#071955]">
        {peso(amount)}
        <span className="text-sm font-semibold text-slate-500">/hr</span>
      </dd>
    </div>
  );
}

function Details({ detail }: { detail: CatalogCourtDetail }) {
  const { court, venue } = detail;
  const address = formatAddress(court);
  const icon = activityIcon(court.sportKey);
  const standard = court.standardHourlyRate;
  const hasPeakWindow = court.peakStartsAt !== null && court.peakEndsAt !== null;
  const openDays = venue.operatingHours.filter((hour) => hour.opensAt !== null);
  const closure = maintenanceMessage(court);

  const photos: CarouselPhoto[] = [
    ...detail.courtPhotos.map((photo) => ({
      id: photo.id,
      secureUrl: photo.secureUrl,
      caption: photo.caption,
      source: "This court",
    })),
    ...venue.photos.map((photo) => ({
      id: photo.id,
      secureUrl: photo.secureUrl,
      caption: photo.caption,
      source: court.facilityName,
    })),
  ];

  const space = [
    { label: "Venue type", value: court.venueType },
    { label: "Surface", value: court.surface },
    { label: "Lighting", value: court.hasLighting ? "Lit for evening play" : "None" },
    { label: "Size", value: detail.sizeLabel },
    { label: "Capacity", value: detail.capacity === null ? null : String(detail.capacity) },
    { label: "Equipment provided", value: detail.equipment },
  ].filter((row) => row.value !== null && row.value !== "");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicHeader />

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <Link
          href="/#courts"
          className="text-sm font-semibold text-[#2563EB] transition hover:text-[#071955]"
        >
          &larr; Back to courts
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#071955] shadow-sm">
            {icon && <img src={icon} alt="" className="h-4 w-4 object-contain" aria-hidden />}
            {court.sportName}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{court.name}</h1>
        <p className="mt-1 text-lg font-semibold text-slate-600">{court.facilityName}</p>
        <p className="mt-1 text-slate-500">{address}</p>
        <a
          href={directionsUrl(court)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm font-semibold text-[#2563EB] transition hover:text-[#071955]"
        >
          View on Google Maps
        </a>

        {closure && (
          <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <p className="text-lg font-bold text-amber-900">{closure.title}</p>
            <p className="mt-1 text-amber-800">{closure.detail}</p>
            <Link
              href="/#courts"
              className="mt-3 inline-block text-sm font-bold text-amber-900 underline-offset-4 hover:underline"
            >
              See what else is available
            </Link>
          </div>
        )}

        <div className="mt-6">
          <PhotoCarousel photos={photos} alt={court.name} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
          <div className="space-y-4">
            <Group
              title="The court"
              summary={`${court.venueType} · ${court.slotLengthMinutes}-minute slots`}
              defaultOpen
            >
              {detail.courtDescription && (
                <p className="mb-4 whitespace-pre-line text-slate-600">
                  {detail.courtDescription}
                </p>
              )}
              <dl className="space-y-2">
                {space.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <dt className="text-slate-500">{row.label}</dt>
                    <dd className="text-right font-semibold text-[#071955]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Group>

            <Group
              title="Opening hours"
              summary={
                openDays.length === 0
                  ? "Closed every day"
                  : `Open ${openDays.length} ${openDays.length === 1 ? "day" : "days"} a week`
              }
              defaultOpen
            >
              <dl className="space-y-2">
                {venue.operatingHours.map((hour) => (
                  <div key={hour.dayOfWeek} className="flex justify-between gap-4 text-sm">
                    <dt className="text-slate-500">{dayNames[hour.dayOfWeek]}</dt>
                    <dd className="font-semibold text-[#071955]">
                      {hour.opensAt === null
                        ? "Closed"
                        : `${formatTime(hour.opensAt)} – ${formatTime(hour.closesAt)}`}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-slate-400">Times are local to {venue.timeZone}.</p>
            </Group>

            <Group
              title="Amenities"
              summary={
                venue.amenities.length === 0
                  ? "None listed"
                  : `${venue.amenities.length} at this venue`
              }
            >
              {venue.amenities.length === 0 ? (
                <p className="text-slate-500">This venue has not listed any amenities yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#1257d5]"
                    >
                      {amenity}
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <Group
              title="House rules and safety"
              summary={
                venue.houseRules || venue.safetyMeasures
                  ? "What the venue asks of you"
                  : "Nothing recorded"
              }
            >
              {venue.houseRules && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
                    House rules
                  </h3>
                  <p className="mt-1.5 whitespace-pre-line text-slate-600">{venue.houseRules}</p>
                </div>
              )}

              {venue.safetyMeasures && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
                    Safety measures
                  </h3>
                  <p className="mt-1.5 whitespace-pre-line text-slate-600">
                    {venue.safetyMeasures}
                  </p>
                </div>
              )}

              {!venue.houseRules && !venue.safetyMeasures && (
                <p className="text-slate-500">This venue has not recorded any yet.</p>
              )}
            </Group>

            <Group
              title="About the venue"
              summary={venue.description ? "Description and contact details" : "Contact details"}
            >
              {venue.description && (
                <p className="mb-4 whitespace-pre-line text-slate-600">{venue.description}</p>
              )}
              <dl className="space-y-2 text-sm">
                {venue.contactPhone && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-semibold text-[#071955]">{venue.contactPhone}</dd>
                  </div>
                )}
                {venue.contactEmail && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-semibold text-[#071955]">{venue.contactEmail}</dd>
                  </div>
                )}
              </dl>
            </Group>
          </div>

          {/* Sticky, because the price is what the reader checks against every
              detail they open below. */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Rates
              </h2>

              {standard === null ? (
                <p className="mt-3 text-slate-500">
                  This venue has not published a rate for {court.sportName.toLowerCase()} yet.
                </p>
              ) : (
                <dl className="mt-3 space-y-2.5">
                  <PriceRow label="Standard" amount={standard} />
                  {court.peakHourlyRate !== null && court.peakHourlyRate !== standard && (
                    <PriceRow
                      label="Peak"
                      amount={court.peakHourlyRate}
                      note={
                        hasPeakWindow
                          ? `${formatTime(court.peakStartsAt)} – ${formatTime(
                              court.peakEndsAt,
                            )}, ${peakDays(court)}`
                          : undefined
                      }
                    />
                  )}
                  {court.weekendRate !== null && court.weekendRate !== standard && (
                    <PriceRow label="Weekend" amount={court.weekendRate} />
                  )}
                  {court.holidayRate !== null && court.holidayRate !== standard && (
                    <PriceRow label="Holiday" amount={court.holidayRate} />
                  )}
                </dl>
              )}

              <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Slot length</dt>
                  <dd className="font-semibold text-[#071955]">
                    {court.slotLengthMinutes} minutes
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Minimum booking</dt>
                  <dd className="font-semibold text-[#071955]">
                    {court.minimumDurationMinutes} minutes
                  </dd>
                </div>
                {detail.bufferMinutes > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Buffer between bookings</dt>
                    <dd className="font-semibold text-[#071955]">
                      {detail.bufferMinutes} minutes
                    </dd>
                  </div>
                )}
              </dl>

              {closure ? (
                <>
                  <span className="mt-5 block w-full rounded-full bg-amber-100 py-3.5 text-center text-base font-semibold text-amber-800">
                    Under maintenance
                  </span>
                  <p className="mt-2 text-center text-sm text-slate-400">{closure.short}</p>
                </>
              ) : (
                <>
                  <Link
                    href={`/book/${court.bookableCourtId}`}
                    className="mt-5 block w-full rounded-full bg-[#2563EB] py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
                  >
                    Book now
                  </Link>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Pick your hours on the next page.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

function CourtDetail({
  courtId,
  sportKey,
  division,
}: {
  courtId: string;
  sportKey: string;
  division: number;
}) {
  const court = useQuery({
    queryKey: ["catalog", "court", courtId, sportKey, division],
    queryFn: () => getCatalogCourt(courtId, sportKey, division),
    staleTime: 5 * 60 * 1000,
    enabled: courtId !== "" && sportKey !== "",
  });

  if (court.isPending) {
    return (
      <main className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <p className="text-slate-500">Loading the court…</p>
        </div>
      </main>
    );
  }

  if (court.isError || !court.data) {
    return (
      <main className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <h1 className="text-2xl font-bold text-slate-950">That court is not on offer</h1>
          <p className="mt-2 text-slate-500">
            It may have been taken down, or the link may be wrong.
          </p>
          <Link
            href="/#courts"
            className="mt-5 inline-block rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Browse courts
          </Link>
        </div>
      </main>
    );
  }

  return <Details detail={court.data} />;
}

export default CourtDetail;
