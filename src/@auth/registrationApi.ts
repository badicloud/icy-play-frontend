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
