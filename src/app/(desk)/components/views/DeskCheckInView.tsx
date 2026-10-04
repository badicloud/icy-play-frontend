"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import {
  checkInByHand,
  checkInScreenHref,
  getCheckInRoster,
  scanForCheckIn,
  undoCheckIn,
  type CheckInPlayer,
  type CheckInRoster,
  type CheckInScanResult,
} from "@auth/checkInApi";
import { formatClock, formatSessionDate } from "@auth/openPlayApi";
import CheckInCodeModal from "../CheckInCodeModal";
import QrScanner from "../QrScanner";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";

/** The desk's page frame, the same as its other pages: centred, padded, with the trail back. */
function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-6xl px-6 pt-8 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Venue desk", href: "/desk" },
            { label: "Open play", href: "/desk/open-play" },
            { label: "Check in" },
          ]}
        />
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

/** How long an answer covers the camera before it reads the next player: a yes is quick, a no needs reading. */
const AnswerMs = { good: 2500, other: 5000 };

type Tone = "good" | "warn" | "bad";

/** What the desk sees after a scan: the server's answer, or the request failing. */
type Answer = { tone: Tone; title: string; name: string | null; message: string; id: number };

function toneOf(outcome: CheckInScanResult["outcome"]): Tone {
  if (outcome === "CheckedIn") {
    return "good";
  }

  return outcome === "AlreadyCheckedIn" ? "warn" : "bad";
}

const titles: Record<Tone, string> = { good: "Checked in", warn: "QR already used", bad: "Not checked in" };

const overlayTone: Record<Tone, string> = {
  good: "bg-emerald-600/95",
  warn: "bg-amber-500/95",
  bad: "bg-red-600/95",
};

const bannerTone: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
};

const icons: Record<Tone, string> = { good: "✓", warn: "!", bad: "✕" };

/** When somebody walked in. A display only: nothing is decided from it. */
function arrivedAt(moment: string) {
  return new Date(moment).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

/**
 * The desk's door for one open play session: the camera reads the player's
 * pass, the server says whether they are in, and the list below shows who has
 * arrived. A player without their phone is checked in by hand from the list,
 * and a mistake is undone there too.
 *
 * Whether check-in is open is the server's answer, on the venue's clock.
 */
function DeskCheckInView() {
  const params = useSearchParams();
  const openPlayId = params.get("openPlay") ?? "";
  const date = params.get("date") ?? "";
  const client = useQueryClient();
  const key = ["desk-check-in", openPlayId, date];

  // On the camera while it is fresh; the last one stays below it after.
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [showing, setShowing] = useState(false);
  const latest = useRef(0);
  const [search, setSearch] = useState("");

  const roster = useQuery({
    queryKey: key,
    queryFn: () => getCheckInRoster(openPlayId, date),
    enabled: openPlayId !== "" && date !== "",
    staleTime: 0,
    refetchOnMount: "always",
    // Another desk device may be checking people in at the same door, and a
    // closed window opens on its own.
    refetchInterval: 15_000,
  });

  const keep = (fresh: CheckInRoster) => client.setQueryData(key, fresh);

  const scan = useMutation({
    mutationFn: (scanned: string) => scanForCheckIn(openPlayId, date, scanned),
    onSuccess: (result) => {
      keep(result.roster);
      const tone = toneOf(result.outcome);
      show({
        tone,
        title: titles[tone],
        name: result.player?.fullName ?? null,
        message: result.message,
        id: Date.now(),
      });
    },
    onError: (error) =>
      show({
        tone: "bad",
        title: "Could not check",
        name: null,
        message: error instanceof ApiError ? error.message : "That scan did not go through. Try again.",
        id: Date.now(),
      }),
  });

  function show(next: Answer) {
    latest.current = next.id;
    setAnswer(next);
    setShowing(true);
    // A buzz on phones that have one, so the desk need not watch the screen.
    navigator.vibrate?.(next.tone === "good" ? 120 : [80, 60, 80]);
    // Back to the camera, unless a newer answer has taken its place.
    window.setTimeout(
      () => {
        if (latest.current === next.id) {
          setShowing(false);
        }
      },
      next.tone === "good" ? AnswerMs.good : AnswerMs.other,
    );
  }

  // Anything done without the player's QR asks for the venue's code first.
  const [asking, setAsking] = useState<{ kind: "checkIn" | "undo"; player: CheckInPlayer } | null>(null);

  const byCode = useMutation({
    mutationFn: ({ kind, player, code }: { kind: "checkIn" | "undo"; player: CheckInPlayer; code: string }) =>
      kind === "checkIn" ? checkInByHand(player.registrationId, code) : undoCheckIn(player.registrationId, code),
    onSuccess: (fresh) => {
      keep(fresh);
      setAsking(null);
    },
  });

  function ask(kind: "checkIn" | "undo", player: CheckInPlayer) {
    byCode.reset();
    setAsking({ kind, player });
  }

  // mutate is stable, so the camera is never restarted by a re-render.
  const { mutate: sendScan } = scan;
  const onScan = useCallback((text: string) => sendScan(text), [sendScan]);

  if (openPlayId === "" || date === "") {
    return (
      <Page>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">This link is missing the open play or the date.</p>
      </Page>
    );
  }

  if (roster.isPending) {
    return (
      <Page>
        <div className="h-64 animate-pulse rounded-[24px] border border-slate-200 bg-white" />
      </Page>
    );
  }

  if (roster.isError) {
    return (
      <Page>
        <div className="space-y-4">
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
            {roster.error instanceof ApiError ? roster.error.message : "This session could not be loaded."}
          </p>
          <Link href="/desk/open-play" className="text-sm font-semibold text-[#2563EB]">
            ‹ Back to open plays
          </Link>
        </div>
      </Page>
    );
  }

  const session = roster.data;
  const needle = search.trim().toLowerCase();
  const players = needle
    ? session.players.filter((player) => player.fullName.toLowerCase().includes(needle))
    : session.players;

  return (
    <Page>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Check in</h1>
            <p className="mt-2 text-lg font-semibold text-[#071955]">{session.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {formatSessionDate(session.date)} · {formatClock(session.startsAt)}–{formatClock(session.endsAt)} ·{" "}
              {session.unitLabel} {session.courtName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center">
              <p className="text-2xl font-extrabold text-[#071955]">
                {session.checkedIn}
                <span className="text-base font-semibold text-slate-400"> / {session.registered}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">checked in</p>
            </div>
            <a
              href={checkInScreenHref(openPlayId, date)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Open wide screen ↗
            </a>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            {session.isOpen ? (
              <QrScanner onScan={onScan} paused={scan.isPending || showing}>
                {scan.isPending && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/75 text-white">
                    <span
                      className="h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white"
                      aria-hidden
                    />
                    <p className="text-lg font-bold">Validating QR code…</p>
                  </div>
                )}

                {!scan.isPending && showing && answer && (
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white ${overlayTone[answer.tone]}`}
                    role="status"
                  >
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl font-black text-slate-900 shadow-lg">
                      <span
                        className={
                          answer.tone === "good"
                            ? "text-emerald-600"
                            : answer.tone === "warn"
                              ? "text-amber-500"
                              : "text-red-600"
                        }
                      >
                        {icons[answer.tone]}
                      </span>
                    </span>
                    <p className="text-2xl font-extrabold">{answer.title}</p>
                    {answer.name && <p className="text-xl font-bold">{answer.name}</p>}
                    {answer.tone !== "good" && <p className="max-w-sm font-semibold text-white/90">{answer.message}</p>}
                    <button
                      type="button"
                      onClick={() => setShowing(false)}
                      className="mt-2 rounded-full bg-white/20 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/30"
                    >
                      Scan next
                    </button>
                  </div>
                )}
              </QrScanner>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-lg font-semibold text-slate-950">Check-in is not open</p>
                <p className="mt-1 text-sm text-slate-600">
                  It opens at {formatClock(session.checkInOpensAt.slice(11))} on {formatSessionDate(session.date)} and
                  closes when the session ends. This page opens the camera by itself when it is time.
                </p>
              </div>
            )}

            {answer && (
              <div className={`rounded-2xl border px-5 py-4 ${bannerTone[answer.tone]}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Last scan</p>
                {answer.name && <p className="text-lg font-extrabold">{answer.name}</p>}
                <p className="font-semibold">{answer.message}</p>
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-[#071955]">Registered players</h2>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a name"
                className="w-48 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#2563EB]"
              />
            </div>

            {session.players.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">Nobody is registered for this session yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {players.map((player) => {
                  const busy = byCode.isPending && byCode.variables?.player.registrationId === player.registrationId;

                  return (
                    <li key={player.registrationId} className="flex items-center gap-3 py-3">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${player.checkedInAt ? "bg-emerald-500" : "bg-slate-300"}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{player.fullName}</span>
                        <span className="block text-xs text-slate-500">
                          {player.checkedInAt ? `Arrived ${arrivedAt(player.checkedInAt)}` : "Not here yet"}
                        </span>
                      </span>

                      {player.checkedInAt ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => ask("undo", player)}
                          className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:text-red-700 disabled:opacity-60"
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !session.isOpen}
                          onClick={() => ask("checkIn", player)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
                        >
                          Check in
                        </button>
                      )}
                    </li>
                  );
                })}
                {players.length === 0 && (
                  <li className="py-6 text-center text-sm text-slate-500">No registered player by that name.</li>
                )}
              </ul>
            )}
          </section>
        </div>

        {asking && (
          <CheckInCodeModal
            title={asking.kind === "checkIn" ? "Check in by hand" : "Undo check-in"}
            playerName={asking.player.fullName}
            confirmLabel={asking.kind === "checkIn" ? "Check in" : "Undo"}
            pending={byCode.isPending}
            error={
              byCode.error
                ? byCode.error instanceof ApiError
                  ? byCode.error.message
                  : "That did not work. Try again."
                : null
            }
            onConfirm={(code) => byCode.mutate({ ...asking, code })}
            onClose={() => setAsking(null)}
          />
        )}
      </div>
    </Page>
  );
}

export default DeskCheckInView;
