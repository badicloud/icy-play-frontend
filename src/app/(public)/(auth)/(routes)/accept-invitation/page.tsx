"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSnackbar } from "notistack";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import HeadsetMicOutlined from "@mui/icons-material/HeadsetMicOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import RadioButtonUncheckedOutlined from "@mui/icons-material/RadioButtonUncheckedOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { ApiError } from "@/services/api";
import { acceptInvitation, checkInvitation, type InvitationDetails } from "@auth/invitationApi";
import { isPasswordValid, passwordRules } from "@auth/passwordResetApi";
import AuthShieldIllustration from "../../components/ui/AuthShieldIllustration";

type Status = "checking" | "form" | "success" | "used" | "expired" | "invalid";

const primaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1264f7] px-5 text-lg font-bold text-white shadow-[0_12px_28px_rgba(18,100,247,0.25)] transition hover:bg-[#071955] disabled:cursor-not-allowed disabled:bg-blue-300";

const secondaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-5 text-lg font-bold text-[#164eaa] transition hover:bg-blue-50";

const inputClass =
  "mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-lg text-[#071955] shadow-sm outline-none transition focus:border-[#1264f7] focus:ring-2 focus:ring-blue-200";

/**
 * Read-only, and locked for a reason: these details were encoded by the IcyPlay
 * team, and the invitation is bound to this email. Correcting one here would
 * quietly disagree with the record the platform holds.
 */
function EncodedDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-bold break-all text-[#071955]">{value}</span>
    </div>
  );
}

export default function AcceptInvitationPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<Status>("checking");
  const [token, setToken] = useState("");
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureMessage, setFailureMessage] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");

    if (!value) {
      setFailureMessage("This link is missing its invitation code.");
      setStatus("invalid");
      return;
    }

    setToken(value);

    // Checked before the form is shown, so a spent or expired invitation reads
    // as dead on arrival rather than after a password has been typed.
    async function check() {
      try {
        setDetails(await checkInvitation(value!));
        setStatus("form");
      } catch (error) {
        const apiError = error as ApiError;
        setFailureMessage(apiError.message);
        setStatus("invalid");
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
      await acceptInvitation(token, password);
      enqueueSnackbar("Your account is ready.", { variant: "success" });
      setStatus("success");
    } catch (error) {
      const apiError = error as ApiError;
      setFailureMessage(apiError.message);

      if (apiError.code === "AUTH_INVITATION_ALREADY_ACCEPTED") {
        setStatus("used");
      } else if (apiError.code === "AUTH_EXPIRED_INVITATION_TOKEN") {
        setStatus("expired");
      } else if (apiError.code === "AUTH_INVALID_INVITATION_TOKEN") {
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
                aria-label="Checking your invitation"
              />
              <h1 className="mt-8 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Checking your invitation...
              </h1>
              <p className="mt-3 max-w-lg text-lg leading-8 text-slate-600">
                One moment while we look up the account waiting for you.
              </p>
            </>
          )}

          {status === "form" && details && (
            <>
              <AuthShieldIllustration accent="#2563eb" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Activate your account
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                {details.businessName ? (
                  <>
                    Your account for{" "}
                    <span className="text-[#1264f7]">{details.businessName}</span> is ready.
                  </>
                ) : (
                  <>
                    Just pick a <span className="text-[#1264f7]">password</span>.
                  </>
                )}
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />

              <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.1em] text-slate-500">
                  Encoded by the IcyPlay team
                </p>
                <EncodedDetail label="Name" value={details.fullName} />
                <EncodedDetail label="Email" value={details.email} />
                {details.phoneNumber && (
                  <EncodedDetail label="Mobile" value={details.phoneNumber} />
                )}
                <p className="mt-3 text-sm text-slate-500">
                  Something wrong here? Contact us and we will correct it before you continue.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 w-full text-left">
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-base font-extrabold text-[#071955]"
                  >
                    Choose a password
                  </label>
                  <input
                    id="password"
                    type={isVisible ? "text" : "password"}
                    autoFocus
                    required
                    autoComplete="new-password"
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
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type={isVisible ? "text" : "password"}
                    required
                    autoComplete="new-password"
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
                  <LockOutlined fontSize="small" />
                  {isSubmitting ? "Activating..." : "Activate my account"}
                </button>
              </form>

              <p className="mt-4 text-base leading-7 text-slate-600">
                Nobody at IcyPlay knows this password, and nobody can see it after you set it.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <AuthShieldIllustration accent="#16a34a" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Your account is ready
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                Your email is <span className="text-[#1264f7]">confirmed</span> too.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Opening this link confirmed your email address, so there is nothing else to do.
                Sign in and your facility is waiting.
              </p>

              <Link href="/sign-in" className={`mt-7 ${primaryButtonClass}`}>
                <LoginOutlined fontSize="small" /> Continue to login
              </Link>
              <Link href="/" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to home
              </Link>
            </>
          )}

          {status === "used" && (
            <>
              <AuthShieldIllustration accent="#16a34a" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Already activated
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                This account is <span className="text-[#1264f7]">yours</span> already.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Someone has already set a password with this invitation. Sign in, or use Forgot
                password if you cannot remember it.
              </p>

              <Link href="/sign-in" className={`mt-7 ${primaryButtonClass}`}>
                <LoginOutlined fontSize="small" /> Continue to login
              </Link>
              <Link href="/forgot-password" className={`mt-3 ${secondaryButtonClass}`}>
                I forgot my password
              </Link>
            </>
          )}

          {status === "expired" && (
            <>
              <AuthShieldIllustration accent="#f59e0b" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Invitation expired
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                Invitations are valid for <span className="text-[#1264f7]">7 days</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Your account is still there, waiting. Ask the IcyPlay team for a new invitation
                and it will work right away.
              </p>

              <a href="mailto:icyplaybooking@gmail.com" className={`mt-7 ${primaryButtonClass}`}>
                <HeadsetMicOutlined fontSize="small" /> Ask for a new invitation
              </a>
              <Link href="/" className={`mt-3 ${secondaryButtonClass}`}>
                <ArrowBackOutlined fontSize="small" /> Back to home
              </Link>
            </>
          )}

          {status === "invalid" && (
            <>
              <AuthShieldIllustration accent="#dc2626" />
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
                Link not valid
              </h1>
              <p className="mt-2 text-xl font-bold text-[#071955]">
                We couldn&apos;t use this <span className="text-[#1264f7]">invitation</span>.
              </p>
              <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                {failureMessage ||
                  "The invitation may have expired, already been used, or been replaced by a newer one."}
              </p>

              <a href="mailto:icyplaybooking@gmail.com" className={`mt-7 ${primaryButtonClass}`}>
                <HeadsetMicOutlined fontSize="small" /> Ask for a new invitation
              </a>
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
