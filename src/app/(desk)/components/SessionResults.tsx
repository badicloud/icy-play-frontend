"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import { ApiError } from "@/services/api";
import {
  removeResultPhoto,
  saveResultPhoto,
  uploadResultPhoto,
  type MatchBoard,
  type MatchBoardPlayer,
  type MatchResultPhoto,
  type ResultPhotoKind,
} from "@auth/matchesApi";
import { formatSessionDate } from "@auth/openPlayApi";
import ShareImageDialog from "./ShareImageDialog";
import { shrinkPhoto, type ShareImageInput } from "./shareImage";

type Props = {
  board: MatchBoard;
  /** yyyy-MM-dd, the session's date. */
  date: string;
  /** The session's photos as they now stand, after one is taken or removed. */
  onPhotos: (photos: MatchResultPhoto[]) => void;
};

const badges: Record<ResultPhotoKind, string> = {
  BestPlayers: "BEST PLAYERS",
  WinningTeam: "WINNING TEAM",
  Group: "TODAY'S PLAYERS",
};

function FreeBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Free</span>
  );
}

function Names({ players }: { players: MatchBoardPlayer[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {players.map((player) => (
        <li
          key={player.participantId}
          className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-800 ring-1 ring-slate-200"
        >
          {player.fullName}
          {player.isFree && <FreeBadge />}
        </li>
      ))}
    </ul>
  );
}

const expiry = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The session's results once it is over: its best players — everyone level
 * on the most wins — and either the winning team or everybody who came, the
 * teams changing every game. The desk takes a photo of each and makes the
 * square share image from it. Photos are kept two days.
 */
function SessionResults({ board, date, onPhotos }: Props) {
  const best = board.standings.filter((standing) => standing.isBest);
  const mostWins = best[0]?.won ?? 0;
  const [teamPhoto, setTeamPhoto] = useState<"WinningTeam" | "Group">(board.winningTeam ? "WinningTeam" : "Group");
  const [sharing, setSharing] = useState<{ input: ShareImageInput; fileName: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const take = useMutation({
    mutationFn: async ({ kind, file }: { kind: ResultPhotoKind; file: File }) =>
      saveResultPhoto(board.openPlayId, date, kind, await uploadResultPhoto(await shrinkPhoto(file))),
    onSuccess: (photos) => {
      setProblem(null);
      onPhotos(photos);
    },
    onError: (error) =>
      setProblem(error instanceof ApiError || error instanceof Error ? error.message : "The photo could not be saved."),
  });

  const remove = useMutation({
    mutationFn: (kind: ResultPhotoKind) => removeResultPhoto(board.openPlayId, date, kind),
    onSuccess: (photos) => onPhotos(photos),
  });

  const photoOf = (kind: ResultPhotoKind) => board.photos.find((photo) => photo.kind === kind) ?? null;

  const namesFor = (kind: ResultPhotoKind) =>
    kind === "BestPlayers"
      ? best.map((standing) => standing.player)
      : kind === "WinningTeam"
        ? (board.winningTeam?.players ?? [])
        : board.group;

  function share(kind: ResultPhotoKind, photo: MatchResultPhoto) {
    const slug = board.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    setSharing({
      fileName: `${slug}-${kind.replace(/[A-Z]/g, (letter, at) => (at ? "-" : "") + letter.toLowerCase())}-${board.date}`,
      input: {
        badge: kind === "BestPlayers" && best.length === 1 ? "BEST PLAYER" : badges[kind],
        title: board.title,
        venue: board.facilityName,
        date: formatSessionDate(board.date),
        photoUrl: photo.url,
        backgroundUrl: board.backgroundPhotoUrl,
        // The whole group is too many names to read: the photo gets the room instead.
        names: kind === "Group" ? [] : namesFor(kind).map((player) => player.fullName),
      },
    });
  }

  function PhotoSlot({ kind }: { kind: ResultPhotoKind }) {
    const input = useRef<HTMLInputElement>(null);
    const photo = photoOf(kind);
    const working = (take.isPending && take.variables?.kind === kind) || (remove.isPending && remove.variables === kind);

    return (
      <div className="mt-4">
        {/* On a phone or tablet this opens the camera; on a computer, the files. */}
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) take.mutate({ kind, file });
          }}
        />

        {photo ? (
          <>
            {/* A Cloudinary URL already sized for the web. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200" />
            <p className="mt-1.5 text-xs text-slate-500">Kept until {expiry(photo.expiresAt)}, then deleted.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => share(kind, photo)}
                className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create share image
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => input.current?.click()}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
              >
                {working ? "Saving…" : "Retake"}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => remove.mutate(kind)}
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={working}
            onClick={() => input.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/70 px-4 py-6 text-sm font-semibold text-slate-600 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-60"
          >
            <PhotoCameraOutlined fontSize="small" />
            {working ? "Uploading…" : "Take photo"}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[#071955]">
        <EmojiEventsOutlined className="text-amber-600" fontSize="small" />
        Results
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Take the photos here, then make a square share image from each. Photos are kept for two days.
      </p>

      {problem && (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {problem}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-amber-100/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
            <StarOutlineRounded fontSize="small" />
            {best.length === 1 ? "Best player" : "Best players"}
          </p>
          {best.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nobody won a match, so there is no best player.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-amber-900">
                {mostWins} {mostWins === 1 ? "win" : "wins"}
                {best.length > 1 ? ", level" : ""}
              </p>
              {board.rewardOffered === null ? (
                <Names players={best.map((standing) => standing.player)} />
              ) : (
                <>
                  <p className="mt-2 text-xs font-semibold text-amber-900">Reward: {board.rewardOffered}</p>
                  {best.some(({ player }) => player.isFree) && (
                    <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-[#071955]">
                      Free players get no voucher or reward: the venue added them, so they have no account to
                      receive it. Only players who registered do.
                    </p>
                  )}
                  {/* Each best player, with what they were given, or why not. */}
                  <ul className="mt-2 space-y-1.5">
                    {best.map(({ player }) => {
                      const reward = board.rewards.find((given) => given.participantId === player.participantId);

                      return (
                        <li
                          key={player.participantId}
                          className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-amber-200"
                        >
                          <span className="font-semibold text-slate-900">{player.fullName}</span>
                          {player.isFree && <FreeBadge />}
                          {reward ? (
                            <>
                              {" "}
                              got {reward.kind === "ClaimStub" ? `a claim stub for ${reward.label}` : reward.label}
                              {reward.code && <span className="ml-1 font-mono text-xs text-slate-500">({reward.code})</span>}
                              <span className="block text-xs text-slate-500">
                                {reward.status === "Used" || reward.status === "Claimed"
                                  ? reward.status
                                  : `Valid until ${expiry(reward.expiresAt)}`}
                              </span>
                            </>
                          ) : (
                            <span className="block text-xs text-slate-500">
                              {player.isFree
                                ? "No voucher or reward: free player."
                                : board.endedAt === null
                                  ? "Given when you end the session."
                                  : "No reward given: the reward was set after the session ended, or the prizes ran out."}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              <PhotoSlot kind="BestPlayers" />
            </>
          )}
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
              {teamPhoto === "WinningTeam" ? <EmojiEventsOutlined fontSize="small" /> : <GroupsOutlined fontSize="small" />}
              Team photo
            </p>
            <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-emerald-200">
              {(
                [
                  ["WinningTeam", "Winning team"],
                  ["Group", "Entire group"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={value === "WinningTeam" && board.winningTeam === null}
                  aria-pressed={teamPhoto === value}
                  onClick={() => setTeamPhoto(value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                    teamPhoto === value ? "bg-emerald-600 text-white" : "text-emerald-900 hover:bg-emerald-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {teamPhoto === "WinningTeam" && board.winningTeam ? (
            <>
              <p className="mt-2 text-sm text-emerald-900">
                Team {board.winningTeam.team}, winners of Match {board.winningTeam.matchNumber}
              </p>
              <Names players={board.winningTeam.players} />
              <PhotoSlot kind="WinningTeam" />
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-emerald-900">
                {board.group.length} {board.group.length === 1 ? "player" : "players"} checked in
              </p>
              <Names players={board.group} />
              <PhotoSlot kind="Group" />
            </>
          )}
        </div>
      </div>

      <ShareImageDialog
        input={sharing?.input ?? null}
        fileName={sharing?.fileName ?? "share-image"}
        onClose={() => setSharing(null)}
      />
    </section>
  );
}

export default SessionResults;
