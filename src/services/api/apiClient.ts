import { ApiError } from "./ApiError";
import type {
  ApiClientConfiguration,
  ApiEnvelope,
  ApiErrorEnvelope,
  ApiRequestContext,
  ApiRequestOptions,
  ErrorInterceptor,
  HttpMethod,
  QueryValue,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
}

function appendQuery(
  url: URL,
  query?: Record<string, QueryValue | QueryValue[]>,
) {
  if (!query) {
    return;
  }

  Object.entries(query).forEach(([key, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach((value) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  });
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return undefined;
  }

  return response.json().catch(() => undefined);
}

class ApiClient {
  private configuration: ApiClientConfiguration = {};

  private accessToken: string | null = null;

  private requestInterceptors: RequestInterceptor[] = [];

  private responseInterceptors: ResponseInterceptor[] = [];

  private errorInterceptors: ErrorInterceptor[] = [];

  configure(configuration: ApiClientConfiguration) {
    this.configuration = { ...this.configuration, ...configuration };
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  clearAccessToken() {
    this.accessToken = null;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    return () => this.removeInterceptor(this.requestInterceptors, interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    return () => this.removeInterceptor(this.responseInterceptors, interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
    return () => this.removeInterceptor(this.errorInterceptors, interceptor);
  }

  get<TResponse>(path: string, options?: ApiRequestOptions<never>) {
    return this.request<TResponse, never>("GET", path, options);
  }

  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions<TBody>,
  ) {
    return this.request<TResponse, TBody>("POST", path, {
      ...options,
      body,
    });
  }

  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions<TBody>,
  ) {
    return this.request<TResponse, TBody>("PUT", path, {
      ...options,
      body,
    });
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions<TBody>,
  ) {
    return this.request<TResponse, TBody>("PATCH", path, {
      ...options,
      body,
    });
  }

  delete<TResponse>(path: string, options?: ApiRequestOptions<never>) {
    return this.request<TResponse, never>("DELETE", path, options);
  }

  async request<TResponse, TBody = unknown>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const {
      authenticated = true,
      body,
      headers: customHeaders,
      query,
      unwrapData = true,
      ...requestInit
    } = options;
    const url = new URL(path.replace(/^\//, ""), `${apiBaseUrl}/`);
    appendQuery(url, query);

    const headers = new Headers(customHeaders);
    headers.set("Accept", "application/json");

    if (body !== undefined && !(body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (authenticated) {
      const accessToken =
        (await this.configuration.getAccessToken?.()) ?? this.accessToken;
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    }

    let context: ApiRequestContext = {
      method,
      url: url.toString(),
      init: {
        ...requestInit,
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body === undefined
              ? undefined
              : JSON.stringify(body),
      },
    };

    for (const interceptor of this.requestInterceptors) {
      context = await interceptor(context);
    }

    try {
      let response = await fetch(context.url, context.init);
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, context);
      }

      const payload = await readJson(response);
      if (!response.ok) {
        const errorEnvelope = payload as ApiErrorEnvelope | undefined;
        if (response.status === 401) {
          this.clearAccessToken();
          await this.configuration.onUnauthorized?.();
        }

        throw new ApiError(
          errorEnvelope?.error?.message ||
            `Request failed with status ${response.status}.`,
          response.status,
          errorEnvelope?.error?.code,
          errorEnvelope?.error?.details,
          payload,
        );
      }

      if (
        unwrapData &&
        payload !== null &&
        typeof payload === "object" &&
        "data" in payload
      ) {
        return (payload as ApiEnvelope<TResponse>).data;
      }

      return payload as TResponse;
    } catch (error) {
      const normalizedError =
        error instanceof ApiError
          ? error
          : new ApiError(
              "Unable to reach the server. Please check your connection and try again.",
              undefined,
              "NETWORK_ERROR",
              undefined,
              error,
            );

      for (const interceptor of this.errorInterceptors) {
        await interceptor(normalizedError, context);
      }

      throw normalizedError;
    }
  }

  private removeInterceptor<T>(collection: T[], interceptor: T) {
    const index = collection.indexOf(interceptor);
    if (index >= 0) {
      collection.splice(index, 1);
    }
  }
}

export const apiClient = new ApiClient();
