# TASK-519-04-L01: MenuDesignEditor Alpha Rollout Verification

# FileName: TASK-519-04-L01-MenuDesignEditor-Verify.md

**Parent Subtask:** TASK-519-04
**Priority:** High
**Category:** Admin UI / Menus / Verification
**Estimated Effort:** Small
**Dependencies:** 519-02 (upgraded `ColorSwatchControl`).
**Status:** ✅ Done

---

## Single-writer file

**Owns `core/admin/ui/menus/MenuDesignEditor.tsx` for the duration of this leaf** —
edited ONLY if a suppression fix is required (expected: no edit; verification-only).

## Usages to verify (grounded line list — VERIFIED)

`grep -an "ColorSwatchControl" core/admin/ui/menus/MenuDesignEditor.tsx` → import `:134`
plus **9 literal `<ColorSwatchControl>` JSX sites**: `:990`, `:1000`, `:1383`, `:1526`,
`:1924`, `:2193`, `:2207`, `:2221`, `:2236`. NOTE `:1622` is a `swatch(…)` HELPER call
(NOT a literal site). Many menu colors instead route through the `swatch()` wrapper
(`const swatch = (key, label) => (<ColorSwatchControl …/>)` at `:1525`, called ~8× at
`:1582/1586/1588/1592/1620/1622/1678/1701`); verifying the wrapper once covers all of
those, so the direct sites + the `swatch()` helper together are the full surface. For each
(both the 9 direct sites and the `swatch()` helper):

1. Read the props: confirm `onChange` stores the raw string (menu appearance) and does
   NOT re-run a 6-digit-only normalize; confirm `allowCustom` is not `false` where alpha
   authoring is intended; `allowTransparent`/palette unaffected.
2. LIVE (menu designer, e.g. bar surface color / border / link colors / brand colors):
   author `#0812209e` via base picker + opacity slider → swatch preview shows
   semi-transparent → save (PATCH menu doc) → reopen → value round-trips exactly
   (`#0812209e`, slider ≈ 62).
3. `rgba(8,17,31,.84)` typed into the text field persists + round-trips.

## Expected result

No code change — `normalizeMenuColorValue` already accepts these formats
(`normalizeMenuAppearance.ts:152-165`). If any single usage strips alpha, apply the
minimal additive fix in this file and document it here.

## Regression test

`tests/vitest/ui/menu-color-alpha.test.tsx` (NEW, owned by THIS leaf if a UI test is
warranted): assert `normalizeMenuColorValue("#0812209e") === "#0812209e"` and
`normalizeMenuColorValue("rgba(8,17,31,.84)") === "rgba(8,17,31,.84)"` (import from
`core/services/menus/normalizeMenuAppearance`). Live round-trip covered by the parent
Playwright smoke (scenario 1). Do NOT edit the unowned `menu-design-editor.test.tsx`.

## Security

No route/RBAC/schema/migration. Menu write/render boundary unchanged.
