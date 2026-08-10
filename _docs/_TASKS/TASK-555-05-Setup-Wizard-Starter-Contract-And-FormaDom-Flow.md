# TASK-555-05: Setup Wizard Starter Contract and FormaDom Flow
# FileName: TASK-555-05-Setup-Wizard-Starter-Contract-And-FormaDom-Flow.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Setup Wizard / Admin UI / Reliability
**Estimated Effort:** Large
**Dependencies:** landed TASK-555-04-L03 and TASK-555-03-L03 receipts; landed
TASK-551-09-L04 FINAL cache-authority receipt
**Status:** ⏳ To Do

---

## Overview

Replace Setup's nonexistent hard-coded starter IDs and drifted DTOs with the shared
server options/read model. Require preview and explicit takeover confirmation before
apply, patch authoritative effective name/locale into wizard state, and keep retry,
rollback, navigation, and Finish consistent without overwriting newer user edits.

Starter installation remains optional. If the user chooses to install one, preview is
mandatory. The flow is provider-free and sends only a registry starter ID plus
preview/idempotency/confirmation fields.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-05-L01 | dynamic options/client DTO; remove obsolete IDs | ⏳ To Do |
| 2 | TASK-555-05-L02 | preview/takeover confirmation/apply/effective-settings patch | ⏳ To Do |
| 3 | TASK-555-05-L03 | rollback/retry/finalize consistency and dirty-safe shell state | ⏳ To Do |

## State Invariants

- Changing starter invalidates preview and rotates in-memory idempotency state.
- Preview/apply/rollback state is React/reducer memory only; it is not browser
  storage or URL state.
- One idempotency key is stable across retries of one preview and rotates only after
  success, rollback, selection change, or new preview.
- Apply response patches effective `siteName`/`siteLocale`. Finish waits for all
  starter work and then submits the authoritative post-settlement controller values,
  not a `current` snapshot captured before the await.
- An identity/locale edit made after mutation dispatch wins over a late response;
  untouched fields accept authoritative effective values.
- Successful rollback returns/restores prior effective settings and updates the
  same state; `failed` and `recovery_required` return null effective settings and
  leave the controller values unchanged.
- Navigation cannot silently abandon an uncertain mutation; visible retry/rollback
  state remains available.
- L03 owns product-neutral optional protected-route metadata
  `setupAccess: "requires-complete" | "review"` (default `"requires-complete"`) and
  `SetupReviewContinuationV1`. It proves review through an injected synthetic route;
  remaining TASK-414 consumes this seam later and is not a TASK-555 dependency.

## Security Contract

- **Visibility:** internal Setup routes only.
- **Auth/RBAC:** authenticated session; reads require `solution-kits:read`, preview
  `solution-kits:write`, apply/rollback `solution-kits:write` + `settings:write`.
- **CSRF/rate limit:** all POSTs use shared CSRF and `admin_write`; options/status GET
  use `admin_read`.
- **Validation:** shared strict DTOs; no arbitrary IDs, package, blueprint, path, URL,
  or provider field.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA; preview and idempotency controls are
  server authoritative.
- **Privacy:** no package/preview/snapshot/raw key is persisted or logged.

## Collision Guard

Do not edit TASK-414/489/545/547/548/551/554 tasks, foreign changelogs, indexes, assistant
intake, or another leaf's Setup/client tests. `AdminApp.tsx` is owned only by L03 and
must be read fresh because it is a shared shell.

## Testing Requirements

- Vitest client, reducer/state-machine, component, and Setup integration tests.
- Bun route/onboarding integration for effective settings, rollback, and finalize.
- Runtime scenario proving FormaDom values survive Finish.
- Core lint/types, admin boundary, focused suites, line counts, diff check.

## Documentation Updates Required

Closure updates setup/solution-kit API, user Guide, and cache docs. This child does
not edit closure metadata.
