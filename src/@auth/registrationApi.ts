import { apiClient, ApiError, API_ENDPOINTS } from "@/services/api";

export type RegistrationPayload = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  acceptedTerms: boolean;
  captchaToken: string;
};

export type RegistrationResponse = {
  userId: string;
  profileId: string;
};

export { ApiError as RegistrationApiError };

/**
 * Sign-up creates a customer. Facility owners are encoded by the platform team
 * from the admin console, so there is no self-service path for them.
 */
export async function registerAccount(payload: RegistrationPayload) {
  const body = {
    fullName: payload.displayName,
    email: payload.email,
    password: payload.password,
    phoneNumber: payload.phone,
    acceptedTerms: payload.acceptedTerms,
    captchaToken: payload.captchaToken,
  };

  return apiClient.post<RegistrationResponse, typeof body>(
    API_ENDPOINTS.AUTH.REGISTER_CUSTOMER,
    body,
    { authenticated: false },
  );
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
