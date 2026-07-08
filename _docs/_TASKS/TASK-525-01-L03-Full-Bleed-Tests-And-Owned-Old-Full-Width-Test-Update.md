# TASK-525-01-L03: Full-Bleed Render Tests + Owned Old Full-Width Width-Test Rebaseline

# FileName: TASK-525-01-L03-Full-Bleed-Tests-And-Owned-Old-Full-Width-Test-Update.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-01
**Priority:** High
**Category:** Site Render / Testing
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Add vitest coverage for the 525-01 full-bleed decouple AND rebaseline the OLD
full-width width assertion that 525-01-L01 makes wrong. All in
`tests/vitest/pages/page-renderer-v2.test.tsx` (plus the section-style round-trip
lane in `page-document-v2.test.ts` IF 525-01-L02's `fullBleed` flag was taken).

## Grounded anchors (RE-GREP at implement time)

- **`tests/vitest/pages/page-renderer-v2.test.tsx`** — existing coverage for
  `toPageSectionStyle` / `toPageSectionRenderProps` / `PageSectionContent` /
  `PageSectionRender`. Grep for `"full-width"` + `maxWidth` (and `"none"`) to find
  the assertions that today expect a full-width section's content style
  `maxWidth:"none"` — THOSE are the owned rebaseline. Grounding found **exactly
  two** such assertions, BOTH owned here:
  1. `expect(toPageSectionRenderProps(ctaFullWidth).style.maxWidth).toBe("none")`
     (~`:256`, inside the CTA-variant test).
  2. `expect(fullWidthProps.style.maxWidth).toBe("none")` (~`:794`, in the test
     `full-width section variants remove the outer section gutter so backgrounds
     fill the band`).
  Both go RED after 525-01-L01 caps content at `${section.layout.maxWidth}px`;
  both are rebaselined to `.toBe("1120px")` (or the section's `maxWidth`) plus the
  full-bleed-bg-on-section assertion.
  - **PRESERVE the correct siblings** in the `:794` test — under option A
    (bleed lives on the OUTER `<section>` box) these stay TRUE and must NOT be
    deleted: `sectionClassName === "w-full"` (~`:792`), the rendered
    `<section class="w-full">` (~`:795`), and the negative `not "w-full px-4 py-6"`
    (~`:797`). Only the `maxWidth:"none"` line is rebaselined.
- Render seams under test (post-523): `toPageSectionStyle` (`pageRendererV2.tsx:376`,
  `maxWidth` at `:404`), the section content-wrapper structure in
  `toPageSectionRenderProps` / `PageSectionContent` (`:2560`).

## Test cases

```ts
// tests/vitest/pages/page-renderer-v2.test.tsx

// (1) REBASELINE — owned breaking-test change. OLD: full-width content maxWidth === "none".
//     NEW: content is capped at section.layout.maxWidth (centered), bg full-bleed.
it("full-width section caps content at layout.maxWidth (bg full-bleed)", () => {
  const section = makeSection({ variant: "full-width", layout: { maxWidth: 1120 } });
  const style = toPageSectionStyle(section);
  expect(style.maxWidth).toBe("1120px");        // was "none" — REBASELINED
  expect(style.margin).toBe("0 auto");          // content centered
  // and assert the full-bleed lives on the section/outer element (class or style),
  // NOT on the content maxWidth (query the rendered <section> / renderProps.sectionClassName).
});

// (2) full-bleed STRUCTURE — bg edge-to-edge, content in a centered capped wrapper.
it("full-width section renders a centered max-width content wrapper inside a full-bleed section box", () => {
  const { container } = renderSection({ variant: "full-width", layout: { maxWidth: 1120 } });
  const sectionEl = container.querySelector("[data-page-section]");
  // full-bleed marker/utility on the outer section box (per 525-01-L01's chosen mechanism)
  // content node capped at maxWidth + margin:auto (independent of the bleed element)
  const contentEl = container.querySelector("[data-page-section-content]"); // pageSectionContentDataAttributes
  expect(contentEl).toHaveStyle({ maxWidth: "1120px", margin: "0 auto" });
});

// (3) NON-full-width BYTE-IDENTITY — default/centered variant unchanged post-523.
it("non-full-width section content is byte-identical (no new wrapper/attribute)", () => {
  const style = toPageSectionStyle(makeSection({ variant: "default", layout: { maxWidth: 960 } }));
  expect(style.maxWidth).toBe("960px");   // unchanged
  // assert the rendered DOM node count/shape matches the pre-525 single-content-div contract
  // (snapshot or explicit structural assert — no extra wrapper for the non-bleed case).
});

// (4) maxWidth is honored independently of bleed (varying maxWidth moves the cap, bg stays full).
it("changing layout.maxWidth moves the content cap while bg stays full-bleed", () => {
  for (const mw of [640, 960, 1440]) {
    expect(toPageSectionStyle(makeSection({ variant: "full-width", layout: { maxWidth: mw } })).maxWidth)
      .toBe(`${mw}px`);
  }
});

// (5) IF 525-01-L02 flag taken — fullBleed on a NON-full-width section bleeds bg, caps content.
//     round-trip/reject-unknown/present-only in page-document-v2.test.ts + a render assert here.
```

## Security note

Test-only leaf. Assert that the emitted `maxWidth`/`margin`/bleed values are the
expected FIXED literals + the already-clamped `section.layout.maxWidth` — reinforces
that no author-controlled value reaches the content-wrapper CSS.

## Regression / breaking-test ownership

- **This leaf OWNS the full-width width-assertion rebaseline — BOTH
  `maxWidth:"none"` assertions** (the CTA-variant one at ~`:256` and the
  gutter/backgrounds-fill-the-band one at ~`:794`). Each OLD `maxWidth:"none"`
  expectation is DELETED/updated to the new capped value — a DECLARED
  breaking-test change (525-01-L01 made the old behavior wrong), NOT a weakened or
  removed assertion (the new assertion is STRONGER: it pins both the content cap
  AND the bg full-bleed on separate elements).
- In the `:794` test, the sibling `w-full` assertions (`:792`/`:795`/`:797`) are
  CORRECT under option A and are PRESERVED, not deleted — only `maxWidth:"none"`
  is rebaselined.
- All other renderer tests (non-full-width) pass unchanged (byte-identity).

## Hard Invariants

1. BOTH old `full-width` `maxWidth:"none"` assertions (~`:256` CTA-variant and
   ~`:794` gutter test) are rebaselined to the new capped-content + full-bleed-bg
   contract (documented owned change); the `:794` `w-full` siblings are preserved.
2. Non-full-width render stays byte-identical (explicit test).
3. New tests assert VISIBLE structure (content maxWidth + margin on the content
   node; full-bleed on the section box), not just the style helper return.
