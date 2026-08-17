/**
 * TASK-491-03-L01: Sentry server-side init + capture.
 *
 * Initializes the Sentry Node SDK at server boot when a `sentry` integration
 * config with a non-empty `dsn` exists. Captures unhandled request errors via
 * `captureServerError`. Initialization is idempotent and fail-closed: no DSN or
 * an SDK failure leaves monitoring disabled and the server boots normally.
 *
 * Secret handling: the `dsn` is `secret`-typed and never leaves this module's
 * init path. It is never logged, never returned, and never included in captured
 * event metadata. Init failures log only the machine-readable code
 * `sentry_init_failed`.
 *
 * Bun/ESM note: `captureServerError` never uses `require("@sentry/node")`. It
 * reuses the module reference captured during init so the dynamic import is
 * evaluated exactly once under Bun.
 */
import type { IntegrationRuntimeConfig } from "./integrationsService";
import { validateSentryDsn } from "../network/outboundHttpPolicy";

export interface ErrorMonitoringDeps {
  getIntegrationRuntimeConfig: (id: string) => Promise<IntegrationRuntimeConfig | null>;
}

/**
 * Pure DSN-shape check. Single source of truth for DSN parsing: gates the
 * fallback sender path and is reused by the integration health evaluator
 * (TASK-491-04-L01) so there is never a second/competing DSN parser. The
 * primary `@sentry/node` path treats the dsn as opaque (the SDK validates it).
 */
export function isParseableSentryDsn(dsn: unknown): boolean {
  if (typeof dsn !== "string" || !dsn.trim()) return false;
  try {
    const url = new URL(dsn.trim());
    return Boolean(url.protocol.startsWith("http") && url.username && url.pathname.length > 1);
  } catch {
    return false;
  }
}

type SentryModule = {
  init: (options: {
    dsn: string;
    environment: string;
    sendDefaultPii: boolean;
    tracesSampleRate: number;
  }) => void;
  captureException: (error: unknown, hint?: { tags: Record<string, string> }) => void;
};

const defaultDeps: ErrorMonitoringDeps = {
  getIntegrationRuntimeConfig: async (id) => {
    const mod = await import("./integrationsService");
    return mod.getIntegrationRuntimeConfig(id);
  },
};

let initialized = false;
let enabled = false;
let sentryModule: SentryModule | null = null;

/** Test seam: reset module state between tests. */
export function resetErrorMonitoringState(): void {
  initialized = false;
  enabled = false;
  sentryModule = null;
}

/**
 * Load and initialize the Sentry SDK once at boot. Idempotent: a second call
 * after a successful or failed init is a no-op. Never throws; on any failure
 * monitoring stays disabled and only the machine-readable code is logged.
 */
export async function initializeErrorMonitoringOnBoot(
  deps: ErrorMonitoringDeps = defaultDeps
): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const config = await deps.getIntegrationRuntimeConfig("sentry");
    const dsn = typeof config?.dsn === "string" ? config.dsn.trim() : "";
    if (!dsn) return; // not configured -> stays disabled (no-op)

    // TASK-567: fail closed before the SDK is ever initialized. Only
    // Sentry-owned hosts (sentry.io / *.sentry.io) may receive error events;
    // a malformed DSN or a non-Sentry host stays disabled.
    if (!validateSentryDsn(dsn).ok) {
      console.warn("sentry_init_failed");
      return;
    }

    const loaded = (await import("@sentry/node")) as SentryModule;
    loaded.init({
      dsn,
      environment:
        typeof config?.environment === "string" && config.environment.trim()
          ? config.environment.trim()
          : process.env.NODE_ENV || "production",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
    sentryModule = loaded;
    enabled = true;
  } catch {
    // Never log the dsn or SDK error detail that could leak it.
    console.warn("sentry_init_failed");
  }
}

export function isErrorMonitoringEnabled(): boolean {
  return enabled;
}

/**
 * Capture an error with the already-initialized SDK. No-op when monitoring is
 * disabled or the SDK reference is unavailable. Never throws, so request
 * handling is never disturbed by telemetry.
 */
export function captureServerError(error: unknown, context?: Record<string, string>): void {
  if (!enabled || !sentryModule) return;
  try {
    sentryModule.captureException(error, context ? { tags: context } : undefined);
  } catch {
    // never throw from capture
  }
}
