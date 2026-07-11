import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { formFields, forms, formSubmissions } from "../../../core/db/schema";
import {
  __setFormWriteExecutorDepsForTests,
  executePreparedFormWrite,
  handlePublicFormsApi,
  UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
  type FormWriteExecutorDeps,
} from "../../../core/server/publicFormsApi";
import {
  createPreparedFormWriteForm,
  createPreparedFormWriteDescriptor,
  handleFormAttachmentUploadRoute,
  handleFormSubmissionRoute,
  mapFormError,
  type FormWriteAccessTarget,
  type PreparedFormWriteAccess,
  type PreparedFormWriteForm,
  type RouteContext,
} from "../../../core/server/routes/formsRoutes";
import { checkRateLimit, resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { ApiError } from "../../../core/server/errorHandler";
import { parseRequestBody } from "../../../core/server/requestBody";
import {
  createForm,
  listFormFields,
  setFormFields,
} from "../../../core/services/forms/formsService";
import { submitForm } from "../../../core/services/forms/submissionService";
import { uploadMedia } from "../../../core/services/media/mediaService";
import { evaluateSubmissionAccess } from "../../../core/services/forms/submissionAccess";
import { createFormSubmissionNonce } from "../../../core/services/forms/submissionNonce";
import {
  SECURITY_SETTINGS_DEFAULTS,
  type SecuritySettings,
} from "../../../core/services/settings/securitySettings";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const originalNonceSecret = process.env.FORM_SUBMIT_NONCE_SECRET;
const createdFormIds: string[] = [];
const FORM_ID = "11111111-2222-4333-8444-555555555555";
const SECOND_FORM_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const getSecurity = (): SecuritySettings => ({
  ...SECURITY_SETTINGS_DEFAULTS,
  rateLimit: {
    ...SECURITY_SETTINGS_DEFAULTS.rateLimit,
    enabled: false,
  },
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: false,
  },
});

const getRateLimitedSecurity = (maxRequests = 1): SecuritySettings => ({
  ...getSecurity(),
  rateLimit: {
    ...SECURITY_SETTINGS_DEFAULTS.rateLimit,
    enabled: true,
    buckets: {
      ...SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets,
      public_write: {
        ...SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.public_write,
        maxRequests,
      },
      admin_write: {
        ...SECURITY_SETTINGS_DEFAULTS.rateLimit.buckets.admin_write,
        maxRequests,
      },
    },
  },
});

const getCaptchaSecurity = (): SecuritySettings => ({
  ...getSecurity(),
  botProtection: {
    ...SECURITY_SETTINGS_DEFAULTS.botProtection,
    enabled: true,
    siteKey: "forms-test-site-key",
    secretKey: "forms-test-secret-key",
    enforceOnLocalhost: true,
  },
});

const fakeForm = (id = FORM_ID, submissionAccess: string = "public"): FormWriteAccessTarget => ({
  id,
  name: "Executor form",
  slug: `executor-${id}`,
  status: "published",
  description: null,
  successMessage: "Thanks",
  successRedirectUrl: null,
  submissionAccess,
  settings: {},
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: new Date("2026-07-10T00:00:00.000Z"),
});

const frozenFakeForm = (id = FORM_ID, submissionAccess = "internal") => {
  return createPreparedFormWriteForm(fakeForm(id, submissionAccess));
};

const jsonWriteRequest = (
  formId: string,
  kind: "submissions" | "uploads" = "submissions",
  path = `/forms/${formId}/${kind}`,
  headers: HeadersInit = {}
) => {
  const url = new URL(path, "http://localhost");
  return {
    url,
    request: new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ data: {} }),
    }),
  };
};

const runExecutor = async (
  formId = FORM_ID,
  kind: "submissions" | "uploads" = "submissions",
  security = getSecurity(),
  path?: string,
  headers?: HeadersInit
) => {
  const { url, request } = jsonWriteRequest(formId, kind, path, headers);
  return executePreparedFormWrite(request, {
    url,
    security,
    ip: "192.0.2.1",
    userAgent: "forms-executor-test",
  });
};

const installSuccessfulExecutor = (
  overrides: Partial<FormWriteExecutorDeps> = {},
  mode: string = "public"
) => {
  __setFormWriteExecutorDepsForTests({
    attachSession: async () => undefined,
    loadAccessTarget: async (formId) => fakeForm(formId, mode),
    chargeRateLimit: () => undefined,
    authenticateApiKey: async () => null,
    enforceSessionCsrf: async () => undefined,
    requireSessionFormsWrite: async () => undefined,
    loadUploadStorageMaxBytes: async () => 10 * 1024 * 1024,
    parseBody: async () => ({ data: {} }),
    dispatchSubmission: async () => ({ ok: true }),
    dispatchUpload: async () => ({ ok: true }),
    ...overrides,
  });
};

const cleanup = async () => {
  if (!hasDb || createdFormIds.length === 0) return;
  const formIds = [...new Set(createdFormIds)];
  await db.delete(formSubmissions).where(inArray(formSubmissions.formId, formIds));
  await db.delete(formFields).where(inArray(formFields.formId, formIds));
  await db.delete(forms).where(inArray(forms.id, formIds));
  createdFormIds.length = 0;
};

const createTrackedForm = async () => {
  const form = await createForm({
    name: `Public form ${randomUUID()}`,
    status: "published",
    submissionAccess: "public",
    successMessage: "Form thanks",
  });
  createdFormIds.push(form.id);
  return form;
};

beforeEach(() => {
  __setFormWriteExecutorDepsForTests(null);
  resetRateLimitBuckets();
  process.env.FORM_SUBMIT_NONCE_SECRET =
    originalNonceSecret && originalNonceSecret.trim().length > 0
      ? originalNonceSecret
      : "coderso_public_forms_nonce_test_secret_32";
});

afterEach(async () => {
  __setFormWriteExecutorDepsForTests(null);
  resetRateLimitBuckets();
  await cleanup();
});

afterAll(async () => {
  __setFormWriteExecutorDepsForTests(null);
  await cleanup();
  if (originalNonceSecret === undefined) {
    delete process.env.FORM_SUBMIT_NONCE_SECRET;
  } else {
    process.env.FORM_SUBMIT_NONCE_SECRET = originalNonceSecret;
  }
});

test("public forms handler returns null for non-form submission paths", async () => {
  const url = new URL("http://localhost/api/search?q=test");
  const response = await handlePublicFormsApi(new Request(url.toString()), {
    url,
    security: getSecurity(),
    ip: "127.0.0.1",
    userAgent: "test",
  });
  expect(response).toBeNull();
});

test("Forms upload mapper preserves media_file_invalid as a stable client error", () => {
  const mapped = mapFormError(new Error("media_file_invalid"));

  expect(mapped).toBeInstanceOf(ApiError);
  expect(mapped).toMatchObject({
    code: "media_file_invalid",
    message: "Invalid upload payload",
    status: 400,
  });
});

test.each(["submissions", "uploads"] as const)(
  "shared executor prepares %s with one public_write charge and one immutable descriptor",
  async (kind) => {
    const rates: Array<{
      bucket: string;
      identity: Record<string, unknown>;
      authenticated: boolean;
    }> = [];
    let authenticateCalls = 0;
    let dispatchedContext: RouteContext | null = null;
    installSuccessfulExecutor({
      chargeRateLimit(bucket, identity, _config, options) {
        rates.push({
          bucket,
          identity: { ...identity },
          authenticated: options?.isAuthenticated ?? false,
        });
      },
      async authenticateApiKey() {
        authenticateCalls += 1;
        return null;
      },
      async dispatchSubmission(ctx) {
        dispatchedContext = ctx;
        return { kind: "submission" };
      },
      async dispatchUpload(ctx) {
        dispatchedContext = ctx;
        return { kind: "upload" };
      },
    });

    const execution = await runExecutor(FORM_ID, kind);
    expect(execution).toMatchObject({ matched: true, ok: true });
    expect(rates).toEqual([
      {
        bucket: "public_write",
        identity: {
          ip: "192.0.2.1",
          userAgent: "forms-executor-test",
          identifier: FORM_ID,
        },
        authenticated: false,
      },
    ]);
    expect(authenticateCalls).toBe(0);
    expect(dispatchedContext).not.toBeNull();
    if (!execution.matched || !execution.ok) throw new Error("expected executor success");
    const descriptor = (dispatchedContext as RouteContext | null)?.preparedFormWrite;
    expect(descriptor).toBe(execution.routeContext.preparedFormWrite);
    expect(descriptor).toMatchObject({
      kind: kind === "uploads" ? "upload" : "submission",
      formId: FORM_ID,
      access: {
        mode: "public",
        principal: "anonymous",
        requireFormNonce: true,
        requireCaptcha: true,
      },
    });
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor?.form)).toBe(true);
    expect(Object.isFrozen(descriptor?.access)).toBe(true);
  }
);

test.each([
  ["non-UUID", `/forms/not-a-uuid/submissions`],
  ["decode-invalid", `/forms/%ZZ/submissions`],
  ["oversized", `/forms/${"a".repeat(109)}/uploads`],
] as const)("matched %s form IDs use the exact unresolved rate sentinel", async (_label, path) => {
  const rates: Array<{ bucket: string; identity: Record<string, unknown> }> = [];
  let loaderCalls = 0;
  let bodyCalls = 0;
  installSuccessfulExecutor({
    async loadAccessTarget() {
      loaderCalls += 1;
      return null;
    },
    chargeRateLimit(bucket, identity) {
      rates.push({ bucket, identity: { ...identity } });
    },
    async parseBody() {
      bodyCalls += 1;
      return {};
    },
  });

  const execution = await runExecutor(FORM_ID, "submissions", getSecurity(), path);
  expect(execution).toMatchObject({ matched: true, ok: false });
  if (!execution.matched || execution.ok) throw new Error("expected executor failure");
  expect(execution.error).toMatchObject({ code: "form_invalid", status: 400 });
  expect(rates).toEqual([
    {
      bucket: "public_write",
      identity: {
        ip: "192.0.2.1",
        userAgent: "forms-executor-test",
        identifier: UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
      },
    },
  ]);
  expect(Object.hasOwn(rates[0]?.identity ?? {}, "userId")).toBe(false);
  expect(loaderCalls).toBe(0);
  expect(bodyCalls).toBe(0);
});

test("distinct malformed targets share one non-rotatable maxRequests=1 sentinel", async () => {
  __setFormWriteExecutorDepsForTests({ chargeRateLimit: checkRateLimit });
  const security = getRateLimitedSecurity(1);

  const first = await runExecutor(
    FORM_ID,
    "submissions",
    security,
    "/forms/not-a-uuid/submissions"
  );
  const second = await runExecutor(
    FORM_ID,
    "submissions",
    security,
    `/forms/${"b".repeat(109)}/submissions`
  );
  expect(first).toMatchObject({ matched: true, ok: false, error: { code: "form_invalid" } });
  expect(second).toMatchObject({ matched: true, ok: false, error: { code: "rate_limited" } });
});

test("distinct missing UUIDs share the unresolved sentinel after one loader call each", async () => {
  let loaderCalls = 0;
  __setFormWriteExecutorDepsForTests({
    attachSession: async () => undefined,
    async loadAccessTarget() {
      loaderCalls += 1;
      return null;
    },
    chargeRateLimit: checkRateLimit,
  });
  const security = getRateLimitedSecurity(1);

  const first = await runExecutor(FORM_ID, "submissions", security);
  const second = await runExecutor(SECOND_FORM_ID, "submissions", security);
  expect(first).toMatchObject({ matched: true, ok: false, error: { code: "form_not_found" } });
  expect(second).toMatchObject({ matched: true, ok: false, error: { code: "rate_limited" } });
  expect(loaderCalls).toBe(2);
});

test("missing form charges the exact unresolved identity without userId", async () => {
  let captured: { bucket: string; identity: Record<string, unknown> } | null = null;
  __setFormWriteExecutorDepsForTests({
    attachSession: async () => undefined,
    loadAccessTarget: async () => null,
    chargeRateLimit(bucket, identity) {
      captured = { bucket, identity: { ...identity } };
    },
  });
  const execution = await runExecutor();
  expect(execution).toMatchObject({
    matched: true,
    ok: false,
    error: { code: "form_not_found", status: 404 },
  });
  expect(captured).toEqual({
    bucket: "public_write",
    identity: {
      ip: "192.0.2.1",
      userAgent: "forms-executor-test",
      identifier: UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
    },
  });
  const capturedValue = captured as {
    bucket: string;
    identity: Record<string, unknown>;
  } | null;
  expect(Object.hasOwn(capturedValue?.identity ?? {}, "userId")).toBe(false);
});

test.each(["submissions", "uploads"] as const)(
  "valid public %s succeeds once and the equivalent second request is rate limited",
  async (kind) => {
    installSuccessfulExecutor({ chargeRateLimit: checkRateLimit });
    const security = getRateLimitedSecurity(1);
    const first = await runExecutor(FORM_ID, kind, security);
    const second = await runExecutor(FORM_ID, kind, security);
    expect(first).toMatchObject({ matched: true, ok: true });
    expect(second).toMatchObject({
      matched: true,
      ok: false,
      error: { code: "rate_limited", status: 429 },
    });
  }
);

test.each(["attach", "load", "invalid-mode"] as const)(
  "%s target preparation failure charges once and performs no downstream work",
  async (failurePoint) => {
    const calls = {
      attach: 0,
      load: 0,
      rate: 0,
      authenticate: 0,
      csrf: 0,
      rbac: 0,
      body: 0,
      handler: 0,
    };
    let capturedIdentifier = "";
    installSuccessfulExecutor({
      async attachSession() {
        calls.attach += 1;
        if (failurePoint === "attach") throw new Error("session_lookup_failed");
      },
      async loadAccessTarget(formId) {
        calls.load += 1;
        if (failurePoint === "load") throw new Error("form_lookup_failed");
        return fakeForm(formId, failurePoint === "invalid-mode" ? "legacy" : "public");
      },
      chargeRateLimit(_bucket, identity) {
        calls.rate += 1;
        capturedIdentifier = identity.identifier ?? "";
      },
      async authenticateApiKey() {
        calls.authenticate += 1;
        return null;
      },
      async enforceSessionCsrf() {
        calls.csrf += 1;
      },
      async requireSessionFormsWrite() {
        calls.rbac += 1;
      },
      async parseBody() {
        calls.body += 1;
        return {};
      },
      async dispatchSubmission() {
        calls.handler += 1;
        return {};
      },
    });

    const execution = await runExecutor();
    expect(execution).toMatchObject({ matched: true, ok: false });
    expect(calls).toEqual({
      attach: 1,
      load: failurePoint === "attach" ? 0 : 1,
      rate: 1,
      authenticate: 0,
      csrf: 0,
      rbac: 0,
      body: 0,
      handler: 0,
    });
    expect(capturedIdentifier).toBe(UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER);
  }
);

test("an incoherent partial session is sentinel-charged and never propagates userId", async () => {
  let loaderCalls = 0;
  let rateIdentity: Record<string, unknown> | null = null;
  let bodyCalls = 0;
  installSuccessfulExecutor({
    async attachSession(ctx) {
      ctx.user = { id: "orphan-user" };
    },
    async loadAccessTarget() {
      loaderCalls += 1;
      return null;
    },
    chargeRateLimit(_bucket, identity) {
      rateIdentity = { ...identity };
    },
    async parseBody() {
      bodyCalls += 1;
      return {};
    },
  });
  const execution = await runExecutor();
  expect(execution).toMatchObject({ matched: true, ok: false });
  expect(rateIdentity).toEqual({
    ip: "192.0.2.1",
    userAgent: "forms-executor-test",
    identifier: UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
  });
  expect(loaderCalls).toBe(0);
  expect(bodyCalls).toBe(0);
});

test("fully percent-encoded canonical UUID is the accepted 108-byte lookup boundary", async () => {
  const encodedId = [...FORM_ID]
    .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .join("");
  expect(new TextEncoder().encode(encodedId).byteLength).toBe(108);
  let loaderCalls = 0;
  installSuccessfulExecutor({
    async loadAccessTarget(formId) {
      loaderCalls += 1;
      expect(formId).toBe(FORM_ID);
      return fakeForm(formId);
    },
  });

  const execution = await runExecutor(
    FORM_ID,
    "submissions",
    getSecurity(),
    `/forms/${encodedId}/submissions`
  );
  expect(execution).toMatchObject({ matched: true, ok: true });
  expect(loaderCalls).toBe(1);
});

test("a 109-byte ID segment fails before decode, lookup, or body parsing", async () => {
  let loaderCalls = 0;
  let bodyCalls = 0;
  installSuccessfulExecutor({
    async loadAccessTarget() {
      loaderCalls += 1;
      return null;
    },
    async parseBody() {
      bodyCalls += 1;
      return {};
    },
  });
  const execution = await runExecutor(
    FORM_ID,
    "submissions",
    getSecurity(),
    `/forms/${"1".repeat(109)}/submissions`
  );
  expect(execution).toMatchObject({ matched: true, ok: false, error: { code: "form_invalid" } });
  expect(loaderCalls).toBe(0);
  expect(bodyCalls).toBe(0);
});

test.each([
  `/forms/${FORM_ID}/submissions/`,
  `/forms//${FORM_ID}//submissions`,
  `/forms///${FORM_ID}/submissions///`,
])("generic-router-compatible slash shape is consumed: %s", async (path) => {
  let loaderCalls = 0;
  installSuccessfulExecutor({
    async loadAccessTarget(formId) {
      loaderCalls += 1;
      return fakeForm(formId);
    },
  });
  const execution = await runExecutor(FORM_ID, "submissions", getSecurity(), path);
  expect(execution).toMatchObject({ matched: true, ok: true });
  expect(loaderCalls).toBe(1);
});

test("public cookie sessions omit userId from rate identity, still require nonce, and ignore bearer", async () => {
  const rates: Array<{ identity: Record<string, unknown>; authenticated: boolean }> = [];
  let authenticateCalls = 0;
  installSuccessfulExecutor({
    async attachSession(ctx) {
      ctx.user = { id: "session-user" };
      ctx.sessionId = "session-id";
    },
    chargeRateLimit(_bucket, identity, _config, options) {
      rates.push({
        identity: { ...identity },
        authenticated: options?.isAuthenticated ?? false,
      });
    },
    async authenticateApiKey() {
      authenticateCalls += 1;
      return null;
    },
  });

  const execution = await runExecutor(FORM_ID, "submissions", getSecurity(), undefined, {
    authorization: "Bearer valid-looking-public-token",
    cookie: "coderso_session=fake",
  });
  expect(execution).toMatchObject({
    matched: true,
    ok: true,
    routeContext: {
      preparedFormWrite: {
        access: {
          mode: "public",
          principal: "session",
          requireFormNonce: true,
          requireCaptcha: false,
        },
      },
    },
  });
  expect(rates).toEqual([
    {
      identity: {
        ip: "192.0.2.1",
        userAgent: "forms-executor-test",
        identifier: FORM_ID,
      },
      authenticated: false,
    },
  ]);
  expect(authenticateCalls).toBe(0);
});

test("internal session ordering is limiter then CSRF then RBAC then body and handler", async () => {
  const order: string[] = [];
  let rateIdentity: Record<string, unknown> | null = null;
  installSuccessfulExecutor(
    {
      async attachSession(ctx) {
        order.push("attach");
        ctx.user = { id: "session-user" };
        ctx.sessionId = "session-id";
      },
      async loadAccessTarget(formId) {
        order.push("load");
        return fakeForm(formId, "internal");
      },
      chargeRateLimit(bucket, identity, _config, options) {
        order.push("rate");
        expect(bucket).toBe("admin_write");
        expect(options?.isAuthenticated).toBe(true);
        rateIdentity = { ...identity };
      },
      async enforceSessionCsrf() {
        order.push("csrf");
      },
      async requireSessionFormsWrite() {
        order.push("rbac");
      },
      async parseBody() {
        order.push("body");
        return { data: {} };
      },
      async dispatchSubmission() {
        order.push("handler");
        return { ok: true };
      },
    },
    "internal"
  );

  const execution = await runExecutor();
  expect(execution).toMatchObject({ matched: true, ok: true });
  expect(order).toEqual(["attach", "load", "rate", "csrf", "rbac", "body", "handler"]);
  expect(rateIdentity).toEqual({
    ip: "192.0.2.1",
    userAgent: "forms-executor-test",
    identifier: FORM_ID,
    userId: "session-user",
  });
});

test("internal CSRF rejection occurs after rate and before RBAC or body", async () => {
  const order: string[] = [];
  installSuccessfulExecutor(
    {
      async attachSession(ctx) {
        ctx.user = { id: "session-user" };
        ctx.sessionId = "session-id";
      },
      chargeRateLimit() {
        order.push("rate");
      },
      async enforceSessionCsrf() {
        order.push("csrf");
        throw new ApiError("csrf_invalid", "Invalid CSRF token", 403);
      },
      async requireSessionFormsWrite() {
        order.push("rbac");
      },
      async parseBody() {
        order.push("body");
        return {};
      },
    },
    "internal"
  );

  const execution = await runExecutor();
  expect(execution).toMatchObject({ matched: true, ok: false, error: { code: "csrf_invalid" } });
  expect(order).toEqual(["rate", "csrf"]);
});

test("internal RBAC rejection occurs after limiter and valid CSRF but before body", async () => {
  const order: string[] = [];
  installSuccessfulExecutor(
    {
      async attachSession(ctx) {
        ctx.user = { id: "session-user" };
        ctx.sessionId = "session-id";
      },
      chargeRateLimit() {
        order.push("rate");
      },
      async enforceSessionCsrf() {
        order.push("csrf");
      },
      async requireSessionFormsWrite() {
        order.push("rbac");
        throw new Error("forbidden");
      },
      async parseBody() {
        order.push("body");
        return {};
      },
    },
    "internal"
  );

  const execution = await runExecutor();
  expect(execution).toMatchObject({ matched: true, ok: false, error: { code: "forbidden" } });
  expect(order).toEqual(["rate", "csrf", "rbac"]);
});

test.each([
  { message: "auth_required", status: 401 },
  { message: "forbidden", status: 403 },
] as const)("public wrapper maps raw internal RBAC $message to $status", async (entry) => {
  const order: string[] = [];
  installSuccessfulExecutor(
    {
      async attachSession(ctx) {
        ctx.user = { id: "session-user" };
        ctx.sessionId = "session-id";
      },
      chargeRateLimit() {
        order.push("rate");
      },
      async enforceSessionCsrf() {
        order.push("csrf");
      },
      async requireSessionFormsWrite() {
        order.push("rbac");
        throw new Error(entry.message);
      },
      async parseBody() {
        order.push("body");
        return {};
      },
    },
    "internal"
  );
  const { url, request } = jsonWriteRequest(FORM_ID);
  const response = await handlePublicFormsApi(request, {
    url,
    security: getSecurity(),
    ip: "192.0.2.1",
    userAgent: "rbac-wrapper-test",
  });
  expect(response?.status).toBe(entry.status);
  expect(await response?.json()).toMatchObject({ error: { code: entry.message } });
  expect(order).toEqual(["rate", "csrf", "rbac"]);
});

test("authenticated internal sessions retain admin_write limiter bypass", async () => {
  installSuccessfulExecutor(
    {
      async attachSession(ctx) {
        ctx.user = { id: "session-user" };
        ctx.sessionId = "session-id";
      },
      chargeRateLimit: checkRateLimit,
    },
    "internal"
  );
  const security = getRateLimitedSecurity(1);
  const first = await runExecutor(FORM_ID, "submissions", security);
  const second = await runExecutor(FORM_ID, "submissions", security);
  expect(first).toMatchObject({ matched: true, ok: true });
  expect(second).toMatchObject({ matched: true, ok: true });
});

test("internal API keys remain admin_write limited and the second request stops before verification", async () => {
  let authenticateCalls = 0;
  installSuccessfulExecutor(
    {
      chargeRateLimit: checkRateLimit,
      async authenticateApiKey() {
        authenticateCalls += 1;
        return {
          id: "key-id",
          name: "Forms key",
          scopes: ["forms.submit"],
          prefix: "prefix",
          createdAt: new Date(),
          lastUsedAt: null,
          revokedAt: null,
        };
      },
    },
    "internal"
  );
  const security = getRateLimitedSecurity(1);
  const first = await runExecutor(FORM_ID, "submissions", security, undefined, {
    authorization: "Bearer internal-key",
  });
  const second = await runExecutor(FORM_ID, "submissions", security, undefined, {
    authorization: "Bearer internal-key",
  });
  expect(first).toMatchObject({ matched: true, ok: true });
  expect(second).toMatchObject({
    matched: true,
    ok: false,
    error: { code: "rate_limited", status: 429 },
  });
  expect(authenticateCalls).toBe(1);
});

test.each([
  { scopes: ["forms.submit"], expectedOk: true, expectedCode: undefined },
  { scopes: ["content.read"], expectedOk: false, expectedCode: "forbidden" },
  { scopes: null, expectedOk: false, expectedCode: "auth_required" },
])("internal API-key authorization is rate-first for scopes $scopes", async (entry) => {
  const order: string[] = [];
  installSuccessfulExecutor(
    {
      chargeRateLimit(bucket, _identity, _config, options) {
        order.push("rate");
        expect(bucket).toBe("admin_write");
        expect(options?.isAuthenticated).toBe(false);
      },
      async authenticateApiKey() {
        order.push("api-key");
        return entry.scopes
          ? {
              id: "key-id",
              name: "Forms key",
              scopes: entry.scopes,
              prefix: "prefix",
              createdAt: new Date(),
              lastUsedAt: null,
              revokedAt: null,
            }
          : null;
      },
      async parseBody() {
        order.push("body");
        return { data: {} };
      },
      async dispatchSubmission() {
        order.push("handler");
        return {};
      },
    },
    "internal"
  );

  const execution = await runExecutor(FORM_ID, "submissions", getSecurity(), undefined, {
    authorization: "Bearer internal-key",
  });
  expect(execution).toMatchObject({ matched: true, ok: entry.expectedOk });
  if (!entry.expectedOk && execution.matched && !execution.ok) {
    expect(execution.error).toMatchObject({ code: entry.expectedCode });
    expect(order).toEqual(["rate", "api-key"]);
  } else {
    expect(order).toEqual(["rate", "api-key", "body", "handler"]);
  }
});

test.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity])(
  "invalid upload storage maximum %s fails before body or handler",
  async (configuredMax) => {
    let bodyCalls = 0;
    let handlerCalls = 0;
    installSuccessfulExecutor({
      loadUploadStorageMaxBytes: async () => configuredMax,
      async parseBody() {
        bodyCalls += 1;
        return {};
      },
      async dispatchUpload() {
        handlerCalls += 1;
        return {};
      },
    });

    const execution = await runExecutor(FORM_ID, "uploads");
    expect(execution).toMatchObject({
      matched: true,
      ok: false,
      error: { code: "media_storage_unavailable", status: 503 },
    });
    expect(bodyCalls).toBe(0);
    expect(handlerCalls).toBe(0);
  }
);

test.each([
  { configured: 5 * 1024 * 1024, expected: 5 * 1024 * 1024 + 64 * 1024 },
  { configured: 200 * 1024 * 1024, expected: 100 * 1024 * 1024 + 64 * 1024 },
])("upload parser uses capped storage max plus exact envelope overhead", async (entry) => {
  let receivedMax = 0;
  installSuccessfulExecutor({
    loadUploadStorageMaxBytes: async () => entry.configured,
    async parseBody(_req, options) {
      receivedMax = options?.maxBytes ?? 0;
      expect(options?.tooLargeCode).toBe("media_file_too_large");
      expect(options?.rejectDuplicateKeys).toEqual([
        "fieldName",
        "file",
        "formNonce",
        "captchaToken",
      ]);
      return {};
    },
  });
  const execution = await runExecutor(FORM_ID, "uploads");
  expect(execution).toMatchObject({ matched: true, ok: true });
  expect(receivedMax).toBe(entry.expected);
});

test.each([
  { label: "declared", contentLength: String(1024 * 1024 + 1), body: new Uint8Array(1) },
  { label: "chunked", contentLength: undefined, body: new Uint8Array(1024 * 1024 + 1) },
  { label: "deceptive", contentLength: "1", body: new Uint8Array(1024 * 1024 + 1) },
])("submission $label overflow returns the stable 413 before handler work", async (entry) => {
  let handlerCalls = 0;
  installSuccessfulExecutor({
    parseBody: parseRequestBody,
    async dispatchSubmission() {
      handlerCalls += 1;
      return {};
    },
  });
  const url = new URL(`http://localhost/forms/${FORM_ID}/submissions`);
  const headers = new Headers({ "content-type": "application/json" });
  if (entry.contentLength) headers.set("content-length", entry.contentLength);
  const execution = await executePreparedFormWrite(
    new Request(url, { method: "POST", headers, body: entry.body }),
    { url, security: getSecurity(), ip: "192.0.2.1", userAgent: "body-limit-test" }
  );
  expect(execution).toMatchObject({
    matched: true,
    ok: false,
    error: { code: "form_payload_too_large", status: 413 },
  });
  expect(handlerCalls).toBe(0);
});

test.each([
  { label: "declared", contentLength: String(64 * 1024 + 2), body: new Uint8Array(1) },
  { label: "chunked", contentLength: undefined, body: new Uint8Array(64 * 1024 + 2) },
  { label: "deceptive", contentLength: "1", body: new Uint8Array(64 * 1024 + 2) },
])("upload $label overflow returns the stable 413 before handler work", async (entry) => {
  let handlerCalls = 0;
  installSuccessfulExecutor({
    loadUploadStorageMaxBytes: async () => 1,
    parseBody: parseRequestBody,
    async dispatchUpload() {
      handlerCalls += 1;
      return {};
    },
  });
  const url = new URL(`http://localhost/forms/${FORM_ID}/uploads`);
  const headers = new Headers({ "content-type": "application/json" });
  if (entry.contentLength) headers.set("content-length", entry.contentLength);
  const execution = await executePreparedFormWrite(
    new Request(url, { method: "POST", headers, body: entry.body }),
    { url, security: getSecurity(), ip: "192.0.2.1", userAgent: "body-limit-test" }
  );
  expect(execution).toMatchObject({
    matched: true,
    ok: false,
    error: { code: "media_file_too_large", status: 413 },
  });
  expect(handlerCalls).toBe(0);
});

test("real executor rejects duplicate watched multipart keys before dispatch", async () => {
  let dispatchCalls = 0;
  __setFormWriteExecutorDepsForTests({
    attachSession: async () => undefined,
    loadAccessTarget: async (formId) => fakeForm(formId),
    chargeRateLimit: () => undefined,
    loadUploadStorageMaxBytes: async () => 5 * 1024 * 1024,
    async dispatchUpload() {
      dispatchCalls += 1;
      return {};
    },
  });
  const formData = new FormData();
  formData.append("fieldName", "attachment");
  formData.append("fieldName", "duplicate");
  formData.append("file", new File(["content"], "attachment.txt", { type: "text/plain" }));
  const url = new URL(`http://localhost/forms/${FORM_ID}/uploads`);
  const execution = await executePreparedFormWrite(
    new Request(url, { method: "POST", body: formData }),
    { url, security: getSecurity(), ip: "192.0.2.1", userAgent: "duplicate-test" }
  );
  expect(execution).toMatchObject({
    matched: true,
    ok: false,
    error: { code: "invalid_form", status: 400 },
  });
  expect(dispatchCalls).toBe(0);
});

test.each(["submissions", "uploads"] as const)(
  "executor to real %s handler requires captcha after a valid nonce and before persistence",
  async (kind) => {
    const nonce = createFormSubmissionNonce(FORM_ID);
    let submitCalls = 0;
    let fieldLoadCalls = 0;
    let uploadCalls = 0;
    const body =
      kind === "submissions"
        ? { data: {}, formNonce: nonce }
        : {
            fieldName: "attachment",
            file: new File(["content"], "attachment.txt", { type: "text/plain" }),
            formNonce: nonce,
          };
    __setFormWriteExecutorDepsForTests({
      attachSession: async () => undefined,
      loadAccessTarget: async (formId) => fakeForm(formId),
      chargeRateLimit: () => undefined,
      loadUploadStorageMaxBytes: async () => 5 * 1024 * 1024,
      parseBody: async () => body,
      async dispatchSubmission(ctx, botProtectionSettings) {
        return handleFormSubmissionRoute(ctx, {
          validate: validateSchema,
          botProtectionSettings,
          async persistSubmission() {
            submitCalls += 1;
            throw new Error("submission_persistence_forbidden");
          },
        });
      },
      async dispatchUpload(ctx, botProtectionSettings) {
        return handleFormAttachmentUploadRoute(ctx, {
          validate: validateSchema,
          botProtectionSettings,
          async loadFormFields() {
            fieldLoadCalls += 1;
            throw new Error("field_load_forbidden");
          },
          async persistUpload() {
            uploadCalls += 1;
            throw new Error("upload_persistence_forbidden");
          },
        });
      },
    });
    const execution = await runExecutor(FORM_ID, kind, getCaptchaSecurity());
    expect(execution).toMatchObject({
      matched: true,
      ok: false,
      error: { code: "bot_protection_required", status: 400 },
    });
    expect(submitCalls).toBe(0);
    expect(fieldLoadCalls).toBe(0);
    expect(uploadCalls).toBe(0);
  }
);

test("direct handlers reject absent, fabricated, wrong-kind, and mismatched descriptors", async () => {
  const internalAccess = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  if (!internalAccess.allow) throw new Error("expected internal access");
  const frozenForm = frozenFakeForm();
  const uploadDescriptor = createPreparedFormWriteDescriptor({
    kind: "upload",
    formId: FORM_ID,
    form: frozenForm,
    access: internalAccess,
  });
  const fabricated = Object.freeze({ ...uploadDescriptor });
  const base: RouteContext = {
    params: { id: FORM_ID },
    query: {},
    body: {},
  };
  const validateCalls: string[] = [];
  const validate = () => {
    validateCalls.push("validate");
  };

  const attempts = [
    () =>
      handleFormAttachmentUploadRoute(base, {
        validate,
        loadFormFields: listFormFields,
        persistUpload: uploadMedia,
      }),
    () =>
      handleFormAttachmentUploadRoute(
        { ...base, preparedFormWrite: fabricated as typeof uploadDescriptor },
        { validate, loadFormFields: listFormFields, persistUpload: uploadMedia }
      ),
    () =>
      handleFormSubmissionRoute(
        { ...base, preparedFormWrite: uploadDescriptor },
        { validate, persistSubmission: submitForm }
      ),
    () =>
      handleFormAttachmentUploadRoute(
        { ...base, params: { id: SECOND_FORM_ID }, preparedFormWrite: uploadDescriptor },
        { validate, loadFormFields: listFormFields, persistUpload: uploadMedia }
      ),
  ];
  for (const attempt of attempts) {
    try {
      await attempt();
      throw new Error("expected descriptor rejection");
    } catch (error) {
      expect(error).toMatchObject({ code: "form_invalid", status: 400 });
    }
  }
  expect(validateCalls).toEqual([]);
});

test("descriptor factory accepts only the exact prepared form projection", () => {
  const access = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  if (!access.allow) throw new Error("expected internal access");
  expect(() =>
    createPreparedFormWriteDescriptor({
      kind: "submission",
      formId: FORM_ID,
      form: fakeForm(FORM_ID, "internal") as unknown as PreparedFormWriteForm,
      access,
    })
  ).toThrow("form_write_descriptor_invalid");
});

test("prepared form and access are fresh snapshots unaffected by source mutation", () => {
  const settingsSource = { nested: { enabled: true } };
  const rawForm = fakeForm(FORM_ID, "public");
  rawForm.settings = settingsSource;
  const preparedForm = createPreparedFormWriteForm(rawForm);
  settingsSource.nested.enabled = false;

  const evaluated = evaluateSubmissionAccess({ mode: "public", isAuthenticated: false });
  if (!evaluated.allow) throw new Error("expected public access");
  const accessSource = { ...evaluated } as Record<string, unknown>;
  const descriptor = createPreparedFormWriteDescriptor({
    kind: "submission",
    formId: FORM_ID,
    form: preparedForm,
    access: accessSource as unknown as PreparedFormWriteAccess,
  });
  accessSource.requireCaptcha = false;
  accessSource.principal = "session";

  expect(descriptor.form.settings).toEqual({ nested: { enabled: true } });
  expect(descriptor.access).toMatchObject({
    principal: "anonymous",
    requireCaptcha: true,
    requireFormNonce: true,
  });
  expect(descriptor.access).not.toBe(accessSource);
  expect(Reflect.ownKeys(descriptor.form).sort()).toEqual(
    ["id", "settings", "submissionAccess", "successMessage", "successRedirectUrl"].sort()
  );
  expect(Object.hasOwn(descriptor.form, "createdAt")).toBe(false);
  expect(Object.hasOwn(descriptor.form, "updatedAt")).toBe(false);
});

test("descriptor factory rejects frozen accessor-backed access without invoking it", () => {
  const form = frozenFakeForm(FORM_ID, "public");
  let getterCalls = 0;
  let captchaRequired = true;
  const access = {
    allow: true,
    mode: "public",
    principal: "anonymous",
    requireFormNonce: true,
    requireSessionCsrf: false,
    rateBucket: "public_write",
  } as Record<string, unknown>;
  Object.defineProperty(access, "requireCaptcha", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return captchaRequired;
    },
  });
  Object.freeze(access);

  expect(() =>
    createPreparedFormWriteDescriptor({
      kind: "submission",
      formId: FORM_ID,
      form,
      access: access as unknown as PreparedFormWriteAccess,
    })
  ).toThrow("form_write_descriptor_invalid");
  captchaRequired = false;
  expect(getterCalls).toBe(0);

  const evaluated = evaluateSubmissionAccess({ mode: "public", isAuthenticated: false });
  if (!evaluated.allow) throw new Error("expected public access");
  const customPrototypeAccess = Object.setPrototypeOf(
    { ...evaluated },
    {
      inherited: true,
    }
  );
  expect(() =>
    createPreparedFormWriteDescriptor({
      kind: "submission",
      formId: FORM_ID,
      form,
      access: customPrototypeAccess as PreparedFormWriteAccess,
    })
  ).toThrow("form_write_descriptor_invalid");
});

test("prepared form rejects raw and nested accessors without invoking them", () => {
  let rawIdGetterCalls = 0;
  const rawIdForm = fakeForm();
  Object.defineProperty(rawIdForm, "id", {
    enumerable: true,
    configurable: true,
    get() {
      rawIdGetterCalls += 1;
      return FORM_ID;
    },
  });
  expect(() => createPreparedFormWriteForm(rawIdForm)).toThrow("form_write_descriptor_invalid");
  expect(rawIdGetterCalls).toBe(0);

  let nestedGetterCalls = 0;
  const nestedSettings: Record<string, unknown> = {};
  Object.defineProperty(nestedSettings, "danger", {
    enumerable: true,
    configurable: true,
    get() {
      nestedGetterCalls += 1;
      return true;
    },
  });
  const nestedForm = fakeForm();
  nestedForm.settings = nestedSettings;
  expect(() => createPreparedFormWriteForm(nestedForm)).toThrow("form_write_descriptor_invalid");
  expect(nestedGetterCalls).toBe(0);

  let arrayGetterCalls = 0;
  const accessorArray: unknown[] = [];
  Object.defineProperty(accessorArray, "0", {
    enumerable: true,
    configurable: true,
    get() {
      arrayGetterCalls += 1;
      return "unsafe";
    },
  });
  const arrayForm = fakeForm();
  arrayForm.settings = { values: accessorArray };
  expect(() => createPreparedFormWriteForm(arrayForm)).toThrow("form_write_descriptor_invalid");
  expect(arrayGetterCalls).toBe(0);
});

test("raw accessor target maps to invalid-mode without invoking the getter", async () => {
  let getterCalls = 0;
  const target = fakeForm();
  Object.defineProperty(target, "id", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return FORM_ID;
    },
  });
  let rateIdentity: Record<string, unknown> | null = null;
  installSuccessfulExecutor({
    loadAccessTarget: async () => target,
    chargeRateLimit(_bucket, identity) {
      rateIdentity = { ...identity };
    },
  });
  const execution = await runExecutor();
  expect(execution).toMatchObject({ matched: true, ok: false, error: { code: "form_invalid" } });
  expect(rateIdentity).toEqual({
    ip: "192.0.2.1",
    userAgent: "forms-executor-test",
    identifier: UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
  });
  expect(getterCalls).toBe(0);
});

test("prepared form rejects custom prototypes and non-JSON settings", () => {
  const customPrototypeForm = fakeForm();
  Object.setPrototypeOf(customPrototypeForm, { inherited: true });
  expect(() => createPreparedFormWriteForm(customPrototypeForm)).toThrow(
    "form_write_descriptor_invalid"
  );

  const nullPrototype = Object.assign(Object.create(null) as Record<string, unknown>, {
    safe: true,
  });
  const customSettings = Object.create({ inherited: true }) as Record<string, unknown>;
  customSettings.safe = true;
  const invalidSettings: unknown[] = [
    new Array(1),
    new Date(),
    new Map(),
    nullPrototype,
    customSettings,
    undefined,
    Number.NaN,
    Infinity,
    1n,
    () => true,
    Symbol("unsafe"),
  ];
  for (const settings of invalidSettings) {
    const form = fakeForm();
    form.settings = settings;
    expect(() => createPreparedFormWriteForm(form)).toThrow("form_write_descriptor_invalid");
  }
});

test("prepared settings preserve an own __proto__ key without prototype mutation", () => {
  const settings: Record<string, unknown> = {};
  Object.defineProperty(settings, "__proto__", {
    value: { polluted: true },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  const form = fakeForm();
  form.settings = settings;
  const prepared = createPreparedFormWriteForm(form);
  const snapshot = prepared.settings as Record<string, unknown>;
  expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
  expect(Object.hasOwn(snapshot, "__proto__")).toBe(true);
  expect(snapshot.__proto__).toEqual({ polluted: true });
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
});

test("explicit object-valued submission envelope rejects unknown fixed keys before validation", async () => {
  const access = evaluateSubmissionAccess({
    mode: "internal",
    isAuthenticated: false,
    apiKeyScopes: ["forms.submit"],
  });
  if (!access.allow) throw new Error("expected internal access");
  const form = frozenFakeForm();
  const descriptor = createPreparedFormWriteDescriptor({
    kind: "submission",
    formId: FORM_ID,
    form,
    access,
  });
  let validateCalls = 0;

  try {
    await handleFormSubmissionRoute(
      {
        params: { id: FORM_ID },
        query: {},
        body: { data: {}, bogus: true },
        preparedFormWrite: descriptor,
      },
      {
        validate() {
          validateCalls += 1;
        },
        persistSubmission: submitForm,
      }
    );
    throw new Error("expected envelope rejection");
  } catch (error) {
    expect(error).toMatchObject({ code: "form_invalid", status: 400 });
  }
  expect(validateCalls).toBe(0);
});

testIfDb("public forms handler accepts signed public widget submissions", async () => {
  const form = await createTrackedForm();
  await setFormFields(form.id, [
    { type: "text", label: "Name", name: "name", required: true },
    { type: "checkbox", label: "Consent", name: "consent", required: false },
  ]);

  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          name: "Alice",
          consent: true,
        },
        formNonce: createFormSubmissionNonce(form.id),
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as {
    formId: string;
    payload: Record<string, unknown>;
    runtime: { successMessage: string | null };
  };
  expect(payload.formId).toBe(form.id);
  expect(payload.payload).toEqual({
    name: "Alice",
    consent: true,
  });
  expect(payload.runtime.successMessage).toBe("Form thanks");
});

testIfDb(
  "public forms handler preserves flat form-urlencoded submission compatibility",
  async () => {
    const form = await createTrackedForm();
    await setFormFields(form.id, [{ type: "text", label: "Name", name: "name", required: true }]);
    const nonce = createFormSubmissionNonce(form.id);
    const url = new URL(`http://localhost/forms/${form.id}/submissions`);
    const response = await handlePublicFormsApi(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name: "Alice", __nl_form_nonce: nonce }),
      }),
      {
        url,
        security: getSecurity(),
        ip: "127.0.0.1",
        userAgent: "test",
      }
    );
    expect(response?.status).toBe(200);
    const payload = (await response?.json()) as { payload: Record<string, unknown> };
    expect(payload.payload).toEqual({ name: "Alice" });
  }
);

testIfDb("public forms handler preserves flat JSON submission compatibility", async () => {
  const form = await createTrackedForm();
  await setFormFields(form.id, [{ type: "text", label: "Name", name: "name", required: true }]);
  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "JSON Alice",
        __nl_form_nonce: createFormSubmissionNonce(form.id),
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );
  expect(response?.status).toBe(200);
  const payload = (await response?.json()) as { payload: Record<string, unknown> };
  expect(payload.payload).toEqual({ name: "JSON Alice" });
});

testIfDb("public cookie session still fails closed without the form nonce", async () => {
  const form = await createTrackedForm();
  __setFormWriteExecutorDepsForTests({
    async attachSession(ctx) {
      ctx.user = { id: randomUUID() };
      ctx.sessionId = randomUUID();
    },
  });
  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "coderso_session=fake" },
      body: JSON.stringify({ data: {} }),
    }),
    { url, security: getSecurity(), ip: "127.0.0.1", userAgent: "test" }
  );
  expect(response?.status).toBe(400);
  expect(await response?.json()).toMatchObject({ error: { code: "form_nonce_required" } });
});

testIfDb("public bearer credentials are ignored and cannot bypass the form nonce", async () => {
  const form = await createTrackedForm();
  let authenticateCalls = 0;
  __setFormWriteExecutorDepsForTests({
    async authenticateApiKey() {
      authenticateCalls += 1;
      throw new Error("public_api_key_authentication_forbidden");
    },
  });
  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer valid-looking-public-token",
      },
      body: JSON.stringify({ data: {} }),
    }),
    { url, security: getSecurity(), ip: "127.0.0.1", userAgent: "test" }
  );
  expect(response?.status).toBe(400);
  expect(await response?.json()).toMatchObject({ error: { code: "form_nonce_required" } });
  expect(authenticateCalls).toBe(0);
});

testIfDb(
  "public forms handler rejects unknown explicit-envelope keys before normalization",
  async () => {
    const form = await createTrackedForm();
    const url = new URL(`http://localhost/forms/${form.id}/submissions`);
    const response = await handlePublicFormsApi(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: {},
          formNonce: createFormSubmissionNonce(form.id),
          bogus: true,
        }),
      }),
      {
        url,
        security: getSecurity(),
        ip: "127.0.0.1",
        userAgent: "test",
      }
    );
    expect(response?.status).toBe(400);
    expect(await response?.json()).toMatchObject({ error: { code: "form_invalid" } });
  }
);

testIfDb("public forms handler maps invalid payloads through Forms errors", async () => {
  const form = await createTrackedForm();
  await setFormFields(form.id, [{ type: "text", label: "Name", name: "name", required: true }]);

  const url = new URL(`http://localhost/forms/${form.id}/submissions`);
  const response = await handlePublicFormsApi(
    new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          name: "Alice",
          extra: "nope",
        },
        formNonce: createFormSubmissionNonce(form.id),
      }),
    }),
    {
      url,
      security: getSecurity(),
      ip: "127.0.0.1",
      userAgent: "test",
    }
  );

  expect(response).not.toBeNull();
  expect(response?.status).toBe(400);
  const payload = (await response?.json()) as { error: { code: string } };
  expect(payload.error.code).toBe("form_payload_unknown_field");
});
