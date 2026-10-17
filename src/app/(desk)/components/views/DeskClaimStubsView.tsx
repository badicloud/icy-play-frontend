"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { claimStub, getClaimStubs, type ClaimStub, type ClaimStubStatus } from "@auth/claimStubsApi";
import { formatSessionDate } from "@auth/openPlayApi";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import QrScanner from "../QrScanner";

function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f9ff] pb-16">
      <div className="mx-auto max-w-5xl px-6 pt-8 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Venue desk", href: "/desk" },
            { label: "Open play", href: "/desk/open-play" },
            { label: "Claim stubs" },
          ]}
        />
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

const badge: Record<ClaimStubStatus, { text: string; tone: string }> = {
  Given: { text: "Waiting to be claimed", tone: "bg-amber-100 text-amber-900" },
  Claimed: { text: "Claimed", tone: "bg-emerald-100 text-emerald-800" },
  Expired: { text: "Expired", tone: "bg-slate-100 text-slate-500" },
  Available: { text: "Not given yet", tone: "bg-blue-50 text-blue-700" },
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

/**
 * An open play's prizes, as claim stubs: who was given one, and marking it
 * claimed when the player shows it — by typing the code or scanning its QR.
 */
function DeskClaimStubsView() {
  const params = useSearchParams();
  const openPlayId = params.get("openPlay") ?? "";
  const client = useQueryClient();
  const key = ["desk-claim-stubs", openPlayId];
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState<ClaimStub | null>(null);

  const stubs = useQuery({
    queryKey: key,
    queryFn: () => getClaimStubs(openPlayId),
    enabled: openPlayId !== "",
    staleTime: 0,
    refetchOnMount: "always",
  });

  const claim = useMutation({
    mutationFn: (typed: string) => claimStub(typed),
    onSuccess: (claimed) => {
      setDone(claimed);
      setCode("");
      setScanning(false);
      client.invalidateQueries({ queryKey: key });
    },
    onError: () => setDone(null),
  });

  if (openPlayId === "") {
    return (
      <Page>
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">This link is missing the open play.</p>
      </Page>
    );
  }

  const list = stubs.data ?? [];
  const title = list[0]?.openPlayTitle ?? "Open play";
  const count = (status: ClaimStubStatus) => list.filter((stub) => stub.status === status).length;

  return (
    <Page>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Claim stubs</h1>
          <p className="mt-2 text-lg font-semibold text-[#071955]">{title}</p>
          {list.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {list.length} prizes of &ldquo;{list[0].prize}&rdquo; · {count("Available")} still to give ·{" "}
              {count("Given")} waiting · {count("Claimed")} claimed · {count("Expired")} expired
            </p>
          )}
        </div>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-[#071955]">Mark a prize claimed</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ask the player for their claim stub, then type its code or scan its QR.
          </p>
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim() !== "") claim.mutate(code);
            }}
          >
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                claim.reset();
              }}
              placeholder="7KQ2-M9XA"
              aria-label="Claim stub code"
              maxLength={12}
              className="w-44 rounded-full border border-slate-200 px-4 py-2 font-mono text-sm tracking-widest outline-none focus:border-[#2563EB]"
            />
            <button
              type="submit"
              disabled={claim.isPending || code.trim() === ""}
              className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {claim.isPending ? "Checking…" : "Mark claimed"}
            </button>
            <button
              type="button"
              onClick={() => setScanning((on) => !on)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              {scanning ? "Stop scanning" : "Scan QR"}
            </button>
          </form>

          {scanning && (
            <div className="mt-4 max-w-sm">
              <QrScanner onScan={(text) => claim.mutate(text)} paused={claim.isPending} />
            </div>
          )}

          {claim.isError && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {claim.error instanceof ApiError ? claim.error.message : "That did not work. Try again."}
            </p>
          )}
          {done && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              Claimed: {done.prize} for {done.playerName}. Hand it over.
            </p>
          )}
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-[#071955]">All stubs</h2>
          {stubs.isPending ? (
            <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />
          ) : stubs.isError ? (
            <p className="mt-3 text-sm text-red-700">
              {stubs.error instanceof ApiError ? stubs.error.message : "The claim stubs could not be loaded."}
            </p>
          ) : list.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No claim stubs. Set a prize as the reward for best players on the open play first.
            </p>
          ) : (
            <ul className="mt-3 max-h-[70vh] divide-y divide-slate-100 overflow-y-auto pr-1">
              {list.map((stub) => (
                <li key={stub.claimStubId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold tracking-widest text-slate-900">{stub.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge[stub.status].tone}`}>
                        {badge[stub.status].text}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600">
                      {stub.playerName
                        ? `${stub.playerName} · best player on ${stub.sessionDate ? formatSessionDate(stub.sessionDate) : "—"}`
                        : stub.prize}
                    </span>
                  </span>
                  <span className="text-right text-xs text-slate-500">
                    {stub.status === "Claimed" && (
                      <>
                        Claimed {when(stub.claimedAt)}
                        {stub.claimedByName ? ` by ${stub.claimedByName}` : ""}
                      </>
                    )}
                    {stub.status === "Given" && <>Valid until {when(stub.expiresAt)}</>}
                    {stub.status === "Expired" && <>Expired {when(stub.expiresAt)}</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}

export default DeskClaimStubsView;
