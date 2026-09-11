"use client";

/**
 * The shield the password-and-account pages open with. Shared rather than
 * copied, because two hand-maintained versions of the same 30-line SVG drift
 * apart the first time one of them is touched.
 *
 * The accent colour carries the state: blue while working, green on success,
 * amber for expired, red for invalid.
 */
function AuthShieldIllustration({ accent }: { accent: string }) {
  return (
    <div className="relative mx-auto h-40 w-64" aria-hidden>
      <div className="absolute top-0 left-5 h-16 w-16 opacity-60 [background-image:radial-gradient(circle,#93c5fd_1.5px,transparent_1.5px)] [background-size:11px_11px]" />
      <svg
        viewBox="0 0 260 170"
        className="absolute inset-0 h-full w-full drop-shadow-[0_18px_22px_rgba(37,99,235,0.22)]"
      >
        <path d="M51 71 130 22l79 49v76H51Z" fill="#2563eb" />
        <rect x="70" y="42" width="120" height="88" rx="10" fill="white" />
        <text x="130" y="84" textAnchor="middle" fill="#0b2a67" fontSize="18" fontWeight="800">
          Icy<tspan fill="#1389f5">Play</tspan>
        </text>
        <path d="m51 71 79 56 79-56v76H51Z" fill="#b9d6ff" />
        <path d="m51 147 62-48 17 28 17-28 62 48Z" fill="#dceaff" />
        <circle cx="193" cy="132" r="34" fill={accent} />
        <rect x="181" y="129" width="24" height="19" rx="4" fill="white" />
        <path d="M186 129v-6a7 7 0 0 1 14 0v6" fill="none" stroke="white" strokeWidth="4.5" />
        <path d="M39 58c-18-18-13-38 13-45" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 5" />
        <path d="m49 10 21-4-9 20Z" fill="#2563eb" />
      </svg>
    </div>
  );
}

export default AuthShieldIllustration;
