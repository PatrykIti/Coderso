import { afterEach, expect, test } from "vitest";

import {
  apiRequest,
  getCsrfToken,
  resetCsrfToken,
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

    await expect(Promise.all([first, second])).resolves.toEqual([
      "shared-token",
      "shared-token",
    ]);
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

test("apiRequest does not retry non-csrf forbidden responses", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(
      { error: { code: "forbidden", message: "Forbidden" } },
      403
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
      code: "forbidden",
      status: 403,
    });

    expect(fetchMock.calls.map((call) => String(call.input))).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/pages/page-1",
    ]);
  } finally {
    fetchMock.restore();
  }
});
