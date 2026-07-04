# 1217 - TASK-508 Menu Nesting Forms & Flyout Fix

**Date:** 2026-07-03
**Version:** Unreleased
**Tasks:** TASK-508, TASK-508-01, TASK-508-02, TASK-508-03, TASK-508-04, TASK-508-05
**Type:** Admin UI/Content (Menus)/Navigation/Page Builder/Site Front/Responsive/QA/Docs/Task Board

## Overview

TASK-508 closes three owner-reported gaps on the shipped Menu Design tab, all on the
SAME architecture family as TASK-504/505/506/507 — the menuDocumentV2 document
contract + doc-scoped CSS via the ONE shared `buildMenuRuleSetsForDocument` (front
`@media` + canvas flatten never diverge) + the `MenuDesignEditor` control surface.
**Schema-first + reject-unknown, present-only emission, per-device Pages cascade
(tablet + mobile each inherit DESKTOP, never each other). NO new
route/RBAC/endpoint/migration; the document rides the existing validated
`PATCH /menus/:id` write path (`menus.settings` freeform jsonb); NO `menuDocumentV2`
`schemaVersion` bump (stays 1).** Byte-identity invariants preserved:
`buildSiteShellCss(null)` untouched (ZERO-line diff on both `siteShellCss.ts` and its
test) and a no-override menu doc still emits byte-identical CSS on BOTH builders.

## Key Changes

### R1 — Dropdown-container default hints + link centering

- **R1(a) — corrected container default hints (`core/services/menus/menuDocumentV2.ts`).**
  The base sheet always paints `.site-nav-sublist{min-width:180px;padding:6px}`
  (`siteShellCss.ts`), but the right-panel hints read `undefined`. `resolveNavKeyThemeDefault`
  now returns the REAL effective base-sheet defaults —
  `minWidth ⇒ {value:180,"Default 180px"}`, `containerPaddingX/Y ⇒ {value:6,"Default 6px"}`
  — and `containerPaddingX/containerPaddingY` were removed from
  `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS` so they hit the new branches instead of
  "Not applied". The level-0 pill controls (`navPillRadius`/`navPillPaddingX`/`navPillPaddingY`)
  STAY gated (the pill genuinely has no base-sheet default). New mirror consts
  `MENU_SHELL_SUBLIST_MIN_WIDTH=180` / `MENU_SHELL_SUBLIST_PADDING=6` — mirrored into
  the model, NOT into `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`, so
  `buildSiteShellCss(null)` stays trivially byte-identical. **Hint/thumb-only** — CSS
  emission (`levelContainerDecls`, present-only gated on the STORED value, `?? 0`
  padding completion unchanged) is untouched.
- **R1(b) — per-level `linkAlign` (`NavLevelStyle.linkAlign: left|center|right`).**
  Emits `text-align` on the dropdown link (rides `LEVEL_LINK_SELECTORS[lvl]`); because
  `.site-nav-link` is `display:block` filling the `min-width:180px` container,
  `text-align:center` centers the label — the owner's "auto-padding to center" request.
  Present-only, per-device (rides `NAV_LEVEL_STYLE_COMPARE_KEYS` + the mobile `linkOnly`
  split), levels 1/2. A per-level `seg` control lands in `NavLevelControls`.

### R2 — Flyout animation ACTUALLY animates (confirmed BUG fix)

- **`flyoutAnimRule` rewritten (`core/site/menuDocumentCss.ts`).** The 506 reveal
  layered `opacity`/`transform` over a `display:none→grid` cascade swap bridged with
  `transition-behavior:allow-discrete` + `@starting-style` — cosmetically inert (a
  `display:none` box has no layout to interpolate; close never animated). REPLACED with
  a robust **visibility + opacity + transform** reveal: at REST the sublist is
  `display:grid;visibility:hidden;opacity:0` (+`transform:translateY(-6px)` for slide) on
  the NON-`:hover` sublist selectors; SHOWN on `:hover`/`:focus-within` it is
  `visibility:visible;opacity:1;transform:none`; `transition:opacity ${dur}ms[,transform
  ${dur}ms],visibility 0s linear ${dur}ms` (the delayed `visibility` keeps the element
  visible + interactive through the fade/slide-out, so CLOSE animates too). All
  `@starting-style`/`allow-discrete`/`display`-in-transition bytes are GONE. `visibility:hidden`
  = exact reachability parity with `display:none` (non-focusable, non-clickable,
  a11y-hidden) ⇒ the zero-JS hover/focus-within reachability is preserved; the
  `display:none→grid` toggle (`navNestingRules`) is byte-unchanged. Present-only: an
  unset/`"none"` `flyoutAnimation` early-returns `[]` ⇒ byte-identical.
  `previewForceOpenLevel` now emits `display:grid;visibility:visible;opacity:1;transform:none`
  on BOTH the (0,4,0) level-1 and anchored (0,5,0) level-2 selectors so the authoring
  canvas force-open reveals the flyout.

### R3 — Nesting forms (owner chose BOTH)

- **R3a — unified `submenuDirection` (`NavChromeStyle.submenuDirection: right|down|up|left`).**
  ONE nav-global control that applies CONSISTENTLY across ALL nested depths (level-1
  first dropdown AND level-2/3+). Emitted as TWO rules in `desktopShared` reading
  `baseNavChrome` — rule A on the precise first-dropdown selector (0,4,0), rule B on the
  anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` — each resetting ALL FOUR offsets
  (`down⇒left:0;top:100%;right:auto;bottom:auto`, `up⇒left:0;bottom:100%;top:auto;right:auto`,
  `right⇒left:100%;top:0;right:auto;bottom:auto`, `left⇒right:100%;top:0;left:auto;bottom:auto`)
  to avoid a double-anchor stretch. "Down" everywhere ⇒ ONE cohesive downward column.
  Emitted BEFORE `submenuPlacementRule` so a granular level-2 `submenuPlacement` still
  WINS by source order (coexistence preserved). ≥640-only; unset ⇒ ZERO bytes ⇒
  `dropdownDirection` + per-level `submenuPlacement` behave EXACTLY as pre-508.
- **R3b — accordion mode (`NavChromeStyle.submenuMode: flyout|accordion`).** Accordion
  renders sublists IN-FLOW (`position:static;box-shadow:none;border:0;min-width:0`),
  indented (`padding-left:16px`), under a vertical top bar
  (`flex-direction:column;align-items:stretch`) — one cohesive downward block that
  pushes siblings/content DOWN, revealed via the SAME untouched `display:none→grid`
  hover/focus-within toggle (zero-JS reachable). Flyout is the default + present-only: a
  flyout-mode doc emits ZERO accordion bytes. Accordion gates the R2 flyout reveal OFF
  (no `visibility:hidden` over static content).

**navChrome home for `submenuDirection` + `submenuMode`** (both nav-global, **base-only**
structural keys — NOT added to `NAV_CHROME_COMPARE_KEYS`, emitted only from
`baseNavChrome`; a tablet override would be dead data). This keeps `MenuAppearance`
untouched ⇒ `buildSiteShellCss(null)` trivially byte-identical. `linkAlign` (per-level,
per-device) rides `NAV_LEVEL_STYLE_COMPARE_KEYS`. The R1(a) fix is **hint-only** (the
`?? 0` padding completion left unchanged for byte discipline). Every new field
(`linkAlign`, `submenuDirection`, `submenuMode`) joins its reject-unknown allowlist
(`NAV_LEVEL_STYLE_KEYS` / `NAV_CHROME_KEYS`) + exactly one value partition
(`NAV_LINK_ALIGNS` / `SUBMENU_DIRECTIONS` / `SUBMENU_MODES`) + a `NAV_CHROME_DEFAULTS`
hint entry. `core/site/siteShell.tsx` needed ZERO changes (the recursive nav markup
already supports every new field).

## Testing

Full menu regression matrix green together:

- **Vitest (Bun-free) — 361/361** across `tests/vitest/services/menu-document-v2.test.ts`
  (per-key fail-closed READ-trap round-trips for `linkAlign`/`submenuDirection`/`submenuMode`;
  reject-unknown KEY throws `MenuDocumentError`+path; fail-soft bad-enum VALUE omit;
  whole-doc-degrade blast radius; R1(a) provider table `{180,"Default 180px"}` /
  `{6,"Default 6px"}` + navPill* stay gated; per-device linkAlign sparse/prune),
  `tests/vitest/site/menu-document-css.test.ts` (R1(b) `text-align`; R2 rest/shown
  visibility/opacity keyframe STATES + NO `@starting-style`/`allow-discrete`; **R3a all
  four directions × both depths with all-four-offset resets** + precedence vs
  `submenuPlacement`; R3b accordion static/vertical/indent + R2-gated-off; base-only
  guard; per-device linkAlign delta; front↔canvas parity),
  `tests/vitest/ui/menu-design-editor.test.tsx` (R1(a) hint+thumb 180/6, R1(b) linkAlign
  seg per-level+per-device, R3a/R3b nav-global controls, no setState-in-effect),
  `tests/vitest/services/normalize-menu-appearance.test.ts` (MenuAppearance surface
  UNCHANGED), `tests/vitest/site/siteShell.test.tsx` (front resolver, ZERO new markup).
- **Bun — route + render/byte-identity green:** `tests/integration/routes/menus.test.ts`
  (**20/20** — new 508 round-trip persists `linkAlign` + `submenuDirection` +
  `submenuMode` + per-device linkAlign deltas verbatim without dropping appearance/extras;
  reject-unknown 400 `menu_document_invalid` with `path` for a per-level key AND a
  navChrome key, store untouched), `tests/unit/site/menu-document-render.test.tsx` +
  `tests/unit/pages/siteShellCss.test.ts` (**61/61** — no-override byte-identity on both
  CSS builders, R2 rest/shown selectors, direction/accordion emission, front markup
  unchanged, `buildSiteShellCss(null)` ZERO-line diff).
- Gates: `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `bunx tsc -p tsconfig.json --noEmit` (typechecks `tests/**`) all green.

## Guards & invariants (asserted)

1. Per-key fail-closed READ-trap round-trip for EVERY new allowlist key
   (`linkAlign`, `submenuDirection`, `submenuMode`); whole-doc blast radius asserted.
2. `buildSiteShellCss(null)` byte-identical — `siteShellCss.ts` + `siteShellCss.test.ts`
   ZERO-line diff (180/6 consts MIRRORED into the model, not `MenuAppearance`).
3. No-override docs byte-identical on both `buildMenuDocumentCss` +
   `buildMenuDocumentPreviewCss`; present-only zero-byte emission.
4. R2 asserts the visibility/opacity keyframe STATES (rest `visibility:hidden;opacity:0`,
   shown `visibility:visible;opacity:1`, `visibility 0s linear` close delay) + NO
   `@starting-style`/`allow-discrete`; `display:none→grid` toggle byte-unchanged.
5. R3a all-four-offset reset per direction + anchored (0,5,0) level-2 specificity intact;
   emitted before `submenuPlacementRule` (per-level override wins).
6. R3b `position:static` + vertical stack + indent + zero-JS reachability; accordion +
   `flyoutAnimation` mutually exclusive in emission.
7. ONE shared builder (front `@media` + canvas flatten never diverge); R2/R3a/R3b
   structural rules ≥640-only, `linkAlign` all-width + mobile `linkOnly`.
8. Per-device cascade for `linkAlign` (mobile ≠ tablet); `submenuDirection`/`submenuMode`
   base-only (a tablet override emits ZERO delta bytes).
9. R1(a) hint/thumb 180/6 (never `range.min`); navPill* stay gated.
10. Kept ALL 504/505/506/507 behavior intact; NO `schemaVersion` bump; NO
    route/RBAC/endpoint/migration.

## Deferred residuals (honest)

JS-driven flyout edge-collision / edge-flip; click-to-open (vs hover/focus-within);
mega-menu multi-column layout; mobile-drawer styling (drawer not front-rendered yet);
per-level (not nav-global) `submenuDirection`/`submenuMode`; level-0 top-bar link
centering (not requested).
