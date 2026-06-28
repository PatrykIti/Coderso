# TASK-491-04-L01: Integration health service + check route
# FileName: TASK-491-04-L01-Integration-Health-Service.md

**Parent Subtask:** TASK-491-04
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Medium
**Dependencies:** TASK-491-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add a deterministic per-integration health evaluator, a manual
  "Test connection" endpoint that runs it and persists the result, and stop the
  cosmetic `healthy` default so the UI reflects real state.
- **Owning module(s) to create-or-extend:**
  - `core/services/integrations/integrationsService.ts` — add the pure
    `evaluateIntegrationHealth(definition, runtimeConfig, lastError)` returning
    `{ status: IntegrationHealth; lastError: string | null }`, and the async
    `runIntegrationHealthCheck(id)` that resolves runtime config, evaluates,
    calls `recordIntegrationHealth` (from 02-L02), and returns the updated
    summary. Change `toSummary` so `healthStatus` comes straight from the stored
    row (default `"unknown"`), NOT auto-`"healthy"` for connected rows.
  - `core/server/routes/integrationsRoutes.ts` — add
    `POST /settings/integrations/:id/check` (orchestration-only: RBAC →
    delegate → `logAudit` → map domain errors). Re-export any schema; do not
    re-declare contract logic.
  - `core/server/validation/integrationsSchemas.ts` — if the check takes a body,
    add a strict `{ additionalProperties: false }` schema; otherwise the route
    takes no body and validates only `:id`.
  - `core/admin/services/integrationsClient.ts` — add `checkIntegration(id)`
    (used by 04-L02), following the existing client wrapper pattern.
- **Source-of-truth docs:** `_docs/CMS_API.md` (Integrations v1),
  `_docs/RBAC_SPEC.md` (settings perms), `_docs/SECURITY_SPEC.md`,
  `_docs/ARCHITECTURE.md`.
- **Out of scope:** Background/scheduled health polling and live network probes
  to Slack/Zapier/Sentry (a Slack/Zapier webhook has no safe no-op ping; firing
  one would spam the channel). Health is evaluated deterministically from
  configured-field validity + the last real delivery outcome already recorded by
  02-L02. Live network probes are a deferred follow-up.

---

## Security Contract

- **Endpoint visibility:** `internal` (`/admin/api/settings/integrations/:id/check`).
- **Auth model:** session (admin), same as the sibling integration routes.
- **RBAC:** `settings:write` (it mutates `healthStatus`/`lastCheckedAt`/`lastError`
  and is a deliberate action), matching the existing `PATCH` route. Read-only
  status continues to ride `settings:read` via the existing `GET`.
- **CSRF:** required (internal POST write) — enforced by the shared admin CSRF
  middleware on `/admin/api/*` writes.
- **Rate-limit bucket:** the existing admin bucket; no new public surface.
- **Validation:** `:id` must resolve to a known `IntegrationDefinition`
  (`integration_not_found` otherwise). Any body schema is strict
  (`additionalProperties: false`); unknown fields reject as
  `integration_config_invalid`.
- **Anti-abuse:** n/a (internal authenticated write; no nonce/captcha needed).
- **Secret handling:** the response returns the existing `IntegrationSummary`
  shape only — secret fields stay `value: null` / `configured: boolean` (already
  enforced by `toFieldSummary`). `lastError` carries only machine-readable codes,
  never decrypted secrets/URLs. Decrypted runtime config is used only inside the
  evaluator and never returned or logged.

---

## Implementation Pseudocode

```ts
// integrationsService.ts
export function evaluateIntegrationHealth(
  definition: IntegrationDefinition,
  config: IntegrationRuntimeConfig,
  storedLastError: string | null,
): { status: IntegrationHealth; lastError: string | null } {
  // Required fields present?
  const missing = definition.fields.some(
    (f) => f.required && !(typeof config[f.key] === "string" && config[f.key]!.trim()),
  );
  if (missing) return { status: "unknown", lastError: null }; // not connected -> unknown

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
      // Reflect the last real outbound delivery (recorded by 02-L02); if never
      // delivered yet, configured-and-valid-URL => healthy baseline.
      return storedLastError
        ? { status: "issue", lastError: storedLastError }
        : { status: "healthy", lastError: null };
    default:
      // openai/openrouter/resend already have real runtime consumers; baseline
      // on required-fields-present.
      return { status: "healthy", lastError: null };
  }
}

export async function runIntegrationHealthCheck(id: string): Promise<IntegrationSummary> {
  const definition = getIntegrationDefinition(id);
  if (!definition) throw new Error("integration_not_found");
  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  const config = decryptIntegrationConfig(normalizeStoredConfig(row?.config));
  const result = evaluateIntegrationHealth(definition, config, row?.lastError ?? null);
  await recordIntegrationHealth(id, { ok: result.status === "healthy", lastError: result.lastError });
  return (await getIntegration(id))!;
}

// toSummary: drop the auto-healthy default
const healthStatus = (row?.healthStatus ?? "unknown") as IntegrationHealth;
```

```ts
// integrationsRoutes.ts
router.post(
  "/settings/integrations/:id/check",
  requirePermission("settings:write"),
  async (ctx) => {
    try {
      const updated = await runIntegrationHealthCheck(ctx.params.id);
      await logAudit({ actorId: ctx.user?.id ?? null, action: "integration.check",
        targetType: "integration", targetId: ctx.params.id, ip: ctx.ip, userAgent: ctx.userAgent });
      return { item: updated };
    } catch (error) {
      if (error instanceof Error && error.message === "integration_not_found")
        throw new ApiError("integration_not_found", "Integration not found", 404);
      throw error;
    }
  },
);
```

**Data flow:** route → `runIntegrationHealthCheck` → resolve+decrypt config →
pure `evaluateIntegrationHealth` → `recordIntegrationHealth` persists → return
summary (secrets masked). `toSummary` now mirrors the stored health.

**Error handling:** unknown id → `integration_not_found` → 404 via `ApiError`;
machine-readable domain codes mapped only at the route boundary.

**Regression-test shape:**

- `evaluateIntegrationHealth` matrix: missing required → `unknown`; GA bad id →
  `issue/measurement_id_invalid`; GA good → `healthy`; Sentry bad dsn → `issue`;
  slack/zapier with `storedLastError` → `issue` (preserved), without → `healthy`.
- `toSummary` no longer returns `healthy` for a connected row whose stored
  `healthStatus` is `unknown`.
- Route: RBAC denies without `settings:write`; CSRF enforced; 404 on unknown id;
  success persists health + returns masked summary; audit logged.

---

## Testing Requirements

- Vitest (`tests/vitest/integrations/integrationHealth.test.ts`) — pure evaluator
  + `toSummary` change.
- Bun (`tests/integration/routes/integrationsHealthRoute.test.ts`) — route
  auth/RBAC/CSRF/validation/persistence/error mapping (route + DB → Bun lane).
- `tests/security/integrationHealthSecrets.test.ts` (Bun) — check response +
  `lastError` never contain decrypted secrets/URLs.
- Lint + type-check. No DB change → no migration artifacts (columns pre-exist).
