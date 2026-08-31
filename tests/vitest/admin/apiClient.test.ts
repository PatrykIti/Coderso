import { afterEach, expect, test } from "vitest";

import {
  ApiClientError,
  apiRequest,
  classifyAdminApiFailure,
  getCsrfToken,
  isSessionExpiredApiError,
  resetCsrfToken,
  subscribeAdminPermissionFailure,
} from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const csrfErrorResponse = (code: "csrf_invalid" | "csrf_expired") =>
  jsonResponse(
    {
      error: {
        code,
        message: code === "csrf_expired" ? "CSRF token expired" : "Invalid CSRF token",
      },
    },
    403
  );

const installFetch = (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return handler(input, init);
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

afterEach(() => {
  resetCsrfToken();
});

test("getCsrfToken deduplicates concurrent token requests", async () => {
  let resolveCsrf: (response: Response) => void = (_response) => {
    throw new Error("csrf_resolver_not_initialized");
  };
  const fetchMock = installFetch(async (input) => {
    expect(String(input)).toBe("/admin/api/auth/csrf");
    return new Promise<Response>((resolve) => {
      resolveCsrf = resolve;
    });
  });

  try {
    const first = getCsrfToken();
    const second = getCsrfToken();

    expect(fetchMock.calls).toHaveLength(1);
    resolveCsrf(jsonResponse({ token: "shared-token" }));

    await expect(Promise.all([first, second])).resolves.toEqual(["shared-token", "shared-token"]);
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest refreshes csrf token and retries once for csrf_invalid", async () => {
  const tokens = ["stale-token", "fresh-token"];
  let tokenIndex = 0;
  let mutationAttempts = 0;
  const fetchMock = installFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      const token = tokens[tokenIndex] ?? "unexpected-token";
      tokenIndex += 1;
      return jsonResponse({ token });
    }

    mutationAttempts += 1;
    const headers = new Headers(init?.headers);
    if (mutationAttempts === 1) {
      expect(headers.get("X-CSRF-Token")).toBe("stale-token");
      return csrfErrorResponse("csrf_invalid");
    }

    expect(headers.get("X-CSRF-Token")).toBe("fresh-token");
    return jsonResponse({ ok: true });
  });

  try {
    await expect(
      apiRequest<{ ok: boolean }>(
        "/pages/page-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated" }),
        },
        { withCsrf: true }
      )
    ).resolves.toEqual({ ok: true });

    expect(fetchMock.calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
    ]);
  } finally {
    fetchMock.restore();
  }
});

test("concurrent csrf retries share one token refresh", async () => {
  let csrfRequests = 0;
  let staleMutationAttempts = 0;
  let releaseStaleAttempts: (() => void) | undefined;
  const staleAttemptsReady = new Promise<void>((resolve) => {
    releaseStaleAttempts = resolve;
  });
  const fetchMock = installFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      csrfRequests += 1;
      return jsonResponse({ token: csrfRequests === 1 ? "stale-token" : "fresh-token" });
    }

    const token = new Headers(init?.headers).get("X-CSRF-Token");
    if (token === "stale-token") {
      staleMutationAttempts += 1;
      if (staleMutationAttempts === 3) releaseStaleAttempts?.();
      await staleAttemptsReady;
      return csrfErrorResponse("csrf_invalid");
    }
    expect(token).toBe("fresh-token");
    return jsonResponse({ ok: true });
  });

  try {
    await expect(getCsrfToken()).resolves.toBe("stale-token");
    await expect(
      Promise.all(
        ["form", "fields", "actions"].map((resource) =>
          apiRequest<{ ok: boolean }>(
            `/forms/form-1/${resource}`,
            { method: "PUT", body: "{}" },
            { withCsrf: true }
          )
        )
      )
    ).resolves.toEqual([{ ok: true }, { ok: true }, { ok: true }]);

    expect(csrfRequests).toBe(2);
    expect(staleMutationAttempts).toBe(3);
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest does not retry non-csrf forbidden responses", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ error: { code: "forbidden", message: "Forbidden" } }, 403);
  });

  const permissionFailures: Array<{ path: string; method: string; code: string }> = [];
  const unsubscribe = subscribeAdminPermissionFailure((event) => {
    permissionFailures.push({
      path: event.path,
      method: event.method,
      code: event.error.code,
    });
  });

  try {
    await expect(
      apiRequest<{ ok: boolean }>(
        "/pages/page-1",
        { method: "PATCH", body: JSON.stringify({ title: "Updated" }) },
        { withCsrf: true }
      )
    ).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
      sharedFailureKind: "permission_denied",
    });

    expect(fetchMock.calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
    ]);
    expect(permissionFailures).toEqual([
      { path: "/pages/page-1", method: "PATCH", code: "forbidden" },
    ]);
  } finally {
    unsubscribe();
    fetchMock.restore();
  }
});

test("apiRequest classifies 401 responses as session-expired without retrying csrf", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(
      { error: { code: "auth_required", message: "Authentication required" } },
      401
    );
  });

  try {
    await expect(
      apiRequest<{ ok: boolean }>(
        "/pages/page-1",
        { method: "PATCH", body: JSON.stringify({ title: "Updated" }) },
        { withCsrf: true }
      )
    ).rejects.toMatchObject({
      code: "auth_required",
      status: 401,
      sharedFailureKind: "session_expired",
    });

    expect(fetchMock.calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
    ]);
  } finally {
    fetchMock.restore();
  }
});

test("shared api client helpers classify session-expired and csrf-refreshable failures distinctly", () => {
  const authRequired = new ApiClientError("auth_required", "Authentication required", 401);
  const forbidden = new ApiClientError("forbidden", "Forbidden", 403);

  expect(classifyAdminApiFailure(authRequired)).toBe("session_expired");
  expect(classifyAdminApiFailure(forbidden)).toBe("permission_denied");
  expect(isSessionExpiredApiError(authRequired)).toBe(true);
});

test("getCsrfToken returns null when the csrf request fails", async () => {
  const fetchMock = installFetch(async () =>
    jsonResponse({ error: { code: "server_error", message: "Boom" } }, 500)
  );

  try {
    resetCsrfToken();
    await expect(getCsrfToken()).resolves.toBeNull();
  } finally {
    fetchMock.restore();
  }
});

test("getCsrfToken returns null on network failure", async () => {
  const fetchMock = installFetch(async () => {
    throw new TypeError("network down");
  });

  try {
    resetCsrfToken();
    await expect(getCsrfToken()).resolves.toBeNull();
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest falls back to a generic error for unparsable or unstructured error bodies", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/pages/unstructured")) {
      return jsonResponse({ message: "nope" }, 500);
    }
    return new Response("<html>bad gateway</html>", { status: 502, statusText: "Bad Gateway" });
  });

  try {
    resetCsrfToken();
    await expect(apiRequest("/pages/unstructured", {}, { withCsrf: true })).rejects.toMatchObject({
      code: "request_failed",
      status: 500,
    });
    await expect(apiRequest("/pages/non-json", {}, { withCsrf: true })).rejects.toMatchObject({
      code: "request_failed",
      status: 502,
    });
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest reports a double csrf failure without recursing", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return csrfErrorResponse("csrf_invalid");
  });

  try {
    resetCsrfToken();
    await expect(
      apiRequest<{ ok: boolean }>(
        "/pages/page-1",
        { method: "POST", body: JSON.stringify({ title: "Updated" }) },
        { withCsrf: true }
      )
    ).rejects.toMatchObject({
      code: "csrf_invalid",
      status: 403,
      sharedFailureKind: "csrf_refresh",
    });

    expect(fetchMock.calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
    ]);
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest returns undefined for 204 responses", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return new Response(null, { status: 204 });
  });

  try {
    resetCsrfToken();
    await expect(apiRequest("/pages/archive", {}, { withCsrf: true })).resolves.toBeUndefined();
  } finally {
    fetchMock.restore();
  }
});

test("apiRequest rethrows non-API errors such as malformed JSON", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return new Response("not-json{{", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  try {
    resetCsrfToken();
    await expect(apiRequest("/pages", {}, { withCsrf: true })).rejects.toThrow(SyntaxError);
  } finally {
    fetchMock.restore();
  }
});
