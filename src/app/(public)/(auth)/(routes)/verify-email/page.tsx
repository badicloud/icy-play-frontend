"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSnackbar } from "notistack";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import HeadsetMicOutlined from "@mui/icons-material/HeadsetMicOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import { ApiError } from "@/services/api";
import { resendVerificationEmail, verifyEmail } from "@auth/registrationApi";

const pendingEmailKey = "icyplay.pendingVerificationEmail";
const resendCooldownSeconds = 60;

type Status = "verifying" | "verified" | "expired" | "invalid";

function SuccessIllustration() {
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
        <circle cx="193" cy="132" r="34" fill="#16a34a" />
        <path
          d="m177 132 11 11 21-25"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M39 58c-18-18-13-38 13-45" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 5" />
        <path d="m49 10 21-4-9 20Z" fill="#2563eb" />
      </svg>
    </div>
  );
}

function ExpiredIllustration() {
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
        <circle cx="193" cy="132" r="34" fill="#f59e0b" />
        <path
          d="M193 114v20l13 9"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M39 58c-18-18-13-38 13-45" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 5" />
        <path d="m49 10 21-4-9 20Z" fill="#2563eb" />
      </svg>
    </div>
  );
}

function InvalidIllustration() {
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
        <circle cx="193" cy="132" r="34" fill="#dc2626" />
        <path
          d="m182 121 22 22m0-22-22 22"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path d="M39 58c-18-18-13-38 13-45" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 5" />
        <path d="m49 10 21-4-9 20Z" fill="#2563eb" />
      </svg>
    </div>
  );
}

const primaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1264f7] px-5 text-lg font-bold text-white shadow-[0_12px_28px_rgba(18,100,247,0.25)] transition hover:bg-[#071955] disabled:cursor-not-allowed disabled:bg-blue-300";

const secondaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-5 text-lg font-bold text-[#164eaa] transition hover:bg-blue-50";

export default function VerifyEmailPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<Status>("verifying");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [failureMessage, setFailureMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const hasRequested = useRef(false);

  useEffect(() => {
    // React runs effects twice in development. The backend treats a repeated
    // link as already verified, but there is no reason to send it twice.
    if (hasRequested.current) {
      return;
    }

    hasRequested.current = true;
    setResendEmail(sessionStorage.getItem(pendingEmailKey) ?? "");

    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("invalid");
      setFailureMessage("This link is missing its verification code.");
      return;
    }

    async function verify() {
      try {
        const result = await verifyEmail(token!);
        setVerifiedEmail(result.email);
        setAlreadyVerified(result.alreadyVerified);
        setStatus("verified");
      } catch (error) {
        const apiError = error as ApiError;
        setFailureMessage(apiError.message);
        setStatus(apiError.code === "AUTH_EXPIRED_VERIFICATION_TOKEN" ? "expired" : "invalid");
      }
    }

    void verify();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!resendEmail || isSending || cooldown > 0) {
      return;
    }

    setIsSending(true);

    try {
      await resendVerificationEmail(resendEmail);
      setCooldown(resendCooldownSeconds);
      enqueueSnackbar("A new verification email has been sent.", { variant: "success" });
    } catch (error) {
      const apiError = error as ApiError;
      const payload = apiError.payload as
        | { error?: { details?: { retryAfterSeconds?: number } } }
        | undefined;
      const retryAfter = payload?.error?.details?.retryAfterSeconds;

      if (apiError.status === 429 && retryAfter) {
        setCooldown(retryAfter);
      }

      enqueueSnackbar(apiError.message, { variant: "error" });
    } finally {
      setIsSending(false);
    }
  }, [cooldown, enqueueSnackbar, isSending, resendEmail]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f9ff] px-5 py-6 text-slate-950 sm:px-8">
      <div className="absolute -left-28 top-80 h-72 w-72 rounded-full border-[44px] border-blue-100/45" />
      <div className="absolute right-0 top-0 h-40 w-40 opacity-30 [background-image:radial-gradient(circle,#60a5fa_1.5px,transparent_1.5px)] [background-size:15px_15px]" />
      <div className="absolute bottom-0 left-0 h-32 w-44 opacity-25 [background-image:radial-gradient(circle,#60a5fa_1.5px,transparent_1.5px)] [background-size:15px_15px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
        <Link href="/" className="inline-flex w-fit" aria-label="Back to IcyPlay home">
          <img
            src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
            alt="IcyPlay"
            className="h-16 w-auto object-contain"
          />
        </Link>

        <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-4 text-center">
          {status === "verifying" && (
            <>
              <div
                className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-[#1264f7]"
                role="status"
                aria-label="Verifying your email address"
              />
              <h1 className="mt-8 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Verifying...
              </h1>
              <p className="mt-3 max-w-lg text-lg leading-8 text-slate-600">
                Hang on while we confirm your email address.
              </p>
            </>
          )}

          {status === "verified" && (
            <>
              <SuccessIllustration />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                {alreadyVerified ? "Already verified!" : "Email verified!"}
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                {alreadyVerified ? (
                  <>
                    This account is <span className="text-[#1264f7]">good to go</span>.
                  </>
                ) : (
                  <>
                    Your account is now <span className="text-[#1264f7]">active</span>.
                  </>
                )}
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                {verifiedEmail ? (
                  <>
                    <strong className="break-all font-bold text-[#1264f7]">{verifiedEmail}</strong> is
                    confirmed. Sign in to start booking courts.
                  </>
                ) : (
                  "Sign in to start booking courts."
                )}
              </p>

              <Link href="/sign-in" className={`mt-7 ${primaryButtonClass}`}>
                <LoginOutlined fontSize="small" /> Continue to login
              </Link>
              <Link href="/" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to home
              </Link>
            </>
          )}

          {status === "expired" && (
            <>
              <ExpiredIllustration />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Link expired
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                Verification links are only valid for <span className="text-[#1264f7]">24 hours</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                No problem &mdash; enter your email address and we&apos;ll send you a fresh link.
              </p>

              <div className="mt-7 w-full text-left">
                <label
                  htmlFor="resend-email"
                  className="block text-base font-extrabold text-[#071955]"
                >
                  Email address
                </label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={!resendEmail || isSending || cooldown > 0}
                className={`mt-4 ${primaryButtonClass}`}
              >
                <SendOutlined fontSize="small" />
                {isSending
                  ? "Sending..."
                  : cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : "Send a new link"}
              </button>

              <Link href="/sign-in" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to login
              </Link>
            </>
          )}

          {status === "invalid" && (
            <>
              <InvalidIllustration />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Link not valid
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                We couldn&apos;t use this <span className="text-[#1264f7]">verification link</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                {failureMessage ||
                  "The link may have already been used, or a newer one was sent to your inbox."}{" "}
                Try the most recent email we sent you, or sign in to check whether your account is
                already active.
              </p>

              <Link href="/sign-in" className={`mt-7 ${primaryButtonClass}`}>
                <LoginOutlined fontSize="small" /> Go to login
              </Link>
              <Link href="/verify-email-sent" className={`mt-3 ${secondaryButtonClass}`}>
                <SendOutlined fontSize="small" /> Request a new link
              </Link>
            </>
          )}

          <div className="mt-7 flex w-full items-center gap-4 rounded-2xl bg-blue-50/90 p-5 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1264f7] shadow-sm">
              <HeadsetMicOutlined />
            </span>
            <div className="flex-1">
              <p className="text-base font-extrabold text-[#071955]">Need help?</p>
              <p className="mt-1 text-base leading-7 text-slate-600">
                Contact our support team and we&apos;ll be happy to assist you.
              </p>
            </div>
            <a
              href="mailto:icyplaybooking@gmail.com"
              className="hidden rounded-xl bg-white px-4 py-3 text-base font-bold text-[#1264f7] shadow-sm sm:block"
            >
              icyplaybooking@gmail.com
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
