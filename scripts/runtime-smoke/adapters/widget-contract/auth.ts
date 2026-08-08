import { dirname } from "node:path";
import { createAdminAuthStorageState } from "../../browser/admin-auth";
import type { AdminAuthStateResult } from "./contracts";

export async function writeAdminAuthState(
  adminUrl: string,
  authStatePath: string,
  environment: NodeJS.ProcessEnv = process.env,
  workspace: string = dirname(authStatePath)
): Promise<AdminAuthStateResult> {
  return createAdminAuthStorageState({
    adminUrl,
    workspace,
    storageStatePath: authStatePath,
    environment,
  });
}

export async function requestAdminJson<T>({
  adminUrl,
  sessionValue,
  path,
  method = "GET",
  body,
  csrfToken,
}: {
  adminUrl: string;
  sessionValue: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  csrfToken?: string;
}): Promise<T> {
  const adminBase = adminUrl.replace(/\/$/, "");
  const headers = new Headers({
    cookie: `session=${encodeURIComponent(sessionValue)}`,
  });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`${adminBase}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`admin_fixture_request_failed:${method}:${path}:${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchAdminCsrfToken(adminUrl: string, sessionValue: string): Promise<string> {
  const payload = await requestAdminJson<{ token?: string }>({
    adminUrl,
    sessionValue,
    path: "/api/auth/csrf",
  });
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    throw new Error("admin_fixture_csrf_missing");
  }
  return token;
}
