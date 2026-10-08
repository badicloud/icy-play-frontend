"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import Pager from "@/app/components/ui/Pager";
import {
  attentionReasonText,
  paymentMethodText,
  type DeskTransaction,
} from "@auth/deskApi";
import {
  useDeskTransactions,
  useDeskVenues,
  useMarkDeskTransactionsSeen,
} from "@auth/hooks/useDesk";
import { peso } from "../BookingDetails";

const purposeText: Record<DeskTransaction["purpose"], string> = {
  Booking: "Booking",
  BookingUpgrade: "Upgrade",
  OpenPlayRegistration: "Open play",
};

function when(iso: string | null) {
  if (!iso) {
    return "";
  }

  return new Date(iso).toLocaleString("en-PH", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * One payment: who, for what, how, and what arrived. The figures are the
 * gateway's own, so the owner can match a line here to a line on PayMongo.
 */
export function TransactionRow({ transaction, compact = false }: { transaction: DeskTransaction; compact?: boolean }) {
  const attention = transaction.status === "NeedsAttention";

  return (
    <li
      className={`rounded-2xl border px-5 py-4 ${
        attention ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-bold text-[#071955]">
            {transaction.customerName}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {purposeText[transaction.purpose]}
            </span>
            {transaction.isNew && !attention && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#164eaa]">
                New
              </span>
            )}
            {attention && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                <WarningAmberOutlined sx={{ fontSize: 13 }} aria-hidden />
                Needs attention
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {transaction.description ?? transaction.facilityName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {when(transaction.paidAt)} · {paymentMethodText(transaction.paymentMethod)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-extrabold text-[#071955]">
            {transaction.netAmount === null ? "—" : peso(transaction.netAmount)}
          </p>
          {!compact && transaction.amountCharged !== null && (
            <p className="text-xs font-semibold text-slate-400">
              Customer paid {peso(transaction.amountCharged)}, fee{" "}
              {peso(transaction.processingFee ?? 0)}
            </p>
          )}
        </div>
      </div>

      {attention && (
        <p className="mt-3 text-sm font-semibold text-amber-900">
          {attentionReasonText(transaction.attentionReason)} The money is in; nothing has been
          refunded. Contact {transaction.customerName} ({transaction.customerEmail}) to sort it out.
        </p>
      )}

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Court or fee {peso(transaction.venueAmount)} · Platform fee {peso(transaction.platformFee)}
          </span>
          {transaction.reference && (
            <span>
              PayMongo ref <span className="font-mono">{transaction.reference}</span>
            </span>
          )}
          {transaction.bookingId && (
            <Link
              href={`/desk/bookings?booking=${transaction.bookingId}`}
              className="font-bold text-[#164eaa] hover:text-[#071955]"
            >
              Open the booking
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Payments made online at this person's venues. What a venue paid online has
 * in place of the receipt queue: nothing to check, everything to know about,
 * and the few that could not settle themselves kept at the top.
 */
function DeskTransactionsView() {
  const venues = useDeskVenues();
  const [facilityId, setFacilityId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const transactions = useDeskTransactions({
    facilityId: facilityId === "" ? null : facilityId,
    page,
    pageSize: perPage,
  });

  // Opening the list is reading it: this person's badge clears, and nobody
  // else's. Once per visit, after the first page has loaded, so what was new
  // is still marked new on screen while they read it.
  const seen = useMarkDeskTransactionsSeen();
  const marked = useRef(false);

  useEffect(() => {
    if (!marked.current && transactions.isSuccess) {
      marked.current = true;
      seen.mutate();
    }
  }, [transactions.isSuccess, seen]);

  const rows = transactions.data?.data ?? [];
  const pagination = transactions.data?.pagination;
  const manyVenues = (venues.data?.length ?? 0) > 1;

  return (
    <main className="text-slate-950">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Breadcrumbs trail={[{ label: "Venue desk", href: "/desk" }, { label: "Online transactions" }]} />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Online transactions
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Everything paid online at your venues. Each one confirmed itself — there is nothing to
          check. The amount on the right is what arrives after the payment fee.
        </p>

        {manyVenues && (
          <div className="mt-6">
            <select
              value={facilityId}
              onChange={(event) => {
                setFacilityId(event.target.value);
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              aria-label="Venue"
            >
              <option value="">All venues</option>
              {venues.data?.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {transactions.isPending ? (
          <div className="mt-8 space-y-3">
            <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        ) : transactions.isError ? (
          <p className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
            These could not be loaded just now. Please refresh the page.
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
            No online payments yet. They appear here the moment a customer pays.
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}

        {pagination && pagination.totalItems > 0 && (
          <Pager
            page={page}
            pageSize={perPage}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            noun={{ one: "transaction", many: "transactions" }}
            label="Transaction pages"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPerPage(size);
              setPage(1);
            }}
          />
        )}
      </div>
    </main>
  );
}

export default DeskTransactionsView;
