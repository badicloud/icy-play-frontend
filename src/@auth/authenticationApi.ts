import { apiClient, API_ENDPOINTS } from "@/services/api";

export type LoginRequest = {
  email: string;
  password: string;
  captchaToken: string;
  rememberMe: boolean;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  roles: string[];
};

export type CurrentUserResponse = {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
};

export async function login(request: LoginRequest) {
  const tokens = await apiClient.post<TokenResponse, LoginRequest>(
    API_ENDPOINTS.AUTH.LOGIN,
    request,
    { authenticated: false },
  );
  apiClient.setAccessToken(tokens.accessToken);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  const tokens = await apiClient.post<TokenResponse, { refreshToken: string }>(
    API_ENDPOINTS.AUTH.REFRESH,
    { refreshToken },
    { authenticated: false },
  );
  apiClient.setAccessToken(tokens.accessToken);
  return tokens;
}

export async function logout(refreshToken: string) {
  try {
    // The endpoint is anonymous and identifies the session by refresh token.
    // Sending it unauthenticated keeps the access token from being refreshed
    // first, which would rotate this refresh token and revoke it server-side
    // before the logout request could consume it.
    await apiClient.post<void, { refreshToken: string }>(
      API_ENDPOINTS.AUTH.LOGOUT,
      { refreshToken },
      { authenticated: false },
    );
  } finally {
    apiClient.clearAccessToken();
  }
}

export function getCurrentUser() {
  return apiClient.get<CurrentUserResponse>(API_ENDPOINTS.AUTH.ME);
}
