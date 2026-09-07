import { apiClient, ApiError, API_ENDPOINTS } from "@/services/api";

export type RegistrationAccountType = "user" | "facility-owner";

export type RegistrationPayload = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
  captchaToken: string;
  accountType: RegistrationAccountType;
};

export type RegistrationResponse = {
  userId: string;
  profileId: string;
};

export { ApiError as RegistrationApiError };

export async function registerAccount(payload: RegistrationPayload) {
  const endpoint =
    payload.accountType === "facility-owner"
      ? API_ENDPOINTS.AUTH.REGISTER_FACILITY_OWNER
      : API_ENDPOINTS.AUTH.REGISTER_CUSTOMER;
  const body =
    payload.accountType === "facility-owner"
      ? {
          fullName: payload.displayName,
          email: payload.email,
          password: payload.password,
          businessName: payload.displayName,
          billingEmail: payload.email,
          billingPhone: payload.phone,
          acceptedTerms: payload.acceptedTerms,
          captchaToken: payload.captchaToken,
        }
      : {
          fullName: payload.displayName,
          email: payload.email,
          password: payload.password,
          phoneNumber: payload.phone,
          acceptedTerms: payload.acceptedTerms,
          captchaToken: payload.captchaToken,
        };

  return apiClient.post<RegistrationResponse, typeof body>(endpoint, body, {
    authenticated: false,
  });
}

export type ResendVerificationEmailResponse = {
  message: string;
};

export type VerifyEmailResponse = {
  email: string;
  verifiedAt: string;
  alreadyVerified: boolean;
};

export async function verifyEmail(token: string) {
  return apiClient.post<VerifyEmailResponse, { token: string }>(
    API_ENDPOINTS.AUTH.VERIFY_EMAIL,
    { token },
    { authenticated: false },
  );
}

export async function resendVerificationEmail(email: string, captchaToken: string) {
  return apiClient.post<
    ResendVerificationEmailResponse,
    { email: string; captchaToken: string }
  >(
    API_ENDPOINTS.AUTH.RESEND_VERIFICATION_EMAIL,
    { email, captchaToken },
    { authenticated: false },
  );
}
