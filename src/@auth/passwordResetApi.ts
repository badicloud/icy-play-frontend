import { apiClient, API_ENDPOINTS } from "@/services/api";

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordResponse = {
  email: string;
  revokedSessions: number;
};

export async function requestPasswordReset(email: string, captchaToken: string) {
  return apiClient.post<
    ForgotPasswordResponse,
    { email: string; captchaToken: string }
  >(
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
    { email, captchaToken },
    { authenticated: false },
  );
}

export type PasswordResetTokenStatusResponse = {
  expiresAt: string;
};

/** Reports whether a reset link is still usable, without spending it. */
export async function checkPasswordResetToken(token: string) {
  return apiClient.post<PasswordResetTokenStatusResponse, { token: string }>(
    API_ENDPOINTS.AUTH.CHECK_RESET_TOKEN,
    { token },
    { authenticated: false },
  );
}

export async function resetPassword(token: string, newPassword: string) {
  return apiClient.post<
    ResetPasswordResponse,
    { token: string; newPassword: string }
  >(
    API_ENDPOINTS.AUTH.RESET_PASSWORD,
    { token, newPassword },
    { authenticated: false },
  );
}

/** Mirrors the backend password rules so the form can show them as a checklist. */
export const passwordRules = [
  { label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { label: "An uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "A lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "A number", test: (value: string) => /[0-9]/.test(value) },
  { label: "A special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function isPasswordValid(value: string) {
  return value.length <= 128 && passwordRules.every((rule) => rule.test(value));
}
