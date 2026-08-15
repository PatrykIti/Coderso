// TASK-491-03-L01 security lane: the Sentry `dsn` is a secret. An init failure
// or capture path must never log the dsn itself — only the machine-readable
// code `sentry_init_failed` may appear. Uses a mocked `@sentry/node` whose
// `init` throws after receiving the dsn, captures console output, and asserts
// the dsn string never appears.
import { beforeEach, expect, vi, test } from "bun:test";

import {
  captureServerError,
  initializeErrorMonitoringOnBoot,
  isErrorMonitoringEnabled,
  resetErrorMonitoringState,
} from "../../core/services/integrations/errorMonitoring";

const SENTRY_DSN = "https://super-secret-public-key@o0.ingest.sentry.io/491";

vi.mock("@sentry/node", () => ({
  init: () => {
    throw new Error("simulated SDK init failure");
  },
  captureException: () => {},
}));

const captureConsole = async (fn: () => Promise<void>) => {
  const originalWarn = console.warn;
  const originalError = console.error;
  const captured: string[] = [];
  const collect = (...args: unknown[]) => {
    captured.push(args.map((arg) => String(arg)).join(" "));
  };
  console.warn = collect;
  console.error = collect;
  try {
    await fn();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  return captured.join("\n");
};

const stubDeps = () => ({
  getIntegrationRuntimeConfig: async () => ({ dsn: SENTRY_DSN }),
});

beforeEach(() => {
  resetErrorMonitoringState();
});

test("init failure logs only a machine-readable code, never the dsn", async () => {
  const output = await captureConsole(async () => {
    await initializeErrorMonitoringOnBoot(stubDeps());
    // Idempotent second call must stay silent (no repeated failure logging).
    await initializeErrorMonitoringOnBoot(stubDeps());
  });

  expect(output).toContain("sentry_init_failed");
  expect(output).not.toContain(SENTRY_DSN);
  expect(isErrorMonitoringEnabled()).toBe(false);
});

test("captureServerError never logs the dsn or error details", async () => {
  const output = await captureConsole(async () => {
    // Monitoring is disabled after the failed init; capture must stay silent.
    await initializeErrorMonitoringOnBoot(stubDeps());
    captureServerError(new Error("boom"), { path: "/admin/api/x" });
  });
  expect(output).not.toContain(SENTRY_DSN);
  expect(output).not.toContain("boom");
});
