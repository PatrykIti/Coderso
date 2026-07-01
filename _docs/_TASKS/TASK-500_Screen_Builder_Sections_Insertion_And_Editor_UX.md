# TASK-500: Screen Builder — Sections, Insertion Targeting & Editor UX
# FileName: TASK-500_Screen_Builder_Sections_Insertion_And_Editor_UX.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Builder / Page-Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-496-02 (Screens on the shared `CanvasEditor` shell), TASK-498 (data-oriented builder + look parity — SHIPPED), TASK-479 (soft/violet redesign)
**Status:** ⏳ To Do

---

## Overview

TASK-498 gave the Custom-Screen entry-view builder its **look** parity (9-chip
`PaletteChip` palette, corner-tag cards, `{{ Field }}` builder tokens, Pages
shared-shell right rail). What it did **not** fix is the builder's **behaviour**:
the authoring model can express arbitrarily nested containers, but the author
cannot choose *where* anything lands. This is a FUNCTIONAL follow-up on top of the
shipped look parity — do NOT regress TASK-498 (the presentation-override editing
surface, the Bun-free vitest boundary, the `ScreenDocumentV1 schemaVersion:1` /
definition-v4 no-bump rule, and no route/RBAC change all still hold).

### The functional gap (verified against source)

- **Everything lands in one place.** `CustomScreenEditorPage.handleAddBlock` →
  `resolveSelectedSlotTarget(document)` → `addScreenBlock(document, block, target)`.
  With NO target, `addScreenBlock` appends to the END of the FIRST section
  (`sections[0]`, `screenDocumentOps.ts:398-408`). With a selected CONTAINER it
  appends to the END of that container's first/derived slot
  (`resolveSelectedSlotTarget`, `CustomScreenEditorPage.tsx:367-376` — `field-group`→
  `content`, `columns`→`left`, else first slot key). There is a `selectedSectionId`
  state, but it does **NOT** steer insertion. `moveScreenBlock` is up/down reorder
  within a sibling list only (`screenDocumentOps.ts:674-707`). So: **no author-chosen
  insertion index, no chosen target section, no chosen slot at arbitrary depth, no
  drag-to-position.** Owner: *"kontenery zagnieżdżają się dowolnie ale wszystko idzie
  w jedno miejsce — nie mogę wybrać miejsca — brak interaktywności — powinno być
  lepiej."*
- **Two DISJOINT halves of the kind set + a redundant per-field list + a mislabeled
  button.** The "Add section" button (`ScreenAuthoringCanvas` ~:508,
  `data-screen-add-section`) does NOT create a section — it opens the COMMAND PALETTE
  (`setCommandOpen`) titled "Search and insert screen blocks or fields" with a BLOCKS
  group (`record-header`/`field-group`/`columns`/`rich-text`,
  `ScreenAuthoringCanvas.tsx:208-236`) + a redundant FIELDS group (one command per
  content field). The BLOCKS group is NOT a competing copy of the 9-chip
  `ScreenBlockLibrary` (`ScreenBlockLibrary.tsx:64-72`,
  Heading/Text/Field/Stat/Divider/Image/Related-list/Tabs/Button): the two sets are
  DISJOINT (zero overlap). The command palette is therefore the SOLE creation surface
  for `field-group`/`columns`/`record-header`/`rich-text` — all four are real kinds in
  `createScreenBlock` (`screenDocumentOps.ts:140/155/170/194`), and `field-group` +
  `columns` are two of the three nesting containers 500-02 must be able to insert INTO.
  Only the FIELDS group is genuinely redundant (the `Field` chip + inspector bind
  replaces it). So the fix is NOT "collapse two vocabularies into the 9 chips" (that
  would make `field-group`/`columns` UNCREATABLE and gut 500-02's nesting feature) — it
  is: preserve the container/composite kinds as first-class creation targets and remove
  ONLY the redundant per-field list. Sections are never actually created; the "Add
  section" label lies.
- **Redundant panel-toggle affordances.** Host `panelOpen` state
  (`CustomScreenEditorPage.tsx:182`) is driven by THREE affordances: the top-toolbar
  Hide/Show toggle (`screenPanelToggle`), an in-canvas right-edge `PanelRight` "Hide
  panel" button (`ScreenAuthoringCanvas.tsx:357-365`, close-only,
  `onPanelOpenChange(false)`), and the reopen "Show panel" chip. The shared shell
  `core/admin/ui/shared/CanvasEditor.tsx` is CONTROLLED (`panelOpen` read-only,
  `reopenAffordance` chip) and owns NO `PanelRight` close of its own — the redundant
  close-only button is HOST-owned, and `PageEditor.tsx:3024-3029` has the IDENTICAL
  host-owned close (`setPanelOpen(false)`). So the dedupe is a HOST-side change in the
  two host canvases and must cover BOTH Pages + Screens; the shared shell needs NO code
  change (it already renders exactly the two kept surfaces — the top `panelToggle`
  slot + the `reopenAffordance` chip).
- **Image is the only inconsistent static block.** On entry/preview, unbound
  `heading/text/divider/rich-text/button` render their authored static content
  (`ScreenRuntimeRenderer`) — legitimate. `image` is the exception: its `data`
  allow-list (`customScreenSchemas.ts:405`, `["label","fit","ratio","field"]`) has NO
  static `src`, so an unbound image renders only a labeled placeholder. Pick a
  resolution (static `src` schema-first, OR mark image "requires a bound field").

### Scope (owner-approved — 5 points)

1. **Sections first-class + palette unification.** "Add section" CREATES a real,
   empty, named top-level section; sections can be selected (steers insertion),
   renamed, reordered, deleted. Remove ONLY the redundant FIELDS group from the command
   palette (a field is added via the `Field` chip + bound in the inspector). Unify to
   ONE canonical kind vocabulary sourced from a single constant — but that vocabulary is
   the 9 chips PLUS the container/composite kinds the palette is the sole creation
   surface for today (`field-group` + `columns` at minimum — the two nesting containers
   500-02 targets — and `record-header` + `rich-text`). Expose those either as
   additional `ScreenBlockLibrary` chips or as a preserved "Blocks/Structure" palette
   group sourced from the same canonical constant; do NOT drop `field-group`/`columns`
   creation (that would leave 500-02 with no containers to nest into). If a searchable
   command palette survives, it MIRRORS that same canonical kind set + "Add section", not
   a divergent set.
2. **Insertion targeting + interactivity (the core).** New blocks insert into the
   SELECTED section (not always `sections[0]`); an insertion-POINT picker (before/after
   a given block, and INTO a chosen slot of any nested container — `field-group`/
   `columns`/`tabs` — at arbitrary depth); drag-to-position/reorder across sections +
   slots.
3. **Panel-toggle dedupe across the two HOST canvases.** ONE control surface (top
   toggle + reopen chip); remove the redundant in-canvas `PanelRight` close-only button
   from BOTH hosts (`ScreenAuthoringCanvas.tsx:357-365` +
   `PageEditor.tsx:3024-3029`) so Pages + Screens stay consistent (verify PageEditor
   otherwise unaffected). The shared `CanvasEditor` shell is CONTROLLED read-only and
   owns no close button — it needs NO code change; do NOT add a hide affordance into the
   shell (it would fork the host's single-source-of-truth `panelOpen` and violate the
   controlled-read-only contract at `CanvasEditor.tsx:14-23,64-73`).
4. **Static/image binding clarity.** Keep unbound heading/text/divider/button
   rendering on the front; fix the image inconsistency (chosen resolution justified in
   500-04).
5. **Tests/docs/closure.** Regression matrix (section CRUD, insertion targeting incl.
   index/slot/target-section, drag reorder, palette unification, toggle dedupe in
   Pages+Screens, static/image render), docs, changelog, README/board closure.

### Model note (schema-first, no version bump)

All model work is a **schema-first extension** normalized in the service module
(`core/services/customScreens/customScreenSchemas.ts` + `screenDocumentOps.ts`):
reject-unknown, `normalize*` in place, clamped limits, stable ids, explicit defaults,
non-destructive to stored V4 screens. **NO `ScreenDocumentV1.schemaVersion` bump**
(stays `1`), definition stays v4, no DB migration. This epic is **UI + client-state +
a schema-first model extension — no route, endpoint, auth, RBAC, CSRF, or rate-limit
change** (insertion/section ops mutate the in-memory `editorView.document` client-side
and persist through the EXISTING screen PATCH under existing RBAC).

---

## Architecture (files to add / change)

```
1 — sections first-class + palette unification
  EDIT core/services/customScreens/screenDocumentOps.ts        (addScreenSection / renameScreenSection / moveScreenSection / removeScreenSection; stable createId("section"))
  EDIT core/admin/ui/custom-screens/CustomScreenEditorPage.tsx (handleAddSection/Rename/MoveSection/DeleteSection; selectedSectionId steers handleAddBlock target)
  EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx  ("Add section" creates a section (not command palette); section chrome = select/rename/reorder/delete; command palette (if kept) mirrors the canonical kind set + "Add section" — only the redundant FIELDS group is REMOVED; the container/composite BLOCKS group kinds (field-group/columns/record-header/rich-text) stay creatable)
  EDIT core/admin/ui/custom-screens/ScreenBlockLibrary.tsx     (canonical kind vocabulary is the single source = the 9 chips PLUS field-group/columns (and record-header/rich-text) as chips or a same-constant "Blocks/Structure" group; export the kind list the palette reuses — do NOT reduce creation to only the 9 chips)

2 — insertion targeting + interactivity
  EDIT core/services/customScreens/screenDocumentOps.ts        (addScreenBlockAt(document, block, {target}) with ScreenInsertTarget union; moveScreenBlockTo(document, blockId, {target}) cross-section/slot; findScreenBlockLocation helper)
  EDIT core/admin/ui/custom-screens/CustomScreenEditorPage.tsx (insertion-point state; handleAddBlock resolves ScreenInsertTarget from section/point/slot selection; handleDragMove)
  EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx  (before/after insertion affordances per block; per-container per-slot drop zones; drag handles + drop intents)
  EDIT core/admin/ui/custom-screens/ScreenBlockInspector.tsx   (optional "Insert into" slot picker for the selected container)

3 — panel-toggle dedupe (HOST canvases; Pages + Screens)
  VERIFY core/admin/ui/shared/CanvasEditor.tsx                 (NO code change — the shell is CONTROLLED read-only (CanvasEditor.tsx:14-23,64-73), owns no PanelRight close, and already renders exactly the two kept surfaces: the top toolbar `panelToggle` slot + the `reopenAffordance` chip. Do NOT add a hide affordance here — it would fork the host's single-source-of-truth panelOpen and break both Pages + Screens.)
  EDIT core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx  (remove the in-canvas PanelRight "Hide panel" close-only button at :357-365, `onClick={() => onPanelOpenChange(false)}`)
  EDIT core/admin/ui/pages/PageEditor.tsx                      (remove the equivalent in-canvas close at :3024-3029, `onClick={() => setPanelOpen(false)}`; verify top toggle + reopen chip unaffected)

4 — static / image binding clarity
  EDIT core/services/customScreens/customScreenSchemas.ts      (image data allow-list + normalizer for the chosen resolution — see 500-04)
  EDIT core/admin/ui/custom-screens/ScreenBlockInspector.tsx   (image inspector: static src control OR "requires a bound field" affordance)
  EDIT core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx  (image entry/preview render for the chosen resolution)

5 — tests / docs / closure
  ADD  tests/vitest/customScreens/screen-document-sections.test.ts
  ADD  tests/vitest/customScreens/screen-document-insertion.test.ts
  ADD  tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx
  ADD  tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx (Pages + Screens)
  EDIT tests/vitest/**custom-screen**, _docs/CONTENT_TYPES_SPEC.md, _docs/_CHANGELOG/, _docs/_TASKS/README.md
```

---

## Subtask breakdown

| ID | Title | One-line |
|---|---|---|
| TASK-500-01 | Sections First-Class & Palette Unification | "Add section" creates a real named top-level section (select/rename/reorder/delete); `selectedSectionId` steers insertion; remove ONLY the redundant palette FIELDS group and unify to ONE canonical kind vocabulary = the 9 chips PLUS the container/composite kinds (`field-group`/`columns` + `record-header`/`rich-text`) — `field-group`/`columns` creation MUST be preserved so 500-02 has containers to nest into. |
| TASK-500-02 | Insertion Targeting & Interactivity | `addScreenBlockAt` / `moveScreenBlockTo` with a `ScreenInsertTarget` union (target section, before/after index, chosen slot at arbitrary depth) + drag-to-position/reorder across sections and slots. |
| TASK-500-03 | Panel-Toggle Dedupe (Host Canvases) | Remove the redundant in-canvas `PanelRight` close-only button from the two HOST canvases (`ScreenAuthoringCanvas.tsx:357-365` + `PageEditor.tsx:3024-3029`); the shared `CanvasEditor` shell is CONTROLLED read-only and needs NO change (verify only — do NOT add a hide affordance there); keep the top toggle + reopen chip as the sole surface across BOTH Pages + Screens. |
| TASK-500-04 | Static Block & Image Binding | Keep unbound heading/text/divider/button rendering; resolve the image inconsistency (schema-first static `src`, reject-unknown, non-destructive — OR an explicit "requires a bound field" builder affordance), justified. |
| TASK-500-05 | Screen-Builder Tests, Docs & Closure | Regression matrix (section CRUD, insertion index/slot/target-section, drag reorder, palette unification, toggle dedupe Pages+Screens, static/image render), docs, changelog, README/board/Statistics closure. |

**Child files:** `TASK-500-01-Sections-First-Class-And-Palette-Unification.md`,
`TASK-500-02-Insertion-Targeting-And-Interactivity.md`,
`TASK-500-03-Panel-Toggle-Dedupe-Shared-Shell.md`,
`TASK-500-04-Static-Block-And-Image-Binding.md`,
`TASK-500-05-Screen-Builder-Tests-Docs-Closure.md`. Each carries **Parent Task:**
TASK-500 and canonical **Status:** ⏳ To Do.

**Sequencing:** 500-01 (sections + palette) is the foundation — a real selectable
section is the target `addScreenBlockAt` steers into, so it gates 500-02. 500-02 is the
core interactivity keystone. 500-03 is an isolated shared-shell dedupe (independent,
can land in parallel). 500-04 is an isolated schema/renderer fix (independent). 500-05
closes tests + docs after 01–04. Each leaf isolates in a worktree (per the
concurrent-drift-agents memory) and runs ≥5 sequential drift-verify passes before
merge. Do NOT commit during planning.

---

## Execution-ready model contract (500-01 / 500-02)

The ops functions live in `core/services/customScreens/screenDocumentOps.ts` (Bun-free,
pure). Stable ids via the existing `createId("section")`; explicit defaults; clamped
indices. Shape:

```ts
// 500-01 — sections as first-class, top-level only (sections CANNOT nest).
export function addScreenSection(
  document: ScreenDocumentV1,
  input: { label?: string; atIndex?: number } = {}
): { document: ScreenDocumentV1; sectionId: string } {
  const section = createScreenSection({ label: input.label ?? "Section" }); // seeds data.title
  const sections = [...document.sections];
  const clamped = clampIndex(input.atIndex ?? sections.length, 0, sections.length);
  sections.splice(clamped, 0, section);
  return { document: { ...document, sections }, sectionId: section.id };
}
export function renameScreenSection(document, sectionId, label): ScreenDocumentV1 {
  // reuse updateScreenSection(document, sectionId, { label, data: { ...s.data, title: label } })
}
export function moveScreenSection(document, sectionId, direction: "up" | "down"): ScreenDocumentV1 {
  // clamp at ends; no-op past the boundary (mirrors moveScreenBlock's guard)
}
export function removeScreenSection(
  document, sectionId
): { document: ScreenDocumentV1; removed: ScreenSectionV1 | null } {
  // LAST-SECTION RULE (deterministic): if only ONE section remains, removeScreenSection
  // NO-OPS — returns { document: unchanged, removed: null } (the document always keeps at
  // least one section for the canvas to steer insertion into; there is no zero-sections
  // editor state and no lazy re-seed). Otherwise splice the section out. Collect removed
  // block ids so the host can prune their bindings (removeScreenBindingsForBlockTree per
  // removed block).
}

// 500-02 — a single deterministic insert target union (no more "append to sections[0]").
export type ScreenInsertTarget =
  | { kind: "section-end"; sectionId: string }                              // default when a section is selected
  | { kind: "section-index"; sectionId: string; index: number }            // before/after a top-level block
  | { kind: "slot-end"; sectionId: string; parentId: string; slotId: string }
  | { kind: "slot-index"; sectionId: string; parentId: string; slotId: string; index: number };

export function addScreenBlockAt(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  // Resolve the sibling list the target names (section.blocks OR the nested container slot,
  // via the existing visitBlocks walker), clamp the index to [0, list.length], splice `block` in.
  // Unknown sectionId/parentId/slotId ⇒ FAIL-SOFT: fall back to { section-end } of the first
  // section (never throw in the editor path; the write normalizer is the strict gate on save).
}
export function moveScreenBlockTo(
  document: ScreenDocumentV1,
  blockId: string,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  // 1) removeFromBlocks(blockId) capturing the node (reuse existing removeScreenBlock walker).
  // 2) GUARD: reject a move INTO the moved block's own subtree (collectScreenBlockIds(node) must
  //    not contain target.parentId) ⇒ no-op, returns the original document (prevents cycles).
  // 3) addScreenBlockAt(strippedDocument, node, target) with the SAME id (a MOVE, not a clone —
  //    bindings keyed by blockId stay valid, no binding rewrite needed).
}
export function findScreenBlockLocation(
  document, blockId
): { sectionId: string; parentId: string | null; slotId: string | null; index: number } | null {
  // Walk sections → blocks → slots; used by the canvas to render before/after affordances and by
  // moveScreenBlockTo's cycle guard. Deterministic pre-order traversal.
}
```

Host wiring (`CustomScreenEditorPage.tsx`): `handleAddBlock(type, field)` resolves a
`ScreenInsertTarget` from, in priority order, (a) an explicit insertion-point the author
clicked (before/after a block, or a slot drop zone), else (b) the selected container's
chosen slot, else (c) `{ kind: "section-end", sectionId: selectedSectionId ?? firstSectionId }`.
This REPLACES the current `resolveSelectedSlotTarget` + bare `addScreenBlock(document,
block, target?)` path — the legacy `addScreenBlock`/`moveScreenBlock` stay exported for
one release as thin wrappers over the new functions (non-destructive; existing tests
keep importing them) OR are migrated with their call sites updated in 500-02, whichever
the leaf chooses; either way `sections[0]`-only insertion is GONE.

---

## Image resolution (500-04) — recommended: schema-first static `src`

Recommended resolution (justified in 500-04): add a static `src` to the image kind,
schema-first, matching how heading/text/button already carry authored static content.

```ts
// customScreenSchemas.ts — image allow-list gains "src" (non-destructive: stored images
// without src still normalize; new key is optional).
image: ["label", "fit", "ratio", "field", "src"],
// normalizeScreenBlockData image branch:
case "image":
  if ("fit" in data) data.fit = coerceScreenEnum(data.fit, ["cover", "contain"], "cover");
  if ("src" in data) data.src = normalizeImageSrc(data.src); // trims; keeps only http(s)/relative /… or media ref; drops javascript:/data: ⇒ "" (reject-unknown stays intact)
  break;
```

Renderer (`ScreenRuntimeRenderer`) image resolution order on entry/preview — PRESERVE
the current override-first precedence (`ScreenRuntimeRenderer.tsx:724`,
`readMediaPresentationValue(block.id) ?? resolveMediaSrc(bound)`, which TASK-498's
presentation-override editing surface relies on and this epic promises not to regress):
media/presentation override → bound `field` src → `data.src` static → labeled
placeholder. The new static `data.src` slots in ABOVE the placeholder and BELOW the bound
field; it does NOT demote the explicit author override (do NOT invert
`readMediaPresentationValue ?? resolveMediaSrc(bound)`). This makes image consistent with
the other static kinds while keeping reject-unknown, a clamped/validated src (no
`javascript:`/`data:` injection), and full backward compatibility.
The alternative (mark image "requires a bound field" — a builder-only affordance, no
schema change) is documented as the rejected fallback with the reason.

---

## Security Contract (epic-level)

**UI/client-state + schema-first model; no route/RBAC/endpoint change.** Section CRUD,
insertion targeting, and drag-reorder all mutate the in-memory
`editorView.document` client-side and persist through the EXISTING custom-screen
definition PATCH under existing RBAC. The model extension is **schema-first /
reject-unknown / backward-compatible**: `normalizeScreenBlockData` keeps its per-kind
reject-unknown allow-lists (image gains an OPTIONAL, validated `src`; unknown keys still
throw `custom_screen_definition_invalid`); `normalizeScreenSection` /
`normalizeScreenDocumentV1` continue to reject unknown section/document keys; stored V4
screens read back byte-stable (legacy kinds stay permissive, the read-repair path is
untouched). **NO `ScreenDocumentV1.schemaVersion` bump** (stays `1`), definition stays
v4, **no DB migration.** No subtask touches an API route, endpoint visibility, auth,
CSRF, or rate limit — so a Security Contract subsection appears in a child file ONLY if
that child touched a route (none do; each child states "UI/client-state + schema-first
model; no route/RBAC/endpoint change"). The image `src` normalizer is the one input-
sanitization surface: it rejects `javascript:`/`data:` schemes so raw stored input never
reaches an `<img src>` (defense-in-depth; the value is client-authored, not attacker-
supplied cross-tenant).

---

## Contract Audit (≥5 rounds, anchored to real source)

1. **Insertion anchors verified.** `screenDocumentOps.ts:377-427` (`ensureSectionForInsert`
   + `addScreenBlock` `sections[0]` append), `:674-707` (`moveScreenBlock` up/down only);
   `CustomScreenEditorPage.tsx:367-396` (`resolveSelectedSlotTarget` + `handleAddBlock`,
   `selectedSectionId` set but not steering). Confirms the "one place" gap.
2. **Sections are flat.** `customScreenSchemas.ts:126-139` — `ScreenSectionV1.type:"section"`
   top-level in `ScreenDocumentV1.sections`; blocks nest via `children?[]`/`slots?{}`,
   sections do NOT nest. `addScreenSection` therefore splices into `document.sections`
   only; `createScreenSection` (`screenDocumentOps.ts:61-76`) already seeds `data.title`.
3. **Palette sets are DISJOINT, not duplicated.** The command palette
   (`ScreenAuthoringCanvas.tsx:208-236`, `setCommandOpen`) exposes
   `record-header`/`field-group`/`columns`/`rich-text` + a FIELDS group; the canonical
   `ScreenBlockLibrary` (`ScreenBlockLibrary.tsx:64-72`) exposes the OTHER 9 kinds — zero
   overlap. All four palette BLOCKS kinds are real in `createScreenBlock`
   (`screenDocumentOps.ts:140/155/170/194`), so the palette is their SOLE creation surface.
   500-01 unifies both halves into one canonical constant and removes ONLY the redundant
   FIELDS group (Field chip + inspector bind covers it); `field-group`/`columns` stay
   creatable (they are 500-02's nesting targets).
4. **Toggle triplication is shared.** `CanvasEditor.tsx:15-23,145-155` is CONTROLLED with a
   `reopenAffordance` chip; the in-canvas `PanelRight` close lives in the HOST canvases
   (`ScreenAuthoringCanvas` ~:357, and the `PageEditor` equivalent). Dedupe removes the
   host-level close and keeps the top toggle + chip — same change lands for Pages + Screens.
5. **Schema-first / non-destructive.** `normalizeScreenBlockData` (`customScreenSchemas.ts:
   400-460`) per-kind reject-unknown; image allow-list (`:405`) currently lacks `src`
   (confirms the inconsistency). Adding optional `src` + a scheme-validating normalizer is
   additive; no schemaVersion bump; `normalizeScreenDocumentV1`/`ForRead` (`:621-712`) reject
   unknown doc/section keys and read stored V4 byte-stable — asserted in 500-05.
6. **No-endpoint / client-state.** All mutations run through the existing
   `updateEditorView` → definition PATCH; no new route, no RBAC change (mirrors TASK-498's
   board-level guarantee).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` lanes)

The consolidated matrix + gate live in **TASK-500-05 §1**; each subtask owns its suite
list. All new UI/domain suites run in the **Vitest (Bun-free)** lane (the screen builder
is UI + a pure ops/schema module — no Bun runtime, no route handler). Epic invariants
that MUST stay green and MUST NOT be weakened:

- **Section CRUD** — `tests/vitest/customScreens/screen-document-sections.test.ts`:
  `addScreenSection` (append + `atIndex` clamp, stable id, `data.title` seeded),
  `renameScreenSection`, `moveScreenSection` (boundary no-op), `removeScreenSection`
  (removed block ids collected for binding pruning; and the LAST-SECTION rule — deleting
  the only remaining section NO-OPS, returns `removed: null`, and leaves exactly one
  section so the doc never reaches zero sections).
- **Insertion targeting** — `tests/vitest/customScreens/screen-document-insertion.test.ts`:
  `addScreenBlockAt` for all four `ScreenInsertTarget` kinds (section-end/section-index/
  slot-end/slot-index) incl. index clamp + fail-soft on unknown target; `moveScreenBlockTo`
  cross-section + cross-slot at depth, the SAME-id (move-not-clone) invariant, and the
  cycle guard (move into own subtree ⇒ no-op).
- **Editor interactivity** — `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx`:
  block inserts into the SELECTED section (not `sections[0]`), before/after affordance
  targets the right index, slot drop zone targets the right container/slot at depth, drag
  reorder across sections. Selection + `selectedSectionId` follow the inserted block.
- **Palette unification** — assert the creation surface exposes the FULL canonical kind
  set (the 9 chips PLUS `field-group`/`columns` and `record-header`/`rich-text`) so
  `field-group`/`columns` remain creatable, and NO FIELDS group survives; the command
  palette (if kept) mirrors that same canonical set + "Add section"; "Add section" creates
  a section (not `setCommandOpen`).
- **Toggle dedupe (Pages + Screens)** —
  `tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx`: exactly ONE
  hide affordance (top toggle) + the reopen chip; the in-canvas `PanelRight` close is
  gone; PageEditor + Screen editor both toggle correctly and PageEditor is otherwise
  behaviour-identical (existing `page-editor-*` suites stay green — the refactor cannot
  reach Pages behaviour).
- **Static / image render** — unbound heading/text/divider/button still render authored
  content on entry/preview; image with static `src` renders it, image with neither src
  nor field shows the labeled placeholder, and the `src` normalizer drops
  `javascript:`/`data:`. Stored-V4 byte-stability + reject-unknown assertions stay green.

Full gate per subtask: `bun --cwd core lint`, `bun --cwd core lint:types`,
`bun --cwd core test:bun`, full vitest, the repo gate alias, and real-input playwright
smoke (no synthetic-only passes; live side-by-side vs the prototype for interactivity).

---

## Acceptance criteria

Measured live against the prototype
`/home/coder/project/Coderso/_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`
for LOOK **and** live interactivity (light + dark, `:5173==200`):

1. **Sections are first-class.** "Add section" creates a real, empty, named top-level
   section; sections can be selected, renamed, reordered, and deleted from the canvas —
   matching the prototype's section chrome.
2. **Insertion is author-directed.** A new block lands in the SELECTED section; the
   author can insert before/after any block and INTO a chosen slot of any nested
   container (`field-group`/`columns`/`tabs`) at arbitrary depth. No block is forced into
   `sections[0]`.
3. **Drag-to-position works.** Blocks can be dragged to reorder within a list and moved
   across sections and slots, with a cycle guard (a container cannot be dropped into
   itself). Move preserves the block id + its bindings.
4. **One block vocabulary — no lost kinds.** A single canonical kind set drives creation
   = the 9 chips PLUS `field-group`/`columns` (and `record-header`/`rich-text`); the
   command palette (if present) mirrors that same set + "Add section"; only the redundant
   FIELDS group is gone. `field-group`/`columns` are still creatable (500-02's nesting
   containers were not dropped).
5. **One panel-toggle surface, shared.** Only the top toggle + reopen chip control the
   panel; the redundant in-canvas `PanelRight` close is removed from the two HOST
   canvases (`ScreenAuthoringCanvas` + `PageEditor`) — the shared `CanvasEditor` shell is
   unchanged (controlled read-only, no hide affordance added) — and Pages + Screens
   behave identically.
6. **Image consistency.** Unbound heading/text/divider/button render authored content on
   the front; image renders a static `src` (or is clearly marked "requires a bound field"
   — whichever 500-04 ships), with reject-unknown + backward compatibility intact.
7. **No regression / no schema bump.** TASK-498 look parity, the presentation-override
   editing surface, the Bun-free vitest boundary, `ScreenDocumentV1 schemaVersion:1`,
   definition v4, and stored-V4 byte-stability all hold; no route/RBAC change; all gates
   green (lint/types/test:bun/vitest/gate) + playwright smoke.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (To Do table) + **Statistics** when subtasks
  change status. **Board-sync requirement (AGENTS.md):** the board index MUST carry a row
  for the **TASK-500** parent AND each of **TASK-500-01..05** with Statistics counts
  updated, or a task-graph/board-sync gate can fail on a task file with no board row.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-500** + the closed subtasks.
- Extend `_docs/CONTENT_TYPES_SPEC.md` (screens contract) with the section-CRUD +
  insertion-target contract and the image static-`src` allow-list (TASK-500-05).
