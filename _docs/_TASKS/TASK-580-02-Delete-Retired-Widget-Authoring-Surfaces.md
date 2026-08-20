# TASK-580-02: Delete Retired Widget Authoring Surfaces
# FileName: TASK-580-02-Delete-Retired-Widget-Authoring-Surfaces.md

**Parent Task:** TASK-580
**Priority:** High
**Category:** Legacy Removal / Admin / API
**Estimated Effort:** Large
**Dependencies:** TASK-580-01
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20
**Changelog pin:** 1323 (family-level; this task does NOT create its own changelog entry — closure subtask owns it)

---

## Overview

- **Goal:** Remove the retired v1 page-widget *authoring* surfaces — the Widget
  Library admin page and catalog API, the widget-template authoring stack, the
  `modulePackMatrix` pack gate, and the assistant's widget-template/widget-patch
  execution paths — while keeping the v1 render kernel alive for entry detail
  pages until TASK-580-03 migrates them and TASK-580-04 deletes the kernel.
- **Owning modules:** `core/admin/ui/widgets/*`, `core/services/widgets/*`,
  `core/server/routes/widgetRoutes.ts`, `core/widgets/modulePackMatrix.ts`,
  `core/services/assistant/*`, `core/services/settings/userSettingsService.ts`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/WIDGETS.md` (retained
  read-compatibility note), `_docs/CMS_SPEC.md`, `_docs/ADMIN_CACHE.md` +
  `_docs/ADMIN_CACHE_MAP.md`, `_docs/CODERSO_PLUGIN_CONTRACT.md` (only if a
  plugin contract is touched — see Sub-Task 4).
- **Out of scope (must NOT be touched here):** the v1 render kernel
  (`core/widgets/{types,registry,validator,runtime,runtimeScripts,slots,renderContext,editorContract,renderers/*}`,
  `core/site/pageRuntime.tsx`, `renderPublicPageHtml`/`renderPublicPageRuntimeHtml`
  v1 branches, `hydrateRuntimeBlocks`, the 4 preview route files, `editors/*`,
  `core/admin/ui/pages/builder/*`, `DetailTemplateEditorPage.tsx` and its model,
  `FormDesignPanel.tsx`), and the widget-template *read* path
  (`getWidgetTemplate` + `templateSectionRuntime` + `widget_templates` table).
  All of these survive 580-02 and are removed in 580-03/580-04.

### Verified corrections to the stream brief (authoritative for this contract)

These were verified against source at HEAD `3c470092` and correct the brief's
over-inclusive delete list. Implementers treat this section as binding.

1. **`core/admin/ui/widgets/registry.ts` is a SPLIT, not a whole-file delete.**
   `blockUtils.ts:14` (`getRegisteredWidget`) and `builder/widgetRegistry.ts:1`
   (`listRegisteredPageWidgets`) import it and both survive for the detail-template
   editor. Only the library-specific/dead accessors are removed.
2. **`WidgetEditorOutlet.tsx` + `widgetCategoryMeta.ts` survive 580-02.** They are
   imported by `pages/builder/{AdvancedPanel,VisualPanel,WizardPanel}.tsx` and
   `pages/builder/WidgetPicker.tsx`, which the detail-template editor uses.
3. **Widget-template DB tables and the read path survive 580-02.** Stored
   `detail_page_documents` can contain `template-section` blocks that resolve via
   `publicSiteRenderContext.ts:392-395` → `templateSectionRuntime.ts` →
   `getWidgetTemplate` at render time. Only the *authoring* path (assistant
   actions, `templateInstaller`, category/revision services, create/update/list/
   delete) is removed. Tables are dropped in 580-04, not here.
4. **Test removal is NARROW.** R1/R4's ~135-file list was scoped for the full v1
   removal. Only tests of *deleted authoring surfaces* are removed here; kernel,
   editor, builder-panel, and preview-route tests stay (580-04 removes them).

---

## Security Contract

- **Endpoint visibility:** `internal` (admin API only). `GET /widgets` (catalog)
  and the assistant's widget-template action paths are removed; the 4 preview
  routes remain `internal`.
- **Auth model:** session (admin). Unchanged.
- **RBAC:** unchanged. Removing `GET /widgets` removes the `widgets:read` gate on
  that route; the surviving preview routes and assistant routes keep their
  existing `requirePermission` wrappers. The `/advanced/widgets` admin route entry
  and its `widgets:read` permission disappear together.
- **CSRF:** unchanged; admin writes still flow through the existing CSRF path.
- **Rate-limit bucket:** `admin` (unchanged). No new buckets.
- **Validation:** no new schemas. Removed surfaces delete their schemas
  (`assistantActionSchemas.ts` widget-template variant, action-plan widget-template
  types). Any surviving route keeps strict reject-unknown validation.
- **Anti-abuse:** n/a (no public write surface added or modified).
- **Secret handling:** no secrets enter client cache or logs. Removing
  `widgetsClient.ts` deletes the `widgetCatalog:list` browser cache key; verify no
  secret-bearing payload was cached by it (it was a public catalog, safe).
- **Fail-closed requirement:** removing `GET /widgets` must NOT leave a fallback
  that serves the catalog under a different path or permission. The assistant must
  have no residual `widgetTemplateService` write surface after this task.

---

## Sub-Tasks

Land order is the order below. Each is execution-ready. After each, run the
per-contract validation commands before the next lands.

### 1. Widget Library admin surface + admin route graph

**Delete (11 files):**
`core/admin/ui/widgets/{WidgetLibraryPage.tsx, WidgetLibraryTable.tsx,
WidgetLibraryRowActions.tsx, WidgetCatalogFilters.tsx, WidgetDetailsDrawer.tsx,
WidgetInsertDialog.tsx, WidgetCard.tsx, widgetLibraryUtils.ts,
widgetInsertUtils.ts, previewStateSupport.ts, types.ts}`.

**Split `core/admin/ui/widgets/registry.ts`:** delete `listRegisteredWidgetLibraryWidgets`
(only consumer `WidgetLibraryPage.tsx:230`), plus the zero-consumer
`listRegisteredWidgets`, `listRegisteredScreenWidgets`, `listRegisteredWidgetsForSurface`.
KEEP `lazyNamedEditor`, `lazyEditorFactoryIndex`, `reloadWidgetEditorLoader`,
`editorLoaders`, `ensureCoreWidgetsRegistered`, `listRegisteredPageWidgets`,
`getRegisteredWidget` (consumed by surviving `pages/builder/{blockUtils.ts:14,
widgetRegistry.ts:1}` and `WidgetEditorOutlet.tsx:13`).

**Keep (survive to 580-04):** `WidgetEditorOutlet.tsx`, `widgetCategoryMeta.ts`,
`editors/*`.

**Route graph removal:**
- `core/admin/app/adminRouteComponents.tsx:265-268` — remove `WidgetLibraryRoute`.
- `core/admin/app/adminRoutes.tsx:381-383` — remove the `/advanced/widgets` entry.
- `core/admin/utils/adminPaths.ts:67` — remove `{ from: "/widgets", to: "/advanced/widgets" }`.
- `core/admin/utils/adminPrefetch.ts:43,304-306` — remove `listWidgetCatalogCached`
  import and the `/advanced/widgets` prefetch entry.
- `core/admin/ui/shared/AdminBreadcrumbs.tsx:51-52` — remove `Widgets:` and
  `Library:` entries.

**Implementation Pseudocode:**

```ts
// registry.ts after the split — only the surviving editor-registration shim:
export function ensureCoreWidgetsRegistered() { registerCoreWidgets(editorLoaders); }
export function listRegisteredPageWidgets() {
  ensureCoreWidgetsRegistered();
  return listWidgetsForSurface("page-builder");
}
export function getRegisteredWidget(type: string) {
  ensureCoreWidgetsRegistered();
  return getWidget(type);
}
// DELETE listRegisteredWidgetLibraryWidgets / listRegisteredWidgets /
// listRegisteredScreenWidgets / listRegisteredWidgetsForSurface.
```

**Data flow:** no data path; the Widget Library page was read-only over the catalog
client (deleted in Sub-Task 2). The surviving registry shim continues to register
editors into `core/widgets/registry` so the detail-template editor still resolves
editor components.

**Error handling:** after deleting the page, no `WidgetLibraryPage` import may
remain; `grep -an "WidgetLibraryPage\|/advanced/widgets" core/` must return only
the (now orphaned) `adminPaths` alias check being removed.

**Regression-test shape:** route registration test asserts `/advanced/widgets` is
gone and `adminPaths` resolves `/widgets` to no alias; breadcrumb snapshot no
longer contains `Widgets`/`Library`; no lazy-route chunk references
`WidgetLibraryPage`.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`,
`bun test tests/unit/admin/adminRoutes.test.ts*` (or the owning route-registration
suite), plus the admin-boundary/bundle checks listed in Testing Requirements.

### 2. Widget catalog backend + API + browser cache + assistant catalog group

**Delete:** `core/services/widgets/widgetCatalogService.ts`,
`core/admin/services/widgetsClient.ts`.

**Rewire `core/server/routes/widgetRoutes.ts` → `widgetPreviewRoutes.ts`:**
rename `registerWidgetRoutes` → `registerWidgetPreviewRoutes`; delete the
`router.get("/widgets", requirePermission("widgets:read"), ...)` handler and the
`listWidgetCatalog` import; keep the 4 preview registrations. Update
`core/server/routes/index.ts:35` (import) and `:175` (call). Grep for any other
`registerWidgetRoutes` reference (tests included) and update.

**Remove browser cache:** `core/admin/services/cachePolicy.ts:94`
(`widgetCatalogList: "widgetCatalog:list"`), and confirm no `widgetCatalog:list`
cacheBus broadcaster remains (`grep -an "widgetCatalog" core/` → only docs).

**Rewire `core/services/assistant/adminContextCatalogs.ts`:**
remove `listWidgetCatalog` dep (`:30`), `"widgets"` from `CatalogGroup` (`:51`),
the `widgets` destructure (`:108`), `safeLoadGroup("widgets", ...)` (`:126`), the
`widgets` snapshot field (`:153`), `import("../widgets/widgetCatalogService")`
(`:199`), and `listWidgetCatalog: widgetCatalogService.listWidgetCatalog`
(`:261`).

**Implementation Pseudocode:**

```ts
// widgetPreviewRoutes.ts — orchestration-only, no catalog:
export function registerWidgetPreviewRoutes(router: Router, deps: WidgetRouteDeps) {
  const { requirePermission, validate } = deps;
  registerEntryTeaserPreviewRoutes(router, { requirePermission, validate });
  registerProductComparePreviewRoutes(router, { requirePermission, validate });
  registerProductGalleryPreviewRoutes(router, { requirePermission, validate });
  registerProductTablePreviewRoutes(router, { requirePermission, validate });
}
```

**Data flow:** the assistant resource catalog no longer exposes a `widgets` group;
`buildAssistantResourceCatalogSnapshotWithDefaultDeps` stops importing the catalog
service and stops calling `safeLoadGroup("widgets", ...)`.

**Error handling:** fail-closed — a client requesting `/widgets` now gets the
existing 404 route boundary; no permissive fallback is registered.

**Regression-test shape:** admin API test asserts `GET /widgets` 404s (or the route
is unregistered) and `widgets:read` is no longer consumed there; assistant catalog
snapshot test asserts the `widgets` group is absent from the normalized snapshot;
preview-route tests still pass via the renamed registrar.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`, admin API route
tests + assistant catalog tests (see Testing Requirements).

### 3. Widget-template authoring stack (services + kit installer) — keep read path

**Shrink `core/services/widgets/widgetTemplateService.ts` to read-only:**
KEEP `mapWidgetTemplateRow`, `getWidgetTemplate`, and their imports
(`normalizeWidgetTemplateBlocksForRead` from `widgetTemplateBlockContract`,
`normalizeWidgetTemplateSettings` from `widgetTemplateSettings`, `widgetTemplates`
table). DELETE `listWidgetTemplates`, `createWidgetTemplate`, `updateWidgetTemplate`,
`duplicateWidgetTemplate`, `deleteWidgetTemplate`, `assertTemplateNameAvailable`,
`resolveDuplicateTemplateName`, `resolveCategory`, and authoring-only input types
(`WidgetTemplateCreateInput`, `WidgetTemplateUpdateInput`, etc.) after their
assistant/kit consumers are removed.

**Shrink `core/services/widgets/widgetTemplateBlockContract.ts`:**
KEEP `normalizeWidgetTemplateBlocksForRead`; DELETE `normalizeWidgetTemplateBlocksForWrite`
and the `ensureRuntimeWidgetsRegistered`/`normalizeWidgetBlocks` imports (write-only).

**Keep (runtime read path, delete in 580-04):** `templateSectionRuntime.ts`,
`widgetTemplateSettings.ts`, DB tables `widget_templates` + `widget_template_revisions`
(no DB migration here).

**Delete:** `core/services/widgets/widgetTemplateRevisionService.ts` (write-only:
`createWidgetTemplateRevisionTx`, `listWidgetTemplateRevisions` (:49), and
`restoreWidgetTemplateRevision` (:128); only consumer is authoring — deletion still
safe) and `core/services/widgets/widgetTemplateCategoryService.ts` (authoring-only:
`listWidgetTemplateCategories`, `createWidgetTemplateCategory`,
`updateWidgetTemplateCategory`, `deleteWidgetTemplateCategory`; consumers are
`templateInstaller` + `widgetTemplateService.resolveCategory` — deletion safe).

**Delete `core/services/templates/templateInstaller.ts`** (installs legacy widget
templates) and rewire its consumers:
- `core/services/kits/kitInstaller.ts:20-28,85-92` — remove
  `TemplateInstallResult/TemplateInstallRollbackAction/TemplateInstallSnapshot`
  imports and the widget-template install step/`WidgetBlock` casts.
- `core/services/kits/kitTemplateSeeds.ts:1-8,22-60` — remove
  `buildTemplateSeedsForKit` / `templateSeedFromPage` / `templateSeedFromBlueprint`
  and the `TemplateInstallSeed`/`WidgetBlock`/`WidgetTemplateSettings` imports, OR
  rewire to the Page Templates surface if 580-01 provided the replacement type.

**DB tables:** `core/db/tables/widgets.ts` — KEEP `widgetTemplates` +
`widgetTemplateRevisions` + `listingTemplates` + `listingQueries` (the read path and
listings need them). Do NOT split the file for table removal; only update the file
header comment if the authoring service split changes nothing structural.

**Implementation Pseudocode:**

```ts
// widgetTemplateService.ts — retained read-only surface:
const mapWidgetTemplateRow = (row: typeof widgetTemplates.$inferSelect) => ({
  ...row,
  blocks: normalizeWidgetTemplateBlocksForRead(row.blocks as WidgetBlock[]),
  settings: normalizeWidgetTemplateSettings(row.settings),
});
export async function getWidgetTemplate(id: string) {
  const [row] = await db.select().from(widgetTemplates).where(eq(widgetTemplates.id, id));
  return row ? mapWidgetTemplateRow(row) : null;
}
// listWidgetTemplates / create / update / duplicate / delete are removed.
```

**Data flow:** detail-page render (`hydrateRuntimeBlocks` →
`resolveTemplateSectionRuntimeData` → `getWidgetTemplate`) keeps working; no new
widget templates can be authored or installed; solution-kit installs stop seeding
legacy widget templates.

**Error handling:** `getWidgetTemplate` returns `null` on miss (unchanged
`template_missing` mapping upstream); authoring-only domain errors
(`widget_template_invalid`, `widget_template_name_conflict`,
`widget_template_category_invalid`) are removed with the authoring code.

**Regression-test shape:** `templateSectionRuntime` still resolves a published
template and rejects unpublished/missing/loop cases (existing tests re-run);
`widgetTemplateService` tests shrink to `getWidgetTemplate`; kit-install tests no
longer expect widget-template seeds; assistant no longer lists/creates templates.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`,
`tests/unit/widgets/widgetTemplateService.test.ts` (rewired) + kit-install suites +
the `templateSectionRuntime`/detail-page hydration tests (see Testing Requirements).

### 4. `modulePackMatrix` removal + assistant intake/blueprint rewiring

**Delete:** `core/widgets/modulePackMatrix.ts` and
`tests/unit/widgets/modulePackMatrix.test.ts`.

**Rewire consumers (verify current state after 580-01 lands):**
- `core/services/assistant/assistantSiteBuilderIntakeAdvancedOptions.ts:21` —
  remove `listWidgetPackMatrix` import and the pack-matrix gating; keep
  `navigationVariantIds` (repoint import if 580-01 relocated `navigationContract`).
- `core/services/assistant/assistantSiteBuilderIntakeBasicReview.ts:19` — remove
  `listWidgetPackMatrix` and the pack-derived candidate list; keep V2/section
  candidates.
- `core/services/assistant/blueprints/blueprintPageSectionTypes.ts:8,38` — remove
  `WidgetPackEnforcement` import and the `enforcement` field; keep the `Widget*`
  type imports (v1 kernel types survive).
- `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts:1-8,72-73,
  104-112,120,205,214` — remove `listWidgetPackMatrix`/`ModuleWidgetPackDefinition`
  and the `packs` machinery + `listWidgetsForSurface` import; KEEP `getWidget`,
  `ensureRuntimeWidgetsRegistered`, `normalizeWidgetBlock`, `WidgetBlock` (v1
  detail-page section authoring survives until 580-03).
- `core/widgets/registry.ts` — strip the `modulePackMatrix` import (:4-7), the
  `enforcement: WidgetPackEnforcement` field (:37), `resolvePackStatus` (:407), and
  `listModulePackStatus` (:455) plus its uses at :458/:466. The consumers
  `WidgetLibraryPage.tsx:39` (use at :236) and `widgetCatalogService.ts:7` (use at
  :49) die earlier in this task (Sub-Tasks 1 and 2); delete the
  `listModulePackStatus`/`validateModulePackMatrix` consumers together with them.
  The kernel registry keeps `lazyNamedEditor`, `getRegisteredWidget`, and
  `listRegisteredPageWidgets` (per Sub-Task 1).
- `core/services/assistant/assistantSiteBuilderIntakeTypes.ts:9-11` — if 580-01
  relocated `navigationContract`, rewire the import path; otherwise leave.

**Blueprint ownership (fox reconciliation):** this Sub-Task is the SOLE owner of the
matrix-gating strip in `blueprintPageSectionTypes.ts` (:8,:38) and
`blueprintPageSectionLibrary.ts` (lines listed above). 580-01 does NOT delete these
files; their terminal deletion belongs to 580-03-L06.
`tests/vitest/assistant/blueprint-page-section-library.test.ts` SURVIVES through
580-02 — rewire it only if these edits break its imports.

**Implementation Pseudocode:**

```ts
// blueprintPageSectionLibrary.ts — after removal, matrix gating is gone:
export function buildBlueprintPageSectionSeed(resolution: ResolvedBlueprintSection) {
  ensureRuntimeWidgetsRegistered();
  const widget = getWidget(resolution.widgetType);
  if (!widget) throw new Error("blueprint_section_widget_unknown");
  return normalizeWidgetBlock({ /* ...v1 detail-page block... */ });
}
// No listWidgetPackMatrix(), no ModuleWidgetPackDefinition, no packs[].
```

**Data flow:** intake/blueprint aliases are derived from the V2 section/block
capabilities rather than the pack matrix; detail-page section seeding still emits
v1 `WidgetBlock`s (migrated in 580-03).

**Error handling:** remove `WidgetPackEnforcement` type; any `listWidgetPackMatrix`
call site that still exists after the rewire is a compile error to fix (no fallback).

**Regression-test shape:** intake option tests assert no pack-matrix aliases;
blueprint library tests assert section seeds still produce valid v1 blocks with the
gating removed; `modulePackMatrix.test.ts` removed.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`, assistant
intake/blueprint tests (see Testing Requirements). Note: `_docs/WIDGET_PACK_MATRIX.md`
is a docs tombstone update in Sub-Task 8, not a code change.

### 5. Assistant widget-kit/widget-patch de-wiring

The assistant must stop authoring/executing v1 widget templates and widget patches.
Delete one file and SPLIT another, then rewire the rest by removing every
`"widget-template"` and `widgetTemplateService` reference (grep
`grep -an "widget-template\|widgetTemplate" core/services/assistant core/server/routes/assistantRoutes.ts core/server/validation/assistantActionSchemas.ts`).

**Delete:** `core/services/assistant/pageWidgetPatch.ts`.

**Split `core/services/assistant/actionExecutorWidgetsSiteKit.ts` (NOT a whole-file delete):**
- DELETE the 6 widget-template executors and their widget-template-only imports:
  - executors: `buildWidgetTemplateDeletePreview` (:20),
    `buildWidgetTemplateUpdatePreview` (:103),
    `buildWidgetTemplateBlockPatchPreview` (:151),
    `executeWidgetTemplateDeleteAction` (:271),
    `executeWidgetTemplateUpdateAction` (:307),
    `executeWidgetTemplateBlockPatchAction` (:359).
  - imports: `getWidgetTemplate` (:3), `normalizeWidgetTemplateSettings` (:4),
    the widget-template action types (:5-10), `applyPageWidgetDataPatch` (:16),
    `normalizeAssistantPagePatchBlock` (:18).
- KEEP the 6 site-kit executors: `buildSiteKitRecommendPreview` (:217),
  `buildSiteKitInstallPreview` (:237), `buildSiteKitValidatePreview` (:261),
  `executeSiteKitRecommendAction` (:411), `executeSiteKitInstallAction` (:436),
  `executeSiteKitValidateAction` (:480). They are registered at
  `actionExecutorRegistry.ts:572-598` and must survive.
- Optionally rename the file to `actionExecutorSiteKit.ts`; if renamed, update the
  registry import in `actionExecutorRegistry.ts` accordingly.

**Rewire (remove widget-template/widget-patch surface, keep everything else):**
- `core/services/assistant/actionExecutorScreenOps.ts:15-17,204-206` — remove
  `normalizeAssistantPagePatchBlock` + `ensureRuntimeWidgetsRegistered`/
  `normalizeWidgetBlock`/`WidgetBlock` imports. Keep custom-screen `ScreenBlockV1` ops.
- `core/services/assistant/actionExecutorRegistry.ts:107-119,542-570` — remove the
  `actionExecutorWidgetsSiteKit` import (or re-point it to `actionExecutorSiteKit`
  after the rename) and the 3 `widget-template.*` registrations; KEEP the 6
  site-kit registrations at `:572-598`.
- `core/services/assistant/actionExecutorService.ts:62-66,156-159` and
  `actionExecutorTypes.ts:62-66,117,158-161` — remove the `widgetTemplateService`
  import/deps and narrow `containerType` to `"page"`.
- `core/services/assistant/activeSurfaceHydration.ts:8,17,27,128-141,190-191` —
  remove `getWidgetTemplate`, `normalizeAssistantReferencedWidgetTemplates`, the
  widget-template reference hydration, and the `kind === "widget-template"` branch.
- `core/services/assistant/adminContextCatalogNormalizer.ts:18-19,26-29,44,
  535-568,791,862-910,1026-1033,1089` — remove `AssistantWidgetSummary`/
  `AssistantWidgetSlotSummary`/`normalizeWidget`/`normalizeWidgetSlots`,
  `AssistantReferencedWidgetTemplate*` normalizers, the `widgetTemplateSettings`
  import, and the `widgets` snapshot field.
- `core/server/routes/assistantRoutes.ts:154,161,465-467` — remove the
  `widgetTemplateService` import, the `getWidgetTemplate` dep, and the
  `surfaceKind === "widget-template"` RBAC check.
- `core/server/validation/assistantActionSchemas.ts:631+` — remove the
  widget-template active-surface schema variant.
- `core/services/assistant/actionExecutorCatalogReads.ts:143-150,164` — remove the
  widget-template catalog read (`containerType: "widget-template"`).
- Union/schema/policy files — remove each `"widget-template"` member/branch:
  `actionFamilyContracts.ts:722,738,752,897`, `actionPlanSchema.ts:133`,
  `actionPlanTypes.ts:225,1208,1248`, `adminContextService.ts:403,416`,
  `assistantSiteBuilderFollowUpResolver.ts:146`, `cmsOperationActionMapper.ts:1181,1196`,
  `cmsOperationDraftSchema.ts:33`, `cmsTargetResolver.ts:666,682,912`,
  `operationPolicy/cmsResourcePolicies.ts:693,835`,
  `operationPolicy/resolverPolicy.ts:467`,
  `blueprints/blueprintCapabilitySchema.ts:58`, `blueprints/blueprintCapabilityTypes.ts:34`.

**Implementation Pseudocode (pattern for every union/branch):**

```ts
// Before: containerType: "page" | "widget-template"
// After:  containerType: "page"

// Before: if (surfaceKind === "widget-template") { await requirePermission("widgets:read")(ctx); }
// After:  (widget-template branch removed; the surviving detail-page branch keeps
//          its legitimate `widgets:read` gate at assistantRoutes.ts:476)

// activeSurfaceHydration: delete the widget-template branch and its normalize
// import; getWidgetTemplate is no longer a dep of hydrateAssistantActiveSurfaceContext.
```

**Data flow:** assistant action plans no longer contain widget-template actions;
active-surface hydration returns `null`/falls through for any legacy
`widget-template` reference (the kind is removed from the union, so it cannot be
authored); the resource catalog has no `widgets` group.

**Error handling:** removed action types/schemas fail closed at schema validation
(`additionalProperties: false`); no fallback to a permissive widget-template path.

**Regression-test shape:** action-executor tests drop widget-template actions;
assistant plan-schema tests reject any payload with `kind: "widget-template"`;
catalog tests assert no `widgets` group; follow-up-resolver tests drop the
widget-template branch.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`, assistant
action-executor + catalog + hydration tests (see Testing Requirements).

### 6. `userSettingsService` widget keys

- `core/services/settings/userSettingsService.ts:43-44,77-78,126` — remove
  `"widgets.favorites"` from `UserSettingValueMap`, `DEFAULT_USER_SETTINGS`, and the
  `validateUserSettingValue` branch. Remove the `widgets.favorites` type from
  `core/admin/services/userSettingsClient.ts:18`.
- KEEP `"widgets.hero.presets"` unchanged (its only consumer,
  `editors/HeroEditors.tsx:1598,1620`, survives until 580-04). Defer that key's
  removal to 580-04.
- **No destructive DB migration.** Orphaned `user_settings` rows with
  `key = "widgets.favorites"` are tolerated: `listUserSettings` filters by
  `Object.keys(DEFAULT_USER_SETTINGS)`, and `getUserSetting`/`setUserSetting`
  fail closed via `assertUserSettingKey`. Document this in the closeout.
- The global setting key `widgets.templateCategories` (owned by the deleted
  `widgetTemplateCategoryService`) becomes orphaned; tolerate it (never read).

**Implementation Pseudocode:**

```ts
// userSettingsService.ts — remove from the map/defaults/validator:
//   UserSettingValueMap, DEFAULT_USER_SETTINGS, and the `if (key === "widgets.favorites")` branch.
//   Keep hero presets (normalizeHeroData / HeroData / heroVariants / heroPresetLimit) untouched.
```

**Error handling:** `assertUserSettingKey("widgets.favorites")` now throws
`user_settings_key_invalid`; no write path references the key.

**Regression-test shape:** settings validation test asserts `widgets.favorites`
is rejected and absent from `DEFAULT_USER_SETTINGS`; hero-preset tests still pass.

**Validation:** `bun --cwd core lint:types`, `bun --cwd core lint`, user-settings
unit tests (see Testing Requirements).

### 7. Test removal (narrow, verified) + test rewires

**Remove (tests of deleted surfaces only):**
- `tests/unit/widgets/modulePackMatrix.test.ts`
- `tests/unit/widgets/widgetCatalogService.test.ts`
- `tests/unit/widgets/widgetTemplateCategoryService.test.ts`
- `tests/unit/widgets/widgetTemplateRevisionService.test.ts`
- `tests/unit/assistant/actionExecutorListingsAndWidgets.test.ts` (if it asserts
  widget-kit actions; verify before removing)
- `tests/vitest/assistant/page-widget-patch.test.ts` (if present)
- `tests/vitest/admin/widgetsClient.test.ts`
- `tests/integration/assistant-live/widgetTemplatesLiveMatrix.test.ts` (verified it
  imports deleted authoring services)
- Widget Library UI tests: `tests/vitest/ui/widget-library*.test.tsx`
  (including `widget-library-preview-feedback`, `widget-library-restyle`,
  `widget-library-row-actions`), `tests/vitest/ui/widget-card.test.tsx`,
  `tests/vitest/ui/widgetInsertUtils.test.ts`,
  `tests/vitest/ui/widgetLibraryUtils.test.ts`,
  `tests/vitest/ui/widget-preview-state-support.test.ts`
- `tests/integration/routes/widgets.test.ts` and any integration test that
  exercises `/admin/api/widgets` catalog or the widget-template CRUD routes.

**Rewire, do not remove (code survives):**
- `tests/unit/widgets/widgetTemplateService.test.ts` — delete authoring cases
  (create/update/duplicate/delete/list), keep `getWidgetTemplate` read cases.
- `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts:227` — the fence inventory
  hard-codes the `widgetTemplateCategoryService` path; remove/rewire that fence
  entry once the service is deleted.
- `tests/unit/widgets/{registry,runtimeRegistry,validator,contentList,entryTeaser,postsFeedWidget}.test.*`
  — KEEP (v1 kernel survives). Rewire imports only if 580-01 relocated a module.
- `tests/vitest/widgets/*` (~59) and `tests/vitest/ui/*-editor-wave.test.tsx` —
  KEEP (editors/kernel survive). Rewire only if 580-01 relocated `SharedColorControl`
  / `TokenOrPixelField` (then re-point `shared-color-*`, `clearable-fields*` imports).
- `tests/vitest/pageBuilder/*` — KEEP (builder panels survive). Exception: REMOVE
  `tests/vitest/pageBuilder/widgetLibrary.test.tsx` — verified `:5` imports
  `WidgetLibraryPage` (the deleted Widget Library page, not `LibraryPanel`).
- `tests/vitest/admin/{widgetEditorOutlet,widgetRegistryReload,widgetRegistryBoundary}.test.*`
  — KEEP (outlet/registry survive). REWIRE `widgetRegistryBoundary.test.ts`: its
  current `:33-44` assertions exercise the 4 deleted accessors
  (`listRegisteredWidgetLibraryWidgets`, `listRegisteredWidgets`,
  `listRegisteredScreenWidgets`, `listRegisteredWidgetsForSurface`); narrow the
  helper assertions to `listRegisteredPageWidgets` + `getRegisteredWidget` and keep
  the lazy-load (`lazyNamedEditor`/`editorLoaders`) assertions.
- `tests/vitest/services/css-color-consumer-parity.test.ts` + its
  `cssColorRegexInventoryAssertions.ts`/`cssColorClearableInventoryAssertions.ts` —
  KEEP and rewire imports if `SharedColorControl` moved in 580-01; remove only if
  the color contract itself is deleted (not planned in 580-02).
- `tests/unit/commerce/commerceWidgetRuntime.test.ts` — KEEP unless 580-01 deleted
  `commerceWidgetRuntime.ts`; verify.

**Rule:** before removing any test, `grep -an` the production symbol it imports and
confirm that symbol is deleted in this task. Never remove a test for surviving code.

**Validation:** run the affected lanes (Vitest for UI/domain, Bun for runtime) and
confirm no dangling imports: `grep -an "widgetCatalogService\|modulePackMatrix\|widgetTemplateRevisionService\|widgetTemplateCategoryService\|actionExecutorWidgetsSiteKit\|pageWidgetPatch" tests/` returns empty (except the shrink/rewire cases above).

### 8. Documentation updates

- `_docs/ADMIN_CACHE.md:88` — remove `widgetCatalog:list` from the key list; replace
  the "Retired widget-library compatibility cache note" (`:448-460`) with a short
  removal record (surface deleted in TASK-580-02).
- `_docs/ADMIN_CACHE_MAP.md:305-314` — delete the "Retired widget compatibility
  surfaces" section.
- `_docs/WIDGETS.md` — add/refresh the banner: Widget Library + widget-template
  authoring removed; the v1 render kernel remains a read-compat seam for entry
  detail pages until TASK-580-03/580-04. Do NOT delete `_docs/_WIDGETS/*` yet.
- `_docs/WIDGET_PACK_MATRIX.md` — mark the pack matrix removed (tombstone).
- `docs/develop/*` — update any page referencing `/advanced/widgets` or the Widget
  Library editor (project structure / testing notes).
- Do NOT touch `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (parent/closure owns).

---

## Testing Requirements

Per-contract gates (run after each sub-task):

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

Targeted lanes (choose by touched contract):

- Route graph: `bun test` on the admin route-registration / adminPaths suites;
  `bun run check:admin-boundary` and `bun run check:admin-bundle` (verify these
  scripts exist and run them; they gate lazy-route and bundle integrity).
- Catalog/API: admin API route tests + `bun test tests/integration/routes/widgets.test.ts`
  (removed/updated) + assistant catalog snapshot tests.
- Templates: `bun test tests/unit/widgets/widgetTemplateService.test.ts` (rewired),
  kit-install suites, `templateSectionRuntime`/detail-page hydration tests.
- Assistant: `bun run test:vitest -- tests/vitest/assistant/ tests/vitest/admin/`
  + `bun test tests/unit/assistant/`.
- Settings: user-settings unit tests.
- UI deletions: `bun run test:vitest -- tests/vitest/ui/ tests/vitest/pageBuilder/`.

Confirm with `bun run test:vitest -- --help` or the repo's documented Vitest entry
before claiming a lane. State clearly in the closeout if any lane was skipped or
could not run.

---

## Documentation Updates Required

- Task board: parent author (TASK-580) updates `_docs/_TASKS/README.md`; this task
  file only records its own status.
- Changelog: family entry `1323` (closure subtask owns it); no changelog file is
  created by this task.
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md`, `_docs/WIDGETS.md`,
  `_docs/WIDGET_PACK_MATRIX.md`, and affected `docs/develop/*` pages (see Sub-Task 8).

---

## Open Questions & Cross-Stream Dependencies

1. **580-01 (dependency, lands first):** whether it relocated
   `navigationContract`, `SharedColorControl`/`TokenOrPixelField`, or the
   `contentList`/`formEmbedContract`/`listingFilters` contracts determines how many
   of the "rewire import path only" instructions apply. Verify current state after
   580-01 lands; never re-implement 580-01's extractions.
2. **580-01 `commerceWidgetRuntime.ts`:** if 580-01 deleted it, remove
   `commerceWidgetRuntime.test.ts` and confirm no detail-page commerce render path
   remains; otherwise keep both.
3. **580-03 (dependency in reverse):** `templateSectionRuntime.ts`,
   `widgetTemplateService.getWidgetTemplate`, and the `widget_templates` +
   `widget_template_revisions` tables MUST stay until 580-03 migrates detail pages
   off `template-section` blocks. 580-04 drops them.
4. **`core/admin/ui/widgets/{registry.ts (split), WidgetEditorOutlet.tsx,
   widgetCategoryMeta.ts}` survive 580-02** and are deleted in 580-04 with the
   editors. If 580-01 already relocated the editor-registration shim to a neutral
   location, 580-02 deletes the whole directory except `editors/*`; otherwise it
   performs the split in Sub-Task 1.
5. **`kitInstaller.ts`/`kitTemplateSeeds.ts` retyping** is a soft dependency on the
   type 580-01 introduces to replace `WidgetBlock` in the kit flow; if that type
   does not exist yet, leave the casts and note the follow-up for 580-03.

---

## Closure Checklist

- [x] All sub-tasks landed in order with per-contract gates green.
- [x] `grep -an "widgetCatalogService\|modulePackMatrix\|WidgetLibraryPage\|listWidgetCatalog\|widget-template" core/ tests/` shows no dangling authoring references (except the retained read path in Sub-Task 3).
- [x] Surviving kernel paths (`hydrateRuntimeBlocks`, `templateSectionRuntime`, preview routes, builder panels, detail-template editor) untouched and green.
- [x] Status set to `✅ Done` by the closure subtask (this file remains `⏳ To Do` until then).
- [x] Board index + statistics synced by the parent author; changelog `1323` added by the closure subtask.
