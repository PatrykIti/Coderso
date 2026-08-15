// TASK-491-03-L01: Sentry server boot init + capture with a mocked
// `@sentry/node`. Covers guard-when-unset, init idempotency, DSN validation,
// and capture no-op/send/never-throw behavior.
import { beforeEach, expect, vi, test } from "bun:test";

import {
  captureServerError,
  initializeErrorMonitoringOnBoot,
  isErrorMonitoringEnabled,
  isParseableSentryDsn,
  resetErrorMonitoringState,
} from "../../../core/services/integrations/errorMonitoring";

const initCalls: Array<Record<string, unknown>> = [];
const captureCalls: Array<{ error: unknown; hint?: unknown }> = [];
let captureThrows = false;

vi.mock("@sentry/node", () => ({
  init: (options: Record<string, unknown>) => {
    initCalls.push(options);
  },
  captureException: (error: unknown, hint?: unknown) => {
    captureCalls.push({ error, hint });
    if (captureThrows) throw new Error("sdk capture failure");
  },
}));

const stubDeps = (config: { dsn?: string; environment?: string } | null) => ({
  getIntegrationRuntimeConfig: async () => config,
});

beforeEach(() => {
  initCalls.length = 0;
  captureCalls.length = 0;
  captureThrows = false;
  resetErrorMonitoringState();
});

test("isParseableSentryDsn accepts a well-formed DSN URL", () => {
  expect(isParseableSentryDsn("https://public@o0.ingest.sentry.io/0")).toBe(true);
  expect(isParseableSentryDsn("https://public@sentry.io/12345")).toBe(true);
  expect(isParseableSentryDsn("http://public@o0.ingest.sentry.io/0")).toBe(true);
});

test("isParseableSentryDsn rejects empty, non-string, and malformed values", () => {
  expect(isParseableSentryDsn("")).toBe(false);
  expect(isParseableSentryDsn("   ")).toBe(false);
  expect(isParseableSentryDsn(null)).toBe(false);
  expect(isParseableSentryDsn(undefined)).toBe(false);
  expect(isParseableSentryDsn(42)).toBe(false);
  expect(isParseableSentryDsn("not-a-url")).toBe(false);
  // No public key segment -> not a Sentry DSN.
  expect(isParseableSentryDsn("https://o0.ingest.sentry.io/0")).toBe(false);
  // No path after the host -> not a Sentry DSN.
  expect(isParseableSentryDsn("https://public@o0.ingest.sentry.io/")).toBe(false);
});

test("boot init without a dsn stays disabled and never touches the SDK", async () => {
  await initializeErrorMonitoringOnBoot(stubDeps({}));
  expect(isErrorMonitoringEnabled()).toBe(false);
  await initializeErrorMonitoringOnBoot(stubDeps(null));
  expect(isErrorMonitoringEnabled()).toBe(false);
  expect(initCalls).toHaveLength(0);
});

test("boot init with a dsn enables monitoring and initializes the SDK once", async () => {
  await initializeErrorMonitoringOnBoot(
    stubDeps({ dsn: "https://public@o0.ingest.sentry.io/0", environment: "staging" })
  );
  expect(isErrorMonitoringEnabled()).toBe(true);
  expect(initCalls).toHaveLength(1);
  expect(initCalls[0].dsn).toBe("https://public@o0.ingest.sentry.io/0");
  expect(initCalls[0].environment).toBe("staging");
  expect(initCalls[0].sendDefaultPii).toBe(false);
  expect(initCalls[0].tracesSampleRate).toBe(0);
});

test("boot init is idempotent across repeated calls", async () => {
  await initializeErrorMonitoringOnBoot(stubDeps({ dsn: "https://public@o0.ingest.sentry.io/0" }));
  await initializeErrorMonitoringOnBoot(stubDeps({ dsn: "https://other@o0.ingest.sentry.io/0" }));
  expect(initCalls).toHaveLength(1);
  expect(isErrorMonitoringEnabled()).toBe(true);
});

test("boot init falls back to NODE_ENV when no environment is configured", async () => {
  await initializeErrorMonitoringOnBoot(stubDeps({ dsn: "https://public@o0.ingest.sentry.io/0" }));
  expect(initCalls).toHaveLength(1);
  const expected = process.env.NODE_ENV || "production";
  expect(initCalls[0].environment).toBe(expected);
});

test("boot init never throws when the config resolver fails", async () => {
  await initializeErrorMonitoringOnBoot({
    getIntegrationRuntimeConfig: async () => {
      throw new Error("config read failed");
    },
  });
  expect(isErrorMonitoringEnabled()).toBe(false);
  expect(initCalls).toHaveLength(0);
});

test("captureServerError is a no-op while monitoring is disabled", async () => {
  await initializeErrorMonitoringOnBoot(stubDeps({}));
  captureServerError(new Error("boom"), { path: "/x" });
  expect(captureCalls).toHaveLength(0);
});

test("captureServerError sends to the SDK with tags once enabled", async () => {
  await initializeErrorMonitoringOnBoot(stubDeps({ dsn: "https://public@o0.ingest.sentry.io/0" }));
  const error = new Error("boom");
  captureServerError(error, { path: "/admin/api/x" });
  expect(captureCalls).toHaveLength(1);
  expect(captureCalls[0].error).toBe(error);
  expect(captureCalls[0].hint).toEqual({ tags: { path: "/admin/api/x" } });
});

test("captureServerError never throws when the SDK capture fails", async () => {
  captureThrows = true;
  await initializeErrorMonitoringOnBoot(stubDeps({ dsn: "https://public@o0.ingest.sentry.io/0" }));
  let caught: unknown = null;
  try {
    captureServerError(new Error("boom"), { path: "/x" });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeNull();
});
