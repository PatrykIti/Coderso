# TASK-105-08-02: Settings UI
# FileName: TASK-105-08-02-settings.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/ui/settings/**` (27 files). These are admin React
pages, cards, drawers, and two hooks. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **552** across 27 files (current covered/total + line%):

| File | Covered/Total | Line% |
|---|---|---:|
| `AdminAccessCard.tsx` | 3/4 | 75.0% |
| `ApiKeyDialog.tsx` | 16/39 | 41.0% |
| `ApiKeysPage.tsx` | 64/99 | 64.6% |
| `AssistantSettingsCard.tsx` | 5/22 | 22.7% |
| `AssistantSettingsPage.tsx` | 63/124 | 50.8% |
| `BaseUrlCard.tsx` | 6/10 | 60.0% |
| `BrandingCard.tsx` | 11/12 | 91.7% |
| `DesignTokensEditor.tsx` | 11/23 | 47.8% |
| `EmailLogsDrawer.tsx` | 4/5 | 80.0% |
| `EmailSettingsPage.tsx` | 130/160 | 81.3% |
| `GeneralSettingsPage.tsx` | 33/38 | 86.8% |
| `IntegrationDrawer.tsx` | 62/67 | 92.5% |
| `IntegrationRequestDialog.tsx` | 15/21 | 71.4% |
| `IntegrationsPage.tsx` | 77/87 | 88.5% |
| `IpAllowlistDrawer.tsx` | 14/33 | 42.4% |
| `LoginAlertsPage.tsx` | 46/61 | 75.4% |
| `SecuritySettingsPage.tsx` | 139/214 | 65.0% |
| `SessionsPage.tsx` | 89/109 | 81.7% |
| `SettingsDirtyNavigation.tsx` | 36/37 | 97.3% |
| `SettingsPage.tsx` | 14/37 | 37.8% |
| `SettingsSidebar.tsx` | 21/25 | 84.0% |
| `StorageSettingsPage.tsx` | 65/127 | 51.2% |
| `WebhookDrawer.tsx` | 42/64 | 65.6% |
| `WebhooksPage.tsx` | 47/94 | 50.0% |
| `WebhooksTable.tsx` | 9/10 | 90.0% |
| `useIpAllowlist.ts` | 14/43 | 32.6% |
| `useSettingsAutoSave.ts` | 40/63 | 63.5% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 27 source files above and of its settings
  suites under `tests/vitest/ui/*`. Ownership is by NAMED suite, not directory
  glob: another leaf owns every non-settings UI suite.
- Existing suites it may extend (owned by this leaf): `api-keys.test.tsx`,
  `assistant-settings.test.tsx`, `analytics-settings-entries-seo-leafs.test.tsx`,
  and the NAMED settings-cluster suites (`security-settings*`, `storage-settings*`,
  `email-settings*`, `general-settings*`, `webhooks*`, `sessions*`, `login-alerts*`,
  `settings-*`, `use-settings-auto-save`), EXCEPT the site cluster owned by
  TASK-105-08-09 (`site-settings.test.tsx`, `site-settings-validation.test.ts`,
  `site-shell-settings-card.test.tsx`) and EXCEPT the page-editor settings suites
  owned by TASK-105-08-08 (`page-editor-settings-flow.test.tsx`,
  `page-editor-v2-flow-settings.test.tsx`, `page-editor-v2-settings-flow.test.tsx`).
  A bare `*settings*` glob is NOT used: it would sweep leaf 08's page-editor suites.
- New suites are named per component (`security-settings-page.test.tsx`,
  `storage-settings-page.test.tsx`, `webhooks-page.test.tsx`,
  `use-ip-allowlist.test.ts`, `use-settings-auto-save.test.ts`, etc.).
  No other leaf may edit these test files.

## Pseudocode

These are admin React components; every suite that calls `render()` must declare
`// @vitest-environment happy-dom` as its first line (the lane default is `node`,
see `vitest.config.ts`). Mock seams: settings pages call settings clients
(`@/services/siteSettingsClient`, `@/services/settingsCache`,
`@/services/backupsClient`, `@/services/seoClient`, `@/services/integrationsClient`,
`@/services/authClient`) and cache hooks (`@/utils/cacheBus`,
`@/utils/storageCache`). Mock the client module, not `fetch`. The pure hooks
(`useSettingsAutoSave`, `useIpAllowlist`) get direct table-driven tests.

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const getSettings = vi.fn(); const saveSettings = vi.fn();
vi.mock("@/services/siteSettingsClient", () => ({ getSiteSettings: getSettings, saveSiteSettings: saveSettings }));
// repeat per client family the component touches

function renderSubject(props = {}) {
  return render(<SecuritySettingsPage {...props} />);
}
```

Assertion shape per component:

1. Loading → resolved → error states: `getSettings` pending renders a loading
   skeleton; resolved renders the values; rejection renders the inline error and does
   NOT crash.
2. Interactions: each control (toggle, select, input, save button) dispatches the
   expected client call with the normalized payload; success clears the dirty flag;
   failure keeps the dirty state and shows the toast/banner.
3. Dirty-state guard: `SettingsDirtyNavigation`, `useSettingsAutoSave` behavior
   (debounce, flush-on-unmount, revert-on-conflict) is exercised through the hook's
   public surface, including the conflict branch.
4. `useIpAllowlist`: table-driven — add/remove/validate entries, CIDR/format reject,
   duplicate reject, submit payload shape.
5. Accessible visible effect: assert computed DOM state (`aria-expanded`,
   `aria-checked`, disabled buttons) rather than only asserting a mock was called.

Work order (worst first): `SecuritySettingsPage` (75), `StorageSettingsPage` (62),
`AssistantSettingsPage` (61), `WebhooksPage` (47), `ApiKeysPage` (35),
`useSettingsAutoSave` (23), `ApiKeyDialog` (23), `SettingsPage` (23),
`useIpAllowlist` (29), then the near-100% files.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/security-settings-page.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

Split any suite that would cross 1000 lines by cohesive responsibility
(e.g. `security-settings-page.basics.test.tsx`,
`security-settings-page.advanced.test.tsx`) with a shared fixture module; keep every
part independently runnable.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 27 files reach `100%` lines.
2. Error and dirty-state branches are behavior-asserted, not skipped.
