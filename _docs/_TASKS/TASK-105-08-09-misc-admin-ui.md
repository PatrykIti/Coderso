# TASK-105-08-09: Misc Admin UI Clusters
# FileName: TASK-105-08-09-misc-admin-ui.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08-11 (splits `users-roles-page-wave.test.tsx` before this leaf extends it)  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in every remaining `core/admin/ui/**` cluster not owned by another
leaf: auth, backups, setup, users, seo, popups, redirects, site, security, roles,
reviews, store, import-export, contexts, analytics, authoring, layouts, navigation,
preview, plugins, and shared. Test-only: no API surface, no production change.

## Scope

Uncovered-line budget: **988** across 85 files (current covered/total + line%).

- `auth/**` (7 files, 111): `InfoBanner.tsx` 0/1, `LoginPage.tsx` 10/43,
  `OtpInput.tsx` 6/12, `ResetPasswordPage.tsx` 9/37, `SetPasswordPage.tsx` 20/47,
  `TwoFactorPage.tsx` 8/21, `recaptcha.ts` 37/40.
- `backups/**` (5 files, 104): `BackupImportDialog.tsx` 7/20, `BackupNowDialog.tsx` 25/27,
  `BackupScheduleCard.tsx` 16/25, `BackupsPage.tsx` 183/254, `BackupsTable.tsx` 39/48.
- `setup/**` (17 files, 92): `InstallerWizard.tsx` 40/46, `SetupWizard.tsx` 48/54,
  `assistantSiteBuilderIntakeBrowserState.ts` 77/80, `assistantSiteBuilderIntakeUiState.ts`
  58/73, `installerValidation.ts` 16/17, `setupWizardValidation.ts` 52/53,
  `steps/IdentityStep.tsx` 1/2, `steps/LocaleStep.tsx` 3/4, `steps/StarterContentStep.tsx`
  12/32, `steps/TimezoneStep.tsx` 3/4, `steps/UrlsStep.tsx` 3/5,
  `steps/advanced/AdvancedStepShell.tsx` 4/5, `steps/advanced/AssistantStep.tsx` 16/19,
  `steps/advanced/EmailStep.tsx` 18/25, `steps/advanced/SecurityStep.tsx` 13/17,
  `steps/advanced/StorageStep.tsx` 21/39, `steps/advanced/advancedStepUtils.ts` 30/32.
- `users/**` (4 files, 68): `InviteUserDialog.tsx` 30/32, `UserEditor.tsx` 28/29,
  `UserList.tsx` 21/22, `UsersRolesPage.tsx` 312/376.
- `seo/**` (4 files, 56): `SeoAuditDialog.tsx` 11/12, `SeoDrawer.tsx` 20/32,
  `SeoManagerPage.tsx` 118/159, `SeoPerformancePanel.tsx` 13/15.
- `popups/**` (6 files, 68): `PopupCardGrid.tsx` 15/28, `PopupEditorPage.tsx` 64/80,
  `PopupsListPage.tsx` 27/39, `popupEditorModel.ts` 23/27, `components/PopupEditorForm.tsx`
  15/33, `hooks/usePopups.ts` 27/32.
- `redirects/**` (3 files, 76): `RedirectDrawer.tsx` 7/14, `RedirectsPage.tsx` 117/181,
  `RedirectsTable.tsx` 10/15.
- `site/**` (3 files, 83): `SiteSettingsPage.tsx` 137/208, `SiteShellCard.tsx` 34/37,
  `siteSettingsValidation.ts` 76/85.
- `security/**` (3 files, 43): `AccessLogDetailsDrawer.tsx` 3/5, `AccessLogsPage.tsx`
  227/267, `AccessLogsTable.tsx` 9/10.
- `roles/**` (2 files, 42): `PermissionsMatrixPage.tsx` 202/237, `RoleEditor.tsx` 67/74.
- `reviews/**` (2 files, 24): `ReviewsModerationPage.tsx` 30/47, `hooks/useReviews.ts` 25/32.
- `store/**` (3 files, 37): `PluginStorePage.tsx` 25/53, `StoreDetail.tsx` 11/17,
  `StoreList.tsx` 9/12.
- `import-export/**` (3 files, 36): `ExportCards.tsx` 23/27, `ImportDropzone.tsx` 88/117,
  `ImportExportPage.tsx` 20/23.
- `contexts/**` (2 files, 13): `AdminAuthContext.tsx` 17/18, `AdminRouterContext.tsx` 51/63.
- `analytics/**` (2 files, 6): `AnalyticsPage.tsx` 75/79, `TopPagesDrawer.tsx` 26/28.
- `authoring/**` (2 files, 6): `AuthoringCommandPalette.tsx` 8/10, `InlineEditWrapper.tsx` 15/19.
- `layouts/**` (1 file, 20): `AdminShell.tsx` 90/110.
- `preview/**` (1 file, 13): `RuntimePreviewDialog.tsx` 97/110.
- `plugins/**` (1 file, 1): `PluginList.tsx` 8/9.
- `shared/**` (14 files, 89): `AdminBreadcrumbs.tsx` 49/53, `AdminColorModeToggle.tsx` 34/37,
  `AdminDirtyNavigationGuard.tsx` 38/39, `AdminLink.tsx` 12/27, `AdminThemeSwitcher.tsx`
  15/47, `Charts.tsx` 34/35, `ClearableFields.tsx` 64/68, `ConfirmActionDialog.tsx` 46/50,
  `EditorRail.tsx` 5/6, `ExportDialog.tsx` 33/51, `SharedColorControl.tsx` 42/43,
  `TopBar.tsx` 27/28, `useCanvasSiteTokens.ts` 37/40, `useListPagination.ts` 26/27.

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 85 source files above and of its test files under
  `tests/vitest/ui/*`, `tests/vitest/authUi/*`, `tests/vitest/backups/*`,
  `tests/vitest/setup/*`, `tests/vitest/seo/*`, `tests/vitest/popups/*`,
  `tests/vitest/storeUi/*`, and `tests/vitest/analytics/*`. The `tests/vitest/site/*`
  claim covers only `siteShell.test.tsx`; the `menu-document-css-*.test.ts` suites
  there belong to TASK-105-08-05 (menus), never this leaf.
- Existing suites it may extend (owned by this leaf): `auth-shell.test.tsx`,
  `admin-auth-identity.test.tsx`, `backups.test.tsx`,
  `backups-page-wave.test.tsx`, `analytics.test.tsx` (single owner: this leaf;
  `analytics-settings-entries-seo-leafs.test.tsx` is owned by TASK-105-08-02),
  `admin-shell*.test.tsx`, `admin-link*.test.tsx`, `admin-breadcrumbs.test.tsx`,
  `admin-router-context*.test.tsx`, `access-logs*.test.tsx`, and the
  users/roles suite — `users-roles-page-wave.test.tsx` (1132) is split by TASK-105-08-11
  FIRST; this leaf extends the split pieces.
- New suites per component. No other leaf may edit these test files.

## Pseudocode

Mock seams: each page calls its admin client (`authClient`, `backupsClient`,
`adminUsersClient`/`adminRolesClient`, `seoClient`, `popupsClient`, `redirectsClient`,
`siteSettingsClient`, `importExportClient`, `adminThemeClient`, etc.); contexts call the
router/auth stores. Pure helpers (`recaptcha.ts`, `installerValidation.ts`,
`setupWizardValidation.ts`, `advancedStepUtils.ts`, `siteSettingsValidation.ts`,
`popupEditorModel.ts`, `useListPagination.ts`) get direct table-driven unit tests.

```tsx
const login = vi.fn();
vi.mock("@/services/authClient", () => ({ login /* ... */ }));

function renderSubject() { return render(<LoginPage />); }
```

Assertion shape per component:

1. Auth pages (`LoginPage`, `ResetPasswordPage`, `SetPasswordPage`, `TwoFactorPage`,
   `OtpInput`): every submit/error/loading/two-factor branch, asserting visible effect and
   the client payload. `recaptcha.ts` gets a table-driven unit test over its script-load
   and token branches.
2. `BackupsPage` (71), `SiteSettingsPage` (71), `RedirectsPage` (64),
   `UsersRolesPage` (64), `SeoManagerPage` (41), `AccessLogsPage` (40),
   `PermissionsMatrixPage` (35): full interaction suites for list/create/edit/delete,
   validation errors, and confirmation flows.
3. Setup wizard + steps: every step's next/back/validate/error branch, the installer
   status gating, and `StarterContentStep` preview/apply.
4. `shared/**`: `AdminThemeSwitcher` (32), `ExportDialog` (18), `AdminLink` (15) plus the
   near-100% shared controls; assert each branch and visible effect.
5. `AdminShell` (20), `RuntimePreviewDialog` (13), contexts, store, popups, roles,
   reviews, analytics, authoring, layouts, preview, plugins: focused suites for the
   remaining uncovered branches.

Work order (worst first): `BackupsPage` (71), `SiteSettingsPage` (71), `RedirectsPage`
(64), `UsersRolesPage` (64), `SeoManagerPage` (41), `AccessLogsPage` (40),
`PermissionsMatrixPage` (35), `LoginPage` (33), `ResetPasswordPage` (28),
`SetPasswordPage` (27), `SiteSettingsPage` validation (9), then each remaining cluster
by gap.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/backups-page-wave.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`users-roles-page-wave.test.tsx` (1132) is split by TASK-105-08-11 before this leaf
extends it. Any new suite crossing 1000 lines splits by responsibility with a shared
fixture module.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 85 files reach `100%` lines.
2. Every auth/validation error branch is behavior-asserted, not skipped.
