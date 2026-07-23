# TASK-534-04-L02: Gallery Filter Controls (`filterable` + `filterCategories` + per-item `category`)

# FileName: TASK-534-04-L02-Gallery-Filter-Controls.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-04
**Priority:** High
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Populates the currently-empty `pageBlockControlRegistry.gallery`
(`:1065`, `gallery: []`) with the filter controls (labelled `// ── TASK-534 ──`
region): a `filterable` switch, a `filterCategories` list editor, and — where the
gallery item editor lives — a per-item `category` field. Reproduces the prototype
portfolio filter authoring. Disjoint from L01/L03.

## Grounded anchors

- `pageBlockControlRegistry.gallery = []` `:1065` (empty today — this leaf is the
  first to add gallery controls; the gallery block currently has only its palette
  default + canvas `items` authoring).
- `blockPropControl` helper; `input:"switch"` (boolean, e.g. `list.ordered` `:1079`),
  `input:"items"` (structured list editor `:81`).
- The gallery `items` editor: GROUND how `gallery.items` is authored today (canvas
  vs a control) — the per-item `category` field is added THERE (extend the item-row
  editor) if `items` is control-driven; else expose `filterCategories` as the chip
  vocabulary and document that items reference categories by matching string.
- `GALLERY_FILTER_CATEGORY_MAX` from 534-01-L01 (import read-only).

## Implementation pseudocode

```ts
// ── TASK-534 ── gallery filter controls (pageBlockControlRegistry.gallery)
gallery: [
  blockPropControl("gallery", "layout", {           // (surface existing layout too)
    label: "Layout", input: "segmented", panel: "style",
    options: pageGalleryLayouts,                     // ground the existing layout enum
  }),
  blockPropControl("gallery", "filterable", {
    label: "Filterable", input: "switch", panel: "content",
  }),
  blockPropControl("gallery", "filterCategories", {
    label: "Filter categories", input: "items", panel: "content",   // label-only tokens
    // (max GALLERY_FILTER_CATEGORY_MAX; each row is a category string, kebab-sanitized on save)
  }),
],
// per-item category: extend the gallery items editor row (if control-driven) with a
// `category` text field; committed onto item.category (kebab-sanitized at write).
```

**Present-only:** the controls only WRITE `filterable`/`filterCategories`/
`item.category` when set; unset ⇒ omitted (byte-identity).

## Security note

Controls produce values re-normalized on save: `filterable` boolean-coerced,
`filterCategories`/`item.category` kebab-sanitized (`GALLERY_CATEGORY_PATTERN`,
534-01-L01) with out-of-pattern tokens DROPPED, so no `"`-breakout token can be
authored into the `data-category` attribute. No normalization bypass at the control
layer.

## Test lane

**Vitest** (`page-editor-control-registry.test.ts`) — 534-04-L04: the `gallery`
type resolves the `filterable` switch + `filterCategories` list controls; the UI
model maps them; a category with disallowed chars is dropped on the write path
(cross-check with 534-01-L04 model test).

## Regression / owned-breaking-test notes

- **Owned:** `gallery` moving from `[]` to a populated per-type array may break a
  registry snapshot/count assertion in `page-editor-control-registry.test.ts` —
  update in this commit. If surfacing the existing `layout` prop as a control is
  out of scope, drop that line (keep ONLY filter controls) to minimize the diff.

## Hard Invariants

1. Present-only writes (unset ⇒ omitted).
2. Category tokens kebab-sanitized on save (no attribute-breakout authorable).
3. No normalization bypass.
