# TASK-522-05-L05: Layered Canvas + Glass/Glow + Hover + Ticker Tests

# FileName: TASK-522-05-L05-Canvas-Glass-Hover-Ticker-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** High
**Category:** Tests / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Vitest suites for the section surface + page-root emit (L01),
layered canvas + layer controls (L02), block glass/hover controls (L03), and
marquee/ticker (L04). No production code.

## Test shapes

### `tests/vitest/pages/page-renderer-v2.test.tsx` (append)

- **Section surface:** `style.surfacePreset:"glass"` → `data-surface="glass"`;
  `"ambient-orbs"` → 2 `.cx-orb` children; `composition:"layered"` →
  `data-composition="layered"`.
- **Page-root emit (present-only):** a doc with ANY 522 effect → root has exactly ONE
  composition `<style>` and (with a tilt) ONE runtime `<script>` (NOT double-emitted
  alongside 521-05's); a NO-effect doc → NO composition `<style>`/extra `<script>`,
  render byte-identical to post-521.
- **Layered canvas:** a `container` `composition:"layered"` with two `style.layer`
  children → parent `data-composition="layered"`, children `data-layer` +
  `--layer-x/y/z` custom props (+ `data-layer-anchor` when set); a flow container →
  normal (byte-identical).
- **Per-device layer (pageResponsiveCss):** a child with
  `responsive.tablet.style.layer.x` → the emitted tablet media-query CSS carries a
  `--layer-x` `!important` delta.
- **Glass/hover:** block `surfacePreset:"glass"`→`data-surface`,
  `hoverEffect:"lift-glow"`→`data-hover`.
- **Marquee:** `group` `style.marquee.speed:18`,`seamless:true` → block-frame
  `data-marquee`, `--marquee-speed:18s`, a `.cx-marquee-viewport` with two
  `.cx-marquee-track`s; `direction:"right"`→`data-marquee-dir="right"`; no marquee →
  byte-identical.

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageUniversalSectionControls` includes `section.surface.preset`/
  `section.composition.mode`; `pageUniversalBlockControls` includes
  `block.layer.*`/`block.surface.preset`/`block.hover.effect`/`block.tilt.*`/
  `block.decoration.*`; the per-type `pageBlockControlRegistry` entries for
  `container`/`columns`/`group` include `block.<type>.composition.mode`, and
  `pageBlockControlRegistry.group` includes the `group.marquee.*` controls. Every
  descriptor conforms to the live `PageEditorControlDefinition` (array `path`,
  `input` in the live union, enum `options` a `readonly string[]`, required
  `panel`/`target`/`responsive`) — NO `kind`/`showWhen`/`appliesTo`/`min`/`max`.

### `tests/vitest/pages/page-composition-effects.test.ts` (append)

- `PAGE_COMPOSITION_EFFECTS_CSS` includes the `.cx-orb`, `.cx-marquee-viewport`/
  `.cx-marquee-track`, the 9 `[data-layer-anchor=…]`, surface, and hover rules;
  ticker (bound to `.cx-marquee-track`), orb-drift, and hover-transition inside the
  `no-preference` gate; glass/grid/glow + anchor transforms static.

## Validation commands

- `bun --cwd core vitest run tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-composition-effects.test.ts`
- Root `tsc -p tsconfig.json --noEmit` + `bun --cwd core lint:types` green.

## Hard Invariants

1. Present-only + byte-identity for no-effect docs explicitly asserted (incl. no
   `<style>`/`<script>` emitted).
2. Single runtime `<script>` (de-duplicated with 521-05).
3. Vitest lane; no Bun file.
</content>
