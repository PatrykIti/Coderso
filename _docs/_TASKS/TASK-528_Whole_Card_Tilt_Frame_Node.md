# TASK-528: Whole-Card Tilt — Tilt Transform on the Surface Frame, Perspective on an Ancestor

# FileName: TASK-528_Whole_Card_Tilt_Frame_Node.md

**Priority:** High
**Category:** Site Render / Content (Pages) / Bug Fix / Accessibility (reduced-motion) / Security
**Estimated Effort:** Small
**Dependencies:** TASK-522, TASK-524 (direct follow-up fix)

**Status:** ✅ Done
**Completed:** 2026-07-08
**Closure changelog:** 1241 (`_docs/_CHANGELOG/1241-2026-07-08-task-528-whole-card-tilt-frame-node.md`)

---

## Historical reconstruction notice

This board parent was reconstructed by TASK-545-04-L02 from physical evidence
only: the board row in `_docs/_TASKS/README.md`, changelog 1241, the
`_docs/_workflows/task-528-full.mjs` workflow script, and the implementing
commits `9fc19cba` (feat) plus merge `06564017`, both dated 2026-07-08. It is a
historical evidence summary of an already-shipped task, not a new execution
contract. **No physical children or leaves were authored historically for
TASK-528, and none are created here.** No retroactive implementation pseudocode,
acceptance promises, or validation/smoke claims beyond the recorded evidence are
added.

## Shipped behavior (from changelog 1241 and commit diff)

Direct follow-up fix to TASK-522/524 composable effects. Owner bug: with a glass
surface preset the whole CARD stayed flat while only the inner content tilted on
hover, because 522/524 left tilt as the SOLE inner effect on a DESCENDANT node
(CSS `perspective` must sit on an ancestor of the transformed node, and the frame
itself carried `data-tilt-parent`). The fix completes the 524 co-location:

- `core/services/pages/pageRendererV2.tsx` `splitBlockComposition` no longer
  routes `data-block-tilt` to the inner wrapper. The tilt marker stays on the
  FRAME co-located with `data-surface` (and the 524 `translate:`-property anchor
  offset), so the whole glass card tilts on hover. `effectToInner` is empty for
  tilt; a new returned `tiltParent` flag replaces stamping `data-tilt-parent` on
  the frame.
- `renderPageBlockWithFrame` wraps the frame (both the custom `renderBlockFrame`
  path and the default `PageBlockFrame` path) in a present-only
  `withTiltParent` helper: `<div data-tilt-parent style="perspective:1200px">`
  ONLY when the block authors tilt (`s.tiltParent`); otherwise the frame renders
  byte-identically (no extra wrapper).
- The `[data-block-tilt]` runtime (`core/services/pages/pageEffectsRuntime.ts`,
  untouched) writes `el.style.transform` on the frame and reads its `.cx-glare`
  child; both still resolve on the frame. The anchor self-offset uses the
  independent CSS `translate:` property (TASK-524-01), a separate composited
  channel, so it composes with the tilt `transform` without clobbering.
- KNOWN rare untested combo: a block with BOTH tilt AND a transform-writing
  decoration (`float`/`drift`/`pulse`/`orbit`) would contend on the frame
  `transform`; the reference never combines them (chips float, the card tilts).

## Compatibility, security, and validation facts (evidenced)

- **Present-only, jsonb-only:** NO npm dependency, NO DB migration/DDL, NO
  `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO model/schema/normalizer/
  control change, NO route/RBAC. A block with no `tilt` normalizes AND renders
  byte-identical to post-524; `prefers-reduced-motion` unchanged.
- **Security:** no new attacker-influenceable surface: no new field/markup/URL/
  interpolation; `perspective:1200px` is a static literal; `data-tilt-parent` is
  a static presence flag; tilt strength is the already-validated
  `pageTiltStrengths` enum; reject-unknown fail-closed unchanged (no schema
  touched).
- **Tests (`tests/vitest/pages/page-renderer-v2.test.tsx`):** the three owned
  flip-signature tilt placement assertions (generic tilt+glare, anchor+tilt, and
  522-04-L02 tilt "strong") were rebaselined to the new placement
  (`data-block-tilt` on the FRAME; `data-tilt-parent` as an ancestor wrapper),
  plus a new owner-bug test asserting `surfacePreset:"glass" + tilt:"strong"`
  puts both `data-surface="glass"` and `data-block-tilt="strong"` on the SAME
  node. Declared rebaselines, not drift, not weakened assertions.
- **Validation recorded in changelog 1241:** core lint, core lint:types, root
  `tsc -p tsconfig.json --noEmit`, `test:vitest` (changed file 133/133 + broad
  `tests/vitest/pages/` 546/546), `test:bun`, `gates:coderso` (5/5). The LIVE
  ≥5-per-area light+dark Playwright smoke was deferred to the orchestrator
  post-merge and is not claimed as run here.
- **Changelog numbering:** physical file and index use 1241. The implementing
  commit message initially referenced 1240; post-merge commit `b93f8b4c`
  corrected the entry header to 1241, matching the current physical evidence.
- **Docs:** `_docs/PAGE_MODEL.md` updated to state the tilt transform rides the
  surface FRAME while `perspective` sits on the ancestor `[data-tilt-parent]`
  wrapper.
