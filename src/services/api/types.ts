export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type ApiEnvelope<T> = {
  data: T;
  meta?: unknown;
};

export type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
};

export type ApiRequestOptions<TBody = unknown> = Omit<
  RequestInit,
  "body" | "headers" | "method"
> & {
  authenticated?: boolean;
  body?: TBody;
  headers?: HeadersInit;
  query?: Record<string, QueryValue | QueryValue[]>;
  unwrapData?: boolean;
};

export type ApiRequestContext = {
  method: HttpMethod;
  url: string;
  init: RequestInit;
};

export type RequestInterceptor = (
  context: ApiRequestContext,
) => ApiRequestContext | Promise<ApiRequestContext>;

export type ResponseInterceptor = (
  response: Response,
  context: ApiRequestContext,
) => Response | Promise<Response>;

export type ErrorInterceptor = (
  error: unknown,
  context: ApiRequestContext,
) => void | Promise<void>;

export type ApiClientConfiguration = {
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
};
