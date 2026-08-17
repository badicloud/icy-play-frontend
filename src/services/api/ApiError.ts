export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly details?: Record<string, string[]>,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
