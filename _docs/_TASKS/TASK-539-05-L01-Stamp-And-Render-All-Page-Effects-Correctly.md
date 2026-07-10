# TASK-539-05-L01: Stamp and Render All Page Effects Correctly

# FileName: TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md

**Parent Subtask:** TASK-539-05
**Priority:** High
**Category:** Pages / Public Renderer / Geometry
**Estimated Effort:** Very Large
**Dependencies:** TASK-539-04-L01; TASK-539-01-L01; TASK-539-02-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Ownership

Sole source writer: `core/services/pages/pageRendererV2.tsx`. This leaf also owns
compatibility-expectation updates required before its source gate in
`tests/vitest/pages/page-renderer-v2.test.tsx` and
`tests/vitest/pages/task-534-interactivity-render.test.tsx`. Read the post-TASK-478
file fresh. Current anchors include block render props `:1125-1193`, gallery
`:1585-1805`, marquee `:2354-2394`, divider `:2545-2580`, tilt/layer wrapper
`:2872-2901`, timeline `:3012-3088`, reveal CSS `:795-842`, and document runtime
emission `:3866-3877`.

## Implementation Pseudocode

### Data Flow

1. **Composition and magnetic.** Continue to obtain attributes/variables from
   `resolveBlockCompositionAttrs`; spread its magnetic and transform-host hooks on
   the real frame. Update reveal CSS so hidden/revealed states set only
   `--cx-reveal-y` and opacity; never emit `transform:none`. Import the shared
   `PAGE_BLOCK_TRANSFORM_HOST_SELECTOR` so a reveal-only section's descendant block
   consumes the same fixed transform chain without needing a block-style attribute.
   Update the exact recursive composition-emission predicate
   `blockUsesCompositionEffect` (and any document/section wrapper that delegates to it)
   so `style.magnetic === true` is independently sufficient to emit
   `PAGE_COMPOSITION_EFFECTS_CSS`. Also update `docUsesCompositionEffects` so any
   section with `style.scrollEffect` is independently sufficient to emit that same
   stylesheet: a reveal-only section needs the shared transform chain even when none of
   its blocks owns a composition effect. A magnetic-only document must receive both the
   present-only host hook and the fixed transform-chain stylesheet; do not rely on
   reveal/decoration/hover/tilt/layer being co-authored. The same predicate is used for
   every document rendered through this module, including the footer document supplied
   by `siteShell`; do not create a main-only duplicate gate.

2. **Tilt/layer width.** Import `PAGE_LAYER_WIDTH_ATTRIBUTE`, derive the existing
   effective block width on the hoisted tilt/layer wrapper, and stamp
   `full|auto` only when that wrapper
   exists. Full follows the same width semantics as the frame; auto stays
   max-content/bounded. Preserve `data-tilt-parent-for` and layer variables.

3. **Actual grid-item span.** Import `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` from its exact
   owner, TASK-539-04-L01, and add that stable, present-only hook for blocks
   with base or responsive spans. In default auto-flow, the block frame is the target.
   For existing gallery/FAQ/testimonial/timeline template wrappers, move base span
   styling and the hook to that wrapper and suppress the inner frame span. For
   per-column composition and non-grid media-split zones, omit the hook/span. Do not
   add a wrapper to legacy default markup merely to host a span. Its value is the
   normalized block id; do not spell the attribute literal locally.

4. **Background split.** Call `parseAuthoringCssBackgroundPaint` after the existing
   model sanitizer. Emit `paint.image` only as `backgroundImage` and `paint.color`
   only as `backgroundColor`; when one component is absent, apply the same explicit
   clear/reset semantics as the current background-type branch. Full-bleed section
   paint remains on the outer section; capped content remains unpainted.

5. **Canonical gallery.** Import `PageGalleryItemV2` and remove the renderer-local
   alias-reading shape/regex mirror. Consume canonical fields, while re-sanitizing
   nonempty `src` and category tokens before attributes. Caption-only placeholders
   remain supported. Filters remain toolbar/pressed controls.

6. **Marquee.** Render exactly:

   ```tsx
   <div className="cx-marquee-viewport">
     <div className="cx-marquee-rail">
       <div className="cx-marquee-segment">...</div>
       <div className="cx-marquee-segment" aria-hidden="true">...</div>
     </div>
   </div>
   ```

   Duplicate content is inert/hidden from accessibility. Stable keys do not duplicate
   IDs.

7. **Divider.** Gradient width/alignment apply only under `gradient===true`; legacy
   `<hr>` carries no dead width/alignment. TASK-539-01 removes stale stored props and
   TASK-539-03 gates controls.

8. **Timeline.** Introduce one pure geometry helper returning item padding class,
   marker-center offset (22px default, 18px compact), and row gap. Per-item axis top is
   marker center for the first item and zero otherwise; bottom is marker center for the
   last item and gap bleed otherwise. A single item begins/ends at the same center.
   Horizontal timeline remains unchanged.

## Error and identity rules

- A failed paint/media/category recheck omits only the unsafe declaration/item and
  never emits raw input.
- Do not catch and render unsafe raw values as a fallback.
- All new hooks/styles are present only when their feature is authored. Pin the
  no-effect/no-span/no-background render output byte-for-byte.
- `magnetic:true` alone emits the composition stylesheet; false/unset alone emits no
  new bytes. Main and footer rendering share this exact predicate.
- A reveal-only section independently emits the composition stylesheet; its otherwise
  effect-free descendant consumes the shared chain, while a section with no effect
  remains byte-identical.
- Do not move runtime initialization to `siteShell`; TASK-539-07 owns rescanning.

## Gate test ownership and validation

Update the two named renderer suites' stale DOM/transform expectations and add the
reveal-only emission assertion before this source gate. TASK-539-05-L02 owns additive
geometry combinations afterward and must not re-baseline these landed expectations.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/task-534-interactivity-render.test.tsx
git diff --check
```

Rerun any named failing test file once in isolation before classifying the failure.
