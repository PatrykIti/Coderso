# TASK-100-05: First-Run Setup Wizard and Gating
# FileName: TASK-100-05_First_Run_Setup_Wizard_and_Gating.md

**Priority:** High  
**Category:** Admin/UI + Core/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-100-01, TASK-100-04, TASK-004-07  
**Status:** Done (2026-02-09)

---

## Overview

Po pierwszym logowaniu admin ma przejsc przez krotki wizard konfiguracji runtime.
Wizard ustawia minimalny zestaw bezpiecznych i krytycznych parametrow, a potem
blokuje sie przez `setup.completed=true`.

---

## Wizard Scope

W kroku setup zbieramy:
- `site.name`
- `site.locale`
- `site.publicBaseUrl` (lub alias input `site.baseUrl`)
- `auth.sessionTtlDays`
- `auth.resetTtlMinutes`
- finalnie `setup.completed=true`

---

## UI State Machine

```txt
BOOT
  -> AUTHENTICATED?
    -> no: render login flow
    -> yes: load settings
      -> setup.completed=false: show setup wizard modal/screen
      -> setup.completed=true: continue normal admin app
```

```txt
WIZARD
  step 1: Site Identity
  step 2: Runtime URL
  step 3: Security TTL
  submit: PATCH /settings (bulk, atomic intent)
  success: local state update + close wizard
  error: keep wizard open + show actionable error
```

---

## Pseudo-Implementation

```tsx
// core/admin/app/AdminApp.tsx
const shouldShowSetupWizard =
  authState === "authenticated" &&
  settingsState.status === "ready" &&
  settingsState.values.setupCompleted === false;

return shouldShowSetupWizard ? (
  <SetupWizard
    initialValues={mapSettingsToWizard(settingsState.values)}
    onSubmit={async (payload) => {
      const updated = await updateSettings({
        ...mapWizardToSettings(payload),
        "setup.completed": true,
      });
      setSettingsState(resolveSettingsPayload(updated));
    }}
  />
) : (
  <AdminRoutes />
);
```

```ts
// core/admin/ui/setup/setupWizardValidation.ts
const wizardSchema = z.object({
  siteName: z.string().min(1).max(120),
  siteLocale: z.string().min(2).max(16),
  publicBaseUrl: z.string().url().nullable(),
  authSessionTtlDays: z.number().int().min(1).max(365),
  authResetTtlMinutes: z.number().int().min(5).max(1440),
});
```

---

## Physical Files

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/setup/SetupWizard.tsx` | new | multi-step wizard container |
| `core/admin/ui/setup/setupWizardValidation.ts` | new | local validation helpers |
| `core/admin/app/AdminApp.tsx` | update | setup gate + submit flow |
| `core/admin/ui/layouts/SettingsShell.tsx` | optional update | wizard full-screen compatibility |
| `tests/unit/admin/adminApp.test.tsx` | update | gate behavior |
| `tests/integration/ui/setup-wizard.test.tsx` | new | wizard render/submit/error states |

---

## Security and Reliability Notes

- Wizard tylko po auth; brak public access.
- Zapisy przez jeden bulk request, aby uniknac partial state.
- Przy niepowodzeniu zapisu `setup.completed` nie moze zostac ustawione.
- Po sukcesie logujemy audit event `settings.setup.complete`.

---

## Acceptance Criteria

- Pierwsze wejscie admina pokazuje wizard gdy `setup.completed=false`.
- Po poprawnym submit wizard znika i nie wraca.
- Po reloadzie stan bierze sie z DB (nie z localStorage).
- Walidacja blokuje submit dla blednych URL/TTL.

---

## Testing Requirements

- Unit:
  - AdminApp gate matrix (auth/settings/setup combinations)
  - wizard validation for URL and TTL
- Integration:
  - render wizard for incomplete setup
  - successful submit sets completed and closes wizard
  - backend validation error keeps wizard open

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (first-run flow as implemented)
- `_docs/CMS_SPEC.md` (setup lifecycle)
- `_docs/CMS_API.md` (bulk settings payload for setup)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-100-05-first-run-setup-wizard.md`
