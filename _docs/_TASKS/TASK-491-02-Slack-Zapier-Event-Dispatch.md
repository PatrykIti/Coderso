# TASK-491-02: Slack & Zapier outbound event dispatch
# FileName: TASK-491-02-Slack-Zapier-Event-Dispatch.md

**Parent Task:** TASK-491
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Make the Slack (`webhookUrl`) and Zapier (`hookUrl`) integrations actually fire.
There is currently **no event-dispatch hub** in the system, so this subtask
builds a small, fixed one and POSTs server-side to each configured integration.

Defined event set (fixed, closed enum — do not over-generalize):

- `entry.published` — emitted from `publishEntry` (`core/services/content/entryService.ts:816`).
- `page.published` — emitted from `publishPage` (`core/services/pages/pageService.ts:200`).
- `form.submission` — emitted from `submitForm` (`core/services/forms/submissionService.ts:29`).

Delivery reuses the existing retry/backoff core from
`core/services/webhooks/deliveryService.ts` (`deliverWebhook` loop: max 3
attempts, 8s timeout, exponential backoff `400ms * 2^(n-1)`). Because that
function is bound to a `webhooks` table row, L01 extracts the transport loop into
a shared `postWithRetry` helper that both the existing webhook delivery and the
new integration dispatch use (DRY, behavior-preserving for webhooks).

### Leaves

| ID              | Title                                       | Effort | Status   |
| --------------- | ------------------------------------------- | ------ | -------- |
| TASK-491-02-L01 | Event dispatch core + emission seams        | Medium | ⏳ To Do |
| TASK-491-02-L02 | Slack & Zapier delivery adapters + health   | Small  | ⏳ To Do |

---

## Dependencies

- Reads decrypted secrets via `getIntegrationRuntimeConfig("slack" | "zapier")`
  in `core/services/integrations/integrationsService.ts`.
- L02 depends on L01 (the dispatcher + shared transport must exist first).
- The health write in L02 uses the existing `integrations.healthStatus /
  lastCheckedAt / lastError` columns (no migration) and is consumed by the
  TASK-491-04 health surface.

---

## Testing Requirements

- Bun (`tests/integration/routes/*`, `tests/security/*`) — outbound dispatch with
  mocked `fetch`: retry/backoff, fire-and-forget non-blocking emission from the
  publish/submit seams, and the security assertion that secrets never appear in
  logs or any client-visible payload. This is runtime/IO behavior → Bun lane.
- Vitest (`tests/vitest/*`) — pure pieces only: the event payload normalizer and
  the Slack message formatter (no `fetch`/DB).
