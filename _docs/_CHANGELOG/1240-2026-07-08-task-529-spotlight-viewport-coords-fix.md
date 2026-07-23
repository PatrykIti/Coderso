# 1240 - TASK-529 Cursor Spotlight Follows the Pointer After Scrolling (Viewport-Coord Fix)

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-529

## Key Changes

Direct FOLLOW-UP bug fix to the per-page cursor spotlight (introduced in TASK-521,
exposed by TASK-523's screen-blend `z-30` overlay). Fixed **present-only, source-only**
— **NO npm dependency** (`core/package.json` unchanged), **NO DB migration / DDL**,
**NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump**, **NO route/RBAC**. Spotlight-off pages emit
byte-identically (present-only unchanged); the `prefers-reduced-motion: reduce` and
`(pointer:fine)` gates are untouched; the rAF batching and present-only emit are unchanged.

- **Owner bug (confirmed on live DOM).** After scrolling to the third section the cursor
  spotlight glow "fell to the bottom" and stopped following the mouse. At `scrollY=577`,
  a `mousemove(640,500)` set `--spotlight-y="1077px"` (= `500 + 577`).
- **Root cause (`core/services/pages/pageEffectsRuntime.ts`, spotlight handler).** The
  handler read `var r=sp.getBoundingClientRect()` where `sp = [data-page-spotlight]` is
  the ROOT/main element (full page height; after scrolling `r.top = -scrollY`) and then
  computed `sx=ev.clientX-r.left; sy=ev.clientY-r.top`. Subtracting the NEGATIVE root
  `r.top` ADDED `scrollY`, producing PAGE coordinates. But those vars feed the
  `[data-page-spotlight-overlay]` element, which is `position:fixed inset:0` (viewport
  `0..innerHeight`), so its `radial-gradient` at `y=1077` painted BELOW the visible
  viewport → glow off-screen. Latent since 521 (invisible while the overlay sat at `z-0`
  behind opaque sections); TASK-523's screen-blend `z-30` overlay exposed it.
- **Fix.** Use pure VIEWPORT coords: `sx=Math.round(ev.clientX); sy=Math.round(ev.clientY);`
  and remove the now-unused `var r=sp.getBoundingClientRect()`. `clientX/clientY` are
  already viewport-relative and are exactly what a `position:fixed` overlay's gradient
  needs — the glow now tracks the pointer at any scroll depth.
- **Tests.**
  - `tests/vitest/content/cursorSpotlight.test.tsx` — added a behavioral test that mocks
    the root rect `top:-577` (page scrolled 577px) and a `pointermove(640,500)`, asserting
    `--spotlight-x/y === clientX/clientY` (viewport: `640px`/`500px`) and explicitly NOT the
    pre-fix `1077px` page coordinate.
  - `tests/vitest/pages/pageEffectsRuntime.test.ts` — added a static-source assertion that
    the spotlight handler uses raw `ev.clientX/ev.clientY`, no longer subtracts the root
    rect (`ev.clientX-r.left` / `ev.clientY-r.top` absent), and reads NO
    `sp.getBoundingClientRect()` inside the pointermove handler.
- **Security.** No new attacker-influenceable surface: the change only drops a rect read
  and uses the browser-supplied `clientX/clientY`. No new markup, URL, interpolation,
  route, or RBAC. The runtime source stays a STATIC literal (no `${` interpolation, no
  `eval`/`Function`/`innerHTML` sink) — existing static-source invariants still assert.
- **Gates:** all green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `tsc -p tsconfig.json --noEmit`, and the changed Vitest files
  (`tests/vitest/content/cursorSpotlight.test.tsx` +
  `tests/vitest/pages/pageEffectsRuntime.test.ts`, 22/22 pass). The LIVE
  ≥5-scenario-per-area light+dark Playwright smoke (scroll to sections 1..N, glow tracks
  pointer at each scroll depth; reduced-motion off; coarse-pointer off; spotlight-off
  byte-identity) is run by the orchestrator post-merge (the dev host serves the MAIN tree,
  not this worktree).

## Open follow-ups (explicit, not dropped)

- Live ≥5-scenario-per-area Playwright smoke (glow tracks the pointer after scrolling to
  the 2nd/3rd/Nth section; reduced-motion no-op; coarse-pointer no-op; spotlight-off
  byte-identity) deferred to the orchestrator post-merge against the MAIN dev host.
