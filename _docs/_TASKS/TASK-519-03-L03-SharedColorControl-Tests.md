# TASK-519-03-L03: SharedColorControl + ClearableFields Alpha Tests

# FileName: TASK-519-03-L03-SharedColorControl-Tests.md

**Parent Subtask:** TASK-519-03
**Priority:** High
**Category:** Tests (Vitest admin/UI + pure)
**Estimated Effort:** Small
**Dependencies:** 519-03-L01, 519-03-L02.
**Status:** ⏳ To Do

---

## Single-writer files

**Creates & solely owns:**
- `tests/vitest/ui/clearable-fields-alpha.test.tsx` (NEW) — helper unit tests.
- `tests/vitest/ui/shared-color-alpha.test.tsx` (NEW) — component render tests.

Both Vitest admin/UI lane (`vitest`; component render via `createRoot` from
`react-dom/client` — NOT `@testing-library/react`, which is NOT a repo dependency; all
`tests/vitest/ui/` tests render via `createRoot`, mirror
`page-editor-control-primitives.test.tsx`). Import specifiers are RELATIVE
(`vitest.config.ts:6` aliases `@` → `core/admin` only, so `@/admin/...` resolves to
`core/admin/admin/...` and is wrong). The EXISTING `clearable-fields.test.tsx` /
`shared-color-control.test.tsx` are NOT owned here — do not edit them (single-writer); if
they assert legacy alpha-dropping, flag for their owner in 519-06 closure.

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
