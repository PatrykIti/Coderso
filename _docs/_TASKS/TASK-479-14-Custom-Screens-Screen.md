# TASK-479-14: Custom Screens (Published Screen Flow) Migration
# FileName: TASK-479-14-Custom-Screens-Screen.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype for the **Custom Screens** flow into
the real admin under `core/admin/ui/custom-screens/**`. Custom Screens are the
self-hosted CMS's "build-your-own admin surface" feature: an author defines a
screen bound to a content type, publishes it so it appears **in the left
sidebar** under its own name, configures a flexible **List View** table of
entries, composes a **per-screen entry view** (sections/blocks bound to fields),
and edits each entry's content inline. This subtask restyles all four surfaces to
the prototype's **soft & friendly, Notion-like** language — warm neutral canvas,
white `rounded-2xl` cards, soft shadows, generous spacing, **violet** accent,
light default + dark toggle — without changing any data, schema, cache, RBAC, or
routing behavior.

The work continues, but does NOT re-open, the closed/partial bodies of work in
TASK-468 (custom-screen definition versioning + assistant) and TASK-474
(custom-screen canvas parity). It consumes their normalization (V4) and
authoring primitives as-is; it must not regress them.

- **Goal:** Make the four Custom Screens surfaces match the approved prototype
  look while preserving the published-screen sidebar wiring, the configurable
  List View, the per-screen entry-view builder, inline entry-content editing,
  the V4 definition normalization, dirty-state protection, cache contract, RBAC
  gating, and canonical routing.
- **Owning module/service:** `core/admin/ui/custom-screens/**` —
  `CustomScreenListPage.tsx`, `CustomScreenEditorPage.tsx`
  (+ `ListViewDesigner.tsx`, `ScreenAuthoringCanvas.tsx`, `ScreenBlockInspector.tsx`,
  `ScreenBlockLibrary.tsx`), `CustomScreenEntriesPage.tsx`
  (+ `CustomScreenEntriesTable.tsx`, `CustomScreenEntriesFilters.tsx`,
  `ListViewColumnInspector.tsx`), and `CustomScreenEntryEditor.tsx`
  (+ `CustomScreenEntryCanvas.tsx`, `ScreenRuntimeRenderer.tsx`), backed by
  `core/admin/services/customScreensClient.ts`,
  `core/admin/services/customScreenShortcutsClient.ts`,
  `core/services/customScreens/*`, and the `hooks/useCustomScreens` family.
- **Source-of-truth docs:** the prototype screens
  `_docs/_PROTOTYPE/src/pages/advanced/{CustomScreensPage,CustomScreenEditorPreview,CustomScreenEntriesPage,CustomScreenEntryEditorPreview}.tsx`
  + `_docs/_PROTOTYPE/src/lib/screensMock.ts`; shared primitives in
  `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}` (esp.
  `patterns/CanvasEditor.tsx`, `patterns/DataTable.tsx`, `patterns/PageHeader.tsx`);
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  `_docs/TESTING_STRATEGY.md`; and the memory notes
  [[task-468-completion-state]] and [[task-474-custom-screen-canvas-parity]].
- **Out of scope:** No change to the custom-screen definition schema or its V4
  normalization behavior (owned by TASK-468 — including the still-open V4-only
  write-enforcement gap; do NOT "fix" or alter normalization here). No new
  endpoints, cache keys, or RBAC scopes. No change to the entry draft model
  (`customScreenEntryDraft.ts`), the presentation-override service
  (`core/services/customScreens/screenEntryPresentationOverrides.ts`), or the
  field-binding model. No workspace switcher, plans, "Coderso Pro", or trial
  chrome — this is a self-hosted WordPress competitor; the shell shows site
  identity only (owned by TASK-479-06). The `EditorViewDesigner.tsx`-style dead
  code stays untouched (see TASK-474).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

All four surfaces already gate behind the Custom Screens module wiring
(`AdminShell`/`EditorShell` + module gating + `resolveCustomScreenCapabilities`).
Leaves MUST NOT relax or relocate any permission/capability check, MUST keep all
reads through `customScreensClient` + `cacheKeys.customScreensList` /
`cacheKeys.customScreenDetail(id)` / `cacheKeys.customScreenEntryOverrides(...)`,
and MUST keep all writes (definition update/publish, entry create/update,
presentation-override replace, sidebar-shortcut sync) exactly as-is.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-14-L01 | Custom Screen Management List Restyle | ⏳ To Do |
| TASK-479-14-L02 | Entry-View Builder → Floating-Panel Canvas | ⏳ To Do |
| TASK-479-14-L03 | Published List View + Configurable Table/View | ⏳ To Do |
| TASK-479-14-L04 | Entry Content Editor (Per-Screen Presentation) | ⏳ To Do |
| TASK-479-14-L05 | Custom Screens Tests | ⏳ To Do |

---

## Migration constraints (apply to every leaf)

- **Preserve real data/logic.** Keep every `customScreensClient` /
  `customScreenShortcutsClient` / entry CRUD / presentation-override call, the
  `normalizeCustomScreenDefinitionForRead` calls, the entry draft helpers
  (`customScreenEntryDraft.ts`), the capability resolver
  (`resolveCustomScreenCapabilities`), and the field-binding model unchanged. The
  restyle touches JSX/className only.
- **Canonical routing.** Never hand-build `<a href>`. Route admin nav/links and
  prefetch through the shared helpers — `AdminLink`
  (`core/admin/ui/shared/AdminLink.tsx`), the `adminPaths` helpers
  (`resolveAdminBasePath`/`resolveAdminRoutePath`/`resolveAdminHref` in
  `core/admin/utils/adminPaths.ts`), `useAdminRouter().navigate`, the
  custom-screen route helpers in
  `core/admin/ui/custom-screens/routeParams.ts`
  (`buildCustomScreenWorkspacePath`, `buildCustomScreenWorkspaceHref`,
  `resolveCustomScreenId`, `resolveCustomScreenEntryParams`,
  `resolveCustomScreenWorkspacePrefetchTarget`), and the prefetchers in
  `core/admin/utils/adminPrefetchCustomScreens.ts`
  (`prefetchCustomScreenListData`, `prefetchCustomScreenWorkspaceData`). When
  porting a prototype `<Link to="…">`, replace it with `AdminLink` resolved
  through these helpers — keep the **existing** target routes. The **published
  → sidebar** wiring (`buildCustomScreenShortcutNavItems` in
  `core/admin/ui/navigation/sidebarConfig.ts`, fed by
  `customScreenShortcutsClient`) MUST stay intact.
- **Cache contract.** Preserve cache hydrate + background revalidation,
  `subscribeCacheEvents` invalidation on `cacheKeys.customScreensList` /
  `cacheKeys.customScreenDetail(id)` / `cacheKeys.customScreenEntryOverrides(...)`
  / `cacheKeys.entriesList(slug)` / `cacheKeys.entryDetail(slug, id)`, and the
  existing remote-update-pending guards. NO mount-force refetch loops beyond what
  already exists; NO dirty-state overwrites (the editor's `hasUnsavedChanges` and
  the entry editor's `hasUnsavedPresentationChanges`/draft flow must stay intact).
- **react-hooks (ESLint 9).** No synchronous `setState` inside effects; use lazy
  initializers / render-time derivation / reducers. Do not add effects the
  restyle does not require. Re-using existing open/close state (e.g. the entries
  page `showConfig` analogue) is preferred over forking a new source of truth.
- **Schema-first.** Any payload shape stays owned by the existing
  client/schema modules (`customScreenSchemas.ts`, the override service); the
  restyle adds no new payloads or definition fields.
- **Design tokens.** Consume the violet/soft tokens from
  `core/admin/styles/globals.css` (landed by TASK-479-05) via existing semantic
  classes (`bg-card`, `text-muted-foreground`, `border`, `bg-primary`,
  `rounded-2xl`, `shadow-card`, etc.) and the restyled shell from TASK-479-06 —
  do not hardcode hex values.

---

## Testing Requirements

Lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`

New per-surface restyle suites land under `tests/vitest/ui-integration/`
(see TASK-479-14-L05). The existing custom-screen suites under `tests/vitest/ui/`
MUST stay green — at minimum re-run `custom-screens-page.test.tsx`,
`custom-screens-list-wave.test.tsx`, `custom-screen-records.test.tsx`,
`custom-screen-record-interactions.test.tsx`,
`custom-screen-list-view-canvas.test.tsx`,
`custom-screen-editor-binding-flow.test.tsx`,
`custom-screen-entry-draft.test.ts`, and `custom-screen-route-params.test.ts`.
Update literal class/markup assertions where the restyle intentionally changes
them, but do NOT delete behavioral assertions. Do NOT move runtime tests into
Vitest for coverage.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board buckets + statistics on every status
  change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` and the closing
  leaf id(s).
- If any restyle alters a documented Custom Screens UX affordance (sidebar
  publish, List View customization, entry-view builder, inline entry editing),
  reconcile the relevant Custom Screens spec/UX note and cross-reference
  [[task-468-completion-state]] / [[task-474-custom-screen-canvas-parity]]. No
  API/cache contract change is expected, so no contract-doc edits beyond UX notes.
