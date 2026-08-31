import { beforeEach, describe, expect, test, vi } from "vitest";

const { apiRequest, getCsrfToken } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
}));

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    details?: unknown;
    sharedFailureKind: string;
    constructor(code: string, message: string, status: number, details?: unknown) {
      super(message);
      this.name = "ApiClientError";
      this.code = code;
      this.status = status;
      this.details = details;
      this.sharedFailureKind = "generic_error";
    }
  },
  getCsrfToken,
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

import { ApiClientError } from "@/services/apiClient";
import {
  clearAuthBootstrapCache,
  confirmPasswordReset,
  getAuthBotProtection,
  login,
  logout,
  me,
  normalizeAuthUser,
  requestPasswordReset,
  resolveAuthBootstrap,
  toFieldErrors,
  verifyOtp,
} from "../../../core/admin/services/authClient";

beforeEach(() => {
  vi.resetAllMocks();
  clearAuthBootstrapCache();
});

const authUser = {
  id: "user-1",
  email: "admin@example.com",
  name: "Admin",
  permissionSnapshot: null,
};

const authError = (code: string, status: number, details?: unknown) =>
  new ApiClientError(code, `Request failed (${status})`, status, details);

describe("normalizeAuthUser", () => {
  test("throws for non-object or missing identity fields", () => {
    expect(() => normalizeAuthUser(null)).toThrow("auth_user_invalid");
    expect(() => normalizeAuthUser(["id"])).toThrow("auth_user_invalid");
    expect(() => normalizeAuthUser({ id: "u1" })).toThrow("auth_user_invalid");
    expect(() => normalizeAuthUser({ email: "a@b.c" })).toThrow("auth_user_invalid");
  });

  test("accepts a full user and defaults name to null", () => {
    expect(normalizeAuthUser(authUser)).toEqual(authUser);
    expect(normalizeAuthUser({ id: "u1", email: "a@b.c", name: 7 })).toEqual({
      id: "u1",
      email: "a@b.c",
      name: null,
      permissionSnapshot: null,
    });
  });
});

describe("me", () => {
  test("fetches and normalizes the current user", async () => {
    apiRequest.mockResolvedValueOnce({ user: authUser });
    await expect(me()).resolves.toEqual({ user: authUser });
    expect(apiRequest).toHaveBeenCalledWith("/auth/me", { method: "GET" });
  });

  test("rejects when the user payload is malformed", async () => {
    apiRequest.mockResolvedValueOnce({ user: { id: 7 } });
    await expect(me()).rejects.toThrow("auth_user_invalid");
  });
});

describe("login", () => {
  test("posts credentials without csrf and returns the resolved user", async () => {
    apiRequest.mockResolvedValueOnce({
      user: authUser,
      session: { expiresAt: "2026-08-01T00:00:00.000Z" },
    });
    apiRequest.mockResolvedValueOnce({ user: authUser });
    const result = await login({ email: "admin@example.com", password: "secret" });
    expect(result.user).toEqual(authUser);
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/auth/me", { method: "GET" });
  });

  test("sends an optional captcha token", async () => {
    apiRequest.mockResolvedValueOnce({
      user: authUser,
      session: { expiresAt: "2026-08-01T00:00:00.000Z" },
    });
    apiRequest.mockResolvedValueOnce({ user: authUser });
    await login({ email: "a@b.c", password: "s", captchaToken: "tok" });
    const body = (apiRequest as ReturnType<typeof vi.fn>).mock.calls[0][1].body;
    expect(JSON.parse(body)).toEqual({ email: "a@b.c", password: "s", captchaToken: "tok" });
  });
});

describe("logout", () => {
  test("clears the cache and posts with csrf", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(logout()).resolves.toEqual({ ok: true });
    expect(apiRequest).toHaveBeenCalledWith("/auth/logout", { method: "POST" }, { withCsrf: true });
  });

  test("returns the server result when it is not ok", async () => {
    apiRequest.mockResolvedValueOnce({ ok: false });
    await expect(logout()).resolves.toEqual({ ok: false });
  });
});

describe("resolveAuthBootstrap error handling", () => {
  test("maps an auth-required failure to unauthenticated", async () => {
    apiRequest.mockRejectedValueOnce(authError("auth_required", 401));
    await expect(resolveAuthBootstrap()).resolves.toEqual({
      state: "unauthenticated",
      user: null,
    });
  });

  test("maps a 403 failure to unauthenticated", async () => {
    apiRequest.mockRejectedValueOnce(authError("forbidden", 403));
    await expect(resolveAuthBootstrap()).resolves.toEqual({
      state: "unauthenticated",
      user: null,
    });
  });

  test("propagates unrelated failures", async () => {
    apiRequest.mockRejectedValueOnce(new Error("network down"));
    await expect(resolveAuthBootstrap()).rejects.toThrow("network down");
  });

  test("force bypasses the cached result", async () => {
    apiRequest.mockResolvedValueOnce({ user: authUser });
    await resolveAuthBootstrap();
    apiRequest.mockResolvedValueOnce({ user: { id: "u2", email: "two@example.com" } });
    const result = await resolveAuthBootstrap({ force: true });
    expect(result.user?.id).toBe("u2");
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

describe("simple endpoints", () => {
  test("getAuthBotProtection fetches config with GET", async () => {
    const config = {
      enabled: true,
      provider: "recaptcha_v3" as const,
      siteKey: "key",
      enforceOnLocalhost: false,
    };
    apiRequest.mockResolvedValueOnce(config);
    await expect(getAuthBotProtection()).resolves.toEqual(config);
    expect(apiRequest).toHaveBeenCalledWith("/auth/bot-protection", { method: "GET" });
  });

  test("verifyOtp posts with csrf", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(verifyOtp({ code: "123456" })).resolves.toEqual({ ok: true });
    expect(apiRequest).toHaveBeenCalledWith(
      "/auth/verify-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      },
      { withCsrf: true }
    );
  });

  test("requestPasswordReset posts without csrf", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(requestPasswordReset({ email: "a@b.c" })).resolves.toEqual({ ok: true });
    const call = (apiRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect("withCsrf" in call).toBe(false);
    expect(JSON.parse((call.body as string) ?? "")).toEqual({ email: "a@b.c" });
  });

  test("confirmPasswordReset posts without csrf", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(confirmPasswordReset({ token: "t", password: "p" })).resolves.toEqual({
      ok: true,
    });
    expect(apiRequest).toHaveBeenCalledWith("/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "t", password: "p" }),
    });
  });
});

describe("toFieldErrors", () => {
  test("returns an empty map without details", () => {
    expect(toFieldErrors(null)).toEqual({});
    expect(toFieldErrors({} as never)).toEqual({});
  });

  test("maps array details and skips malformed entries", () => {
    const error = authError("validation_failed", 422, [
      { path: "email", message: "Invalid email" },
      { path: "name", message: "Required" },
      { path: "password" },
      "junk",
      { path: 7, message: "x" },
    ]);
    expect(toFieldErrors(error)).toEqual({ email: "Invalid email", name: "Required", "7": "x" });
  });

  test("maps object details with string field values", () => {
    const error = authError("validation_failed", 422, {
      fields: { email: "Invalid email", password: 5 },
    });
    expect(toFieldErrors(error)).toEqual({ email: "Invalid email" });
  });

  test("returns an empty map for object details without fields", () => {
    const error = authError("validation_failed", 422, { other: true });
    expect(toFieldErrors(error)).toEqual({});
  });
});
