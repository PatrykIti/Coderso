import { apiRequest } from "./apiClient";

// Thin browser client for the PUBLIC pre-auth installer endpoints
// (TASK-482-01-L02 `GET /auth/install/status`, TASK-482-02-L02
// `POST /auth/install/admin`). Built on `apiRequest` and deliberately WITHOUT
// the `withCsrf` option — matching `login()` in authClient.ts, because the
// install write is the session-less, CSRF-exempt route (csrf.ts skips by
// absence). There is no session to mint a token from.

export type InstallStatus = {
  available: boolean;
};

export type InstalledUser = {
  id: string;
  email: string;
  name: string;
};

export type CreateInstallAdminPayload = {
  name: string;
  email: string;
  password: string;
};

// reject-unknown-shaped normalize: anything that is not an explicit
// `available: true` collapses to `false`, so a malformed/uncertain status can
// never flip the client into the installer surface (fail-closed).
export const normalizeInstallStatus = (value: unknown): InstallStatus => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { available: false };
  }
  const record = value as Record<string, unknown>;
  return { available: record.available === true };
};

export const normalizeInstalledUser = (value: unknown): InstalledUser => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("install_user_invalid");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.email !== "string") {
    throw new Error("install_user_invalid");
  }
  const name = typeof record.name === "string" ? record.name : "";
  return { id: record.id, email: record.email, name };
};

export async function getInstallStatus(): Promise<InstallStatus> {
  const result = await apiRequest<{ available?: unknown }>("/auth/install/status", {
    method: "GET",
  });
  return normalizeInstallStatus(result);
}

export async function createInstallAdmin(
  payload: CreateInstallAdminPayload
): Promise<{ user: InstalledUser }> {
  // Send EXACTLY the three schema fields — never `confirm` or any extra key
  // (the server schema is strict / reject-unknown).
  const result = await apiRequest<{ ok?: boolean; user?: unknown }>("/auth/install/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
    }),
  });
  return { user: normalizeInstalledUser(result.user) };
}
