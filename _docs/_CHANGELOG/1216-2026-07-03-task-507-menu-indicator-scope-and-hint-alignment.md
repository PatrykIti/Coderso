# 1216 - TASK-507 Menu Indicator Scope & Hint Alignment

**Date:** 2026-07-03
**Version:** Unreleased
**Tasks:** TASK-507
**Type:** Site Front/Admin UI/Content (Menus)/Navigation/Responsive/QA/Docs/Task Board

## Overview

TASK-507 resolves the **two LOW post-audit residuals** left open by TASK-506
(Menu Modern Styling) on already-shipped `feature/visual` code. Both are surgical
fixes on the SAME architecture family as TASK-504/505/506 — the ONE shared
`buildMenuRuleSetsForDocument` doc-scoped CSS builder and the `MenuDesignEditor`
control surface. **No new field, no schema/route/RBAC/migration change, no
`menuDocumentV2` `schemaVersion` bump.** Byte-identity invariants preserved
(`buildSiteShellCss(null)` untouched; a no-override menu doc still emits
byte-identical CSS).

## Key Changes

### FIX A — B2 indicator cascade-leak + stale-transform (`core/site/menuDocumentCss.ts`)

**Resolves TASK-506 post-audit LOW residual #1 — indicator cascade-leak.**

- **A1 — level-0 B2 chrome scoped to a TOP-BAR-ONLY selector.** The level-0
  `navChrome` indicator `::before` bar and the hover-lift/hover-underline extras
  are now routed through a new `TOP_BAR_LINK_SELECTOR`
  (`${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link`) instead of
  the cascade-root `.site-nav-link` (which matches links at ALL depths). Enabling
  `indicator`/`hoverLift`/`hoverUnderline` at level 0 no longer leaks the bar/lift
  onto every level-1/2 dropdown link. The intentional TASK-504 cascade
  (`linkColor`/`fontSize`/hover-background + the `indicatorLinkDecls` `transition`
  + `position:relative` anchor) is untouched — it stays cascade-root by design;
  only the NEW B2 chrome is scoped. Levels 1 & 2 keep emitting on their own
  `LEVEL_LINK_SELECTORS`. `collectChromeDeltaRules` calls the SAME `navChromeRules`,
  so per-device (tablet/mobile) chrome deltas inherit the fix for free.
- **A2 — every indicator rest-block resets BOTH axes.** Each
  `indicatorAndHoverRules` rest-block now declares both `transform` and `opacity`:
  the grow rest-block adds `opacity:1` (alongside `transform:scaleX(0)`), the
  non-grow rest-block adds `transform:none` (alongside `opacity:0`). A deeper
  non-grow indicator (e.g. level 2 reached by the descendant-anchored level-1
  selector) can no longer inherit a stale `scaleX(0)` from a shallower grow rule
  and stay invisible. Covers levels 0/1/2 at once (one shared helper).

### FIX B — ControlDefaultHint contract alignment (`core/admin/ui/menus/MenuDesignEditor.tsx`)

**Resolves TASK-506 post-audit LOW residual #2 — ControlDefaultHint alignment.**

- The `ControlDefaultHint` guard is now the 506-contract form
  `if (value === undefined) return null;` (was
  `if (value === undefined && sourceLabel === "Not set") return null;`). The gated
  present-only numerics (`indicatorThickness`, `itemDividerWidth`, `transitionMs`,
  `hoverLift`, `containerPaddingX/Y`, `navPillRadius`, `navPillPaddingX/Y`) that
  resolve to `{ value: undefined, sourceLabel: "Off"/"Not applied" }` now hide
  their hint — eliminating the mixed messaging where the range thumb sat at
  `range.min` while the hint text said "Off"/"Not applied" (a value the control
  was not actually applying).
- **Non-gated controls unregressed.** Controls with a real resolved default still
  render their hint because they return a defined `value` (`fontSize` →
  "Inherited from theme (16px)", padding keys → "Default Npx", cascade cases →
  "Inherited from desktop" / "Inherits level N (…)"). `menuDocumentV2.ts` is
  untouched — the resolver's now-cosmetically-dead `"Off"`/`"Not applied"` labels
  stay in place (still asserted by the model-provider unit tests).

## Testing

Targeted gate green together:

- `tests/vitest/site/menu-document-css.test.ts` + `tests/vitest/ui/menu-design-editor.test.tsx`
  — **102/102** vitest (no level-0 leak onto dropdown links; top-bar-only selector
  emitted; rest-block resets both axes at levels 0/1/2; per-device parity via
  `collectChromeDeltaRules`; gated-off numeric hides its hint; real resolved
  default still shows; no `(undefined)` ever).
- `tests/unit/site/menu-document-render.test.tsx` — **46/46** bun (no-override
  byte-identity + `buildSiteShellCss(null)` ZERO-line-diff pins retained).

## Guards & invariants (asserted)

1. `buildSiteShellCss(null)` byte-identical (base sheet untouched).
2. No-override menu docs byte-identical (present-only emission unchanged).
3. ONE shared builder — front `@media` + canvas flatten never diverge (per-device
   chrome delta inherits FIX A).
4. Intentional TASK-504 cascade (linkColor/fontSize/hover-background/transition +
   `position:relative`) left on the cascade-root `.site-nav-link` by design; only
   the NEW B2 chrome scoped.
5. NO `schemaVersion` bump; NO route/RBAC/endpoint/migration; `menuDocumentV2.ts`
   untouched.
