"use client";

import {
  MOVE_REASONS,
  MOVE_REASON_NOTE_LIMIT,
  type MoveReasonAnswer,
  type MoveReasonValue,
} from "@auth/bookingApi";

/** Nothing picked yet: the picker's starting point. */
export type MoveReasonDraft = { reason: MoveReasonValue | null; note: string };

export const NO_REASON: MoveReasonDraft = { reason: null, note: "" };

/**
 * The answer, once it is one the server will take: a reason from the list, a
 * few words when it is Other, and nothing past the limit. Null until then, so
 * a button can simply ask whether there is an answer.
 */
export function answerOf(draft: MoveReasonDraft): MoveReasonAnswer | null {
  const note = draft.note.trim();

  if (draft.reason === null || note.length > MOVE_REASON_NOTE_LIMIT) {
    return null;
  }

  if (draft.reason === "Other" && note.length === 0) {
    return null;
  }

  return { reason: draft.reason, note };
}

/**
 * Why the customer is moving.
 *
 * Asked on every move, free or paid for, because the venue's report counts the
 * answers and a move with no answer is one it cannot count. A short list, so
 * "rain" and "raining" are one answer; Other asks for a few words so it is not
 * a way of saying nothing. The note is optional otherwise — a reason is what is
 * needed, not a letter.
 *
 * The venue sees what is picked here in the booking's history.
 */
function MoveReasonPicker({
  value,
  onChange,
  disabled = false,
  className = "mt-5 border-t border-slate-200 pt-5",
}: {
  value: MoveReasonDraft;
  onChange: (next: MoveReasonDraft) => void;
  disabled?: boolean;
  /** Where it sits: under a divider in a dialog, bare inside a checkout panel. */
  className?: string;
}) {
  const other = value.reason === "Other";
  const left = MOVE_REASON_NOTE_LIMIT - value.note.trim().length;

  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="sr-only">Why are you moving this booking?</legend>
      <p className="text-sm font-bold text-[#071955]">Why are you moving it?</p>
      <p className="mt-1 text-[12.5px] leading-6 font-medium text-slate-600">
        The venue sees your answer. It helps them see what they can do better.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {MOVE_REASONS.map((option) => {
          const here = value.reason === option.value;

          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition ${
                here
                  ? "border-[#2563EB] bg-blue-50 text-[#071955]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="move-reason"
                value={option.value}
                checked={here}
                onChange={() => onChange({ ...value, reason: option.value })}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>

      {value.reason !== null && (
        <div className="mt-3">
          <label htmlFor="move-reason-note" className="text-[12.5px] font-bold text-[#071955]">
            {other ? "Tell us a little more" : "Anything to add? (optional)"}
          </label>
          <textarea
            id="move-reason-note"
            rows={2}
            maxLength={MOVE_REASON_NOTE_LIMIT}
            value={value.note}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            placeholder={other ? "A few words about why" : ""}
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13.5px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2563EB]"
          />
          <p className="mt-1 flex justify-between text-[11.5px] font-semibold text-slate-600">
            <span className="text-amber-700">{other && value.note.trim().length === 0 ? "Needed when you pick Other." : ""}</span>
            <span>{left} left</span>
          </p>
        </div>
      )}
    </fieldset>
  );
}

export default MoveReasonPicker;
