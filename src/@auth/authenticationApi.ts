import { apiClient, API_ENDPOINTS } from "@/services/api";

export type LoginRequest = {
  email: string;
  password: string;
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
    await apiClient.post<void, { refreshToken: string }>(
      API_ENDPOINTS.AUTH.LOGOUT,
      { refreshToken },
    );
  } finally {
    apiClient.clearAccessToken();
  }
}

export function getCurrentUser() {
  return apiClient.get<CurrentUserResponse>(API_ENDPOINTS.AUTH.ME);
}
