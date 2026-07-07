# TASK-482-08-L01: Finalize multi-track `completeSetup` + install-lock
# FileName: TASK-482-08-L01-Finalize-And-Install-Lock.md

**Parent Subtask:** TASK-482-08
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** TASK-482-04-L02, TASK-482-05-L02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Make "Finish setup" persist any not-yet-saved Basic values **and**
  set `setup.completed = true` in one bulk write, so the post-login wizard
  permanently closes. Keep the existing exported `shouldShowSetupWizard` gate
  in `core/admin/app/AdminApp.tsx` (symbol anchor; currently lines 237-246 @
  HEAD fbe93dae) as the client lock — it already hides the wizard when
  `setupCompleted` is true (`!input.setupCompleted`).
- **Owning module(s) to extend:** `core/admin/app/AdminApp.tsx` —
  `completeSetup` (symbol anchor; currently lines 524-548 @ HEAD fbe93dae —
  prefer the symbol, raw line numbers have drifted before). Today it calls
  `updateSettings({ ...toSetupWizardSettingsPayload(values), "setup.completed": true })`.
  Replace the fixed 5-field `toSetupWizardSettingsPayload` with
  **`toBasicSettingsPayload(values)` imported from
  `core/admin/ui/setup/setupWizardValidation.ts`** — that map is **owned and
  exported by 05-L02** (single source of the wizard-values → settings-keys
  mapping; do NOT redefine it here), then keep the `"setup.completed": true`
  flag. The Advanced/starter-content writes already persisted per-step
  (05/06/07) are not re-sent. **Auth-TTL note:** the pre-redesign builder
  `toSetupWizardSettingsPayload` also persisted `auth.sessionTtlDays` and
  `auth.resetTtlMinutes`; `toBasicSettingsPayload` intentionally omits both
  because 07-L02 re-homes BOTH auth-TTL keys to the Advanced Security step
  (07-L01), written per-step via bulk `PATCH /settings`. This is a deliberate
  ownership move, not a dropped capability — finalize must NOT re-add the
  `auth.*` keys.
- **Type-widening ownership (04 → 08 window):** THIS leaf widens
  `completeSetup`'s parameter from `SetupWizardValues`
  (`setupWizardValidation.ts:1`) to the 04-L01 `WizardValues`. In the window
  after 04-L02 lands and before this leaf, `onSubmit={completeSetup}` keeps
  typechecking because `WizardValues` is a structural **superset** of
  `SetupWizardValues` (04-L01 defines it that way); no other leaf touches
  `completeSetup`.
- **Sequential-handoff note (multi-writer file):** `AdminApp.tsx` was last
  edited by 03-L02 (gate ordering) and optionally 04-L02 (call site); this
  leaf lands after both per the parent's land order and edits only the
  `completeSetup` callback — do not restructure the gate/redirect code from
  03-L02.
- **Source-of-truth docs:** `_docs/CMS_SPEC.md`, `_docs/SETTINGS.md`,
  `_docs/AUTH_SPEC.md`.
- **Out-of-scope:** the self-disable server assertions (08-L02); per-step writes
  (05/06/07).

## Security Contract

- **Endpoint visibility:** internal — finalize is a bulk `PATCH /settings`
  (existing, RBAC + CSRF guarded).
- **Auth model:** authenticated admin (Phase 2).
- **RBAC permission(s):** `settings:write`.
- **CSRF on internal writes:** required (existing settings client attaches the
  token).
- **Rate-limit bucket:** `admin_write`.
- **Validation schema-owner module:** `settingsService.ts` normalizers own each
  key; `setup.completed` is normalized via `normalizeBooleanValue`
  (line 377-378). The wizard must not invent a new completion flag.
- **Anti-abuse:** N/A.
- **Secret/PII handling:** none (the finalize payload is identity/site settings;
  Advanced secrets were written write-only in 07).

## Implementation Pseudocode

```ts
const completeSetup = useCallback(async (values: WizardValues) => {
  setSetupSaving(true); setSetupError(null);
  try {
    const updated = await updateSettings({
      // imported from core/admin/ui/setup/setupWizardValidation.ts — owned by 05-L02
      ...toBasicSettingsPayload(values),
      "setup.completed": true,           // the install-lock flag
    });
    setSettingsState((prev) => ({ ...prev, status: "ready", error: null,
      ...resolveSettingsPayload(updated, prev) }));
  } catch (error) {
    setSetupError(isApiClientError(error) ? error.message : "Failed to complete setup.");
    throw error;
  } finally { setSetupSaving(false); }
}, []);
```

- **Data flow:** Finish → bulk PATCH (basic values + `setup.completed:true`) →
  `settingsState.values.setupCompleted = true` → `shouldShowSetupWizard` returns
  false → wizard unmounts permanently.
- **Error handling:** a failed finalize keeps the wizard open with the error
  banner (setup is not marked complete).
- **Regression-test shape:** finishing issues a single PATCH including
  `setup.completed:true` and the basic keys; after the state updates,
  `shouldShowSetupWizard(...)` is false and the wizard no longer renders.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/setupFinalize.test.tsx` (mock settings client).
  Cases: finalize payload includes `setup.completed:true`; wizard disappears
  after success; failure keeps it open + shows error.
- Keep/port the existing `shouldShowSetupWizard` unit test.
- No migration artifacts.
