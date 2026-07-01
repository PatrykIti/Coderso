# TASK-500-01: Sections First-Class & Palette Unification
# FileName: TASK-500-01-Sections-First-Class-And-Palette-Unification.md

**Parent Task:** TASK-500
**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-498 (data-oriented builder + look parity — SHIPPED). Gates
TASK-500-02 (a real, selectable section is the target `addScreenBlockAt` steers into).
**Status:** ⏳ To Do

---

## Objective

Make screen sections **first-class** and collapse the builder to **one block
vocabulary**. Concretely (Scope item 1 of the parent):

1. **"Add section" CREATES a real, empty, named top-level section** — it no longer
   opens the command palette.
2. **Section management from the canvas:** select (which STEERS insertion),
   rename, reorder (up/down), delete (with binding cleanup).
3. **`selectedSectionId` steers `handleAddBlock`** — a new block lands in the
   SELECTED section, not always `sections[0]`. (This is the minimal targeting
   foundation; the full `ScreenInsertTarget` picker + drag is TASK-500-02.)
4. **Remove ONLY the command-palette FIELDS group** (a field is added by the
   `Field` chip and bound in the inspector) and **unify to ONE canonical KIND
   vocabulary sourced from a single constant** — the 9 chips PLUS the
   container/composite kinds the palette is the sole creation surface for today
   (`field-group` + `columns` — the two nesting containers 500-02 targets — and
   `record-header` + `rich-text`). Do NOT drop `field-group`/`columns` creation
   (that would make them UNCREATABLE and gut 500-02's nesting feature, leaving it
   no containers to nest into). If the searchable command palette survives, it
   MIRRORS that same canonical kind set **+ "Add section"**, not a divergent set.

Do NOT regress TASK-498 look parity, the presentation-override editing surface, the
Bun-free vitest boundary, `ScreenDocumentV1 schemaVersion:1`, or definition v4.

---

## Verified current-state anchors (re-checked against source)

- **Sections are FLAT.** `ScreenSectionV1 { id; type:"section"; label?; data; layout?;
  visibility?; blocks: ScreenBlockV1[] }` lives top-level in `ScreenDocumentV1.sections`
  (`customScreenSchemas.ts:126-139`). Sections do NOT nest; only blocks nest via
  `children?[]` / `slots?{}`. So section CRUD splices `document.sections` only.
- **Factory already exists.** `createScreenSection({ id?, label?, blocks? })`
  (`screenDocumentOps.ts:61-76`) seeds `id: createId("section")`, `type:"section"`,
  `label`, `data:{ title: label }`, `blocks:[]`. `addScreenSection` REUSES it.
- **Insertion lands in `sections[0]`.** `handleAddBlock`
  (`CustomScreenEditorPage.tsx:378-396`) → `resolveSelectedSlotTarget(document)`
  (`:367-376`, container-only) → `addScreenBlock(document, block, target?)`. With NO
  target, `addScreenBlock` (`screenDocumentOps.ts:393-427`) appends to the FIRST
  section. `selectedSectionId` state exists (`:171-173`) but does NOT steer insertion.
- **"Add section" is a lie.** `ScreenAuthoringCanvas.tsx:508-518`
  (`data-screen-add-section`) calls `setCommandOpen(true)` — it opens the command
  palette, never creating a section.
- **Two vocabularies.** The command palette `commandGroups`
  (`ScreenAuthoringCanvas.tsx:204-253`) exposes a "Blocks" group
  (record-header/field-group/columns/rich-text) + a "Fields" group (one command per
  `field`). The canonical palette `ScreenBlockLibrary.tsx:59-73` exposes the 9 chips
  (heading/text/field/stat/divider/image/related-list/tabs/button). These disagree.
- **Renderer section chrome.** `ScreenRuntimeRenderer.tsx:990-1056` maps
  `document.sections`, computes `selected = selectedSectionId === section.id`,
  `isInteractive = mode==="builder" && Boolean(onSelectSection)`, and renders the
  builder title as a plain `<div>` (`:1041-1043`). Selection wiring already flows
  through `onSelectSection`. Rename/reorder/delete are NEW affordances added here.
- **Binding cleanup helper exists.** `removeScreenBindingsForBlockTree(bindings,
  block)` (`screenDocumentOps.ts:713-720`) prunes a whole subtree's bindings via
  `collectScreenBlockIds`. Section delete reuses it per removed block.

---

## Security Contract / scope note

**UI/client-state + schema-first model; no route/RBAC/endpoint change.** All section
CRUD mutates the in-memory `definitionRef.current.editorView.document` client-side and
persists through the EXISTING custom-screen definition PATCH under existing RBAC.
**No schema key is added in 500-01** — `ScreenSectionV1` already allows
`id/type/label/data/layout/visibility/blocks` (`normalizeScreenSection`,
`customScreenSchemas.ts:591-616`), so `addScreenSection`/`renameScreenSection` produce
records that round-trip through the UNCHANGED reject-unknown normalizer.
**NO `ScreenDocumentV1.schemaVersion` bump** (stays `1`), definition stays v4, no DB
migration, no `normalize*` change. No API route, endpoint visibility, auth, CSRF, or
rate limit is touched.

---

## Execution-ready design

### A — Ops helpers (`core/services/customScreens/screenDocumentOps.ts`, Bun-free/pure)

Add pure functions next to `updateScreenSection`. Stable ids via existing
`createId("section")`; clamped indices; boundary no-op mirrors `moveScreenBlock`.

```ts
const clampIndex = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : max));

// Create + insert a real top-level section. atIndex clamps to [0, sections.length];
// default appends. Reuses createScreenSection (seeds data.title from label).
export function addScreenSection(
  document: ScreenDocumentV1,
  input: { label?: string; atIndex?: number } = {}
): { document: ScreenDocumentV1; sectionId: string } {
  const section = createScreenSection({ label: input.label ?? "Section" });
  const sections = [...document.sections];
  const at = clampIndex(input.atIndex ?? sections.length, 0, sections.length);
  sections.splice(at, 0, section);
  return { document: { ...document, sections }, sectionId: section.id };
}

// Rename: set BOTH label and data.title (the renderer prefers data.title,
// ScreenRuntimeRenderer.tsx:993-996). Empty/blank label falls back to "Section".
export function renameScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  label: string
): ScreenDocumentV1 {
  const clean = label.trim() || "Section";
  return updateScreenSection(document, sectionId, (section) => ({
    ...section,
    label: clean,
    data: { ...section.data, title: clean },
  }));
}

// Reorder one section up/down; clamp at ends → returns the SAME reference-equal
// document shape on a boundary no-op (mirror moveScreenBlock's guard).
export function moveScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  direction: "up" | "down"
): ScreenDocumentV1 {
  const index = document.sections.findIndex((s) => s.id === sectionId);
  if (index === -1) return document;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= document.sections.length) return document; // no-op
  const sections = [...document.sections];
  [sections[index], sections[target]] = [sections[target]!, sections[index]!];
  return { ...document, sections };
}

// Delete a section; return the removed record so the host can prune its bindings.
// Non-destructive: allowed to reach zero sections — ensureSectionForInsert re-seeds
// on the next add and the "Add section" affordance is always visible.
export function removeScreenSection(
  document: ScreenDocumentV1,
  sectionId: string
): { document: ScreenDocumentV1; removed: ScreenSectionV1 | null } {
  const removed = document.sections.find((s) => s.id === sectionId) ?? null;
  if (!removed) return { document, removed: null };
  return {
    document: { ...document, sections: document.sections.filter((s) => s.id !== sectionId) },
    removed,
  };
}

// 500-01 minimal targeting foundation (500-02 REPLACES this with addScreenBlockAt +
// the ScreenInsertTarget union). Appends `block` to the named section's top-level
// blocks; unknown sectionId FAILS SOFT to the first section (never throws in the
// editor path). This is what kills "always sections[0]".
export function appendScreenBlockToSection(
  document: ScreenDocumentV1,
  sectionId: string | null,
  block: ScreenBlockV1
): ScreenDocumentV1 {
  const base = ensureSectionForInsert(document); // reuse existing empty-doc guard
  const exists = sectionId && base.sections.some((s) => s.id === sectionId);
  const targetId = exists ? sectionId : base.sections[0]?.id ?? null;
  if (!targetId) return base;
  return {
    ...base,
    sections: base.sections.map((s) =>
      s.id === targetId ? { ...s, blocks: [...s.blocks, block] } : s
    ),
  };
}
```

**Error handling:** editor-path helpers never throw — unknown ids no-op or fail-soft to
the first section. The strict `normalizeScreenSection` / `normalizeScreenDocumentV1`
reject-unknown gate on SAVE is unchanged and remains the hard boundary.

### B — Palette unification

1. **`ScreenBlockLibrary.tsx`** — promote the palette to an EXPORTED canonical KIND
   constant so BOTH the chip grid AND the command palette read the exact same set
   (single source of truth). The canonical set is the 9 chips PLUS the
   container/composite kinds `field-group`/`columns` (and `record-header`/`rich-text`)
   the command palette is the SOLE creation surface for today — so unifying does NOT
   drop them:

```ts
export type ScreenPaletteChip = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  kind: ScreenBlockKind;
};
// Canonical kind vocabulary = single source of truth for BOTH the chip grid and the
// command palette: the existing 9 chips PLUS the container/composite kinds (field-group
// /columns are 500-02's nesting targets; record-header/rich-text are real
// createScreenBlock kinds — screenDocumentOps.ts:140/155/170/194).
export const SCREEN_PALETTE_CHIPS: readonly ScreenPaletteChip[] = [
  /* the existing 9: heading/text/field/stat/divider/image/related-list/tabs/button */
  { label: "Record header", icon: PanelTop,       kind: "record-header" },
  { label: "Field group",   icon: Layers,         kind: "field-group" },
  { label: "Two columns",   icon: LayoutPanelTop, kind: "columns" },
  { label: "Help text",     icon: Type,           kind: "rich-text" },
];
// PALETTE_CHIPS local const becomes `= SCREEN_PALETTE_CHIPS`; the chip grid now renders
// the full canonical set. (Equivalent per the parent: keep the 9 chips + a same-constant
// "Structure/Blocks" group — but ONE constant must feed both surfaces; do NOT reduce
// creation to only the 9 chips.)
```

2. **`ScreenAuthoringCanvas.tsx`** — rebuild `commandGroups` from the SAME canonical
   constant and drop ONLY the FIELDS group (the container/composite BLOCKS kinds stay):

```ts
const commandGroups = useMemo<AuthoringCommandGroup[]>(() => [
  {
    id: "blocks",
    label: "Blocks",
    commands: SCREEN_PALETTE_CHIPS.map((chip) => ({   // canonical set: 9 chips + field-group/columns/record-header/rich-text
      id: chip.kind,
      label: chip.label,
      description: screenBlockLabels[chip.kind],
      icon: chip.icon,
      run: () => onAddBlock(chip.kind),          // same handler the chip uses
    })),
  },
  {
    id: "structure",
    label: "Structure",
    commands: [
      { id: "add-section", label: "Add section",
        description: "Create a new top-level section.",
        icon: Plus, run: () => onAddSection() },
    ],
  },
], [onAddBlock, onAddSection]);
// DELETE ONLY the { id:"fields", ... } group and its `fields.map(...)`. `fields` stays a
// prop (still used by ScreenBlockLibrary + inspector) but no longer feeds the palette.
// The container/composite kinds (field-group/columns/record-header/rich-text) are NOT
// dropped — they ride the canonical SCREEN_PALETTE_CHIPS set so they stay creatable
// (field-group/columns are 500-02's nesting targets).
```

**Justification:** a field is added by the `Field` chip (`onAddBlock("field")`) and its
bound field chosen in the inspector's Bound-field control — the per-field command list
was the ONLY genuinely redundant second surface (parent Contract Audit §3). The palette
now mirrors the canonical kind set (9 chips + `field-group`/`columns`/`record-header`/
`rich-text`) + "Add section" and nothing else — the container/composite kinds are kept
so `field-group`/`columns` stay creatable for 500-02 to nest into.

### C — "Add section" creates a section

`ScreenAuthoringCanvas.tsx:508-518`: the dashed `data-screen-add-section` button's
`onClick` changes from `setCommandOpen(true)` → `onAddSection()` (still
`event.stopPropagation()` first so it doesn't clear selection). Keep the prototype look
verbatim (`CustomScreenEditorPreview.tsx:222-228`: dashed `rounded-2xl` card, `Plus` +
"Add section").

### D — Section chrome (select / rename / reorder / delete)

Thread new OPTIONAL props into `ScreenRuntimeRenderer` and render chrome only in
`mode === "builder"` when the section is selected (keeps preview/entry byte-identical).

```ts
// ScreenRuntimeRenderer props (additive, optional — preview/entry unaffected):
onRenameSection?: (sectionId: string, label: string) => void;
onMoveSection?:   (sectionId: string, direction: "up" | "down") => void;
onDeleteSection?: (sectionId: string) => void;
```

Replace the plain builder title `<div>` (`:1041-1043`) with a chrome row:
- **Unselected builder:** unchanged uppercase title text (look parity preserved).
- **Selected builder:** an inline rename input (seeded with `title`,
  `onBlur`/Enter → `onRenameSection(section.id, value)`), plus a control cluster:
  `MoveUp` (`onMoveSection(id,"up")`), `MoveDown` (`onMoveSection(id,"down")`),
  `Trash2` (`onDeleteSection(id)`). Buttons `stopPropagation` so they don't re-trigger
  section select. Test hooks: `data-screen-section-rename`,
  `data-screen-section-move-up`, `data-screen-section-move-down`,
  `data-screen-section-delete`. `aria-label`s: "Rename section", "Move section up",
  "Move section down", "Delete section".

`ScreenAuthoringCanvas` passes these props straight through to the two
`ScreenRuntimeRenderer` usages (builder canvas render) and adds `onAddSection` to its
prop type, forwarding the dashed button + the palette command.

### E — Host wiring (`CustomScreenEditorPage.tsx`)

```ts
// Insertion now respects the selected section (kills sections[0]-only default).
const handleAddBlock = (type: ScreenBlockKind, field?: ContentField) => {
  const current = definitionRef.current;
  const created = createScreenBlock({ type, field: field?.name, label: field?.label,
    relationTarget: field?.relation?.target });
  const containerTarget = resolveSelectedSlotTarget(current.editorView.document);
  const nextDocument = containerTarget
    ? addScreenBlock(current.editorView.document, created.block, containerTarget) // unchanged
    : appendScreenBlockToSection(                                                 // NEW default
        current.editorView.document,
        selectedSectionId ?? current.editorView.document.sections[0]?.id ?? null,
        created.block
      );
  updateEditorView({ document: nextDocument,
    bindings: [...current.editorView.bindings, ...created.bindings] });
  setSelectedId(created.block.id);
  setSelectedSectionId(findBlockSectionId(nextDocument, created.block.id));
};

const handleAddSection = () => {
  const current = definitionRef.current;
  const selectedIndex = current.editorView.document.sections
    .findIndex((s) => s.id === selectedSectionId);
  const atIndex = selectedIndex >= 0 ? selectedIndex + 1 : undefined; // insert AFTER selected
  const { document, sectionId } = addScreenSection(current.editorView.document,
    { atIndex });
  updateEditorView({ document });
  setSelectedId(null);            // section, not a block, is now the active target
  setSelectedSectionId(sectionId);
};

const handleRenameSection = (sectionId: string, label: string) => {
  updateEditorView({ document: renameScreenSection(
    definitionRef.current.editorView.document, sectionId, label) });
};

const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
  updateEditorView({ document: moveScreenSection(
    definitionRef.current.editorView.document, sectionId, direction) });
};

const handleDeleteSection = (sectionId: string) => {
  const current = definitionRef.current;
  const { document, removed } = removeScreenSection(current.editorView.document, sectionId);
  if (!removed) return;
  // Prune bindings for EVERY block in the removed section subtree.
  let bindings = current.editorView.bindings;
  removed.blocks.forEach((block) => {
    bindings = removeScreenBindingsForBlockTree(bindings, block);
  });
  updateEditorView({ document, bindings });
  if (selectedSectionId === sectionId) setSelectedSectionId(document.sections[0]?.id ?? null);
  if (selectedId && !findScreenBlockById(document, selectedId)) setSelectedId(null);
};
```

Pass `onAddSection={handleAddSection}`, `onRenameSection={handleRenameSection}`,
`onMoveSection={handleMoveSection}`, `onDeleteSection={handleDeleteSection}` into
`ScreenAuthoringCanvas`. Import `addScreenSection`, `renameScreenSection`,
`moveScreenSection`, `removeScreenSection`, `appendScreenBlockToSection` from
`screenDocumentOps`.

**Data flow:** chip/palette/dashed-button → canvas prop → host handler → pure ops
helper → `updateEditorView` → `updateDefinition` → `setDefinition` + `markDirty` →
existing PATCH on save. No other pathway changes.

---

## Files to change

```
EDIT core/services/customScreens/screenDocumentOps.ts
       + addScreenSection / renameScreenSection / moveScreenSection / removeScreenSection
       + appendScreenBlockToSection (500-01 targeting foundation; 500-02 supersedes)
       + clampIndex helper
EDIT core/admin/ui/custom-screens/ScreenBlockLibrary.tsx
       export SCREEN_PALETTE_CHIPS (+ ScreenPaletteChip type) = canonical KIND set (9 chips
       PLUS field-group/columns/record-header/rich-text); local PALETTE_CHIPS = it (single
       source of truth for BOTH the chip grid and the command palette; do NOT reduce to 9)
EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx
       onAddSection prop; commandGroups from SCREEN_PALETTE_CHIPS + "Add section", ONLY the FIELDS
       group removed (field-group/columns/record-header/rich-text stay creatable — 500-02 nesting targets);
       dashed button onClick → onAddSection; forward onRename/onMove/onDeleteSection to the renderer
EDIT core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx
       optional onRenameSection/onMoveSection/onDeleteSection; builder section chrome when selected
EDIT core/admin/ui/custom-screens/CustomScreenEditorPage.tsx
       handleAddSection/Rename/MoveSection/DeleteSection; handleAddBlock uses appendScreenBlockToSection
ADD  tests/vitest/customScreens/screen-document-sections.test.ts
ADD  tests/vitest/ui-integration/screen-editor-sections.test.tsx
```

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest Bun-free lane)

The screen builder is UI + a pure ops module (no Bun runtime, no route handler), so all
new suites run in the **Vitest (Bun-free)** lane. Shapes:

**`tests/vitest/customScreens/screen-document-sections.test.ts` (pure ops):**
- `addScreenSection`: appends by default; `atIndex` inserts at the clamped position
  (negative → 0, `> length` → end); returned `sectionId` is stable and equals the new
  section's `id`; new section has `type:"section"`, `blocks:[]`, `data.title === label`.
- `renameScreenSection`: sets `label` AND `data.title`; blank/whitespace → `"Section"`;
  unknown `sectionId` → unchanged document.
- `moveScreenSection`: swaps adjacent sections; `"up"` on index 0 and `"down"` on the
  last index are BOUNDARY NO-OPS (document unchanged); unknown id → unchanged.
- `removeScreenSection`: removes the named section, returns `removed` with its blocks;
  allowed to reach `sections.length === 0`; unknown id → `{ removed: null }`.
- `appendScreenBlockToSection`: appends to the named section (not `sections[0]` when a
  DIFFERENT section is named); unknown/null `sectionId` fails soft to the first section;
  empty-doc path re-seeds via `ensureSectionForInsert`.

**`tests/vitest/ui-integration/screen-editor-sections.test.tsx` (RTL):**
- **Add section creates a section, not a palette:** clicking `data-screen-add-section`
  increases the `data-screen-section-id` count by 1 and does NOT open the command
  palette. (Regression-guards the old `setCommandOpen` behaviour — flag any existing
  test that asserted the palette opened.)
- **Insertion targets the selected section:** with ≥2 sections, select the 2nd, click a
  palette chip → the new block appears under the 2nd section's
  `data-screen-section-id`, NOT the first.
- **Rename / reorder / delete chrome:** selecting a section shows
  `data-screen-section-rename` + move/delete controls; rename updates the title;
  `data-screen-section-move-up`/`-down` reorder; `data-screen-section-delete` removes
  the section and (assert via host) prunes bindings for its blocks.
- **Palette unification:** open the command palette → assert it lists exactly the
  canonical kind set (9 chips + `field-group`/`columns`/`record-header`/`rich-text`) +
  "Add section" and has NO per-field commands / no "Fields" group. Explicitly assert
  `field-group` and `columns` remain creatable (they are 500-02's nesting targets).

Full gate per the parent: `bun --cwd core lint`, `bun --cwd core lint:types`,
`bun --cwd core test:bun`, full vitest, the repo gate alias, and a real-input playwright
smoke (live side-by-side vs the prototype for section CRUD + one-vocabulary palette,
light + dark, `:5173==200`). Existing `custom-screen-*` restyle suites and
`screenDocumentOps.test.ts` MUST stay green (add-section behaviour change is the only
intended delta; update any suite that asserted the old palette-opening button).

---

## Acceptance criteria

1. "Add section" creates a real, empty, named top-level section (never opens the
   command palette); the new section is selected after creation.
2. Sections can be selected, renamed, reordered (up/down with boundary no-op), and
   deleted from the canvas, matching the prototype's section look.
3. A new block lands in the SELECTED section (or its selected container's slot),
   never forced into `sections[0]`.
4. One canonical kind vocabulary sourced from a single constant: the canonical set is
   the 9 chips PLUS the container/composite kinds (`field-group`/`columns` +
   `record-header`/`rich-text`); the command palette (if present) lists that same set +
   "Add section"; ONLY the FIELDS group is gone; `field-group`/`columns` stay creatable
   so 500-02 has containers to nest into.
5. Deleting a section prunes its blocks' bindings; the document may reach zero
   sections and the "Add section" affordance re-seeds on the next add.
6. No regression: TASK-498 look parity, presentation-override editing, Bun-free vitest
   boundary, `schemaVersion:1`, definition v4, and stored-V4 byte-stability all hold;
   no schema key added, no route/RBAC change; all gates green + playwright smoke.
