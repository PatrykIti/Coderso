# TASK-482-07: Advanced track steps + session-TTL reconciliation
# FileName: TASK-482-07-Advanced-Track-And-TTL-Reconciliation.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-06 (strict land order 04 → 05 → 06 → 07 → 08)
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

The optional Advanced track surfaces email, storage, security, and assistant
configuration inside the wizard by adapting the **existing** dedicated settings
endpoints — it does not re-implement their validation or storage. It also
reconciles the long-standing duplicate session-TTL sources
(`auth.sessionTtlDays` vs `security.session.ttlDays`) so the wizard writes one
canonical value and the precedence is explicit.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-07-L01 | Advanced step adapters over email/storage/security/assistant | Large | ✅ Done |
| TASK-482-07-L02 | Session-TTL reconciliation (single canonical source + precedence) | Medium | ✅ Done |

## Dependencies

- TASK-482-06 for land order: the TASK-482 phase-2 subtasks land **strictly
  sequentially** (04 → 05 → 06 → 07 → 08, single writer per source file). 07
  must not start in parallel with 05/06 — TASK-482-05-L02 and TASK-482-07-L01
  both wire steps into the `renderStep` switch from 04-L02 (the same wizard-shell
  source file), so overlapping edits would collide.
- Functionally builds on TASK-482-04 (step framework). Reuses the existing
  settings routes/services for email (`PUT /settings/email`), storage
  (`PATCH /settings/storage`), security (`PATCH /settings/security`), and
  assistant.

## Coordination Pins (TASK-482 stream — binding for both leaves)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams:** TASK-483 (analytics, worktree
  `/home/coder/project/Coderso-task-483`) and TASK-484 (backups,
  `/home/coder/project/Coderso-task-484`) run concurrently on sibling branches.
  **Forbidden paths for TASK-482:** `core/services/analytics/**`,
  `core/services/backups/**`, any analytics/backups route modules
  (`core/server/routes/analyticsRoutes.ts`, `core/server/routes/backupRoutes.ts`),
  `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Shared surfaces (additive-only, scoped to our own sections/lines, no
  restructuring):** the route registration module
  `core/server/routes/index.ts`, the security-gate test expectations under
  `tests/security/`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/AUTH_SPEC.md`.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install
  state, or reset shared settings rows. First-run/no-users gates are tested via
  service-level seams, uniquely scoped fixtures, or self-restoring
  setup/teardown.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*` (TASK-482 rows and its own
  statistics deltas only). Implementation subtasks — including 07-L01/07-L02 —
  never touch them.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08
  (phase 2), then 09 (closure). Strictly sequential, single writer per source
  file.

## Testing Requirements

- L01: Vitest ui-integration for the adapter steps + a Bun route-integration
  smoke that the wizard's writes hit the existing endpoints with secret redaction
  intact.
- L02: Vitest ui lane asserting the wizard writes exactly one canonical
  session-TTL key (`auth.sessionTtlDays`, never `security.session.ttlDays`) and
  that the effective-TTL selector shown in the Security step matches the
  resolver's output. The `resolveSessionTtlDaysFromSources` precedence pin
  already lives in the Bun lane (`tests/unit/auth/sessionService.test.ts:54`,
  imports from `bun:test`) and must NOT be duplicated in Vitest.
