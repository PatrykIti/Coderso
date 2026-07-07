# TASK-519-04: Menu Rollout Verification (MenuDesignEditor + MenuAppearancePanel)

# FileName: TASK-519-04-Menu-Rollout-Verification.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Admin UI / Menus / Verification
**Estimated Effort:** Small
**Dependencies:** 519-02 (upgraded `ColorSwatchControl`). No route/RBAC/schema/migration change.
**Status:** ⏳ To Do

---

## Scope (verification-first; single-writer where a fix is needed)

The `ColorSwatchControl` usages in `MenuDesignEditor.tsx` + `MenuAppearancePanel.tsx`
inherit alpha authoring AUTOMATICALLY from the 519-02 upgrade (they consume the shared
control). **Enumeration (VERIFIED `grep -an "ColorSwatchControl"`):** import at `:134`,
plus **9 literal `<ColorSwatchControl>` JSX sites** at `:990, :1000, :1383, :1526, :1924,
:2193, :2207, :2221, :2236`. (`:1622` is a `swatch(…)` HELPER call, NOT a literal site.)
In addition, many menu colors route through the `swatch()` wrapper (`const swatch = …` at
`:1525`, called ~8× at `:1582, :1586, :1588, :1592, :1620, :1622, :1678, :1701`), which
itself renders a `<ColorSwatchControl>` — so the alpha upgrade propagates to all of those
via that ONE helper, plus the 9 direct sites. This
subtask VERIFIES that every menu color authored with alpha (`#0812209e`, `rgba(8,17,31,.84)`)
persists schema-valid and round-trips — and makes a surgical additive fix ONLY if a
usage suppresses alpha (e.g. passes `allowCustom={false}`, a hex-only prop, or an
`onChange` that re-narrows the value).

**Leaves:**

| Leaf | Owns (only if a fix is needed) | Purpose |
|------|--------------------------------|---------|
| 519-04-L01 | `core/admin/ui/menus/MenuDesignEditor.tsx` | verify 9 direct sites + `swatch()`-wrapper usages; surgical additive fix only if suppressed |
| 519-04-L02 | `core/admin/ui/menus/MenuAppearancePanel.tsx` | verify usages; surgical additive fix only if suppressed |

**Land order:** after 519-02; L01/L02 independent.

## Schema-validity (verified fact)

Menu colors persist through `normalizeMenuColorValue`
(`core/services/menus/normalizeMenuAppearance.ts:182` → `MENU_APPEARANCE_COLOR_PATTERN`
:152-165), which ALREADY accepts 3/4/6/8-digit hex, `rgb[a]()` (incl. leading-dot
`.06`), `hsl[a]()`, `var(--color-*)`, `transparent`. So an authored `#0812209e` /
`rgba(8,17,31,.84)` is schema-valid with **NO schema widening** — this is the expected
result for all 10 usages + the appearance panel. Any usage found NOT round-tripping is a
UI suppression bug (fix in that leaf), not a schema gap.

## Security

No route/RBAC/schema/migration. Alpha values flow through the same
`normalizeMenuColorValue` write boundary (unchanged) and `resolveClearableCssColorValue`
render boundary (menu render in `core/site/siteShell.tsx`). No new surface.

## Per-usage verification procedure (both leaves)

For each `ColorSwatchControl` usage:
1. `grep -an "ColorSwatchControl" <file>` (rg reads large TSX as binary — use `grep -an`
   / `Read`), list the props at each site.
2. Confirm none passes `allowCustom={false}` where custom alpha is wanted, nor an
   `onChange` that strips/reformats the value (e.g. re-runs a 6-digit-only normalize).
3. LIVE: open the menu designer, author `#0812209e` on that control → confirm the swatch
   preview shows the semi-transparent color and the value persists (PATCH menu doc →
   reopen → slider + text still `#0812209e`).
4. If suppressed, apply the MINIMAL additive fix in that owned file (e.g. drop a
   redundant hex-only wrapper) and note it.

## Tests

Add a round-trip assertion in the menu test lane proving an alpha menu color survives
the menu-document normalize unchanged. Prefer the existing menu appearance
normalize test (`tests/vitest` menu appearance lane) with an added case
`normalizeMenuColorValue("#0812209e") === "#0812209e"` and
`normalizeMenuColorValue("rgba(8,17,31,.84)") === "rgba(8,17,31,.84)"` — but that test
file is not owned by this subtask; if it would violate single-writer, add the assertion
inside the 519-06 closure test file instead, or a NEW
`tests/vitest/ui/menu-color-alpha.test.tsx` owned by 519-04-L01. UI-render round-trip
belongs to the Playwright smoke (parent Acceptance scenario 1).

## Acceptance

All 9 direct `MenuDesignEditor` `<ColorSwatchControl>` sites + the `swatch()`-wrapper
usages + `MenuAppearancePanel` author + round-trip alpha (live-verified); no schema
widening required (or the one exception named); gates green.
