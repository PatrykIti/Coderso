# TASK-491-02-L01: Event dispatch core + emission seams
# FileName: TASK-491-02-L01-Event-Dispatch-Core.md

**Parent Subtask:** TASK-491-02
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Build the outbound integration event hub and wire the three fixed
  emission points, plus extract the reusable retry-POST transport so we do not
  duplicate the webhook delivery loop.
- **Owning module(s) to create-or-extend:**
  - Create `core/services/webhooks/retryPost.ts` — `postWithRetry({ url, body,
    headers, attempts, timeoutMs, baseDelayMs })` extracted verbatim (same
    defaults: attempts 3, timeout 8000, baseDelay 400, backoff `2^(n-1)`) from
    the loop in `deliveryService.ts`. Refactor `deliverWebhook` to call it so
    existing webhook behavior is preserved.
  - Create `core/services/integrations/integrationEventDispatch.ts` — owns the
    closed event enum, the `IntegrationEvent` payload type, the normalizer, and
    `emitIntegrationEvent(event, payload)` which resolves enabled outbound
    targets (`slack`, `zapier`) and dispatches via the L02 adapters.
  - Emission seams (fire-and-forget, server-side, never block the mutation):
    `publishEntry` (`entryService.ts`), `publishPage` (`pageService.ts`),
    `submitForm` (`submissionService.ts`).
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (runtime/services + webhook
  delivery), `_docs/SECURITY_SPEC.md` (secret handling, no egress of secrets to
  logs), `_docs/CMS_API.md`.
- **Out of scope:** The Slack/Zapier per-target formatting + HTTP + health write
  (that is L02 — this leaf calls into adapter functions L02 implements). Reviving
  the first-party `webhooks` table event dispatch (`listWebhooksByEvent`).

---

## Security Contract

- **Endpoint visibility:** n/a (no new route; internal server-side emission only).
- **Auth model:** n/a — emission is triggered by already-authorized mutations
  (publish/submit), inheriting their auth; it adds no new entry point.
- **RBAC:** n/a (the publish/submit operations already enforce their own RBAC).
- **CSRF:** n/a.
- **Rate-limit bucket:** n/a for emission. Outbound `fetch` is bounded by the
  retry cap (≤3 attempts/target) so a publish cannot fan out unboundedly.
- **Validation:** the event enum is a closed set; `emitIntegrationEvent` rejects
  (no-op) unknown events. Payloads are normalized to a fixed safe shape (ids,
  slugs, titles, timestamps) — never raw record bodies that could carry
  unexpected PII.
- **Anti-abuse:** n/a (no public write added).
- **Secret handling:** `webhookUrl`/`hookUrl` are decrypted only inside the
  dispatcher via `getIntegrationRuntimeConfig` and passed to the adapter; they
  are NEVER logged, never put on the event payload, and never returned to any
  caller. Dispatch failures log a machine-readable code only (no URL/secret).
  Emission is wrapped so a dispatch error can never surface to the public
  form-submission response or fail the publish.

---

## Implementation Pseudocode

```ts
// core/services/webhooks/retryPost.ts  (shared transport, extracted)
export type RetryPostInput = {
  url: string;
  body: string;
  headers?: Record<string, string>;
  attempts?: number;     // default 3
  timeoutMs?: number;    // default 8000
  baseDelayMs?: number;  // default 400
};
export type RetryPostResult = {
  ok: boolean; attempts: number; responseCode: number | null; lastError: string | null;
};
export async function postWithRetry(input: RetryPostInput): Promise<RetryPostResult> {
  // same loop as deliveryService.ts: AbortController timeout, backoff baseDelay*2^(n-1)
}
// deliverWebhook() is refactored to build headers/signature then call postWithRetry().
```

```ts
// core/services/integrations/integrationEventDispatch.ts
export const INTEGRATION_EVENTS = ["entry.published", "page.published", "form.submission"] as const;
export type IntegrationEvent = (typeof INTEGRATION_EVENTS)[number];

export type IntegrationEventPayload = {
  event: IntegrationEvent;
  occurredAt: string;            // ISO
  resource: { type: "entry" | "page" | "form-submission"; id: string; title?: string; slug?: string };
};

export function normalizeIntegrationEventPayload(
  event: IntegrationEvent, resource: IntegrationEventPayload["resource"]
): IntegrationEventPayload { /* clamp/whitelist fields, set occurredAt */ }

type DispatchDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<Record<string, string | null> | null>;
  deliverSlack: (cfg, payload) => Promise<void>;   // L02
  deliverZapier: (cfg, payload) => Promise<void>;  // L02
};

export async function emitIntegrationEvent(
  event: IntegrationEvent,
  resource: IntegrationEventPayload["resource"],
  deps: DispatchDeps = defaultDeps,
): Promise<void> {
  if (!INTEGRATION_EVENTS.includes(event)) return;
  const payload = normalizeIntegrationEventPayload(event, resource);
  const [slack, zapier] = await Promise.all([
    deps.getIntegrationRuntimeConfig("slack"),
    deps.getIntegrationRuntimeConfig("zapier"),
  ]);
  await Promise.allSettled([
    slack?.webhookUrl ? deps.deliverSlack(slack, payload) : Promise.resolve(),
    zapier?.hookUrl ? deps.deliverZapier(zapier, payload) : Promise.resolve(),
  ]); // adapters own their own try/catch + health write; never throw outward
}

// Fire-and-forget wrapper used at the seams so dispatch never blocks/breaks the mutation.
export function emitIntegrationEventSafe(event, resource): void {
  void emitIntegrationEvent(event, resource).catch((e) =>
    console.warn("integration_event_dispatch_failed", { event, code: "dispatch_failed" }));
}
```

```ts
// Emission seams (after the mutation commits successfully):
// entryService.publishEntry(...)  -> emitIntegrationEventSafe("entry.published",
//   { type: "entry", id: entry.id, title: entry.title, slug: entry.slug });
// pageService.publishPage(...)     -> emitIntegrationEventSafe("page.published",
//   { type: "page", id: page.id, title: page.title, slug: page.slug });
// submissionService.submitForm(...)-> emitIntegrationEventSafe("form.submission",
//   { type: "form-submission", id: row.id, title: form.name });
```

**Data flow:** mutation commits → `emitIntegrationEventSafe` → normalize payload →
resolve slack/zapier runtime config → `Promise.allSettled` over configured
adapters → adapters POST via `postWithRetry`. Nothing in this path can throw back
into the mutation.

**Error handling:** unknown event → no-op; unconfigured target → skipped; adapter
errors are swallowed and logged as `integration_event_dispatch_failed` with a
machine-readable code (no URL/secret). The seam wrapper is `void`-returning.

**Regression-test shape:**

- `postWithRetry`: success on attempt 1; retries to attempt 3 with backoff; honors
  timeout/abort; `deliverWebhook` still passes its existing tests (behavior
  preserved).
- `emitIntegrationEvent` with stub deps: configured slack+zapier → both adapters
  called once with the normalized payload; only-slack configured → only slack;
  neither configured → no adapter calls; unknown event → no-op.
- Seam test: `publishEntry`/`publishPage`/`submitForm` invoke
  `emitIntegrationEventSafe` exactly once with the right event + resource, and a
  thrown adapter error does not fail the mutation.

---

## Testing Requirements

- Bun (`tests/integration/routes/integrationEventDispatch.test.ts`) — dispatch +
  retry + seam wiring with mocked `fetch`/deps (runtime/IO → Bun lane).
- Vitest (`tests/vitest/integrations/integrationEventPayload.test.ts`) — pure
  `normalizeIntegrationEventPayload` only.
- `tests/security/integrationEventSecrets.test.ts` (Bun) — capture `console`
  output during a failing dispatch and assert no `webhookUrl`/`hookUrl` value
  appears.
- Lint + type-check.
