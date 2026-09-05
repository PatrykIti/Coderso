/**
 * TASK-551-08-L03 INITIAL — route response-header transport seam.
 *
 * Proves the strict request-local response-header bag through the REAL api
 * pipeline: `dispatchApiRequest` is the narrow test seam whose default route
 * table is the production module router, so every request here passes through
 * request-ID/security/CORS assembly, IP allowlist, form-write lane, body
 * parsing, context creation, the handler loop and centralized error mapping —
 * never a parallel copy.
 *
 * Zero database connectivity:
 * - `core/db/client.ts` requires DATABASE_URL to be SET while modules are
 *   evaluated (the pool itself stays lazy and is never contacted). Bun
 *   auto-loads `.env`; when the variable is absent a placeholder is installed
 *   below so this suite stays independently runnable.
 * - Bun `mock.module` stubs replace the security-settings reader, the IP
 *   allowlist service and the access-log service BEFORE `httpServer.ts` is
 *   dynamically imported, so no exercised request path can open a connection.
 *
 * The suite drives the dispatcher function directly (no sockets), keeping port
 * usage deterministic.
 */
import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import {
  createRouteResponseHeaderBag,
  type RouteContext,
  type RouteDefinition,
} from "../../../core/server/router";
import type { SecuritySettings } from "../../../core/services/settings/securitySettings";

if (!process.env.DATABASE_URL) {
  // Placeholder only; never dialed because the pool is lazy and every
  // DB-touching dependency below is stubbed before httpServer.ts loads.
  process.env.DATABASE_URL =
    "postgresql://route_header_placeholder:route_header_placeholder@127.0.0.1:5/placeholder";
}

const REQUEST_ID_HEADER = "x-test-request-id";
const ALLOWED_ORIGIN = "https://headers.test";
const BASE_URL = "http://route-headers.test";
const API_PREFIX = "/admin/api";

const SECURITY_SETTINGS_STUB: SecuritySettings = {
  requestId: { enabled: true, headerName: REQUEST_ID_HEADER },
  csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
  cors: {
    allowedOrigins: [ALLOWED_ORIGIN],
    allowCredentials: true,
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-csrf-token", "x-coderso-expected-user-id"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: false,
    buckets: {
      auth: { windowSeconds: 60, maxRequests: 10 },
      admin_read: { windowSeconds: 60, maxRequests: 600 },
      admin_write: { windowSeconds: 60, maxRequests: 120 },
      public_read: { windowSeconds: 60, maxRequests: 300 },
      public_write: { windowSeconds: 60, maxRequests: 30 },
      assistant: { windowSeconds: 60, maxRequests: 30 },
    },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: "no-referrer",
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: { rejectUnknownFields: true },
  plugins: { safeMode: false },
  session: { ttlDays: 7, maxPerUser: 3, singleSession: false },
  loginAlerts: {
    enabled: false,
    notifyOnNewDevice: false,
    notifyOnNewLocation: false,
    recipients: [],
    webhookUrl: null,
    webhookSecret: null,
    deliveryError: null,
  },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: null,
    thresholds: { login: 0.5, reset: 0.6, publicWrite: 0.5 },
    enforceOnLocalhost: true,
  },
};

mock.module("../../../core/services/settings/securitySettings", () => ({
  getSecuritySettings: async (): Promise<SecuritySettings> => SECURITY_SETTINGS_STUB,
  getSecuritySettingsPublic: async () => ({
    ...SECURITY_SETTINGS_STUB,
    botProtection: {
      ...SECURITY_SETTINGS_STUB.botProtection,
      secretKey: { configured: false },
    },
    loginAlerts: {
      ...SECURITY_SETTINGS_STUB.loginAlerts,
      webhookSecret: { configured: false },
    },
    passwordPepperConfigured: false,
  }),
  setSecuritySettingsPublic: async () => SECURITY_SETTINGS_STUB,
  setSecuritySettings: async () => SECURITY_SETTINGS_STUB,
  resolveLoginWebhookSecret: async () => null,
}));

mock.module("../../../core/services/security/ipAllowlistService", () => ({
  listAllowlist: async () => [],
  isIpAllowed: async () => true,
  addAllowlistEntry: async () => {
    throw new Error("ip_allowlist_disabled_in_this_suite");
  },
  removeAllowlistEntry: async () => {
    throw new Error("ip_allowlist_disabled_in_this_suite");
  },
}));

// Keeps recordAccessLog off the lazy pool so the suite performs zero connections.
mock.module("../../../core/services/access/accessLogService", () => ({
  AccessLogDomainError: class AccessLogDomainError extends Error {},
  normalizeAccessLogQuery: () => ({
    limit: 20,
    status: undefined,
    query: undefined,
    userId: undefined,
    method: undefined,
    ip: undefined,
    from: undefined,
    to: undefined,
    cursor: null,
  }),
  resolveAccessLogMatchContext: () => [],
  resolveAccessLogSessionContext: async () => ({
    sessionState: "unknown",
    session: { id: null, userId: null, userName: null, userEmail: null },
  }),
  logAccess: async () => undefined,
  listAccessLogs: async () => ({ items: [], nextCursor: null }),
  revokeAccessLogSession: async () => {
    throw new Error("access_log_revoke_disabled_in_this_suite");
  },
}));

const { dispatchApiRequest } = await import("../../../core/server/httpServer");

type RawHeaders = ReadonlyArray<readonly [string, string]>;

const EXPECTED_CACHE_CONTROL = "private, no-store, max-age=0";
const EXPECTED_PRAGMA = "no-cache";
const EXPECTED_EXPIRES = "0";

const CONTRACT_TRIPLE: ReadonlyArray<readonly [string, string]> = [
  ["Cache-Control", EXPECTED_CACHE_CONTROL],
  ["Pragma", EXPECTED_PRAGMA],
  ["Expires", EXPECTED_EXPIRES],
];

const REJECTION_CODE = "route_response_header_invalid";

/**
 * Widened write on purpose: contract-illegal spellings are deliberately
 * type-illegal. Every fixture write goes through this helper so a dropped seam
 * fails loudly here instead of degrading into a silent optional-call no-op.
 */
const writeHeaderRaw = (ctx: RouteContext, name: string, value: string): void => {
  const write = ctx.setResponseHeader;
  if (!write) throw new Error("setResponseHeader_seam_missing");
  const widened = write as unknown as (name: string, value: string) => void;
  widened.call(ctx, name, value);
};

const writeCanonicalTriple = (ctx: RouteContext): void => {
  writeHeaderRaw(ctx, "Cache-Control", EXPECTED_CACHE_CONTROL);
  writeHeaderRaw(ctx, "Pragma", EXPECTED_PRAGMA);
  writeHeaderRaw(ctx, "Expires", EXPECTED_EXPIRES);
};

let capturedContexts: RouteContext[] = [];

/** Named diagnostic instead of cascading absence mismatches when the seam vanishes. */
const expectSeamPresent = (label: string): void =>
  expect(typeof capturedContexts[0]?.setResponseHeader, `${label}:seam`).toBe("function");

/**
 * Exact request-ID pin for suites whose handler actually ran. A missing capture
 * must fail here rather than degrade `expectStandardHeadersIntact` into its
 * presence-only branch; that empty-string leniency stays reserved for the
 * fixtures that document it.
 */
const capturedRequestId = (label: string): string => {
  const id = capturedContexts[0]?.requestId;
  expect(typeof id, `${label}:captured-request-id`).toBe("string");
  if (typeof id !== "string") throw new Error("fixture_request_id_uncaptured");
  return id;
};

const resetCapturedContexts = (): void => {
  capturedContexts = [];
};

const singleHandlerRoute = (
  method: RouteDefinition["method"],
  path: string,
  handler: (ctx: RouteContext) => unknown
): RouteDefinition => ({
  method,
  path,
  handlers: [
    (ctx) => {
      capturedContexts.push(ctx);
      return handler(ctx);
    },
  ],
});

const successRoute = (
  path: string,
  writes: (ctx: RouteContext) => void,
  payload: Record<string, unknown> = { ok: true }
): RouteDefinition =>
  singleHandlerRoute("GET", path, (ctx) => {
    writes(ctx);
    return payload;
  });

const FAILURE_SPECS: ReadonlyArray<Readonly<{ status: number; code: string; message: string }>> = [
  { status: 400, code: "fixture_invalid_payload", message: "Fixture payload rejected." },
  { status: 403, code: "fixture_forbidden", message: "Fixture permission denied." },
  { status: 404, code: "media_not_found", message: "Media item not found." },
  { status: 409, code: "fixture_identity_conflict", message: "Fixture identity changed." },
];

const failureRouteFor = (spec: (typeof FAILURE_SPECS)[number]): RouteDefinition =>
  singleHandlerRoute("GET", `/fixture/fail-${spec.status}`, (ctx) => {
    writeCanonicalTriple(ctx);
    throw new ApiError(spec.code, spec.message, spec.status);
  });

const failureSpecByStatus = (status: number) => {
  const spec = FAILURE_SPECS.find((candidate) => candidate.status === status);
  if (!spec) throw new Error(`fixture_failure_spec_missing:${status}`);
  return spec;
};

const dispatchRoutes = async (
  routes: readonly RouteDefinition[],
  path: string,
  init?: RequestInit
): Promise<Response> => {
  const headers = new Headers(init?.headers);
  if (!headers.has("origin")) headers.set("origin", ALLOWED_ORIGIN);
  return dispatchApiRequest(
    new Request(`${BASE_URL}${API_PREFIX}${path}`, { ...init, headers }),
    API_PREFIX,
    routes
  );
};

const rawHeaders = async (response: Response): Promise<RawHeaders> =>
  Object.freeze(
    [...response.headers.entries()].map(([name, value]) => Object.freeze([name, value] as const))
  );

const findHeaderValue = (entries: RawHeaders, name: string): string | undefined => {
  const lowered = name.toLowerCase();
  return entries.find(([key]) => key.toLowerCase() === lowered)?.[1];
};

const countHeaderEntries = (entries: RawHeaders, name: string): number => {
  const lowered = name.toLowerCase();
  return entries.filter(([key]) => key.toLowerCase() === lowered).length;
};

/**
 * requestId contract: omitted ⇒ header must be absent, empty string ⇒ present
 * with an unchecked value, otherwise exact match.
 */
const expectStandardHeadersIntact = (entries: RawHeaders, requestId?: string, label = ""): void => {
  if (requestId === undefined) {
    expect(countHeaderEntries(entries, REQUEST_ID_HEADER), label).toBe(0);
  } else if (requestId === "") {
    expect(findHeaderValue(entries, REQUEST_ID_HEADER), label).toBeTruthy();
  } else {
    expect(findHeaderValue(entries, REQUEST_ID_HEADER), label).toBe(requestId);
  }
  expect(findHeaderValue(entries, "x-content-type-options"), label).toBe("nosniff");
  expect(findHeaderValue(entries, "x-frame-options"), label).toBe("DENY");
  expect(findHeaderValue(entries, "referrer-policy"), label).toBe("no-referrer");
  expect(findHeaderValue(entries, "access-control-allow-origin"), label).toBe(ALLOWED_ORIGIN);
};

const expectCanonicalTripleOnce = (entries: RawHeaders, label = ""): void => {
  for (const [name, value] of CONTRACT_TRIPLE) {
    expect(countHeaderEntries(entries, name), `${label}:${name}`).toBe(1);
    expect(findHeaderValue(entries, name), `${label}:${name}`).toBe(value);
  }
};

const expectNamedHeadersAbsent = (
  entries: RawHeaders,
  names: ReadonlyArray<string>,
  label = ""
): void => {
  for (const name of names) {
    expect(countHeaderEntries(entries, name), `${label}:${name}`).toBe(0);
  }
};

const expectBagFree = (entries: RawHeaders, label = ""): void =>
  expectNamedHeadersAbsent(
    entries,
    CONTRACT_TRIPLE.map(([name]) => name),
    label
  );

const capturedErrorPayload = async (response: Response): Promise<string | undefined> => {
  const payload = (await response.json()) as { error?: { code?: string } };
  return payload.error?.code;
};

describe("TASK-551-08-L03 INITIAL route response headers", () => {
  test("json success carries the closed triple without displacing installed headers", async () => {
    resetCapturedContexts();
    const routes = [
      successRoute("/fixture/success", writeCanonicalTriple, { ok: true, source: "fixture" }),
    ];

    const response = await dispatchRoutes(routes, "/fixture/success");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, source: "fixture" });

    const entries = await rawHeaders(response);
    expectCanonicalTripleOnce(entries, "success");
    expect(findHeaderValue(entries, "content-type"), "success").toContain("application/json");
    expectStandardHeadersIntact(entries, capturedRequestId("success"), "success");

    expect(capturedContexts).toHaveLength(1);
    expectSeamPresent("success");
  });

  test("mapped 400/403/404/409 failures merge the triple after errorResponse", async () => {
    for (const spec of FAILURE_SPECS) {
      resetCapturedContexts();
      const response = await dispatchRoutes(
        [failureRouteFor(spec)],
        `/fixture/fail-${spec.status}`
      );
      expect(response.status, spec.code).toBe(spec.status);
      expect(await capturedErrorPayload(response), spec.code).toBe(spec.code);

      expectSeamPresent(spec.code);
      const entries = await rawHeaders(response);
      expectCanonicalTripleOnce(entries, spec.code);
      expect(findHeaderValue(entries, "content-type"), spec.code).toContain("application/json");
      expectStandardHeadersIntact(entries, capturedRequestId(spec.code), spec.code);
      expect(countHeaderEntries(entries, "set-cookie"), spec.code).toBe(0);
    }
  });

  test("bag state never crosses requests in either direction", async () => {
    resetCapturedContexts();
    const tripleRoutes = [successRoute("/fixture/triple", writeCanonicalTriple)];
    const pragmaOnlyRoutes = [
      successRoute("/fixture/pragma-only", (ctx) => {
        // Lowercase spelling is deliberate: proves case-insensitive acceptance
        // through the real closure, hence the widened raw write.
        writeHeaderRaw(ctx, "pragma", EXPECTED_PRAGMA);
        return { ok: true };
      }),
    ];

    const firstFull = await dispatchRoutes(tripleRoutes, "/fixture/triple");
    expect(firstFull.status).toBe(200);
    expectSeamPresent("first-full");
    expectCanonicalTripleOnce(await rawHeaders(firstFull), "first-full");

    // Narrower success right after a full-write success keeps zero residue.
    const narrowed = await dispatchRoutes(pragmaOnlyRoutes, "/fixture/pragma-only");
    expect(narrowed.status).toBe(200);
    expectSeamPresent("narrow");
    const narrowedEntries = await rawHeaders(narrowed);
    expect(countHeaderEntries(narrowedEntries, "Pragma"), "narrow").toBe(1);
    expect(findHeaderValue(narrowedEntries, "Pragma"), "narrow").toBe(EXPECTED_PRAGMA);
    expectNamedHeadersAbsent(narrowedEntries, ["Cache-Control", "Expires"], "narrow");

    // An errored request between successes still leaves no residue behind.
    const conflictSpec = failureSpecByStatus(409);
    const conflict = await dispatchRoutes(
      [failureRouteFor(conflictSpec)],
      `/fixture/fail-${conflictSpec.status}`
    );
    expect(conflict.status).toBe(409);
    expectCanonicalTripleOnce(await rawHeaders(conflict), "conflict");

    const afterConflict = await dispatchRoutes(pragmaOnlyRoutes, "/fixture/pragma-only");
    expect(afterConflict.status).toBe(200);
    const afterEntries = await rawHeaders(afterConflict);
    expect(findHeaderValue(afterEntries, "Pragma"), "after-conflict").toBe(EXPECTED_PRAGMA);
    expectNamedHeadersAbsent(afterEntries, ["Cache-Control", "Expires"], "after-conflict");

    // Reverse direction: full-write success after narrow/error requests gains nothing.
    const finalFull = await dispatchRoutes(tripleRoutes, "/fixture/triple");
    expect(finalFull.status).toBe(200);
    expectCanonicalTripleOnce(await rawHeaders(finalFull), "final-full");
    expect(capturedContexts, "context-per-request").toHaveLength(5);
  });

  test("same-value rewrite is idempotent; conflicting duplicates reject before mutation", async () => {
    resetCapturedContexts();
    const idempotentRoutes = [
      singleHandlerRoute("GET", "/fixture/idempotent", (ctx) => {
        // Mixed-case spellings are deliberate: proves ascii case-insensitive
        // acceptance and idempotence, hence the widened raw writes.
        writeHeaderRaw(ctx, "Cache-Control", EXPECTED_CACHE_CONTROL);
        writeHeaderRaw(ctx, "CACHE-CONTROL", EXPECTED_CACHE_CONTROL);
        writeHeaderRaw(ctx, "cache-control", EXPECTED_CACHE_CONTROL);
        return { ok: true };
      }),
    ];
    const idempotent = await dispatchRoutes(idempotentRoutes, "/fixture/idempotent");
    expect(idempotent.status).toBe(200);
    expectSeamPresent("idempotent");
    expect(countHeaderEntries(await rawHeaders(idempotent), "Cache-Control")).toBe(1);

    resetCapturedContexts();
    const conflictingRoutes = [
      singleHandlerRoute("GET", "/fixture/conflicting", (ctx) => {
        writeCanonicalTriple(ctx);
        writeHeaderRaw(ctx, "Cache-Control", "no-store");
        throw new ApiError("unreachable_after_rejection", "Unreachable.", 500);
      }),
    ];
    const conflicting = await dispatchRoutes(conflictingRoutes, "/fixture/conflicting");
    expect(conflicting.status).toBe(400);
    expectSeamPresent("conflicting");
    expect(await capturedErrorPayload(conflicting)).toBe(REJECTION_CODE);

    const entries = await rawHeaders(conflicting);
    // Earlier accepted writes survive untouched; the conflicting value never lands.
    expectCanonicalTripleOnce(entries, "conflicting");
    expect(findHeaderValue(entries, "content-type"), "conflicting").toContain("application/json");
  });

  test("ascii case variants are accepted and canonicalized to the contract spellings", async () => {
    resetCapturedContexts();
    const routes = [
      successRoute("/fixture/case-variants", (ctx) => {
        writeHeaderRaw(ctx, "cACHE-cONTROL", EXPECTED_CACHE_CONTROL);
        writeHeaderRaw(ctx, "PRAGMA", EXPECTED_PRAGMA);
        writeHeaderRaw(ctx, "expires", EXPECTED_EXPIRES);
        return { ok: true };
      }),
    ];

    const response = await dispatchRoutes(routes, "/fixture/case-variants");
    expect(response.status).toBe(200);
    expectSeamPresent("case-variants");

    // Wire level: every ascii case variant is accepted exactly once with the
    // contract value (HTTP header names are case-insensitive on the wire).
    const entries = await rawHeaders(response);
    expectCanonicalTripleOnce(entries, "case-variants");

    // Bag level: the closed v1 API stores the exact contract spellings.
    const bag = createRouteResponseHeaderBag();
    bag.set("cACHE-cONTROL", EXPECTED_CACHE_CONTROL);
    bag.set("PRAGMA", EXPECTED_PRAGMA);
    bag.set("expires", EXPECTED_EXPIRES);
    expect(bag.entries()).toEqual([
      ["Cache-Control", EXPECTED_CACHE_CONTROL],
      ["Pragma", EXPECTED_PRAGMA],
      ["Expires", EXPECTED_EXPIRES],
    ]);
  });

  test("invalid writes reject route_response_header_invalid before any mutation", async () => {
    const cases: ReadonlyArray<Readonly<{ label: string; name: string; value: string }>> = [
      { label: "unknown-name", name: "X-Marketing-Tag", value: "benign" },
      { label: "alternate-value", name: "Cache-Control", value: "no-store" },
      { label: "control-byte-in-name", name: "Cache\u0000Control", value: EXPECTED_CACHE_CONTROL },
      { label: "newline-in-name", name: "Cache\nControl", value: EXPECTED_CACHE_CONTROL },
      { label: "control-byte-in-value", name: "Expires", value: `0\u0007polluted` },
      {
        label: "newline-in-value",
        name: "Pragma",
        value: `${EXPECTED_PRAGMA}\r\nSet-Cookie: injected=1`,
      },
      { label: "max-plus-one-bytes", name: "Expires", value: "x".repeat(65) },
    ];

    for (const invalidCase of cases) {
      resetCapturedContexts();
      const routes = [
        singleHandlerRoute("GET", "/fixture/invalid", (ctx) => {
          // Accepted first so that rejection-before-mutation becomes observable.
          writeHeaderRaw(ctx, "Pragma", EXPECTED_PRAGMA);
          writeHeaderRaw(ctx, invalidCase.name, invalidCase.value);
          throw new ApiError("unreachable_after_rejection", "Unreachable.", 500);
        }),
      ];

      const response = await dispatchRoutes(routes, "/fixture/invalid");
      expect(response.status, invalidCase.label).toBe(400);
      expectSeamPresent(invalidCase.label);
      expect(await capturedErrorPayload(response), invalidCase.label).toBe(REJECTION_CODE);

      const entries = await rawHeaders(response);
      // Only the earlier accepted write survives: pragma once, everything else never.
      expect(countHeaderEntries(entries, "Pragma"), invalidCase.label).toBe(1);
      expect(findHeaderValue(entries, "Pragma"), invalidCase.label).toBe(EXPECTED_PRAGMA);
      expectNamedHeadersAbsent(
        entries,
        ["Cache-Control", "Expires", "X-Marketing-Tag"],
        invalidCase.label
      );
      expect(countHeaderEntries(entries, "set-cookie"), invalidCase.label).toBe(0);
      expectStandardHeadersIntact(entries, "", invalidCase.label);
    }
  });

  test("handlers cannot displace content-type or install cookies through the seam", async () => {
    resetCapturedContexts();
    const routes = [
      successRoute("/fixture/impersonate", (ctx) => {
        // Accepted first so partial retention stays observable after rejection.
        writeHeaderRaw(ctx, "Pragma", EXPECTED_PRAGMA);
        writeHeaderRaw(ctx, "Content-Type", "text/html; charset=utf-16");
        throw new ApiError("unreachable_after_rejection", "Unreachable.", 500);
      }),
    ];

    const response = await dispatchRoutes(routes, "/fixture/impersonate");
    expect(response.status).toBe(400);
    expectSeamPresent("impersonate");
    expect(await capturedErrorPayload(response)).toBe(REJECTION_CODE);

    const entries = await rawHeaders(response);
    expect(findHeaderValue(entries, "content-type"), "content-type guard").toContain(
      "application/json"
    );
    expect(countHeaderEntries(entries, "set-cookie")).toBe(0);
    expect(countHeaderEntries(entries, "Pragma"), "pragma retained").toBe(1);
    expectNamedHeadersAbsent(entries, ["Cache-Control", "Expires"], "impersonate");
  });

  test("parse-stage failures keep standard headers and stay bag-free", async () => {
    resetCapturedContexts();
    const routes = [
      singleHandlerRoute("POST", "/fixture/echo", () => {
        throw new ApiError("handler_must_not_run", "Unreachable.", 500);
      }),
    ];

    const response = await dispatchRoutes(routes, "/fixture/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not-json",
    });
    expect(response.status).toBe(400);
    expect(await capturedErrorPayload(response)).toBe("invalid_json");

    const entries = await rawHeaders(response);
    expectBagFree(entries, "parse-stage");
    expect(findHeaderValue(entries, "content-type")).toContain("application/json");
    expectStandardHeadersIntact(entries, "", "parse-stage");
    // No handler ran, so no route context was ever captured.
    expect(capturedContexts).toHaveLength(0);
  });

  test("pre-route outcomes stay bag-free: OPTIONS, plain-text 404 and the default router", async () => {
    resetCapturedContexts();
    const unrelated = [successRoute("/fixture/unrelated", writeCanonicalTriple)];

    const options = await dispatchApiRequest(
      new Request(`${BASE_URL}${API_PREFIX}/fixture/anything`, {
        method: "OPTIONS",
        headers: { origin: ALLOWED_ORIGIN },
      }),
      API_PREFIX,
      unrelated
    );
    expect(options.status).toBe(204);
    expect(await options.text()).toBe("");
    expectBagFree(await rawHeaders(options), "options");
    expect(capturedContexts).toHaveLength(0);

    const unmatched = await dispatchRoutes(unrelated, "/fixture/nothing-here");
    expect(unmatched.status).toBe(404);
    expect(await unmatched.text()).toBe("Not Found");
    const unmatchedEntries = await rawHeaders(unmatched);
    expectBagFree(unmatchedEntries, "plain-404");
    // Standard assembly still reaches the plain-text lane, without JSON framing.
    expectStandardHeadersIntact(unmatchedEntries, "", "plain-404");
    const unmatchedContentType = findHeaderValue(unmatchedEntries, "content-type") ?? "";
    expect(unmatchedContentType.includes("application/json")).toBe(false);
    expect(capturedContexts).toHaveLength(0);

    // Omitting the routes argument drives the production module router: the same
    // fixture path stays unmatched there, proving the default lane is intact.
    const productionDefault = await dispatchApiRequest(
      new Request(`${BASE_URL}${API_PREFIX}/fixture/nothing-here`),
      API_PREFIX
    );
    expect(productionDefault.status).toBe(404);
    expect(await productionDefault.text()).toBe("Not Found");
    expectBagFree(await rawHeaders(productionDefault), "default-router");
    expect(capturedContexts).toHaveLength(0);
  });

  test("injected route tables are refused under production evaluation", async () => {
    resetCapturedContexts();
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const refusal = await dispatchApiRequest(
        new Request(`${BASE_URL}${API_PREFIX}/fixture/refused`),
        API_PREFIX,
        [successRoute("/fixture/refused", writeCanonicalTriple)]
      ).then(
        () => null,
        (error: unknown) => error
      );

      // Host policy lives only in startHttpServer's fetch wrapper, so an
      // injected table that skips it must never be servable in production.
      expect(refusal).toBeInstanceOf(ApiError);
      expect((refusal as ApiError | null)?.code).toBe(
        "api_route_injection_forbidden_in_production"
      );
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
    expect(process.env.NODE_ENV, "node-env-restored").toBe(previousNodeEnv);

    // The default route table stays servable even in production evaluation.
    const defaultLane = await dispatchApiRequest(
      new Request(`${BASE_URL}${API_PREFIX}/fixture/nothing-here`),
      API_PREFIX
    );
    expect(defaultLane.status).toBe(404);
  });
});
