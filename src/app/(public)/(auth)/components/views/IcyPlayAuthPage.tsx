"use client";

import Link from "next/link";
import AuthJsForm from "@auth/forms/AuthJsForm";

type IcyPlayAuthPageProps = { mode: "signin" | "signup" };

function IcyPlayAuthPage({ mode }: IcyPlayAuthPageProps) {
  const isSignUp = mode === "signup";

  return (
    <main
      className={`min-h-screen text-slate-950 sm:px-4 lg:px-6 ${isSignUp ? "bg-[#f5f9ff]" : "bg-[#071955] bg-[radial-gradient(circle_at_12%_18%,rgba(22,101,255,0.55),transparent_32%),radial-gradient(circle_at_88%_82%,rgba(0,153,255,0.18),transparent_28%)]"}`}
    >
      <div
        className={`mx-auto min-h-screen w-full max-w-7xl overflow-hidden lg:grid ${isSignUp ? "lg:grid-cols-[40%_60%]" : "lg:grid-cols-[38%_62%]"}`}
      >
        <section
          className={`relative hidden min-h-screen overflow-hidden bg-transparent lg:flex lg:flex-col ${isSignUp ? "" : "justify-between"}`}
        >
          {!isSignUp && (
            <div className="absolute top-24 left-7 h-24 w-40 opacity-30 [background-image:radial-gradient(circle,rgba(56,189,248,0.9)_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          )}

          <Link
            href="/"
            className="relative z-10 inline-flex w-fit px-8 pt-5"
            aria-label="Back to IcyPlay home"
          >
            {isSignUp ? (
              <img
                src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
                alt="IcyPlay"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <span className="relative block h-16 w-44" aria-label="IcyPlay">
                <img
                  src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <img
                  src="/assets/images/logo/IcyPlay%20Logo%20Transparent.png"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-contain brightness-0 invert [clip-path:inset(0_46%_0_25%)]"
                />
              </span>
            )}
          </Link>

          {isSignUp ? (
            <div className="relative z-10 flex flex-1 flex-col items-center px-10 pt-12">
              <div className="absolute top-5 left-8 h-20 w-32 opacity-25 [background-image:radial-gradient(circle,#60a5fa_1.5px,transparent_1.5px)] [background-size:15px_15px]" />
              <h2 className="w-full max-w-md pl-[60px] text-left text-4xl font-black tracking-tight text-[#071955]">
                Join <span className="text-[#1264F7]">IcyPlay</span>
              </h2>
              <p className="mt-2 w-full max-w-md pl-[60px] text-left text-xl font-medium text-slate-600">
                and get started today!
              </p>

              <div className="mt-10 flex w-full max-w-md flex-col gap-7">
                {[
                  [
                    "calendar",
                    "Book any court",
                    "Find and book your favorite sports courts.",
                  ],
                  [
                    "clock",
                    "Save time",
                    "Instant booking in just a few clicks.",
                  ],
                  [
                    "shield",
                    "Secure & reliable",
                    "Your data and payments are always protected.",
                  ],
                ].map(([icon, title, description]) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1264F7] shadow-[0_8px_24px_rgba(37,99,235,0.12)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        {icon === "calendar" && (
                          <path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14M9 13h.01M13 13h.01M17 13h.01M9 17h.01M13 17h.01" />
                        )}
                        {icon === "clock" && (
                          <>
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 7v5l3 2" />
                          </>
                        )}
                        {icon === "shield" && (
                          <>
                            <path d="M12 3 5.5 6v5c0 4.5 2.4 7.6 6.5 10 4.1-2.4 6.5-5.5 6.5-10V6L12 3Z" />
                            <path d="m9.5 12 1.7 1.7 3.6-4" />
                          </>
                        )}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#071955]">
                        {title}
                      </h3>
                      <p className="mt-1 max-w-64 text-base leading-7 text-slate-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <img
                src="/assets/images/auth/registration_equipments.png"
                alt="IcyPlay sports equipment"
                className="mt-auto -ml-8 w-[110%] max-w-[560px] object-contain"
              />
            </div>
          ) : (
            <div className="relative z-10 mx-auto -my-1 flex w-full max-w-[310px] flex-col items-center gap-4 px-5">
              <img
                src="/assets/images/auth/badminton-card.png"
                alt="Badminton player"
                className="w-full -rotate-2 drop-shadow-xl"
              />
              <img
                src="/assets/images/auth/pickleball-card.png"
                alt="Pickleball player"
                className="w-full rotate-1 drop-shadow-xl"
              />
              <img
                src="/assets/images/auth/basketball-card.png"
                alt="Basketball player"
                className="w-full -rotate-1 drop-shadow-xl"
              />
            </div>
          )}

          {!isSignUp && (
            <div className="relative z-10 px-8 pb-10 text-white">
              <div className={"max-w-md"}>
                <h2 className="text-3xl font-black tracking-tight">
                  Play more.
                  <br />
                  Manage better.
                </h2>
                <p className="mt-3 text-base leading-7 text-blue-100">
                  Book your favorite court in seconds, or manage your sports
                  facility from one simple platform.
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          className={`relative flex min-h-screen items-center overflow-hidden bg-transparent px-5 sm:px-10 ${isSignUp ? "justify-center py-8 lg:px-16" : "justify-center py-20 lg:justify-start lg:pr-10 lg:pl-16"}`}
        >
          {isSignUp && (
            <div className="absolute right-4 bottom-5 h-28 w-48 opacity-25 [background-image:radial-gradient(circle,rgba(37,99,235,0.8)_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          )}
          {!isSignUp && (
            <div className="absolute right-5 bottom-3 h-24 w-44 opacity-30 [background-image:radial-gradient(circle,rgba(56,189,248,0.9)_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          )}
          <div
            className={`w-full ${isSignUp ? "max-w-[680px]" : "max-w-[640px]"}`}
          >
            <Link
              href="/"
              className="mb-6 inline-flex lg:hidden"
              aria-label="Back to IcyPlay home"
            >
              <img
                src="/assets/images/logo/IcyPlay%20Logo.png"
                alt="IcyPlay"
                className="h-16 w-auto object-contain"
              />
            </Link>

            <div
              className={`relative z-10 border border-slate-200/80 bg-white p-6 sm:p-9 ${isSignUp ? "rounded-[28px] shadow-[0_24px_70px_rgba(15,23,42,0.08)]" : "rounded-3xl shadow-[0_28px_80px_rgba(0,0,0,0.24)]"}`}
            >
              <p className="text-sm font-bold tracking-[0.16em] text-[#2563EB] uppercase">
                {isSignUp ? "Create account" : "Welcome back"}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071955] sm:text-4xl">
                {isSignUp ? (
                  "Create your IcyPlay account"
                ) : (
                  <>
                    Sign in to <span className="text-[#1264F7]">IcyPlay</span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-base text-slate-500">
                {isSignUp
                  ? "Fill in your details to get started with IcyPlay."
                  : "Access your account and manage your bookings."}
              </p>

              <div className="mt-6 [&_.MuiButton-contained]:bg-[#1257d5] [&_.MuiButton-contained]:font-bold [&_.MuiButton-contained]:normal-case [&_.MuiButton-contained]:shadow-none [&_.MuiButton-contained:hover]:bg-[#071955] [&_.MuiInputBase-root]:rounded-xl">
                <AuthJsForm formType={mode} />
              </div>

              {!isSignUp && (
                <p className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M12 3 5.5 6v5c0 4.5 2.4 7.6 6.5 10 4.1-2.4 6.5-5.5 6.5-10V6L12 3Z" />
                    <path d="m9.5 12 1.7 1.7 3.6-4" />
                  </svg>
                  Your data is secure with us.
                </p>
              )}
            </div>
            {isSignUp && (
                <p className="mt-5 text-center text-sm leading-6 text-slate-500">
                By continuing, you agree to IcyPlay's Terms of Service and
                Privacy Policy.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default IcyPlayAuthPage;
