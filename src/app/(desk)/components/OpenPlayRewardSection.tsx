"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { claimStubsHref } from "@auth/claimStubsApi";
import type { DeskOpenPlay, OpenPlayRewardInput, OpenPlaySource } from "@auth/deskOpenPlayApi";
import { formatPeso } from "@auth/openPlayApi";

type Props = {
  /** The open play, once it has been saved; null for a new one. */
  openPlay: DeskOpenPlay | null;
  source: OpenPlaySource;
  /** Whether this door runs the claim stubs page: the venue desk does. */
  showStubsLink: boolean;
  onSaved: (updated: DeskOpenPlay) => void;
};

type Kind = "None" | "Voucher" | "ClaimStub";

type Draft = {
  kind: Kind;
  discountKind: "Fixed" | "Percentage";
  discountValue: string;
  maxDiscount: string;
  prize: string;
  quantity: string;
  validDays: string;
};

function draftOf(openPlay: DeskOpenPlay | null): Draft {
  const reward = openPlay?.reward ?? null;

  return {
    kind: (reward?.kind as Kind | undefined) ?? "None",
    discountKind: reward?.discountKind === "Percentage" ? "Percentage" : "Fixed",
    discountValue: reward?.discountValue != null ? String(reward.discountValue) : "",
    maxDiscount: reward?.maxDiscount != null ? String(reward.maxDiscount) : "",
    prize: reward?.prize ?? "",
    quantity: reward?.quantity != null ? String(reward.quantity) : "",
    validDays: reward?.validDays != null ? String(reward.validDays) : "30",
  };
}

function inputOf(draft: Draft): OpenPlayRewardInput {
  const number = (text: string) => (text.trim() === "" ? null : Number(text));

  if (draft.kind === "Voucher") {
    return {
      kind: "Voucher",
      discountKind: draft.discountKind,
      discountValue: number(draft.discountValue),
      maxDiscount: draft.discountKind === "Percentage" ? number(draft.maxDiscount) : null,
      validDays: number(draft.validDays),
    };
  }

  if (draft.kind === "ClaimStub") {
    return { kind: "ClaimStub", prize: draft.prize.trim(), quantity: number(draft.quantity), validDays: number(draft.validDays) };
  }

  return { kind: "None" };
}

/** "₱50 off their next open play here", or "a Free Gatorade, 7 of 10 left". */
function summary(draft: Draft) {
  const days = Number(draft.validDays);
  const valid = Number.isFinite(days) && days > 0 ? ` Valid for ${days} ${days === 1 ? "day" : "days"} from when it is given.` : "";

  if (draft.kind === "Voucher" && Number(draft.discountValue) > 0) {
    const off =
      draft.discountKind === "Percentage"
        ? `${Number(draft.discountValue)}% off${Number(draft.maxDiscount) > 0 ? ` (up to ${formatPeso(Number(draft.maxDiscount))})` : ""}`
        : `${formatPeso(Number(draft.discountValue))} off`;

    return `Each best player gets ${off} their next open play at this venue, applied at checkout.${valid}`;
  }

  if (draft.kind === "ClaimStub" && draft.prize.trim() !== "" && Number(draft.quantity) > 0) {
    return `Each best player gets a claim stub for "${draft.prize.trim()}" while the ${Number(draft.quantity)} last. They show it at the desk to collect.${valid}`;
  }

  return null;
}

const field =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#071955] outline-none focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50";

/**
 * What the best players earn when a session ends: nothing, a voucher off
 * their next open play at the venue, or a prize collected at the desk with a
 * claim stub. Saved on its own, and can change after publishing.
 */
function OpenPlayRewardSection({ openPlay, source, showStubsLink, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(openPlay));
  const ended = openPlay?.status === "Ended";

  // Start again from what is saved whenever a different open play is loaded.
  useEffect(() => {
    setDraft(draftOf(openPlay));
  }, [openPlay?.openPlayId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => source.setReward(openPlay!.openPlayId, inputOf(draft)),
    onSuccess: (updated) => {
      onSaved(updated);
      setDraft(draftOf(updated));
    },
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    save.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const choices: { kind: Kind; title: string; text: string }[] = [
    { kind: "None", title: "No reward", text: "Best players are named, nothing more." },
    { kind: "Voucher", title: "Voucher", text: "Money off their next open play here." },
    { kind: "ClaimStub", title: "Prize", text: "Something to collect at the desk." },
  ];

  const said = summary(draft);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
      <div>
        <h2 className="text-lg font-bold text-[#071955]">Reward for best players</h2>
        <p className="mt-1 text-sm text-slate-500">
          Given when you end a session, to every player level on the most wins. Free players have no account to
          receive it.
        </p>
      </div>

      {openPlay === null ? (
        <p className="text-sm text-slate-500">Save the draft first, then set the reward here.</p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Reward" className="grid gap-3 sm:grid-cols-3">
            {choices.map((choice) => {
              const chosen = draft.kind === choice.kind;

              return (
                <label
                  key={choice.kind}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                    chosen ? "border-[#2563EB] bg-blue-50/60 ring-1 ring-[#2563EB]" : "border-slate-200 hover:border-slate-300"
                  } ${ended ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="radio"
                    name="op-reward"
                    className="mt-1 accent-[#2563EB]"
                    checked={chosen}
                    disabled={ended}
                    onChange={() => set("kind", choice.kind)}
                  />
                  <span>
                    <span className="block font-bold text-[#071955]">{choice.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{choice.text}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {draft.kind === "Voucher" && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4">
              <select
                aria-label="Kind of voucher"
                value={draft.discountKind}
                disabled={ended}
                onChange={(event) => set("discountKind", event.target.value as Draft["discountKind"])}
                className={`${field} w-32`}
              >
                <option value="Fixed">₱ off</option>
                <option value="Percentage">% off</option>
              </select>
              <input
                aria-label="Voucher value"
                type="number"
                min={0}
                step="0.01"
                value={draft.discountValue}
                placeholder={draft.discountKind === "Fixed" ? "50" : "20"}
                disabled={ended}
                onChange={(event) => set("discountValue", event.target.value)}
                className={`${field} w-24`}
              />
              {draft.discountKind === "Percentage" && (
                <>
                  <span className="text-sm text-slate-500">up to ₱</span>
                  <input
                    aria-label="Most off"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.maxDiscount}
                    placeholder="no limit"
                    disabled={ended}
                    onChange={(event) => set("maxDiscount", event.target.value)}
                    className={`${field} w-28`}
                  />
                </>
              )}
            </div>
          )}

          {draft.kind === "ClaimStub" && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4">
              <input
                aria-label="Prize"
                value={draft.prize}
                maxLength={120}
                placeholder="e.g. Free Gatorade"
                disabled={ended}
                onChange={(event) => set("prize", event.target.value)}
                className={`${field} min-w-[12rem] flex-1`}
              />
              <span className="text-sm text-slate-500">×</span>
              <input
                aria-label="How many prizes"
                type="number"
                min={1}
                max={500}
                value={draft.quantity}
                placeholder="10"
                disabled={ended}
                onChange={(event) => set("quantity", event.target.value)}
                className={`${field} w-24`}
              />
              <span className="text-sm text-slate-500">to give, over all sessions</span>
            </div>
          )}

          {draft.kind !== "None" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Valid for</span>
              <input
                aria-label="Days valid"
                type="number"
                min={1}
                max={365}
                value={draft.validDays}
                disabled={ended}
                onChange={(event) => set("validDays", event.target.value)}
                className={`${field} w-24`}
              />
              <span className="text-sm text-slate-600">days after it is given</span>
            </div>
          )}

          {said && (
            <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#071955]">{said}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={ended || save.isPending}
              onClick={() => save.mutate()}
              className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save reward"}
            </button>
            {save.isSuccess && <span className="text-sm font-semibold text-green-700">Reward saved.</span>}
            <span className="text-sm text-slate-500">It counts for sessions you end after saving.</span>
          </div>
          {save.isError && (
            <p className="text-sm font-semibold text-red-700">
              {save.error instanceof ApiError ? save.error.message : "The reward could not be saved."}
            </p>
          )}

          {openPlay.claimStubs > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-700">
                <span className="font-bold">{openPlay.claimStubs}</span> claim stubs ·{" "}
                {openPlay.claimStubs - openPlay.claimStubsGiven} still to give · {openPlay.claimStubsGiven} given ·{" "}
                {openPlay.claimStubsClaimed} claimed
              </p>
              {showStubsLink && (
                <Link
                  href={claimStubsHref(openPlay.openPlayId)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  View claim stubs
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default OpenPlayRewardSection;
