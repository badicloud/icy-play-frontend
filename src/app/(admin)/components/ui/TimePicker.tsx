"use client";

import { useEffect, useRef, useState } from "react";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";

/** "18:30" in, 6 / 30 / PM out. Blank means nothing has been picked yet. */
function split(value: string) {
  if (!/^\d{2}:\d{2}/.test(value)) {
    return { hour: "", minute: "", meridiem: "AM" as const };
  }

  const hours = Number(value.slice(0, 2));
  const minutes = value.slice(3, 5);

  return {
    // Midnight and noon are both 12 on a clock face, which is the one thing a
    // 24-hour number cannot say.
    hour: String(hours % 12 === 0 ? 12 : hours % 12),
    minute: minutes,
    meridiem: hours < 12 ? ("AM" as const) : ("PM" as const),
  };
}

function join(hour: string, minute: string, meridiem: string) {
  const twelve = Number(hour) % 12;
  const hours = meridiem === "PM" ? twelve + 12 : twelve;

  return `${String(hours).padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/** What the trigger shows: "6:00 PM", or the placeholder when unset. */
export function formatTime(value: string) {
  const { hour, minute, meridiem } = split(value);
  return hour === "" ? "" : `${hour}:${minute} ${meridiem}`;
}

function clamp(value: string, low: number, high: number) {
  const digits = value.replace(/\D/g, "");

  if (digits === "") {
    return "";
  }

  return String(Math.min(Math.max(Number(digits), low), high));
}

type TimePickerProps = {
  id: string;
  label: string;
  /** 24-hour "HH:mm". Empty when nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  /** Shown in the popover, so the reader knows the range before they guess. */
  hint?: string;
  error?: string;
  placeholder?: string;
};

/**
 * A clock rather than a text box. The browser's own time input is a different
 * shape in every browser and unusable in some of them, and an hour typed as
 * "6pm" is the most ordinary way a person says it.
 */
function TimePicker({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder = "Select time",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => split(value));
  const container = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  // Opening starts from what is saved, so a cancelled edit leaves no trace.
  useEffect(() => {
    if (open) {
      setDraft(split(value));
      firstField.current?.focus();
      firstField.current?.select();
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const complete = draft.hour !== "" && draft.minute !== "";

  function confirm() {
    if (!complete) {
      return;
    }

    onChange(join(draft.hour, draft.minute, draft.meridiem));
    setOpen(false);
  }

  const display = formatTime(value);

  return (
    <div ref={container} className="relative">
      <label htmlFor={id} className="block text-sm font-bold text-[#071955]">
        {label}
      </label>

      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`mt-1.5 flex min-h-13 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-base shadow-sm outline-none transition focus:ring-2 focus:ring-blue-200 ${
          error ? "border-red-500" : "border-slate-200 focus:border-[#1264f7]"
        } ${display === "" ? "text-slate-400" : "text-[#071955]"}`}
      >
        {display === "" ? placeholder : display}
        <AccessTimeOutlined sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          <p className="text-center font-bold text-[#071955]">{label}</p>

          <div className="mt-4 flex items-start justify-center gap-2">
            <div>
              <input
                ref={firstField}
                inputMode="numeric"
                aria-label="Hour"
                value={draft.hour}
                placeholder="12"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, hour: clamp(event.target.value, 1, 12) }))
                }
                onKeyDown={(event) => event.key === "Enter" && confirm()}
                className="h-14 w-16 rounded-xl border border-slate-200 bg-slate-50 text-center text-2xl font-bold text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-center text-xs text-slate-400">Hour</p>
            </div>

            <span className="pt-3 text-2xl font-bold text-slate-400">:</span>

            <div>
              <input
                inputMode="numeric"
                aria-label="Minute"
                value={draft.minute}
                placeholder="00"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    minute: clamp(event.target.value, 0, 59),
                  }))
                }
                // Padded on the way out, so "5" reads as "05" once it lands.
                onBlur={() =>
                  setDraft((current) => ({
                    ...current,
                    minute: current.minute === "" ? "" : current.minute.padStart(2, "0"),
                  }))
                }
                onKeyDown={(event) => event.key === "Enter" && confirm()}
                className="h-14 w-16 rounded-xl border border-slate-200 bg-slate-50 text-center text-2xl font-bold text-[#071955] outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-center text-xs text-slate-400">Minute</p>
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              {(["AM", "PM"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={draft.meridiem === option}
                  onClick={() => setDraft((current) => ({ ...current, meridiem: option }))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                    draft.meridiem === option
                      ? "bg-[#2563EB] text-white"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {hint && <p className="mt-4 text-center text-sm text-slate-500">{hint}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 transition hover:text-[#071955]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!complete}
              className="rounded-xl bg-[#071955] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2170] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

export default TimePicker;
