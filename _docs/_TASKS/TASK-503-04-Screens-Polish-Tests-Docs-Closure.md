# TASK-503-04: Screens Polish Tests, Docs, Closure
# FileName: TASK-503-04-Screens-Polish-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Testing / Documentation / Custom Screens / Entry View
**Estimated Effort:** Medium
**Dependencies:** TASK-503-01 (style contract), TASK-503-02 (renderer emission/labels/chrome/handle), TASK-503-03 (inspector + entry preferences)
**Status:** ✅ Done
**Completed:** 2026-07-02
**Parent Task:** TASK-503

---

## Overview

Closure of TASK-503: consolidate the full vitest + bun regression matrix for
the block style channel / clearable labels / clean entry view / badge drag
handle / image ratio+src fixes, VERIFY the guard tests the siblings land with
their code (the **absent-`style` byte-stability** pin, the `src`
normalization and the **ratio no-coercion / byte-stable-both-paths** pin — owned by 503-01; the **builder/preview class byte-identity**
snapshot, label semantics and the badge drag source — owned by 503-02; the
preferences hook + filtered src write — owned by 503-03), run all gates, do
the mandated ≥5-scenario real-input playwright smoke (VISIBLE EFFECT via
computed styles, never control presence), and close docs/changelog/board.

- **Goal:** every suite in §1-2 green together; stored V4 screens provably
  byte-untouched; builder/preview renderer output provably unchanged; the five
  owner scenarios pass live; changelog **next free number** (1210 is the last
  on disk today; **1211 is expected to be consumed by the parallel TASK-502**
  — take the next AFTER whatever exists, verify with
  `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail` at closing time
  (NUMERIC sort — a plain `sort` is LEXICAL and returns 999 as the max, colliding)) + README board/Statistics closed.
- **Out of scope:** new behavior. 503-01/02/03 ship their own unit coverage
  with their code; this subtask ADDS the cross-cutting tests below (service
  persistence, route rejection, inspector flows, insertion re-pointing),
  VERIFIES the sibling-owned pins are present and green, and closes. The two
  parent decisions are CLOSED here as documentation: `variant` "Background"
  row removed but key still accepted (decision 1); legacy record-header copy
  = authoring note, NO read-path repair (decision 2).

All test files below EXIST already (verified 2026-07-02) — this subtask
**extends** them, it does not create parallel suites (exception: the NEW
`use-screen-entry-preferences.test.ts`, which 503-03 lands with its hook —
verify, fill gaps only):

- `tests/vitest/admin/custom-screen-schemas.test.ts` (new-kind byte-stable :783, reject-unknown/legacy-permissive :803, v4 accept :510, legacy read migrations :356/:709)
- `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` (field builder/entry :606/:632, stat :154, image static src :243/:318, corner tag :594)
- `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` (native DnD — grep `fireDnd(..., "dragstart")`: SEVEN statements today at :395/:430/:464/:506/:561/:570/:612, each fires on `[data-screen-block-id="X"]` and EVERY one MUST be re-pointed to `[data-screen-drag-handle="X"]`; the drop/read queries `[data-screen-block-id]` at :224/:289/:331 stay on the wrapper (it keeps the id attr) — do NOT trust hardcoded line anchors, re-grep at closure)
- `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx` (src typing :73, image-only row :97, bound+static coexist :111)
- `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` (mounts `CustomScreenEntryEditor`; 503-03 extends it for the entry-canvas sub-toolbar toggle render, the `bg-dotted` drop on `[data-screen-editor-canvas-scroller]`, and the localStorage→badge-visibility integration)
- `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` (explicit canvas-file list :53-66 — does NOT yet scan `ScreenBlockInspector.tsx` or `hooks/`; extend the list)
- `tests/vitest/customScreens/screen-document-image-src.test.ts` (safe-src idempotent :46, unsafe→"" :57, no-src byte-stable :87)
- `tests/vitest/customScreens/customScreenService.test.ts` (updateCustomScreen V4 accept :402 — mocked-db persistence pattern)
- `tests/integration/routes/customScreensRoutes.test.ts` (makeRouter/runRoute harness :20-55, `mapCustomScreenError` pin :93 — `custom_screen_definition_invalid` → 400 already asserted)
- `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts` + `screen-document-sections.test.ts` + `screen-document-insertion.test.ts` (TASK-498/500 no-regress pins — UNTOUCHED)
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` (`PaletteChip` dead-code guard — UNTOUCHED, stays green)

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration.** The `style` channel rides the EXISTING
custom-screen definition PATCH (`customScreenRoutes.ts:115` →
`updateCustomScreen`; `core/server/validation/customScreenSchemas.ts` is a
pure re-export of the service schemas — 503-01 verifies, this subtask proves
with the route test). This subtask's job is to **prove** the invariants:

- **The one input surface** = (a) the `ScreenBlockStyleV1` validator — enums
  coerce to allow-listed values (`coerceScreenEnum`), ints clamp to
  `PAGE_BLOCK_BOX_SPACING_CLAMP` ({min:0,max:240}, `pageDocumentV2.ts:202`) /
  `SCREEN_BLOCK_MIN_HEIGHT_CLAMP` (0..640), unknown style/box keys throw the
  plain `Error("custom_screen_definition_invalid")` that
  `mapCustomScreenError` (`customScreenRoutes.ts:35-53`) maps to a 400
  ApiError — raw stored input can never reach the renderer's inline `style={}`
  except as a clamped number or a mapped class; and (b) the
  `normalizeScreenImageSrc` prefix filter (`/`, `http://`, `https://`;
  everything else → `""`, never throws — `customScreenSchemas.ts:427-434`,
  exported by 503-01), enforced on the save path AND the inspector write AND
  the builder preview — assert no `javascript:`/`data:` src can reach
  `<img src>` at ANY point in the session (§1.2, §1.4, smoke 5).
- **Schema-first / reject-unknown:** block-level allow-list
  (`normalizeScreenBlock`, `customScreenSchemas.ts:533-545`) gains exactly
  `"style"`; per-kind data allow-lists (`:400-409`) unchanged — `ratio` stays
  allow-listed and uncoerced (parent decision 3, NO schema coercion so stored
  reads are never mutated); legacy kinds stay permissive (pin :803).
- **Non-destructive / byte-stability guards (named):** (1) **absent-`style`
  spread-emit-only-when-present** — a block without `style` normalizes with
  NO `style` member injected; (2) **stored-V4 read byte-stability** — the
  :510/:709/:783 and image :87 round-trip pins stay green unmodified; (3)
  **builder/preview class byte-identity** — renderer builder+preview output
  for a no-`style` document is identical to the pre-503 snapshot (entry mode
  is the ONLY chrome that changes); (4) NO schemaVersion bump (stays 1 /
  definition v4); (5) NO read-path mutation of stored record-header copy
  (decision 2); (6) `variant` still accepted on read/write (only the dead
  inspector control is removed). Preferences are localStorage-only client
  state (`coderso.screens.entry.preferences.v1`) — no server surface.
- **Cross-cutting no-regress:** TASK-498 presentation-override surface
  (`screenEntryPresentationOverrides.test.ts` untouched), Bun-free boundary —
  no `@/ui/pages` imports in custom-screens UI (the services→services
  `pageDocumentV2` constant import is the allowed menuDocumentV2 precedent;
  the boundary suite's regexes at :69-75 must stay green over the EXTENDED
  file list), TASK-500 insertion/drop resolution (tests re-pointed, not
  weakened), `PaletteChip` dead-code guard.

---

## Implementation Pseudocode (test + closure matrix)

### 1. Vitest lane — Bun-free custom-screens suites (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/admin/custom-screen-schemas.test.ts` — style contract

(OWNED by 503-01, landed with its code — restated as the verification
checklist; this subtask only fills gaps found at closure.)

```ts
test("normalizeScreenBlock accepts a full valid style and round-trips it byte-stable", () => {
  const block = { id: "b1", type: "field", data: { field: "title" },
    style: { width: "half", minHeight: 120,
      margin: { top: 24, left: 8 }, padding: { top: 16 }, align: "center" } };
  const doc = wrapInV4Definition(block);                    // reuse the suite's v4 fixture builders (:510)
  expect(normalizeCustomScreenDefinitionForWrite(doc)).toEqual(doc); // deep-equal, no key added/dropped/reordered
});
test("absent style key stays absent after normalize (spread-emit-only-when-present)", () => {
  const normalized = normalizeCustomScreenDefinitionForWrite(wrapInV4Definition(blockWithoutStyle));
  expect("style" in firstBlock(normalized)).toBe(false);    // byte-stability guard #1
});
test("unknown style / box-side keys throw custom_screen_definition_invalid", () => {
  // style: { bogus: 1 }             ⇒ throws Error("custom_screen_definition_invalid")
  // style: { margin: { diag: 4 } }  ⇒ throws (box allow-list = top/right/bottom/left)
});
test("style VALUES coerce/clamp, never throw (screen coerce-not-throw style)", () => {
  // width: "huge" ⇒ "auto"; align: 7 ⇒ "start"; minHeight: 9999 ⇒ 640; minHeight: -4 ⇒ 0;
  // margin.top: 3.7 ⇒ 3 (floor); margin.top: NaN ⇒ clamp fallback (min); margin.top: "12" ⇒ fallback (non-number)
});
test("empty style / empty box records prune to NO member", () => {
  // style: {} and style: { margin: {} } ⇒ normalized block has NO `style` member
});
test("image ratio is NOT schema-coerced — byte-stable on BOTH paths (decision 3)", () => {
  // CANONICAL enum = SLASH tokens: screenImageRatios = ["auto","1/1","4/3","16/9","3/2"]
  // (this enum does NOT exist in the codebase today — grep: zero hits — 503-01 CREATES it;
  // pin the ACTUAL landed values from 503-01 before writing these assertions).
  // Parent decision 3 = NO schema-level coercion: normalizeScreenBlockData must NOT touch
  // ratio (it also runs on the READ path via normalizeScreenDocumentV1ForRead :725-727, so
  // any coercion would mutate stored reads). data.ratio: "16/9" round-trips byte-stable;
  // legacy COLON free text ("16:9") or any other non-member survives byte-IDENTICAL through
  // BOTH normalizeScreenDocumentV1 (write) AND normalizeScreenDocumentV1ForRead (read pins
  // :510/:709 unchanged). Display fallback to "auto" is asserted at the renderer class-map
  // (§1.2 / 503-02); inspector rewrite-on-explicit-change at 503-03.
});
test("normalizeScreenImageSrc is EXPORTED and behavior-identical", () => {
  // import { normalizeScreenImageSrc } from customScreenSchemas —
  // "/media/a.png" idempotent, "HTTPS://x" kept (trimmed original), "javascript:x"/"data:x"/42 ⇒ ""
});
test("variant still round-trips (control removed, key alive)", () => {
  // block { variant: "soft" } write+read round-trips byte-stable — decision 1 guard
});
```

#### 1.2 `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` — renderer

(OWNED by 503-02 — verify + extend. Reuse the suite's render harness and the
existing field/stat/image fixtures at :606/:154/:243.)

```ts
describe("block style emission (one wrap() path, three modes)", () => {
  test.each(["builder", "preview", "entry"])("mode %s emits identical style + classes", (mode) => {
    // style { width:"half", minHeight:120, margin:{top:24}, padding:{top:16}, align:"center" } ⇒
    const el = container.querySelector('[data-screen-block-id="b1"]');
    expect(el.style.minHeight).toBe("120px");
    expect(el.style.marginTop).toBe("24px");
    expect(el.style.paddingTop).toBe("16px");
    expect(el.className).toContain("w-1/2");           // screenBlockWidthClass.half
    expect(el.className).toContain("mx-auto");         // screenBlockAlignClass.center
  });
  test("align class is SUPPRESSED when horizontal margins are set (deterministic precedence)", () => {
    // style { align:"center", margin:{ left: 8 } } ⇒ no mx-auto/ml-auto/mr-auto, marginLeft: "8px"
  });
  test("no-style document: builder AND preview wrapper classNames are byte-identical to the pre-503 snapshot", () => {
    // byte-stability guard #3 — pin the exact class strings CAPTURED FROM SOURCE
    // (ScreenRuntimeRenderer.tsx:535-553), NOT from prose:
    //   builder wrapper = item selectionBorder + "rounded-2xl bg-card p-5" (:538-545)
    //   preview wrapper = "rounded-xl border bg-background shadow-sm" (:536)
    // Both are byte-identical to pre-503. The ONLY wrapper that changes is the ENTRY
    // (else) branch: it KEEPS selectionBorder({level:"item",selected,interactive})
    // (:546-553) and ONLY recolors the base bg "bg-background/90" → "bg-card" + adds
    // "rounded-xl" (recolor, do NOT drop selectionBorder). The entry editor threads
    // selectedBlockId/onSelectBlock (CustomScreenEntryEditor.tsx:448/:1322-1323) and the
    // TASK-498 presentation-override panel is scoped to the SELECTED block (:1014), so
    // the selected-block ring is load-bearing — dropping selectionBorder would regress
    // the 498 selection surface the Security Contract (§97) promises NOT to break.
  });
});
describe("clearable labels (divider model — :1006-1008)", () => {
  test('explicit "" label renders NO label <p> on field (entry): value-only composition', () => {});
  test('explicit "  " (whitespace) trims to no-label; stat "" renders value with NO label', () => {});
  test("ABSENT label key keeps today's default chain (field.label → systemFieldLabels → fieldName → 'Field'; stat 'Stat')", () => {
    // extend :632 — stored screens render identically
  });
  test('builder with a cleared label still shows the {{ FieldName }} token (binding stays visible)', () => {
    // extend :606 — token text falls back to the field-name stand-in INSIDE the token only
  });
});
describe("entry chrome — showFieldMetadata gating (:838-846, :851-855)", () => {
  test("entry mode DEFAULT (no prop / false): zero Editable/Read/Unbound badges, zero field-type badges", () => {});
  test("entry mode showFieldMetadata=true: badges render exactly as today", () => {});
  test("preview mode ALWAYS shows badges; builder mode chrome unchanged (keeps the field-type badge, no binding badges, tokens intact) — 2-vs-1 gating divergence", () => {});
  test("entry surface flatten: block wrapper RECOLORS to bg-card rounded-xl WHILE RETAINING selectionBorder, section carries bg-transparent; preview/builder classes untouched", () => {});
  test("entry mode selected block still carries the selection ring (TASK-498 no-regress): render with selectedBlockId=b1 ⇒ the [data-screen-block-id] wrapper has data-selected=\"true\" AND the selectionBorder ring class (the same token the builder card uses) — the bg-card recolor must NOT strip the ring the 498 override UX depends on", () => {});
});
describe("drag handle = corner type Badge (:648-653)", () => {
  test("builder wrapper div is NOT draggable; the badge carries draggable + data-screen-drag-handle=<blockId>", () => {});
  test("dragstart AND dragend on the badge set/clear drag state; onDragOver/onDrop STAY wired on the CARD wrapper (draggable + onDragStart + onDragEnd ALL move to the badge — parent scope D / 503-02 §3)", () => {});
});
describe("image ratio + builder src gate (:1020-1062)", () => {
  test("each screenImageRatios member emits its pinned aspect class; unknown/colon legacy ⇒ NO aspect class", () => {
    // canonical enum → class (define EVERY member; Tailwind has no built-in 4/3 or 3/2 utility):
    //   "auto" ⇒ (no aspect class) · "1/1" ⇒ aspect-square · "4/3" ⇒ aspect-[4/3]
    //   "16/9" ⇒ aspect-video · "3/2" ⇒ aspect-[3/2]
    // legacy colon free text ("16:9") coerced to "auto" on the last write ⇒ NO aspect class
  });
  test("builder preview of an unbound static src passes normalizeScreenImageSrc: javascript: draft NEVER creates an <img>, placeholder shows", () => {
    // extend :318 — defense-in-depth for pre-existing unsafe drafts
  });
});
```

#### 1.3 `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` — re-point, then extend

```ts
// UPDATE (not weaken): re-point ALL `fireDnd(..., "dragstart")` occurrences
// (grep — SEVEN today at :395/:430/:464/:506/:561/:570/:612, incl. the cycle-
// guard pair :561/:570 and the container/group drag :612) from
// `[data-screen-block-id="X"]` to `[data-screen-drag-handle="X"]`; miss one and
// it fires on a non-draggable card and the case throws (the wrapper div lost
// `draggable`/`onDragStart`/`onDragEnd` — ALL moved to the corner Badge). The
// block-id DROP/READ queries at :224/:289/:331 STAY on the wrapper (it retains
// the id attr). The TWO `fireDnd(..., "dragend")` calls at :539/:622 ALSO
// RE-POINT to `[data-screen-drag-handle="X"]`: draggable + onDragStart + onDragEnd
// ALL move to the badge (parent scope D / 503-02 §3), and the badge is a DESCENDANT
// of the wrapper, so a synthetic dragend dispatched on the wrapper would never reach
// the badge's onDragEnd — it MUST be fired on the handle. The badge's onDragEnd
// clears drag state (setDraggingBlockId(null)/setDragHoverTarget(null)), so the paired
// post-dragend assertions (:542 gaps re-hidden opacity-0; :629 columns-1 slot-dropzone
// reappears not-null) keep passing once re-pointed. ALL
// drop-resolution assertions
// (pre-removal index, cross-section+slot same-id, force-revealed gaps,
// card-midpoint before/after, cycle guard) keep their EXACT expectations.
test("a container (columns/field-group) drags BY ITS BADGE and reorders across the section", async () => {
  // dragstart on [data-screen-drag-handle="columns-1"] → drop on a later gap ⇒
  // section order updated; children list of columns-1 unchanged (moved as a unit)
});
test("dragging a NESTED child by its own badge moves ONLY the child (non-shadowing)", async () => {
  // dragstart on the nested text block's handle inside columns-1's slot ⇒ drop in section root:
  // child re-parents, columns-1 stays at its index — the container is NOT dragged
});
test("dragstart fired on the card BODY (old drag surface) does NOT start a block drag", async () => {
  // regression pin for the fix itself: wrapper has no draggable attr ⇒ no insertion state armed
});
```

#### 1.4 `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx` — inspector flows

```ts
// extend :73/:97/:111 (OWNED by 503-03 — verify + fill gaps):
test("Ratio EnumRow displays colon LABELS (auto/1:1/4:3/16:9/3:2) but WRITES the slash enum value", () => {
  // labels are cosmetic; each option's stored value is the canonical screenImageRatios
  // member — selecting "16:9" patches data.ratio = "16/9" (NOT "16:9", which would coerce
  // to "auto" on the next write and re-create the dead control this task removes)
});
test('typing an incomplete "https:/" keeps the DRAFT visible in the input while data.src stays ""', () => {
  // local-draft pattern: input value = draft; committed data.src = normalizeScreenImageSrc(draft)
});
test('a valid "/media/x.png" commits verbatim; "javascript:alert(1)" commits "" (placeholder state)', () => {});
test("the Background (variant) row is GONE from the inspector; Layout group (width/align/margin/padding) is present and patches block.style", () => {
  // buildStylePatch prunes: clearing all Layout inputs patches style back to undefined (no empty {})
});
```

#### 1.5 `tests/vitest/ui/use-screen-entry-preferences.test.ts` — NEW (503-03 lands it; verify)

```ts
// mirror the usePostEditorPreferences pattern (local-only v1, no userSettingsClient):
test('storage key constant is pinned: "coderso.screens.entry.preferences.v1"', () => {});
test("default is { showFieldMetadata: false } when storage is empty", () => {});
test("normalize: non-record / non-boolean / JSON parse error ⇒ default (swallowed, no throw)", () => {});
test("setPreferences persists and a re-mounted hook reads the value back (round-trip)", () => {});
```

#### 1.6 `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` — entry toggle + flat surface (503-03-owned; verify + fill gaps)

```ts
// mounts CustomScreenEntryEditor (503-03 extends this suite):
test("the entry-canvas sub-toolbar renders the [data-screen-entry-metadata-toggle] Switch, unchecked by default", () => {});
test('the canvas scroller [data-screen-editor-canvas-scroller] no longer carries "bg-dotted"; other scroller classes byte-identical', () => {});
test("toggling the metadata Switch ON persists to localStorage AND flips badge visibility through the threaded prop (integration with the 503-02 gate)", () => {
  // badges absent by default; present after toggle; survives re-mount (v1 key)
});
test("CustomScreenPreview path untouched: preview mode still renders badges with no prop passed", () => {});
```

#### 1.7 `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` — extend the scan list

```ts
// The explicit canvas-file list (:53-66) gains:
//   "core/admin/ui/custom-screens/ScreenBlockInspector.tsx",
//   "core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts",
// under the SAME forbidden regexes (:69-75: @/ui/pages, ui/widgets/registry,
// WidgetRenderer, …). This is the "no @/ui/pages imports in custom-screens UI"
// guard extended to every file 503 touches. PaletteChip dead-code guard
// (custom-screen-widget-picker.test.tsx) stays green WITHOUT edits.
```

#### 1.8 Regression pins (verify green, ZERO edits)

```
tests/vitest/admin/custom-screen-schemas.test.ts        :510 :709 :783 :803 (stored-V4 byte-stability + reject-unknown)
tests/vitest/customScreens/screen-document-image-src.test.ts :46 :57 :87 (extend ONLY for the exported-filter import in §1.1)
tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts   (TASK-498 surface)
tests/vitest/customScreens/screen-document-sections.test.ts / screen-document-insertion.test.ts (TASK-500 ops)
tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx      (PaletteChip guard)
```

### 2. Bun lane — route/service persistence

#### 2.1 `tests/integration/routes/customScreensRoutes.test.ts`

```ts
// Reuse the suite's makeRouter/runRoute harness (:20-55). The PATCH handler
// (customScreenRoutes.ts:115) calls the REAL updateCustomScreen (DB-backed in
// the bun lane — test:bun loads .env). Seed via createCustomScreen, clean up after.
test("PATCH /custom-screens/:id persists a definition carrying a valid block style", async () => {
  // create a screen (createCustomScreen with a minimal v4 definition);
  // runRoute(PATCH /custom-screens/:id, { body: { definition: v4WithStyle }, user }) ⇒
  // returned definition's block carries style verbatim; a follow-up getCustomScreen
  // round-trips it byte-stable (write→read identity).
});
test("PATCH /custom-screens/:id with an unknown style key rejects 400 custom_screen_definition_invalid", async () => {
  // body definition block: style: { bogus: 1 } ⇒
  // await expect(runRoute(...)).rejects.toMatchObject({
  //   code: "custom_screen_definition_invalid", status: 400 });
  // (mapCustomScreenError pin :93-106 already fixes the mapping — do not duplicate it)
});
```

#### 2.2 `tests/vitest/customScreens/customScreenService.test.ts` (mocked-db lane)

```ts
// extend the :402 "accepts V4 definition writes" pattern:
test("updateCustomScreen accepts a style-carrying V4 definition and preserves it", async () => {});
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit  # REPO ROOT — core lint:types does NOT typecheck tests/**; this subtask's deliverable IS test code
bun run test:vitest                 # full vitest lane (package.json:27), log-clean
bun run test:bun                    # REPO ROOT bun lane (package.json:26; DB gate — config-wizard reset caveat)
bun run gates:coderso               # repo gate alias (package.json:70)
```

#### SMOKE (owner mandate — ≥5 DISTINCT real-flow scenarios, playwright, real mouse/keyboard; assert VISIBLE EFFECT via computed styles / DOM order / persisted documents, NEVER control presence)

```
Environment (memory: local-cms-run-and-test): coderso-dev-core-host; admin
http://coderso-a.localhost:5173/admin/ (white page = server down — re-run the
helper; Bun server code does NOT hot-reload: kill the stale process first).
Use the House Projects screen (or seed an equivalent bound screen).

1. STYLE A BLOCK END-TO-END. Builder: on a bound field block set Layout
   width=half, align=center, margin.top=24, padding.top=16 → Save → open the
   published entry view (record edit). Assert in BOTH builder canvas and entry
   view: getBoundingClientRect().width ≈ 0.5 × the section content width
   (±8px) AND getComputedStyle(...).marginTop === "24px" AND
   paddingTop === "16px". Then GET the definition: an untouched sibling block
   has NO style member (absent-key byte-stability, live).
2. CLEAR A LABEL → CLEAN COMPOSITION. Inspector: clear a field Label and a
   stat Label → Save → entry view: the label <p> is ABSENT from both block
   DOMs (querySelector returns null), value/stat renders alone ("text left +
   value right" clean); back in the builder the {{ FieldName }} token still
   names the binding.
3. ENTRY-VIEW METADATA TOGGLE + CLEAN SURFACE. Fresh entry view (cleared
   localStorage): assert ZERO "Editable"/"Read"/"Unbound"/"NUMBER" badge
   elements; assert computed backgrounds — canvas scroller WITHOUT the dotted
   texture (no bg-dotted class / background-image none), block wrapper an
   OPAQUE card color (alpha 1), section transparent — one consistent surface.
   Then CLICK a block → its wrapper gains data-selected="true" AND the visible
   selection ring (TASK-498 no-regress: the opaque bg-card recolor keeps the ring
   the presentation-override panel is scoped to).
   Toggle "Show field metadata" ON in the entry-canvas sub-toolbar
   (`[data-screen-entry-metadata-toggle]`) → badges appear;
   reload the page → still ON (localStorage v1 key); toggle OFF → clean again.
   ALSO: clear the legacy "RECORD OVERVIEW" eyebrow + subtitle via the
   record-header inspector rows, save → entry view stays clean (decision 2
   proven live).
4. CONTAINER DRAG BY THE HANDLE, NESTED NON-SHADOWING. Real mouse drag of a
   columns/field-group container BY ITS CORNER BADGE to a new position →
   assert new DOM order AND the persisted section order after Save (GET the
   definition). Then drag a NESTED child by its OWN badge → assert only the
   child moved and the container index is unchanged. A drag attempt started on
   the card BODY does not move anything.
5. IMAGE RATIO + UNSAFE SRC. Set ratio 16:9 + a valid /media/… src → assert
   the img wrapper's computed aspect-ratio ≈ 1.78 in builder AND entry view.
   Then type "javascript:alert(1)" into Image URL character-by-character →
   assert at NO point does the builder DOM contain an <img> with a
   javascript: src (poll during typing), the placeholder shows, and after
   Save the stored document holds src: "".
```

### 4. Closure

- Changelog: `_docs/_CHANGELOG/<NEXT-FREE>-2026-MM-DD-task-503-screens-polish-block-style-labels-entry-view.md`
  — 1210 is the last number on disk TODAY and 1211 is expected to go to the
  parallel TASK-502: run `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail`
  at closing time (NUMERIC sort — a plain `sort | tail` sorts lexically and reports
  999 as the max) and take the next free after whatever TASK-502 consumed (1211 or
  1212). Link TASK-503 + all four subtasks.
  State explicitly: no new public endpoint, no RBAC change, no migration, NO
  schemaVersion bump (definition stays v4 / document schemaVersion 1); the
  `variant` Background control removed but the key still round-trips
  (decision 1); legacy record-header copy = authoring fix, NO read-path
  repair (decision 2); ratio gets NO schema-level coercion — a stored legacy
  free-text ratio round-trips byte-identical on BOTH read and write, and is
  resolved to "auto" only for DISPLAY at the renderer class-map (503-02) /
  rewritten only on explicit inspector change (503-03) (decision 3); all
  byte-stability guards (§Security 1-6) green.
- Permanent docs: `_docs/CONTENT_TYPES_SPEC.md` — ADD a
  "Custom Screen entry-view builder — block style channel, labels & entry
  presentation (TASK-503)" section after the TASK-500 section (:602):
  `ScreenBlockStyleV1` shape + enums/clamps (width/align vocabularies,
  `PAGE_BLOCK_BOX_SPACING_CLAMP` reuse, minHeight 0..640, sparse+prune,
  unknown-keys-throw / values-coerce), clearable-label semantics (explicit
  `""` ≠ absent; divider model; builder token stand-in), `ratio` enum +
  exported `normalizeScreenImageSrc` (now enforced write+preview+save),
  `showFieldMetadata` entry preference (storage key
  `coderso.screens.entry.preferences.v1`, default OFF, per-user/local) and
  the drag-handle contract (`data-screen-drag-handle` badge = source, card =
  drop target). Include the **legacy record-header copy authoring note**:
  "RECORD OVERVIEW / Preview the primary content fields…" is STORED
  widget-migration data — clear it via the record-header eyebrow/subtitle
  inspector rows (decision 2).
- Flip TASK-503 + all subtasks to ✅ Done in `_docs/_TASKS/README.md` board
  **+ Statistics** (closing agent only; single edit for board+stats).
- Record residuals honestly as follow-ups, not silent gaps (expected: block
  background as a future VALIDATED `ScreenBlockStyleV1.background` enum —
  the successor to the removed free-text variant row; preferences hook
  local-only v1, `userSettingsClient` sync deferred).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free custom-screens suites):** §1.1-1.8 —
`tests/vitest/admin/custom-screen-schemas.test.ts`,
`tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx`,
`tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx`,
`tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`,
`tests/vitest/ui/use-screen-entry-preferences.test.ts` (NEW, 503-03-owned),
`tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` (503-03-owned; entry toggle + `bg-dotted` drop),
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts`,
`tests/vitest/customScreens/customScreenService.test.ts`. Full
`bun run test:vitest` green AND log-clean (happy-dom; no act() warnings —
assert a clean console.error spy in the new UI tests).

**Bun lane:** §2.1 — `tests/integration/routes/customScreensRoutes.test.ts`
(style persists; unknown style key → 400 `custom_screen_definition_invalid`).
Full root `bun run test:bun` (package.json:26) green — core has NO `test:bun`
script; do NOT substitute `bun --cwd core test`.

**Must-not-weaken:** the stored-V4 byte-stability pins
(custom-screen-schemas.test.ts :510/:709/:783/:803,
screen-document-image-src.test.ts :46/:57/:87), the TASK-500 drop-resolution
expectations in the insertion suite (re-pointed to the handle, assertions
byte-equal), `screenEntryPresentationOverrides.test.ts`, the `PaletteChip`
dead-code guard, and the renderer builder/preview byte-identity snapshot
(§1.2) all stay green.

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must
pass — `bun --cwd core lint:types` covers core/ only and EXCLUDES `tests/**`
(precedent: TASK-501-04 closure gates; memory: typecheck-scope gotcha).

Plus gates + the ≥5-scenario real-input playwright smoke per §3 — measured
live with computed-style / DOM-order / persisted-document assertions, never
control presence.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry — **next free number at closing time** (1210 last
  on disk 2026-07-02; 1211 expected for the parallel TASK-502; verify with
  `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail` (NUMERIC sort — a
  plain `sort` is lexical and mis-reports 999 as the max) and take the next after
  whatever exists).
- `_docs/CONTENT_TYPES_SPEC.md`: new TASK-503 section (style channel contract,
  clearable labels, ratio enum + exported `normalizeScreenImageSrc`,
  `showFieldMetadata` preference, drag-handle contract, legacy record-header
  authoring note) — see §4.
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only).
