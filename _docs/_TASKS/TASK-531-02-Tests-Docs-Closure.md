# TASK-531-02: Tests, Docs, Closure

# FileName: TASK-531-02-Tests-Docs-Closure.md

**Parent Task:** TASK-531
**Priority:** Medium
**Category:** Testing / Documentation
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Closure subtask. Owns TESTS + DOCS only — it must NOT re-open any source contract
(sanitizer / model / render / controls are owned by 531-01 and its leaves). Responsibilities:

1. Any final cross-cutting test files not already landed by 531-01-L04 (behavioral runtime
   is the ≥5-scenario Playwright smoke, not a Vitest suite).
2. The runtime SMOKE: ≥5 distinct real-flow scenarios per area on the live admin + front,
   light + dark, 0 console errors, screenshots to `_docs/_workflows/_smoke/`, measured
   side-by-side vs `_docs/projekty-domow-wow-site` (`.cta-card`, `.service-card`/`art-*`,
   hero `sun-ring`, colored glow shadows).
3. The changelog entry under the then-current next-free number (grep `_docs/_CHANGELOG/`
   highest+1; 1242 last used = TASK-530, so 531 takes 1243+ — do NOT hardcode a colliding
   number) and the board rows / task statuses.

Per the workflow rules, `_docs/_TASKS/README.md` row/statistics edits and the
`_docs/_CHANGELOG/*` file itself are the ORCHESTRATOR's to own — this subtask supplies the
closure content but does not race the orchestrator on those two files.

## Smoke scenario set (≥5 per area — assert VISIBLE effect, not control presence)

**Multi-layer background:**
1. Section with reference `.cta-card` two-layer (radial glow over linear) → computed
   `background-image` has TWO layers on front after publish.
2. Card block with two-layer `art-*`-style fill → two computed layers.
3. Full-bleed section with multi-layer gradient bleeds edge-to-edge (two layers on the
   bleed box).
4. Multi-layer + per-device override → tablet/mobile multi-layer background overrides paint
   BOTH layers at that breakpoint (the `pageResponsiveCss.ts` RAW `<style>` @media boundary —
   verify at tablet/mobile viewport widths on the front, computed `background-image` two
   layers inside the media query); a per-device SECTION `backgroundType:"gradient"` override
   paints (the new section responsive gradient branch).
5. Security negative (BOTH boundaries): pasting `linear-gradient(#fff,#000), url(//evil/beacon)`
   → NO paint at desktop OR tablet/mobile, NO external fetch (network panel clean at every
   viewport), value not stored; a per-device `@import`/over-cap override likewise emits no
   RAW `<style>` rule.

**Gradient block/section parity:**
1. Block `backgroundType:"gradient"` paints (already wired — regression).
2. Section `backgroundType:"gradient"` paints (new).
3. Switch gradient → color → image restores each paint.
4. Invalid gradient value → clean fallback, 0 console errors.
5. Button block single-`linear-gradient` fill (reference primary button proximity).

**Colored glow:**
1. Card `glow:{color:"rgba(142,232,255,.22)",blur:45,y:18}` → computed
   `box-shadow: 0px 18px 45px 0px rgba(142,232,255,.22)`.
2. Section glow paints on the section box.
3. Block with BOTH `shadow:"md"` AND `glow` → TWO-shadow computed `box-shadow`.
4. Per-device glow: a MOBILE-ONLY glow override (no enum shadow) → a mobile `box-shadow` at
   the mobile viewport (the `pageResponsiveCss.ts` responsive box-shadow branch composes it);
   reset → byte identity.
5. Security negative: `glow.color:"expression(alert(1))"` → glow omitted (no box-shadow) at
   write AND the editor client mutation guard drops it (finding #4); `glow.blur:9999` clamps
   to 120.

## Gates (all must be green before closure)

- root `tsc -p tsconfig.json --noEmit` (catches test excess-prop errors outside `core/`),
  `bun --cwd core lint:types`, `bun --cwd core lint`,
- targeted Vitest globs (`tests/vitest/pages/page-authoring-sanitizers.test.ts`,
  `page-renderer-v2.test.tsx`, `page-responsive-css.test.ts` (the SECOND render boundary),
  `page-editor-control-registry.test.ts` (glow controls + the `glow.color` client-guard
  assertion), the model round-trip suites),
- `bun test`, `gates:coderso`, and the Playwright smoke above.

## Security note

Closure re-verifies (via the landed sanitizer corpus + smoke security negatives) that the
one new attack surface — the relaxed multi-layer background — still rejects `url()` /
`javascript:` / `data:text/html` / `expression` / `@import` / over-cap, and that glow is a
structured spec (no raw string reaches CSS). No source contract is re-opened here.

## Hard Invariants

1. Closure owns tests + docs only; no source re-open.
2. Changelog = then-current next-free (grep highest+1; 1243+); do NOT hardcode a colliding
   number; do NOT edit `_TASKS/README.md` / `_CHANGELOG/*` (orchestrator owns those).
3. Smoke = ≥5 real-flow scenarios per area, VISIBLE-effect assertions, light + dark, 0
   console errors, side-by-side vs the prototype.
