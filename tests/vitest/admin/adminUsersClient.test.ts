import { expect, test } from "vitest";

import {
  createAdminUser,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  inviteUserWithSetPassword,
  listAdminUsers,
  replaceAdminUserRoles,
  requestAdminPasswordReset,
  updateAdminUser,
} from "../../../core/admin/services/adminUsersClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listAdminUsers hits GET /admin-users", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listAdminUsers();
    expect(calls[0]?.input).toBe("/admin/api/admin-users");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createAdminUser uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "user-1" });
  };

  try {
    resetCsrfToken();
    await createAdminUser({
      name: "Test",
      email: "test@example.com",
      roleIds: ["role"],
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("inviteUserWithSetPassword uses CSRF and POSTs invite payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      user: { id: "user-1" },
      setPassword: { delivery: "email", status: "sent", expiresAt: "2026-06-01T10:00:00.000Z" },
    });
  };

  try {
    resetCsrfToken();
    await inviteUserWithSetPassword({
      name: "Invited",
      email: "invite@example.com",
      roleIds: ["role"],
      sendSetPasswordInvite: true,
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/invite");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      name: "Invited",
      email: "invite@example.com",
      roleIds: ["role"],
      sendSetPasswordInvite: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateAdminUser uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "user-1" });
  };

  try {
    resetCsrfToken();
    await updateAdminUser("user-1", { name: "Updated" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("replaceAdminUserRoles uses CSRF and PUT", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "user-1" });
  };

  try {
    resetCsrfToken();
    await replaceAdminUserRoles("user-1", ["role-a"]);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1/roles");
    expect(calls[1]?.init?.method).toBe("PUT");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("disableAdminUser uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "user-1" });
  };

  try {
    resetCsrfToken();
    await disableAdminUser("user-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1/disable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("enableAdminUser uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "user-1" });
  };

  try {
    resetCsrfToken();
    await enableAdminUser("user-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1/enable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteAdminUser uses CSRF and DELETE", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteAdminUser("user-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestAdminPasswordReset uses CSRF and email delivery payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      delivery: "email",
      status: "sent",
      expiresAt: "2026-06-01T10:00:00.000Z",
    });
  };

  try {
    resetCsrfToken();
    await requestAdminPasswordReset("user-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-users/user-1/password-reset");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ delivery: "email" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
