import Link from "next/link";
import { activityIcon } from "@auth/catalogApi";
import {
  formatClock,
  formatDays,
  formatEarlyBird,
  formatPeso,
  formatSessionDate,
  openPlayHref,
  openPlayLevel,
  type CatalogOpenPlay,
} from "@auth/openPlayApi";

function SportBadge({ openPlay }: { openPlay: CatalogOpenPlay }) {
  const icon = activityIcon(openPlay.sportKey);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="h-3.5 w-3.5 object-contain" aria-hidden />
      )}
      {openPlay.sportName}
    </span>
  );
}

/**
 * The cover: the open play's own photo, or the court's or the venue's, which
 * the server has already chosen. With none at all, the sport's artwork on a
 * soft ground, so a card is never an empty grey box.
 */
function Cover({ openPlay, className }: { openPlay: CatalogOpenPlay; className: string }) {
  const icon = activityIcon(openPlay.sportKey);

  return (
    <div className={`overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 ${className}`}>
      {openPlay.coverPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={openPlay.coverPhotoUrl} alt={openPlay.title} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="flex h-full w-full items-center justify-center">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="h-14 w-14 object-contain opacity-80" />
          ) : (
            <span className="text-4xl font-bold text-[#2563EB]">{openPlay.sportName.slice(0, 1)}</span>
          )}
        </span>
      )}
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
      {openPlayLevel(level)}
    </span>
  );
}

function SpotsLeft({ left, max }: { left: number; max: number }) {
  if (left === 0) {
    return <span className="font-semibold text-red-700">Full</span>;
  }

  // Few enough left to be worth hurrying for.
  const tight = left <= Math.max(2, Math.floor(max / 4));

  return (
    <span className={tight ? "font-semibold text-amber-700" : "text-slate-600"}>
      {left} of {max} spots left
    </span>
  );
}

/**
 * The short card: what, where, when, and the next date. Used on the landing
 * page and on a venue's page, and every one of them leads to the open play
 * page, opened on this one.
 */
export function OpenPlayTeaser({ openPlay }: { openPlay: CatalogOpenPlay }) {
  const next = openPlay.upcomingSessions[0];

  return (
    <Link
      href={openPlayHref(openPlay.openPlayId)}
      className="flex flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70"
    >
      <Cover openPlay={openPlay} className="h-40 w-full" />

      <div className="flex flex-1 flex-col p-5">
      <div className="flex flex-wrap gap-1.5">
        <SportBadge openPlay={openPlay} />
        <LevelBadge level={openPlay.level} />
      </div>

      <h3 className="mt-3 text-lg font-bold text-slate-950">{openPlay.title}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {openPlay.facilityName} · {openPlay.courtName}
      </p>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {formatDays(openPlay.days)} · {formatClock(openPlay.startsAt)}–{formatClock(openPlay.endsAt)}
      </p>

      {next && (
        <p className="mt-1 text-sm">
          <span className="text-slate-500">Next: {formatSessionDate(next.date)} · </span>
          <SpotsLeft left={next.spotsLeft} max={openPlay.maxPlayers} />
        </p>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <p>
          <span className="text-xl font-bold text-slate-950">
            {formatPeso(next?.priceNow ?? openPlay.price)}
          </span>
          <span className="text-sm text-slate-500"> / player</span>
        </p>
        {next?.earlyBirdNow && (
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">
            Early bird
          </span>
        )}
      </div>
      </div>
    </Link>
  );
}

/**
 * The full card on the open play page: every upcoming date with its spots,
 * the price broken down, and the rules a player needs before joining.
 */
export function OpenPlayDetail({
  openPlay,
  highlighted,
}: {
  openPlay: CatalogOpenPlay;
  highlighted: boolean;
}) {
  return (
    <article
      id={`open-play-${openPlay.openPlayId}`}
      className={`scroll-mt-28 rounded-[24px] border bg-white p-6 shadow-sm transition ${
        highlighted ? "border-[#2563EB] ring-2 ring-blue-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Cover openPlay={openPlay} className="h-28 w-full shrink-0 rounded-2xl sm:w-44" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <SportBadge openPlay={openPlay} />
            <LevelBadge level={openPlay.level} />
          </div>
          <h3 className="mt-3 text-xl font-bold text-slate-950">{openPlay.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {openPlay.facilityName} · {openPlay.courtName} · {openPlay.city}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {formatDays(openPlay.days)} · {formatClock(openPlay.startsAt)}–
            {formatClock(openPlay.endsAt)} · up to {openPlay.maxPlayers} players
          </p>
        </div>

        <div className="text-right">
          <p>
            <span className="text-2xl font-bold text-slate-950">{formatPeso(openPlay.price)}</span>
            <span className="text-sm text-slate-500"> / player</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatPeso(openPlay.registrationFee)} venue fee + {formatPeso(openPlay.platformFee)}{" "}
            booking fee
          </p>
          {openPlay.earlyBird && (
            <p className="mt-2 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
              Early bird: {formatEarlyBird(openPlay.earlyBird)}
            </p>
          )}
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {openPlay.upcomingSessions.map((session) => (
          <li
            key={session.date}
            className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <span className="text-sm font-bold text-slate-950">{formatSessionDate(session.date)}</span>
            <span className="mt-0.5 text-sm">
              <SpotsLeft left={session.spotsLeft} max={openPlay.maxPlayers} />
            </span>
            <span className="mt-2 text-sm">
              <span className="font-bold text-slate-950">{formatPeso(session.priceNow)}</span>
              {session.earlyBirdNow && (
                <span className="ml-1.5 text-xs font-bold text-green-800">early bird</span>
              )}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              {session.isOpenForRegistration
                ? `Registration closes ${formatClock(session.registrationClosesAt.slice(11))}${
                    session.registrationClosesAt.slice(0, 10) === session.date
                      ? ""
                      : `, ${formatSessionDate(session.registrationClosesAt.slice(0, 10))}`
                  }`
                : "Registration closed"}
            </span>
            {/* Registering and paying come in the next step of the feature.
                Until then the button says so rather than leading nowhere. */}
            <button
              type="button"
              disabled
              title="Joining an open play is coming soon"
              className="mt-3 rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
            >
              {session.spotsLeft === 0 ? "Full" : "Joining opens soon"}
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}
