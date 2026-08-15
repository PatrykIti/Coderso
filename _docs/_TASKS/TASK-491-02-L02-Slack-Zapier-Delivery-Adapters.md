# TASK-491-02-L02: Slack & Zapier delivery adapters + health
# FileName: TASK-491-02-L02-Slack-Zapier-Delivery-Adapters.md

**Parent Subtask:** TASK-491-02
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** TASK-491-02-L01
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

> **M3 fix (audit):** `submissionService.ts:5-8` selects only `{id: forms.id}`
> and `submitForm` returns the transaction directly (:28-41); the form-submitted
> seam must select `forms.name` (or drop the title) and emit after
> `db.transaction` resolves using the returned row.

- **Goal:** Implement the two outbound adapters the dispatcher (L01) calls:
  format + POST the normalized event to Slack and Zapier, and record per-target
  health (`healthStatus`/`lastCheckedAt`/`lastError`) from the delivery outcome.
- **Owning module(s) to create-or-extend:**
  - Create `core/services/integrations/slackDelivery.ts` —
    `formatSlackMessage(payload)` (pure) → `{ text }`, and
    `deliverSlack(config, payload)` → `postWithRetry({ url: config.webhookUrl,
    body: JSON.stringify({ text }) })`, then record health.
  - Create `core/services/integrations/zapierDelivery.ts` —
    `deliverZapier(config, payload)` → `postWithRetry({ url: config.hookUrl,
    body: JSON.stringify(payload) })` (raw event JSON), then record health.
  - Extend `core/services/integrations/integrationsService.ts` with
    `recordIntegrationHealth(id, { ok, lastError })` that writes
    `healthStatus = ok ? "healthy" : "issue"`, `lastCheckedAt = now`,
    `lastError = ok ? null : <code>` to the `integrations` row (existing
    columns — no migration). Reuse `IntegrationHealth` enum already defined there.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md`.
- **Out of scope:** Slack Block Kit / rich attachments (plain `text` only); a
  scheduled/standalone health probe (TASK-491-04 owns explicit health checks;
  this leaf only records health as a side effect of real deliveries).

---

## Security Contract

- **Endpoint visibility:** n/a (outbound server-side HTTP only; no inbound route).
- **Auth model:** n/a.
- **RBAC:** n/a.
- **CSRF:** n/a.
- **Rate-limit bucket:** bounded by `postWithRetry` (≤3 attempts per target per
  event); no unbounded fan-out.
- **Validation:** adapters receive an already-normalized payload from L01; they
  add no untrusted fields. `webhookUrl`/`hookUrl` come only from
  `getIntegrationRuntimeConfig` (server-side decrypted).
- **Anti-abuse:** n/a.
- **Secret handling:** the destination URL (itself the Slack/Zapier secret) is
  used as the `fetch` target and is NEVER logged, echoed, or persisted in
  `lastError`. `recordIntegrationHealth` stores only a machine-readable code
  (e.g. `http_500`, `timeout`) in `lastError`, never the URL or response body.

---

## Implementation Pseudocode

```ts
// core/services/integrations/slackDelivery.ts
export function formatSlackMessage(p: IntegrationEventPayload): { text: string } {
  const label =
    p.event === "entry.published" ? "Entry published"
    : p.event === "page.published" ? "Page published"
    : "Form submission";
  const name = p.resource.title ?? p.resource.id;
  return { text: `:rocket: ${label}: ${name}` };
}

export async function deliverSlack(config: Record<string, string | null>, payload: IntegrationEventPayload) {
  const url = config.webhookUrl;
  if (!url) return;
  const result = await postWithRetry({ url, body: JSON.stringify(formatSlackMessage(payload)) });
  await recordIntegrationHealth("slack", {
    ok: result.ok,
    lastError: result.ok ? null : healthCode(result), // e.g. `http_${code}` | "timeout" | "delivery_failed"
  });
}
```

```ts
// core/services/integrations/zapierDelivery.ts
export async function deliverZapier(config: Record<string, string | null>, payload: IntegrationEventPayload) {
  const url = config.hookUrl;
  if (!url) return;
  const result = await postWithRetry({ url, body: JSON.stringify(payload) });
  await recordIntegrationHealth("zapier", {
    ok: result.ok,
    lastError: result.ok ? null : healthCode(result),
  });
}
```

```ts
// integrationsService.ts (extend)
export async function recordIntegrationHealth(
  id: string, input: { ok: boolean; lastError: string | null }
): Promise<void> {
  await db.update(integrations).set({
    healthStatus: input.ok ? "healthy" : "issue",
    lastCheckedAt: new Date(),
    lastError: input.ok ? null : input.lastError,
    updatedAt: new Date(),
  }).where(eq(integrations.id, id));
}
```

**Data flow:** dispatcher → adapter → `postWithRetry` → `recordIntegrationHealth`
writes the existing health columns → surfaced by TASK-491-04.

**Error handling:** adapters never throw outward (caught by L01's
`Promise.allSettled`); a non-ok delivery flips health to `issue` with a coded
`lastError`. A no-URL config is a silent no-op.

**Regression-test shape:**

- `formatSlackMessage` produces the expected text per event.
- `deliverSlack`/`deliverZapier` with mocked `postWithRetry`: success → health
  `healthy` + `lastError` null; failure → health `issue` + coded error; no URL →
  no `fetch`, no health write.
- Security: failing delivery never writes the URL into `lastError`.

---

## Testing Requirements

- Bun (`tests/integration/routes/integrationDelivery.test.ts`) — adapters +
  `recordIntegrationHealth` DB write with mocked `fetch` (runtime/IO + DB → Bun).
- Vitest (`tests/vitest/integrations/slackFormat.test.ts`) — pure
  `formatSlackMessage`.
- Lint + type-check.
