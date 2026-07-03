# TASK-505-04: Screens Columns Tests, Docs & Closure
# FileName: TASK-505-04-Screens-Columns-Tests-Docs-Closure.md

**Priority:** High
**Category:** Testing / Documentation / Custom Screens — section columns + binding integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-505-01 (section-style model + `normalizeScreenSectionStyle` + Ajv mirror + `ScreenSectionPatch` `style` + `reconcileScreenBindings` GC + field-name error plumbing), TASK-505-02 (grid renderer emission + full-row insert-gaps), TASK-505-03 (section inspector + `handlePatchSection` wiring + binding-recovery affordance)
**Status:** ✅ Done
**Completed:** 2026-07-03
**Parent Task:** TASK-505

---

## Overview

Closure of TASK-505: consolidate the full Vitest + Bun regression matrix for **Item A** (section column layout — the new `ScreenSectionStyleV1` channel, preset→`grid-template-columns` fr map, auto-flow grid emission, section inspector) and **Item B** (binding-integrity GC — orphan reconcile on delete + normalize-time safety net, prune-with-warning field-orphan recovery, field-name error surfacing), VERIFY the guard tests the siblings land with their code, run all gates, do the mandated ≥5-scenario real-input playwright smoke (VISIBLE EFFECT via computed styles / DOM order / persisted documents, never control presence), and close docs/changelog/board+Statistics.

- **Goal:** every suite in §1-2 green together; **absent `section.style` provably byte-untouched** (DOM stays `space-y-4`, no inline grid style; stored-V4 round-trips identical); the binding-GC provably **non-destructive + deterministic + idempotent** (valid bindings byte-identical through the pass; the un-saveable dead-end becomes saveable with a field-named message); the five owner scenarios pass live; changelog **next free number** (1212 is the last on disk today — take the next AFTER whatever exists at closing time, verify with `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail` — NUMERIC sort, a plain `sort` is LEXICAL and mis-reports 999 as the max) + README board/Statistics closed.
- **Out of scope:** new behavior. 505-01/02/03 ship their own unit coverage with their code; this subtask ADDS the cross-cutting tests below (service persistence, route rejection + recovery, section-inspector flows, grid-in-drop-zone insertion) and VERIFIES the sibling-owned pins are present and green. The parent decision is CLOSED here as documentation: **a missing-content-type-field binding is PRUNED + per-field-flagged (recoverable), NOT a hard 400** — orphaned bindings never brick a screen again.

All test files below EXIST already and are **extended** (verified 2026-07-02) — this subtask does not create parallel suites — with ONE exception: `tests/vitest/ui/custom-screen-section-inspector.test.tsx` is a **NEW** file created by 505-03 (its section-inspector unit suite); 505-04 verifies + extends it rather than authoring a duplicate:

- `tests/vitest/admin/custom-screen-schemas.test.ts` — section-style normalize + Ajv, field-orphan prune, stored-V4 byte-stability pins (:510/:709/:783/:803 stay green)
- `tests/vitest/customScreens/screenDocumentOps.test.ts` — `ScreenSectionPatch` `style` prune; `reconcileScreenBindings` GC; the existing `removeScreenBindingsForBlockTree` pin (:52-56, still green)
- `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` — grid class + `grid-template-columns`/`gap` emission per preset; full-row insert-gap; absent-style DOM identity
- `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` — drop-zones still resolve inside a **gridded** section (TASK-500 no-regress)
- `tests/vitest/ui/custom-screen-section-inspector.test.tsx` (NEW — created by 505-03) — section inspector renders only when `selectedSectionId && !selectedBlockId`; `buildSectionLayoutPatch` reads current `style` then prunes; Columns/gap round-trip
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` (extended by 505-03) — host wiring (`handlePatchSection` → `updateScreenSection`) + binding-recovery: the post-save warning surfaces the pruned field name
- `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` — no `@/ui/pages` import (scan list extended to any new custom-screens UI file)
- `tests/vitest/customScreens/customScreenService.test.ts` — normalize-time GC safety net in the write path (mocked-db lane)
- `tests/integration/routes/customScreensRoutes.test.ts` — section-style PATCH round-trip + reject-unknown + the binding-GC recovery/error path (bun lane)
- `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts` + `screen-document-sections.test.ts` + `screen-document-insertion.test.ts` (TASK-498/500 no-regress pins — UNTOUCHED)
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` (`PaletteChip` dead-code guard — UNTOUCHED, stays green)

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration.**

Verified (Read + `grep -an`, 2026-07-02):

- **Route (existing, unchanged surface).** `router.patch("/custom-screens/:id", requirePermission("content:write"), …)` — `customScreenRoutes.ts:115`. The definition-invalid branch — `customScreenRoutes.ts:44-49` (`case "custom_screen_definition_invalid": return new ApiError("custom_screen_definition_invalid", "Custom screen definition is invalid", 400)`) — stays **byte-unchanged**: `mapCustomScreenError` switches on the EXACT `error.message` (`customScreenRoutes.ts:37`), so the offending field name(s) are NOT smuggled into that string (enriching the message would break the `case` match AND the pinned `tests/integration/routes/customScreensRoutes.test.ts:103-108` test that §2.1 requires green). Field-orphans no longer REACH this error branch — they are PRUNED on the SUCCESS path (§18/§343 decision) and their names are surfaced in the PATCH RESPONSE payload (a new warning/detail field returned by the PATCH), NOT by mutating `error.message`. If any residual condition must still hard-fail with a named field, it carries the name via an `Error` SUBCLASS property that `mapCustomScreenError` reads — leaving the switched message string intact. The branch adds **no** route, RBAC bucket, or method; `mapCustomScreenError` stays unit-pinned at `:103-108`. Item A adds only document keys under the existing PATCH envelope.
- **Save/normalize path (existing).** `updateCustomScreen` → `normalizeCustomScreenDefinitionForWrite` (`customScreenSchemas.ts:1707`) with the content-type `context`. The binding-GC has **TWO independent throw families**, and BOTH are converted from throw to collect+prune (no new service surface):
  - **Field-orphans** — the per-item `normalizeScreenFieldBinding` (`:814-841`) today `throw`s when `fieldRoot ∉ getAllowedBindingFieldRoots(context)` (`:826-829`); changed to **collect + prune** field-orphans into a warning sink. Because BOTH read and write reach it via `normalizeScreenFieldBindings` (`:843-852`), this throw→prune conversion covers both paths. Genuinely-malformed bindings (non-record, no `blockId`, bad `source`/`mode`) STILL throw.
  - **Block-orphans** (`binding.blockId` matches no live block) — TWO independent WRITE gates guard DISTINCT binding sets: the editor-view assert at `:1452` (`normalizeCustomScreenEditorViewDefinitionV4`, block ids computed at `:1451`) and the list-row gate `assertScreenFieldBindingsTargetDocument(document, bindings)` at `:1281` (the INVOCATION inside `normalizeCustomScreenListRowTemplate` `:1273-1283`, whose body throws at `:1267-1270`; the list-row block-id set is the schemas-local `collectScreenDocumentBlockIds(document)` at `:1267`). Each has a READ twin (`…ForRead` `:1484` and `normalizeCustomScreenListRowTemplateForRead` `:1285-1295`). BOTH WRITE gates MUST be converted from throw to an **inline reconcile-prune**, collecting the removed block-orphan field name(s) into the warning sink — this is the load-bearing recovery fix. **Editor view:** replace the `:1452` assert with `bindings.filter(b => blockIds.size === 0 || blockIds.has(b.blockId))` where `blockIds` is in scope (`:1451`). **List row:** replace the `assertScreenFieldBindingsTargetDocument(...)` INVOCATION at `:1281` with the SAME inline filter guarded by the list-row-local `collectScreenDocumentBlockIds(document)` set — list-row ONLY; this does NOT convert the shared assert BODY (`:1267-1270`), which every caller shares (converting the body would affect every caller). Neither site imports `reconcileScreenBindings` from `screenDocumentOps.ts` (that would invert layering into a `schemas→ops→schemas` cycle), and the prune CANNOT live inside `normalizeScreenFieldBindings` (`:843-852`), which receives only the bindings array and has NO access to the block list — each inline `.filter` uses the block-id set already in scope. Converting the READ twins (`:1484`, `normalizeCustomScreenListRowTemplateForRead` `:1285-1295`) is **OPTIONAL cleanup, NOT required** for recovery: an ALREADY-STORED block-orphan screen already OPENS today — `normalizeCustomScreenDefinitionForRead`'s multi-layer read-repair swallows the `:1484`/`:827-829` throws (final fallback `normalizeCustomScreenDefinition(input)` at `:1920` re-normalizes WITHOUT context), so `getCustomScreen` returns 200 and `updateCustomScreen`'s base read at `customScreenService.ts:227` succeeds, making the doc openable AND (via the write-prune) re-saveable (empirically verified — see TASK-505-01 §B4 / §Verified-current). A silent ForRead prune only spares a freshly-loaded editor from carrying a stale orphan until the next Save.
- **Section-style write.** `normalizeScreenSectionStyle` mirrors `normalizeScreenBlockStyle` (`customScreenSchemas.ts:471`): coerce-not-throw VALUES, `rejectUnknownKeys` on the KEY set, prune-empty → `undefined` (never persists when absent). Wired into `normalizeScreenSection` (`:691`) with `"style"` added to its `rejectUnknownKeys([...,"blocks"])` allowlist (`:693`), and mirrored in the Ajv `screenSectionV1Schema` (`:2278`) with `additionalProperties:false`. No new persisted table/column; `schemaVersion` unchanged.
- **No migration.** Absent `section.style` and orphan-free bindings are the universal existing state; the GC is **pure** over the in-memory document, and stored-V4 docs round-trip byte-identically.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with the app's CSRF/session envelope; this task neither loosens nor adds an auth path. This subtask's job is to **prove** these invariants with the tests below.

### Non-destructive / byte-stability guards (named)

1. **absent-`section.style` spread-emit-only-when-present** — a section without `style` normalizes with NO `style` member injected; its renderer container stays `space-y-4` with no inline `grid` style.
2. **stored-V4 read byte-stability** — the :510/:709/:783 round-trip pins stay green unmodified; a no-style + orphan-free document is byte-identical through write AND read.
3. **binding-GC determinism + non-destructiveness** — `reconcileScreenBindings` is pure, preserves source order of survivors, touches ONLY bindings with no live block / no live field, and is **idempotent** (running twice = same result). Valid bindings are byte-identical through the pass.
4. **schema-first / reject-unknown** — section-style unknown KEY throws `custom_screen_definition_invalid` (normalizer) / Ajv `additionalProperties:false` (schema); junk VALUES coerce/clamp, never throw.
5. **NO schemaVersion bump** — document `schemaVersion` stays `1`, definition stays v4.
6. **Cross-cutting no-regress** — TASK-498 presentation-override surface (`screenEntryPresentationOverrides.test.ts` untouched), Bun-free boundary (no `@/ui/pages` imports in custom-screens UI), TASK-500 insertion/drop resolution (drop-zones grid-agnostic, tests re-run inside a gridded section), TASK-503 block `style` channel + clearable labels, `PaletteChip` dead-code guard.

---

## Implementation Pseudocode (test + closure matrix)

### 1. Vitest lane — Bun-free custom-screens suites (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/admin/custom-screen-schemas.test.ts` — section-style contract + field-orphan prune

(Section-style normalize is OWNED by 505-01 and lands with its code; restated as the verification checklist — this subtask fills gaps found at closure.)

```ts
describe("normalizeScreenSectionStyle (mirror of normalizeScreenBlockStyle)", () => {
  test("full valid style round-trips byte-stable through normalizeScreenDocumentV1", () => {
    // section.style: { columns: "3-1", columnGap: 24 }
    const doc = wrapSectionInV4({ style: { columns: "3-1", columnGap: 24 } });
    expect(normalizeCustomScreenDefinitionForWrite(doc)).toEqual(doc); // no key added/dropped/reordered
  });
  test("absent style key stays absent after normalize (byte-stability guard #1)", () => {
    const out = normalizeCustomScreenDefinitionForWrite(wrapSectionInV4({ /* no style */ }));
    expect("style" in firstSection(out)).toBe(false);
  });
  test("unknown style KEY throws custom_screen_definition_invalid (reject-unknown)", () => {
    // style: { bogus: 1 } ⇒ throws; style: { columns: "3-1", extra: 2 } ⇒ throws
  });
  test("style VALUES coerce/clamp, never throw (screen coerce-not-throw)", () => {
    // columns: "9-9" (non-member) ⇒ "1" (single column = stack, harmless);
    // columns: 7 ⇒ "1"; columnGap: 999 ⇒ 64; columnGap: -4 ⇒ 0; columnGap: 3.7 ⇒ 3 (floor);
    // columnGap: "12" / NaN ⇒ clamp fallback (min 0)   [SCREEN_SECTION_COLUMN_GAP_CLAMP {0,64}]
  });
  test("empty style record prunes to NO member", () => {
    // style: {} ⇒ normalized section has NO `style` member (prune-empty → undefined)
  });
  test("EVERY preset is accepted and maps to its canonical enum member", () => {
    // screenSectionColumnPresets = ["1","2","3","4","1-1","1-2","2-1","1-3","3-1","2-3","3-2","1-1-1","1-1-1-1"]
    // each survives normalize verbatim as columns
  });
});
test("Ajv screenSectionV1Schema accepts a valid style and rejects an unknown style key", () => {
  // additionalProperties:false on the style sub-schema; columns = enum of presets; columnGap = integer 0..64
});
describe("field-orphan prune in normalizeScreenFieldBindings (Item B)", () => {
  test("a binding whose field root is ABSENT from the content-type schema is PRUNED, not thrown", () => {
    // context with schema {title} + bindings [{blockId:b1, field:"bathrooms"}] ⇒
    // result bindings = [] (bathrooms pruned) AND the field name surfaces in the sink/error carry
    // (505-01 shape: removedFieldOrphans / CustomScreenDefinitionError({ fields:["bathrooms"] }))
  });
  test("a genuinely-malformed binding STILL throws (non-record / no blockId / bad source|mode)", () => {
    // { } ⇒ throws; { blockId:"b1", source:"remote" } ⇒ throws — only field-orphans are recoverable
  });
  test("valid bindings survive byte-identical alongside a pruned orphan (non-destructive)", () => {
    // [{blockId:b1, field:"title"}, {blockId:b2, field:"bathrooms"/*gone*/}] ⇒ [title binding unchanged]
  });
});
```

#### 1.2 `tests/vitest/customScreens/screenDocumentOps.test.ts` — section patch + reconcile GC

```ts
describe("ScreenSectionPatch gains `style` (updateScreenSection spreads it)", () => {
  test("updateScreenSection applies a style patch and merges over existing style", () => {
    // updateScreenSection(doc, id, { style: { columns: "2", columnGap: 16 } }) ⇒ section.style set
  });
  test("patch with style: undefined removes the style member (prune, byte-stable absence)", () => {
    // buildSectionLayoutPatch(...) returns undefined when all inputs cleared ⇒ no empty {} persisted
  });
});
describe("reconcileScreenBindings (Item B GC — pure, deterministic, non-destructive)", () => {
  const liveBlockDoc = /* two sections, blocks b1,b2 live */;
  test("prunes bindings whose blockId matches NO live block (block-orphan)", () => {
    const r = reconcileScreenBindings(liveBlockDoc, [bind("b1","title"), bind("ghost","x")]);
    expect(r.bindings.map(b => b.blockId)).toEqual(["b1"]);   // ghost dropped
    expect(r.removedBlockOrphans).toEqual(["x"]);             // field name reported
  });
  test("preserves SOURCE ORDER of surviving bindings", () => {
    // input order [b2, b1] with both live ⇒ output order [b2, b1] (stable, not re-sorted)
  });
  test("is IDEMPOTENT — running twice yields the same result", () => {
    const once = reconcileScreenBindings(doc, bindings);
    expect(reconcileScreenBindings(doc, once.bindings)).toEqual({ ...once, removedBlockOrphans: [] });
  });
  test("is NON-DESTRUCTIVE — an all-live binding set is byte-identical through the pass", () => {
    expect(reconcileScreenBindings(doc, allLive).bindings).toEqual(allLive);
  });
});
test("block/section delete now prunes the deleted subtree's bindings via reconcile (Item B fix)", () => {
  // remove a section/block, then reconcile against the resulting document ⇒
  // bindings that pointed into the removed subtree are gone even without feeding the exact removed tree.
  // The EXISTING removeScreenBindingsForBlockTree pin (:52-56) STAYS green (narrow helper retained).
});
```

#### 1.3 `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` — grid emission + absent-style identity

(OWNED by 505-02 — verify + extend. Reuse the suite's render harness and section fixtures.)

```ts
describe("section grid emission (one shared block-list container, three modes)", () => {
  test.each(["2","3-1","1-3","1-1-1","1-1-1-1"])("columns %s emits grid-template-columns", (preset) => {
    // section.style.columns = preset ⇒ the block-list container:
    //   className contains "grid" (NOT "space-y-4")
    //   style.gridTemplateColumns === screenSectionColumnTemplate[preset]
    //     "2"⇒"1fr 1fr", "3-1"⇒"3fr 1fr", "1-3"⇒"1fr 3fr", "1-1-1"⇒"1fr 1fr 1fr", "1-1-1-1"⇒"1fr 1fr 1fr 1fr"
    //   style.gap === (section.style.columnGap ?? 16) + "px"
    // Assert across builder / preview / entry (single code path).
  });
  test("columnGap flows to the container gap", () => {
    // columns:"2", columnGap: 32 ⇒ style.gap === "32px"; absent columnGap ⇒ "16px" (default)
  });
  test("interleaved insert-gap spans the FULL ROW inside a gridded section (never steals a cell)", () => {
    // builder mode, gridded section ⇒ each renderInsertGap element carries grid-column: 1 / -1
    //   (query the gap elements; assert their inline gridColumn === "1 / -1");
    // in a NON-gridded (space-y-4) section the gaps carry NO gridColumn (unchanged)
  });
  test("auto-flow: N blocks fill N cells in DOM order (no per-block column state)", () => {
    // three blocks in a "3" section ⇒ three grid items in source order; no gridColumnStart/Span set on blocks
  });
  test("TASK-503 per-block width stays a WITHIN-CELL fraction (no double-meaning)", () => {
    // a block with style.width "half" inside a gridded cell keeps w-1/2 (half the CELL, not a column span)
  });
});
test("ABSENT section.style: builder AND preview container className is byte-identical to today (space-y-4)", () => {
  // byte-stability guard #1 — pin the exact class from source (ScreenRuntimeRenderer.tsx:1708-1714):
  //   container = cn("space-y-4", sectionDragHover && "rounded-lg bg-primary/5 ring-1 ring-primary/50")
  //   assert className === "space-y-4" (no drag), NO "grid", NO inline gridTemplateColumns/gap style.
  // The sectionDragHover ring token is UNCHANGED by 505-02.
});
```

#### 1.4 `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` — drop-zones inside a grid (TASK-500 no-regress)

```ts
// TASK-500 drop resolution is grid-AGNOSTIC (card before/after-midpoint via cardDropTargets,
// section-end via data-screen-section-dropzone). Re-run the EXISTING drop cases inside a
// section whose style.columns is set; expectations are BYTE-EQUAL to the non-gridded cases.
test("card-midpoint before/after drop resolves correctly in a gridded ('2') section", () => {
  // dragstart on a block handle → drop on a later card's after-midpoint ⇒ same index math as today
});
test("section-end dropzone appends to a gridded section's end (unchanged)", () => {
  // drop on [data-screen-section-dropzone] of a "3-1" section ⇒ block appended; grid re-flows the new cell
});
test("the full-row insert-gap does NOT displace an existing block into the wrong cell", () => {
  // force-reveal the interleaved gaps in a gridded section; assert each block still occupies its own cell
  // (the gap's grid-column:1/-1 keeps auto-flow placement of real blocks intact)
});
// The TASK-500 pre-existing drop/read/cycle-guard cases stay green with ZERO expectation edits.
```

#### 1.5 Section inspector + binding-recovery (505-03-owned; verify + fill gaps)

`tests/vitest/ui/custom-screen-section-inspector.test.tsx` (NEW, 505-03 section-inspector unit suite) + `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` (505-03 host-wiring + orphan-recovery, extended):

```ts
test("the Inspect category is ENABLED for a selected SECTION (disabled only when !selectedBlock && !selectedSectionId)", () => {});
test("the 'Section layout' group renders ONLY when selectedSectionId && !selectedBlockId", () => {
  // selecting a block hides it; selecting a section (no block) shows Columns EnumRow + column-gap input
});
test("Columns EnumRow lists screenSectionColumnPresets and WRITES the canonical enum value", () => {
  // selecting "3-1" ⇒ handlePatchSection → updateScreenSection(doc, id, { style: { columns: "3-1" } })
});
test("column-gap number input clamps to 0..64 and round-trips", () => {});
test("buildSectionLayoutPatch reads current section.style, applies the edit, PRUNES to undefined when empty", () => {
  // clearing columns + gap ⇒ patch style === undefined (absent-style docs stay byte-stable, no empty {})
});
test("binding-recovery: after a save that pruned a field-orphan, a per-field warning surfaces the field name", () => {
  // 505-03 surfaces 505-01's removedFieldOrphans, e.g. an inline notice
  // "Removed bindings for deleted field(s): bathrooms" — assert the field NAME is shown (diagnosable)
});
```

#### 1.6 `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` — extend the scan list

```ts
// The explicit canvas-file list gains any NEW custom-screens UI file 505-02/03 touch
// (e.g. new inspector/helper module) under the SAME forbidden regexes (@/ui/pages,
// ui/widgets/registry, WidgetRenderer, …). This is the "no @/ui/pages imports in
// custom-screens UI" guard extended to every file 505 touches. PaletteChip dead-code
// guard (custom-screen-widget-picker.test.tsx) stays green WITHOUT edits.
```

#### 1.7 Regression pins (verify green, ZERO edits)

```
tests/vitest/admin/custom-screen-schemas.test.ts        :510 :709 :783 :803 (stored-V4 byte-stability + reject-unknown)
tests/vitest/customScreens/screenDocumentOps.test.ts    :52-56 (removeScreenBindingsForBlockTree narrow helper)
tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts   (TASK-498 surface)
tests/vitest/customScreens/screen-document-sections.test.ts / screen-document-insertion.test.ts (TASK-500 ops)
tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx      (PaletteChip guard)
```

### 2. Bun lane — route/service persistence + recovery

#### 2.1 `tests/integration/routes/customScreensRoutes.test.ts`

```ts
// Reuse the suite's makeRouter/runRoute harness (:30/:53). The PATCH handler
// (customScreenRoutes.ts:115) calls the REAL updateCustomScreen (DB-backed in the bun
// lane — test:bun loads .env). Seed via createCustomScreen, clean up after.
test("PATCH /custom-screens/:id persists a definition carrying a valid section style", async () => {
  // definition with section.style: { columns:"3-1", columnGap:24 } ⇒ returned definition carries it verbatim;
  // a follow-up getCustomScreen round-trips it byte-stable (write→read identity).
});
test("PATCH /custom-screens/:id with an unknown section style KEY rejects 400 custom_screen_definition_invalid", async () => {
  // section.style: { bogus: 1 } ⇒ rejects { code: "custom_screen_definition_invalid", status: 400 }
  // (mapCustomScreenError pin :103-108 already covers the mapping — do not duplicate it)
});
test("BINDING-GC RECOVERY: a definition binding a field ABSENT from the content type SAVES (orphan pruned) and reports the field name", async () => {
  // seed a screen bound to a field, then PATCH with a context whose schema no longer has that field ⇒
  //   the save SUCCEEDS (no opaque 400 dead-end), the stored definition has the orphan binding removed,
  //   and the response detail names the field(s) (warning carry). This is the un-saveable dead-end fix.
});
test("LIST-ROW RECOVERY: a PATCH whose listView.rowTemplate binds (a) a block-orphan blockId AND (b) a since-deleted field both SAVE (200) — the SECOND binding dead-end", async () => {
  // rowTemplate.bindings = [{ blockId:"ghost"/*no live block in the row-template doc*/, field:"title" },
  //                         { blockId:<live>, field:"bathrooms"/*deleted on the content type*/ }] ⇒
  //   the save SUCCEEDS (no residual hard-400 dead-end for the list-row template — pruned INLINE in
  //   normalizeCustomScreenListRowTemplate at customScreenSchemas.ts:1281, NOT hard-throwing),
  //   a follow-up getCustomScreen shows the stored rowTemplate bindings PRUNED (both orphans gone),
  //   and the 200 response detail/warnings NAME the removed field(s) in the transient warnings/prunedFields
  //   carry (block-orphan field "title" + field-orphan "bathrooms"). Mirrors the parent Testing-Requirements
  //   :267 promise + TASK-505-01 §B4 / §211 list-row conversion — the un-saveable list-row dead-end fix.
});
test("a genuinely-malformed binding STILL 400s (recovery is scoped to field-/block-orphans only)", async () => {
  // binding with no blockId / bad source ⇒ custom_screen_definition_invalid 400
});
test("stored-V4 no-style + orphan-free doc round-trips byte-stable through PATCH", async () => {});
```

#### 2.2 `tests/vitest/customScreens/customScreenService.test.ts` (mocked-db lane)

```ts
// extend the updateCustomScreen V4-accept pattern:
test("updateCustomScreen accepts a section-style V4 definition and preserves it", async () => {});
test("updateCustomScreen runs the normalize-time GC safety net: a block-orphan binding is pruned on write and its field name is surfaced", async () => {
  // proves the reconcile safety net fires in the write path, not only on explicit delete.
  // REQUIRES the WRITE guard (normalizeCustomScreenEditorViewDefinitionV4, customScreenSchemas.ts:1452)
  // converted from throw → reconcile-prune — otherwise it throws BEFORE any prune and this test fails.
  // Assert the block-orphan binding is removed from the stored definition AND its field name reaches
  // the warning sink / transient carry — orphan-pruned + field-name-surfaced is the WRITE-path guarantee.
});
test("a STORED block-orphan doc READS successfully today (getCustomScreen resolves 200, no 400)", async () => {
  // load an already-persisted screen whose binding.blockId matches no live block ⇒
  // getCustomScreen RESOLVES (200) with the orphan RETAINED via normalizeCustomScreenDefinitionForRead's
  // no-context fallback (customScreenSchemas.ts:1920) — the doc is openable + therefore re-saveable.
  // Assert ONLY that the read does NOT 400. Do NOT assert the ForRead :1484 guard prunes, nor that a
  // field name reaches a warning sink on READ: the ForRead prune is OPTIONAL/silent per TASK-505-01 §B4,
  // and orphan-pruning + field-name-surfacing is the WRITE-path guarantee (asserted in the write-prune
  // test above and §2.1's recovery test), not a read-path one.
});
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit  # REPO ROOT — core lint:types does NOT typecheck tests/**; this subtask's deliverable IS test code (memory: typecheck-scope gotcha)
bun run test:vitest                 # full vitest lane (package.json:27), log-clean (no act() warnings — spy console.error in new UI tests)
bun run test:bun                    # REPO ROOT bun lane (package.json:26; DB gate — config-wizard reset caveat)
bun run gates:coderso               # repo gate alias (package.json:70)
```

#### SMOKE (owner mandate — ≥5 DISTINCT real-flow scenarios, playwright, real mouse/keyboard; assert VISIBLE EFFECT via computed styles / DOM order / persisted documents, NEVER control presence)

```
Environment (memory: local-cms-run-and-test): coderso-dev-core-host; admin
http://coderso-a.localhost:5173/admin/ (white page = server down — re-run the
helper; Bun server code does NOT hot-reload: kill the stale process first).
Use the House Projects screen (or seed an equivalent bound screen).

1. BUILD A 2-COL + A 3-1 SECTION (visible-effect computed grid). Builder: set one
   section's Columns to "2" and another's to "3-1" via the NEW section inspector
   (select the section, no block) → Save → open the published entry view.
   Assert in BOTH builder canvas AND entry view: getComputedStyle(container)
   .gridTemplateColumns resolves to two equal tracks for "2" and a ~3:1 ratio for
   "3-1" (the two column pixel widths ≈ 3:1, ±4px), and the blocks sit SIDE-BY-SIDE
   (getBoundingClientRect().top equal within the row). Then build the BATHROOMS: 2
   composition: a Text block "Bathrooms" (503 clearable label) + the bound
   field-value block in a "3-1" section → assert label-left / value-right on ONE
   row (Text left edge < value left edge, same top).

2. AUTO-FLOW ORDERING. In a gridded ("3") section, reorder blocks (drag a block by
   its 503 corner-badge handle to a new position) → assert the grid CELLS re-flow in
   DOM order: the moved block's getBoundingClientRect() now precedes/follows its new
   neighbor, and after Save the persisted section block order (GET the definition)
   matches the new visual order.

3. INSERTION / DROP-ZONES STILL WORK IN A GRIDDED SECTION. In a "2"-column section
   drop a new block via a card before/after-midpoint zone AND via the section-end
   dropzone → assert it lands at the intended index (visible cell position + persisted
   order) and the thin interleaved insert-gap SPANS THE FULL ROW (its computed
   grid-column === "1 / -1") so it never pushes a real block out of its cell.

4. BINDING-GC RECOVERY (the dead-end fix). Create a screen with a block bound to a
   content-type field. Delete that field on the content type. Re-open the screen and
   Save → assert the screen is STILL SAVEABLE (no opaque 400): the save succeeds, a
   CLEAR message NAMING THE FIELD appears (e.g. "Removed bindings for deleted
   field(s): bathrooms"), and GET the definition shows the orphaned binding pruned
   while every valid binding survives. Deleting the referencing BLOCK also prunes its
   binding now — served by the existing `removeScreenBindingsForBlockTree` at the editor
   delete sites plus the normalize-time WRITE safety-net on Save; `reconcileScreenBindings`
   delete-site wiring stays DEFERRED (adopted by no 505 subtask), matching 505-01 §B2 and
   parent Item B. Contrast baseline: before the fix this was a
   permanent un-saveable dead-end.

5. ABSENT-STYLE BYTE-STABILITY SPOT-CHECK. Open a stored-V4 screen that has NO
   section.style → assert every section's block-list container className === "space-y-4"
   (no "grid" class), getComputedStyle shows NO gridTemplateColumns/gap, and the DOM is
   unchanged from the pre-505 baseline. GET the definition before + after a no-op
   Save → byte-identical (no `style` key injected, no schemaVersion bump).
```

### 4. Closure

- **Changelog:** `_docs/_CHANGELOG/<NEXT-FREE>-2026-MM-DD-task-505-screens-section-columns-and-binding-integrity.md` — 1212 is the last number on disk TODAY (2026-07-02): run `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail` at closing time (NUMERIC sort — a plain `sort | tail` is LEXICAL and mis-reports 999 as the max) and take the next free AFTER whatever exists. Link TASK-505 + all four subtasks (505-01..04). State explicitly: no new public endpoint, no RBAC change, no migration, **NO schemaVersion bump** (definition stays v4 / document schemaVersion 1); Item A adds a NEW `section.style` (`ScreenSectionStyleV1`) channel — the dead `section.layout` field is UNTOUCHED (retyping it would throw on legacy docs); absent `section.style` = byte-identical `space-y-4` DOM; block assignment is AUTO-FLOW with full-row insert-gaps; per-block `width` stays a within-cell fraction. Item B: the binding-integrity GC (`reconcileScreenBindings`) prunes block-orphans on delete + as a normalize-time safety net, and a **missing-content-type-field binding is PRUNED + per-field-flagged (recoverable), NOT a hard 400** (the recovery-path DECISION), with the field name(s) surfaced on the SUCCESS-path warning/detail payload returned by PATCH (the `custom_screen_definition_invalid` error branch and `mapCustomScreenError`'s exact-message switch stay byte-unchanged). All byte-stability + determinism guards (§Security 1-6) green.
  - **Deferred residuals (record honestly, not silent gaps):** per-block `columnSpan`/`columnStart` (a later `ScreenBlockStyleV1.span`/`start`); a visual column-ratio picker / SegmentedControl (v1 uses the plain `EnumRow`); custom (non-preset) fr ratios; responsive per-breakpoint column counts; nested-section grids.
- **Permanent docs:** `_docs/CONTENT_TYPES_SPEC.md` — ADD a "Custom Screen section column layout & binding integrity (TASK-505)" section after the TASK-503 section (:689+):
  - **Section style channel** — `ScreenSectionStyleV1` shape (`columns?` preset enum, `columnGap?` clamp 0..64), the `screenSectionColumnPresets` list, the preset→`grid-template-columns` fr map (`"3-1"`→`3fr 1fr` = the owner's 3/4:1/4), auto-flow cell assignment (each block = one cell, DOM order), full-row insert-gaps, sparse+prune / unknown-keys-throw / values-coerce, and the **absent-style byte-stability** (`space-y-4` unchanged). Note per-block `width` stays a within-cell fraction and `columnSpan` is deferred; the **Bathrooms: 2 composition** recipe (section `"3-1"` + Text "Bathrooms" + bound value).
  - **Binding-integrity GC** — `reconcileScreenBindings` (orphan reconcile on block/section delete + normalize-time safety net; pure/deterministic/idempotent/non-destructive), the **prune-with-warning field-orphan DECISION** (recoverable, not a hard 400), and the field-name surfacing on the SUCCESS-path warning/detail payload (the PATCH response names the pruned field(s); the `custom_screen_definition_invalid` error branch stays byte-unchanged — field names are NOT injected into `error.message`; the narrow `removeScreenBindingsForBlockTree` helper is retained).
- **Board:** flip TASK-505 + all subtasks (505-01..04) to ✅ Done in `_docs/_TASKS/README.md` board **+ Statistics** (closing agent only; single edit for board+stats; the parent adds +5 To Do rows on authoring, moved to Done at closure).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free custom-screens suites):** §1.1-1.7 —
`tests/vitest/admin/custom-screen-schemas.test.ts` (section-style normalize + Ajv + field-orphan prune),
`tests/vitest/customScreens/screenDocumentOps.test.ts` (section patch `style` + `reconcileScreenBindings` GC),
`tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` (grid emission + full-row gap + absent-style DOM identity),
`tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` (drop-zones inside a gridded section — TASK-500 no-regress),
the 505-03 section-inspector suites (`tests/vitest/ui/custom-screen-section-inspector.test.tsx` NEW + `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` extended),
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` (extended scan list),
`tests/vitest/customScreens/customScreenService.test.ts` (normalize-time GC safety net). Full
`bun run test:vitest` green AND log-clean (happy-dom; assert a clean `console.error` spy in the new UI tests).

**Bun lane:** §2.1 — `tests/integration/routes/customScreensRoutes.test.ts` (section-style persists + round-trips byte-stable; unknown section-style KEY → 400 `custom_screen_definition_invalid`; the binding-GC recovery path SAVES + reports the field name; a malformed binding still 400s). Full root `bun run test:bun` (package.json:26) green — core has NO `test:bun` script; do NOT substitute `bun --cwd core test`.

**Must-not-weaken:** the stored-V4 byte-stability pins (`custom-screen-schemas.test.ts` :510/:709/:783/:803), the `removeScreenBindingsForBlockTree` pin (`screenDocumentOps.test.ts` :52-56), the TASK-500 drop-resolution expectations in the insertion suite (re-run inside a gridded section, assertions byte-equal), `screenEntryPresentationOverrides.test.ts` (TASK-498), the TASK-503 block-style / clearable-label suites, and the `PaletteChip` dead-code guard all stay green.

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must pass — `bun --cwd core lint:types` covers core/ only and EXCLUDES `tests/**` (precedent: TASK-501-04 / TASK-503-04 closure gates; memory: typecheck-scope gotcha).

Plus gates + the ≥5-scenario real-input playwright smoke per §3 — measured live with computed-style / DOM-order / persisted-document assertions, never control presence.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry — **next free number at closing time** (1212 last on disk 2026-07-02; verify with `ls _docs/_CHANGELOG | grep -oE '^[0-9]+' | sort -n | tail` — NUMERIC sort — and take the next after whatever exists). Link TASK-505 + all four subtasks; record the recovery-path decision + deferred residuals.
- `_docs/CONTENT_TYPES_SPEC.md`: new TASK-505 section (section style channel + preset→fr map + auto-flow + absent-style byte-stability + Bathrooms:2 recipe; binding-integrity GC + prune-with-warning decision + field-name error) — see §4.
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only).

---

## Deferred (not in this task)

Per-block `columnSpan`/`columnStart`; a visual column-ratio picker / SegmentedControl (v1 uses the plain `EnumRow`); custom (non-preset) fr ratios; responsive per-breakpoint column counts; nested-section grids.
