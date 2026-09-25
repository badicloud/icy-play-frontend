"use client";

/*
 * A reason from a short list, and a note.
 *
 * One component for every place the platform asks why — a customer moving a
 * booking, the desk turning a payment down — because the answers are counted
 * by the reports, and two pickers that look and behave differently are how one
 * of them ends up with a free box in it again. Other always needs a few words,
 * so it is not a way of saying nothing; otherwise the note is optional.
 */

export type ReasonOption<T extends string> = { value: T; label: string };

/** What is on screen so far. Nothing picked yet is null. */
export type ReasonDraft<T extends string> = { reason: T | null; note: string };

/** An answer the server will take. */
export type ReasonAnswer<T extends string> = { reason: T; note: string };

export function emptyReason<T extends string>(): ReasonDraft<T> {
  return { reason: null, note: "" };
}

/**
 * The answer, once it is one the server will take: a reason from the list, a
 * few words when it is Other, and nothing past the limit. Null until then, so
 * a button can simply ask whether there is an answer.
 */
export function reasonAnswerOf<T extends string>(
  draft: ReasonDraft<T>,
  noteLimit: number,
): ReasonAnswer<T> | null {
  const note = draft.note.trim();

  if (draft.reason === null || note.length > noteLimit) {
    return null;
  }

  if (draft.reason === "Other" && note.length === 0) {
    return null;
  }

  return { reason: draft.reason, note };
}

function ReasonPicker<T extends string>({
  name,
  question,
  hint,
  options,
  noteLimit,
  value,
  onChange,
  notePlaceholder = "A few words about why",
  disabled = false,
  className = "mt-5 border-t border-slate-200 pt-5",
}: {
  /** Keeps two pickers on one page from sharing a radio group. */
  name: string;
  question: string;
  /** Who sees the answer. Said, because people write differently for an audience. */
  hint: string;
  options: readonly ReasonOption<T>[];
  noteLimit: number;
  value: ReasonDraft<T>;
  onChange: (next: ReasonDraft<T>) => void;
  notePlaceholder?: string;
  disabled?: boolean;
  /** Where it sits: under a divider in a dialog, bare inside a panel. */
  className?: string;
}) {
  const other = value.reason === "Other";
  const left = noteLimit - value.note.trim().length;
  const noteId = `${name}-note`;

  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="sr-only">{question}</legend>
      <p className="text-sm font-bold text-[#071955]">{question}</p>
      <p className="mt-1 text-[12.5px] leading-6 font-medium text-slate-600">{hint}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
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
                name={name}
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
          <label htmlFor={noteId} className="text-[12.5px] font-bold text-[#071955]">
            {other ? "Tell us a little more" : "Anything to add? (optional)"}
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={noteLimit}
            value={value.note}
            onChange={(event) => onChange({ ...value, note: event.target.value })}
            placeholder={other ? notePlaceholder : ""}
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13.5px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2563EB]"
          />
          <p className="mt-1 flex justify-between text-[11.5px] font-semibold text-slate-600">
            <span className="text-amber-700">
              {other && value.note.trim().length === 0 ? "Needed when you pick Other." : ""}
            </span>
            <span>{left} left</span>
          </p>
        </div>
      )}
    </fieldset>
  );
}

export default ReasonPicker;
