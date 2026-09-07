"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSnackbar } from "notistack";
import SendOutlined from "@mui/icons-material/SendOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import HeadsetMicOutlined from "@mui/icons-material/HeadsetMicOutlined";
import { ApiError } from "@/services/api";
import { executeRecaptcha, preloadRecaptcha } from "@auth/recaptchaV3";
import { resendVerificationEmail } from "@auth/registrationApi";

const pendingEmailKey = "icyplay.pendingVerificationEmail";
const resendCooldownSeconds = 60;

function VerificationIllustration() {
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
        <circle cx="193" cy="132" r="34" fill="#2563eb" />
        <path d="m177 132 11 11 21-25" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 58c-18-18-13-38 13-45" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 5" />
        <path d="m49 10 21-4-9 20Z" fill="#2563eb" />
      </svg>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1264f7] shadow-[0_8px_22px_rgba(37,99,235,0.12)]">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-extrabold text-[#071955]">{title}</h2>
        <div className="mt-1 text-base leading-7 text-slate-600">{children}</div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setEmail(sessionStorage.getItem(pendingEmailKey) ?? "");
    void preloadRecaptcha().catch(() => {
      // A failed preload is retried when the resend is actually requested.
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || isSending || cooldown > 0) return;

    setIsSending(true);
    try {
      const captchaToken = await executeRecaptcha("resend_verification");
      await resendVerificationEmail(email, captchaToken);
      setCooldown(resendCooldownSeconds);
      enqueueSnackbar("A new verification email has been sent.", {
        variant: "success",
      });
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
          <VerificationIllustration />
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#071955] sm:text-5xl">
            Almost there!
          </h1>
          <p className="mt-2 text-xl font-bold text-[#071955]">
            We&apos;ve sent a <span className="text-[#1264f7]">verification link</span> to your email.
          </p>
          <div className="mt-5 h-1 w-14 rounded-full bg-[#1264f7]" />
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Please check your inbox and click the link to verify your account and start using IcyPlay.
          </p>

          <div className="mt-7 w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <InfoRow icon={<EmailOutlined fontSize="small" />} title="Check your inbox">
              We sent a verification email to<br />
              <strong className="break-all font-bold text-[#1264f7]">
                {email || "your registered email address"}
              </strong>
            </InfoRow>
            <div className="border-t border-slate-100" />
            <InfoRow icon={<SearchOutlined fontSize="small" />} title="Don&apos;t see it?">
              Check your spam or promotions folder. Sometimes our email ends up there.
            </InfoRow>
            <div className="border-t border-slate-100" />
            <InfoRow icon={<ReplayOutlined fontSize="small" />} title="Still can&apos;t find it?">
              You can request a new verification email if needed.
            </InfoRow>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={!email || isSending || cooldown > 0}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1264f7] px-5 text-lg font-bold text-white shadow-[0_12px_28px_rgba(18,100,247,0.25)] transition hover:bg-[#071955] disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <SendOutlined fontSize="small" />
            {isSending
              ? "Sending..."
              : cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Resend verification email"}
          </button>

          <Link
            href="/sign-in"
            className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-5 text-lg font-bold text-[#164eaa] transition hover:bg-blue-50"
          >
            <ArrowBackOutlined fontSize="small" /> Back to login
          </Link>

          <div className="mt-7 flex w-full items-center gap-4 rounded-2xl bg-blue-50/90 p-5 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1264f7] shadow-sm">
              <HeadsetMicOutlined />
            </span>
            <div className="flex-1">
              <p className="text-base font-extrabold text-[#071955]">Need help?</p>
              <p className="mt-1 text-base leading-7 text-slate-600">Contact our support team and we&apos;ll be happy to assist you.</p>
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
