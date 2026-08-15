# TASK-491: Integrations Runtime Wiring (GA / Slack / Zapier / Sentry)
# FileName: TASK-491_Integrations_Runtime_Wiring.md

**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-15
**Changelog:** 1279 (pinned by the orchestrator; closure only)
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

The Integrations settings surface advertises seven providers, but only three are
actually consumed at runtime: `openai` and `openrouter` (Assistant LLM providers
via `getIntegrationRuntimeConfig` in `core/services/integrations/integrationsService.ts`)
and `resend` (transactional email via `core/services/email/emailSettingsService.ts`).
The remaining four — `google-analytics`, `slack`, `zapier`, `sentry` — are
**decorative credential stores**: the admin lets you connect them, persists and
encrypts their fields, and renders them as "Connected / healthy", but nothing in
the runtime ever reads them:

- the GA `measurementId` is never injected into the public `<head>`;
- the Slack `webhookUrl` and Zapier `hookUrl` are never POSTed to (there is no
  event-dispatch hub at all — even the first-party `webhooks` table is inert:
  `listWebhooksByEvent` exists in `core/services/webhooks/webhooksService.ts` but
  has no caller, so `deliverWebhook` only runs from the manual "test" button);
- the Sentry `dsn` never initializes any error monitoring (no Sentry SDK is even
  a dependency);
- the health column always shows `healthy` whenever required fields are present
  (`toSummary` in `integrationsService.ts` defaults `healthStatus` to `healthy`
  for any connected integration, regardless of whether the credential works).

This task makes those four integrations do real work, server-side, while keeping
their secrets encrypted and off the client, and replaces the always-healthy
display with a real health/status check.

---

## Scope

### In scope

1. **Google Analytics** — inject the GA4 `gtag.js` tag into the public site
   `<head>` when a valid `measurementId` is configured (public pages, entry
   list, entry detail). Only the public measurement id reaches the client; never
   in preview renders.
2. **Slack + Zapier** — define a small, fixed outbound event set
   (`entry.published`, `page.published`, `form.submission`) and dispatch those
   events server-side to the configured Slack `webhookUrl` / Zapier `hookUrl`,
   reusing the webhook delivery retry/backoff core.
3. **Sentry** — initialize server-side error monitoring from the configured
   `dsn`/`environment` at server boot and capture unhandled request errors.
4. **Real health/status** — replace the always-`healthy` display with a real
   per-integration health evaluation persisted to the existing
   `integrations.healthStatus / lastCheckedAt / lastError` columns, surfaced in
   the admin UI with a "Test connection" action, plus tests and docs.

### Out of scope

- Reviving the first-party `webhooks` table event dispatch (the unused
  `listWebhooksByEvent` path). That is a separate concern; this task only wires
  the four named integrations. The dispatch core extracted in 02 is reusable by a
  later webhooks-event task but does not change webhook behavior here.
- A client-side Sentry SDK / browser DSN. The stored `dsn` field is `secret`-typed
  and must stay server-side, so client error reporting would require a new
  public `clientDsn` field — deferred (see 03 Out-of-scope).
- Adding/altering integration providers, fields, or the encryption seam
  (`core/services/security/secretStore.ts`).
- Any DB schema change. The health columns already exist; no migration artifacts
  are required by this task.

### What the TASK-479 reskin already covers vs. what this task adds

The TASK-479 admin redesign reskins `IntegrationsPage.tsx` (and its prototype
twin under `_docs/_PROTOTYPE/`) — it is **visual only**: card layout, connect
drawer, status pill. It does **not** make any of the four integrations function
and it keeps the always-healthy status. This task adds the runtime behavior
behind those cards and replaces the cosmetic status with a real one. The reskin
must continue to render; the only UI change here is binding the status pill and
a "Test connection" action to real health data (04-L02).

---

## Sub-Tasks

| ID            | Title                                            | Effort | Status     |
| ------------- | ------------------------------------------------ | ------ | ---------- |
| TASK-491-01   | Google Analytics tag injection                   | Small  | ⏳ To Do   |
| TASK-491-02   | Slack & Zapier outbound event dispatch           | Medium | ⏳ To Do   |
| TASK-491-03   | Sentry server-side error monitoring init         | Small  | ⏳ To Do   |
| TASK-491-04   | Real integration health checks + admin UI + docs | Medium | ⏳ To Do   |

---

## Testing Requirements

- Vitest (`tests/vitest/*`) for pure domain/service logic: the GA head-snippet
  builder + resolver, the integration event contract/normalizers, and the
  health evaluator. UI render flows (the status pill + "Test connection" action)
  go in `tests/vitest/ui-integration/*`.
- Bun (`tests/integration/routes/*`, `tests/security/*`) for everything with a
  runtime/route/IO dependency: public-site head injection over `Bun.serve`,
  outbound dispatch with retry/`fetch`, the new health-check route, the
  server-boot Sentry init, and secret-handling assertions.
- Security lane: assert no secret (`slack.webhookUrl`, `zapier.hookUrl`,
  `sentry.dsn`) is ever returned to the client, written to a cache, or logged,
  and that the GA client payload contains only the public `measurementId`.
- Run the repo's lint + type-check; record any skipped lane in the closeout.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — extend the "Integrations (v1)" section (currently
  `GET/PATCH /settings/integrations` + requests) with the new
  `POST /settings/integrations/:id/check` health endpoint and the runtime
  behavior of each provider.
- `_docs/ARCHITECTURE.md` — document the integration runtime seams: public-site
  GA head injection, the outbound integration event dispatch hub + emission
  points, and the boot-time Sentry init.
- `_docs/SECURITY_SPEC.md` — note that outbound integration secrets stay
  server-side/encrypted and the GA public-id-only client contract (only if the
  existing secret-handling rules need an explicit integration clause).
- Task board index + changelog are synced by the orchestrator — do not edit
  `_docs/_TASKS/README.md` or add changelog entries from within this task.

---

## Notes

- **Drift corrected vs. discovery brief:** `getIntegrationRuntimeConfig` lives in
  `core/services/integrations/integrationsService.ts` (lines ~306-316), **not**
  in `registry.ts`. `registry.ts` only owns the static `IntegrationDefinition[]`
  and `getIntegrationDefinition`. All leaves cite the service module.
- The integration secret seam is `encryptSecret`/`decryptSecret`/`isEncryptedSecret`
  in `core/services/security/secretStore.ts`; `getIntegrationRuntimeConfig`
  already returns decrypted values server-side. Leaves must consume that helper
  and never re-implement decryption or echo decrypted values outward.
- The `integrations` table (`core/db/schema.ts` ~165-181) already carries
  `healthStatus` (default `"unknown"`), `lastCheckedAt`, and `lastError`, plus a
  `integrations_health_idx`. No migration is needed for the health work.
- Schemas/enums/normalizers for the new event contract and health evaluation are
  owned by the domain/service modules; routes re-export, never re-declare
  (per `AGENTS.md` Implementation Rules).
