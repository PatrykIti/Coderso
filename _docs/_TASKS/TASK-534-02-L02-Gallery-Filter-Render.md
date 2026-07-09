# TASK-534-02-L02: Gallery Filter Render (chips + `data-category` + `[data-gallery]`/`[data-filter-item]`)

# FileName: TASK-534-02-L02-Gallery-Filter-Render.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-02
**Priority:** High
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits `renderGallery` in `core/services/pages/pageRendererV2.tsx`
(`:1379`) — when `props.filterable`, wraps the grid in a `[data-gallery]` host, emits a
filter-chip bar (`role="tablist"`, `[data-gallery-filter]` with `[data-filter]` chips for
"all" + each category), and stamps each figure with `[data-filter-item]` + `data-category`
(from the per-item `category`). Reproduces the prototype portfolio filter
(`_docs/projekty-domow-wow-site/assets/app.js:88-100`). Disjoint from L01/L03.

**ALSO extends the render-side gallery-item structure** (in a labelled `// ── TASK-534 ──`
region), because `item.category` does NOT exist on the current render item shape: the
renderer's `PageGalleryItem` type (`:1336`) is `{src,alt,caption}` and `toGalleryItem`
(`:1356-1368`) returns exactly those three keys, DROPPING everything else. So reading
`item.category` is a TypeScript error, and even cast it would be `undefined` because
`toGalleryItem` never carries it. This leaf therefore (a) adds `category?: string` to
`PageGalleryItem` (`:1336`), and (b) makes `toGalleryItem` re-sanitize + pass `category`
(per space-split token, single-token pattern, re-joined) — both in a labelled 534 region.
This render-side item type is a SEPARATE structure from the model item shape (534-01-L01);
BOTH need the field.

## Grounded anchors

- `renderGallery` `:1379-…`: `layout` resolve `:1380`, `items` map via
  `toGalleryItem` `:1384-1386`, empty-state `:1388-1397`, grid host
  `<div className={pageGalleryGridClass(layout)} data-page-gallery …>` `:1399-1404`,
  per-item `<figure … data-page-gallery-item>` `:1405-1413`.
- `PageGalleryItem` type `:1336` (`{src,alt,caption}`) — ADD `category?: string` (534
  region). `toGalleryItem` `:1356-1368` returns exactly `{src,alt,caption}` and DROPS all
  other keys — ADD a `category` passthrough here (534 region): re-sanitize the raw
  `value.category` per space-split token against the single-token
  `/^[\w-]{1,48}$/`, re-join valid tokens with a space, and include `category` on the
  returned item ONLY when at least one valid token remains (present-only). `readGalleryItemText`
  `:1342` is the existing helper precedent for reading item keys. NOTE: this is a SEPARATE
  structure from the model gallery item (534-01-L01 handles the MODEL `normalizeGalleryItems`);
  the render item type also needs the field or `item.category` is a typecheck error.
- `renderGallery` signature is `(block: PageBlockV2)` (no `context`) — the filter
  render needs NO context (pure block props).

## Implementation pseudocode

```tsx
// ── TASK-534 ── extend the render item shape (:1336) + mapper (:1356) so category
// survives to renderGallery. Without this, `item.category` is a typecheck error and
// toGalleryItem would drop it anyway.
type PageGalleryItem = {
  src: string;
  alt: string;
  caption: string;
  category?: string;   // 534: space-joined single-token set, present-only
};
const CATEGORY_TOKEN = /^[\w-]{1,48}$/;   // single token, NO space (534-01-L01)
const toGalleryItem = (value: unknown): PageGalleryItem | null => {
  /* …existing src/alt/caption resolution (:1357-1366), returns null the same… */
  const catTokens = readGalleryItemText(isRecord(value) ? value : {}, "category")
    .split(/\s+/).filter((t) => CATEGORY_TOKEN.test(t));
  const category = catTokens.length ? catTokens.join(" ") : undefined;
  return { src, alt, caption, ...(category ? { category } : {}) };   // present-only
};

const renderGallery = (block: PageBlockV2) => {
  const layout = /* …existing… */;
  const items = /* …existing map+filter… */;
  // ── TASK-534 ── present-only filter. Re-validate at render (never trust stored):
  const filterable = block.props.filterable === true;
  // GALLERY_CATEGORY_PATTERN = /^[\w-]{1,48}$/ — a category is a SINGLE token, NO space
  // (534-01-L01, resolved 2026-07-09): the runtime filter treats data-category as a
  // space-separated SET, so a space must NOT live inside one category token.
  const CATEGORY_TOKEN = /^[\w-]{1,48}$/;
  const categories = filterable
    ? [...new Set(
        (Array.isArray(block.props.filterCategories) ? block.props.filterCategories : [])
          .filter((c): c is string => typeof c === "string" && CATEGORY_TOKEN.test(c))
      )].slice(0, 12)
    : [];
  if (items.length === 0) return /* …existing empty state (no filter bar)… */;

  const grid = (
    <div className={pageGalleryGridClass(layout)} data-page-gallery="true"
         data-page-gallery-layout={layout}>
      {items.map((item, index) => {
        // re-sanitize the item category at render (defence in depth). An item may hold
        // MULTIPLE space-joined single-token categories, so validate PER token, keep the
        // valid ones, re-join with a space; undefined ⇒ no data-category emitted.
        const rawCat = typeof item.category === "string" ? item.category : "";
        const catTokens = rawCat.split(/\s+/).filter((t) => CATEGORY_TOKEN.test(t));
        const cat = catTokens.length ? catTokens.join(" ") : undefined;
        return (
          <figure key={`${block.id}-gallery-${index}`}
            className={/* …existing… */}
            data-page-gallery-item="true"
            {...(filterable ? { "data-filter-item": "true" } : {})}
            {...(filterable && cat ? { "data-category": cat } : {})}>
            {/* …existing img/caption… */}
          </figure>
        );
      })}
    </div>
  );

  if (!filterable || categories.length === 0) return grid;   // present-only: no bar

  return (
    <div data-gallery="true">
      <div role="tablist" data-gallery-filter className="cx-gallery-filter">
        <button type="button" role="tab" data-filter="all"
          aria-selected="true" className="cx-filter-chip">All</button>
        {categories.map((c) => (
          <button key={c} type="button" role="tab" data-filter={c}
            aria-selected="false" className="cx-filter-chip">{c}</button>
        ))}
      </div>
      {grid}
    </div>
  );
};
```

**Progressive enhancement:** no-JS ⇒ all items visible, chips inert (the runtime
adds `.is-hidden`). **A11y:** chip bar is a `role="tablist"` of keyboard-focusable
buttons.

## Security note

`filterable` is a boolean; category strings (chip labels, chip `data-filter`
values) are RE-SANITIZED at the render boundary against the single-token
`/^[\w-]{1,48}$/` (NO space — matching the 534-01-L01 write sanitize); the item
`data-category` (a space-joined SET) is re-sanitized PER space-split token against the
same pattern and re-joined (defence in depth), so a value that somehow bypassed the write
path can NEVER `"`-break out of the `data-category`/`data-filter` attribute nor inject
markup; an out-of-pattern token is DROPPED. Chip text is an escaped React TEXT node. No
`dangerouslySetInnerHTML`, no interpolation into a `style`/attribute beyond the
bounded token.

## Test lane

**Vitest render** (`renderToString`, `tests/vitest/pages/`) — delegated to
534-02-L04, asserted here: a gallery with `filterable:true` +
`filterCategories:["modern","eco"]` + items tagged `category` renders a
`[data-gallery-filter]` chip bar ("All"+2), `[data-filter-item]` +
`data-category="modern"`/`"eco"` on the figures, wrapped in `[data-gallery]`; an item in
MULTIPLE categories (`category:"modern eco"`) emits `data-category="modern eco"` (both
tokens preserved, space-joined); a category containing a space in a SINGLE chip
(`"modern eco"` in `filterCategories`) is REJECTED by the single-token pattern (dropped —
NOT emitted as one chip); a gallery WITHOUT `filterable` renders BYTE-IDENTICAL to today
(no bar, no `data-filter-item`, no `[data-gallery]` wrapper); a bad category token is
dropped (no `data-category` breakout); an item with NO/absent `category` yields NO
`data-category` attribute, and a valid `category` round-trips through `toGalleryItem` to
the figure (guards the `PageGalleryItem`/`toGalleryItem` extension so a stripped field is
caught).

## Regression / owned-breaking-test notes

- **Owned:** the existing `renderGallery` render test(s) in `tests/vitest/pages/*`
  assert the un-filtered gallery HTML. The present-only guard means the un-filtered
  path is UNCHANGED — those tests must still pass byte-identically (this is the
  byte-identity invariant); ADD a new filtered-gallery case rather than mutating the
  existing one.

## Hard Invariants

1. Present-only: `filterable` unset ⇒ `renderGallery` output byte-identical to today;
   an item with no valid category emits no `data-category`.
2. Category tokens re-sanitized at render against the single-token `/^[\w-]{1,48}$/`
   (NO space; item `data-category` validated per space-split token, re-joined); text escaped.
3. Progressive: no-JS ⇒ all items visible; DOM contract matches 534-01-L03 runtime
   (`[data-gallery]`/`[data-gallery-filter]`/`[data-filter]`/`[data-filter-item]`/
   `data-category`).
4. Scope includes extending the render-side `PageGalleryItem` type (`:1336`, add
   `category?`) and `toGalleryItem` (`:1356`, re-sanitize + pass `category`) in a labelled
   534 region — NOT only `renderGallery` — because the item shape drops unknown keys.
