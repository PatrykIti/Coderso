export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof ApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && error instanceof Error) {
    return {
      error: {
        code: "internal_error",
        message: error.message || "Unexpected error",
        details: error.stack ? { stack: error.stack } : undefined,
      },
    };
  }

  return {
    error: {
      code: "internal_error",
      message: "Unexpected error",
    },
  };
}
