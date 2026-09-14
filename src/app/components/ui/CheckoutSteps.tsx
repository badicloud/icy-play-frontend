/**
 * Where the customer is in the checkout, and how much is left.
 *
 * Three steps shown even from step one, because "review, pay, confirm" is a
 * shorter road than a page that only ever says "next" — and somebody who knows
 * what is coming is less likely to abandon a court they have already held.
 */
function CheckoutSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { number: 1, label: "Review" },
    { number: 2, label: "Pay" },
    { number: 3, label: "Confirm" },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((step, index) => {
        const done = current > step.number;
        const here = current === step.number;

        return (
          <li key={step.number} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                  done
                    ? "bg-green-100 text-green-800"
                    : here
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4.5 12.5l5 5 10-11"
                      stroke="currentColor"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </span>
              <span
                className={`text-sm font-bold ${
                  here ? "text-[#071955]" : done ? "text-green-800" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </span>

            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={`h-0.5 w-8 rounded ${done ? "bg-green-200" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default CheckoutSteps;
