# TASK-519-04-L02: MenuAppearancePanel Alpha Rollout Verification

# FileName: TASK-519-04-L02-MenuAppearancePanel-Verify.md

**Parent Subtask:** TASK-519-04
**Priority:** High
**Category:** Admin UI / Menus / Verification
**Estimated Effort:** Small
**Dependencies:** 519-02 (upgraded `ColorSwatchControl`).
**Status:** ✅ Done

---

## Single-writer file

**Owns `core/admin/ui/menus/MenuAppearancePanel.tsx` for this leaf** — edited ONLY if a
suppression fix is required (expected: no edit; verification-only).

## Verify

`grep -an "ColorSwatchControl" core/admin/ui/menus/MenuAppearancePanel.tsx` → for each
usage confirm the `onChange` persists the raw string, no 6-digit-only re-normalize, and
`allowCustom`/`allowTransparent` unaffected. LIVE: author `#0812209e` and
`rgba(8,17,31,.84)` on the appearance-panel color controls → preview shows the alpha →
save → reopen → round-trips.

## Expected result

No code change — colors persist through `normalizeMenuColorValue`
(`normalizeMenuAppearance.ts:152-165`), which accepts alpha. If a usage strips alpha,
apply the minimal additive fix here and document it.

## Regression test

Covered by the parent Playwright smoke + the `menu-color-alpha.test.tsx` normalize
assertion (519-04-L01). No unowned test edits.

## Security

No route/RBAC/schema/migration. Menu write/render boundary unchanged.
