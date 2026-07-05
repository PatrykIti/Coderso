# TASK-482-07-L02: Session-TTL reconciliation (single canonical source + precedence)
# FileName: TASK-482-07-L02-Session-TTL-Reconciliation.md

**Parent Subtask:** TASK-482-07
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-07-L01. See the parent's "Coordination Pins" section (changelog 1220 pinned; shared remote test DB — self-restoring test setup only; land order 04 → 05 → 06 → 07 → 08; board/changelog edits only in TASK-482-09).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Resolve the duplicate session-TTL configuration so the wizard cannot
  write two conflicting values. **This leaf also OWNS the re-homing of
  `auth.resetTtlMinutes`** (password-reset-token TTL): the pre-redesign finalize
  builder `toSetupWizardSettingsPayload` persisted BOTH `auth.sessionTtlDays`
  AND `auth.resetTtlMinutes` (`setupWizardValidation.ts:88-89`), but the new
  Basic-track `toBasicSettingsPayload` (05-L02) persists neither auth key. Since
  the Advanced Security step (07-L01) becomes the wizard's home for auth TTLs,
  BOTH `auth.sessionTtlDays` and `auth.resetTtlMinutes` are written there via
  bulk `PATCH /settings`, preserving the existing wizard capability rather than
  silently dropping reset-TTL config. `auth.resetTtlMinutes` keeps its existing
  5–1440-minute wizard validator (`setupWizardValidation.ts:57-58`); no second
  validator is introduced. Today the session TTL exists in **two** places:
  `auth.sessionTtlDays` (`settingsService.ts`, default 14) and
  `security.session.ttlDays` (`securitySettings.ts`, default 7), reconciled at
  session-create time by `resolveSessionTtlDaysFromSources` (defined in
  `core/services/auth/sessionService.ts:114`; called from the `createSession`
  resolution at `:182`). The wizard side already writes **only**
  `auth.sessionTtlDays` (`setupWizardValidation.ts:88`) under a 1-365 bound
  (`:53-55`), so `auth.sessionTtlDays` is already the single canonical value the
  wizard emits — this leaf **confirms and preserves** that (guarding it across
  the 04-L01/05-L02 refactors), makes the resolver precedence explicit and
  documented, and surfaces the effective TTL in the Security step read-only so
  operators understand which wins. It must NOT introduce a second 1-365
  validator.
- **Owning module(s) to extend:**
  - `core/services/auth/sessionService.ts` — confirm/centralise
    `resolveSessionTtlDaysFromSources` precedence (document the order; do not
    silently change behaviour without a test).
  - The wizard Security/Advanced step (07-L01) — write `auth.sessionTtlDays`
    (the single canonical session-TTL key) and `auth.resetTtlMinutes` (the
    re-homed reset-token TTL), both via bulk `PATCH /settings`; show
    `security.session.ttlDays` as an advisory override with the resolved
    effective session TTL. Do NOT write `security.session.ttlDays` from the
    wizard.
  - `setupWizardValidation.ts` / step validators — **already satisfies the
    single-canonical-write goal on the wizard side** and must be CONFIRMED, not
    duplicated. As of this worktree's HEAD it already: (a) enforces the 1-365 day
    bound on the wizard input at `setupWizardValidation.ts:53-55`
    (`sessionTtlDays < 1 || sessionTtlDays > 365`, mirroring
    `normalizeBoundedInteger(value, 1, 365)` in `settingsService.ts`), and (b)
    emits **only** `auth.sessionTtlDays` in `toSetupWizardSettingsPayload`
    (`setupWizardValidation.ts:88`) — there is NO write of
    `security.session.ttlDays` anywhere under `core/admin/ui/setup/` (verified:
    grep returns nothing). So the wizard already cannot write two conflicting
    values. **Sequential-handoff note:** this file is also written by 04-L01
    (refactor) and 05-L02 (extend, incl. the exported `toBasicSettingsPayload`);
    this leaf lands after both per the parent's land order. The implementer must
    therefore **confirm/preserve** the existing single-key write + 1-365 check
    (re-verifying it survived the 04-L01/05-L02 refactors) and NOT add a second,
    redundant 1-365 TTL validator — no restructuring of the earlier leaves' code
    (single writer per file, strictly sequential).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/SETTINGS.md`.
- **Out-of-scope:** changing session storage/cookie logic; broadening the TTL
  range.

## Security Contract

- **Endpoint visibility:** internal — writes via existing `PATCH /settings`
  (`auth.sessionTtlDays`) and `PATCH /settings/security`
  (`security.session.ttlDays`, if exposed). No new endpoint.
- **Auth model:** authenticated admin (Phase 2).
- **RBAC permission(s):** `settings:write` (inherited).
- **CSRF on internal writes:** required (existing settings PATCH writes).
- **Rate-limit bucket:** `admin_write` (inherited).
- **Validation schema-owner module:** value bounds owned by
  `settingsService.ts` (`auth.sessionTtlDays` 1-365) and `securitySettings.ts`
  (`session.ttlDays`). The wizard reuses them; it must not introduce a third
  bound.
- **Anti-abuse:** N/A.
- **Secret/PII handling:** none (numeric TTL). The effective-TTL display is
  derived, not a secret.

## Implementation Pseudocode

```ts
// sessionService.ts — the resolver already exists (:114) and its precedence is
// already pinned by tests/unit/auth/sessionService.test.ts:54. Current, verified
// behaviour to document (do NOT silently change it):
export function resolveSessionTtlDaysFromSources(input: {
  inputTtlDays?: number;            // per-create override (highest precedence)
  authSettingTtlDays?: unknown;     // auth.sessionTtlDays (canonical operator value)
  securitySettingTtlDays?: unknown; // security.session.ttlDays (legacy/policy source)
}): number {
  // Actual order: explicit per-create override > auth.sessionTtlDays
  //   > security.session.ttlDays > DEFAULT_SESSION_TTL_DAYS (7).
  // Each source passes through toBoundedInteger(value, 1, 365) (:107):
  //   non-numeric / non-finite / non-positive => null => fall through to the
  //   next source; positive values clamp into [1, 365] (e.g. 400 -> 365).
  // (NOT a plain `??` chain — 0 falls through, and out-of-range clamps.)
}

// Wizard Security step:
//  - editable field: auth.sessionTtlDays (writes PATCH /settings)
//  - read-only advisory: "Effective TTL: N days" = resolveSessionTtlDaysFromSources(current sources)
```

- **Data flow:** wizard writes `auth.sessionTtlDays` → `createSession` resolves
  the effective TTL via the documented precedence → cookie maxAge.
- **Error handling:** out-of-range TTL ⇒ `settings_value_invalid` (existing,
  400).
- **Regression-test shape:** the current precedence is **already pinned** in the
  Bun lane — `tests/unit/auth/sessionService.test.ts:54`
  ("resolveSessionTtlDaysFromSources applies precedence and clamping") covers
  override > auth > security > `DEFAULT_SESSION_TTL_DAYS` (7) with clamping.
  Do not author a duplicate precedence pin; the new tests assert the
  wizard-side behavior: the wizard writes exactly one **session**-TTL key
  (`auth.sessionTtlDays`, never `security.session.ttlDays`) — the separate
  `auth.resetTtlMinutes` key is a distinct concern; the effective-TTL selector matches `createSession`'s
  resolution for representative source combinations. Note the actual resolver
  semantics (`toBoundedInteger` in `sessionService.ts:107`): non-numeric /
  non-finite / non-positive values **fall through** to the next source (not a
  plain `??` chain), and positive values are clamped into 1–365 (e.g. 400 →
  365).

## Testing Requirements

- **Existing pin (do not duplicate):** `tests/unit/auth/sessionService.test.ts:54`
  already locks the resolver precedence + clamping matrix in the Bun lane
  (override > auth > security > default, with 1–365 clamping). Extend **that**
  file only if the resolver behaviour itself changes. Caution when extending
  it: its `afterAll` cleanup (lines 34–48) **deletes** the shared settings rows
  `auth.sessionTtlDays` and `security.settings` on the shared remote test DB —
  new cases must not broaden that destructive teardown; prefer self-restoring
  handling (capture prior values and restore them, rather than delete-only).
- **Lane:** Vitest ui lane —
  `tests/vitest/ui/sessionTtlReconciliation.test.ts` (next to the existing
  `tests/vitest/ui/setupWizardValidation.test.ts`; keep this suite in the `ui`
  lane rather than under `tests/vitest/setup/` — that setup-service folder is
  created by 01-L01 and populated by 02-L01/04-L01 and WILL exist by the time
  this leaf lands, but it is the home for first-run *service* suites, whereas
  this leaf covers wizard-side validation. Note `tests/vitest/setup/` is a
  distinct path from the unrelated harness dir `tests/setup`), scoped to the
  **wizard-side** behavior: the wizard emits exactly one canonical
  **session**-TTL key (`auth.sessionTtlDays`, never `security.session.ttlDays`);
  it also writes the re-homed `auth.resetTtlMinutes` (5–1440 bound); the
  effective-TTL selector shown in the Security
  step matches the resolver's output for representative source combinations;
  bound enforcement at the wizard validator.
- Any refactor of `resolveSessionTtlDaysFromSources` happens only under the
  existing Bun pin above, so the duplicate is reconciled without a silent
  policy change.
- No migration artifacts.
