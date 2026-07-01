# TASK-500-05: Screen-Builder Tests, Docs & Closure
# FileName: TASK-500-05-Screen-Builder-Tests-Docs-Closure.md

**Priority:** High
**Category:** Testing / Documentation / Custom Screens / Screen Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-500-01, TASK-500-02, TASK-500-03, TASK-500-04
**Status:** ⏳ To Do
**Parent Task:** TASK-500

---

## Overview

Consolidate the cross-cutting regression matrix for the functional screen-builder
upgrade (sections first-class, insertion targeting + drag, panel-toggle dedupe,
static/image binding), run the full gate, verify the runtime end-to-end against the
prototype, and CLOSE TASK-500 (changelog + board/Statistics + spec). This subtask owns
the invariant suite that 500-01..04 MUST NOT break — especially the **stored-V4
byte-stability / reject-unknown** ops+schema assertions, the **PageEditor
behaviour-isolation** guarantee for the shared-shell dedupe, and the **no
`schemaVersion` bump** invariant — plus the final doc-hygiene closure.

- **Goal:** all screen-builder + shared-canvas + page-editor suites green TOGETHER;
  byte-identity/reject-unknown unchanged; runtime-smoked live vs the prototype;
  changelog + board + spec updated.
- **Out of scope:** new behaviour. This subtask is closure only — it authors/consolidates
  tests, docs and the board flip; it does not add builder features. Any behaviour gap it
  surfaces is filed back to 500-01..04, not patched here.

---

## Security Contract / scope note

**UI/client-state + schema-first model; no route/RBAC/endpoint change.** This subtask
adds no code behaviour and touches no API route, endpoint visibility, auth, CSRF, or
rate limit. It ASSERTS the security invariants the prior subtasks established, so the
closure text can state them truthfully:

- `normalizeScreenBlockData` keeps its per-kind reject-unknown allow-lists; the image
  kind's OPTIONAL new `src` (500-04) is scheme-validated (`javascript:`/`data:` dropped
  to `""`), and unknown keys still throw `custom_screen_definition_invalid`.
- `normalizeScreenSection` / `normalizeScreenDocumentV1` / `normalizeScreenDocumentV1ForRead`
  continue to reject unknown section/document keys and read stored V4 screens byte-stable.
- **NO `ScreenDocumentV1.schemaVersion` bump** — it stays `1`
  (`customScreenSchemas.ts:57,137,622-631`); definition stays v4; NO DB migration.
- All section CRUD / insertion / drag mutations run through the in-memory
  `editorView.document` and persist through the EXISTING custom-screen definition PATCH
  under existing RBAC — no new public write surface.

The closure MUST state explicitly: **no new public endpoint, no RBAC change, no DB
migration, no schemaVersion bump.**

---

## Implementation Pseudocode (regression matrix + closure)

### 1. Consolidated regression matrix (must all be green TOGETHER)

All new UI/domain suites live in the **Vitest (Bun-free)** lane — the screen builder is
admin UI + a pure ops/schema module (no Bun runtime, no route handler). 500-05 verifies
each subtask's suite exists AND that the whole set passes together (no suite weakened to
fit).

```
# --- 500-01: sections first-class + palette unification ---
tests/vitest/customScreens/screen-document-sections.test.ts        # NEW (500-01) — section CRUD ops
tests/vitest/ui-integration/screen-editor-sections.test.tsx        # NEW (500-01) — "Add section" creates a section; select/rename/reorder/delete chrome; palette mirrors 9 chips + "Add section", NO FIELDS group

# --- 500-02: insertion targeting + interactivity (the core) ---
tests/vitest/customScreens/screen-document-insertion.test.ts       # NEW (500-02) — addScreenBlockAt / moveScreenBlockTo / findScreenBlockLocation
tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx  # NEW (500-02) — selected-section insert, before/after, slot-at-depth, drag reorder

# --- 500-03: panel-toggle dedupe (shared shell; Pages + Screens) ---
tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx  # NEW (500-03) — one hide affordance; PanelRight close gone; Pages + Screens both toggle
tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx    # EXISTING — stays green (controlled panelOpen + reopenAffordance chip contract, CanvasEditor.tsx:15-23,145-155)

# --- 500-04: static block & image binding ---
tests/vitest/custom-screen/custom-screen-runtime-renderer.test.tsx  # EDIT — unbound heading/text/divider/button still render; image static-src render + placeholder fallback
                                                                    #   (actual path: tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx)

# --- PRESERVED invariants (500-05 asserts these DO NOT move) ---
tests/vitest/customScreens/screenDocumentOps.test.ts               # EXISTING ops suite — legacy addScreenBlock/moveScreenBlock still pass (thin wrappers or migrated call sites; sections[0]-only append GONE but the exported name/signature contract the suite imports stays honoured)
tests/vitest/customScreens/customScreenService.test.ts             # normalize round-trip; reject-unknown; stored-V4 read byte-stable
tests/vitest/customScreens/customScreenBackfill.test.ts            # read-repair / backfill path untouched
tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts # TASK-498 presentation-override surface unregressed
tests/vitest/customScreens/bindingResolver.test.ts                 # move-preserves-id ⇒ bindings keyed by blockId stay valid (no rewrite)
tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx  # Field chip + inspector bind still the field path (post FIELDS-group removal)
tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx   # TASK-498 look parity green
tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
tests/vitest/pages/page-editor-*                                    # PageEditor behaviour-IDENTICAL after the shared-shell dedupe (the refactor cannot reach Pages behaviour)
tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx      # any OTHER CanvasEditor consumer stays green
```

### 2. Regression-test SHAPE the subtasks must preserve (assertions, not just files)

```
# --- Section CRUD (screen-document-sections.test.ts, owned by 500-01, LOCKED here) ---
describe("addScreenSection")
  it("appends an empty named section with a stable createId('section') id + seeded data.title")
  it("respects atIndex and CLAMPS to [0, sections.length]")            # atIndex:-5 ⇒ 0; atIndex:99 ⇒ end
describe("renameScreenSection")
  it("updates label AND data.title together (reuses updateScreenSection); unknown id ⇒ no-op")
describe("moveScreenSection")
  it("up/down reorders; move past a boundary is a NO-OP (mirrors moveScreenBlock guard)")
describe("removeScreenSection")
  it("returns { document, removed } and COLLECTS removed block ids for binding pruning")
  it("never collapses the doc to an unusable state (last-section invariant per 500-01)")

# --- Insertion targeting (screen-document-insertion.test.ts, owned by 500-02, LOCKED here) ---
describe("addScreenBlockAt — all four ScreenInsertTarget kinds")
  it("section-end appends to the NAMED section (not sections[0])")
  it("section-index splices before/after a top-level block; index CLAMPED to [0,len]")
  it("slot-end appends into a nested container slot (field-group.content / columns.left|right / tabs.tab-N)")
  it("slot-index splices at a chosen depth; arbitrary depth (field-group→columns→columns)")
  it("FAIL-SOFT: unknown sectionId/parentId/slotId ⇒ falls back to section-end of the first section, NEVER throws")
describe("moveScreenBlockTo")
  it("moves cross-section AND cross-slot at depth")
  it("MOVE-not-clone: preserves the same block id (bindings unchanged, no rewrite)")
  it("CYCLE GUARD: move a container INTO its own subtree ⇒ no-op, returns original document")
describe("findScreenBlockLocation")
  it("returns {sectionId,parentId,slotId,index} via deterministic pre-order walk; missing id ⇒ null")

# --- Editor interactivity (screen-editor-insertion-targeting.test.tsx, owned by 500-02) ---
it("a new block lands in the SELECTED section, not sections[0]")
it("before/after affordance targets the correct index")
it("a slot drop zone targets the correct container + slot at depth")
it("drag reorder moves a block across sections")
it("selection + selectedSectionId FOLLOW the inserted/moved block")

# --- Palette unification (screen-editor-sections.test.tsx, owned by 500-01) ---
it("'Add section' (data-screen-add-section) CREATES a section — does NOT call setCommandOpen")
it("the command palette (if kept) exposes EXACTLY the 9 canonical kinds + 'Add section'")
it("the palette has NO FIELDS group (field is the Field chip + inspector bind)")

# --- Toggle dedupe (canvas-editor-panel-toggle-dedupe.test.tsx, owned by 500-03) ---
it("renders exactly ONE hide affordance (top toolbar toggle) + the reopen chip when hidden")
it("the in-canvas PanelRight 'Hide panel' button is GONE (ScreenAuthoringCanvas ~:357 + PageEditor equivalent)")
it("Screen editor toggles panel open/closed via the top toggle only")
it("PageEditor toggles panel open/closed via the top toggle only AND is otherwise behaviour-identical")

# --- Static / image render (custom-screen-runtime-renderer.test.tsx, owned by 500-04) ---
it("unbound heading/text/divider/button STILL render authored content on entry + preview")
it("image with static data.src renders that src")
it("image with neither src nor field shows the labeled placeholder (unchanged)")
it("the src normalizer DROPS javascript:/data: schemes to '' (reject-unknown intact)")
it("stored-V4 screen without image.src normalizes byte-stable (non-destructive)")
```

### 3. Gate + runtime smoke

```
bun --cwd core lint
bun --cwd core lint:types
NODE_ENV=test vitest run --config vitest.config.ts     # full Vitest (Bun-free) lane
bun --cwd core test:bun                                 # Bun lane (must stay green; boundary intact)
# repo gate alias (gates:coderso — whatever it runs)

# Runtime smoke (memory: local-cms-run-and-test; gate on :5173==200, light + dark):
#   start coderso-dev-core-host ; admin http://coderso-a.localhost:5173/admin/  (white page ⇒ server down, re-run helper)
#   open a custom-screen entry builder and, LIVE (real mouse+keyboard, not synthetic):
#     1. "Add section" ⇒ a real empty named section appears; rename/reorder/delete it
#     2. select a NON-first section, add a block ⇒ it lands THERE (not sections[0])
#     3. insert a block before/after another; insert INTO a nested field-group/columns/tabs slot at depth
#     4. drag a block across sections + slots; drop a container onto itself ⇒ blocked (cycle guard)
#     5. panel: only the top toggle + reopen chip hide/show it; no in-canvas PanelRight close
#     6. open Pages editor ⇒ SAME single toggle surface, Pages otherwise unchanged
#     7. add an image block with a static src ⇒ renders on entry/preview; leave it unbound ⇒ placeholder
#   Measured LIVE side-by-side vs the prototype:
#     _docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx (section chrome + insertion look)
```

### 4. Closure

- Add a `_docs/_CHANGELOG/` entry using the mandatory `{N}-{YYYY-MM-DD}-short-title.md`
  naming (e.g. `_docs/_CHANGELOG/1208-2026-07-01-task-500-screen-builder-closure.md`,
  dated on the closing day; take the next free **No.** verified against
  `_docs/_CHANGELOG/README.md` at closing time — 1208 unless a later entry consumed it)
  AND add the matching **Index-table row** in `_docs/_CHANGELOG/README.md`
  (No., Date, Title, Type) per that README's Workflow. The entry links **TASK-500** +
  all five subtasks. State
  explicitly: sections first-class, author-directed insertion targeting + drag,
  panel-toggle deduped in the shared `CanvasEditor` (Pages + Screens), image
  resolution shipped (schema-first static `src` per 500-04, OR the "requires a bound
  field" fallback if that was chosen — record which), **no new public endpoint, no
  RBAC change, no DB migration, no `schemaVersion` bump (stays 1), definition stays
  v4, stored-V4 byte-stability + reject-unknown preserved, TASK-498 look parity + the
  Bun-free boundary + the presentation-override surface unregressed.**
- Extend `_docs/CONTENT_TYPES_SPEC.md` (screens contract) with: (a) the section-CRUD
  ops surface (`addScreenSection`/`renameScreenSection`/`moveScreenSection`/
  `removeScreenSection`), (b) the `ScreenInsertTarget` union + `addScreenBlockAt`/
  `moveScreenBlockTo`/`findScreenBlockLocation` insertion contract (target section,
  before/after index, chosen slot at arbitrary depth, fail-soft + cycle guard,
  move-preserves-id), and (c) the image `data` allow-list gaining the optional
  scheme-validated `src` (or the "requires bound field" affordance, whichever shipped).
- Flip **TASK-500** + **TASK-500-01..05** to ✅ Done in `_docs/_TASKS/README.md` board
  (To Do → Done tables) + update **Statistics** — closing agent only.
  > NOTE: this subtask file does NOT edit README; the parent/board author owns board
  > rows. The closing agent performs the flip as the LAST closure step.
- Record residuals as explicit follow-ups (not silent gaps), e.g.: whether legacy
  `addScreenBlock`/`moveScreenBlock` were kept as thin wrappers (deletable once no test
  imports them) or migrated; any `tabs`-slot drag affordance deferred; the rejected
  image alternative and why.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` lanes)

- **Lane:** Vitest (Bun-free) for every new UI/domain suite — the screen builder is
  admin UI + a pure ops/schema module; there is no Bun runtime or route handler in this
  epic, so no Bun-lane test is added. The existing `bun --cwd core test:bun` lane MUST
  still pass unchanged (boundary intact).
- **Together-green:** the full §1 matrix passes in ONE run; no suite is skipped or
  weakened to accommodate the new behaviour. PageEditor suites (`tests/vitest/pages/
  page-editor-*`) are the behaviour-isolation gate for the shared-shell dedupe (500-03).
- **Invariant assertions LOCKED here:** stored-V4 byte-stability + reject-unknown +
  no-`schemaVersion`-bump (`customScreenSchemas.ts:622-631`), move-preserves-id
  (bindings), fail-soft insertion, cycle guard.
- **Full gate:** `bun --cwd core lint`, `bun --cwd core lint:types`, full Vitest,
  `bun --cwd core test:bun`, repo gate alias.
- **Real-input runtime smoke** per §3 (real mouse + keyboard via playwright-cli,
  light + dark, `:5173==200`) — NOT synthetic-only; measured live side-by-side vs the
  prototype for section chrome + insertion interactivity.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board (To Do → Done) + **Statistics** — closing agent only
  (this file does not edit README).
- `_docs/_CHANGELOG/` TASK-500 closure entry — numbered `{N}-{YYYY-MM-DD}-short-title.md`
  (next free No. per `_docs/_CHANGELOG/README.md`, e.g. `1208-2026-07-01-...`) PLUS its
  **Index-table row** in `_docs/_CHANGELOG/README.md` (links all 5 subtasks; states the
  no-endpoint/no-migration/no-bump/byte-stable invariants).
- `_docs/CONTENT_TYPES_SPEC.md` — section-CRUD + `ScreenInsertTarget` insertion contract
  + image static-`src` allow-list.
