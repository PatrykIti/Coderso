# TASK-500-02
# FileName: TASK-500-02-Insertion-Targeting-And-Interactivity.md

**Parent Task:** TASK-500
**Title:** Insertion Targeting & Interactivity
**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Builder / Page-Builder UX
**Estimated Effort:** Large
**Status:** ⏳ To Do

---

## Summary

This is the **core interactivity keystone** of TASK-500. Today every added block
lands in **one place**: `CustomScreenEditorPage.handleAddBlock`
(`CustomScreenEditorPage.tsx:378-396`) calls `resolveSelectedSlotTarget(document)`
(`:367-376`) then `addScreenBlock(document, block, target?)`
(`screenDocumentOps.ts:393-427`). With NO target the block is appended to the END of
the FIRST section (`sections[0]`, `:398-408`); with a selected CONTAINER it is appended
to the END of that container's derived slot (`field-group`→`content`, `columns`→`left`,
else first slot key). `selectedSectionId` state exists (`CustomScreenEditorPage.tsx:171`)
but does **NOT** steer insertion, and `moveScreenBlock` (`screenDocumentOps.ts:674-707`)
is up/down reorder within a single sibling list only. Owner: *"kontenery zagnieżdżają się
dowolnie ale wszystko idzie w jedno miejsce — nie mogę wybrać miejsca — brak
interaktywności — powinno być lepiej."*

This subtask makes insertion **author-directed and deterministic**: a new
`ScreenInsertTarget` union + `addScreenBlockAt` / `moveScreenBlockTo` /
`findScreenBlockLocation` pure ops in `screenDocumentOps.ts`, host wiring that resolves a
target from the selected section + a clicked insertion point + a container slot, and
canvas affordances (before/after inserts, per-slot drop zones, drag-to-position across
sections and slots at arbitrary depth). The block **id is preserved on move** (a move,
not a clone — bindings keyed by `blockId` stay valid), a **cycle guard** rejects dropping
a container into its own subtree, and unknown targets **fail soft** back to the first
section's end (never throw in the editor path; the write normalizer stays the strict gate
on save).

**Depends on TASK-500-01** (a real, selectable, named top-level section is the target
`addScreenBlockAt` steers into via `selectedSectionId`). 500-01 gates 500-02.

## Prototype parity

Look/interaction reference:
`/home/coder/project/Coderso/_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`
(`Section` component + `renderSection`, `:27-182`; "Add section" chip `:227`). The
prototype is a **look** prototype — it renders a static `EntrySection[]` with a selected
tag and no live drag. This subtask ADDS the interactivity the prototype only implies:
match the corner-tag selectable card look (kept from TASK-498), and layer real
before/after insertion affordances + per-slot drop zones + drag handles onto it. Do NOT
regress the TASK-498 card/tag/`{{ Field }}` presentation-override surface.

---

## Security Contract / Scope note

**UI/client-state + schema-first model; no route/RBAC/endpoint change.** This subtask
mutates only the in-memory `editorView.document` client-side (`updateEditorView` →
existing custom-screen definition PATCH under existing RBAC). It adds **pure, Bun-free
ops** to `core/services/customScreens/screenDocumentOps.ts` and canvas/host wiring — **no
API route, endpoint visibility, auth, CSRF, or rate-limit change**, so no dedicated
route-level Security Contract applies. **NO `ScreenDocumentV1.schemaVersion` bump** (stays
`1`), definition stays v4, **no DB migration**. The new ops introduce **no new persisted
keys** — they only reorder/relocate existing `ScreenBlockV1` nodes and reuse the existing
`normalizeScreenDocumentV1` write gate, so `rejectUnknownKeys` / `normalizeUniqueIds` /
per-kind reject-unknown allow-lists are all untouched and stored-V4 screens stay
byte-stable. The move op **preserves block ids** (no id churn, no binding rewrite), so
`assertScreenFieldBindingsTargetDocument` (bindings→blockId invariant) continues to hold
with no extra code. Deterministic guarantees: clamped indices, stable pre-order
traversal, fail-soft on unknown target, cycle guard against self-nesting.

---

## Execution-ready design

All ops are **pure functions** in `core/services/customScreens/screenDocumentOps.ts`
(Bun-free). They reuse the existing walkers there (`visitBlocks`, `removeFromBlocks`,
`collectScreenBlockIds`, `findScreenBlockById`) rather than re-deriving traversal.

### 1. The insert-target union (schema-agnostic; not persisted)

```ts
// screenDocumentOps.ts — a single deterministic insert target. NOT part of the stored
// document shape (no schema change); purely an argument to the ops below.
export type ScreenInsertTarget =
  | { kind: "section-end"; sectionId: string }                                   // default when a section is selected
  | { kind: "section-index"; sectionId: string; index: number }                  // before/after a top-level block
  | { kind: "slot-end"; sectionId: string; parentId: string; slotId: string }    // into a container slot (append)
  | { kind: "slot-index"; sectionId: string; parentId: string; slotId: string; index: number }; // before/after inside a slot
```

`sectionId` is carried on the slot kinds too so the host can keep `selectedSectionId` in
sync without a second lookup; the ops themselves locate the parent container globally
(parent ids are document-unique per `normalizeUniqueIds`) so a mismatched `sectionId`
still resolves — deterministic and forgiving.

### 2. `findScreenBlockLocation` — the traversal primitive

```ts
export function findScreenBlockLocation(
  document: ScreenDocumentV1,
  blockId: string
): {
  sectionId: string;
  parentId: string | null;   // null ⇒ block is a top-level child of the section
  slotId: string | null;     // null ⇒ top-level; else the slot key inside parent
  index: number;             // index within its sibling list
} | null {
  // Deterministic pre-order: for each section, walk section.blocks (parentId=null,
  // slotId=null) then, for every block with slots, recurse into each slot's list
  // (parentId=block.id, slotId=key), then children[] if present (parentId=block.id,
  // slotId=null — mirrors how the codebase already treats children vs slots).
  // Return the FIRST match. Null if not found.
}
```

Used by the canvas to render before/after affordances (it needs the block's index) and by
`moveScreenBlockTo`'s cycle guard. Sibling-list resolution is shared with the ops below
via a small internal helper:

```ts
// internal — resolve the mutable sibling list a target names, returning a setter closure
// so add/move splice into the SAME list the target describes. Returns null when the
// section/parent/slot cannot be resolved (⇒ caller triggers fail-soft).
type SiblingResolution = { list: ScreenBlockV1[]; write: (next: ScreenBlockV1[]) => ScreenDocumentV1 };
function resolveInsertList(document: ScreenDocumentV1, target: ScreenInsertTarget): SiblingResolution | null {
  // section-end / section-index → section.blocks (write rebuilds document.sections)
  // slot-end / slot-index      → find parent via findScreenBlockById; parent.slots[slotId]
  //                              (write rebuilds via the existing visitBlocks walker,
  //                              replacing that parent's slots[slotId] with `next`)
  // Return null if section missing, parent missing, or slot key absent on the parent.
}
```

### 3. `addScreenBlockAt` — targeted, clamped, fail-soft

```ts
export function addScreenBlockAt(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  const nextDoc = ensureSectionForInsert(document);            // reuse existing guard
  const resolution = resolveInsertList(nextDoc, target);
  if (!resolution) {
    // FAIL-SOFT: unknown section/parent/slot ⇒ append to the FIRST section's end.
    return addScreenBlockAt(nextDoc, block, { kind: "section-end", sectionId: nextDoc.sections[0]!.id });
    // (guaranteed terminating: sections[0] always resolves after ensureSectionForInsert)
  }
  const list = resolution.list;
  const rawIndex =
    target.kind === "section-index" || target.kind === "slot-index" ? target.index : list.length;
  const index = clampIndex(rawIndex, 0, list.length);          // [0, len] inclusive-end
  const next = [...list.slice(0, index), block, ...list.slice(index)];
  return resolution.write(next);
}

// small local helper (mirrors clampScreenInt in customScreenSchemas but stays in ops):
const clampIndex = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : max));
```

Never throws — the editor path is forgiving; the strict gate is
`normalizeScreenDocumentV1` on save.

### 4. `moveScreenBlockTo` — same-id move, cross-section/slot, cycle-guarded

```ts
export function moveScreenBlockTo(
  document: ScreenDocumentV1,
  blockId: string,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  // 1) Locate + detach the node WITHOUT losing it.
  const { document: stripped, removed } = removeScreenBlock(document, blockId); // existing walker
  if (!removed) return document;                                                // unknown block ⇒ no-op

  // 2) CYCLE GUARD: refuse to drop a container into its own subtree.
  if (target.kind === "slot-end" || target.kind === "slot-index") {
    const subtreeIds = new Set(collectScreenBlockIds(removed));                 // existing helper
    if (subtreeIds.has(target.parentId)) return document;                       // no-op, ORIGINAL doc
  }

  // 3) SAME-LIST DOWNWARD ADJUSTMENT (mandatory, not optional): removal happened FIRST,
  //    so an index-kind target that names the SAME sibling list the block was removed from
  //    is now shifted by one whenever the removed block sat BEFORE that index. Decrement the
  //    insert index by 1 in exactly that case so the drop lands 1:1. clampIndex only bounds
  //    [0, len] — it does NOT decrement — so this step is REQUIRED, not covered by clamping.
  let adjusted = target;
  if (target.kind === "section-index" || target.kind === "slot-index") {
    const origin = findScreenBlockLocation(document, blockId);   // PRE-removal location
    if (origin && sameSiblingList(origin, target) && origin.index < target.index) {
      adjusted = { ...target, index: target.index - 1 };
    }
  }

  // 4) Re-insert the SAME node (same id ⇒ bindings stay valid, no rewrite) at the adjusted
  //    index; fail-soft/clamp handled by addScreenBlockAt against the STRIPPED doc.
  return addScreenBlockAt(stripped, removed, adjusted);
}

// internal — true when a pre-removal location and an index-kind target name the SAME sibling
// list (same section top-level, or same parent+slot). Used to gate the decrement above.
function sameSiblingList(
  origin: { sectionId: string; parentId: string | null; slotId: string | null },
  target: ScreenInsertTarget
): boolean {
  if (target.kind === "section-index") return origin.parentId === null && origin.sectionId === target.sectionId;
  if (target.kind === "slot-index") return origin.parentId === target.parentId && origin.slotId === target.slotId;
  return false;
}
```

Notes: (a) removal happens first, so a same-list downward reorder is off by one against the
pre-removal rendered list; step (3) above (decrement when the removed block's original index
< the target index in the SAME resolved list) is the required correction — clampIndex does
NOT do it. Equivalently the canvas may compute the drop index against the POST-removal list
before calling; the op still applies the guard so either host path is 1:1. (b) The move
preserves `removed.id` and its whole subtree, so
`ScreenFieldBinding.blockId` references never dangle — no binding mutation needed
(contrast with `duplicateScreenBlockWithBindings`, which DOES remap because it clones).

### 5. Legacy shims (non-destructive)

Keep `addScreenBlock` and `moveScreenBlock` exported so existing tests/imports keep
compiling; reimplement them as thin wrappers so `sections[0]`-only insertion is GONE at
the single-source level:

```ts
// non-destructive: same signatures, delegate to the new ops.
export function addScreenBlock(document, block, target?: { parentId: string; slotId: string }) {
  return addScreenBlockAt(
    document,
    block,
    target
      ? { kind: "slot-end", sectionId: findScreenSectionOfBlock(document, target.parentId) ?? "", parentId: target.parentId, slotId: target.slotId }
      : { kind: "section-end", sectionId: document.sections[0]?.id ?? "" } // ensureSectionForInsert re-seeds if empty
  );
}
// moveScreenBlock (up/down) stays as-is OR re-expressed via findScreenBlockLocation +
// moveScreenBlockTo with the adjacent index; keep the existing boundary no-op semantics.
```

(The leaf may instead migrate all call sites and delete the shims — either way document
the choice in 500-05; `sections[0]`-only insertion must be unreachable afterward.)

### 6. Host wiring — `CustomScreenEditorPage.tsx`

Replace `resolveSelectedSlotTarget` + bare `addScreenBlock` with a
`ScreenInsertTarget` resolver, and add an insertion-point + drag handlers.

```ts
// NEW host state: an explicit insertion point the author clicked (before/after a block,
// or a slot drop zone). Cleared after each insert.
const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>(null);

// Priority order (a) explicit clicked point → (b) selected container's chosen slot →
// (c) selected section end → (d) first section end.
const resolveInsertTarget = (document): ScreenInsertTarget => {
  if (insertPoint) return insertPoint;
  const selected = findScreenBlockById(document, selectedId);
  if (selected?.slots) {                                   // selected container ⇒ its default slot end
    const slotId =
      selected.type === "field-group" ? "content"
      : selected.type === "columns" ? "left"
      : Object.keys(selected.slots)[0];
    if (slotId) {
      const loc = findScreenBlockLocation(document, selected.id);
      return { kind: "slot-end", sectionId: loc?.sectionId ?? selectedSectionId ?? "", parentId: selected.id, slotId };
    }
  }
  const sectionId = selectedSectionId ?? document.sections[0]?.id ?? "";
  return { kind: "section-end", sectionId };
};

const handleAddBlock = (type, field?) => {
  const current = definitionRef.current;
  const created = createScreenBlock({ type, field: field?.name, label: field?.label, relationTarget: field?.relation?.target });
  const target = resolveInsertTarget(current.editorView.document);
  const nextDocument = addScreenBlockAt(current.editorView.document, created.block, target);
  updateEditorView({ document: nextDocument, bindings: [...current.editorView.bindings, ...created.bindings] });
  setSelectedId(created.block.id);
  setSelectedSectionId(findBlockSectionId(nextDocument, created.block.id));
  setInsertPoint(null);                                    // consume the one-shot point
};

// Drag-to-position: canvas reports {blockId, target} once a drop resolves.
const handleDragMove = (blockId: string, target: ScreenInsertTarget) => {
  const current = definitionRef.current;
  const nextDocument = moveScreenBlockTo(current.editorView.document, blockId, target);
  if (nextDocument === current.editorView.document) return; // cycle-guard/no-op ⇒ skip dirty
  updateEditorView({ document: nextDocument });
  setSelectedId(blockId);
  setSelectedSectionId(findBlockSectionId(nextDocument, blockId));
};
```

Keep `handleMoveBlock(up|down)` for keyboard/button reorder (re-expressed over
`moveScreenBlockTo` with the adjacent index, or left on `moveScreenBlock`). Selection +
`selectedSectionId` always FOLLOW the inserted/moved block.

### 7. Canvas affordances — `ScreenAuthoringCanvas.tsx`

New props (forwarded from the host), added to `ScreenAuthoringCanvasProps` (`:49-81`):

```ts
onAddBlockAt?: (type: ScreenBlockKind, target: ScreenInsertTarget, field?: ContentField) => void; // optional direct path
onSetInsertPoint: (target: ScreenInsertTarget | null) => void;   // arm/disarm the before/after point
onDragMove: (blockId: string, target: ScreenInsertTarget) => void;
insertPoint: ScreenInsertTarget | null;                          // to highlight the armed slot/gap
```

Rendering (layered onto the existing selectable corner-tag card, NOT a rewrite):

- **Before/after gaps.** Between every sibling card render a thin hover "＋ insert here"
  gap that calls `onSetInsertPoint({ kind: "section-index"|"slot-index", …, index })` with
  the gap's index (before = current index, after = index+1). The armed gap gets a visible
  ring; the next palette/`Field` chip click inserts there.
- **Per-slot drop zones.** For every container (`field-group` `content`; `columns`
  `left`/`right`; `tabs` `tab-*`) render an explicit labeled empty-slot drop target so an
  author can aim ANY nested slot at arbitrary depth (recursion already exists via
  `buildBlockLayerNodes`, `:93-116` — reuse that walk for the render tree).
- **Drag handles.** Each block card is `draggable`; on drop over a gap/slot the canvas
  resolves a `ScreenInsertTarget` from the drop position and calls
  `onDragMove(draggedId, target)`. Because `moveScreenBlockTo` removes the node FIRST, a
  same-list DOWNWARD move (removed block sits before the target gap) is off by one against
  the pre-removal rendered list — `clampIndex` does NOT fix this (it only bounds `[0, len]`).
  `moveScreenBlockTo` applies the required decrement (see §4 step 3); alternatively the canvas
  may compute the gap index against the POST-removal list before reporting it. Either way the
  drop lands 1:1 (e.g. moving `item[0]` before `item[3]` in a 5-list yields `[1,2,item0,3,4]`,
  not `[1,2,3,item0,4]`). Use native HTML5 DnD (dataTransfer
  carries `blockId`) to stay dependency-free and Bun-free-testable via fireEvent.
- A container that is currently being dragged suppresses its own inner drop zones (visual
  reinforcement of the cycle guard; the op is the real guard).

### 8. Optional inspector slot picker — `ScreenBlockInspector.tsx`

When the selected block is a container, offer an "Insert into" `<select>` of its slot keys
that sets `insertPoint = { kind: "slot-end", parentId, slotId }`. Optional convenience
(keyboard-first parity with drag); the drop zones are the primary surface.

---

## Data flow

```
palette/Field chip ─▶ handleAddBlock(type,field)
                          └▶ resolveInsertTarget(doc)  [insertPoint ▶ container-slot ▶ section ▶ first]
                          └▶ addScreenBlockAt(doc, block, target)  ─▶ resolveInsertList ▶ clampIndex ▶ splice
                          └▶ updateEditorView(doc,bindings) ; select+section follow ; clear insertPoint

drag card ─drop▶ handleDragMove(blockId, target)
                          └▶ moveScreenBlockTo(doc, blockId, target)
                                 ├ removeScreenBlock(blockId) → {stripped, removed}
                                 ├ cycle guard: collectScreenBlockIds(removed) ∌ target.parentId
                                 ├ same-list downward fix: origin.index < target.index ⇒ index-1
                                 └ addScreenBlockAt(stripped, removed, adjusted)  [SAME id]
                          └▶ updateEditorView(doc) ; select+section follow
```

---

## Error handling / determinism

- **Fail-soft, never throw (editor path).** `addScreenBlockAt` on an unresolvable target
  falls back to the first section's end (terminating recursion). No exceptions surface to
  the author; the strict `normalizeScreenDocumentV1` write gate remains the only thrower.
- **Index clamp.** All indices clamp to `[0, list.length]`; a NaN/∞/negative index →
  end/start. No out-of-range splice.
- **Cycle guard.** Move into own subtree ⇒ return the ORIGINAL document (referential
  equality preserved so the host can `=== ` to skip a dirty mark).
- **Unknown block on move.** `moveScreenBlockTo` no-ops (returns original) when `removed`
  is null.
- **Same-id invariant.** Move preserves `removed.id` and full subtree; bindings untouched.
- **Deterministic traversal.** `findScreenBlockLocation` is stable pre-order (sections →
  top-level blocks → slots-in-key-order → children), so before/after affordances and the
  cycle guard agree.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` lanes)

All suites run in the **Vitest (Bun-free)** lane — the screen builder is UI + a pure
ops/schema module (no Bun runtime, no route handler). The consolidated matrix + gate is
owned by **TASK-500-05 §1**; this subtask owns the ops + interactivity suites below and
must keep the epic invariants un-weakened.

**Domain ops — `tests/vitest/customScreens/screen-document-insertion.test.ts` (ADD):**
- `addScreenBlockAt` for all four `ScreenInsertTarget` kinds:
  - `section-end` appends to the NAMED section (not `sections[0]` when a later section is
    named), leaving other sections untouched.
  - `section-index` splices at the given top-level index; index `> len` clamps to end,
    `< 0` clamps to start; NaN → end.
  - `slot-end` appends into `field-group`/`columns`/`tabs` slots at depth (assert a
    `columns.left` inside a `field-group.content` — arbitrary depth).
  - `slot-index` splices at a slot index with the same clamp behavior.
  - **fail-soft:** unknown `sectionId`/`parentId`/`slotId` ⇒ block lands at the first
    section's end, no throw.
- `moveScreenBlockTo`:
  - cross-section move (section A top-level → section B slot at depth) preserves the
    **SAME block id** and its subtree ids (move-not-clone).
  - **cycle guard:** moving a container INTO its own descendant slot ⇒ returns the ORIGINAL
    document (referential equality) and the tree is unchanged.
  - unknown blockId ⇒ no-op original document.
  - same-list reorder MIDDLE-of-list downward move (e.g. `item[0]` → the gap before
    `item[3]` in a 5-list) lands at the visually-expected slot (`[1,2,item0,3,4]`), asserting
    the §4 step-3 decrement — an END-of-list move would mask the off-by-one via clamping, so a
    middle move is required. Also assert an upward same-list move (no decrement) is unaffected.
- `findScreenBlockLocation`: correct `{sectionId,parentId,slotId,index}` for top-level,
  slot-nested, and deeply-nested blocks; `null` for a missing id; stable pre-order.
- **Binding invariant:** after a `moveScreenBlockTo`, a `ScreenFieldBinding` keyed by the
  moved block's id still targets it (no dangling) — round-trip through
  `normalizeCustomScreenEditorViewDefinitionV4` (write gate) does NOT throw.
- **Non-destructive shims:** `addScreenBlock(doc, block)` (no target) and
  `addScreenBlock(doc, block, {parentId,slotId})` still behave for existing callers via the
  new delegation; `sections[0]`-forced insertion is unreachable when `selectedSectionId`
  names another section (assert through the host suite below).

**Editor interactivity — `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` (ADD):**
- A palette/`Field` insert with a NON-first section selected lands the block in the
  SELECTED section (regression against the `sections[0]` bug).
- Arming a before/after gap then inserting targets the right index in the right list.
- A slot drop zone at depth targets the right `{parentId, slotId}`.
- Native DnD (fireEvent dragStart/drop with `dataTransfer` blockId) reorders within a list
  and moves across sections + into a slot; the cycle-guard drop (container onto its own
  child) is a no-op.
- After each insert/move, `selectedId` + `selectedSectionId` follow the block.

**Prototype/regression guards (must stay green):** existing
`tests/vitest/**custom-screen**` and `tests/vitest/customScreens/**` suites — the TASK-498
card/tag/`{{ Field }}` surface, stored-V4 byte-stability, reject-unknown, and
`schemaVersion:1` assertions are un-weakened. No new persisted key means the schema round-
trip suites need no change.

Full gate (per `_docs/TESTING_STRATEGY.md`): `bun --cwd core lint`,
`bun --cwd core lint:types`, `bun --cwd core test:bun`, full vitest, the repo gate alias,
and a **real-input** Playwright smoke (drag a block across sections + into a nested slot,
insert before/after; live side-by-side vs the prototype, light + dark, `:5173==200`). No
synthetic-only pass.

---

## Acceptance criteria

1. A new block lands in the **selected** section, not always `sections[0]`.
2. The author can insert **before/after** any block and **into a chosen slot** of any
   nested container (`field-group`/`columns`/`tabs`) at arbitrary depth.
3. Blocks **drag-to-position** to reorder within a list and move across sections + slots;
   a container cannot be dropped into itself (cycle guard); move preserves the block id and
   its bindings.
4. `addScreenBlockAt` clamps indices and fails soft on unknown targets; `moveScreenBlockTo`
   no-ops on cycle/unknown-block; all ops are pure and Bun-free.
5. No regression to TASK-498 look parity or the presentation-override editing surface; **no
   `ScreenDocumentV1.schemaVersion` bump**, definition v4, no DB migration, no route/RBAC
   change; all gates green + Playwright smoke.

---

## Files to change

```
EDIT core/services/customScreens/screenDocumentOps.ts          (ScreenInsertTarget, addScreenBlockAt, moveScreenBlockTo, findScreenBlockLocation, resolveInsertList, clampIndex, sameSiblingList same-list decrement helper; addScreenBlock/moveScreenBlock become non-destructive shims)
EDIT core/admin/ui/custom-screens/CustomScreenEditorPage.tsx   (insertPoint state, resolveInsertTarget, handleAddBlock rewrite, handleDragMove; drop resolveSelectedSlotTarget)
EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx    (before/after gaps, per-slot drop zones, draggable cards, onSetInsertPoint/onDragMove props)
EDIT core/admin/ui/custom-screens/ScreenBlockInspector.tsx     (optional "Insert into" slot picker for a selected container)
ADD  tests/vitest/customScreens/screen-document-insertion.test.ts
ADD  tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx
```

---

## Notes / sequencing

- **Depends on TASK-500-01** (real selectable named sections). Isolate in a worktree (per
  the concurrent-drift-agents memory) and run ≥5 sequential drift-verify passes before
  merge. Do NOT commit during planning. Do NOT edit `_docs/_TASKS/README.md` (the parent
  author owns the board rows) or any sibling task file.
- Reuse the shared canonical admin helpers already in `screenDocumentOps.ts`
  (`visitBlocks`, `removeFromBlocks`, `collectScreenBlockIds`, `findScreenBlockById`,
  `ensureSectionForInsert`) — do not fork traversal logic.
