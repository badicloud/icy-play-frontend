import { apiClient, API_ENDPOINTS } from "@/services/api";

/** A best player's voucher: money off their next open play at the venue that gave it. */
export type MyVoucher = {
  voucherId: string;
  facilityId: string;
  facilityName: string;
  /** "₱50 off an open play", "20% off an open play, up to ₱100". */
  label: string;
  discountKind: "Fixed" | "Percentage";
  discountValue: number;
  /** A percentage voucher's most it takes off; null for no limit. */
  maxDiscount: number | null;
  /** Usable, held for a registration being paid, used, or past its date. */
  status: "Available" | "Reserved" | "Used" | "Expired";
  /** The open play it was won at, and the date. */
  wonAt: string;
  wonOn: string;
  givenAt: string;
  expiresAt: string;
  usedAt: string | null;
};

/** A best player's claim stub: what to show at the venue's desk to collect a prize. */
export type MyClaimStub = {
  claimStubId: string;
  facilityName: string;
  wonAt: string;
  wonOn: string | null;
  prize: string;
  /** "7KQ2-M9XA": shown to the desk, and in the QR. */
  code: string;
  status: "Given" | "Claimed" | "Expired";
  expiresAt: string | null;
  claimedAt: string | null;
};

export type MyRewards = {
  vouchers: MyVoucher[];
  claimStubs: MyClaimStub[];
};

/**
 * What the voucher takes off a fee, as the server works it out: a percentage
 * to the centavo, no more than its limit, never more than the fee. Only to
 * show; the server's figure is the one charged.
 */
export function voucherOff(voucher: MyVoucher, fee: number) {
  let off =
    voucher.discountKind === "Percentage"
      ? Math.round(fee * voucher.discountValue) / 100
      : voucher.discountValue;

  if (voucher.maxDiscount !== null) off = Math.min(off, voucher.maxDiscount);

  return Math.max(0, Math.min(off, Math.max(fee, 0)));
}

export function getMyRewards() {
  return apiClient.get<MyRewards>(API_ENDPOINTS.MY_REWARDS);
}
