# TASK-482-05: Phase-2 Basic steps + `site.timezone` settings key
# FileName: TASK-482-05-Phase2-Basic-Steps-And-Settings-Keys.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-04
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

The Basic track's concrete fields: branding/identity, locale, **timezone**, and
public + admin URLs, persisted via the bulk `PATCH /settings` endpoint. Timezone
is currently un-modelled — `site.timezone` is **missing** from `DEFAULT_SETTINGS`
in `settingsService.ts` — so this subtask first adds the key (allowlist +
normalizer + validation) and only then wires the UI step.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-05-L01 | Add `site.timezone` (+ optional branding/logo) settings key | Small | ✅ Done |
| TASK-482-05-L02 | Basic steps UI bound to bulk `PATCH /settings` | Medium | ✅ Done |

## Dependencies

- TASK-482-04 (step framework/shell). L02 depends on L01 (new key must exist
  before the UI writes it).

## Security Contract

This mid-level subtask introduces no new endpoint; both leaves write the
Basic-track fields through the **existing** bulk `PATCH /settings` (and
`PATCH /settings/:key`) admin routes. The full, per-leaf Security Contracts are
authoritative — see **L01 lines 71-90** (`site.timezone` value validation) and
**L02 lines 109-127** (Basic-steps UI write path). Summary of the shared model:

- **Endpoint visibility:** internal admin `/admin/api/*` settings routes; no new
  route is added by this subtask.
- **Auth model / RBAC:** authenticated admin session; `settings:read` (GET) /
  `settings:write` (PATCH). The new keys ride the existing route guards
  unchanged.
- **CSRF:** enforced on the settings PATCH writes; the UI must reuse
  `updateSettings` (`{ withCsrf: true }`), never a bespoke fetch (see L02).
- **Rate-limit bucket:** `admin_write` (inherited from the settings PATCH route).
- **Strict validation / reject-unknown:** the settings **service** owns value
  validation via `validateSettingValue`; unknown keys are rejected by
  `resolveSettingKey` (`settings_key_invalid`), invalid values by the
  per-key normalizer (`settings_value_invalid`) — both mapped to 400 by
  `mapSettingsRouteError`. `site.timezone` normalization is defined in L01.
- **Anti-abuse / secrets / PII:** N/A — authenticated internal writes; timezone,
  branding logo id, locale and URLs are non-secret with no PII.

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this subtask never touches
  them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Testing Requirements

- L01: Bun service lane — extend `tests/unit/settings/settingsService.test.ts`
  (DB-backed `setSetting`/`getSetting` round-trip + rejects + post-`deleteSetting`
  default, self-restoring via its `cleanupKeys`/`afterAll` pattern on the shared
  remote test DB). Bun route-wiring lane — extend
  `tests/integration/routes/settings.test.ts` within its fake-router harness
  (`runRoute` error propagation + `mapSettingsRouteError` → 400; no HTTP
  server/persistence assertions there). Vitest only for the pure normalizer,
  and only if `normalizeTimezoneValue` is exported (see L01).
- L02: Vitest ui-integration for the Basic steps writing through the settings
  client (`updateSettings`).
