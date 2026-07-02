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
   no containers to nest into). **The VISIBLE chip grid stays at the prototype's
   EXACTLY 9 chips** (`grid-cols-3`, `CustomScreenEditorPreview.tsx:234-246`, the
   owner-declared canonical look) — the container/composite kinds are exposed
   through the searchable command palette (Search), NOT added as visible chips.
   The single canonical constant feeds BOTH surfaces: the grid renders only the 9
   primary chips, the command palette exposes the full canonical set **+ "Add
   section"**, not a divergent set. Do NOT grow the visible grid to 13.

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
// LAST-SECTION RULE (deterministic, per parent epic): if only ONE section remains,
// removeScreenSection NO-OPS — returns { document: unchanged, removed: null }. The
// document always keeps at least one section for the canvas to steer insertion into;
// there is no zero-sections editor state and no lazy re-seed.
export function removeScreenSection(
  document: ScreenDocumentV1,
  sectionId: string
): { document: ScreenDocumentV1; removed: ScreenSectionV1 | null } {
  const removed = document.sections.find((s) => s.id === sectionId) ?? null;
  if (!removed) return { document, removed: null };
  if (document.sections.length <= 1) return { document, removed: null }; // last-section no-op
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

1. **`ScreenBlockLibrary.tsx`** — export the canonical KIND set as a single source of
   truth, but keep the two SURFACES distinct: the VISIBLE chip grid stays at the
   prototype's 9, while the container/composite kinds ride the command palette only.
   `SCREEN_PALETTE_CHIPS` stays the 9 grid chips (the local `PALETTE_CHIPS` becomes
   `= SCREEN_PALETTE_CHIPS`, grid UNCHANGED); the container/composite kinds are a
   SEPARATE exported list; the full canonical set is their composition:

```ts
export type ScreenPaletteChip = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  kind: ScreenBlockKind;
};
// The prototype's 9 VISIBLE chips (grid-cols-3 — CustomScreenEditorPreview.tsx:234-246,
// verified). This is EXACTLY what the chip grid renders; do NOT add chips here.
export const SCREEN_PALETTE_CHIPS: readonly ScreenPaletteChip[] = [
  /* the existing 9: heading/text/field/stat/divider/image/related-list/tabs/button */
];
// Container/composite kinds the command palette is the SOLE creation surface for today.
// They are NOT visible chips (adding them would grow the grid to 13 and depart from the
// canonical 9-chip prototype look); they surface ONLY through the searchable command
// palette so field-group/columns stay creatable for 500-02 (record-header/rich-text are
// real createScreenBlock kinds — screenDocumentOps.ts:140/155/170/194).
export const SCREEN_PALETTE_COMMANDS: readonly ScreenPaletteChip[] = [
  { label: "Record header", icon: PanelTop,       kind: "record-header" },
  { label: "Field group",   icon: Layers,         kind: "field-group" },
  { label: "Two columns",   icon: LayoutPanelTop, kind: "columns" },
  { label: "Help text",     icon: Type,           kind: "rich-text" },
];
// Full canonical KIND vocabulary = single source of truth for the command palette.
// The grid reads SCREEN_PALETTE_CHIPS (the 9); the palette reads the full set below.
export const SCREEN_CANONICAL_KINDS: readonly ScreenPaletteChip[] = [
  ...SCREEN_PALETTE_CHIPS,
  ...SCREEN_PALETTE_COMMANDS,
];
// local PALETTE_CHIPS const becomes `= SCREEN_PALETTE_CHIPS`; the chip grid is UNCHANGED
// (still exactly the prototype's 9). The container/composite kinds route to the command
// palette via SCREEN_CANONICAL_KINDS — do NOT render them as visible chips.
```

2. **`ScreenAuthoringCanvas.tsx`** — rebuild `commandGroups` from the FULL canonical
   set (`SCREEN_CANONICAL_KINDS` = 9 chips + container/composite kinds) and drop ONLY
   the FIELDS group (the container/composite BLOCKS kinds stay). The command palette is
   where the container/composite kinds surface — the visible chip grid stays at 9:

```ts
const commandGroups = useMemo<AuthoringCommandGroup[]>(() => [
  {
    id: "blocks",
    label: "Blocks",
    commands: SCREEN_CANONICAL_KINDS.map((chip) => ({ // full canonical set: 9 chips + field-group/columns/record-header/rich-text
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
Section selection continues to flow through the existing `onSelectSection` prop. Note the
canvas `selectTarget` ALREADY clears the block selection on a section click — its section
branch calls `onSelectBlock(null)` (→ `handleSelectBlock(null)` → `setSelectedId(null)`,
`CustomScreenEditorPage.tsx:315-320`) BEFORE `onSelectSection` fires
(`ScreenAuthoringCanvas.tsx:266-268`), so `resolveSelectedSlotTarget` returns `undefined`
and the `selectedSectionId` steering already wins through the current canvas path. The
HOST handler for it (design E `handleSelectSection`) ALSO clears `setSelectedId(null)`, as
explicit defense-in-depth to make the host handler self-contained (correct even if a
caller ever invokes `onSelectSection` outside `selectTarget`) — NOT as the mechanism that
enables steering.

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

  **REQUIRED — rename input MUST stop keydown/click from bubbling to the section.**
  The rename `<input>` renders INSIDE the same `<section>` whose `onKeyDown`
  (`ScreenRuntimeRenderer.tsx:1026-1036`, verified) calls `event.preventDefault()` +
  `event.stopPropagation()` + `onSelectSection(section.id)` for `Enter` or `" "` when
  `isInteractive`. Left unguarded, that handler (a) SWALLOWS the space bar — its
  `preventDefault()` stops a space character from ever reaching the field — and (b) on
  `Enter` RE-SELECTS the section via `onSelectSection` on top of committing the rename.
  So the rename `<input>` MUST call `event.stopPropagation()` in its OWN `onKeyDown`
  (and `onClick`) so `Space`/`Enter` reach the field and `Enter` commits the rename
  WITHOUT re-triggering the section select. (Equivalently, the section `onKeyDown` may
  early-return when `event.target` is the rename input; the input-level
  `stopPropagation` is the preferred, self-contained form and mirrors the button
  cluster's guard.) This is the toolbar-wide-`preventDefault` class of real-input bug
  the codebase has hit before — synthetic `fireEvent` RTL tests pass regardless, so it
  must be pinned by the real-input assertion below.

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
  // A selected container (via selectedId) still takes precedence over the section
  // fallback. That is safe because selectedId is ALREADY cleared whenever a section is
  // clicked on the canvas (selectTarget's section branch → onSelectBlock(null) →
  // handleSelectBlock(null) → setSelectedId(null)); handleSelectSection clears it too as
  // defense-in-depth. So no stale container in another section can hijack the insert.
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

// Defense-in-depth. The canvas selectTarget already clears the block selection on a
// section click (its section branch calls onSelectBlock(null) → handleSelectBlock(null)
// → setSelectedId(null), ScreenAuthoringCanvas.tsx:266-268), so steering already works
// through the current canvas path. This handler ALSO clears setSelectedId(null) so the
// host handler is self-contained regardless of caller (correct even if onSelectSection
// is ever invoked outside selectTarget). Replace the bare `onSelectSection=
// {setSelectedSectionId}` wiring (CustomScreenEditorPage.tsx:762) with this handler.
const handleSelectSection = (sectionId: string | null) => {
  setSelectedSectionId(sectionId);
  setSelectedId(null); // defense-in-depth: keep the host handler self-contained
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
  if (!removed) return; // last-section no-op (or unknown id) — nothing deleted, selection intact
  // Prune bindings for EVERY block in the removed section subtree.
  let bindings = current.editorView.bindings;
  removed.blocks.forEach((block) => {
    bindings = removeScreenBindingsForBlockTree(bindings, block);
  });
  updateEditorView({ document, bindings });
  // A delete only happens when ≥2 sections existed, so the doc still has ≥1 section here.
  if (selectedSectionId === sectionId) setSelectedSectionId(document.sections[0].id);
  if (selectedId && !findScreenBlockById(document, selectedId)) setSelectedId(null);
};
```

Pass `onSelectSection={handleSelectSection}` (REPLACING the bare
`onSelectSection={setSelectedSectionId}` at `CustomScreenEditorPage.tsx:762` — a
self-contained host handler that also clears `selectedId`, defense-in-depth for any
caller that invokes `onSelectSection` without going through the canvas `selectTarget`
block-clear; steering itself already works via that block-clear),
`onAddSection={handleAddSection}`, `onRenameSection={handleRenameSection}`,
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
       export SCREEN_PALETTE_CHIPS (the prototype's 9 grid chips, UNCHANGED) + SCREEN_PALETTE_COMMANDS
       (container/composite kinds: field-group/columns/record-header/rich-text) + SCREEN_CANONICAL_KINDS
       (their composition) + ScreenPaletteChip type; local PALETTE_CHIPS = SCREEN_PALETTE_CHIPS. The
       VISIBLE grid stays at EXACTLY 9 (do NOT grow to 13); container/composite kinds ride the command palette only
EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx
       onAddSection prop; commandGroups from SCREEN_CANONICAL_KINDS + "Add section", ONLY the FIELDS
       group removed (field-group/columns/record-header/rich-text stay creatable via the palette — 500-02 nesting targets);
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
  the LAST-SECTION rule — deleting the only remaining section NO-OPS, returns
  `removed: null`, and leaves exactly one section so the doc never reaches zero sections;
  unknown id → `{ removed: null }`.
- `appendScreenBlockToSection`: appends to the named section (not `sections[0]` when a
  DIFFERENT section is named); unknown/null `sectionId` fails soft to the first section;
  empty-doc path re-seeds via `ensureSectionForInsert`.

**`tests/vitest/ui-integration/screen-editor-sections.test.tsx` (RTL):**
- **Add section creates a section, not a palette:** clicking `data-screen-add-section`
  increases the `data-screen-section-id` count by 1 and does NOT open the command
  palette. (Regression-guards the old `setCommandOpen` behaviour — flag any existing
  test that asserted the palette opened.)
- **Insertion targets the selected section (steering path):** with ≥2 sections and NO
  container selected (the fresh path), select the 2nd section, click a palette chip → the
  new block appears under the 2nd section's `data-screen-section-id`, NOT the first. This
  is the core steering assertion; it exercises `appendScreenBlockToSection` consulting
  `selectedSectionId` and would fail on the old `sections[0]`-only default regardless of
  any block-clear.
- **Section select clears the block selection (invariant):** directly selecting a section
  clears `selectedId` (assert via host state / that the Inspect body no longer targets the
  previously selected block), keeping `handleSelectSection` self-contained. Be explicit in
  the test comment that this invariant ALSO holds with the bare `setSelectedSectionId`
  setter, because the canvas `selectTarget` section branch already calls
  `onSelectBlock(null)` before `onSelectSection` — so this guards the block-clear
  invariant, it does NOT distinguish the two setter implementations.
- **Rename / reorder / delete chrome:** selecting a section shows
  `data-screen-section-rename` + move/delete controls; rename updates the title;
  `data-screen-section-move-up`/`-down` reorder; `data-screen-section-delete` removes
  the section and (assert via host) prunes bindings for its blocks.
- **Rename input survives real-input keys (regression guard for the section-`onKeyDown`
  swallow):** with a section selected, type a value CONTAINING a space into
  `data-screen-section-rename` (per-character `keyDown` on the input, not a single
  synthetic `change`) and assert the space is PRESERVED in the field value (the section
  `onKeyDown` `preventDefault()` did NOT swallow it), then press `Enter` and assert the
  rename COMMITS (`onRenameSection` fires with the typed value) WITHOUT re-selecting the
  section (`onSelectSection` is NOT called by that `Enter`, and the section stays the
  active target) — i.e. NOT merely a synthetic `blur`. This pins the input-level
  `stopPropagation` required in design D.
- **Visible chip grid stays at 9 (look parity):** assert the `Add block` chip grid
  renders EXACTLY the prototype's 9 chips (heading/text/field/stat/divider/image/
  related-list/tabs/button) — the container/composite kinds are NOT rendered as visible
  chips (the grid does NOT grow to 13).
- **Palette unification:** open the command palette → assert it lists exactly the
  full canonical kind set (9 chips + `field-group`/`columns`/`record-header`/`rich-text`)
  + "Add section" and has NO per-field commands / no "Fields" group. Explicitly assert
  `field-group` and `columns` remain creatable via the command palette (they are 500-02's
  nesting targets).

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
   `record-header`/`rich-text`). The VISIBLE chip grid still renders EXACTLY the
   prototype's 9 chips (`grid-cols-3`, look parity preserved — NOT grown to 13); the
   container/composite kinds surface through the command palette, which lists the full
   canonical set + "Add section"; ONLY the FIELDS group is gone; `field-group`/`columns`
   stay creatable via the palette so 500-02 has containers to nest into.
5. Deleting a section prunes its blocks' bindings; the LAST-SECTION rule holds —
   deleting the only remaining section NO-OPS (returns `removed: null`), so the document
   always keeps at least one section and never reaches a zero-sections editor state.
6. No regression: TASK-498 look parity, presentation-override editing, Bun-free vitest
   boundary, `schemaVersion:1`, definition v4, and stored-V4 byte-stability all hold;
   no schema key added, no route/RBAC change; all gates green + playwright smoke.
