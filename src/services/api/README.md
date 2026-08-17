# API Client Usage

Use `apiClient` for calls to the IcyPlay backend. Feature APIs should define only their request/response contracts and endpoint paths. Do not rebuild the base URL, authorization header, JSON parsing, or error envelopes inside feature files.

```ts
import { apiClient, API_ENDPOINTS } from "@/services/api";

type CurrentUserResponse = {
  userId: string;
  email: string;
};

export function getCurrentUser() {
  return apiClient.get<CurrentUserResponse>(API_ENDPOINTS.AUTH.ME);
}
```

All endpoint paths belong in `ApiEndpoints.ts`. Feature API files must reference
those constants instead of declaring URL strings locally.

Available actions:

```ts
apiClient.get<Response>(path, options);
apiClient.post<Response, Request>(path, body, options);
apiClient.put<Response, Request>(path, body, options);
apiClient.patch<Response, Request>(path, body, options);
apiClient.delete<Response>(path, options);
```

Requests are authenticated by default. Use `{ authenticated: false }` for public endpoints such as registration and login. Successful backend `{ data, meta }` envelopes are unwrapped automatically. Failed responses throw `ApiError` with `status`, `code`, `details`, and `payload`.

Configure session integration once near the application authentication boundary:

```ts
apiClient.configure({
  getAccessToken: () => session?.accessToken ?? null,
  onUnauthorized: () => signOut(),
});
```

Request, response, and error interceptors can be registered globally. Every registration method returns an unsubscribe function that should be called during cleanup when an interceptor is scoped to a React component.
