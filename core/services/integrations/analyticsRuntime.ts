/**
 * Analytics runtime resolver (TASK-491-01-L01).
 *
 * Builds the GA4 `gtag.js` head snippet for a validated `measurementId` and
 * resolves it from the `google-analytics` integration runtime config. Bun-free
 * at import time: the runtime config reader is injected/lazy-imported so pure
 * builder logic stays testable under Vitest without `db/client` side effects.
 *
 * Security: only a format-validated public `measurementId` is ever interpolated
 * into the snippet (fail closed on anything else); nothing secret is read or
 * emitted, and the resolver never logs integration config.
 */

export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export function isValidGaMeasurementId(value: unknown): value is string {
  return typeof value === "string" && GA_MEASUREMENT_ID_PATTERN.test(value.trim());
}

/**
 * Pure, deterministic head snippet builder. Returns "" for an invalid id
 * (fail closed) so the id can never break out of the `<script>` context.
 */
export function buildGoogleAnalyticsHeadSnippet(measurementId: string): string {
  if (!isValidGaMeasurementId(measurementId)) return "";
  const id = measurementId.trim();
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];`,
    `function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`,
    `gtag('config','${id}');</script>`,
  ].join("");
}

export type AnalyticsRuntimeDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<Record<string, string | null> | null>;
};

const defaultDeps: AnalyticsRuntimeDeps = {
  getIntegrationRuntimeConfig: async (id) => {
    const mod = await import("./integrationsService");
    return mod.getIntegrationRuntimeConfig(id);
  },
};

/**
 * Resolve the ready-to-inject head HTML for the configured GA integration,
 * or null when GA is not configured or the id is invalid.
 */
export async function resolvePublicAnalyticsHead(
  deps: AnalyticsRuntimeDeps = defaultDeps
): Promise<string | null> {
  const config = await deps.getIntegrationRuntimeConfig("google-analytics");
  const id = config?.measurementId;
  if (!isValidGaMeasurementId(id)) return null;
  return buildGoogleAnalyticsHeadSnippet(id);
}
