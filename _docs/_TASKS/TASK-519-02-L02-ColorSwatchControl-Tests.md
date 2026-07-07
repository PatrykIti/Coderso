# TASK-519-02-L02: ColorSwatchControl Alpha Tests

# FileName: TASK-519-02-L02-ColorSwatchControl-Tests.md

**Parent Subtask:** TASK-519-02
**Priority:** High
**Category:** Tests (Vitest admin/UI)
**Estimated Effort:** Small
**Dependencies:** 519-02-L01 (renders the upgraded control).
**Status:** ⏳ To Do

---

## Single-writer file

**Creates & solely owns `tests/vitest/ui/color-swatch-alpha.test.tsx` (NEW).** Vitest
admin/UI lane, mirroring `tests/vitest/ui/page-editor-control-primitives.test.tsx`
EXACTLY: render via `createRoot` from `react-dom/client` (NOT `@testing-library/react` —
it is NOT a repo dependency and no `tests/vitest/ui/` test uses it; all ~192 render via
`createRoot`). Import specifiers are RELATIVE (`vitest.config.ts:6` aliases `@` →
`core/admin` only, so `@/admin/...` is wrong).

## Test matrix (execution-ready)

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { ColorSwatchControl } from "../../../core/admin/ui/pages/editorControls/ColorSwatchControl";

// mount/unmount + query helpers as in page-editor-control-primitives.test.tsx:
// const root = createRoot(container); act(() => root.render(<ColorSwatchControl .../>));
// then query via container.querySelector(...) and dispatch native events, e.g.
// input.value = "#112233"; input.dispatchEvent(new Event("input", { bubbles: true }));
```

- **HI-1 round-trip display:** mount `<ColorSwatchControl label="Bg" value="#0812209e" onChange={fn} allowTransparent />`
  via `createRoot`/`act`
  → hex text input value === `#0812209e`; the `data-page-editor-color-picker` input value === `#081220`;
  the opacity slider reads ≈ 62 (`0x9e/255*100`). (Below, "type"/"change"/"click" = set
  `input.value` then `dispatchEvent(new Event("input"|"change"|"blur", {bubbles:true}))` /
  `button.click()` inside `act()`, per the sibling test — NO `fireEvent`/`screen`.)
- **HI-2 author alpha via slider:** with `value="#081220"`, change the opacity slider to 50 →
  `onChange` called once with `#08122080`.
- **HI-2 base edit keeps alpha:** with `value="#0812209e"`, set the color picker input's
  `.value = "#112233"` + `dispatchEvent(new Event("input", {bubbles:true}))` (per the sibling
  test — NOT `fireEvent`) → `onChange` with `#1122339e`.
- **type rgba accepted + canonicalized:** type the owner's leading-dot `rgba(8,17,31,.84)`
  into hex field, blur → `onChange("rgba(8,17,31,0.84)")` (emit is canonicalized via
  `normalizeAdminColorValue` so the render boundary accepts it; a raw `.84` emit would be
  dropped by `resolveClearableCssColorValue` — see 519-01).
- **type hex8 accepted:** type `#0a0f1acc`, Enter → `onChange("#0a0f1acc")`.
- **reject-unknown reverts:** type `url(x)`, blur → `onChange` NOT called; input value reverts to prior.
- **HI-3 transparent preserved:** click the `data-page-editor-color-swatch="transparent"` button → `onChange(null)`.
- **HI-3 palette preserved:** click a palette swatch → `onChange` with that swatch's opaque value.
- **HI-3 token display:** `value="var(--color-brand)"` → hex field shows the raw token; opacity slider is disabled; a token hint is present.

## Notes

- Assert exact emitted strings (load-bearing for HI-1/HI-2).
- Run the file directly (vitest glob flakes). After L01+this land, also run root
  `tsc -p tsconfig.json --noEmit` (tests live outside `core/`).
