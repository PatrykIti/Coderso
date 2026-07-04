# TASK-503: Screens Polish V2 — Block Style Channel, Clearable Labels, Clean Entry View, Drag Handle & Image Residuals
# FileName: TASK-503_Screens_Polish_V2_Block_Style_Labels_Entry_View.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Builder / Entry View
**Estimated Effort:** Large
**Dependencies:** TASK-498 (presentation-override surface, builder graphical schema), TASK-500 (sections + insertion DnD + `normalizeScreenImageSrc`), `usePostEditorPreferences` as the preferences-hook pattern, exported page clamp/enum constants (`pageDocumentV2.ts`)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

Custom-Screens polish v2 — five owner-reported issues (2026-07-02 live session
+ TASK-500 residuals). Full recon (rootCause file:line + live repro + fix
sketch) is in the 2026-07-02 recon report; every anchor below was re-verified
against `feature/visual` source on 2026-07-02.

**A. Block-level styling channel (missing).** `ScreenBlockV1` has NO style
channel at all (`core/services/customScreens/customScreenSchemas.ts:112-124` —
keys are `id/type/label/variant/data/layout/visibility/editor/legacyWidgetType/children/slots`),
and the inspector's free-text "Background" row writes `block.variant`
(`ScreenBlockInspector.tsx:729-739`) which the renderer NEVER reads — a dead
control. Add a validated `style?: ScreenBlockStyleV1` subset (width preset /
minHeight / margin / padding / align), emitted once in the renderer `wrap()`
(`ScreenRuntimeRenderer.tsx:570-661`) so builder/preview/entry stay consistent,
plus an inspector "Layout" group. The dead `variant` "Background" row is
**REMOVED** (decision + justification in 503-03 notes below). NO schemaVersion
bump; absent `style` key round-trips byte-stable.

**B. Labels cannot be cleared (renderer-only bug).** `readText(...) || fallback`
makes an explicitly CLEARED label (`""`) indistinguishable from never-set
(`ScreenRuntimeRenderer.tsx:779-782`, unconditional label `<p>` `:793-795`;
same bug on stat `:960`/`:976-978`). The divider label branch (`:1006-1008`)
already renders nothing when empty — that is the correct model. Fix: treat
`typeof rawLabel === "string"` as explicit (trimmed `""` = no label), render
the label `<p>` only when non-empty, keep a field-name stand-in INSIDE the
builder `{{ token }}` so the binding stays visible. Absent key keeps today's
default chain — stored screens render identically.

**C. Noisy published-screen entry canvas.** Three independent sources: (1)
type/binding badges — the "Editable"/"Read"/"Unbound" binding badge
`:838-846` (gated `mode === "builder" ? null : …`, so ALREADY absent in
builder) PLUS the uppercase field-type badge e.g. "NUMBER" `:851-855` (which
has NO mode gate — `{field ? <Badge …/> : null}` — so it renders in ALL modes,
builder included) — both leak into the management entry view; (2) backgrounds mix at
3 alpha levels over `bg-dotted` (entry canvas `CustomScreenEntryEditor.tsx:1302`,
sections `bg-background/60` `:1417`, blocks `bg-background/90` `:547-553`);
(3) the "RECORD OVERVIEW" / "Preview the primary content fields in one place."
strings are STORED legacy `screenRecordHeader` widget-default DATA (captured
verbatim by the widget→screen migration), not code defaults — already
editable/clearable via the inspector record-header eyebrow/subtitle rows. Fix:
`showFieldMetadata` prop gating the badges in entry mode only (DEFAULT OFF,
persisted per-user via a new `useScreenEntryPreferences` localStorage hook +
an entry-canvas sub-toolbar toggle); entry-mode-only surface flatten (no `bg-dotted`,
section `bg-transparent`, block wrapper single opaque `bg-card rounded-xl`);
legacy strings resolved by DOCUMENTATION + authoring (decision: NO read-path
repair — justified below).

**D. Container drag handle (TASK-500 residual, real UX footgun).** The WHOLE
builder card is the native-DnD drag source (`draggable`+`onDragStart` on the
wrapper div, `ScreenRuntimeRenderer.tsx:584-601` inside `wrap()`), and nested
cards `stopPropagation` — so nested draggable children shadow their container
almost everywhere on the card surface. Fix: move `draggable` +
`onDragStart`/`onDragEnd` onto the existing corner type Badge (`:648-653`);
ALL drop wiring (onDragOver/onDrop/card drop targets) stays on the card;
keyboard/a11y move flows unaffected; update the insertion-targeting tests
that simulate `dragstart` on the card.

**E. Image residuals.** (1) `ratio` is a dead prop — allow-listed
(`customScreenSchemas.ts:405`), inspector free-text row writes it
(`ScreenBlockInspector.tsx:600-606`), but the renderer image branch
(`ScreenRuntimeRenderer.tsx:1020-1062`) reads only `label/fit/src`. Decision:
WIRE it (owner hates dead controls) as an enum → `aspect-*` class map
on the img wrapper at the RENDERER + an inspector EnumRow — NO schema coercion
(the ratio stays byte-stable on read/write; see decision 3). (2) Builder
transient unsafe src — the inspector `onChange` writes the raw string
(`ScreenBlockInspector.tsx:584-590`) and the builder previews it immediately
(`:1033`), while `normalizeScreenImageSrc` (`customScreenSchemas.ts:427-434`)
runs only on the save path — so `javascript:`/`data:` URLs can reach
`<img src>` pre-save in the author's own session. Fix: export
`normalizeScreenImageSrc` and run the SAME prefix filter on the inspector
write path (raw text stays in a local input draft so typing `https://…`
character-by-character is not destroyed) AND gate the builder preview through
it (defense-in-depth for pre-existing drafts).

### Decisions (normative)

1. **`block.variant` "Background" row → REMOVE** (not wire). Justification:
   it is a free-text string; wiring raw stored text into a background emission
   would violate the schema-first rule (raw input reaching style/CSS). A real
   background belongs in `ScreenBlockStyleV1` later as a VALIDATED enum — a
   purely additive key. The schema keeps accepting the `variant` key
   (`normalizeScreenBlock` allow-list unchanged) so stored documents stay
   byte-stable and non-destructive; only the dead inspector control goes away.
2. **Legacy record-header strings → document, NO read-path repair.**
   Justification: a read-path mutation of stored author data breaks the
   stored-V4 byte-stability guarantee and is destructive-by-stealth (the
   author may have kept those strings intentionally). The eyebrow/subtitle
   are ALREADY editable and clearable via the inspector
   (`ScreenBlockInspector.tsx:370-381`; record-header renders `null` for empty
   values). 503-04 documents the "clear the legacy header copy" authoring
   step and the smoke suite proves the cleared state stays clean.
3. **Image `ratio` → WIRE as enum** (`auto|1/1|4/3|16/9|3/2`) at the RENDERER
   + inspector ONLY — **NO schema-level coercion**. The renderer maps a known
   ratio to an `aspect-*` class and a legacy/unknown free-text ratio (e.g.
   `16:9`) to no class (renders `auto`); the inspector EnumRow only ever writes
   valid enums going forward. The schema allow-list keeps `ratio` permissive
   and UNCOERCED (exactly as today, :462-467 touches only `fit`/`src`), so a
   stored free-text ratio round-trips byte-stable on BOTH read and write. This
   is required: `normalizeScreenDocumentV1ForRead` (:725-727) runs the same
   per-kind `normalizeScreenBlockData` on the READ path, so a schema coercion
   would mutate stored reads — breaking read-idempotency `normalizeForRead(stored)
   !== stored` and the stored-V4 byte-stability guarantee — not just writes.
   Renderer defensiveness alone delivers this decision's intent (stored bytes
   untouched everywhere), consistent with decision 2's "no read-path mutation".
4. **Drag source = the corner type Badge** (not a new grip): it already exists
   at a stable corner in builder mode, doubles as the block-type label, adds
   zero new chrome, and cannot be shadowed by nested children.

---

## Contract sketch (normative for the subtasks)

```ts
// core/services/customScreens/customScreenSchemas.ts — 503-01
// Reuse precedent: menuDocumentV2.ts imports services→services from
// ../pages/pageDocumentV2 (the Bun-free boundary bans only @/ui/pages).
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../pages/pageDocumentV2"; // {min:0,max:240}

export const screenBlockWidths = ["auto", "full", "half", "third", "two-thirds"] as const;
export const screenBlockAligns = ["start", "center", "end", "stretch"] as const;
export const screenImageRatios = ["auto", "1/1", "4/3", "16/9", "3/2"] as const;
export const SCREEN_BLOCK_MIN_HEIGHT_CLAMP = { min: 0, max: 640 } as const;
const screenBoxSides = ["top", "right", "bottom", "left"] as const;

export type ScreenBlockBoxSpacingV1 = Partial<Record<(typeof screenBoxSides)[number], number>>;
export type ScreenBlockStyleV1 = {
  width?: (typeof screenBlockWidths)[number];
  minHeight?: number;                       // clamped int px, 0..640 (min-height, content-safe)
  margin?: ScreenBlockBoxSpacingV1;         // per-side clamped ints, PAGE_BLOCK_BOX_SPACING_CLAMP
  padding?: ScreenBlockBoxSpacingV1;
  align?: (typeof screenBlockAligns)[number];
};

// ~30-line screen-local validator: unknown KEYS throw (rejectUnknownKeys →
// "custom_screen_definition_invalid", matching normalizeScreenBlockData);
// invalid VALUES coerce/clamp (coerceScreenEnum/clampScreenInt, the screen
// module's coerce-not-throw style). Sparse: only present keys are emitted;
// empty records prune to undefined.
const normalizeScreenBlockBoxSpacing = (value: unknown): ScreenBlockBoxSpacingV1 | undefined => {
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenBoxSides);
  const out: ScreenBlockBoxSpacingV1 = {};
  for (const side of screenBoxSides) {
    if (value[side] === undefined) continue;
    out[side] = clampScreenInt(
      value[side], PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.min, PAGE_BLOCK_BOX_SPACING_CLAMP.max
    );
  }
  return Object.keys(out).length ? out : undefined;
};

const normalizeScreenBlockStyle = (value: unknown): ScreenBlockStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;              // junk container drops, never throws
  rejectUnknownKeys(value, ["width", "minHeight", "margin", "padding", "align"]);
  const margin = normalizeScreenBlockBoxSpacing(value.margin);
  const padding = normalizeScreenBlockBoxSpacing(value.padding);
  const style: ScreenBlockStyleV1 = {
    ...(value.width !== undefined ? { width: coerceScreenEnum(value.width, screenBlockWidths, "auto") } : {}),
    ...(value.minHeight !== undefined
      ? { minHeight: clampScreenInt(value.minHeight, SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
          SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min, SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max) }
      : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
    ...(value.align !== undefined ? { align: coerceScreenEnum(value.align, screenBlockAligns, "start") } : {}),
  };
  return Object.keys(style).length ? style : undefined;
};

// normalizeScreenBlock (:533-600): allow-list += "style"; return spread gains
//   ...(style ? { style } : {})   computed from normalizeScreenBlockStyle(value.style)
// → absent key round-trips byte-stable (spread-emit-only-when-present pattern).
// ScreenBlockV1 (:112) += style?: ScreenBlockStyleV1.
// normalizeScreenBlockData image case: ratio stays UNCOERCED/permissive (as today,
//   :462-467 touches only fit/src) — NO coercion added. A schema coerce runs on the
//   READ path too via normalizeScreenDocumentV1ForRead (:725-727), so it would mutate
//   stored reads and break byte-stability. `screenImageRatios` is consumed by the
//   renderer class-map + inspector EnumRow ONLY (no service-side use).
// EXPORT normalizeScreenImageSrc (:427-434) — single source of truth for 503-02/03.
// core/server/validation/customScreenSchemas.ts is a pure re-export — no change needed (verify).
```

```ts
// core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx — 503-02
// wrap() (:570-661) — ONE code path for builder/preview/entry:
const screenBlockWidthClass: Record<string, string> = {
  auto: "", full: "w-full", half: "w-1/2", third: "w-1/3", "two-thirds": "w-2/3",
};
const screenBlockAlignClass: Record<string, string> = {
  start: "mr-auto", center: "mx-auto", end: "ml-auto", stretch: "w-full",
};
const screenImageRatioClass: Record<string, string> = {
  "1/1": "aspect-square", "4/3": "aspect-[4/3]", "16/9": "aspect-video", "3/2": "aspect-[3/2]",
};
// boxStyle: CSSProperties from block.style — minHeight + per-side margin*/padding*
// (emit only defined sides). widthClass from style.width; alignClass from
// style.align emitted ONLY when style.margin.left AND style.margin.right are
// undefined (explicit horizontal margins win over the align preset —
// deterministic, no inline-vs-class fight). Applied on the wrap() root div:
//   <div style={boxStyle} className={cn(wrapperClass, widthClass, alignClass)} …>

// Label semantics (field :779-795, stat :960-978; divider :1006-1008 is the model):
const rawLabel = block.data.label;
const label = typeof rawLabel === "string"
  ? rawLabel.trim()                          // "" = explicitly no label
  : field?.label ?? (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
const tokenLabel = label || (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
// label <p> renders ONLY when label !== ""; builder token = {{ tokenLabel }}
// (binding stays visible with a cleared label). Stat branch: same shape with
// its "Stat" default in the never-set chain.

// Entry chrome (the two badges have DIFFERENT current gates — gate SEPARATELY):
//   props += showFieldMetadata?: boolean (default false)
//   entryChromeVisible = mode === "preview" || (mode === "entry" && showFieldMetadata)
//   binding badge :838-846 — TODAY `mode === "builder" ? null : …` (absent in
//     builder); becomes: builder → null; else render when entryChromeVisible.
//   field-type badge :851-855 — TODAY `{field ? … : null}` with NO mode gate
//     (renders in builder too!); it MUST STAY in builder + preview and gate
//     ONLY entry: `field && (mode === "builder" || mode === "preview" ||
//     (mode === "entry" && showFieldMetadata))` (≡ field && (mode !== "entry"
//     || showFieldMetadata)). Applying the uniform entryChromeVisible gate here
//     would DROP the field-type badge from BUILDER — a builder byte-parity
//     regression (498). Keep the 2-vs-1 gating divergence explicit.
//   block wrapper :535-553 — ALREADY a 3-way preview/builder/entry fork; the
//     entry branch (:547-553) becomes "bg-card rounded-xl" (+ selectionBorder kept).
//   section :1412-1424 — TODAY only a 2-way fork (preview / else SHARED by
//     builder+entry, :1416-1423). FORK it into THREE: preview unchanged,
//     builder = UNCHANGED cn("bg-background/60", selectionBorder(...)), entry =
//     cn("bg-transparent", selectionBorder(...)). Do NOT edit the :1417 else in
//     place — that flips the BUILDER section bg too (TASK-498 byte-parity regress).
//   builder + preview class strings BYTE-IDENTICAL to today — asserted for BOTH
//     block AND section (pin the builder-mode section string, not only entry).

// Drag handle: draggable/onDragStart/onDragEnd move from the wrapper div
// (:584-601) onto the corner type Badge (:648-653), builder-only, plus
// data-screen-drag-handle={block.id} + cursor-grab for tests/UX. onDragOver/
// onDrop/cardDropTargets stay on the card div. Nested-card stopPropagation on
// dragstart stays on the Badge handler.

// Image branch (:1020-1062): ratio read via screenImageRatioClass lookup
// (auto/absent/unknown/legacy free-text → no class). The `relative
// overflow-hidden` wrapper div (with img h-full w-full) is introduced ONLY
// when the lookup resolves a REAL aspect-* class; when there is no ratio class
// render today's EXACT `<div px-4 py-3><img className="w-full rounded-lg
// object-cover/contain"></div>` markup UNCHANGED (no wrapper) so every existing
// image stays builder- AND preview-byte-identical; builder preview staticSrc
// passes normalizeScreenImageSrc before showImage.
```

```ts
// core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts — 503-03 (NEW)
// usePostEditorPreferences pattern, local-only v1 (no userSettingsClient sync):
export const SCREEN_ENTRY_PREFERENCES_STORAGE_KEY = "coderso.screens.entry.preferences.v1";
export type ScreenEntryPreferences = { showFieldMetadata: boolean };
export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = { showFieldMetadata: false };
// normalizeScreenEntryPreferences(raw): non-record / non-boolean → DEFAULT (parse errors swallowed);
// useScreenEntryPreferences(): { preferences, setPreferences } — setState + try/catch localStorage.setItem.

// CustomScreenEntryEditor.tsx: entry-canvas sub-toolbar (CanvasEditor
// `toolbar` prop, :1274-1328) gains a "Show field metadata" Switch
// (`[data-screen-entry-metadata-toggle]`) bound to the hook — NOT the
// Presentation panel, which is null until a presentation-capable block is
// selected (:994-995) so a default-OFF toggle would be unreachable on a fresh
// record view; canvas scroller (:1302)
// drops bg-dotted (entry only); CustomScreenEntryCanvas.tsx threads
// showFieldMetadata → ScreenRuntimeRenderer. CustomScreenPreview (preview
// mode) passes nothing — preview keeps badges.

// ScreenBlockInspector.tsx: NEW "Layout" group (above where Background was) —
// EnumRow width + EnumRow align + 2×4 clamped number Inputs (margin/padding
// per side, min/max from the exported clamps), committing
// onPatchBlock(id, { style }) via a buildStylePatch helper that reads the
// CURRENT block.style, returns the FULL merged style object, then prunes
// empty/default records — because onPatchBlock/updateScreenBlock REPLACES the
// style key wholesale (screenDocumentOps.ts:627 shallow-merges at the block
// level only: `{ ...block, ...patch, data: patch.data ?? block.data }`; there
// is NO style-aware deep merge, unlike handlePatchBlockData which spreads
// ...block.data), so emitting only the changed sub-key would wipe the rest.
// Background row (:729-739) DELETED.
// Image: ratio Input (:600-606) → EnumRow over screenImageRatios; src row
// (:584-590) keeps the raw text in local draft state and writes
// normalizeScreenImageSrc(draft) to data.src (unsafe → "", placeholder shows).
```

---

## Architecture (files to add / change)

```
EDIT core/services/customScreens/customScreenSchemas.ts        (503-01: ScreenBlockStyleV1 + validator + ratio enum + export normalizeScreenImageSrc)
EDIT core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx    (503-02: style emission in wrap(), clearable labels, entry chrome + showFieldMetadata, badge drag handle, ratio wiring, builder src gate)
EDIT core/admin/ui/custom-screens/ScreenBlockInspector.tsx     (503-03: Layout group, Background row removal, ratio EnumRow, filtered src write)
EDIT core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx  (503-03: metadata toggle, bg-dotted drop)
EDIT core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx  (503-03: showFieldMetadata pass-through)
ADD  core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts (503-03)
ADD/EDIT tests (503-04 + per-subtask; see Testing Requirements)
(core/server/validation/customScreenSchemas.ts: pure re-export — verify only.
 NO route / RBAC / endpoint / migration change anywhere.)
```

**Single-writer files:** `customScreenSchemas.ts` = 503-01 ONLY;
`ScreenRuntimeRenderer.tsx` = 503-02 ONLY; `ScreenBlockInspector.tsx` /
`CustomScreenEntryEditor.tsx` / `CustomScreenEntryCanvas.tsx` /
`CustomScreenPreview.tsx` (if touched) / the new hook = 503-03 ONLY.
503-04 writes tests/docs/board only.

---

## Subtasks

| ID | Title | File | Status |
|---|---|---|---|
| TASK-503-01 | Screen Block Style Contract | TASK-503-01-Screen-Block-Style-Contract.md | ⏳ To Do |
| TASK-503-02 | Screen Renderer — Style, Labels, Entry Chrome | TASK-503-02-Screen-Renderer-Style-Labels-Entry-Chrome.md | ⏳ To Do |
| TASK-503-03 | Screen Inspector & Entry Preferences | TASK-503-03-Screen-Inspector-And-Entry-Preferences.md | ⏳ To Do |
| TASK-503-04 | Screens Polish Tests, Docs, Closure | TASK-503-04-Screens-Polish-Tests-Docs-Closure.md | ⏳ To Do |

- **503-01 (keystone — model).** `ScreenBlockStyleV1` + the ~30-line
  screen-local validator (unknown keys throw, values coerce/clamp, sparse +
  prune), `"style"` in the block allow-list with spread-emit-only-when-present
  (absent key byte-stable), `screenImageRatios` const for the renderer/inspector
  (NO schema coercion — `ratio` stays permissive/uncoerced, byte-stable on
  read/write; a coerce would run on the read path via :725-727), EXPORT
  `normalizeScreenImageSrc`. NO schemaVersion bump; reject-unknown
  intact for the new-kind data allow-lists; legacy kinds stay permissive.
- **503-02 (renderer, sole `ScreenRuntimeRenderer.tsx` writer).** `wrap()`
  emits `boxStyle` + width/align class maps identically in all three modes;
  clearable-label semantics on field + stat (divider model) with the
  field-name stand-in inside the builder token; `showFieldMetadata` prop
  gating the entry badges — the binding badge (`:838-846`, builder-null today,
  stays null) and the field-type badge (`:851-855`, which has NO mode gate
  today so renders in builder+preview+entry) gated SEPARATELY so BOTH stay in
  preview AND the field-type badge STAYS in BUILDER (only its ENTRY appearance
  is gated by `showFieldMetadata`); builder chrome unchanged; entry-only
  surface flatten (block `bg-card rounded-xl`; section `bg-transparent` — the
  section's 2-way branch (:1412-1424) MUST be forked into 3 so builder keeps
  `bg-background/60`, NOT edited in place) with builder/preview class strings
  byte-identical (block AND section); drag source moved to the
  corner type Badge (`data-screen-drag-handle`), drop wiring untouched;
  image `ratio` class-map wiring + builder-preview src gate.
- **503-03 (inspector + entry surface + prefs).** Inspector "Layout" group
  (width/align EnumRows + per-side margin/padding clamped inputs via
  `buildStylePatch`, which MUST read the CURRENT `block.style` and return the
  FULL merged style object before pruning — `onPatchBlock`/`updateScreenBlock`
  REPLACES the `style` key wholesale (screenDocumentOps.ts:627), so emitting
  only the changed sub-key would silently wipe previously-set
  width/align/margin/other-padding-sides), dead Background row REMOVED,
  image ratio EnumRow,
  filtered src write (local raw draft + `normalizeScreenImageSrc` on the data
  write); `useScreenEntryPreferences` hook
  (`coderso.screens.entry.preferences.v1`, default `showFieldMetadata:false`)
  + entry-canvas sub-toolbar Switch; `bg-dotted` dropped from the entry canvas;
  `showFieldMetadata` threaded through `CustomScreenEntryCanvas`.
- **503-04 (closure).** Full Vitest custom-screens matrix + byte-stability
  guards + root `tsc -p tsconfig.json --noEmit` + the ≥5-scenario real-flow
  playwright smoke (below), legacy record-header copy documentation
  (decision 2), `_docs/CONTENT_TYPES_SPEC.md` / screens docs update, changelog
  (next FREE number at closure — 1211 is expected to be consumed by TASK-502;
  take the next after whatever exists, verify live), board/README/Statistics.

**Sequencing / land order:** 503-01 (model) → 503-02 (renderer) → 503-03
(inspector/prefs) → 503-04 (closure). 503-02 consumes 503-01's types/constants;
503-03 consumes 503-01's exported filter + 503-02's `showFieldMetadata` prop.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration.** The document rides the existing validated
custom-screens write path (`core/server/validation/customScreenSchemas.ts` is
a pure re-export of the service schemas, so server-side validation picks up
the new `style` contract automatically — verify in 503-01).

- **The one input surface** = (a) the `ScreenBlockStyleV1` validator — enums
  coerce to allow-listed values, ints clamp to
  `PAGE_BLOCK_BOX_SPACING_CLAMP`/`SCREEN_BLOCK_MIN_HEIGHT_CLAMP`, unknown keys
  throw `custom_screen_definition_invalid`; raw stored input can never reach
  the inline `style={}` emission except as a clamped number or a mapped class;
  and (b) the `normalizeScreenImageSrc` prefix filter (`/`, `http://`,
  `https://`; everything else → `""`), now enforced on the inspector write
  AND the builder preview in addition to the existing save path — no unsafe
  scheme can reach `<img src>` at any point in the authoring session.
- **Schema-first / reject-unknown:** all new enums/clamps/validators live in
  the service module; block-level and style-level unknown keys throw with the
  existing machine-readable error; new-kind data allow-lists unchanged —
  `ratio` stays permissive/uncoerced (validated only at the renderer class-map
  + inspector EnumRow), so stored ratios round-trip byte-stable on read/write.
- **Non-destructive / byte-stability guards (named):** absent `style` key
  round-trips byte-stable (spread-emit-only-when-present); stored-V4
  byte-stability tests stay green; NO schemaVersion bump (stays 1 / definition
  v4); legacy permissive kinds untouched; NO read-path mutation of stored data
  (decision 2); `variant` stays accepted on read/write (only the dead control
  is removed). Preferences are localStorage-only client state — no server
  surface.
- **Cross-cutting no-regress:** TASK-498 presentation-override surface,
  Bun-free boundary (no `@/ui/pages` imports in custom-screens UI — the
  services→services `pageDocumentV2` constant import is the allowed
  menuDocumentV2 precedent), palette/insertion behavior, `PaletteChip`
  dead-code guard.

---

## Acceptance Criteria (measured live, not synthetic-only)

1. **A — styling has a visible effect in every mode.** Set width `half`,
   `margin.top: 24`, `padding.top: 16`, align `center` on a field block:
   builder, preview AND the published entry view show the block at ~50% of the
   section width, horizontally centered, with computed `margin-top: 24px` /
   `padding-top: 16px` (computed-style asserts, not control presence). Absent
   `style` documents save byte-identical. The inspector shows a Layout group;
   the dead "Background" row is gone and `variant` still round-trips.
2. **B — a cleared label disappears.** Clearing a field/stat label in the
   inspector and saving renders the value with NO label element in entry mode
   ("text left + value right" composition is clean); the builder still shows
   `{{ FieldName }}`; screens that never set a label render exactly as today.
3. **C — entry view is clean by default, metadata is opt-in.** A fresh entry
   view shows ZERO "Editable"/"Read"/"Unbound"/field-type badges and a single
   flat surface (no `bg-dotted`, block wrapper computed background = opaque
   card, section transparent). The entry-canvas sub-toolbar toggle (CanvasEditor
   `toolbar` prop) is reachable on a fresh entry view (NOT the Presentation
   panel, which is null until a presentation-capable block is selected), turns
   badges on, survives a reload (localStorage), and turns them off again. Builder
   and preview chrome byte-identical to today — in particular the field-type
   badge (`:851-855`, no mode gate today) STAYS present in builder (only its
   entry appearance is gated), pinned by the builder-mode snapshot. Clearing the legacy record-header
   eyebrow/subtitle sticks (with B) and is documented.
4. **D — containers drag by the handle.** A container (field-group/columns)
   drags by its corner type Badge and reorders; dragging a NESTED child by its
   own badge moves only the child (non-shadowing); drops on gaps/cards resolve
   exactly as before (TASK-500 insertion tests updated, not weakened); the
   reorder persists after save.
5. **E — ratio is live, unsafe src never renders.** Ratio `16/9` yields a
   computed aspect-ratio ≈ 1.78 wrapper in builder AND entry; typing
   `javascript:alert(1)` into Image URL never produces an `<img>` with an
   unsafe src in the builder DOM (placeholder shows) and saves as `""`.
6. Full gates green: `bun --cwd core lint`, `lint:types`, root
   `tsc -p tsconfig.json --noEmit`, full vitest custom-screens matrix,
   `test:bun`, repo gate alias.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free custom-screens suites):**
- `tests/vitest/admin/custom-screen-schemas.test.ts` — style validator:
  valid subset round-trips byte-stable; unknown style/box keys throw
  `custom_screen_definition_invalid`; enum coerce + int clamp (min/max/float/
  NaN); empty record prunes; ABSENT `style` key absent after normalize
  (byte-stability guard); ratio stays UNCOERCED — a stored free-text ratio
  (e.g. `16:9`) round-trips byte-stable on BOTH read (`normalizeForRead`) and
  write (idempotency guard so no schema coercion regresses stored-V4 stability);
  `normalizeScreenImageSrc` exported + unchanged behavior.
- `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` —
  `wrap()` style emission identical across builder/preview/entry (inline
  style + width/align classes; align suppressed when horizontal margins set);
  clearable labels: explicit `""` renders no label `<p>` (field + stat),
  absent key renders today's default, builder token keeps the field-name
  stand-in; `showFieldMetadata` gating — the two badges are gated SEPARATELY:
  entry default OFF hides BOTH the binding and field-type badges, `true` shows
  both, preview always shows both, and BUILDER still shows the field-type badge
  (`:851-855` had NO mode gate) while the binding badge stays builder-absent —
  assert BOTH a builder-mode field-type-badge-PRESENT case AND an entry-default
  BOTH-badges-ABSENT case so the 2-vs-1 gating divergence is pinned; entry surface
  classes (`bg-card rounded-xl` block, `bg-transparent` section) AND
  builder-mode class output byte-identical to the pre-task snapshot — pin the
  BUILDER section class string (`bg-background/60`) explicitly, not only the
  block, so the section 2→3 fork cannot regress builder bg-parity;
  drag handle: wrapper div NOT draggable, badge (`data-screen-drag-handle`)
  is, `onDragStart` sets the block id payload; image ratio class map —
  assert the img DOM for BOTH the auto/absent case (today's EXACT
  `<img className="w-full rounded-lg object-*">`, NO wrapper — builder/preview
  byte-parity) AND a ratio'd case (the `relative overflow-hidden` aspect-*
  wrapper with img `h-full w-full`); builder preview drops an unsafe staticSrc.
- `tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` —
  UPDATE: dragstart fired on the badge handle; new cases: container-by-handle
  reorder + nested-child drag moves only the child (non-shadowing); existing
  gap/card drop-resolution assertions preserved.
- `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx` — the
  single home for the Layout-group + `buildStylePatch` coverage (reuse its
  existing `mount`/`renderInspector` harness; no new inspector test file):
  ratio EnumRow writes enum values; src input: typing an incomplete
  `https:/…` keeps the draft visible while `data.src` stays `""`; a valid
  URL commits verbatim; `javascript:` commits `""`; PLUS the Layout group
  `buildStylePatch` merge — set two INDEPENDENT style sub-keys sequentially
  (e.g. `padding.top` then `align`) and assert BOTH survive in the committed
  block.style (guards against the wholesale `style`-key replace in
  screenDocumentOps.ts:627); empty/default records prune to an absent `style`.
- `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`
  (the suite that mounts `CustomScreenEntryEditor`) — the metadata-toggle
  (`[data-screen-entry-metadata-toggle]`) renders unchecked by default and
  flips badge visibility through the threaded prop; the canvas scroller
  (`[data-screen-editor-canvas-scroller]`) no longer carries `bg-dotted`.
- NEW `tests/vitest/ui/use-screen-entry-preferences.test.ts` — default OFF,
  normalize (junk/non-boolean → default, parse errors swallowed), persist +
  re-read round-trip, storage-key constant pinned.
- `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` — extend the
  no-`@/ui/pages`-imports guard to the new hook file; `PaletteChip`
  dead-code guard stays green.
- Regression pins: stored-V4 byte-stability suite untouched and green;
  `tests/vitest/customScreens/screen-document-image-src.test.ts` extended for
  the exported filter.

**Bun lane:** `tests/integration/routes/customScreensRoutes.test.ts` — a
definition PATCH carrying a valid `style` persists; an unknown style key
4xx's with the existing invalid-definition error. (No new routes.)

### SMOKE (owner mandate — ≥5 DISTINCT real-flow scenarios, playwright, assert VISIBLE EFFECT, never control presence)

1. **Style a block end-to-end.** Builder: set width `half` + align `center` +
   `margin.top 24` + `padding.top 16` on a bound field block → save → open the
   published entry view: assert `getBoundingClientRect().width` ≈ 0.5× section
   width AND computed `marginTop === "24px"` / `paddingTop === "16px"` in BOTH
   builder canvas and entry view.
2. **Clear a label → clean composition.** Clear a field label + a stat label →
   save → entry view: assert the label element is ABSENT from the block DOM
   and the value/stat renders alone ("text left + value right" clean); builder
   still shows the `{{ FieldName }}` token.
3. **Entry-view metadata toggle + clean surface.** Fresh entry view: assert
   zero badge elements ("Editable"/"NUMBER") and computed backgrounds — canvas
   without the dotted texture, block wrapper opaque card color, one consistent
   surface. The "Show field metadata" toggle is REACHABLE in the entry-canvas
   sub-toolbar on this fresh view (no block selected) → toggle ON → badges
   visible; reload → still ON (localStorage); toggle OFF → clean again.
4. **Container drag BY THE HANDLE, nested non-shadowing.** Drag a
   columns/field-group container by its corner badge to a new position →
   assert new DOM order + persisted order after save; then drag a NESTED child
   by its own badge → assert only the child moved and the container stayed.
5. **Image ratio + unsafe src.** Set ratio `16/9` + a valid `/media/...` src →
   assert the img wrapper computed aspect-ratio ≈ 1.78 in builder and entry;
   then type `javascript:alert(1)` into Image URL → assert NO `<img>` with a
   `javascript:` src ever exists in the builder DOM and the saved document
   holds `src: ""`.

---

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (screen definition contract): `ScreenBlockStyleV1`
  shape + clamps/enums, clearable-label semantics, `ratio` enum, exported
  `normalizeScreenImageSrc`.
- Entry-view metadata preference (storage key, default OFF) + the legacy
  record-header copy authoring note (decision 2) in the screens/admin docs.
- Changelog entry (next free number at closure — verify live; 1211 expected
  to go to TASK-502) + board/README/Statistics updates.
