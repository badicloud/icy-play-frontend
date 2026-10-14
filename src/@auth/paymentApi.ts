import { apiClient, API_ENDPOINTS } from "@/services/api";

/** What is being paid for, in the server's words. */
export type PaymentPurpose = "Booking" | "BookingUpgrade" | "OpenPlayRegistration";

/**
 * "Hosted": the customer is sent to PayMongo's page and picks there.
 * "Integrated": they pick on our second step. A server setting.
 */
export type CheckoutExperience = "Hosted" | "Integrated";

/** One method and what it comes to, the gateway's fee (VAT included) on top. */
export type PaymentMethodQuote = {
  /** PayMongo's word: "qrph", "gcash", "paymaya". */
  method: string;
  amountDue: number;
  processingFee: number;
  total: number;
};

/**
 * One way of paying under way. Its time is counted by the server: a QR code
 * past its time comes back as Failed, whatever the page's own clock says.
 */
export type PaymentAttempt = {
  paymentId: string;
  /** "qrph", "gcash", "paymaya" or "card". */
  method: string;
  total: number;
  status: "Pending" | "Failed";
  /** A data URL, while the code can still be paid. */
  qrCodeImage: string | null;
  /** The e-wallet's page, or PayMongo's card page. */
  redirectUrl: string | null;
  /** Seconds a QR code has left, by the server's clock. */
  secondsLeft: number | null;
  failureReason: string | null;
};

export type PaymentOptions = {
  experience: CheckoutExperience;
  amountDue: number;
  methods: PaymentMethodQuote[];
  current: PaymentAttempt | null;
};

/** What the second step offers for this thing, and the attempt already under way. */
export function getPaymentOptions(purpose: PaymentPurpose, subjectId: string) {
  return apiClient.get<PaymentOptions>(API_ENDPOINTS.PAYMENTS.OPTIONS(purpose, subjectId));
}

/**
 * Starts paying by one method. Asked again for the same method, the server
 * hands back the attempt already open rather than a second one to pay.
 */
export function startPaymentMethod(purpose: PaymentPurpose, subjectId: string, method: string) {
  return apiClient.post<PaymentAttempt, { method: string }>(
    API_ENDPOINTS.PAYMENTS.START(purpose, subjectId),
    { method },
  );
}
