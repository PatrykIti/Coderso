import { resolveAdminBasePath } from "@/utils/adminPaths";

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const getApiBase = () => `${resolveAdminBasePath()}/api`;
let cachedCsrfToken: string | null = null;

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function resetCsrfToken() {
  cachedCsrfToken = null;
}

export async function getCsrfToken(options?: { force?: boolean }) {
  if (cachedCsrfToken && !options?.force) return cachedCsrfToken;

  try {
    const response = await fetch(`${getApiBase()}/auth/csrf`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { token?: string };
    cachedCsrfToken = payload.token ?? null;
    return cachedCsrfToken;
  } catch {
    return null;
  }
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
  const headers = new Headers(init.headers);

  if (options?.withCsrf) {
    const csrf = await getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) throw await parseError(response);

  return parseJson<T>(response);
}
