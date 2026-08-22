import { beforeEach, describe, expect, test, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

import {
  createInstallAdmin,
  getInstallStatus,
  normalizeInstallStatus,
  normalizeInstalledUser,
} from "../../../core/admin/services/installClient";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("normalizeInstallStatus", () => {
  test("accepts an explicit available: true", () => {
    expect(normalizeInstallStatus({ available: true })).toEqual({ available: true });
  });

  test("collapses everything else to false", () => {
    expect(normalizeInstallStatus({ available: false })).toEqual({ available: false });
    expect(normalizeInstallStatus({})).toEqual({ available: false });
    expect(normalizeInstallStatus(null)).toEqual({ available: false });
    expect(normalizeInstallStatus(undefined)).toEqual({ available: false });
    expect(normalizeInstallStatus("ready")).toEqual({ available: false });
    expect(normalizeInstallStatus([{ available: true }])).toEqual({ available: false });
  });
});

describe("normalizeInstalledUser", () => {
  test("normalizes a full user", () => {
    expect(normalizeInstalledUser({ id: "u1", email: "a@b.c", name: "Ada" })).toEqual({
      id: "u1",
      email: "a@b.c",
      name: "Ada",
    });
  });

  test("defaults a missing name to an empty string", () => {
    expect(normalizeInstalledUser({ id: "u1", email: "a@b.c" })).toEqual({
      id: "u1",
      email: "a@b.c",
      name: "",
    });
  });

  test("throws for a non-object value", () => {
    expect(() => normalizeInstalledUser(null)).toThrow("install_user_invalid");
    expect(() => normalizeInstalledUser("x")).toThrow("install_user_invalid");
    expect(() => normalizeInstalledUser(["id"])).toThrow("install_user_invalid");
  });

  test("throws when id or email is not a string", () => {
    expect(() => normalizeInstalledUser({ id: 7, email: "a@b.c" })).toThrow("install_user_invalid");
    expect(() => normalizeInstalledUser({ id: "u1", email: 7 })).toThrow("install_user_invalid");
  });
});

describe("getInstallStatus", () => {
  test("fetches the public install status with GET and no csrf", async () => {
    apiRequest.mockResolvedValueOnce({ available: true });
    await expect(getInstallStatus()).resolves.toEqual({ available: true });
    expect(apiRequest).toHaveBeenCalledWith("/auth/install/status", { method: "GET" });
  });

  test("fails closed on an ambiguous response", async () => {
    apiRequest.mockResolvedValueOnce({ available: "yes" });
    await expect(getInstallStatus()).resolves.toEqual({ available: false });
  });
});

describe("createInstallAdmin", () => {
  const payload = { name: "Admin", email: "admin@example.com", password: "secret-123" };

  test("creates the installer admin with the exact payload and no csrf", async () => {
    apiRequest.mockResolvedValueOnce({
      ok: true,
      user: { id: "u9", email: "admin@example.com", name: "Admin" },
    });
    await expect(createInstallAdmin(payload)).resolves.toEqual({
      user: { id: "u9", email: "admin@example.com", name: "Admin" },
    });
    expect(apiRequest).toHaveBeenCalledWith("/auth/install/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin",
        email: "admin@example.com",
        password: "secret-123",
      }),
    });
    // The write is session-less and CSRF-exempt; `withCsrf` must be absent.
    const call = (apiRequest as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect("withCsrf" in call).toBe(false);
  });

  test("normalizes a missing user name", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true, user: { id: "u9", email: "a@b.c" } });
    await expect(createInstallAdmin(payload)).resolves.toEqual({
      user: { id: "u9", email: "a@b.c", name: "" },
    });
  });

  test("rejects when the user payload is malformed", async () => {
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(createInstallAdmin(payload)).rejects.toThrow("install_user_invalid");
  });
});
