import { resolveAdminBasePath } from "@/utils/adminPaths";
import { startRequestMetric } from "@/utils/requestMetrics";

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type AdminApiFailureKind = "csrf_refresh" | "session_expired" | "generic_error";

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public sharedFailureKind: AdminApiFailureKind;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.sharedFailureKind = "generic_error";
  }
}

const getApiBase = () => `${resolveAdminBasePath()}/api`;
let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

const csrfRefreshErrorCodes = new Set(["csrf_invalid", "csrf_expired"]);

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function resetCsrfToken() {
  cachedCsrfToken = null;
  csrfTokenPromise = null;
}

export async function getCsrfToken(options?: { force?: boolean }) {
  if (cachedCsrfToken && !options?.force) return cachedCsrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;
  if (options?.force) cachedCsrfToken = null;

  const finishMetric = startRequestMetric({ path: "/auth/csrf", method: "GET" });
  csrfTokenPromise = (async () => {
    const response = await fetch(`${getApiBase()}/auth/csrf`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      finishMetric({ status: response.status, ok: false, errorCode: "csrf_request_failed" });
      return null;
    }
    const payload = (await response.json()) as { token?: string };
    cachedCsrfToken = payload.token ?? null;
    finishMetric({ status: response.status, ok: true });
    return cachedCsrfToken;
  })()
    .catch(() => {
      finishMetric({ status: 0, ok: false, errorCode: "csrf_network_error" });
      return null;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

const isRefreshableCsrfError = (error: ApiClientError) =>
  error.status === 403 && csrfRefreshErrorCodes.has(error.code);

export const classifyAdminApiFailure = (error: ApiClientError): AdminApiFailureKind => {
  if (isRefreshableCsrfError(error)) return "csrf_refresh";
  if (error.status === 401 || error.code === "session_expired" || error.code === "auth_required") {
    return "session_expired";
  }
  return "generic_error";
};

const annotateAdminApiFailure = (error: ApiClientError) => {
  error.sharedFailureKind = classifyAdminApiFailure(error);
  return error;
};

export const isSessionExpiredApiError = (error: unknown): error is ApiClientError =>
  isApiClientError(error) && classifyAdminApiFailure(error) === "session_expired";

async function sendApiRequest(
  path: string,
  init: RequestInit,
  options: { withCsrf?: boolean } | undefined,
  csrfOptions?: { force?: boolean }
) {
  const headers = new Headers(init.headers);

  if (options?.withCsrf) {
    const csrf = await getCsrfToken(csrfOptions);
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  return fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.error) {
      return new ApiClientError(
        payload.error.code,
        payload.error.message,
        response.status,
        payload.error.details
      );
    }
  } catch {
    // ignore JSON parse errors
  }

  return new ApiClientError(
    "request_failed",
    response.statusText || "Request failed",
    response.status
  );
}

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: { withCsrf?: boolean }
) {
  const method = (init.method ?? "GET").toUpperCase();
  const finishMetric = startRequestMetric({ path, method });

  try {
    let response = await sendApiRequest(path, init, options);

    if (!response.ok) {
      const error = await parseError(response);
      annotateAdminApiFailure(error);
      if (options?.withCsrf && isRefreshableCsrfError(error)) {
        resetCsrfToken();
        response = await sendApiRequest(path, init, options, { force: true });
        if (!response.ok) {
          const retryError = await parseError(response);
          annotateAdminApiFailure(retryError);
          if (isRefreshableCsrfError(retryError)) {
            resetCsrfToken();
          }
          finishMetric({ status: response.status, ok: false, errorCode: "http_error" });
          throw retryError;
        }
      } else {
        finishMetric({ status: response.status, ok: false, errorCode: "http_error" });
        throw error;
      }
    }

    const payload = await parseJson<T>(response);
    finishMetric({ status: response.status, ok: true });
    return payload;
  } catch (error) {
    if (isApiClientError(error)) {
      annotateAdminApiFailure(error);
      throw error;
    }
    finishMetric({ status: 0, ok: false, errorCode: "network_error" });
    throw error;
  }
}
