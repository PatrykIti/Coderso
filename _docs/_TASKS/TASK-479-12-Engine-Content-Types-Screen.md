# TASK-479-12: Engine / Content Types Migration
# FileName: TASK-479-12-Engine-Content-Types-Screen.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Port the finished visual-redesign prototype for the **Engine / Content Types**
surfaces into the real admin under `core/admin/ui/content-types/**`. This covers
the five engine screens: the content type list, the content type editor, the
schema builder, the collection workspace, and the detail-template editor. The
work is a **visual restyle only** — every screen keeps its real data, schema
operations, cache wiring, dirty-state protection, and routing. We swap the
presentation layer (chrome, cards, tabs, filters, rails, inspectors) to the
prototype's **soft & friendly, Notion-like** design language: warm neutral
canvas, white `rounded-2xl` cards, soft shadows, generous spacing, a **violet**
accent, and a light default with a dark toggle.

- **Goal:** Make the Engine screens match the approved prototype look while
  preserving all content-type schema logic, cache/dirty-state contracts, RBAC
  gating, and canonical routing.
- **Owning module/service:** `core/admin/ui/content-types/**`
  (`ContentTypeList.tsx`, `ContentTypeEditor.tsx`, `SchemaBuilderPage.tsx`,
  `CollectionWorkspacePage.tsx`, `DetailTemplateEditorPage.tsx`) backed by
  `core/admin/services/contentTypesClient.ts`,
  `core/admin/services/detailPagesClient.ts`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`, `_docs/TESTING_STRATEGY.md`, and the prototype under
  `_docs/_PROTOTYPE/src/pages/advanced/{EnginePage,ContentTypeEditorPreview,SchemaBuilderPreview,CollectionWorkspacePage}.tsx`
  plus shared primitives in `_docs/_PROTOTYPE/src/components/{ui,patterns,shell}`
  and tokens in `_docs/_PROTOTYPE/src/styles/theme.css`.
- **Out of scope:** No schema-model changes, no new endpoints, no change to the
  detail-template page-builder block model, no change to `cacheKeys`/TTL, and no
  re-platforming of the editor block primitives (those are restyled by the
  Pages-editor migration / TASK-479-07 and merely reused here). No workspace
  switcher, plans, or trial chrome — this is a self-hosted WordPress competitor;
  the shell shows site identity only (owned by TASK-479-06).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

The five screens already gate behind the Engine module's existing permission
wiring (`AdminShell`/`EditorShell`/`SplitShell` + module gating). Leaves MUST NOT
relax or relocate any permission check, MUST keep all reads going through the
existing `cachedClient`/`cacheKeys` paths, and MUST keep all writes
(`updateContentType`, `deleteContentType`, `duplicateContentType`,
`createDetailPage`, `updateSiteSettings`, detail-page autosave/publish) exactly
as-is.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-12-L01 | Content Type List Restyle | ⏳ To Do |
| TASK-479-12-L02 | Content Type Editor Restyle | ⏳ To Do |
| TASK-479-12-L03 | Schema Builder Restyle | ⏳ To Do |
| TASK-479-12-L04 | Collection Workspace & Detail Template Restyle | ⏳ To Do |
| TASK-479-12-L05 | Engine Tests | ⏳ To Do |

---

## Migration constraints (apply to every leaf)

- **Preserve real data/logic.** Keep every `contentTypesClient` /
  `detailPagesClient` / `siteSettingsClient` call, the schema mapping helpers
  (`schemaMapping.ts`, `detailTemplateEditorModel.ts`), and the page-builder
  primitives unchanged. The restyle touches JSX/className only.
- **Canonical routing.** Never hand-build `<a href>`. Route admin nav/links and
  prefetch through the shared helpers — `AdminLink`
  (`core/admin/ui/shared/AdminLink.tsx`), the `adminPaths` helpers
  (`resolveAdminBasePath`, `resolveAdminRoutePath`, `resolveAdminHref` in
  `core/admin/utils/adminPaths.ts`), `useAdminRouter().navigate`, and
  `prefetchAdminRoute`. When porting a prototype `<Link to="…">`, replace it with
  `AdminLink` resolved through the path helpers — keep the **existing** target
  routes (e.g. `/content-types/:id`, `/content-types/:id/schema`,
  `/advanced/engine/:id/collection`, `buildDetailTemplateEditorHref`).
- **Cache contract.** Preserve cache hydrate + background revalidation,
  `subscribeCacheEvents` invalidation, `cacheKeys`/TTL, and the existing
  remote-update-pending guards. NO mount-force refetch loops beyond what already
  exists; NO dirty-state overwrites (the editor's `hasUnsavedChangesRef` and the
  workspace's `remoteUpdatePending` flow must stay intact).
- **react-hooks (ESLint 9).** No synchronous `setState` inside effects; use lazy
  initializers / render-time derivation / reducers. Do not add effects that the
  restyle does not require.
- **Schema-first.** Any payload shape stays owned by the existing client/schema
  modules; the restyle adds no new payloads.
- **Design tokens.** Consume the new violet/soft tokens from
  `core/admin/styles/globals.css` (landed by TASK-479-05) via existing semantic
  classes (`bg-card`, `text-muted-foreground`, `border`, `bg-primary`, etc.) and
  the restyled shell from TASK-479-06 — do not hardcode hex values.

---

## Testing Requirements

Lane = **Vitest** (Bun-free admin/UI) per `_docs/TESTING_STRATEGY.md`. Run:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-*.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/schema-builder.test.tsx tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx`

New per-screen restyle suites land under `tests/vitest/ui-integration/`
(see TASK-479-12-L05). Existing engine suites under `tests/vitest/ui/` MUST stay
green; update their literal class/markup assertions where the restyle
intentionally changes them, but do NOT delete behavioral assertions. Do NOT move
runtime tests into Vitest for coverage.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board buckets + statistics on every status
  change for this subtask and its leaves.
- Add a `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` and the closing
  leaf id(s).
- If any restyle alters a documented Engine UX affordance, reconcile
  `_docs/CONTENT_TYPES_SPEC.md`. No API/cache contract change is expected, so no
  contract-doc edits beyond UX notes.
