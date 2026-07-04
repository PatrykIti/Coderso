# 1209 - TASK-500 Screen Builder — Sections, Insertion Targeting & Editor UX

**Date:** 2026-07-02
**Version:** Unreleased
**Tasks:** TASK-500, TASK-500-01, TASK-500-02, TASK-500-03, TASK-500-04, TASK-500-05
**Type:** Admin UI/Custom Screens/Screen Builder/Page-Builder UX/QA/Docs/Task Board

## Overview

Functional follow-up on TASK-498's look parity: the Custom-Screen entry-view builder
becomes **author-directed**. Sections are first-class (create/select/rename/reorder/
delete), insertion is targeted (selected section, before/after index, chosen nested
slot at arbitrary depth) with drag-to-position across sections and slots, the panel
toggle is deduped to ONE surface across the Pages + Screens host canvases, and the
image kind gains a schema-first static `src` — closing the last static-block
inconsistency. All model work is a schema-first extension in
`screenDocumentOps.ts`/`customScreenSchemas.ts`; the editor mutates the in-memory
`editorView.document` and persists through the EXISTING definition PATCH.

## Key Changes

### Sections first-class + palette unification (TASK-500-01)
- New pure ops: `addScreenSection` (stable `createId("section")`, seeds `data.title`,
  `atIndex` clamped), `renameScreenSection` (label + `data.title` together),
  `moveScreenSection` (boundary no-op), `removeScreenSection` (returns the removed
  section for host-side binding pruning; **LAST-SECTION RULE** — deleting the only
  remaining section NO-OPS with `removed: null`, so the doc never collapses to an
  unusable zero-sections state), plus `appendScreenBlockToSection` (named-section
  append, fail-soft to the first section).
- "Add section" (`data-screen-add-section`) now CREATES a real, empty, named
  top-level section — it no longer opens the command palette; section chrome supports
  select (steers insertion) / rename / reorder / delete.
- ONE canonical kind vocabulary (`SCREEN_CANONICAL_KINDS` in `ScreenBlockLibrary.tsx`)
  = the 9 prototype chips (`SCREEN_PALETTE_CHIPS`) PLUS the container/composite kinds
  (`SCREEN_PALETTE_COMMANDS`: Record header/Field group/Two columns/Help text i.e.
  `record-header`/`field-group`/`columns`/`rich-text`). The command palette mirrors
  that FULL set + "Add section"; ONLY the redundant per-field FIELDS group was removed
  (a field = the Field chip + inspector bind). The visible chip grid stays at exactly
  the prototype's 9 chips; `field-group`/`columns` stay creatable (500-02's nesting
  targets).

### Insertion targeting + interactivity (TASK-500-02)
- New `ScreenInsertTarget` union (`section-end` / `section-index` / `slot-end` /
  `slot-index`) + `addScreenBlockAt` (clamped index, FAIL-SOFT to first-section end on
  an unresolvable target — never throws in the editor path; the save normalizers stay
  the strict gate), `moveScreenBlockTo` (removal-first cross-section/cross-slot MOVE:
  same block id preserved ⇒ bindings need no rewrite; **CYCLE GUARD** returns the
  ORIGINAL document when a container is dropped into its own subtree; sole owner of the
  same-sibling-list downward index decrement), and `findScreenBlockLocation`
  (deterministic pre-order walk).
- Host wiring: `handleAddBlock` resolves the target from (a) an armed before/after gap
  or slot drop zone, else (b) the selected container's slot, else (c) the SELECTED
  section — "always `sections[0]`" is gone. Canvas gains before/after gap affordances,
  per-container per-slot drop zones (suppressed inside the dragged subtree), and native
  DnD across sections + slots; selection + `selectedSectionId` follow the inserted or
  moved block.
- Legacy `addScreenBlock` is a NON-DESTRUCTIVE shim (no-target ⇒ `addScreenBlockAt`
  first-section end; the `{parentId, slotId}` branch keeps legacy semantics verbatim —
  the Bun-lane assistant `actionExecutorService.ts` detects "target not found" via
  deep-equality and must not inherit fail-soft). Legacy `moveScreenBlock` (sibling
  up/down) is retained unchanged.

### Panel-toggle dedupe across host canvases (TASK-500-03)
- Removed the redundant in-canvas `PanelRight` close-only button from BOTH hosts —
  `ScreenAuthoringCanvas.tsx` and `PageEditor.tsx` — leaving the top toolbar toggle +
  the reopen chip as the SOLE surface for Pages + Screens alike. The shared
  `CanvasEditor` shell needed NO code change (controlled read-only `panelOpen` +
  `reopenAffordance` contract preserved); PageEditor is otherwise behaviour-identical
  (all `page-editor-*` suites green unchanged).

### Static block & image binding (TASK-500-04)
- Chosen resolution: **schema-first static `src`** (the "requires a bound field"
  builder-only affordance was the rejected alternative — it would keep image the one
  kind unable to carry authored static content). The image `data` allow-list gains an
  OPTIONAL `src` (`["label","fit","ratio","field","src"]`); `normalizeScreenImageSrc`
  keeps only relative `/…` + `http(s)://` values and drops `javascript:`/`data:`/
  `blob:`/`file:`/bare tokens to `""` (never throws; unknown keys still throw
  `custom_screen_definition_invalid`).
- Renderer resolution order preserved override-first: per-entry media/presentation
  override → bound `field` src → static `data.src` → labeled placeholder. Unbound
  heading/text/divider/button keep rendering authored content on entry + preview.
  Inspector gains a static-src control (`custom-screen-image-inspector.test.tsx`).

### Tests, docs, closure (TASK-500-05)
- Consolidated §1 regression matrix green TOGETHER (19 files / 144 tests in one run):
  `screen-document-sections` (incl. last-section invariant + binding-pruning collect),
  `screen-document-insertion` (all four target kinds, fail-soft, move-not-clone, cycle
  guard, legacy-shim non-destructive), `screen-document-image-src` (safe-src
  byte-stable/idempotent, unsafe dropped, no-src stored-V4 round-trips byte-stable
  through `normalizeScreenDocumentV1`/`…ForRead`), `screen-editor-sections` (Add
  section creates — does NOT `setCommandOpen`; FULL canonical palette set + "Add
  section", NO FIELDS group; chip grid stays exactly 9), `screen-editor-insertion-
  targeting` (selected-section insert, one-shot gaps, slot-at-depth, DnD pre-removal
  index, same-id cross-section move, cycle-guard no-op), `canvas-editor-panel-toggle-
  dedupe` (Pages + Screens, one hide affordance, PanelRight gone, round-trips),
  `custom-screen-runtime-renderer` (unbound statics, static-src render, placeholder
  fallback, override precedence) + the preserved invariants: `screenDocumentOps`,
  `customScreenService`, `customScreenBackfill`, `screenEntryPresentationOverrides`
  (TASK-498 surface), `bindingResolver`, `custom-screen-editor-binding-flow`,
  `custom-screen-editor-restyle` (look parity), `custom-screen-record-interactions`,
  `custom-screen-image-inspector`, `canvas-editor`, `post-editor-canvas-shared`, and
  the Bun-free `custom-screen-authoring-boundary` suite. PageEditor behaviour-isolation
  gate: `tests/vitest/pages/*` 20 files / 302 tests green.
- `_docs/CONTENT_TYPES_SPEC.md` extended with the section-CRUD ops surface, the
  `ScreenInsertTarget` insertion contract (fail-soft + cycle guard + move-preserves-id),
  and the image static-`src` allow-list + scheme validation.

## Notes

- **No new public endpoint, no RBAC change, no DB migration, no `schemaVersion` bump**
  — `ScreenDocumentV1.schemaVersion` stays `1`, the definition stays v4; all mutations
  ride the existing custom-screen definition PATCH under existing RBAC. Stored-V4
  byte-stability + per-kind reject-unknown preserved; TASK-498 look parity, the
  presentation-override editing surface, and the Bun-free vitest boundary unregressed.
- **Fail-soft editor / strict save.** Editor-path ops never throw (unknown ids no-op
  or fall back); `normalizeScreenDocumentV1` on save remains the hard reject-unknown
  gate. The image `src` normalizer is the one input-sanitization surface
  (defense-in-depth; the value is client-authored).
- **Residuals (follow-ups, not silent gaps).** Legacy `addScreenBlock` stays exported
  as a thin shim and `moveScreenBlock` as the sibling up/down op (both still imported
  by the assistant executor + existing suites; deletable once those call sites
  migrate). `tabs` slots accept slot drop zones/moves but have no dedicated per-tab
  drag affordance chrome beyond the generic slot zones. The rejected image alternative
  ("requires a bound field") is documented in the spec with the reason.

## Validation

- Consolidated matrix (19 files, 144 tests) green in ONE vitest run; PageEditor lane
  (20 files, 302 tests) green — behaviour-isolation for the shared-shell dedupe.
- `bun --cwd core lint`, `bun --cwd core lint:types`, full Vitest (Bun-free) lane, and
  root `bun run test:bun` (Bun lane, boundary intact) — green at closure.

### Post-implementation audit follow-up (2026-07-02)

The post-impl audit flagged four MEDIUM findings; all fixed on the same tree
(no contract reopened, TASK-498 look parity preserved, fail-soft/strict split intact):

1. **Empty-document canvas** — `ScreenRuntimeRenderer` builder mode now gates the
   generic empty message on `document.sections.length === 0` (preview/entry keep the
   original `hasBlocks` gate byte-identically), so "Add section" on a brand-new
   zero-section screen renders a visible, selectable frame with rename/move/delete
   chrome and its section-end drop zone. New UI test covers the fresh-document flow.
2. **Drag-to-position feedback** — state-driven drop feedback replaces the
   `:hover`-only gap reveal (browsers suppress `:hover` during native drags): while a
   block is in flight all gaps force-reveal, the hovered gap/slot/section zone gets a
   `data-drag-hover` highlight, and block CARD BODIES resolve a drop to before/after
   that card by vertical midpoint instead of silently appending to the section end.
   Covered by 2 new vitest cases + real-input playwright drag (below).
3. **Spurious dirty state** — `handleRenameSection` no-ops when the committed label
   equals the section's current `label`/`data.title` (blur commits unconditionally),
   and `handleMoveSection` skips `updateEditorView` when `moveScreenSection` returns
   the same document reference (boundary/unknown-id), mirroring `handleDragMove`.
   Regression test asserts focus+blur-unchanged and boundary-move keep the save state
   clean while a REAL rename still marks dirty.
4. **DoD evidence (this section)** — `bun run gates:coderso` re-run on the post-fix
   tree 2026-07-02: **all 5 gates PASS** (functional / ux / performance / security /
   reliability), report at `.tmp/coderso-release-gates.json`. REAL-INPUT playwright
   smoke against `http://coderso-a.localhost:5173/admin/` (200), real mouse/keyboard
   (no synthetic dispatch): fresh screen → "Add section" renders the frame+chrome on a
   zero-section document; second section + non-first-section chip insert lands
   correctly; real `mouse.down/move/up` cross-section drag showed mid-flight feedback
   (4/4 gaps revealed, hovered gap `data-drag-hover="true"` resolved from the card
   midpoint) and dropped the heading BEFORE the text block in section 2; slot-at-depth
   armed `field-group.content` and a Stat chip landed in the slot; real-mouse
   cycle-guard drag (field-group onto its own nested block) left the tree unchanged;
   single panel toggle round-trip (Hide panel → reopen chip → Hide panel); static
   image `src` typed into the inspector rendered the `<img>` with that src; verified
   in BOTH light and dark themes (screenshots
   `.tmp/task500-postaudit-smoke-{light,dark}.png`).

## Task Board

- Flipped TASK-500 and TASK-500-01..05 from `To Do` to `Done`; Statistics adjusted by
  the TASK-500 deltas (To Do −6, Done +6).
