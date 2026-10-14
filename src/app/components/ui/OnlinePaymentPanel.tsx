"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient, API_ENDPOINTS } from "@/services/api";
import { peso, type CheckoutStarted } from "@auth/bookingApi";
import {
  getPaymentOptions,
  startPaymentMethod,
  type PaymentAttempt,
  type PaymentOptions,
  type PaymentPurpose,
} from "@auth/paymentApi";
import HoldCountdown from "./HoldCountdown";

/** What the gateway said when it sent the customer back, if it did. */
export type GatewayReturn = "success" | "cancelled" | "returned" | null;

/**
 * What the payment gateway said when it sent the customer back, read from the
 * address bar after mount — not through useSearchParams, so a page needs no
 * Suspense boundary for it. It only changes the words on a page: whether
 * anything is paid is the server's to say, told by the gateway.
 *
 * "returned" is an e-wallet sending the customer back from our own page's
 * payment: it says nothing about whether they paid, only that they are back.
 */
export function useReturnedFromGateway() {
  const [returned, setReturned] = useState<GatewayReturn>(null);

  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get("payment");

    if (outcome === "success" || outcome === "cancelled" || outcome === "returned") {
      setReturned(outcome);
    }
  }, []);

  return returned;
}

/**
 * Step two for a venue paid online. The same for a booking, an upgrade and an
 * open play — only what is being paid for changes.
 *
 * The server says which way it looks. "Hosted": one button to PayMongo's own
 * page, where the customer picks how to pay and the gateway adds its fee.
 * "Integrated": the customer picks here, sees each method's total before
 * choosing, scans a QR Ph code without leaving, or goes straight to GCash or
 * Maya. Venues paid by receipt never reach this at all.
 */
export function OnlinePaymentPanel({
  purpose,
  subjectId,
  refreshKey,
  amount,
  holdsUntil,
  what = "court",
  cancelled,
  returnedFromWallet = false,
  onExpired,
  startCheckout,
  confirmsWhat = "Your booking is confirmed",
  startImmediately = false,
  onAutoStart,
}: {
  purpose: PaymentPurpose;
  subjectId: string;
  /** The query to read again once a payment may have gone through: the booking, upgrade or registration. */
  refreshKey: readonly unknown[];
  amount: number;
  holdsUntil: string;
  /** What is being held while they pay: a court, or a spot. */
  what?: string;
  /** They went to the gateway and came back without paying. */
  cancelled: boolean;
  /** Back from an e-wallet started on our own page; whether they paid is not known yet. */
  returnedFromWallet?: boolean;
  onExpired: () => void;
  startCheckout: () => Promise<CheckoutStarted>;
  /** What happens the moment it goes through, said to the customer. */
  confirmsWhat?: string;
  /**
   * Open the gateway at once, without waiting for the button, when the
   * gateway's own page is the one used. A loading state shows only for as
   * long as the gateway takes to answer; if it cannot be opened, the panel
   * comes back with the reason and its button to try again.
   */
  startImmediately?: boolean;
  /** Called once when it opens the gateway by itself, so the page can remember it did. */
  onAutoStart?: () => void;
}) {
  const options = useQuery({
    queryKey: ["payment-options", purpose, subjectId],
    queryFn: () => getPaymentOptions(purpose, subjectId),
    retry: false,
    // While a QR code is up or an e-wallet is being waited on, ask again: the
    // server says when the code has run out or the e-wallet declined.
    refetchInterval: (query) =>
      query.state.data?.experience === "Integrated" && query.state.data.current?.status === "Pending"
        ? 4000
        : false,
  });

  // The options cannot be read — the server is older, or not answering —
  // and the gateway's own page still works: it is the fallback.
  const hosted = options.isError || options.data?.experience === "Hosted";

  if (options.data?.experience === "Integrated") {
    return (
      <IntegratedPayment
        purpose={purpose}
        subjectId={subjectId}
        refreshKey={refreshKey}
        options={options.data}
        holdsUntil={holdsUntil}
        what={what}
        returnedFromWallet={returnedFromWallet}
        onExpired={onExpired}
        confirmsWhat={confirmsWhat}
      />
    );
  }

  return (
    <HostedPayment
      ready={hosted}
      amount={amount}
      holdsUntil={holdsUntil}
      what={what}
      cancelled={cancelled}
      onExpired={onExpired}
      startCheckout={startCheckout}
      confirmsWhat={confirmsWhat}
      startImmediately={startImmediately}
      onAutoStart={onAutoStart}
    />
  );
}

/**
 * One button to PayMongo's own checkout page.
 *
 * The gateway's fee is not worked out here. It depends on how the customer
 * pays — QR Ph costs less than a card — and the gateway adds it once they
 * pick, on its own page, so a figure here would be the wrong one for most.
 */
function HostedPayment({
  ready,
  amount,
  holdsUntil,
  what,
  cancelled,
  onExpired,
  startCheckout,
  confirmsWhat,
  startImmediately,
  onAutoStart,
}: {
  /** False while the server has not yet said which page is used. */
  ready: boolean;
  amount: number;
  holdsUntil: string;
  what: string;
  cancelled: boolean;
  onExpired: () => void;
  startCheckout: () => Promise<CheckoutStarted>;
  confirmsWhat: string;
  startImmediately: boolean;
  onAutoStart?: () => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const start = useMutation({
    mutationFn: startCheckout,
    onSuccess: (started) => {
      setLeaving(true);
      // A full navigation, not a router push: the gateway is another site.
      window.location.assign(started.checkoutUrl);
    },
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  // Started by itself once, and remembered as such: the page around this
  // stops asking for it the moment it begins, and the loading state must not
  // give way to the button while the gateway is still opening.
  const [auto, setAuto] = useState(false);
  const startedOnce = useRef(false);

  useEffect(() => {
    if (ready && startImmediately && !startedOnce.current) {
      startedOnce.current = true;
      setAuto(true);
      onAutoStart?.();
      start.mutate();
    }
  }, [ready, startImmediately, start, onAutoStart]);

  // Not yet told which page is used, and about to go to one by itself.
  if (!ready && startImmediately) {
    return <NavigatingToPayment what={what} />;
  }

  if (!ready) {
    return <LoadingOptions />;
  }

  // On the way to the gateway, by itself or by the button: nothing to read or
  // press here until its page takes over.
  if (((startImmediately || auto) && problem === null && !start.isError) || leaving) {
    return <NavigatingToPayment what={what} />;
  }

  return (
    <>
      <HoldCountdown holdsUntil={holdsUntil} onExpired={onExpired} what={what} paidOnline />

      {cancelled && (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
          The payment was not finished, so nothing was charged. Your {what} is still held — you
          can pay below until the time runs out.
        </p>
      )}

      <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#071955]">Pay online</h2>
        <p className="mt-1 font-medium text-slate-600">
          Pay {peso(amount)} by QR Ph, GCash, Maya or card. {confirmsWhat} the moment the payment
          goes through.
        </p>

        <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
          <li>
            A small processing fee is added, depending on how you pay. QR Ph costs the least;
            cards cost the most. You see the exact amount before you confirm.
          </li>
          <li>You are taken to our payment partner, PayMongo, and brought back here after.</li>
        </ul>

        <button
          type="button"
          disabled={start.isPending}
          onClick={() => {
            setProblem(null);
            start.mutate();
          }}
          className={`mt-5 w-full rounded-full px-6 py-3.5 text-sm font-semibold transition sm:w-auto ${
            start.isPending
              ? "cursor-wait bg-slate-200 text-slate-500"
              : "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          }`}
        >
          {start.isPending ? "Opening the payment page…" : `Pay ${peso(amount)} online`}
        </button>

        {problem && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
      </section>
    </>
  );
}

/** How each method is named and described on our page. */
const methodLabels: Record<string, { name: string; hint: string }> = {
  qrph: { name: "QR Ph", hint: "Scan with GCash, Maya or any bank app" },
  gcash: { name: "GCash", hint: "Log in and approve in GCash" },
  paymaya: { name: "Maya", hint: "Log in and approve in Maya" },
  card: { name: "Debit or credit card", hint: "Visa or Mastercard, on PayMongo's secure page" },
};

function methodName(method: string) {
  return methodLabels[method]?.name ?? method;
}

/** What the gateway said went wrong, in words a customer can act on. */
function failureWords(attempt: PaymentAttempt) {
  if (attempt.failureReason === "qrph.expired") {
    return "The QR code ran out before it was paid. Nothing was charged.";
  }

  return `The ${methodName(attempt.method)} payment did not go through, so nothing was charged.`;
}

/**
 * The customer picks how to pay on our own page: each method with its total
 * before they choose, a QR Ph code shown right here, GCash or Maya straight
 * to their app — and back here whatever happens there.
 */
function IntegratedPayment({
  purpose,
  subjectId,
  refreshKey,
  options,
  holdsUntil,
  what,
  returnedFromWallet,
  onExpired,
  confirmsWhat,
}: {
  purpose: PaymentPurpose;
  subjectId: string;
  refreshKey: readonly unknown[];
  options: PaymentOptions;
  holdsUntil: string;
  what: string;
  returnedFromWallet: boolean;
  onExpired: () => void;
  confirmsWhat: string;
}) {
  const client = useQueryClient();
  const current = options.current;
  const firstMethod = options.methods[0]?.method ?? "card";

  const [selected, setSelected] = useState(current?.method || firstMethod);
  const [problem, setProblem] = useState<string | null>(null);
  const [leavingFor, setLeavingFor] = useState<string | null>(null);
  // Back from the e-wallet, and still waiting on its word — until the
  // customer says they would rather pay another way.
  const [stoppedWaiting, setStoppedWaiting] = useState(false);

  const start = useMutation({
    mutationFn: (method: string) => startPaymentMethod(purpose, subjectId, method),
    onSuccess: (attempt) => {
      client.setQueryData<PaymentOptions>(["payment-options", purpose, subjectId], (old) =>
        old ? { ...old, current: attempt } : old,
      );

      // Everything but QR Ph is paid on another page.
      if (attempt.status === "Pending" && attempt.method !== "qrph" && attempt.redirectUrl) {
        setLeavingFor(attempt.method);
        window.location.assign(attempt.redirectUrl);
      }
    },
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

  const attempt = current?.method === selected ? current : null;
  const qrUp = selected === "qrph" && attempt?.status === "Pending" && attempt.qrCodeImage !== null;
  const waitingOnWallet =
    returnedFromWallet && !stoppedWaiting && current !== null && current.status === "Pending" && current.method !== "qrph";

  // QR Ph is shown as soon as it is picked, without a second press — once
  // per pick, so a code that ran out waits for the customer to ask again.
  const autoShown = useRef<string | null>(null);

  useEffect(() => {
    if (selected !== "qrph" || attempt !== null || start.isPending || autoShown.current === "qrph") {
      return;
    }

    autoShown.current = "qrph";
    start.mutate("qrph");
  }, [selected, attempt, start]);

  // A QR code is up, or the customer is back from their e-wallet: ask the
  // gateway itself every few seconds too, in case its webhook never comes.
  useVerifyWhileConfirming({
    purpose,
    subjectId,
    active: qrUp || waitingOnWallet,
    refreshKey,
  });

  function pick(method: string) {
    setProblem(null);
    setStoppedWaiting(true);
    setSelected(method);

    if (method !== "qrph") {
      autoShown.current = null;
    }
  }

  if (leavingFor !== null) {
    return <NavigatingToPayment what={what} to={methodName(leavingFor)} />;
  }

  if (waitingOnWallet) {
    return (
      <>
        <ConfirmingPayment />
        <button
          type="button"
          onClick={() => pick(current.method)}
          className="mt-3 text-sm font-semibold text-[#2563EB] hover:underline"
        >
          Pay another way instead
        </button>
      </>
    );
  }

  const quote = options.methods.find((method) => method.method === selected);

  return (
    <>
      <HoldCountdown holdsUntil={holdsUntil} onExpired={onExpired} what={what} paidOnline />

      <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#071955]">How do you want to pay?</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {confirmsWhat} the moment the payment goes through. Each total includes the small
          processing fee for that method, VAT included.
        </p>

        <div role="radiogroup" aria-label="Payment method" className="mt-4 grid gap-2">
          {options.methods.map((method, index) => (
            <MethodOption
              key={method.method}
              method={method.method}
              selected={selected === method.method}
              onPick={pick}
              total={peso(method.total)}
              fee={`+${peso(method.processingFee)} fee`}
              tag={index === 0 ? "Lowest fee" : undefined}
            />
          ))}
          <MethodOption
            method="card"
            selected={selected === "card"}
            onPick={pick}
            total={peso(options.amountDue)}
            fee="+ fee on the card page"
          />
        </div>

        {quote && (
          <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-slate-600">Amount due</dt>
              <dd className="font-bold text-[#071955]">{peso(quote.amountDue)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-slate-600">
                Processing fee ({methodName(selected)}, VAT incl.)
              </dt>
              <dd className="font-bold text-[#071955]">{peso(quote.processingFee)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 pt-1">
              <dt className="font-extrabold text-[#071955]">Total</dt>
              <dd className="text-xl font-extrabold text-[#071955]">{peso(quote.total)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6">
        {attempt?.status === "Failed" && (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {failureWords(attempt)} Your {what} is still held — try again or pick another way.
          </p>
        )}

        {selected === "qrph" ? (
          <QrPanel
            attempt={attempt}
            total={quote?.total ?? options.amountDue}
            starting={start.isPending}
            onNewCode={() => {
              setProblem(null);
              start.mutate("qrph");
            }}
          />
        ) : (
          <RedirectPanel
            method={selected}
            total={selected === "card" ? null : (quote?.total ?? null)}
            starting={start.isPending}
            onContinue={() => {
              setProblem(null);
              start.mutate(selected);
            }}
          />
        )}

        {problem && <p className="mt-3 text-sm font-semibold text-red-600">{problem}</p>}
      </section>
    </>
  );
}

function MethodOption({
  method,
  selected,
  onPick,
  total,
  fee,
  tag,
}: {
  method: string;
  selected: boolean;
  onPick: (method: string) => void;
  total: string;
  fee: string;
  tag?: string;
}) {
  const label = methodLabels[method] ?? { name: method, hint: "" };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onPick(method)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-[#2563EB] bg-blue-50/60 ring-1 ring-[#2563EB]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span
        aria-hidden
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? "border-[#2563EB] bg-[#2563EB] shadow-[inset_0_0_0_2px_white]" : "border-slate-300"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-bold text-[#071955]">
          {label.name}
          {tag && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              {tag}
            </span>
          )}
        </span>
        <span className="block text-sm text-slate-500">{label.hint}</span>
      </span>
      <span className="text-right">
        <span className="block font-bold text-[#071955]">{total}</span>
        <span className="block text-xs text-slate-500">{fee}</span>
      </span>
    </button>
  );
}

/** The QR Ph code, right here, with the time it has left by the server's count. */
function QrPanel({
  attempt,
  total,
  starting,
  onNewCode,
}: {
  attempt: PaymentAttempt | null;
  total: number;
  starting: boolean;
  onNewCode: () => void;
}) {
  const secondsLeft = useCountdown(attempt?.status === "Pending" ? attempt.secondsLeft : null);

  if (attempt?.status === "Pending" && attempt.qrCodeImage) {
    return (
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* A data URL from the server: next/image has nothing to optimise. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attempt.qrCodeImage}
          alt="QR Ph code to scan and pay"
          className="h-56 w-56 shrink-0 rounded-2xl border border-slate-200 bg-white p-2"
        />
        <div>
          <h3 className="text-lg font-bold text-[#071955]">Scan to pay {peso(attempt.total)}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Open any bank or e-wallet app — GCash, Maya, BPI, BDO and others — and scan this code.
          </p>
          {secondsLeft !== null && (
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Code expires in {formatSeconds(secondsLeft)}
            </p>
          )}
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-[#2563EB]"
              aria-hidden
            />
            Waiting for your payment… this page updates by itself.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={attempt.qrCodeImage}
              download="icyplay-qr-ph.png"
              className="inline-block rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-[#071955] hover:bg-slate-50"
            >
              Save QR image
            </a>
            {/* Test mode only: PayMongo's page that pretends to pay the code.
                A test code is still a real one, and scanning it pays for real. */}
            {attempt.redirectUrl && (
              <a
                href={attempt.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full border border-dashed border-amber-400 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Simulate payment (test mode)
              </a>
            )}
          </div>
          {attempt.redirectUrl && (
            <p className="mt-2 text-xs text-slate-500">
              Opens in a new tab, standing in for a phone scanning the code. Come back to this
              tab — it updates by itself once paid.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (starting) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#2563EB]"
          aria-hidden
        />
        Making your QR code…
      </p>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-[#071955]">Pay {peso(total)} by QR Ph</h3>
      <p className="mt-1 text-sm text-slate-600">
        Scan with any bank or e-wallet app. The code works for a limited time.
      </p>
      <button
        type="button"
        onClick={onNewCode}
        className="mt-4 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
      >
        {attempt?.status === "Failed" ? "Show a new QR code" : "Show QR code"}
      </button>
    </div>
  );
}

/** GCash, Maya or a card: paid on another page, and back here after. */
function RedirectPanel({
  method,
  total,
  starting,
  onContinue,
}: {
  method: string;
  /** Null for a card, whose fee PayMongo works out on its own page. */
  total: number | null;
  starting: boolean;
  onContinue: () => void;
}) {
  const name = methodName(method);

  return (
    <div>
      <h3 className="text-lg font-bold text-[#071955]">
        {total === null ? `Pay by ${name.toLowerCase()}` : `Pay ${peso(total)} with ${name}`}
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        {method === "card"
          ? "You enter your card on PayMongo's secure page, where its processing fee is shown before you pay, then come back here."
          : `You approve the payment in ${name}. Whether it goes through or not, you come back to this page.`}
      </p>
      <button
        type="button"
        disabled={starting}
        onClick={onContinue}
        className={`mt-4 rounded-full px-6 py-3 text-sm font-semibold transition ${
          starting
            ? "cursor-wait bg-slate-200 text-slate-500"
            : "bg-[#2563EB] text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        }`}
      >
        {starting ? "Opening…" : method === "card" ? "Continue to card payment" : `Continue to ${name}`}
      </button>
    </div>
  );
}

/**
 * Counts down from what the server last said, a second at a time, for the
 * words on the page only. Whether the code has run out is still the server's
 * to say: the options are asked again every few seconds.
 */
function useCountdown(fromServer: number | null) {
  const [left, setLeft] = useState(fromServer);
  const [from, setFrom] = useState(fromServer);

  // A fresh figure from the server replaces the count.
  if (fromServer !== from) {
    setFrom(fromServer);
    setLeft(fromServer);
  }

  useEffect(() => {
    if (from === null) {
      return;
    }

    const timer = window.setInterval(
      () => setLeft((value) => (value === null ? null : Math.max(0, value - 1))),
      1000,
    );

    return () => window.clearInterval(timer);
  }, [from]);

  return left;
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * While a page is "Confirming your payment", asks the server every few seconds
 * to check with the gateway itself — so a webhook that never arrives does not
 * leave the customer waiting for ever. The page then reads its own thing
 * again, which says whether it went through.
 */
export function useVerifyWhileConfirming({
  purpose,
  subjectId,
  active,
  refreshKey,
}: {
  purpose: PaymentPurpose;
  subjectId: string | null;
  active: boolean;
  /** The query to read again after each check: the booking, upgrade or registration. */
  refreshKey: readonly unknown[];
}) {
  const client = useQueryClient();

  useQuery({
    queryKey: ["payment-verify", purpose, subjectId],
    queryFn: async () => {
      await apiClient.post<void>(API_ENDPOINTS.PAYMENTS.VERIFY(purpose, subjectId!));
      await client.invalidateQueries({ queryKey: refreshKey });
      return true;
    },
    enabled: active && subjectId !== null,
    refetchInterval: active ? 4000 : false,
    retry: false,
  });
}

/** Asking the server how this venue is paid online. Usually too quick to see. */
function LoadingOptions() {
  return (
    <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#2563EB]"
        aria-hidden
      />
      Getting your payment options…
    </p>
  );
}

/** On the way to the gateway: shown only until its page replaces this one. */
function NavigatingToPayment({ what, to }: { what: string; to?: string }) {
  return (
    <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-blue-200 bg-blue-50 p-6">
      <span
        className="h-8 w-8 shrink-0 animate-spin rounded-full border-4 border-blue-200 border-t-[#2563EB]"
        aria-hidden
      />
      <div>
        <h2 className="text-lg font-bold text-[#071955]">
          {to ? `Taking you to ${to}…` : "Navigating you to payment…"}
        </h2>
        <p className="mt-1 text-slate-600">
          Your {what} is held while you pay.{" "}
          {to ? "You come back here after." : "Opening our payment partner, PayMongo."}
        </p>
      </div>
    </div>
  );
}

/** Back from the gateway, and its word not in yet. The page asks again until it is. */
export function ConfirmingPayment() {
  return (
    <div className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50 p-6">
      <h2 className="text-lg font-bold text-[#071955]">Confirming your payment…</h2>
      <p className="mt-1.5 text-slate-600">
        This usually takes a few seconds. You do not need to pay again — this page updates by
        itself, and we will email you once it is confirmed.
      </p>
    </div>
  );
}

/**
 * Paid, but after the hold had run out. The money is real and nothing is
 * refunded automatically: the venue decides what happens next, so the page
 * says who to talk to rather than "nothing was charged".
 */
export function PaidLate({ venueName }: { venueName: string }) {
  return (
    <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-bold text-amber-900">Your payment arrived after the hold ran out</h2>
      <p className="mt-1.5 text-amber-800">
        The hold only lasts a set time, and the payment came in after it. Your money is safe —{" "}
        {venueName} has been told and will get in touch about it. You do not need to pay again.
      </p>
    </div>
  );
}
