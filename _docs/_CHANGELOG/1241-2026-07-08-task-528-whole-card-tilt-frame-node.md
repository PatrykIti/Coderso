# 1240 - TASK-528 Whole-Card Tilt — Tilt Transform on the Surface Frame, Perspective on an Ancestor

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-528

## Key Changes

Direct FOLLOW-UP fix to TASK-522 / TASK-524 (Composable Effects). Live use of the
block `tilt` effect surfaced the last un-co-located transform: with a glass surface
preset the whole CARD stayed FLAT while only the inner content tilted on hover — the
opposite of the reference "3D card". Root cause: TASK-524 co-located decoration/hover
onto the frame (co-located with `data-surface`) but left TILT as the SOLE inner effect
on a DESCENDANT node, because CSS `perspective` has to live on an ancestor of the
transformed node and 522/524 stamped `data-tilt-parent` on the frame itself (so the
transformed node had to be the frame's child). This change completes the co-location.
Fix is **present-only, jsonb-only** — **NO npm dependency** (`core/package.json`
unchanged), **NO DB migration / DDL**, **NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump**
(stays `2`), **NO model/schema/normalizer change, NO route/RBAC, NO control change**;
a block with no `tilt` normalizes AND renders **byte-identical** to post-524;
`prefers-reduced-motion` is unchanged (the tilt runtime keeps its own reduced-motion
early-return + `(pointer:fine)` gate).

- **Tilt transform moves to the FRAME (`core/services/pages/pageRendererV2.tsx`
  `splitBlockComposition`).** `data-block-tilt` is no longer routed to the inner
  wrapper: it stays on the FRAME co-located with `data-surface` (and the 524
  `translate:`-property anchor offset), so the WHOLE glass card tilts on hover. The
  `effectToInner` set is now empty for tilt; a new `tiltParent` flag (= the old
  `comp.perspectiveParent`) is returned from `splitBlockComposition` instead of stamping
  `data-tilt-parent` on the frame.
- **Perspective moves to an ANCESTOR wrapper (`renderPageBlockWithFrame`).** Because
  CSS `perspective` must sit on an ANCESTOR of the transformed node, the frame (custom
  `renderBlockFrame` path AND the default `PageBlockFrame` path) is now wrapped by a
  present-only `withTiltParent` helper: `<div data-tilt-parent style="perspective:1200px">`
  ONLY when the block authors tilt (`s.tiltParent`); otherwise the frame renders
  byte-identically (no extra wrapper). The runtime `[data-block-tilt]` binding in
  `pageEffectsRuntime.ts` (untouched) writes `el.style.transform` on the frame and reads
  its `.cx-glare` child, both of which still resolve correctly on the frame.
- **Anchor composition preserved.** The anchor self-offset already uses the independent
  CSS `translate:` property (TASK-524-01), a separate composited channel from
  `transform`, so the tilt `transform` on the frame composes with the anchor offset
  without clobbering it. KNOWN rare untested combo: a block with BOTH `tilt` AND a
  transform-writing decoration (`float`/`drift`/`pulse`/`orbit`) would contend on the
  frame `transform` — the reference never combines them (chips float, the card tilts).
- **Tests (`tests/vitest/pages/page-renderer-v2.test.tsx`).** The three owned
  flip-signature tilt placement assertions (generic tilt+glare, `finding 4` anchor+tilt,
  522-04-L02 tilt "strong") are rebaselined to the new correct placement
  (`data-block-tilt` on the FRAME; `data-tilt-parent` NOT on the frame — now an ancestor
  wrapper present in the HTML). A NEW test asserts the OWNER BUG is closed:
  `surfacePreset:"glass" + tilt:"strong"` renders both `data-surface="glass"` and
  `data-block-tilt="strong"` on the SAME node
  (`/data-surface="glass"[^>]*data-block-tilt="strong"/`), with the perspective wrapper
  present as an ancestor. Declared rebaselines, not drift, not weakened assertions.
- **Security.** No new attacker-influenceable surface: no new field/markup/URL/
  interpolation. `perspective:1200px` is a static literal; `data-tilt-parent` is a
  static presence flag; tilt strength is the already-validated `pageTiltStrengths` enum.
  Reject-unknown fail-closed is unchanged (no schema touched).
- **Docs:** `PAGE_MODEL.md` — the `tilt` field note and the composition-splitting note
  now state the tilt transform rides the surface FRAME while `perspective` sits on the
  ancestor `[data-tilt-parent]` wrapper.
- **Gates:** all green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `tsc -p tsconfig.json --noEmit`, `bun run test:vitest` (changed
  `tests/vitest/pages/page-renderer-v2.test.tsx` 133/133 + broad `tests/vitest/pages/`
  546/546), `bun run test:bun`, `gates:coderso` (5/5). The LIVE ≥5-per-area light+dark
  Playwright smoke (glass card tilts as a whole; tilt+glass+anchor combo; hover-lift vs
  tilt; reduced-motion; no-effect byte-identity) is run by the orchestrator post-merge
  (the dev host serves the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- Live ≥5-scenario-per-area Playwright smoke deferred to the orchestrator post-merge
  against the MAIN dev host.
- The rare tilt + transform-decoration same-block combo (both contend on the frame
  `transform`) is intentionally not combined by the reference and remains untested.
