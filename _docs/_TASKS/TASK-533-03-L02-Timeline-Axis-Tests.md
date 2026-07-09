# TASK-533-03-L02: Tests — Timeline Axis + Owned Structural Rebaseline

# FileName: TASK-533-03-L02-Timeline-Axis-Tests.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-03
**Priority:** High
**Category:** Testing
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Vitest coverage for the 533-03-L01 timeline axis: assert the vertical axis renders
(present, tinted, non-zero), the dots + existing hooks are retained, and the
horizontal variant is not regressed. Own any structural rebaseline of an existing
axis-less timeline assertion. Render-only ⇒ **Vitest** (Bun-free).

## Grounded anchors (RE-GREP at implement time)

- **`tests/vitest/pages/page-renderer-v2.test.tsx`** — grep `timeline` /
  `data-page-timeline` for existing timeline coverage BEFORE writing (to find any
  shape/count assertion the added axis node changes).
- **Illustrative-helper note:** the `renderSection(...)` / `makeTimelineSection(...)` /
  `container.querySelector(...)` calls in the "Test cases" pseudocode below are
  SHORTHAND — this file has NO such helpers. Map them to the file's REAL helpers at
  implement time: construct via `createPageSectionV2("timeline", {...})` +
  `createPageBlockV2(...)` (imported top-of-file); render via
  `renderToStaticMarkup(<PageSectionRender section={...} />)` (or `PageSectionContent`)
  from `react-dom/server`, then assert on the returned markup string with
  `.toContain(...)` (this file asserts against static markup / `toPageSectionRenderProps`
  props, NOT a live DOM — there is no `container`/`querySelector`). Grep the in-file
  `renderToStaticMarkup` + `createPageSectionV2` usages to copy the exact pattern.

## Test cases

```ts
// NOTE: renderSection/makeTimelineSection/container.querySelector below are SHORTHAND —
// see the illustrative-helper note above. Real: createPageSectionV2/createPageBlockV2 +
// renderToStaticMarkup(<PageSectionRender .../>) then assert on the markup string.

// (1) axis present + tinted + dots retained (vertical variant)
it("native timeline renders a vertical axis connecting the dots", () => {
  const { container } = renderSection(makeTimelineSection({ variant: "vertical", blocks: 3 }));
  const items = container.querySelectorAll("[data-page-timeline-item]");
  expect(items.length).toBe(3);
  for (const item of items) {
    const axis = item.querySelector("[data-page-timeline-axis-line]");
    expect(axis).not.toBeNull();
    expect((axis as HTMLElement).style.background).toMatch(/coderso-section-accent|linear-gradient/);
    expect(item.querySelector("[data-page-timeline-marker]")).not.toBeNull();  // dot retained
    expect(item.querySelector("[data-page-timeline-content]")).not.toBeNull(); // content retained
  }
});

// (2) horizontal variant not regressed (still renders items/markers, no crash)
it("timeline horizontal variant still renders", () => {
  const { container } = renderSection(makeTimelineSection({ variant: "horizontal", blocks: 3 }));
  expect(container.querySelectorAll("[data-page-timeline-item]").length).toBe(3);
  expect(container.querySelectorAll("[data-page-timeline-marker]").length).toBe(3);
});

// (3) OWNED rebaseline (only if an old axis-less shape/count assertion exists):
//     update it to the new node shape (axis added). Preserve the marker/content
//     assertions — this is a DECLARED structural update, NOT a weakened assertion.
```

## Security note

Test-only leaf. Assert the axis `background` is the fixed `--coderso-section-accent`
gradient literal (not an author string), reinforcing that no author-controlled value
reaches the timeline CSS.

## Regression / breaking-test ownership

- This leaf OWNS any rebaseline of an existing timeline structural/count assertion
  that the added axis node changes (declared — additive DOM, not drift). The
  `data-page-timeline-marker`/`content` assertions are PRESERVED, not deleted; only a
  shape/count line the axis affects is updated.
- All non-timeline renderer tests pass unchanged.

## Hard Invariants

1. Assert VISIBLE axis (present + non-empty tinted `background`), not mere marker
   presence; dots + content hooks retained; horizontal variant not regressed.
2. Any old axis-less assertion rebaselined explicitly (documented owned change).
3. Vitest lane (Bun-free render).
