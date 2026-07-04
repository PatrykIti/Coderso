# TASK-505-02: Section Grid Renderer

# FileName: TASK-505-02-Section-Grid-Renderer.md

**Parent Task:** TASK-505
**Priority:** High
**Category:** Custom-Screens — renderer (builder / preview / published entry)
**Estimated Effort:** Medium
**Dependencies:** **TASK-505-01** (ships `ScreenSectionStyleV1`, `screenSectionColumnPresets`, `ScreenSectionColumnPreset`, the `normalizeScreenSectionStyle` normalizer + Ajv mirror + `ScreenSectionPatch` `style`). Rides TASK-498/500/503 (data-oriented builder, `ScreenInsertTarget` insertion targeting, section CRUD, the 503 block `style` width/align channel).
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Scope

Consume the **new** `section.style?.columns` channel (landed by 505-01) in the **one shared** block-list container so a section renders its blocks as a `display:grid` with a preset-derived `grid-template-columns` + `columnGap`, in **builder + preview + published entry** (single code path). **Absent `columns` = today's `space-y-4` vertical stack, byte-identical DOM.** Block assignment = **auto-flow** (each block = one cell, DOM order, filling columns left-to-right); the TASK-503 per-block `width` (`w-1/2` …) stays a **within-cell** fraction (no column-span double-meaning); TASK-500 drop-zones keep working inside a gridded section.

**Builder gap/grid tension — RESOLVED, do not re-introduce.** In builder mode `canInsert` is always true (line 358: `mode==="builder" && Boolean(onSetInsertPoint)`), so the shared container's children are, in DOM order, `gap0, block0, gap1, block1, …, gapN` — one `renderInsertGap` `<button>` interleaved *between every pair of blocks*. If each such gap became a `display:grid` child it would consume a cell; and if we "fixed" that by giving every gap `grid-column: 1 / -1` (a full-row item), CSS sparse auto-placement would force **each block onto its own row** (`gap0`→row1, `block0`→row2/col1, `gap1` cannot fit at row2/col2 so advances to row3, `block1`→row4/col1, …) — a `"2"`/`"3-1"` section would stack one-block-per-row in column 1 and **never sit side-by-side**, silently breaking the primary feature *in the builder, the owner's main editing surface*. **Therefore, inside a gridded section the builder does NOT interleave inter-block gaps.** Reorder/insert *between* cells is served by the already-present per-card before/after-midpoint drop targets (`cardDropTargets` / `resolveCardDropTarget`, 650–657); only the **section-start** (index 0) and **section-end** (index N) gaps are rendered, each as a full-row (`grid-column: 1 / -1`) affordance so they never steal a cell and never split a row. Non-gridded sections keep every gap exactly as today (byte-identical). Do **NOT** reach for `grid-auto-flow: dense` — it reorders blocks away from DOM order, breaking auto-flow determinism and drop-target semantics.

**Sole writer of** `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`. No other file. Opens only **after** 505-01 lands green (the type + `section.style` are imported from `customScreenSchemas`).

---

## Security Contract

**UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration.**

This subtask is **pure client render** and adds **zero** persisted state, route, RBAC bucket, endpoint, or migration. Verified (Read + `grep -an` on `ScreenRuntimeRenderer.tsx`):

- The renderer is a presentational component (`export function ScreenRuntimeRenderer(...)`); it **reads** `section.style` and emits className/inline-style only — it never writes, fetches, or validates. All validation/persistence stays in 505-01's `normalizeCustomScreenDefinitionForWrite` on the existing `PATCH /custom-screens/:id` (`content:write`-gated) path.
- The grid `style` object is derived from an **enum-validated** preset (`screenSectionColumnTemplate[preset]`, a closed literal map) + a clamped int gap — no user string reaches CSS unescaped, no `dangerouslySetInnerHTML`, no URL/HTML sink. The template map's key type is `ScreenSectionColumnPreset` (exhaustive `Record`), so an out-of-enum value is impossible at the type level and 505-01's normalizer already coerced junk → `"1"`.
- **Absent `section.style` ⇒ no `style` attr + `space-y-4` ⇒ byte-identical DOM to today**, so stored-V4 docs round-trip unchanged (no `schemaVersion`/definition-version bump).

---

## Grounded anchors (Read + `grep -an`, `ScreenRuntimeRenderer.tsx` @ 1772 lines)

| Anchor | Line(s) | Note |
|---|---|---|
| Type import block from `customScreenSchemas` | 15–21 | add `type ScreenSectionColumnPreset` here |
| `cn` import | 12 | `@/lib/utils` |
| `screenBlockWidthClass` (503 within-cell widths) | 163–169 | `half: "w-1/2"` … — **UNCHANGED** (stays within-cell) |
| `renderInsertGap` helper (returns a `<button>`, `className={cn(...)}`, **no `style` prop today**) | 389–433 | add optional `{ fullRow?: boolean }` → `style={{ gridColumn: "1 / -1" }}` (only the section-start/end gaps set it) |
| `canInsert` (`mode==="builder" && Boolean(onSetInsertPoint)`) | 358 | always true in the real editor ⇒ the builder path is the one that interleaves gaps |
| `cardDropTargets` / `resolveCardDropTarget` (per-card before/after-midpoint drop targets) | 650–657 | **already present** — serves builder reorder/insert *between* cells in a gridded section (replaces the dropped inter-block gaps) |
| `renderSlots` container (**separate** `md:grid-cols-2` slot grid) | 452 | out of scope; its inner gaps are within-slot vertical stacks, **not** section cells |
| `renderBlock` `wrap()` root div (width/align class applied here) | 659–664 | **UNCHANGED** — 503 width composes as within-cell |
| `document.sections.map` (section render body) | 1551 | `section.style` available here |
| `sectionDragHover` / `sectionEndTarget` | 1554–1558 | grid derivation goes right after |
| **Section block-list container** (`cn("space-y-4", sectionDragHover && …)`, `data-screen-section-dropzone`, **no `style` prop today**) | 1708–1725 | **THE grid emission site** |
| Section-index `renderInsertGap` calls (builder path) | 1731, 1750 | in a gridded section render **only** the start (index 0) + end (index N) gaps, each `{ fullRow: true }`; skip the inter-block gaps (they'd break the columns) |
| Block `map` (builder + preview/entry paths) | 1729–1760 | one container, both paths → single code path; the builder map's per-index gap becomes conditional on `!gridded` (inter-block only) |
| Empty-section message div | 1762–1764 | give `grid-column:1/-1` when gridded (rare edge; else sits in col 1) |

---

## Execution-ready changes (ScreenRuntimeRenderer.tsx — ONLY)

### 1. Import the preset type AND the template map (line 15–21 block)

The preset→`grid-template-columns` map is the **single source of truth exported by 505-01** (`customScreenSchemas.ts`); the renderer **imports** it (value import) rather than re-declaring a local copy, so the two files can never drift:

```ts
import {
  normalizeScreenImageSrc,
  screenSectionColumnTemplate, // ← 505-01 (value): preset → grid-template-columns fr map
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
  type ScreenSectionColumnPreset, // ← 505-01
} from "../../../services/customScreens/customScreenSchemas";
```

### 2. Preset → `grid-template-columns` map: IMPORTED from 505-01 (do NOT redeclare)

The map is **owned + exported by 505-01** (`customScreenSchemas.ts`, `export const screenSectionColumnTemplate: Record<ScreenSectionColumnPreset, string>`) — see the import added in step 1. It is an exhaustive `Record` keyed by `ScreenSectionColumnPreset`, so a new preset without a template row is a COMPILE error at the owner, not a runtime "undefined column". The renderer **does NOT declare its own copy** (single source of truth = 505-01; a duplicated local map would be drift-prone). The renderer only adds its own module-scope gap default:

```ts
// Default gap = 16px == the space-y-4 vertical rhythm (1rem), so switching a
// section from stack→grid at gap-default reads as the same density.
// (Renderer-local; 505-01 owns the preset → grid-template-columns map itself.)
const SCREEN_SECTION_COLUMN_GAP_DEFAULT = 16;
```

### 3. Derive grid state inside the section map (right after `sectionDragHover`, ~line 1558)

```ts
const sectionDragHover = mode === "builder" && isDragHover(sectionEndTarget);
// TASK-505-02: grid emission is decided ONCE here and threaded to the
// container + the section-index insert-gaps. Absent columns → gridded=false →
// nothing changes (byte-identical to today).
const columns = section.style?.columns;
const gridTemplate = columns ? screenSectionColumnTemplate[columns] : undefined;
const gridded = gridTemplate !== undefined;
```

### 4. Section block-list container becomes grid (lines 1708–1725)

Swap the class token and add an inline `style` **only** when gridded (so absent-style emits no `style` attr → byte-identical):

```ts
<div
  className={cn(
    gridded ? "grid" : "space-y-4",           // ← was always "space-y-4"
    sectionDragHover && "rounded-lg bg-primary/5 ring-1 ring-primary/50"
  )}
  style={
    gridded
      ? {
          gridTemplateColumns: gridTemplate,
          gap: section.style?.columnGap ?? SCREEN_SECTION_COLUMN_GAP_DEFAULT,
        }
      : undefined                              // ← absent-style ⇒ no style attr
  }
  {...(mode === "builder"
    ? {
        "data-screen-section-dropzone": section.id,
        "data-drag-hover": sectionDragHover ? "true" : undefined,
        ...dropHandlers(sectionEndTarget),
      }
    : {})}
>
```

- `sectionDragHover` ring, `data-screen-section-dropzone`, and `dropHandlers(sectionEndTarget)` are **all preserved** — the section-end dropzone stays live inside a gridded section.
- Each `renderBlock(...)` output is a direct grid child ⇒ **auto-flow** fills cells left-to-right in DOM order. The preview/entry path (1757–1759) emits **only** blocks (no gaps) → already gap-free → columns render directly.
- **Builder path (1727–1755) — the interleaved gaps must NOT stay full-row siblings between cells** (see Scope "Builder gap/grid tension"). See step 5 for the exact conditional: in a gridded section render only the section-start + section-end gaps; between-cell reorder/insert rides `cardDropTargets` (650–657), which is already emitted per block regardless of grid.

### 5. Gap affordances in a gridded section: section-start/end only, full-row (helper @ 389; call sites @ 1731, 1750)

Two coupled changes — a `fullRow` flag on the helper **and** dropping the inter-block gaps when gridded (the flag alone is not enough; see Scope "Builder gap/grid tension"):

**5a. Helper — optional `fullRow` (so the start/end gaps span the row instead of stealing a cell):**

```ts
const renderInsertGap = (
  target: Extract<ScreenInsertTarget, { kind: "section-index" | "slot-index" }>,
  options?: { fullRow?: boolean } // TASK-505-02
) => {
  if (!canInsert) return null;
  ...
  return (
    <button
      ...
      className={cn( /* unchanged */ )}
      style={options?.fullRow ? { gridColumn: "1 / -1" } : undefined} // ← NEW
      ...
    >
```

**5b. Builder block map (1729–1755) — no inter-block gaps when gridded.** In the builder loop, render the per-index gap **only when `!gridded`** (it is the inter-block affordance that would force each block onto its own row); the trailing section-end gap always renders. Both the surviving gaps pass `{ fullRow: gridded }`:

```ts
{section.blocks.map((block, index) => (
  <Fragment key={block.id}>
    {(!gridded || index === 0) &&
      renderInsertGap(
        { kind: "section-index", sectionId: section.id, index },
        { fullRow: gridded } // start gap spans the row when gridded
      )}
    {renderBlock(block, {
      sectionId: section.id,
      suppressed: false,
      dropTargets: { /* before/after — UNCHANGED: powers cardDropTargets reorder/insert */ },
    })}
  </Fragment>
))}
{renderInsertGap(
  { kind: "section-index", sectionId: section.id, index: section.blocks.length },
  { fullRow: gridded } // end gap spans the row when gridded
)}
```

- **Gridded builder DOM order** is thus `gap0(full-row), block0, block1, …, blockN-1, gapEnd(full-row)` → the two full-row gaps sit on their own rows at top/bottom and the blocks auto-flow left-to-right across the columns in between → **side-by-side**. The `dropTargets` before/after props are **UNCHANGED**, so `cardDropTargets`/`resolveCardDropTarget` (650–657) still give a live before/after-midpoint insert/reorder target on **every** card — the between-cell affordance the dropped inter-block gaps used to provide.
- **Non-gridded builder** keeps the per-index gap for every index (`!gridded` is true) with `fullRow` falsy ⇒ `style=undefined` ⇒ **byte-identical** to today.
- **Slot-index** gaps (`renderSlots`, 496/506) pass **no** options → `style=undefined` → byte-identical; they live in the separate `md:grid-cols-2` slot grid where each slot is a vertical stack, so they are not section cells.

### 6. Empty-section message spans full row when gridded (lines 1762–1764)

Rare edge (a gridded section with zero blocks): keep the message centered across the row instead of stuffed into cell 1:

```ts
<div
  className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
  style={gridded ? { gridColumn: "1 / -1" } : undefined}
>
  Empty section
</div>
```

### Data flow (top-down, no new state)

```
505-01 normalize → document.sections[i].style.columns (ScreenSectionColumnPreset | undefined)
  → renderer section map: columns → screenSectionColumnTemplate[columns] → gridTemplate → gridded
      → container div: className "grid"|"space-y-4" + style{gridTemplateColumns,gap} | undefined
      → blocks (auto-flow cells, DOM order, side-by-side) + width/align class stays within-cell
      → builder gaps: gridded ⇒ ONLY start+end gaps, {fullRow:true} → grid-column 1/-1 (own row, never a cell);
        inter-block reorder/insert served by existing cardDropTargets (per-card before/after midpoint)
        non-gridded ⇒ every gap as today (byte-identical)
```

No callback, no `onPatch`, no host round-trip — the renderer is read-only over the normalized document. The **write** side (inspector → `updateScreenSection`) is 505-03.

### What must NOT change (regression guard)

- The 503 `wrap()` width/align classes (`screenBlockWidthClass`, 163–169; applied 659–664) — **unchanged**; `w-1/2` = half the *cell*.
- No new per-block `columnSpan`/`columnStart` (DEFERRED — a later `ScreenBlockStyleV1.span/start`); do **not** overload block `width` into a span.
- No `@/ui/pages` import (Bun-free authoring boundary); imports stay from `services/customScreens/*`, `@/lib/utils`, `@/ui/authoring`, `@/ui/entries`, `@/components/ui/*`.
- PaletteChip dead-code guard, ScreenDocumentV1 `schemaVersion 1` / definition v4 — untouched.

---

## Error-message shape

N/A for this subtask (no validation/persistence surface here). The `custom_screen_definition_invalid` field-name plumbing is Item B / 505-01. The renderer's only defensive path is the exhaustive `Record` type: an out-of-enum `columns` cannot reach the map (505-01 coerces junk → `"1"`, and the `Record<ScreenSectionColumnPreset, string>` key type makes a missing row a compile error).

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`. This subtask is **Vitest / Bun-free** (pure React render — no route). The save/error Bun suite belongs to 505-01/505-04.

### Vitest — `ScreenRuntimeRenderer` render suite (Bun-free custom-screens; runs green with the other custom-screens vitest suites)

Render via the existing custom-screens render harness; assert **computed markup**, not internals:

1. **Grid emission per preset.** A section with `style.columns: "2"` ⇒ block-list container has class `grid` and inline `grid-template-columns: 1fr 1fr`; `"3-1"` ⇒ `3fr 1fr`; `"1-1-1-1"` ⇒ `1fr 1fr 1fr 1fr`. Assert against `screenSectionColumnTemplate` (table-driven over all 13 presets).
2. **Gap wiring.** `columnGap: 24` ⇒ container inline `gap: 24px`; absent `columnGap` (but `columns` set) ⇒ `gap: 16px` (default). 
3. **Absent-style DOM identity (byte-stability guard).** A section with **no** `style` (and one with `style: {}` post-normalize → still `undefined`) ⇒ container class is exactly `space-y-4` (no `grid`) and has **no** inline `style` attr; snapshot equals the pre-505 baseline.
4. **Gridded builder gaps = start+end only, full-row (no inter-block gaps).** In `mode="builder"` with `canInsert`, a gridded section (N≥2 blocks) exposes **exactly two** `data-screen-insert-gap` buttons — the section-start (`data-insert-index="0"`) and section-end (`data-insert-index="N"`) — each carrying inline `grid-column: 1 / -1`, and **no** gap button appears *between* two block cards (no `data-screen-insert-gap` sibling with an index in `1..N-1`). A **non-gridded** section keeps a gap at every index (N+1 total) with **no** inline `style` (byte-identical). Slot-index gaps (`renderSlots`) never get `grid-column` regardless of section grid.
5. **Builder side-by-side placement (Parent Acceptance #1/#2 — the primary ask).** In `mode="builder"` with `canInsert`, a `"2"`-column section with ≥2 blocks emits its block cards as **direct, consecutive grid children with no full-row grid sibling interleaved between them** (assert: between `block[i]` and `block[i+1]` there is no element carrying `grid-column: 1 / -1` — i.e. no gap/wrapper that would push `block[i+1]` to the next row). Equivalently, the container's direct children are `[gap(full-row), block0, block1, …, blockN-1, gap(full-row)]` so blocks `0..N-1` are adjacent cells on shared rows. This is the assertion that fails if an implementer re-introduces inter-block full-row gaps (the HIGH regression), so the builder-column break cannot ship green. Pair with a `"3-1"` case (Parent Acceptance #2, "Bathrooms: 2" label-left/value-right composition: block0 in col1, block1 in col2 of the same row, not stacked).
6. **Auto-flow / DOM order (preview + entry).** In `mode="preview"`/`"entry"` (gap-free path), N blocks in a gridded section ⇒ **exactly N** direct grid children in source order, each = one cell (no wrapper injected between container and block); reorder ⇒ children reorder (DOM order asserted). *Scoped to preview/entry: in builder the direct grid children are the N blocks **plus** the two start/end full-row gaps (2 gap siblings, never inter-block) — see tests 4/5.*
7. **503 width stays within-cell.** A block with `style.width: "half"` inside a gridded section still emits `w-1/2` on its `wrap()` root (not a column-span); no `grid-column` on the block.
8. **Drop-zones intact in a gridded section.** The container still exposes `data-screen-section-dropzone={section.id}` + drag handlers when gridded; the per-card before/after-midpoint targets (`cardDropTargets` / `resolveCardDropTarget`, 650–657 — the between-cell reorder/insert affordance that replaces the dropped inter-block gaps) and the section-end target are present.
9. **Empty gridded section.** Zero-block gridded section ⇒ "Empty section" message carries `grid-column: 1 / -1`; non-gridded empty ⇒ no inline style (byte-identical).
10. **Preview + entry parity.** The same `style.columns` renders the same `grid` + template in `mode="preview"` and `mode="entry"` (single code path — one container).

### Boundary

- The authoring-boundary scan (no `@/ui/pages` import in custom-screens UI) must stay green for `ScreenRuntimeRenderer.tsx`.

### Named guards (this subtask)

- **Schema-first / reject-unknown** — enforced upstream (505-01); the renderer's exhaustive `Record<ScreenSectionColumnPreset,string>` is the type-level backstop (out-of-enum impossible).
- **Stored-V4 byte-stability** — absent `section.style` ⇒ `space-y-4` + no `style` attr (tests 3, 4, 9).
- **Auto-flow determinism** — DOM order == cell order (test 6, preview/entry); no `grid-auto-flow: dense`. Builder side-by-side is guarded by tests 4/5 (gridded builder keeps only start/end full-row gaps, no inter-block full-row sibling) so blocks never get shifted off their shared row.
- **Bun-free boundary** — no `@/ui/pages` import.
- **No schemaVersion bump / no new route** — render-only change.

### Runtime verification (this subtask's slice of the parent SMOKE)

The parent's ≥5 real-flow SMOKE scenarios are executed at **505-04** closure (playwright against `coderso-a.localhost:5173`). This subtask's renderer output is the substrate for parent Acceptance #1 (2-col + 3-1 computed `grid-template-columns`), #2 (Bathrooms: 2 label-left/value-right), #3 (auto-flow + start/end full-row gaps only, no inter-block gap sibling), #4 (drop-zones in a gridded section — section-end + per-card `cardDropTargets`), and #6 (absent-style byte-identical DOM). After landing, spot-verify **in the builder (the primary editing surface)** that a `"2"` and a `"3-1"` section show the computed `grid-template-columns` (`1fr 1fr` / `3fr 1fr`) in DevTools **and blocks sit side-by-side on shared rows** (NOT one-per-row in column 1 — the symptom of inter-block full-row gaps), that dragging a card still shows a before/after-midpoint drop highlight, and that an unset section is still a `space-y-4` stack.

---

## Deferred (not in this subtask)

Per-block `columnSpan`/`columnStart` span control; the section inspector + `handlePatchSection` write path (505-03); custom (non-preset) fr ratios; responsive per-breakpoint columns; nested-section grids.
