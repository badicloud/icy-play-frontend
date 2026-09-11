"use client";

const inputClass =
  "min-h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200";

const invalidClass = "border-red-300 focus:border-red-400 focus:ring-red-100";

/**
 * One convention across the wizard: required fields carry the asterisk and
 * everything else carries nothing. Marking both states would put a label on
 * every field and tell the reader no more than marking one does.
 *
 * The mark is decoration; `aria-required` on the input is what a screen reader
 * actually announces.
 */
export function RequiredMark() {
  return (
    <span className="ml-1 font-bold text-red-600" aria-hidden>
      *
    </span>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-[#071955]">
        {label}
        {required && <RequiredMark />}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-sm font-semibold text-red-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date";
  placeholder?: string;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  type = "text",
  placeholder,
}: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} ${error ? invalidClass : ""}`}
      />
    </Field>
  );
}

type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
};

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  rows = 4,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        className={`${inputClass} resize-y py-3 ${error ? invalidClass : ""}`}
      />
    </Field>
  );
}

export function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1.5 text-slate-500">{description}</p>
    </div>
  );
}
