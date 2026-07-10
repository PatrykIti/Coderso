import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { accessLogs, sessions, users } from "../../../core/db/schema";
import { startHttpServer } from "../../../core/server/httpServer";
import { applyCorsHeaders } from "../../../core/server/middleware/cors";
import {
  __setFormWriteExecutorDepsForTests,
  UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER,
  type FormWriteExecutorDeps,
} from "../../../core/server/publicFormsApi";
import {
  __setMediaDeliveryDepsForTests,
  type MediaDeliveryDeps,
} from "../../../core/server/mediaDelivery";
import type { FormWriteAccessTarget } from "../../../core/server/routes/formsRoutes";
import { resolveAdminPath } from "../../../core/server/utils/adminPath";
import { getSetting } from "../../../core/services/settings/settingsService";
import {
  getSecuritySettings,
  SECURITY_SETTINGS_DEFAULTS,
} from "../../../core/services/settings/securitySettings";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

let server: ReturnType<typeof startHttpServer> | null = null;
let baseUrl = "";
let adminPath = "/admin";
let adminHost = "";
let publicHost = "";
const createdAccessLogPaths = new Set<string>();
const createdSessionIds = new Set<string>();
const createdUserIds = new Set<string>();

const fakeForm = (id: string, mode: string = "public"): FormWriteAccessTarget => ({
  id,
  name: "Mount form",
  slug: `mount-${id}`,
  status: "published",
  description: null,
  successMessage: null,
  successRedirectUrl: null,
  submissionAccess: mode,
  settings: {},
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: new Date("2026-07-10T00:00:00.000Z"),
});

const resolveConfiguredHost = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  try {
    return new URL(value).host;
  } catch {
    return fallback;
  }
};

const waitForAccessLog = async (path: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await db.select().from(accessLogs).where(eq(accessLogs.path, path));
    if (rows.length > 0) return rows;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 25);
    });
  }
  return [];
};

beforeAll(async () => {
  if (!hasDb) return;
  adminPath = await resolveAdminPath();
  server = startHttpServer({ port: 0 });
  baseUrl = `http://127.0.0.1:${server.port}`;
  const [adminBaseUrl, publicBaseUrl] = await Promise.all([
    getSetting("site.adminBaseUrl"),
    getSetting("site.publicBaseUrl"),
  ]);
  const fallbackHost = `127.0.0.1:${server.port}`;
  adminHost = resolveConfiguredHost(adminBaseUrl, fallbackHost);
  publicHost = resolveConfiguredHost(publicBaseUrl, fallbackHost);
});

afterEach(async () => {
  __setFormWriteExecutorDepsForTests(null);
  __setMediaDeliveryDepsForTests(null);
  if (hasDb && createdAccessLogPaths.size > 0) {
    await db.delete(accessLogs).where(inArray(accessLogs.path, [...createdAccessLogPaths]));
    createdAccessLogPaths.clear();
  }
  if (hasDb && createdSessionIds.size > 0) {
    await db.delete(sessions).where(inArray(sessions.id, [...createdSessionIds]));
    createdSessionIds.clear();
  }
  if (hasDb && createdUserIds.size > 0) {
    await db.delete(users).where(inArray(users.id, [...createdUserIds]));
    createdUserIds.clear();
  }
});

afterAll(async () => {
  __setFormWriteExecutorDepsForTests(null);
  __setMediaDeliveryDepsForTests(null);
  if (server) {
    await server.stop(true);
    server = null;
  }
});

testIfDb(
  "root and stripped-admin Forms writes traverse one executor while preserving mount wrappers",
  async () => {
    const formId = randomUUID();
    const publicPath = `/forms/${formId}/submissions`;
    const adminWritePath = `${adminPath}/api${publicPath}`;
    createdAccessLogPaths.add(publicPath);
    createdAccessLogPaths.add(adminWritePath);
    const calls: string[] = [];
    const descriptors: unknown[] = [];
    let accessLoaderCalls = 0;
    let executorBodyCalls = 0;
    let rateCalls = 0;

    const deps: Partial<FormWriteExecutorDeps> = {
      async attachSession() {
        calls.push("attach");
      },
      async loadAccessTarget(id) {
        calls.push("load");
        accessLoaderCalls += 1;
        expect(id).toBe(formId);
        return fakeForm(id);
      },
      chargeRateLimit(bucket, identity) {
        calls.push("rate");
        rateCalls += 1;
        expect(bucket).toBe("public_write");
        expect(identity).toMatchObject({ identifier: formId });
        expect(Object.hasOwn(identity, "userId")).toBe(false);
      },
      async authenticateApiKey() {
        throw new Error("public_api_key_verification_forbidden");
      },
      async enforceSessionCsrf() {
        throw new Error("public_csrf_forbidden");
      },
      async requireSessionFormsWrite() {
        throw new Error("public_rbac_forbidden");
      },
      async loadUploadStorageMaxBytes() {
        throw new Error("submission_storage_load_forbidden");
      },
      async parseBody(_req, options) {
        calls.push("body");
        executorBodyCalls += 1;
        expect(options).toMatchObject({
          maxBytes: 1024 * 1024,
          tooLargeCode: "form_payload_too_large",
        });
        return { data: {} };
      },
      async dispatchSubmission(ctx) {
        calls.push("handler");
        expect(ctx.preparedFormWrite).toBeDefined();
        expect(ctx.preparedFormWrite).toMatchObject({
          kind: "submission",
          formId,
          access: {
            mode: "public",
            requireFormNonce: true,
            rateBucket: "public_write",
          },
        });
        expect(Object.isFrozen(ctx.preparedFormWrite)).toBe(true);
        expect(Object.isFrozen(ctx.preparedFormWrite?.form)).toBe(true);
        expect(Object.isFrozen(ctx.preparedFormWrite?.access)).toBe(true);
        descriptors.push(ctx.preparedFormWrite);
        return { accepted: true, formId };
      },
      async dispatchUpload() {
        throw new Error("submission_dispatched_as_upload");
      },
    };
    __setFormWriteExecutorDepsForTests(deps);

    const security = await getSecuritySettings();
    const origin =
      security.cors.allowedOrigins.find((entry) => entry !== "*") ??
      (security.cors.allowedOrigins.includes("*") ? "https://forms-mount.test" : undefined);
    const commonHeaders: Record<string, string> = {
      "content-type": "application/json",
      authorization: "Bearer ignored-public-token",
    };
    if (origin) commonHeaders.origin = origin;

    const publicResponse = await fetch(`${baseUrl}${publicPath}`, {
      method: "POST",
      headers: { ...commonHeaders, host: publicHost },
      body: JSON.stringify({ data: {} }),
    });
    const adminResponse = await fetch(`${baseUrl}${adminWritePath}`, {
      method: "POST",
      headers: { ...commonHeaders, host: adminHost },
      body: JSON.stringify({ data: {} }),
    });

    expect(publicResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
    expect(await publicResponse.json()).toEqual({ accepted: true, formId });
    expect(await adminResponse.json()).toEqual({ accepted: true, formId });
    expect(accessLoaderCalls).toBe(2);
    expect(executorBodyCalls).toBe(2);
    expect(rateCalls).toBe(2);
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0]).not.toBe(descriptors[1]);
    expect(calls).toEqual([
      "attach",
      "load",
      "rate",
      "body",
      "handler",
      "attach",
      "load",
      "rate",
      "body",
      "handler",
    ]);

    expect(publicResponse.headers.get(security.requestId.headerName)).toBeNull();
    expect(adminResponse.headers.get(security.requestId.headerName)).toBeTruthy();
    if (security.headers.enabled && security.headers.contentTypeOptions) {
      expect(publicResponse.headers.get("x-content-type-options")).toBeNull();
      expect(adminResponse.headers.get("x-content-type-options")).toBe("nosniff");
    }
    const expectedCorsHeaders = new Headers();
    applyCorsHeaders(
      new Request(`${baseUrl}${adminWritePath}`, {
        headers: origin ? { origin } : undefined,
      }),
      expectedCorsHeaders,
      security.cors
    );
    expect(adminResponse.headers.get("access-control-allow-origin")).toBe(
      expectedCorsHeaders.get("access-control-allow-origin")
    );
    expect(publicResponse.headers.get("access-control-allow-origin")).toBeNull();

    const adminLogs = await waitForAccessLog(adminWritePath);
    expect(adminLogs).toHaveLength(1);
    expect(adminLogs[0]).toMatchObject({ method: "POST", path: adminWritePath, status: 200 });
    const publicLogs = await db.select().from(accessLogs).where(eq(accessLogs.path, publicPath));
    expect(publicLogs).toHaveLength(0);
  },
  20_000
);

testIfDb(
  "upload on both real mounts consumes one access load and the exact minted descriptor",
  async () => {
    const formId = randomUUID();
    const publicPath = `/forms/${formId}/uploads`;
    const adminWritePath = `${adminPath}/api${publicPath}`;
    createdAccessLogPaths.add(adminWritePath);
    let loaderCalls = 0;
    let rateCalls = 0;
    let bodyCalls = 0;
    const descriptors: unknown[] = [];
    __setFormWriteExecutorDepsForTests({
      attachSession: async () => undefined,
      async loadAccessTarget(id) {
        loaderCalls += 1;
        return fakeForm(id);
      },
      chargeRateLimit(bucket, identity) {
        rateCalls += 1;
        expect(bucket).toBe("public_write");
        expect(identity.identifier).toBe(formId);
      },
      async authenticateApiKey() {
        throw new Error("public_api_key_verification_forbidden");
      },
      async enforceSessionCsrf() {
        throw new Error("public_csrf_forbidden");
      },
      async requireSessionFormsWrite() {
        throw new Error("public_rbac_forbidden");
      },
      loadUploadStorageMaxBytes: async () => 5 * 1024 * 1024,
      async parseBody(_req, options) {
        bodyCalls += 1;
        expect(options).toEqual({
          maxBytes: 5 * 1024 * 1024 + 64 * 1024,
          rejectDuplicateKeys: ["fieldName", "file", "formNonce", "captchaToken"],
          tooLargeCode: "media_file_too_large",
        });
        return {};
      },
      async dispatchSubmission() {
        throw new Error("upload_dispatched_as_submission");
      },
      async dispatchUpload(ctx) {
        const descriptor = ctx.preparedFormWrite;
        expect(descriptor).toMatchObject({ kind: "upload", formId });
        expect(Object.isFrozen(descriptor)).toBe(true);
        descriptors.push(descriptor);
        return { accepted: true, formId };
      },
    });

    const [publicResponse, adminResponse] = await Promise.all([
      fetch(`${baseUrl}${publicPath}`, {
        method: "POST",
        headers: { "content-type": "application/json", host: publicHost },
        body: "{}",
      }),
      fetch(`${baseUrl}${adminWritePath}`, {
        method: "POST",
        headers: { "content-type": "application/json", host: adminHost },
        body: "{}",
      }),
    ]);
    expect(publicResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
    expect(loaderCalls).toBe(2);
    expect(rateCalls).toBe(2);
    expect(bodyCalls).toBe(2);
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0]).not.toBe(descriptors[1]);
    const adminLogs = await waitForAccessLog(adminWritePath);
    expect(adminLogs).toHaveLength(1);
    expect(adminLogs[0]).toMatchObject({ method: "POST", path: adminWritePath, status: 200 });
  },
  20_000
);

testIfDb(
  "malformed Forms-write targets are consumed by both mounts with sentinel rate and wrapper parity",
  async () => {
    const unique = randomUUID().replaceAll("-", "");
    const cases = [
      `/forms/not-a-uuid-${unique}/submissions`,
      `/forms/%ZZ${unique}/uploads`,
      `/forms/${unique.repeat(4).slice(0, 109)}/submissions`,
    ];
    const calls = { attach: 0, load: 0, rate: 0, body: 0, handler: 0 };
    const rateIdentities: Array<Record<string, unknown>> = [];
    __setFormWriteExecutorDepsForTests({
      async attachSession() {
        calls.attach += 1;
      },
      async loadAccessTarget() {
        calls.load += 1;
        return null;
      },
      chargeRateLimit(bucket, identity) {
        calls.rate += 1;
        expect(bucket).toBe("public_write");
        rateIdentities.push({ ...identity });
      },
      async authenticateApiKey() {
        throw new Error("malformed_api_key_forbidden");
      },
      async enforceSessionCsrf() {
        throw new Error("malformed_csrf_forbidden");
      },
      async requireSessionFormsWrite() {
        throw new Error("malformed_rbac_forbidden");
      },
      async loadUploadStorageMaxBytes() {
        throw new Error("malformed_storage_forbidden");
      },
      async parseBody() {
        calls.body += 1;
        return {};
      },
      async dispatchSubmission() {
        calls.handler += 1;
        return {};
      },
      async dispatchUpload() {
        calls.handler += 1;
        return {};
      },
    });
    const security = await getSecuritySettings();
    const origin =
      security.cors.allowedOrigins.find((entry) => entry !== "*") ??
      (security.cors.allowedOrigins.includes("*") ? "https://forms-malformed.test" : undefined);

    for (const publicPath of cases) {
      const adminWritePath = `${adminPath}/api${publicPath}`;
      createdAccessLogPaths.add(publicPath);
      createdAccessLogPaths.add(adminWritePath);
      const commonHeaders: Record<string, string> = { "content-type": "application/json" };
      if (origin) commonHeaders.origin = origin;
      const publicResponse = await fetch(`${baseUrl}${publicPath}`, {
        method: "POST",
        headers: { ...commonHeaders, host: publicHost },
        body: "{",
      });
      const adminResponse = await fetch(`${baseUrl}${adminWritePath}`, {
        method: "POST",
        headers: { ...commonHeaders, host: adminHost },
        body: "{",
      });
      expect(publicResponse.status).toBe(400);
      expect(adminResponse.status).toBe(400);
      expect(await publicResponse.json()).toMatchObject({ error: { code: "form_invalid" } });
      expect(await adminResponse.json()).toMatchObject({ error: { code: "form_invalid" } });
      expect(publicResponse.headers.get(security.requestId.headerName)).toBeNull();
      expect(adminResponse.headers.get(security.requestId.headerName)).toBeTruthy();
      if (security.headers.enabled && security.headers.contentTypeOptions) {
        expect(publicResponse.headers.get("x-content-type-options")).toBeNull();
        expect(adminResponse.headers.get("x-content-type-options")).toBe("nosniff");
      }
      const expectedCorsHeaders = new Headers();
      applyCorsHeaders(
        new Request(`${baseUrl}${adminWritePath}`, {
          headers: origin ? { origin } : undefined,
        }),
        expectedCorsHeaders,
        security.cors
      );
      expect(adminResponse.headers.get("access-control-allow-origin")).toBe(
        expectedCorsHeaders.get("access-control-allow-origin")
      );
      expect(publicResponse.headers.get("access-control-allow-origin")).toBeNull();
      const adminLogs = await waitForAccessLog(adminWritePath);
      expect(adminLogs).toHaveLength(1);
      expect(adminLogs[0]).toMatchObject({ path: adminWritePath, status: 400 });
      const publicLogs = await db.select().from(accessLogs).where(eq(accessLogs.path, publicPath));
      expect(publicLogs).toHaveLength(0);
    }

    expect(calls).toEqual({ attach: 0, load: 0, rate: 6, body: 0, handler: 0 });
    expect(rateIdentities).toHaveLength(6);
    for (const identity of rateIdentities) {
      expect(identity.identifier).toBe(UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER);
      expect(Object.hasOwn(identity, "userId")).toBe(false);
    }
  },
  20_000
);

testIfDb(
  "stripped-admin wrapper maps raw internal RBAC forbidden after limiter and logs 403",
  async () => {
    const formId = randomUUID();
    const adminWritePath = `${adminPath}/api/forms/${formId}/submissions`;
    createdAccessLogPaths.add(adminWritePath);
    const token = randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        email: `forms-rbac-${token}@example.invalid`,
        passwordHash: "forms-rbac-test-only",
      })
      .returning({ id: users.id });
    if (!user) throw new Error("failed to create RBAC wrapper user");
    createdUserIds.add(user.id);
    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: `forms-rbac-${token}`,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: sessions.id });
    if (!session) throw new Error("failed to create RBAC wrapper session");
    createdSessionIds.add(session.id);
    const order: string[] = [];
    __setFormWriteExecutorDepsForTests({
      async attachSession(ctx) {
        ctx.user = { id: user.id };
        ctx.sessionId = session.id;
      },
      loadAccessTarget: async (id) => fakeForm(id, "internal"),
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
    });
    const security = await getSecuritySettings();
    const response = await fetch(`${baseUrl}${adminWritePath}`, {
      method: "POST",
      headers: { "content-type": "application/json", host: adminHost },
      body: "{}",
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "forbidden" } });
    expect(response.headers.get(security.requestId.headerName)).toBeTruthy();
    expect(order).toEqual(["rate", "csrf", "rbac"]);
    const logs = await waitForAccessLog(adminWritePath);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ path: adminWritePath, status: 403 });
  },
  20_000
);

testIfDb(
  "full server dispatches fallback-shaped /media path to the canonical delivery boundary",
  async () => {
    const calls = {
      rate: 0,
      loadAccessMode: 0,
      findRecord: 0,
      resolveAdapter: 0,
      attachSession: 0,
      authenticate: 0,
      permission: 0,
    };
    const mediaDeps: Partial<MediaDeliveryDeps> = {
      async loadSecuritySettings() {
        return {
          ...SECURITY_SETTINGS_DEFAULTS,
          rateLimit: { ...SECURITY_SETTINGS_DEFAULTS.rateLimit, enabled: false },
        };
      },
      chargeRateLimit() {
        calls.rate += 1;
      },
      async loadAccessMode() {
        calls.loadAccessMode += 1;
        return "public";
      },
      async attachSession() {
        calls.attachSession += 1;
      },
      async authenticateApiKeyScopes() {
        calls.authenticate += 1;
        return null;
      },
      async requireSessionMediaRead() {
        calls.permission += 1;
      },
      async findRecord() {
        calls.findRecord += 1;
        return null;
      },
      async resolveAdapter() {
        calls.resolveAdapter += 1;
        throw new Error("adapter_resolution_forbidden");
      },
    };
    __setMediaDeliveryDepsForTests(mediaDeps);

    const response = await fetch(
      `${baseUrl}/media/%00unavailable/11111111-2222-3333-4444-555555555555`,
      { headers: { host: publicHost } }
    );
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad Request");
    expect(calls).toEqual({
      rate: 1,
      loadAccessMode: 0,
      findRecord: 0,
      resolveAdapter: 0,
      attachSession: 0,
      authenticate: 0,
      permission: 0,
    });
  },
  20_000
);
