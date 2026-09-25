"use client";

import {
  MOVE_REASONS,
  MOVE_REASON_NOTE_LIMIT,
  type MoveReasonAnswer,
  type MoveReasonValue,
} from "@auth/bookingApi";
import ReasonPicker, { emptyReason, reasonAnswerOf, type ReasonDraft } from "./ReasonPicker";

/** Nothing picked yet: the picker's starting point. */
export type MoveReasonDraft = ReasonDraft<MoveReasonValue>;

export const NO_REASON: MoveReasonDraft = emptyReason<MoveReasonValue>();

/** The answer, once it is one the server will take; null until then. */
export function answerOf(draft: MoveReasonDraft): MoveReasonAnswer | null {
  return reasonAnswerOf(draft, MOVE_REASON_NOTE_LIMIT);
}

/**
 * Why the customer is moving.
 *
 * Asked on every move, free or paid for, because the venue's report counts the
 * answers and a move with no answer is one it cannot count. The venue sees
 * what is picked here in the booking's history.
 */
function MoveReasonPicker({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: MoveReasonDraft;
  onChange: (next: MoveReasonDraft) => void;
  disabled?: boolean;
  /** Where it sits: under a divider in a dialog, bare inside a checkout panel. */
  className?: string;
}) {
  return (
    <ReasonPicker
      name="move-reason"
      question="Why are you moving it?"
      hint="The venue sees your answer. It helps them see what they can do better."
      options={MOVE_REASONS}
      noteLimit={MOVE_REASON_NOTE_LIMIT}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}

export default MoveReasonPicker;
