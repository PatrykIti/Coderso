# TASK-519-01-L02: Color-Value Helper Unit Tests

# FileName: TASK-519-01-L02-Color-Value-Tests.md

**Parent Subtask:** TASK-519-01
**Priority:** High
**Category:** Tests (Vitest pure) / Security (whitelist parity)
**Estimated Effort:** Small
**Dependencies:** 519-01-L01 (imports `colorValue.ts` by exact export name).
**Status:** ⏳ To Do

---

## Single-writer file

**Creates & solely owns `tests/vitest/ui/color-value.test.ts` (NEW).** Vitest pure
lane (`_docs/TESTING_STRATEGY.md`): imports `{ describe, expect, test } from
"vitest"`; no DB, no `Bun.serve`.

## Test matrix (execution-ready)

```ts
import { describe, expect, test } from "vitest";
import {
  parseColorValue, composeHexColor, colorAlpha, pickerHexFor,
  isAlphaPickerRepresentable, normalizeAdminColorValue,
} from "../../../core/admin/ui/shared/colorValue";
import { resolveClearableCssColorValue } from "../../../core/widgets/core/clearableStyle";
```

> Import specifiers (VERIFIED): `vitest.config.ts:6` aliases `@` → `core/admin` ONLY, so
> `@/admin/...` would resolve to `core/admin/admin/...` (wrong) and `@/widgets/...` is
> unreachable (the widgets module lives OUTSIDE `core/admin`). Use RELATIVE paths, exactly
> like the sibling `tests/vitest/ui/page-editor-control-primitives.test.tsx`
> (`../../../core/admin/ui/...` and `../../../core/...`).

- **parse hex8:** `parseColorValue("#0812209e")` → `{ kind:"hex", baseHex:"#081220" }`; `colorAlpha` ≈ `0x9e/255` (`0.62`, use `toBeCloseTo`).
- **parse hex4 shorthand:** `parseColorValue("#abcd")` → `baseHex:"#aabbcc"`, alpha ≈ `0xdd/255`.
- **parse hex6 opaque:** `parseColorValue("#0d6efd")` → alpha === 1.
- **parse rgba:** `parseColorValue("rgba(8,17,31,.84)")` → `{ kind:"rgb", baseHex:"#08111f", alpha:0.84 }` (toBeCloseTo).
- **parse rgb (no alpha):** `parseColorValue("rgb(8,17,31)")` → alpha === 1.
- **compose drops opaque suffix:** `composeHexColor("#081220", 1)` === `"#081220"`.
- **compose emits alpha:** `composeHexColor("#081220", 0.62)` matches `/^#081220[0-9a-f]{2}$/` and length 9.
- **compose clamp:** `composeHexColor("#081220", 2)` === `"#081220"`; `composeHexColor("#081220", -1)` === `"#08122000"`; `composeHexColor("#081220", NaN)` === `"#081220"`.
- **HI-1 idempotence (round-trip):** for `v` in `["#0812209e","#08122000","#0d6efd"]`, `composeHexColor(parseColorValue(v).baseHex!, colorAlpha(parseColorValue(v)))` === `v.toLowerCase()`.
- **pickerHexFor fallback:** `pickerHexFor(parseColorValue("var(--color-brand)"), "#ffffff")` === `"#ffffff"`; `pickerHexFor(parseColorValue("#0812209e"))` === `"#081220"`.
- **keyword/token:** `parseColorValue("transparent").kind === "keyword"`; `parseColorValue("var(--color-brand)").kind === "token"`; `parseColorValue("hsla(210,60%,8%,.84)").kind === "token"`.
- **isAlphaPickerRepresentable:** true for `#0812209e` & `rgba(8,17,31,.84)`; false for `var(--color-x)`, `transparent`, `""`, `undefined`.
- **Security — canonical whitelist parity (mandatory):** for `good` in `["#0812209e","#abcd","rgba(8,17,31,.84)","hsla(210,60%,8%,.84)","var(--color-brand)","transparent","#0d6efd"]`: `const out = normalizeAdminColorValue(good)` is defined AND `resolveClearableCssColorValue(out)` is defined (helper's CANONICAL emit ⊆ render boundary — assert `out`, not `good`).
- **Security — leading-dot canonicalization (mandatory):** `normalizeAdminColorValue("rgba(8,17,31,.84)") === "rgba(8,17,31,0.84)"`; `normalizeAdminColorValue("hsla(210,60%,8%,.06)") === "hsla(210,60%,8%,0.06)"`; and prove WHY it is required — `resolveClearableCssColorValue("rgba(8,17,31,.84)")` is `undefined` (render rejects leading-dot) while `resolveClearableCssColorValue("rgba(8,17,31,0.84)")` is defined.
- **Security — injection reject:** `normalizeAdminColorValue` returns `undefined` for `"url(x)"`, `"expression(alert(1))"`, `"javascript:alert(1)"`, `"#fff;}<script>"`, `"rgb(0,0,0);}"`.

## Notes

- Full vitest globs have spurious timeout flakes — run this named file directly
  (`bun --cwd core lint:types` does NOT cover tests, so also root `tsc` after the
  control prop changes land in 519-02/03).
- No production code in this leaf; it only asserts 519-01-L01's exports.
