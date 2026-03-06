import { expect, test } from "vitest";

import {
  clearAuthBootstrapCache,
  resolveAuthBootstrap,
} from "../../../core/admin/services/authClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("resolveAuthBootstrap caches authenticated result and dedupes in-flight calls", async () => {
  const originalFetch = globalThis.fetch;
  let meCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      meCalls += 1;
      return jsonResponse({
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
      });
    }
    return jsonResponse({});
  };

  try {
    clearAuthBootstrapCache();
    const [first, second] = await Promise.all([
      resolveAuthBootstrap(),
      resolveAuthBootstrap(),
    ]);
    const third = await resolveAuthBootstrap();

    expect(first.state).toBe("authenticated");
    expect(second.state).toBe("authenticated");
    expect(third.state).toBe("authenticated");
    expect(meCalls).toBe(1);
  } finally {
    clearAuthBootstrapCache();
    globalThis.fetch = originalFetch;
  }
});

test("resolveAuthBootstrap maps unauthorized errors to unauthenticated state", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return jsonResponse(
        {
          error: {
            code: "auth_required",
            message: "Authentication required",
          },
        },
        401
      );
    }
    return jsonResponse({});
  };

  try {
    clearAuthBootstrapCache();
    const result = await resolveAuthBootstrap({ force: true });
    expect(result).toEqual({
      state: "unauthenticated",
      user: null,
    });
  } finally {
    clearAuthBootstrapCache();
    globalThis.fetch = originalFetch;
  }
});

test("clearAuthBootstrapCache forces the next auth bootstrap request", async () => {
  const originalFetch = globalThis.fetch;
  let meCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      meCalls += 1;
      return jsonResponse({
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
      });
    }
    return jsonResponse({});
  };

  try {
    clearAuthBootstrapCache();
    await resolveAuthBootstrap();
    clearAuthBootstrapCache();
    await resolveAuthBootstrap();
    expect(meCalls).toBe(2);
  } finally {
    clearAuthBootstrapCache();
    globalThis.fetch = originalFetch;
  }
});
