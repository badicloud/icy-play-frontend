"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { ApiError } from "@/services/api";
import { getMyRewards, type MyClaimStub, type MyVoucher } from "@auth/myRewardsApi";
import { formatSessionDate } from "@auth/openPlayApi";
import PublicHeader from "./PublicHeader";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

/** "Expires in 3 days", "Expires today", for what is still to use. */
function countdown(iso: string) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

  if (days <= 0) return "Expires today";
  return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
}

const voucherBadge: Record<MyVoucher["status"], { text: string; tone: string }> = {
  Available: { text: "Ready to use", tone: "bg-emerald-100 text-emerald-800" },
  Reserved: { text: "Being used", tone: "bg-blue-100 text-blue-800" },
  Used: { text: "Used", tone: "bg-slate-100 text-slate-500" },
  Expired: { text: "Expired", tone: "bg-slate-100 text-slate-500" },
};

const stubBadge: Record<MyClaimStub["status"], { text: string; tone: string }> = {
  Given: { text: "To collect", tone: "bg-amber-100 text-amber-900" },
  Claimed: { text: "Collected", tone: "bg-slate-100 text-slate-500" },
  Expired: { text: "Expired", tone: "bg-slate-100 text-slate-500" },
};

function VoucherCard({ voucher }: { voucher: MyVoucher }) {
  const live = voucher.status === "Available";

  return (
    <li
      className={`rounded-[24px] border p-5 ${
        live ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-slate-200 bg-white opacity-75"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-[#071955]">{voucher.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">at {voucher.facilityName}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${voucherBadge[voucher.status].tone}`}>
          {voucherBadge[voucher.status].text}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Best player at {voucher.wonAt}, {formatSessionDate(voucher.wonOn)}.
      </p>
      <p className={`mt-1 text-sm font-semibold ${live ? "text-emerald-800" : "text-slate-500"}`}>
        {voucher.status === "Used" && voucher.usedAt
          ? `Used ${date(voucher.usedAt)}`
          : voucher.status === "Expired"
            ? `Expired ${date(voucher.expiresAt)}`
            : `Valid until ${date(voucher.expiresAt)} · ${countdown(voucher.expiresAt)}`}
      </p>
      {live && (
        <p className="mt-2 text-xs text-slate-500">
          Taken off automatically when you join an open play at {voucher.facilityName}.
        </p>
      )}
    </li>
  );
}

function ClaimStubCard({ stub }: { stub: MyClaimStub }) {
  const [showing, setShowing] = useState(false);
  const live = stub.status === "Given";

  return (
    <li className={`rounded-[24px] border p-5 ${live ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white" : "border-slate-200 bg-white opacity-75"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-[#071955]">{stub.prize}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">at {stub.facilityName}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stubBadge[stub.status].tone}`}>
          {stubBadge[stub.status].text}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Best player at {stub.wonAt}
        {stub.wonOn ? `, ${formatSessionDate(stub.wonOn)}` : ""}.
      </p>
      <p className={`mt-1 text-sm font-semibold ${live ? "text-amber-900" : "text-slate-500"}`}>
        {stub.status === "Claimed" && stub.claimedAt
          ? `Collected ${date(stub.claimedAt)}`
          : stub.expiresAt
            ? stub.status === "Expired"
              ? `Expired ${date(stub.expiresAt)}`
              : `Collect by ${date(stub.expiresAt)} · ${countdown(stub.expiresAt)}`
            : ""}
      </p>

      {live && (
        <div className="mt-4">
          {showing ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-amber-200">
              <QRCodeCanvas value={stub.code} size={196} marginSize={2} level="M" />
              <p className="font-mono text-2xl font-bold tracking-[0.2em] text-[#071955]">{stub.code}</p>
              <p className="text-center text-xs text-slate-500">
                Show this at the {stub.facilityName} desk. They scan it or type the code, then hand you your prize.
              </p>
              <button type="button" onClick={() => setShowing(false)} className="text-sm font-semibold text-slate-500">
                Hide
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowing(true)}
              className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Show claim stub
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A player's rewards for being a best player: vouchers taken off their next
 * open play at the venue, and claim stubs for prizes collected at the desk —
 * each with the date it runs out.
 */
function MyRewardsView() {
  const rewards = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards, staleTime: 0, refetchOnMount: "always" });

  const vouchers = rewards.data?.vouchers ?? [];
  const stubs = rewards.data?.claimStubs ?? [];

  return (
    <main className="min-h-screen bg-[#f5f9ff]">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#071955]">My rewards</h1>
        <p className="mt-1 text-slate-600">
          What you have won as a best player at an open play. Use them before they run out.
        </p>

        {rewards.isPending ? (
          <div className="mt-6 h-40 animate-pulse rounded-[24px] border border-slate-200 bg-white" />
        ) : rewards.isError ? (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-red-800">
            {rewards.error instanceof ApiError ? rewards.error.message : "Your rewards could not be loaded."}
          </p>
        ) : vouchers.length === 0 && stubs.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-slate-950">No rewards yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Win the most games at an open play, and the venue&apos;s reward for best players lands here.
            </p>
            <Link
              href="/open-play"
              className="mt-4 inline-block rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Find an open play
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {stubs.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Prizes to collect</h2>
                <ul className="mt-3 space-y-4">
                  {stubs.map((stub) => (
                    <ClaimStubCard key={stub.claimStubId} stub={stub} />
                  ))}
                </ul>
              </section>
            )}
            {vouchers.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vouchers</h2>
                <ul className="mt-3 space-y-4">
                  {vouchers.map((voucher) => (
                    <VoucherCard key={voucher.voucherId} voucher={voucher} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default MyRewardsView;
