# TASK-482-07-L02: Session-TTL reconciliation (single canonical source + precedence)
# FileName: TASK-482-07-L02-Session-TTL-Reconciliation.md

**Parent Subtask:** TASK-482-07
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-07-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Resolve the duplicate session-TTL configuration so the wizard cannot
  write two conflicting values. Today the TTL exists in **two** places:
  `auth.sessionTtlDays` (`settingsService.ts`, default 14) and
  `security.session.ttlDays` (`securitySettings.ts`, default 7), reconciled at
  session-create time by `resolveSessionTtlDaysFromSources` in
  `core/services/auth/sessionService.ts` (lines 179-186). This leaf makes
  `auth.sessionTtlDays` the **single canonical value the wizard writes**, makes
  the precedence explicit and documented, and surfaces the effective TTL in the
  Security step read-only so operators understand which wins.
- **Owning module(s) to extend:**
  - `core/services/auth/sessionService.ts` — confirm/centralise
    `resolveSessionTtlDaysFromSources` precedence (document the order; do not
    silently change behaviour without a test).
  - The wizard Security/Advanced step (07-L01) — write only
    `auth.sessionTtlDays`; show `security.session.ttlDays` as an advisory
    override with the resolved effective value.
  - `setupWizardValidation.ts` / step validators — keep the existing 1-365 day
    bound (`normalizeBoundedInteger(value, 1, 365)` in `settingsService.ts`).
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
// sessionService.ts — make the precedence explicit + documented (verify current behaviour first).
export function resolveSessionTtlDaysFromSources(input: {
  inputTtlDays?: number;            // per-create override (highest precedence)
  authSettingTtlDays: number;       // auth.sessionTtlDays (canonical operator value)
  securitySettingTtlDays: number;   // security.session.ttlDays (policy clamp)
}): number {
  // Documented order (confirm against existing impl; add tests before any change):
  //   explicit per-create override > auth.sessionTtlDays > security.session.ttlDays
  // Optionally clamp the canonical value to the security policy max if that is the
  // intended security semantics — encode whichever the current impl uses and TEST it.
  return input.inputTtlDays ?? input.authSettingTtlDays ?? input.securitySettingTtlDays;
}

// Wizard Security step:
//  - editable field: auth.sessionTtlDays (writes PATCH /settings)
//  - read-only advisory: "Effective TTL: N days" = resolveSessionTtlDaysFromSources(current sources)
```

- **Data flow:** wizard writes `auth.sessionTtlDays` → `createSession` resolves
  the effective TTL via the documented precedence → cookie maxAge.
- **Error handling:** out-of-range TTL ⇒ `settings_value_invalid` (existing,
  400).
- **Regression-test shape:** lock the current precedence with a unit test
  (override > auth > security); the wizard writes exactly one TTL key; the
  effective-TTL selector matches `createSession`'s resolution for representative
  source combinations.

## Testing Requirements

- **Lane:** Vitest service lane —
  `tests/vitest/setup/sessionTtlReconciliation.test.ts`. Cases: precedence
  matrix (override/auth/security present/absent); bound enforcement; the wizard
  emits a single canonical TTL key.
- Pin behaviour with a test **before** any refactor of
  `resolveSessionTtlDaysFromSources` so the duplicate is reconciled without a
  silent policy change.
- No migration artifacts.
