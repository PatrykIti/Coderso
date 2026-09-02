# TASK-105-08-02: Settings UI
# FileName: TASK-105-08-02-settings.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** 🚧 In Progress
**Implementation Complete:** 2026-08-22 (`5c6fcec7`)
**Closure Pending:** Family rebaseline and a changelog entry that explicitly includes this leaf.

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

1. All 27 files reach `100%` lines, except the documented genuinely-unreachable
   residuals listed below.
2. Error and dirty-state branches are behavior-asserted, not skipped.

## Documented Genuinely-Unreachable Residuals

Verified by the orchestrator with source evidence and an empirical happy-dom probe.
No `/* istanbul ignore */` is used anywhere (owner rule); these lines are reported
honestly and stay uncovered. Every residual is a defensive validation branch whose
precondition is already blocked by the UI (`disabled` button) or a render path with
no user-editable control for the compared field. The disabled-button suppression of
React `onClick` was probed empirically: both native `.click()` and
`dispatchEvent(new MouseEvent("click"))` on a `disabled` button leave the handler at
0 invocations in the happy-dom test runtime.

| File:Line | Code | Evidence |
|---|---|---|
| `core/admin/ui/settings/ApiKeyDialog.tsx:73-74,77-78` | empty-name and empty-scopes `setLocalError` branches in `handleSubmit` | The Create button is `disabled={!canSubmit}` where `canSubmit = name.trim().length > 0 && selectedCount > 0 && !isSubmitting`; a disabled button never fires `onClick`, so `handleSubmit` can never run with an empty name or empty scopes. The existing "enforces a scope selection" test asserts the disabled behavior. |
| `core/admin/ui/settings/AssistantSettingsPage.tsx:171-172` | `setReindexError("Enable assistant in saved settings before running reindex.")` | The reindex button is `reindexDisabled={busy \|\| !persistedValues.assistantEnabled}`; when the saved settings have `assistantEnabled: false` the button is disabled, so `handleReindex` never reaches the guard. |
| `core/admin/ui/settings/AssistantSettingsPage.tsx:237` | `return previous` when provider/model mismatches `requestModel` | The metadata effect is keyed by `provider:model` (`modelMetadataRequestKey`) and sets `active = false` on cleanup, so any change that would make `current` differ from `requestModel` re-keys the effect and cancels the in-flight fetch before the `setFormState` callback runs. `previous.source === values` always holds in practice, making `current === requestModel`. |
| `core/admin/ui/settings/DesignTokensEditor.tsx:53` | `setLocalDraft(draft)` in `applyDraft` catch | The Apply button is `disabled={Boolean(error)}` and `error` is set to `"Invalid JSON"` whenever `JSON.parse(draft)` throws; `applyDraft` can therefore never be invoked with unparseable draft content. |
| `core/admin/ui/settings/EmailSettingsPage.tsx:306,310,353,355` | `invalid_port` and `password_required` throws plus their `setError` mappings | The Save button is `disabled={busy \|\| hasValidationErrors}` with `hasValidationErrors = portInvalid \|\| passwordInvalid`; invalid ports and missing passwords already disable the button (asserted by the "keeps Save disabled" tests), so `handleSave` never reaches the throw/catch path. |
| `core/admin/ui/settings/SecuritySettingsPage.tsx:72` | `parseScore` `_invalid` throw | `saveDisabled = busy \|\| hasValidationErrors` includes `scoreInvalid`, and `performSave` also guards `if (busy \|\| hasValidationErrors) return false` before `parseScore` is reached at payload construction. |
| `core/admin/ui/settings/SecuritySettingsPage.tsx:426,475,478` | `risks.push("Request ID header policy" / "Strict validation" / "Plugin safe mode")` | `requestIdEnabled`, `requestIdHeaderName`, `validationRejectUnknownFields` and `pluginSafeMode` have NO rendered controls in the page JSX (they only exist in types, defaults, normalization and the payload). With no user path to change them, `hasChanged(before, after, ...)` is always false. |
| `core/admin/ui/settings/StorageSettingsPage.tsx:354,531` | `max_size_invalid` throw plus its `setError` mapping | The Save button is `disabled={busy \|\| hasValidationErrors}` with `hasValidationErrors = maxSizeInvalid`; an invalid max size disables the button, so `handleSave` never reaches the throw/catch path. |

These 18 lines are the complete residual set after L02 implementation; every other
line in the 27 files is covered by behavior-asserted tests. The residual set was
cross-checked against the final coverage lane: exactly 18 uncovered lines across the
6 files above.
