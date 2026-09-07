"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSnackbar } from "notistack";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import HeadsetMicOutlined from "@mui/icons-material/HeadsetMicOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import RadioButtonUncheckedOutlined from "@mui/icons-material/RadioButtonUncheckedOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { ApiError } from "@/services/api";
import {
  checkPasswordResetToken,
  isPasswordValid,
  passwordRules,
  resetPassword,
} from "@auth/passwordResetApi";

type Status = "checking" | "form" | "success" | "expired" | "invalid";

function ShieldIllustration({ accent }: { accent: string }) {
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

const primaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1264f7] px-5 text-lg font-bold text-white shadow-[0_12px_28px_rgba(18,100,247,0.25)] transition hover:bg-[#071955] disabled:cursor-not-allowed disabled:bg-blue-300";

const secondaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-5 text-lg font-bold text-[#164eaa] transition hover:bg-blue-50";

const inputClass =
  "mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-lg text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200";

export default function ResetPasswordPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<Status>("checking");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureMessage, setFailureMessage] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");

    if (!value) {
      setFailureMessage("This link is missing its reset code.");
      setStatus("invalid");
      return;
    }

    setToken(value);

    // Validate before showing the form: a spent or expired link should read as
    // dead on arrival, not after the visitor has typed a new password.
    async function check() {
      try {
        await checkPasswordResetToken(value!);
        setStatus("form");
      } catch (error) {
        const apiError = error as ApiError;
        setFailureMessage(apiError.message);
        setStatus(
          apiError.code === "AUTH_EXPIRED_PASSWORD_RESET_TOKEN" ? "expired" : "invalid",
        );
      }
    }

    void check();
  }, []);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = isPasswordValid(password) && passwordsMatch && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      enqueueSnackbar("Your password has been changed.", { variant: "success" });
      setStatus("success");
    } catch (error) {
      const apiError = error as ApiError;
      setFailureMessage(apiError.message);

      if (apiError.code === "AUTH_EXPIRED_PASSWORD_RESET_TOKEN") {
        setStatus("expired");
      } else if (apiError.code === "AUTH_INVALID_PASSWORD_RESET_TOKEN") {
        setStatus("invalid");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {status === "checking" && (
            <>
              <div
                className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-[#1264f7]"
                role="status"
                aria-label="Checking your reset link"
              />
              <h1 className="mt-8 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Checking your link...
              </h1>
              <p className="mt-3 max-w-lg text-lg leading-8 text-slate-600">
                One moment while we make sure this reset link is still valid.
              </p>
            </>
          )}

          {status === "form" && (
            <>
              <ShieldIllustration accent="#2563eb" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Set a new password
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                Choose something <span className="text-[#1264f7]">only you</span> would know.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />

              <form onSubmit={handleSubmit} className="mt-7 w-full text-left">
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-base font-extrabold text-[#071955]"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type={isVisible ? "text" : "password"}
                    autoFocus
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFailureMessage("");
                    }}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setIsVisible((visible) => !visible)}
                    aria-label={isVisible ? "Hide password" : "Show password"}
                    className="absolute right-3 top-11 text-slate-400 transition hover:text-[#1264f7]"
                  >
                    {isVisible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                  </button>
                </div>

                <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-2 text-sm font-semibold ${
                          passed ? "text-green-600" : "text-slate-400"
                        }`}
                      >
                        {passed ? (
                          <CheckCircleOutlined sx={{ fontSize: 17 }} />
                        ) : (
                          <RadioButtonUncheckedOutlined sx={{ fontSize: 17 }} />
                        )}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>

                <div className="relative mt-5">
                  <label
                    htmlFor="confirm-password"
                    className="block text-base font-extrabold text-[#071955]"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type={isVisible ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Both passwords must match.
                    </p>
                  )}
                </div>

                {failureMessage && (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
                  >
                    {failureMessage}
                  </p>
                )}

                <button type="submit" disabled={!canSubmit} className={`mt-5 ${primaryButtonClass}`}>
                  {isSubmitting ? "Saving..." : "Change password"}
                </button>
              </form>

              <p className="mt-4 text-base leading-7 text-slate-600">
                Changing your password signs you out on every device.
              </p>

              <Link href="/sign-in" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to login
              </Link>
            </>
          )}

          {status === "success" && (
            <>
              <ShieldIllustration accent="#16a34a" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Password changed
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                You&apos;re all <span className="text-[#1264f7]">set</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Sign in with your new password. Every other device has been signed out.
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
              <ShieldIllustration accent="#f59e0b" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Link expired
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                Reset links are valid for <span className="text-[#1264f7]">60 minutes</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Your password has not changed. Request a fresh link and it will work right away.
              </p>

              <Link href="/forgot-password" className={`mt-7 ${primaryButtonClass}`}>
                <SendOutlined fontSize="small" /> Request a new link
              </Link>
              <Link href="/sign-in" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to login
              </Link>
            </>
          )}

          {status === "invalid" && (
            <>
              <ShieldIllustration accent="#dc2626" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Link not valid
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                We couldn&apos;t use this <span className="text-[#1264f7]">reset link</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                {failureMessage ||
                  "The link may have already been used, or a newer one was sent to your inbox."}{" "}
                Your password has not changed.
              </p>

              <Link href="/forgot-password" className={`mt-7 ${primaryButtonClass}`}>
                <SendOutlined fontSize="small" /> Request a new link
              </Link>
              <Link href="/sign-in" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to login
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
