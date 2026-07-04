# TASK-479-16-L02: Listing Editor Restyle
# FileName: TASK-479-16-L02-Listing-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
**Parent Subtask:** TASK-479-16
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Overview

Restyle the real Listing **query editor** to match the prototype's editor frame:
a soft header with breadcrumbs + the real Back / Discard / Run-preview / Save-query
actions (there is NO Publish action — Save query is the primary), a left
**Data / Filters** rail, a center **result preview grid** canvas, and a right
**inspector** holding layout/sort/pagination/fields controls — all on the warm
`rounded-2xl` / soft-shadow language. This editor stays fully **functional** (it is
NOT the non-functional prototype mock): the listing-query model, content-type
binding, live preview, dirty-state protection, and cache subscription are preserved
exactly; only the chrome/canvas/inspector styling changes.

- **Goal:** `core/admin/ui/listings/ListingEditorPage.tsx` adopts the look of
  `_docs/_PROTOTYPE/src/pages/advanced/ListingEditorPreview.tsx`
  (`EditorPreviewFrame` chrome + left rail + result-preview canvas + inspector
  rows) while keeping the existing two-column functional editor wiring intact.
- **Owning module/service:** `core/admin/ui/listings/ListingEditorPage.tsx` and the
  helpers it consumes (`listings/defaults.ts` source/operator options,
  `listings/hooks/useListingTemplates.ts`, `listingActionToasts.ts`). Shared
  primitives from TASK-479-05/06.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/advanced/ListingEditorPreview.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{EditorPreviewFrame,PageHeader,SectionCard}.tsx`
  (and optionally `patterns/CanvasEditor.tsx`); prototype ui
  `_docs/_PROTOTYPE/src/components/ui/{card,select,input,checkbox,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `listingsClient` (`getListingQueryCached`,
  `createListingQuery`, `updateListingQuery`, `previewListingQuery`), the
  `ListingQueryPayload` schema (source/sourceConfig/filters/sort/pagination/fields),
  `normalizeDraftQuery`/`parseFilterValue` logic, `cacheKeys.listingQueryDetail` +
  the `subscribeCacheEvents` revalidation, RBAC, or routing. No new editor
  capabilities — the controls keep their exact handlers. `CanvasEditor` adoption is
  optional and presentational only.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the editor's data/state machine: the lazy `listingId`
init, `isCreateMode`/`initialContentTypeId` derivation, the `getCachedContentTypes`
seed + `listContentTypesCached` effect, the `getListingQueryCached({ force: true })`
hydrate effect, the `subscribeCacheEvents(cacheKeys.listingQueryDetail(listingId))`
guard (`if (hasUnsavedChanges) return`), `applySnapshot`/`cloneDraftSnapshot`,
`markDirty`, `runPreview`, `handleSave`, `handleDiscard`, `updateFilter`,
`updateSort`, and every `setQuery(prev => ...)` updater. Keep behavior identical;
re-arrange the same controls into the prototype frame and swap classNames.

```tsx
// ListingEditorPage.tsx — RENDER ONLY changes inside the existing return().
// 0) Loading branch: keep the existing "Loading listing query..." guard; restyle
//    to a centered soft skeleton if desired (no logic change).

// 1) Header: replace the ad-hoc <div> heading block with the restyled
//    @/ui/shared/PageHeader. Breadcrumbs (Listings → name) use the `breadcrumbs`
//    prop ADDED to the shared PageHeader by 479-06-L02 — today's PageHeader exposes
//    only title/description/actions/className, so do not assume it pre-exists; rely
//    on the 06 extension. Keep the EXACT action buttons + handlers: Back (navigate
//    "/advanced/listings"), Discard (handleDiscard, disabled={!hasUnsavedChanges}),
//    Run preview (runPreview, disabled={isPreviewing}), Save query (handleSave,
//    disabled={isSaving} — NOT gated on dirty, i.e. always enabled except while
//    saving). The Discard button is the dirty indicator (it enables only when
//    hasUnsavedChanges). A small unsaved-changes Badge may also reflect
//    hasUnsavedChanges (derived, no state).

// 2) Frame: port the EditorPreviewFrame *look* (NOT the non-functional component)
//    — a rounded-2xl bordered card with a muted toolbar bar, then a 3-region body:
//      left rail (Data / Filters) | canvas (result preview) | right inspector.
//    Build it as the page's own functional layout (e.g. a local <ListingEditorFrame>
//    or grid) reusing EditorRailGroup/EditorRailItem CLASS shapes — the controls
//    inside must remain the real, wired inputs.

// 3) LEFT RAIL — Data + Filters (ports EditorRailGroup "Data"/"Filters"):
//    - Data: the Source <Select> (listingSourceOptions) + the conditional
//      content-type <Select> / taxonomy <Input> / include-drafts <Select>. Keep
//      every onValueChange => setQuery(...) + markDirty() EXACTLY.
//    - Filters: render the existing filter rows (field <Input>, op <Select>,
//      value <Input> with parseFilterValue, Remove button) and the "Add filter"
//      button — same updateFilter/setQuery handlers. Present each as a soft rail
//      card; "exists" still disables the value input.

// 4) CANVAS — result preview grid (ports prototype canvas grid):
//    Drive from the REAL previewRows/previewTotal state. Header row shows
//    "{name || 'Listing'}" + a Badge `Bound query · {previewTotal} results`.
//    When previewRows.length === 0 → the existing "Preview payload will appear
//    here." empty card (restyled, dashed → soft). When rows exist, render a
//    responsive card grid; each card may show the prototype skeleton chrome AND
//    keep a details affordance (e.g. a collapsible <pre>{JSON.stringify(row)}</pre>)
//    so the real resolved row data stays inspectable. Run preview button (header)
//    is the only trigger — no auto-preview effect added.

// 5) RIGHT INSPECTOR — layout/sort/pagination/fields (ports InspectorRow rows):
//    Reuse the prototype InspectorRow shape (label + control). Map the REAL
//    controls into it:
//      - Sort: the existing sort rows (field <Input> + dir <Select> + Remove) and
//        "Add sort" — same updateSort/setQuery handlers (Remove disabled when
//        sort.length <= 1).
//      - Pagination: Limit/Offset number <Input>s with the existing clamped
//        onChange (Number.isFinite guard) + markDirty().
//      - Fields: the comma-separated Textarea -> fields[] updater (UNCHANGED).
//      - Template-for-preview <Select> (useListingTemplates) -> selectedTemplateId
//        (UNCHANGED, "__none__" sentinel preserved).
//    NOTE: the prototype's "Layout/Columns/Fields shown" are mock controls — only
//    adopt their VISUAL rows; the bound state is the real query model above. If the
//    real model has no "columns/layout" field, do NOT invent one (schema-first).

// 6) Live-preview card placement: keep the preview as the canvas (per the
//    prototype). The old right-column "Live Preview" Card is absorbed into the
//    canvas region; its previewError <Alert> stays rendered above the frame.
```

**Data flow:** lazy `listingId` → seed `getCachedContentTypes()` + hydrate via
`getListingQueryCached({ force:true })` → `applySnapshot` populates name/description/
query/snapshot → user edits call `setQuery(prev=>...) + markDirty()` →
`runPreview()` calls `previewListingQuery(normalizeDraftQuery(query))` →
`previewRows`/`previewTotal` feed the canvas grid → `handleSave` posts and
re-snapshots. The restyle re-arranges where these controls render; it changes none
of these edges.

**Navigation/href constraint (preserve):** Keep `AdminShell activeHref="/admin/
advanced/listings"`, the breadcrumbs array, the Back `navigate("/advanced/listings")`
and the post-create `navigate("/advanced/listings/<created.id>")` calls. Do NOT
hand-build `<a href>` / string-concat admin URLs; route any added link through
`AdminLink` + `prefetchAdminRoute` / `adminPaths`.

**Error handling:** Keep both `Alert` blocks unchanged in copy/condition (`Listing
query error` from `error`, `Preview failed` from `previewError`) and the
`createListingQuery`/`updateListingQuery`/`previewListingQuery` catch branches via
`listingQueryToasts.error(...)`. Only their surrounding card styling inherits new
tokens. No new error surfaces.

**React-hooks/cache rules:** No new effects. The `hasUnsavedChanges` dirty guard in
the cacheBus subscription must remain (do NOT overwrite a dirty draft on background
revalidation). Any derived inspector/header value (unsaved badge, preview count
label) is computed at render or via `useMemo` — no synchronous `setState` in an
effect, no mount-force-refetch loop. Keep the single content-types effect + single
hydrate effect + single cacheBus subscription as the only data effects.

**Regression-test shape:** see L04 — render `ListingEditorPage` in create mode and
edit mode (seeded `getListingQueryCached`), assert: restyled header + the real
Discard / Run-preview / Save-query actions present (no Publish), left rail exposes
the Source select + filter rows, a model-mutating edit still marks dirty — proven
via the **Discard** button enabling (Save query is always enabled, so it cannot
prove dirty); "Add filter"/updateFilter still mutate filters, "Run preview" calls
`previewListingQuery` and the canvas renders the bound-query badge + result cards,
and the inspector sort/limit/fields controls stay wired (dirty + payload preserved).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/listing-editor-restyle.test.tsx`
  (new suite in L04)
- Re-run `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  to confirm the query payload/cache contract is unaffected.
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-16-L02`.
- If a local `ListingEditorFrame` wrapper or InspectorRow helper is introduced,
  note it alongside the TASK-479-06 shell notes so other functional editors
  (Pages/Posts/Forms) can reuse the same restyled editor-frame shape.
