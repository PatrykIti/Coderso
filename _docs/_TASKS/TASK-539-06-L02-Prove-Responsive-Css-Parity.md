# TASK-539-06-L02: Prove Responsive CSS Parity

# FileName: TASK-539-06-L02-Prove-Responsive-Css-Parity.md

**Parent Subtask:** TASK-539-06
**Priority:** High
**Category:** Pages / Vitest / Responsive Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-06-L01
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole-writer scope

Create only:

- `tests/vitest/pages/task-539-responsive-css-parity.test.ts`

All production files and all L01 tests/support are read-only. Do not append cases to
`page-responsive-css*.test.ts`, re-baseline their assertions, or create a second
fixture/support file. The new suite must be independently runnable and no more than
1,000 physical lines.

## Implementation Pseudocode

Build normalized Page documents, compare the breakpoint resolver's effective values
with the public CSS delta, and assert:

1. Facade-owned `PageSectionResponsiveStyleV2`,
   `PageBlockResponsiveStyleV2`, and `PageBlockResponsiveLayerV2` are the types used
   by the plan inputs/helpers. The eight forbidden section style keys
   (`scrollEffect`, `parallaxIntensity`, `surfacePreset`, `composition`, `fullBleed`,
   `noiseOverlay`, `columnTemplate`, `border`) and nine forbidden block style keys
   (`decoration`, `tilt`, `tiltGlare`, `surfacePreset`, `hoverEffect`, `marquee`,
   `composition`, `revealDelay`, `magnetic`) reject on write and disappear on stored
   read in the TASK-539-01 owner. For each forbidden key, feed this suite the
   normalized stored-read result with an allowed sibling and prove the sibling still
   projects while the forbidden key yields neither CSS nor a compatibility
   diagnostic. Do not cast raw invalid input to the responsive types.
2. Base layer `{ y, z, anchor }` plus device `{ x }` emits only device `x`; inherited
   base `y/z` remain effective through the base inline style. Present `x/y/z = 0`
   resets emit. Responsive `anchor` rejects on write, is removed on stored read, and
   can never produce CSS.
3. `fontSizeCustom` emits only after the shared sanitizer accepts it;
   `textTransform: "none"` explicitly resets the base transform. Non-typography
   blocks diagnose exact keys and emit neither declaration.
4. `resolvePageBlockGridPlacement(..., {includeHiddenBlocks:false})` covers every
   public class: root block frame; root
   timeline/gallery/FAQ/testimonial template wrapper; nested path; actual per-column
   composition; a hidden assigned sibling excluded from the visible root set; resolved
   default and non-default media-split. Both legal classes use the exact escaped
   `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` selector; `none` diagnoses each present span and
   emits no inert rule. Pair the CSS proof with rendered markup for a base-only span,
   a responsive-only span, and no span: the first two stamp the hook on the classified
   target, while the last stamps no hook and emits zero span CSS.
5. Section and block gradient stacks with an optional final color emit exact image
   bytes and canonical color bytes in separate declarations. Invalid paint never
   leaks; explicit reset remains safe.
6. Responsive paint/radius/shadow/glow target the outer section when the base section
   or resolved template is full-bleed, while capped paint and all
   layout/max-width/grid/spacing declarations target content. The device override
   cannot carry `fullBleed` or switch the target. Base tilt may still select the
   layer wrapper, but responsive `tilt` itself cannot exist.
7. Tilt+layer wrapper targeting remains correct and no local placement/attribute
   spelling appears. Direct-import
   `PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE` and
   `PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE` from
   `pageRendererReplicaIdentity.ts`. At tablet and mobile, pin exact
   `:is(primary canonical selector, replica alias selector)` rules for block-frame
   visual style, visual-element style, typography/text, and the hoisted tilt/layer
   wrapper. Render a real approved two-segment marquee and prove its replica stamps
   the block alias on the corresponding frame and the tilt alias only on the hoisted
   wrapper, both with the canonical normalized original block ID. The plan emits one
   shared rule/declaration sequence per aliased target—not duplicated
   primary/replica CSS—and neither alias membership nor an unauthored delta emits
   CSS. Author the legal responsive span on the outer marquee group: its singular
   canonical grid target remains outside both segments and uses only
   `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE`; every duplicated descendant resolves placement
   `"none"` and emits no grid hook/alias/span CSS. Primary, non-seamless, and
   unsafe-fallback markup contains zero replica aliases.
8. Accepted responsive `style.column`, both a numeric assignment and an explicit
   `null` reset over a base assignment, emits the exact `style.column` /
   `not_css_expressible` diagnostic and no inert CSS. Unsupported props retain their
   exact props diagnostic, while `heading`/`text` `props.align` emits its intended
   rule. Model-forbidden base-only style keys never receive responsive-CSS
   compatibility diagnostics because they cannot survive normalization.
9. Hostile IDs and scope selectors cannot break the rule; media/declaration ordering
   is deterministic; unrelated and no-override documents retain exact CSS and
   diagnostic byte identity, including zero emitted bytes.

Use explicit expected rules/diagnostics, not broad word matches or editor-state-only
assertions. Failures are fixed in the owning source leaf; this proof must not weaken a
compatibility expectation.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/task-539-responsive-css-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts tests/vitest/pages/page-responsive-css-section.test.ts tests/vitest/pages/page-responsive-css-block.test.ts tests/vitest/pages/page-responsive-css-security.test.ts
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun a named failing file once in isolation before classification.
