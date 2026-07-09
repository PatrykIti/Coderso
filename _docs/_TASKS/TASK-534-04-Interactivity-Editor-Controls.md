# TASK-534-04: Editor CONTROLS — Switcher Tabs, Gallery Filter, ScrollHint, Magnetic/Noise Toggles

# FileName: TASK-534-04-Interactivity-Editor-Controls.md

**Parent Task:** TASK-534
**Priority:** High
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Large
**Status:** ⏳ To Do

---

## Scope

Controls subtask. Edits DISJOINT labelled `// ── TASK-534 ──` regions of
`core/services/pages/pageEditorControlRegistry.ts` (per-type + universal), and
`core/services/pages/pageEditorControlUiModel.ts` (ONLY if a new control kind is
needed for the switcher tabs editor), and a NEW `core/admin/ui/pages/editorControls/*`
component IF the switcher-tabs UI cannot reuse the existing `"items"` editor. Does NOT
touch `pageEditorOptions.ts`: the `blockOptionCopy.switcher`/`.scrollHint` palette copy is
OWNED BY 534-01-L01 (the atomic exhaustive-`Record<PageBlockType,…>` model land — leaving
it here would break root `tsc` the moment 534-01 lands; see 534-01-L01 and 534-04-L03).
Depends on 534-01 (imports enum/type read-only). Every control has a resolved-default hint
(TASK-506 discipline) and reset-to-default (TASK-506 F1) via the existing
`blockPropControl`/`control` helpers.

## Leaves

| Leaf | Scope |
|------|-------|
| **534-04-L01** | Switcher tabs control (`props.tabs` editor + `variant` segmented + `activeIndex`) + the new UI kind if needed |
| **534-04-L02** | Gallery filter controls (`filterable` switch + `filterCategories` list + per-item `category`) |
| **534-04-L03** | ScrollHint controls (`glyph`/`label`) + universal `magnetic` toggle + section `noiseOverlay` toggle + page-settings `noiseOverlay` toggle |
| **534-04-L04** | Control-registry Vitest tests |

## Coordination

- `pageEditorControlRegistry.ts` = documented additive seam; each leaf owns its
  DISJOINT const region (per-type `switcher`/`scrollHint`/`gallery` entries; the
  single universal `block.style.magnetic` line appended to
  `pageUniversalBlockControls` `:449`; the section `noiseOverlay` line appended to
  `pageUniversalSectionControls`). Disjoint from 531/532/533 regions.
- A NEW control kind (`"switcherTabs"`) spans TWO files ONLY if the existing `"items"`
  kind (label+href) cannot express a label-ONLY tab list: the `PageEditorControlInput`
  string-literal union lives in `pageEditorControlRegistry.ts:67-89` (add `| "switcherTabs"`
  there), and the `PageEditorControlUiModel` union + its resolve mapping (`case
  "switcherTabs"`) live in `pageEditorControlUiModel.ts` (union `:43-87`, resolve switch
  near `:407`). Prefer reusing `"items"` (ignore href) over adding the kind; decide in
  534-04-L01. Confine each edit to a labelled 534 region.
- `pageEditorOptions.ts` = NOT owned by 534-04. The `blockOptionCopy.switcher` /
  `.scrollHint` palette entries are OWNED BY 534-01-L01 (atomic exhaustive-record land,
  mirroring `customSvg` `:110` with the real `{ label, description }` shape — no `icon`).
  This matches 534-04-L03 (which explicitly MOVED it out) and the parent contract; leaving
  it here would break the 534-01 root-`tsc` gate (two required keys missing).
- Page-settings `noiseOverlay` toggle lives in the compact Effects panel — GROUND
  where TASK-521-05 put the Effects section (`PageEditor.tsx` compact panel) and add
  the toggle there IF that is where `cursorSpotlight` lives; otherwise expose it via
  the universal section control only (534-04-L03 decides after grounding).
