# TASK-529: Cursor Spotlight Follows the Pointer After Scrolling (Viewport-Coord Fix)

# FileName: TASK-529_Cursor_Spotlight_Viewport_Coord_Fix.md

**Priority:** High
**Category:** Site Render / Content (Pages) / Bug Fix / Accessibility (reduced-motion, pointer:fine) / Security
**Estimated Effort:** Small
**Dependencies:** TASK-521, TASK-523 (direct follow-up bug fix)

**Status:** ✅ Done
**Completed:** 2026-07-08
**Closure changelog:** 1240 (`_docs/_CHANGELOG/1240-2026-07-08-task-529-spotlight-viewport-coords-fix.md`)

---

## Historical reconstruction notice

This board parent was reconstructed by TASK-545-04-L02 from physical evidence
only: the board row in `_docs/_TASKS/README.md`, changelog 1240, the
`_docs/_workflows/task-529-full.mjs` workflow script, and the implementing
commits `7c5a0c1d` (fix) plus merge `b50d574f`, both dated 2026-07-08. It is a
historical evidence summary of an already-shipped task, not a new execution
contract. **No physical children or leaves were authored historically for
TASK-529, and none are created here.** No retroactive implementation pseudocode,
acceptance promises, or validation/smoke claims beyond the recorded evidence are
added.

## Shipped behavior (from changelog 1240 and commit diff)

Direct follow-up bug fix to the per-page cursor spotlight (introduced in
TASK-521, exposed by TASK-523's screen-blend `z-30` overlay). Owner bug
(confirmed on live DOM): after scrolling to the third section the spotlight glow
"fell to the bottom" and stopped following the mouse; at `scrollY=577` a
`mousemove(640,500)` set `--spotlight-y="1077px"` (= `500 + 577`).

- **Root cause (`core/services/pages/pageEffectsRuntime.ts` spotlight handler):**
  the handler read `var r=sp.getBoundingClientRect()` where `sp =
  [data-page-spotlight]` is the ROOT/main element (full page height; after
  scrolling `r.top = -scrollY`) and computed `sx=ev.clientX-r.left;
  sy=ev.clientY-r.top`. Subtracting the NEGATIVE root `r.top` ADDED `scrollY`,
  producing PAGE coordinates. Those vars feed the
  `[data-page-spotlight-overlay]` element, which is `position:fixed inset:0`
  (viewport `0..innerHeight`), so its `radial-gradient` at `y=1077` painted
  BELOW the visible viewport (glow off-screen). Latent since 521; TASK-523's
  screen-blend `z-30` overlay exposed it.
- **Fix:** use pure VIEWPORT coords — `sx=Math.round(ev.clientX);
  sy=Math.round(ev.clientY);` — and remove the now-unused
  `var r=sp.getBoundingClientRect()`. `clientX/clientY` are already
  viewport-relative and exactly what a `position:fixed` overlay's gradient
  needs; the glow tracks the pointer at any scroll depth. The rAF batching, the
  `prefers-reduced-motion: reduce` gate, and the `(pointer:fine)` gate are
  unchanged.

## Compatibility, security, and validation facts (evidenced)

- **Present-only, source-only:** NO npm dependency, NO DB migration/DDL, NO
  `PAGE_DOCUMENT_SCHEMA_VERSION` bump, NO route/RBAC. Spotlight-off pages emit
  byte-identically; present-only emit unchanged.
- **Security:** no new attacker-influenceable surface. The change only drops a
  rect read and uses the browser-supplied `clientX/clientY`; no new markup, URL,
  interpolation, route, or RBAC. The runtime source stays a STATIC literal (no
  `${` interpolation, no `eval`/`Function`/`innerHTML` sink), and existing
  static-source invariants still assert that.
- **Tests:** `tests/vitest/content/cursorSpotlight.test.tsx` gained a behavioral
  test mocking the root rect `top:-577` (page scrolled 577px) plus
  `pointermove(640,500)`, asserting `--spotlight-x/y === clientX/clientY`
  (viewport `640px`/`500px`) and explicitly NOT the pre-fix `1077px`.
  `tests/vitest/pages/pageEffectsRuntime.test.ts` gained a static-source
  assertion that the handler uses raw `ev.clientX/ev.clientY`, no longer
  subtracts the root rect (`ev.clientX-r.left` / `ev.clientY-r.top` absent), and
  reads NO `sp.getBoundingClientRect()` inside the pointermove handler.
- **Validation recorded in changelog 1240:** core lint, core lint:types, root
  `tsc -p tsconfig.json --noEmit`, and the changed Vitest files
  (`cursorSpotlight.test.tsx` + `pageEffectsRuntime.test.ts`, 22/22 pass). The
  LIVE ≥5-scenario-per-area light+dark Playwright smoke (glow tracks the pointer
  after scrolling; reduced-motion off; coarse-pointer off; spotlight-off
  byte-identity) was deferred to the orchestrator post-merge and is not claimed
  as run here.
- **Docs:** `_docs/DESIGN_TOKENS.md` updated to document the spotlight CSS
  variables as viewport coordinates.
