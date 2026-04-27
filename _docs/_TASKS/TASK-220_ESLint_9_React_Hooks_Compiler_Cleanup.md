# TASK-220: ESLint 9 React Hooks Compiler Cleanup
# FileName: TASK-220_ESLint_9_React_Hooks_Compiler_Cleanup.md

**Priority:** High
**Category:** Tooling + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-219
**Status:** To Do

---

## Overview

Finish the source cleanup required by the full `eslint-plugin-react-hooks` recommended preset enabled during the ESLint 9 upgrade. The new baseline keeps file scope broad through the existing core lint script:

```bash
bun --cwd core lint
```

Current state after enabling the full preset on 2026-04-27: the command reports 113 errors. Most findings are React Hooks/Compiler rules such as:

- `react-hooks/set-state-in-effect`
- `react-hooks/preserve-manual-memoization`
- `react-hooks/refs`

This task is intentionally separate from `TASK-219`: dependency CVEs are already remediated and scanners are clean, while this task owns the broader React hook and memoization cleanup surfaced by the stricter lint policy.

Root cause summary from the 2026-04-27 lint audit:

- This is not a Vite 8 runtime behavior change. The stricter failures come from `eslint-plugin-react-hooks@7.1.1`, whose `recommended` preset now includes React Hooks Compiler rules.
- `bun run lint` fans out through `bun --cwd core lint`, `bun --cwd core lint:types`, and repo typechecks; the current failure is isolated to `bun --cwd core lint`.
- `bun --cwd core lint:types` and `bun run lint:repo` passed during the audit, so the first cleanup wave should focus on source-level React lint findings rather than TypeScript contract drift.
- The findings are not direct public security vulnerabilities. They are resilience and correctness risks: extra mount renders, request amplification, cache hydration flicker, dirty-state overwrite risk, stale ref reads, and manual memoization that React Compiler cannot prove safe.

Current error distribution:

| Rule | Count | Primary concern |
|------|-------|-----------------|
| `react-hooks/set-state-in-effect` | 107 | Effects are being used to synchronously repair local state, trigger loaders that synchronously set loading/error state, hydrate cache into state after first render, or trim selection after render. |
| `react-hooks/preserve-manual-memoization` | 4 | Manual `useMemo` dependencies do not match the exact values read by the callback, so React Compiler skips optimization. |
| `react-hooks/refs` | 2 | Render-time derivation reads `ref.current`, which is not reactive and can be stale under compiler assumptions. |

Remediation policy:

- Keep the full React Hooks recommended preset enabled.
- Do not blanket-disable React Hooks Compiler rules.
- Do not "fix" findings by deferring every state update through timers or microtasks.
- Prefer state initialization from stable snapshots, render-time derived values, reducers, event handlers, subscription callbacks, and async promise resolution after the first await/network/cache boundary.
- Preserve the admin cache contract from `_docs/ADMIN_CACHE.md`: cache hit renders immediately, cache miss foreground loads, cache-present mounts revalidate in the background, and dirty editor state is not overwritten by background events.
- Split implementation by dependency shape so shared hooks and cache helpers land before list/editor pages that consume them.

## Finding Inventory

Baseline source: `/tmp/nextless-eslint-report.json` generated from `bun --cwd core lint --format json --output-file /tmp/nextless-eslint-report.json "{admin,server,services,ui,db,plugins,store}/**/*.{ts,tsx}"` on 2026-04-27. Re-run TASK-220-01-01 if the dependency graph or source files change before implementation starts.

| Owner leaf | File | Line | Rule | Current trigger | Fix direction |
|------------|------|------|------|-----------------|---------------|
| TASK-220-02-01 | core/admin/app/AdminApp.tsx | 711 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setAuthState("checking");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-01 | core/admin/app/AdminApp.tsx | 727 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshSettings();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-01 | core/admin/ui/shared/AdminThemeSwitcher.tsx | 60 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refreshProfiles();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-01 | core/admin/ui/themes/ThemeEditorPage.tsx | 92 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setProfileId(resolveProfileId(window.location.pathname));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-01 | core/admin/ui/themes/ThemeEditorPage.tsx | 130 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadProfile(profileId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/audit/AuditList.tsx | 162 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/backups/BackupsPage.tsx | 55 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/dashboard/DashboardPage.tsx | 54 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/kits/hooks/useSolutionKitRuns.ts | 70 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRuns(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/kits/hooks/useSolutionKitRuns.ts | 98 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRunDetail(selectedRunId).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/redirects/RedirectsPage.tsx | 57 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh()` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/roles/PermissionsMatrixPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/security/AccessLogsPage.tsx | 167 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/ApiKeysPage.tsx | 61 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/EmailSettingsPage.tsx | 108 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadSettings();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/IntegrationsPage.tsx | 115 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/LoginAlertsPage.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/SecuritySettingsPage.tsx | 436 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/SessionsPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/StorageSettingsPage.tsx | 379 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/useIpAllowlist.ts | 40 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/settings/WebhooksPage.tsx | 84 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-02 | core/admin/ui/setup/SetupWizard.tsx | 57 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(resolveInitialValues(initialValues));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-03 | core/admin/ui/analytics/AnalyticsPage.tsx | 64 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-02-03 | core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| TASK-220-02-03 | core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| TASK-220-02-03 | core/admin/ui/analytics/AnalyticsPage.tsx | 67 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const metrics = useMemo((): KpiCard[] => {` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| TASK-220-03-01 | core/admin/ui/commerce/hooks/useCommerceCatalog.ts | 107 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshProducts(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/custom-screens/hooks/useCustomScreens.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/forms/hooks/useForms.ts | 55 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveFormsListMountRefreshOptions(hasInitialCache)).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/kits/hooks/useSolutionKits.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/listings/hooks/useListingQueries.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/listings/hooks/useListingTemplates.ts | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/popups/hooks/usePopups.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/reviews/hooks/useReviews.ts | 39 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-01 | core/admin/ui/widgets/hooks/useWidgetTemplates.ts | 40 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/commerce/CommerceListPage.tsx | 155 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/content-types/ContentTypeList.tsx | 211 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/custom-screens/CustomScreenListPage.tsx | 108 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshContentTypes(` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/custom-screens/CustomScreenListPage.tsx | 173 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/entries/EntryList.tsx | 215 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshEntries({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/entries/EntryList.tsx | 222 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshTypes({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/entries/EntryList.tsx | 320 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedRefs((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/forms/FormListPage.tsx | 131 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/listings/ListingListPage.tsx | 151 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedQueryIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/listings/ListingListPage.tsx | 158 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedTemplateIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/menus/MenuListPage.tsx | 509 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(mountOptions).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/menus/MenuListPage.tsx | 571 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/pages/PageListPage.tsx | 127 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(mountOptions).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/pages/PageListPage.tsx | 185 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/posts/PostsListPage.tsx | 142 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true, background: hasInitialCache }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/posts/PostsListPage.tsx | 216 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((prev) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-02 | core/admin/ui/widgets/WidgetLibraryPage.tsx | 585 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedIds((previous) => {` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-03 | core/admin/ui/custom-screens/CustomScreenEditorPage.tsx | 337 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(false);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-03 | core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx | 314 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setScreen(cachedScreen);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-03 | core/admin/ui/forms/FormBuilderPage.tsx | 326 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyDetail(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-03 | core/admin/ui/listings/ListingEditorPage.tsx | 216 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshQuery(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-03-03 | core/admin/ui/popups/PopupEditorPage.tsx | 78 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading(false);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/content-types/ContentTypeCreateDrawer.tsx | 53 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlug(name ? slugify(name) : "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/content-types/ContentTypeCreateDrawer.tsx | 59 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setName("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/entries/EntryCreateDrawer.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlug(title ? slugify(title) : "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/entries/EntryCreateDrawer.tsx | 69 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTitle("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/entries/EntryCreateDrawer.tsx | 79 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTypeSlug(defaultTypeSlug);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-01 | core/admin/ui/widgets/WidgetCreateDialog.tsx | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategory(categories[0].name);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/forms/FormRuntimePreviewDialog.tsx | 111 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setValues(buildInitialValues(fields));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/forms/FormRuntimePreviewDialog.tsx | 137 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCurrentStep(maxStep);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/listings/ListingFiltersPage.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedListingQueryId(items[0]!.id);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/listings/ListingTemplateManager.tsx | 110 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSaveError(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/media/MediaDetailsDrawer.tsx | 94 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTitle(item?.title ?? (item ? resolveMediaDisplayName(item) : ""));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/media/MediaPicker.tsx | 111 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached.map(toMediaItem));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/widgets/WidgetInsertDialog.tsx | 134 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTargetId(options[0]?.id ?? "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/widgets/WidgetInsertDialog.tsx | 139 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setBlocks([]);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/widgets/WidgetInsertDialog.tsx | 192 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlotId("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-02 | core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx | 41 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setNewName("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/seo/SeoManagerPage.tsx | 119 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/settings/AssistantSettingsPage.tsx | 91 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(normalizeValues(values));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/settings/GeneralSettingsPage.tsx | 56 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(normalizeValues(values));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/settings/SettingsPage.tsx | 54 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTokenOverrides(tokens);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/settings/SettingsPage.tsx | 58 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(values);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/site/SiteSettingsPage.tsx | 194 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setStatus("loading");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/site/SiteSettingsPage.tsx | 224 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm((prev) => ({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/themes/ThemesPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/users/UsersRolesPage.tsx | 119 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPendingSelectUserId(userId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/users/UsersRolesPage.tsx | 153 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/users/UsersRolesPage.tsx | 175 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedUserId(pendingSelectUserId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-04-03 | core/admin/ui/users/UsersRolesPage.tsx | 189 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedRoleId(pendingSelectRoleId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-01 | core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 424 | react-hooks/refs (render-time ref.current access) | `const metadataDirty = metadataSignature !== baseMetadataSignatureRef.current;` | Move render-time ref read into reactive state/saved snapshot; keep refs only for async freshness. |
| TASK-220-05-01 | core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 479 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true, setLoading: !initialCachedPost }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-01 | core/admin/ui/posts/editor/hooks/usePostEditorState.ts | 546 | react-hooks/refs (render-time ref.current access) | `payload: buildAutosavePayload(),` | Move render-time ref read into reactive state/saved snapshot; keep refs only for async freshness. |
| TASK-220-05-01 | core/admin/ui/posts/editor/PostBlockEditorShell.tsx | 275 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategoryOptions([]);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-01 | core/admin/ui/posts/editor/PostClassicEditorShell.tsx | 209 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyPost(cached);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-02 | core/admin/ui/pages/PageEditor.tsx | 484 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPendingScrollBlockId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-02 | core/admin/ui/pages/PageEditor.tsx | 517 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPageId(resolved);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-02 | core/admin/ui/pages/PageEditor.tsx | 525 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyPage(cachedDetail, { preserveSelection: true });` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-02 | core/admin/ui/pages/PageEditor.tsx | 559 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadTemplateOptions();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-02 | core/admin/ui/pages/PageEditor.tsx | 591 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshRevisions().catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/content-types/ContentTypeEditor.tsx | 153 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyContentType(cachedType);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/content-types/ContentTypeEditor.tsx | 191 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((type) => ({ slug: type.slug, name: type.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/content-types/ContentTypeEditor.tsx | 207 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedFieldId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx | 301 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh(true).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx | 307 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((item) => ({ slug: item.slug, name: item.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/entries/EntryEditor.tsx | 279 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `applyEntry(cachedEntry, cachedContentType);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/entries/EntryEditor.tsx | 305 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setRelationTargets(cached.map((item) => ({ slug: item.slug, name: item.name })));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-05-03 | core/admin/ui/entries/EntryEditor.tsx | 655 | react-hooks/preserve-manual-memoization (manual memo dependencies cannot be preserved) | `const checklist = useMemo(` | Remove cheap memoization or depend on exact scalar values read by the memo callback. |
| TASK-220-05-03 | core/admin/ui/entries/EntryEditor.tsx | 718 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `if (!hasActive) setActiveTab(tabGroups[0].id);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-01 | core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 588 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadTemplate();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-01 | core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 624 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshCategories({ force: true, background: true }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-01 | core/admin/ui/widgets/WidgetTemplateEditorPage.tsx | 636 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategory(templateCategories[0].name);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-02 | core/admin/ui/commerce/CommerceEditorPage.tsx | 109 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoading((current) => current && !isCreateMode);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-02 | core/admin/ui/forms/FormActionLogsPage.tsx | 72 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh().catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-02 | core/admin/ui/menus/MenuEditorPage.tsx | 479 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setOriginalMenu(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-03 | core/admin/ui/widgets/editors/HeroEditors.tsx | 751 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPresetsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| TASK-220-06-03 | core/admin/ui/widgets/editors/NavigationEditors.tsx | 239 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoadingMenus(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] TASK-220-01: Baseline, Rule Policy, and Contributor Guardrails
- [ ] TASK-220-02: Admin Bootstrap and Read-Only Loader Effects
- [ ] TASK-220-03: Cache Hydration Hooks and List Mount Refresh
- [ ] TASK-220-04: Form, Drawer, Dialog, and Derived Field State
- [ ] TASK-220-05: Editor Dirty-State, Refs, and Autosave Safety
- [ ] TASK-220-06: Widget, Commerce, Listings, and Resource-Specific Loaders
- [ ] TASK-220-07: Validation, Docs, and Closure

## Files to Change

Source files with current ESLint 9 / React Hooks Compiler findings:

- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/analytics/AnalyticsPage.tsx`
- `core/admin/ui/audit/AuditList.tsx`
- `core/admin/ui/backups/BackupsPage.tsx`
- `core/admin/ui/commerce/CommerceEditorPage.tsx`
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/custom-screens/hooks/useCustomScreens.ts`
- `core/admin/ui/dashboard/DashboardPage.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/forms/FormActionLogsPage.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`
- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`
- `core/admin/ui/kits/hooks/useSolutionKits.ts`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/ListingFiltersPage.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuListPage.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/popups/PopupEditorPage.tsx`
- `core/admin/ui/popups/hooks/usePopups.ts`
- `core/admin/ui/posts/PostsListPage.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/redirects/RedirectsPage.tsx`
- `core/admin/ui/reviews/hooks/useReviews.ts`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/seo/SeoManagerPage.tsx`
- `core/admin/ui/settings/ApiKeysPage.tsx`
- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/EmailSettingsPage.tsx`
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
- `core/admin/ui/settings/IntegrationsPage.tsx`
- `core/admin/ui/settings/LoginAlertsPage.tsx`
- `core/admin/ui/settings/SecuritySettingsPage.tsx`
- `core/admin/ui/settings/SessionsPage.tsx`
- `core/admin/ui/settings/SettingsPage.tsx`
- `core/admin/ui/settings/StorageSettingsPage.tsx`
- `core/admin/ui/settings/WebhooksPage.tsx`
- `core/admin/ui/settings/useIpAllowlist.ts`
- `core/admin/ui/setup/SetupWizard.tsx`
- `core/admin/ui/shared/AdminThemeSwitcher.tsx`
- `core/admin/ui/site/SiteSettingsPage.tsx`
- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/themes/ThemesPage.tsx`
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/ui/widgets/WidgetCreateDialog.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/hooks/useWidgetTemplates.ts`

Supporting files expected during implementation and closure:

- `tests/vitest/**` for focused UI/admin coverage where behavior changes.
- `AGENTS.md` for contributor guardrails around React Hooks Compiler rules.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics or ownership change.
- `_docs/_TASKS/README.md` and changelog on completion.


## Security Contract

- Visibility: local and CI lint/tooling quality gate.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not disable the new React Hooks/Compiler recommended rules to make lint pass,
  - do not replace behavior with production fallbacks only to satisfy lint,
  - preserve admin cache hydration, background refresh, dirty-state, and route behavior while refactoring effects.
- Secret handling: no secrets or privileged settings may be moved into browser-visible caches or debug output.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- Focused Vitest suites for touched admin/UI surfaces. Each implementation leaf
  must record the exact focused suite command it ran in `TASK-220-07-01`, mapped
  to the changed source files before the leaf is considered complete.
- `bun run test:vitest` after any shared-hook, shared-cache, editor, or
  cross-resource admin change. If a focused suite fails for a pre-existing
  reason, record the exact failing test and a narrower substitute only after the
  failure is isolated.
- `bun run test:bun` before final closure, because broad admin changes can
  still regress route/client contracts indirectly even when the primary logic is
  Vitest-owned.
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. `bun --cwd core lint` passes with the full `eslint-plugin-react-hooks` recommended preset enabled.
2. No new rule disable is added without a narrow code comment explaining an unavoidable React contract exception.
3. Admin/UI behavior affected by effect and memoization refactors has focused test coverage.
4. Existing typecheck and relevant Vitest lanes pass.
