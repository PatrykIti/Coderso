import { expect, test } from "bun:test";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { login } from "../../../core/admin/services/authClient";

test("login posts credentials to auth endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(
      JSON.stringify({ user: { id: "1", email: "user@site.com" }, session: { expiresAt: "soon" } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const result = await login({ email: "user@site.com", password: "password123" });
    expect(result.user.email).toBe("user@site.com");
    expect(calls[0]?.input).toBe("/admin/api/auth/login");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ email: "user@site.com", password: "password123" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("login maps api errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { code: "auth_failed", message: "Invalid credentials" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );

  try {
    await login({ email: "user@site.com", password: "password123" });
    throw new Error("Expected login to throw");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiClientError);
    const error = err as ApiClientError;
    expect(error.code).toBe("auth_failed");
    expect(error.message).toBe("Invalid credentials");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
