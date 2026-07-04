# TASK-482-08-L01: Finalize multi-track `completeSetup` + install-lock
# FileName: TASK-482-08-L01-Finalize-And-Install-Lock.md

**Parent Subtask:** TASK-482-08
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** TASK-482-04-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Make "Finish setup" persist any not-yet-saved Basic values **and**
  set `setup.completed = true` in one bulk write, so the post-login wizard
  permanently closes. Keep the existing `shouldShowSetupWizard` gate
  (`AdminApp.tsx` lines 234-243) as the client lock — it already hides the wizard
  when `setupCompleted` is true.
- **Owning module(s) to extend:** `core/admin/app/AdminApp.tsx` —
  `completeSetup` (lines 509-533). Today it calls
  `updateSettings({ ...toSetupWizardSettingsPayload(values), "setup.completed": true })`.
  Generalise the payload builder to cover the full multi-track value set
  (identity/branding/locale/timezone/URLs) instead of the fixed 5-field
  `toSetupWizardSettingsPayload`, then keep the `"setup.completed": true` flag.
  The Advanced/starter-content writes already persisted per-step (05/06/07) are
  not re-sent.
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
      ...toBasicSettingsPayload(values), // generalised superset of toSetupWizardSettingsPayload
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
