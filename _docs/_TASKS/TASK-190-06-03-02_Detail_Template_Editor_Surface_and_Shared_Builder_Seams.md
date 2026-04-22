# TASK-190-06-03-02: Detail Template Editor Surface and Shared Builder Seams
# FileName: TASK-190-06-03-02_Detail_Template_Editor_Surface_and_Shared_Builder_Seams.md

**Priority:** High
**Category:** Admin/UI + Detail Templates + Builder Reuse
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03-07, TASK-190-06-03-01
**Status:** To Do

---

## Overview

Build the manual detail-template editing surface on top of extracted builder
primitives from the existing page, widget-template, and custom-screen editors.

The target is a reusable `detail-page` editor mode, not a fourth large editor
stack with its own save/preview/revisions conventions.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/admin/ui/content-types/DetailTemplateEditorPage.tsx`
- Add `core/admin/ui/content-types/detailTemplateEditorModel.ts`
- Reuse `core/admin/services/detailPagesClient.ts`
- Reuse `core/admin/services/entriesClient.ts` for bounded sample-entry picker
  data instead of introducing a detail-page-local entry client or route-local
  fetch helper
- Extract shared builder/editor helpers only where current editors already share
  behavior
- Add `tests/vitest/ui/detail-template-editor.test.tsx`

Reuse anchor points:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`

## Editing Contract

Target surface:

```ts
type BuilderSurfaceMode =
  | "page"
  | "widget-template"
  | "custom-screen"
  | "detail-page";
```

Rules:

- save/autosave/publish/revisions/preview stay aligned with existing page and
  widget-template editor behavior,
- detail-template mode may add binding-specific inspector panels and sample
  entry preview requirements,
- detail-template block selection should reuse the current `page-builder`
  widget-surface contract because the edited resource is still a public
  runtime-rendered page-like document, not a custom-screen surface,
- if a later slice truly needs detail-page-specific widget availability, widen
  the shared widget owner seam explicitly (`WidgetSurface`, widget registry, and
  the corresponding surface filters) instead of adding a detail-page-local
  allowlist in the editor,
- editor chrome and lifecycle behavior should come from extracted shared seams
  where practical,
- route shell, cache warmup, and admin navigation ownership stay in the current
  `Coderso/Engine` / `content-types` family; `detailPagesClient.ts` remains the
  owner only for detail-page document CRUD/preview/revision lifecycle,
- no ad-hoc route-local fetch helpers; use dedicated detail-page admin client
  wrappers,
- sample-entry selection for preview stays on existing admin entry-read seams:
  `entriesClient.ts` owns bounded list/read caching, while
  `DetailTemplateEditorPage.tsx` owns only picker UI state and passes the chosen
  id into the existing detail-page preview route,
- detail-page preview routes/services validate the chosen `sampleEntryId`
  against the linked content type and shared preview-token contract; the editor
  must not become a second source of truth for sample-entry ownership,
- no assumption that all current editors are already one unified shell.

## Manual Editing Flow

```text
Collection Workspace
  -> Detail Template tab
  -> select sample entry
  -> edit blocks
  -> inspect bindings
  -> preview runtime
  -> autosave / publish / revisions
```

## Security Contract

- Visibility: internal admin editor only.
- Auth model: authenticated admin session.
- RBAC:
  - read/preview/revisions require `content:read`,
  - save/autosave require `content:write`,
  - publish/unpublish require `content:publish`.
- CSRF: existing admin mutation middleware.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: detail-page documents and binding edits remain
  strict.
- Anti-abuse: sample entry selection is bounded to the linked content type and
  never trusted from unvalidated route/query data alone.
- Secret handling: binding inspectors and preview payloads reuse content-domain
  redaction rules.

## Testing Requirements

- detail template editor loads through the workspace flow.
- save/autosave/publish/revisions/preview wiring reuses current editor
  conventions instead of a parallel lifecycle.
- sample entry preview is required and validated for detail-page runtime
  preview.
- sample-entry picker reuses the existing entry admin client/cache seam instead
  of introducing a detail-page-local entry transport.
- detail-template widget library stays aligned with the existing
  `page-builder` surface unless a later task explicitly widens the shared widget
  surface contract.
- binding inspector/state behaves deterministically.
- shared extraction does not regress the existing page/widget-template/custom
  screen editors.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
