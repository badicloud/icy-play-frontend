"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { clock, getBookingReceipt, peso, type BookingReceipt } from "@auth/bookingApi";
import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

function methodName(method: string | null) {
  switch (method) {
    case "qrph":
      return "QR Ph";
    case "gcash":
      return "GCash";
    case "paymaya":
      return "Maya";
    case "card":
      return "Card";
    case "grab_pay":
      return "GrabPay";
    default:
      return method ?? "Online";
  }
}

function day(iso: string) {
  const [year, month, date] = iso.split("-").map(Number);

  return new Date(year, month - 1, date).toLocaleDateString("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function moment(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}

function Row({ label, value, strong = false }: { label: React.ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-extrabold" : "text-sm"}`}>
      <dt className={strong ? "text-[#071955]" : "text-slate-600"}>{label}</dt>
      <dd className="font-bold whitespace-nowrap text-[#071955]">{value}</dd>
    </div>
  );
}

/**
 * The receipt itself: what was booked, what the booking costs, and what was
 * paid on top — the gateway's fee, which its own receipt only shows inside a
 * total. Laid out to print on one page, so "Download" is the browser's own
 * Save as PDF.
 */
function Receipt({ receipt }: { receipt: BookingReceipt }) {
  const online = receipt.paymentChannel === "Direct";

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-8 print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#1767f5] uppercase">IcyPlay</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#071955]">Booking receipt</h1>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono font-bold text-[#071955]">{receipt.receiptNumber}</p>
          {receipt.confirmedAt && (
            <p className="text-slate-500">Confirmed {moment(receipt.confirmedAt)}</p>
          )}
        </div>
      </header>

      <section className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Billed to</p>
          <p className="mt-1 font-bold text-[#071955]">{receipt.customerName}</p>
          <p className="text-slate-500">{receipt.customerEmail}</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Venue</p>
          <p className="mt-1 font-bold text-[#071955]">{receipt.facilityName}</p>
          <p className="text-slate-500">
            {[receipt.contactPhone, receipt.contactEmail].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      <section className="mt-6">
        <p className="font-bold text-[#071955]">{receipt.courtName}</p>
        <p className="text-sm text-slate-500">{receipt.sportName}</p>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {/* Moved since it was paid for: what this payment bought, not the
              hours it is on now, which another payment may have paid for. */}
          {receipt.originalSummary && (
            <li className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="text-slate-700">{receipt.originalSummary}</span>
              <span className="font-semibold text-[#071955]">{peso(receipt.rentalTotal)}</span>
            </li>
          )}
          {receipt.slots.map((slot) => (
            <li key={`${slot.date}-${slot.startsAt}`} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="text-slate-700">
                {day(slot.date)} · {clock(slot.startsAt)} – {clock(slot.endsAt)}
              </span>
              <span className="font-semibold text-[#071955]">{peso(slot.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <dl className="mt-6 space-y-2">
        <Row label="Court rental" value={peso(receipt.rentalTotal)} />
        <Row label="IcyPlay platform fee" value={peso(receipt.platformFeeTotal)} />
        <div className="border-t border-slate-200 pt-2">
          <Row label="Booking total" value={peso(receipt.bookingTotal)} />
        </div>

        {receipt.payments.map((payment) =>
          payment.processingFee > 0 ? (
            <Row
              key={`${payment.reference}-fee`}
              label={
                <>
                  Payment processing fee
                  <span className="block text-xs text-slate-400">
                    {methodName(payment.paymentMethod)}, via PayMongo · VAT incl.
                  </span>
                </>
              }
              value={peso(payment.processingFee)}
            />
          ) : null,
        )}

        <div className="border-t-2 border-slate-300 pt-3">
          <Row label="Amount paid" value={peso(receipt.amountPaid)} strong />
        </div>
      </dl>

      <section className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 print:bg-transparent print:p-0">
        {online ? (
          receipt.payments.map((payment) => (
            <p key={payment.reference ?? payment.description}>
              Paid {moment(payment.paidAt)} with {methodName(payment.paymentMethod)}
              {payment.reference && (
                <>
                  {" "}
                  · PayMongo ref <span className="font-mono">{payment.reference}</span>
                </>
              )}
            </p>
          ))
        ) : (
          <p>Paid by GCash to {receipt.facilityName}, and checked by the venue.</p>
        )}
        {/* An upgrade is its own payment with its own receipt, emailed when it
            went through. Named here so it can be found, never added in. */}
        {(receipt.upgrades ?? []).map((upgrade) => (
          <p key={upgrade.receiptNumber} className="mt-1">
            Upgraded to {upgrade.toCourtName} since — a separate payment of {peso(upgrade.amountPaid)} with
            its own receipt, <span className="font-mono">{upgrade.receiptNumber}</span>, sent to your email.
          </p>
        ))}
      </section>

      <p className="mt-6 text-xs text-slate-400">
        This is IcyPlay&rsquo;s record of your payment, not an official receipt. For an official
        receipt for the court, ask {receipt.facilityName}.
      </p>
    </article>
  );
}

function BookingReceiptView({ bookingId }: { bookingId: string }) {
  const receipt = useQuery({
    queryKey: ["booking-receipt", bookingId],
    queryFn: () => getBookingReceipt(bookingId),
    enabled: bookingId !== "",
    retry: false,
  });

  return (
    <main className="min-h-screen bg-[#f5f9ff] print:bg-white">
      <div className="print:hidden">
        <PublicHeader />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8 print:max-w-none print:p-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/bookings/${bookingId}`}
            className="text-sm font-bold text-[#2563EB] underline-offset-4 hover:underline"
          >
            ← Back to the booking
          </Link>
          {receipt.data && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              Download or print
            </button>
          )}
        </div>

        {receipt.isPending ? (
          <p className="text-slate-500">Loading your receipt…</p>
        ) : receipt.isError || !receipt.data ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-extrabold text-[#071955]">No receipt yet</h1>
            <p className="mt-1.5 text-slate-600">
              A receipt is ready once the booking is confirmed.
            </p>
          </div>
        ) : (
          <Receipt receipt={receipt.data} />
        )}
      </div>

      <div className="print:hidden">
        <PublicFooter />
      </div>
    </main>
  );
}

export default BookingReceiptView;
