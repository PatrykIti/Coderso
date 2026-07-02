# 1212 - TASK-503 Screens Polish V2 — Block Style Channel, Clearable Labels, Clean Entry View, Drag Handle & Image Residuals

**Date:** 2026-07-02
**Version:** Unreleased
**Tasks:** TASK-503, TASK-503-01, TASK-503-02, TASK-503-03, TASK-503-04
**Type:** Admin UI/Custom Screens/Screen Builder/Entry View/QA/Docs/Task Board

## Overview

Custom-Screens polish v2 — five owner-reported issues from the 2026-07-02 live
session plus TASK-500 residuals, all on the existing validated custom-screen
write path with **no new endpoint / RBAC / migration** and **NO schemaVersion
bump** (`ScreenDocumentV1` stays `schemaVersion: 1`, definition stays `v4`). A
stored V4 screen round-trips **byte-stable**; builder/preview renderer output is
byte-identical to pre-503 (only entry mode changes chrome).

- **A. Block style channel** — `ScreenBlockV1` gains a validated OPTIONAL
  `style` (width preset / minHeight / margin / padding / align), replacing the
  dead free-text `variant` "Background" inspector row.
- **B. Clearable labels** — an explicitly cleared label (`""`) now renders NO
  label; an absent key keeps today's default; the builder token keeps a
  field-name stand-in.
- **C. Clean entry view** — metadata badges gated OFF by default (opt-in
  per-user toggle), entry surface flattened, `bg-dotted` dropped.
- **D. Container drag handle** — the corner type Badge is the drag source (no
  more nested-child shadowing); drop wiring/keyboard flows unchanged.
- **E. Image residuals** — `ratio` wired as an enum→`aspect-*` class map;
  `normalizeScreenImageSrc` exported and enforced on write + inspector + preview.

## Key Changes

### 503-01 — Screen block style contract (`core/services/customScreens/customScreenSchemas.ts`)
- `ScreenBlockStyleV1` type + a ~30-line screen-local validator: unknown KEYS
  throw `custom_screen_definition_invalid` (style key + box side), invalid
  VALUES coerce/clamp and never throw (`coerceScreenEnum`/`clampScreenInt`).
  `minHeight` clamps to `SCREEN_BLOCK_MIN_HEIGHT_CLAMP` (0..640); box sides clamp
  to `PAGE_BLOCK_BOX_SPACING_CLAMP` (0..240) **imported read-only** from
  `services/pages/pageDocumentV2` (the allowed services→services precedent; the
  Bun-free boundary bans only `@/ui/pages`).
- `"style"` added to the block allow-list with spread-emit-only-when-present, so
  an **absent `style` key round-trips byte-stable**; the channel is sparse and
  self-pruning (empty `style: {}` / empty box → NO member). `block.variant`
  stays accepted on read/write — only the dead control is removed (decision 1).
- `screenBlockWidths`, `screenBlockAligns`, `screenImageRatios`
  (`["auto","1/1","4/3","16/9","3/2"]`) constants exported for the renderer /
  inspector class maps; `normalizeScreenImageSrc` EXPORTED as the single source
  of truth for the `src` prefix filter.
- `ratio` stays **permissive/UNCOERCED** (decision 3) — a stored legacy free-text
  ratio (e.g. `"16:9"`) round-trips byte-identical on BOTH read and write (the
  read path runs the same normalizer, so any coercion would mutate stored reads).
- A mirrored Ajv `screenBlockStyleV1Schema` (`additionalProperties:false`,
  integer ranges) rejects unknown/out-of-range/junk style at the route edge.

### 503-02 — Renderer: style emission, labels, entry chrome, drag handle, ratio (`core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`)
- `wrap()` emits `boxStyle` + width/align class maps identically in
  builder/preview/entry; the align class is suppressed when an explicit
  horizontal margin is set (deterministic precedence).
- Clearable-label semantics on `field` + `stat` (divider model); the builder
  keeps the `{{ field-name }}` stand-in inside the token.
- `showFieldMetadata` prop (default false) gates the entry badges; the two badges
  are gated SEPARATELY so the field-type badge STAYS in builder + preview and
  only its entry appearance is gated (builder byte-parity kept).
- Entry-only surface flatten: block wrapper recolors to `bg-card rounded-xl`
  **while retaining `selectionBorder`** (the TASK-498 selection ring the
  presentation-override panel is scoped to is NOT stripped); the section 2-way
  fork becomes 3-way so builder keeps `bg-background/60`, entry is
  `bg-transparent`.
- Drag source moved to the corner Badge (`data-screen-drag-handle={block.id}`);
  `onDragOver`/`onDrop`/card drop targets and keyboard/a11y flows stay on the card.
- Image `ratio` class map (`aspect-square`/`aspect-[4/3]`/`aspect-video`/
  `aspect-[3/2]`; auto/absent/legacy → today's exact `<img>` markup, no wrapper);
  builder preview gates static `src` through `normalizeScreenImageSrc`.

### 503-03 — Inspector, entry preferences & flat canvas (`ScreenBlockInspector.tsx`, `CustomScreenEntryEditor.tsx`, `CustomScreenEntryCanvas.tsx`, `hooks/useScreenEntryPreferences.ts`)
- Inspector "Layout" group (width/align EnumRows + per-side margin/padding
  clamped inputs) committing via `buildStylePatch`, which reads the CURRENT
  `block.style` and returns the FULL merged style before pruning (the block
  patch REPLACES the `style` key wholesale). Dead "Background" row removed.
- Image `ratio` EnumRow (colon LABELS `auto/1:1/4:3/16:9/3:2`, WRITES the slash
  enum value); `src` row keeps a local raw draft and writes
  `normalizeScreenImageSrc(draft)` (unsafe → `""`, placeholder shows).
- `useScreenEntryPreferences` — localStorage-only, key
  `coderso.screens.entry.preferences.v1`, default `{ showFieldMetadata: false }`;
  an entry-canvas sub-toolbar "Show field metadata" Switch
  (`[data-screen-entry-metadata-toggle]`); `bg-dotted` dropped from the entry
  canvas scroller; `showFieldMetadata` threaded through the entry canvas.

### 503-04 — Tests, docs, closure
- Cross-cutting tests added: route persistence
  (`tests/integration/routes/customScreensRoutes.test.ts` — a valid block style
  PATCH persists and round-trips byte-stable via GET; an unknown style key is
  rejected 400 at the route edge, store untouched), service persistence
  (`tests/vitest/customScreens/customScreenService.test.ts` — style-carrying V4
  write preserved; unknown style key throws `custom_screen_definition_invalid`),
  the entry-selected-block **selection-ring no-regress** pin (TASK-498), and the
  authoring-boundary scan extended to `ScreenBlockInspector.tsx` +
  `hooks/useScreenEntryPreferences.ts`.
- Sibling-owned pins verified green: schema style round-trip / absent-key
  byte-stability / values-coerce / ratio-uncoerced-both-paths / exported
  `normalizeScreenImageSrc` (503-01); renderer builder/preview class byte-identity
  + label composition + metadata gating divergence + drag handle + ratio map
  (503-02); inspector `buildStylePatch` merge + filtered src + preferences hook
  (503-03); insertion-targeting re-pointed to `data-screen-drag-handle`; TASK-498
  presentation-override surface + TASK-500 ops + `PaletteChip` dead-code guard.
- Docs: `_docs/CONTENT_TYPES_SPEC.md` gains the TASK-503 block-style-channel
  section (style shape/clamps/enums, clearable labels, ratio enum, exported
  `normalizeScreenImageSrc`, `showFieldMetadata` preference, drag-handle
  contract, legacy record-header authoring note).

## Decisions (normative)

1. **`variant` "Background" row REMOVED, key still accepted.** A validated
   `ScreenBlockStyleV1.background` enum is the future additive successor; wiring
   raw stored free-text into CSS would violate the schema-first rule.
2. **Legacy record-header copy → document, NO read-path repair.** "RECORD
   OVERVIEW" / "Preview the primary content fields…" are STORED migration data,
   cleared via the record-header eyebrow/subtitle inspector rows; a read-path
   mutation would break stored-V4 byte-stability and is destructive-by-stealth.
3. **Image `ratio` → NO schema-level coercion.** Resolved to `auto` only for
   DISPLAY at the renderer class-map / rewritten only on explicit inspector
   change; stored bytes round-trip identical on read and write.

No new public endpoint, RBAC change or migration; NO schemaVersion bump
(definition stays v4 / document `schemaVersion` 1). Preferences are
localStorage-only client state — no server surface. All byte-stability guards
(absent-style spread-emit-only-when-present, stored-V4 round-trip, builder/preview
class byte-identity, `ratio` byte-stability, `variant` round-trip, no read-path
mutation) are green.

## Residual follow-ups

- Block background as a future VALIDATED `ScreenBlockStyleV1.background` enum
  (successor to the removed free-text variant row).
- `useScreenEntryPreferences` local-only v1; `userSettingsClient` cross-device
  sync deferred.
