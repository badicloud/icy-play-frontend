"use client";

import { useState } from "react";
import { resultHolds, type MatchResult, type MatchResultInput } from "@auth/matchesApi";

type Props = {
  /** The result already given, when putting it right. */
  initial?: MatchResultInput | null;
  submitLabel: string;
  busy: boolean;
  onSubmit: (input: MatchResultInput) => void;
  onCancel: () => void;
};

const choices: { value: MatchResult; label: string }[] = [
  { value: "A", label: "Team A" },
  { value: "B", label: "Team B" },
  { value: "Draw", label: "Draw" },
];

/** A score box's text as a number, or null when empty. */
function scoreOf(text: string) {
  return text.trim() === "" ? null : Number(text);
}

/**
 * Who won, asked when a match finishes or its result is put right: Team A,
 * Team B or a draw, and the score if the desk has one. Typing both scores
 * picks the winner from them, so the two can't disagree by accident.
 */
function MatchResultForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [result, setResult] = useState<MatchResult | null>(initial?.result ?? null);
  const [scoreA, setScoreA] = useState(initial?.scoreA?.toString() ?? "");
  const [scoreB, setScoreB] = useState(initial?.scoreB?.toString() ?? "");

  const a = scoreOf(scoreA);
  const b = scoreOf(scoreB);
  const input = result === null ? null : { result, scoreA: a, scoreB: b };
  const holds = input !== null && resultHolds(input);

  function score(team: "A" | "B", text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 3);
    const nextA = team === "A" ? scoreOf(digits) : a;
    const nextB = team === "B" ? scoreOf(digits) : b;

    if (team === "A") setScoreA(digits);
    else setScoreB(digits);

    if (nextA !== null && nextB !== null) {
      setResult(nextA > nextB ? "A" : nextB > nextA ? "B" : "Draw");
    }
  }

  const scoreBox =
    "w-16 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 outline-none focus:border-[#2563EB]";

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-sm font-bold text-slate-900">Who won?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => setResult(choice.value)}
            aria-pressed={result === choice.value}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              result === choice.value
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-bold text-slate-900">
        Score <span className="font-normal text-slate-500">(optional)</span>
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <span>Team A</span>
        <input
          inputMode="numeric"
          aria-label="Team A score"
          value={scoreA}
          onChange={(event) => score("A", event.target.value)}
          className={scoreBox}
        />
        <span>–</span>
        <input
          inputMode="numeric"
          aria-label="Team B score"
          value={scoreB}
          onChange={(event) => score("B", event.target.value)}
          className={scoreBox}
        />
        <span>Team B</span>
      </div>

      {input !== null && !holds && (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Give a score for both teams, or neither — and it has to agree with who won.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !holds}
          onClick={() => input !== null && onSubmit(input)}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-500">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default MatchResultForm;
