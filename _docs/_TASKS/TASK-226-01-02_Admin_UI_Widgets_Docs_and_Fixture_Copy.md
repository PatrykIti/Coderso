# TASK-226-01-02: Admin UI, Widgets, Docs, and Fixture Copy
# FileName: TASK-226-01-02_Admin_UI_Widgets_Docs_and_Fixture_Copy.md

**Priority:** High
**Category:** Branding + Admin/UI + Widgets + Tests
**Estimated Effort:** Large
**Dependencies:** TASK-226-01-01
**Status:** Done - 2026-04-28

---

## Overview

Replace user-facing `Nextless` copy across admin auth/setup/settings/pages,
default widgets, assistant copy, public docs, and fixture assertions. This leaf
does not move the Advanced module routes; that belongs to `TASK-226-02`.

## Sub-Tasks

- [x] Rename visible auth/admin brand copy to Coderso.
- [x] Rename setup wizard and settings fallback names to Coderso.
- [x] Update starter page/widget copy to Coderso-aligned language.
- [x] Rename assistant product copy from Nextless Assistant to Coderso
  Assistant.
- [x] Update docs and test fixtures that assert the renamed copy.
- [x] Leave historical changelog references untouched only if
  `TASK-226-03-02` records them as historical artifacts.

## Files to Change

| File | Current line(s) | Required change |
|------|-----------------|-----------------|
| `README.md` | 1 | Rename repo title to Coderso and add tagline. |
| `docs/README.md` | 1 | Rename assistant docs index. |
| `docs/getting-started/admin-orientation.md` | 16, 18, 25, 32, 41, 45, 49 | Rename product copy and defer group wording to Advanced. |
| `core/admin/index.html` | 6 | Browser title becomes `Coderso Admin`. |
| `core/admin/ui/auth/AuthBrandPanel.tsx` | 15, 43 | Default title/footer become Coderso. |
| `core/admin/ui/auth/LoginPage.tsx` | 97 | Login visible brand becomes Coderso. |
| `core/admin/ui/auth/ResetPasswordPage.tsx` | 90, 112 | Reset visible copy becomes Coderso. |
| `core/admin/ui/auth/SetPasswordPage.tsx` | 91, 98 | Set-password visible copy becomes Coderso. |
| `core/admin/ui/setup/setupWizardValidation.ts` | 10 | Default site name becomes Coderso. |
| `core/admin/ui/setup/SetupWizard.tsx` | 158 | Placeholder becomes Coderso. |
| `core/admin/ui/settings/BrandingCard.tsx` | 43 | Branding card default becomes Coderso. |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | 28 | General settings default becomes Coderso. |
| `core/admin/ui/settings/IntegrationRequestDialog.tsx` | 63 | Integration request copy uses Coderso. |
| `core/services/integrations/registry.ts` | 70, 179 | Integration copy and placeholder use Coderso. |
| `core/admin/ui/pages/PageEditor.tsx` | 74 | Starter hero copy becomes Coderso-aligned. |
| `core/admin/ui/pages/CanvasFrame.tsx` | 23 | Canvas placeholder becomes Coderso-aligned. |
| `core/admin/ui/pages/InspectorPanel.tsx` | 38 | Inspector default becomes Coderso-aligned. |
| `core/widgets/core/hero.tsx` | 199 | Hero widget default becomes Coderso-aligned. |
| `core/widgets/core/navigation.tsx` | 211 | Default logo text becomes Coderso. |
| `core/widgets/core/footer.tsx` | 167 | Default copyright becomes Coderso. |
| `core/services/assistant/assistantService.ts` | 48 | Assistant system prompt uses Coderso. |
| `core/services/assistant/operationPolicy/providerGuidance.ts` | 331 | Provider guidance uses Coderso. |
| `tests/vitest/widgets/renderer.test.tsx` | 210 | Update expected starter hero copy. |
| `tests/vitest/widgets/footer.test.tsx` | 106 | Update expected copyright. |
| `tests/vitest/widgets/navigation.test.tsx` | 31, 92 | Update expected logo/alt copy. |
| `tests/unit/integrations/integrationsService.test.ts` | 78, 91 | Update assistant integration copy. |

## Security Contract

- Visibility: admin UI, generated public widget defaults, assistant prompt copy,
  and docs.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: no route writes introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - assistant copy changes must not widen assistant execution permissions,
  - widget defaults must not include secrets or privileged URLs,
  - docs examples must not expose real credentials.

## Pseudocode

```ts
const DEFAULT_PRODUCT_NAME = "Coderso";
const DEFAULT_HERO_HEADLINE = "Build your system with Coderso";

const defaultNavigationSettings = {
  logo: { type: "text", value: DEFAULT_PRODUCT_NAME, href: "/", source: "external" },
};
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx`
- `bun test tests/unit/integrations/integrationsService.test.ts`
- `bun run test:vitest -- tests/vitest/ui/setupWizardValidation.test.ts tests/vitest/ui-integration/settings.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Residual scan for visible product copy:
  - `rg -n "Nextless|Nextless CMS|Nextless Assistant" core docs README.md tests --glob '!node_modules/**'`

## Documentation Updates Required

- `README.md`
- `docs/README.md`
- `docs/getting-started/admin-orientation.md`
- `_docs/CMS_API.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. New user-visible product copy says Coderso.
2. Starter widget/page defaults use Coderso-aligned copy.
3. Assistant wording still stays typed, explainable, and permission-bound.
4. Fixture updates match real new defaults rather than masking old copy.
