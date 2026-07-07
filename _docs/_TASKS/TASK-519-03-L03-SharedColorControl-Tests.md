# TASK-519-03-L03: SharedColorControl + ClearableFields Alpha Tests

# FileName: TASK-519-03-L03-SharedColorControl-Tests.md

**Parent Subtask:** TASK-519-03
**Priority:** High
**Category:** Tests (Vitest admin/UI + pure)
**Estimated Effort:** Small
**Dependencies:** 519-03-L01, 519-03-L02.
**Status:** ✅ Done

---

## Single-writer files

**Creates & solely owns:**
- `tests/vitest/ui/clearable-fields-alpha.test.tsx` (NEW) — helper unit tests.
- `tests/vitest/ui/shared-color-alpha.test.tsx` (NEW) — component render tests.

**Also owns (re-baseline of EXISTING files — alpha-behavior assertions ONLY):**
- `tests/vitest/ui/clearable-fields.test.tsx` — the 2 alpha assertions below.
- `tests/vitest/ui/shared-color-control.test.tsx` — the 2 alpha assertions below.

This leaf is the SINGLE authorized writer of the 4 legacy assertions that assert the OLD
alpha-dropping behavior, which becomes wrong once L01 makes rgba-with-alpha
picker-representable + canonicalized. This is an INTENDED contract change (per AGENTS.md,
re-baselining a test to a NEW intended contract is permitted — this is NOT weakening; each
assertion moves to the exact new correct value, keeping the same assertion count). Edit
ONLY these 4 assertions (and their enclosing test titles/comments that describe the old
behavior); do not touch any other assertion in either file. No other leaf/subtask writes
these two files (single-writer holds).

Re-baseline exactly (alpha-behavior assertions only):
- `clearable-fields.test.tsx:102` — `resolveColorPickerValue("rgba(17, 34, 51, 0.4)", "#ffffff")`
  → was `"#ffffff"` (fallback); NEW `"#112233"` (extracted base color, alpha handled by slider).
- `clearable-fields.test.tsx:109` — `isPickerRepresentableColorValue("rgba(17, 34, 51, 0.4)")`
  → was `false`; NEW `true`. (Update the two enclosing test titles at :99 and :106 that say
  "falls back for rgba" / "without alpha" to describe the new alpha-representable behavior.)
- `shared-color-control.test.tsx:239-241` — `describeSharedColorControlState({ value: "rgba(10, 20, 30, 0.4)" }).kind`
  → was `"saved_custom"`; NEW `"selected_swatch"`.
- `shared-color-control.test.tsx:314` (test "rgba text keeps fallback swatch preview…" at :296)
  — the swatch `input[aria-label="Overlay swatch"]` `.value` → was `"#102030"` (pickerFallback);
  NEW `"#0a141e"` (extracted base of `rgba(10, 20, 30, 0.4)`). The text field (:315) still reads
  the raw `"rgba(10, 20, 30, 0.4)"` and Clear (:317-320) still fires — leave those unchanged;
  rename the test title to reflect that the swatch now previews the real base color.

Both NEW files are Vitest admin/UI lane (`vitest`; component render via `createRoot` from
`react-dom/client` — NOT `@testing-library/react`, which is NOT a repo dependency; all
`tests/vitest/ui/` tests render via `createRoot`, mirror
`page-editor-control-primitives.test.tsx`). Import specifiers are RELATIVE
(`vitest.config.ts:6` aliases `@` → `core/admin` only, so `@/admin/...` resolves to
`core/admin/admin/...` and is wrong).

## `clearable-fields-alpha.test.tsx` (helpers)

```ts
import { resolveColorPickerValue, resolveColorSwatchValue, isHexColorValue,
  isPickerRepresentableColorValue, applySharedColorPickerChange, applySharedColorAlphaChange }
  from "../../../core/admin/ui/widgets/editors/ClearableFields";
```

- `resolveColorPickerValue("#0812209e", "#000000") === "#081220"`.
- `resolveColorPickerValue("rgba(8,17,31,.84)", "#000000") === "#08111f"`.
- `resolveColorPickerValue("var(--color-brand)", "#ffffff") === "#ffffff"` (fallback).
- `isHexColorValue("#0812209e") === true`; `isHexColorValue("#abcd") === true`.
- `isPickerRepresentableColorValue("rgba(8,17,31,.84)") === true`;
  `isPickerRepresentableColorValue("var(--color-x)") === false`.
- `applySharedColorPickerChange` preserves alpha: `currentValue:"#0812209e",
  nextValue:"#112233"` → `onChange("#1122339e")`.
- `applySharedColorPickerChange` opaque passthrough: current `#0d6efd`, next `#112233`
  → `onChange("#112233")`.
- `applySharedColorAlphaChange`: `currentValue:"#081220", alphaPct:50` → `onChange("#08122080")`.

## `shared-color-alpha.test.tsx` (component)

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { SharedColorControl } from "../../../core/admin/ui/widgets/editors/SharedColorControl";
// mount via createRoot/act; query via container.querySelector; "type"/"slider"/"click" =
// set .value + dispatchEvent(new Event("input"|"change",{bubbles:true})) / .click() in act().
```

- **HI-1 round-trip (showValueInput=TRUE):** `value="#0812209e"` with `showValueInput`
  → the picker `<input type=color>` value === `#081220`; the visible preview reflects the
  real color; the **opacity slider** ≈ 62. (The slider renders ONLY in this mode; do NOT
  also assert `data-shared-color-state`/"Selected color" here — those render only when
  `showValueInput=false`.)
- **HI-1 true-swatch state (showValueInput=FALSE):** `value="#0812209e"`, `showValueInput={false}`
  → `data-shared-color-state` === `"selected_swatch"` AND the state label reads "Selected
  color". (This mode does NOT render the opacity slider — separate render case from the
  round-trip assertion above so a single render isn't asked to show both.)
- **HI-2 slider authoring:** slider → 50 on `value="#081220"` → `onChange("#08122080")`.
- **HI-2 base edit keeps alpha:** picker change to `#112233` on `value="#0812209e"` →
  `onChange("#1122339e")`.
- **type rgba (canonicalized):** value Input change to the owner's leading-dot
  `rgba(8,17,31,.84)` → `onChange("rgba(8,17,31,0.84)")` (emit canonicalized via
  `normalizeAdminColorValue` so the render boundary accepts it — raw `.84` is dropped by
  `resolveClearableCssColorValue`; see 519-01).
- **HI-3 transparent:** `allowTransparent`, `showValueInput={false}`, click "Use transparent"
  → `onChange("transparent")`.
- **HI-3 token:** `value="var(--color-brand)"` → `data-shared-color-state` === `"theme_token"`;
  `ColorTokenHint` present; opacity slider hidden/disabled.
- **HI-3 clear:** with `onClear`, click Clear header button → `onClear` fires.

## Notes

Assert exact emitted strings. Run named files (glob flakes). After L01+L02+this land,
run root `tsc -p tsconfig.json --noEmit` (tests outside `core/`) AND `bun --cwd core
lint:types`.
