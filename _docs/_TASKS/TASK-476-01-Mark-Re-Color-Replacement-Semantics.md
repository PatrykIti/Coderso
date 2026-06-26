# TASK-476-01: Mark Re-Color Replacement Semantics
# FileName: TASK-476-01-Mark-Re-Color-Replacement-Semantics.md

**Parent Task:** TASK-476
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-471-03 (per-fragment color marks)
**Status:** ✅ Done
**Completed:** 2026-06-26

---

## Overview

Fix `applyTextMark` so applying a **different** color/highlight (or link href) to
an already-marked selection **replaces** it in one click, while applying the
**same** value on the same range still toggles it off. Single function change in
`core/admin/ui/pages/PageEditor.tsx`. No schema/route/renderer change.

## Root cause (verified)

`applyTextMark` (`PageEditor.tsx:583-607`) computes `exactMatch` from
`type + from + to` only — it ignores the mark's value:

```ts
const exactMatch = existing.some(
  (entry) => entry.type === mark.type && entry.from === mark.from && entry.to === mark.to
);
...
if (exactMatch) return normalizeBlockTextMarks(text, retained); // toggle OFF
```

So re-coloring `Coderso` (blue, range 11–18) with orange (same range) sets
`exactMatch = true` (same type+range, color ignored) and takes the toggle-off
branch, removing the color. A second orange click then finds no mark
(`exactMatch = false`) and adds it. Reproduced from the owner's report.

## Implementation pseudocode

Make `exactMatch` value-aware so only an identical mark (incl. color/href)
toggles off; a different value falls through to the add path, where the existing
overlapping-same-type removal in `retained` replaces the old mark:

```ts
const isSameMarkValue = (entry: PageTextMark): boolean => {
  if (entry.type !== mark.type) return false;
  if (entry.type === "color" || entry.type === "highlight") return entry.color === mark.color;
  if (entry.type === "link") return entry.href === mark.href;
  return true; // bold / italic carry no value
};
const exactMatch = existing.some(
  (entry) => entry.from === mark.from && entry.to === mark.to && isSameMarkValue(entry)
);
```

Data flow after the fix, re-coloring the same range:
- same value → `exactMatch = true` → toggle off (unchanged behavior).
- different value → `exactMatch = false` → add path; `retained` drops the
  overlapping same-type mark (`entry.to <= mark.from || entry.from >= mark.to`
  is false for the identical range) and the new mark is appended → **replace**.

Bold/italic keep pure toggle (value-less → `isSameMarkValue` true on same range).

## Error handling / invariants preserved

- No throw paths added; `normalizeBlockTextMarks` still clamps/dedupes/caps.
- Color/href sanitization unchanged (values still validated on write/normalize).
- Non-overlapping marks of the same type on other ranges are untouched.

## Regression-test shape

Lane: **Vitest** (pure helper). Prefer testing `applyTextMark` directly if it is
exported, otherwise drive it through the existing `PageEditor`/document mark test
surface. Cases:
- Apply color A to range R → marks = [{color:A, R}].
- Apply color B to the same R → marks = [{color:B, R}] (replace, length 1), NOT
  empty.
- Apply color B again to R → marks = [] (same value toggles off).
- Bold on R, bold on R again → toggles off (unchanged).
- Color A on R, color A again on R → toggles off (unchanged).

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`
- `bunx vitest run` for the touched mark/document/PageEditor suites.
- Live smoke (real input): color a fragment, then re-color with a different swatch
  in one click → color replaces (after exiting edit); same swatch twice → clears.

## Security note

No routes/auth/schema. Mark values continue through the existing fail-closed
authoring sanitizers.
