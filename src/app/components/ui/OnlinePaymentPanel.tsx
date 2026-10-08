"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient, API_ENDPOINTS } from "@/services/api";
import { peso, type CheckoutStarted } from "@auth/bookingApi";
import HoldCountdown from "./HoldCountdown";

/**
 * What the payment gateway said when it sent the customer back, read from the
 * address bar after mount — not through useSearchParams, so a page needs no
 * Suspense boundary for it. It only changes the words on a page: whether
 * anything is paid is the server's to say, told by the gateway.
 */
export function useReturnedFromGateway() {
  const [returned, setReturned] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get("payment");

    if (outcome === "success" || outcome === "cancelled") {
      setReturned(outcome);
    }
  }, []);

  return returned;
}

/**
 * Step two for a venue paid online: one button to the payment gateway. The
 * same for a booking, an upgrade and an open play — only what is being paid
 * for changes.
 *
 * The gateway's fee is not worked out here. It depends on how the customer
 * pays — QR Ph costs less than a card — and the gateway adds it once they
 * pick, on its own page, so a figure here would be the wrong one for most.
 */
export function OnlinePaymentPanel({
  amount,
  holdsUntil,
  what = "court",
  cancelled,
  onExpired,
  startCheckout,
  confirmsWhat = "Your booking is confirmed",
}: {
  amount: number;
  holdsUntil: string;
  /** What is being held while they pay: a court, or a spot. */
  what?: string;
  /** They went to the gateway and came back without paying. */
  cancelled: boolean;
  onExpired: () => void;
  startCheckout: () => Promise<CheckoutStarted>;
  /** What happens the moment it goes through, said to the customer. */
  confirmsWhat?: string;
}) {
  const [problem, setProblem] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: startCheckout,
    // A full navigation, not a router push: the gateway is another site.
    onSuccess: (started) => window.location.assign(started.checkoutUrl),
    onError: (error) =>
      setProblem(error instanceof ApiError ? error.message : "That did not work. Try again."),
  });

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
  purpose: "Booking" | "BookingUpgrade" | "OpenPlayRegistration";
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
