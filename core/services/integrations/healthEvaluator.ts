/**
 * Integration health evaluator (TASK-491-04-L01).
 *
 * Pure, deterministic evaluation of a single integration's health from its
 * configured-field validity plus the last real delivery outcome. Bun-free at
 * import time: only type imports plus the shared format validators, so the
 * evaluator stays testable under Vitest without `db/client` coupling.
 *
 * The format validators are NOT redefined here: `isValidGaMeasurementId` is
 * owned by `analyticsRuntime.ts` (TASK-491-01-L01) and `isParseableSentryDsn`
 * by `errorMonitoring.ts` (TASK-491-03-L01). There is exactly one copy of each.
 */
import { isValidGaMeasurementId } from "./analyticsRuntime";
import { isParseableSentryDsn } from "./errorMonitoring";
import type { IntegrationDefinition } from "./registry";
import type { IntegrationHealth, IntegrationRuntimeConfig } from "./integrationsService";

export type HealthEvaluation = {
  status: IntegrationHealth;
  lastError: string | null;
};

/**
 * Evaluate health from config validity and the stored delivery outcome.
 *
 * - Missing required field -> `unknown` (not connected, nothing broken).
 * - `google-analytics` -> validate `measurementId` format.
 * - `sentry` -> validate the DSN URL shape.
 * - `slack`/`zapier` -> reflect the last real outbound delivery recorded by the
 *   delivery adapters; configured-and-valid baseline is `healthy` (no live
 *   probe exists: a webhook has no safe no-op ping).
 * - Other integrations with real runtime consumers baseline on required fields
 *   present.
 */
export function evaluateIntegrationHealth(
  definition: IntegrationDefinition,
  config: IntegrationRuntimeConfig,
  storedLastError: string | null
): HealthEvaluation {
  const missing = definition.fields.some(
    (field) =>
      field.required && !(typeof config[field.key] === "string" && config[field.key]!.trim())
  );
  if (missing) return { status: "unknown", lastError: null };

  switch (definition.id) {
    case "google-analytics":
      return isValidGaMeasurementId(config.measurementId)
        ? { status: "healthy", lastError: null }
        : { status: "issue", lastError: "measurement_id_invalid" };
    case "sentry":
      return isParseableSentryDsn(config.dsn)
        ? { status: "healthy", lastError: null }
        : { status: "issue", lastError: "dsn_invalid" };
    case "slack":
    case "zapier":
      return storedLastError
        ? { status: "issue", lastError: storedLastError }
        : { status: "healthy", lastError: null };
    default:
      return { status: "healthy", lastError: null };
  }
}
