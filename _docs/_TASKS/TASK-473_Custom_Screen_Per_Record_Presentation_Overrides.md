# TASK-473: Custom Screen Per-Record Presentation Overrides
# FileName: TASK-473_Custom_Screen_Per_Record_Presentation_Overrides.md

**Priority:** Medium
**Category:** Custom Screens / Entry Presentation / Storage Contract
**Estimated Effort:** Large
**Dependencies:** TASK-468-05, TASK-468-07-L01
**Status:** 🚧 In Progress
**Started:** 2026-06-24
**Progress Note:** Foundation slice completed in TASK-473-01, TASK-473-02,
TASK-473-04. TASK-473-03 remains blocked by TASK-474-03; TASK-473-05 and parent
closure remain open until the UI/cache slice lands.

---

## Overview

Design and implement durable per-record presentation overrides for Custom Screen
entry detail canvases without storing hidden style/image/text-size fields inside
`content_entries.data`. Entry `data` remains owned by the content type schema;
presentation overrides need an explicit storage/API contract that can be
validated, audited, permissioned, and cleaned up independently.

This family owns examples such as record-specific image choices, text-size or
emphasis overrides, and other presentation metadata that should affect how a
record appears in one Custom Screen without becoming part of the content type's
business data.

### Relationship to TASK-474

TASK-474 owns the per-record **UX** (de-bordering + inline content-value editing).
TASK-473 owns the per-record **presentation storage/API**. TASK-474-03 persists
content field values through the existing entry path; presentation overrides (text
size, image, emphasis) persist through this family. The record detail panel
wiring (TASK-473-03) builds on the canvas TASK-474-03 produces.

## Sub-Tasks

| ID | Title | Effort | Depends on |
|----|-------|--------|------------|
| TASK-473-01 | Override Storage Domain Owner And Schemas | Large | — |
| TASK-473-02 | Internal Admin Override Routes | Medium | 473-01 |
| TASK-473-03 | Record Detail Override Panel Wiring | Medium | 473-02, 474-03 |
| TASK-473-04 | Override Cleanup And Backfill | Medium | 473-01 |
| TASK-473-05 | Docs, Validation, And Board Closure | Small | 473-01..04 |

Implement in dependency order: 473-01 (domain + migration) first, then 473-02
(routes) and 473-04 (cleanup) in parallel, then 473-03 (UI) after TASK-474-03 has
removed the detached Value panel, then 473-05 (closure).

> **Decomposition note:** each `TASK-473-NN` is authored as an **execution-ready
> terminal unit** (own implementation pseudocode + Security Contract) rather than
> decomposing into `LNN` leaves — an intentional KISS choice for right-sized
> subtasks. Split into `TASK-473-NN-LNN` leaves only if a subtask grows during
> implementation.

## Security Contract (umbrella)

Per-subtask Security Contracts live in the child files. Summary:

- **Endpoint visibility:** internal admin only unless a later public runtime task
  explicitly adds public presentation writes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for reads; `content:write` for writes; preserve any
  stronger screen/entry permissions added by TASK-468 follow-ups.
- **CSRF expectations:** required for all admin write routes (TASK-473-02).
- **Rate-limit bucket:** existing admin write bucket for mutations; admin read
  bucket for reads.
- **Reject unknown validation:** required at route and service boundaries for
  override payloads, targets, prop paths, and values.
- **Anti-abuse controls:** no public write path in this family; if public writes
  are later added, require nonce + HMAC/signature and optional reCAPTCHA.
- **Secret handling:** overrides must not store provider credentials, CSRF tokens,
  cookies, private settings, or protected field values outside the existing admin
  authorization model.

## Testing Requirements (umbrella)

Each child runs its own lane. Family gates:

- `bun run test:vitest -- tests/vitest/customScreens`
- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- DB migration tests when `DATABASE_URL` is available.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `bun --cwd core build:admin`,
  `bun run check:admin-boundary`, `bun run check:admin-bundle`,
  `bun run gates:coderso`, `git diff --check`.

## Documentation Updates Required

- `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`, `_docs/DATA_MODEL.md` (storage),
  `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` (cached override resource),
  `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/` + its `README.md` on closure.

## Acceptance Criteria

1. Per-record presentation overrides persist outside `content_entries.data`.
2. Override payloads are strictly validated, permissioned, and auditable.
3. Record detail UI can save and reload overrides without exposing builder
   controls in record mode.
4. Deleting screens, entries, fields, or blocks cannot leave active unsafe
   override state.
5. All TASK-473-NN children are `✅ Done`/`⏭️ Superseded`/`❌ Cancelled` before the
   parent closes.
