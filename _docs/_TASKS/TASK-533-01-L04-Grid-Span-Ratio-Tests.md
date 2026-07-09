# TASK-533-01-L04: Tests — Grid Span + Asymmetric Ratio (model, sanitizer, render, controls)

# FileName: TASK-533-01-L04-Grid-Span-Ratio-Tests.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-01
**Priority:** High
**Category:** Testing / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Vitest coverage for all 533-01 additions: model normalize/round-trip/reject-unknown/
present-only/clamp, the `sanitizeAuthoringGridTemplate` allowlist (accept + reject),
the render emit (span on frame, `columnTemplate` inline grid), and control presence.
Model/render/sanitizer are Bun-free ⇒ **Vitest** (per Testing Architecture Rules).

## Grounded anchors (RE-GREP at implement time)

- **`tests/vitest/pages/page-document-v2.test.ts`** — the block-style + section-style
  normalize/round-trip/reject-unknown suite (grep `normalizeBlockStyle` /
  `normalizeSectionStyle` / `PageDocumentError` usage).
- **`tests/vitest/pages/page-renderer-v2.test.tsx`** — `toPageBlockRenderProps` /
  `toPageSectionRenderProps` coverage (grep `toPageBlockRenderProps` /
  `toPageSectionRenderProps`).
- **Sanitizer test** — reuse the existing `pageAuthoringSanitizers` test file if one
  exists (grep `tests/vitest/pages/` for `sanitizeAuthoringCss`); else add
  `sanitizeAuthoringGridTemplate` cases beside the color/background sanitizer tests.

## Test cases

```ts
// ── page-document-v2.test.ts (model) ──
it("block colSpan/rowSpan round-trip present-only + clamp", () => {
  expect(normBlockStyle({ rowSpan: 2 }).rowSpan).toBe(2);
  expect(normBlockStyle({ rowSpan: 99 }).rowSpan).toBe(4);   // clamp max
  expect(normBlockStyle({ colSpan: 0 }).colSpan).toBe(1);    // clamp min
  expect("colSpan" in normBlockStyle({})).toBe(false);       // present-only
});
it("section columnTemplate round-trips a sanitizer-valid ratio, omits an invalid one", () => {
  expect(normSectionStyle({ columnTemplate: "1.15fr .85fr" }).columnTemplate).toBe("1.15fr .85fr");
  expect("columnTemplate" in normSectionStyle({ columnTemplate: "1fr;}x{}" })).toBe(false); // rejected⇒omit
  expect("columnTemplate" in normSectionStyle({})).toBe(false);                              // present-only
});
it("rejects unknown block/section style keys", () => {
  expect(() => normBlockStyle({ colSpanX: 2 })).toThrow(PageDocumentError);
  expect(() => normSectionStyle({ columnTemplateX: "1fr" })).toThrow(PageDocumentError);
});
it("no-span/no-columnTemplate doc is byte-identical to post-530", () => {
  // normalize a fixture with no 533 fields → deep-equal the pre-533 baseline JSON
});

// ── sanitizer unit test ──
it("sanitizeAuthoringGridTemplate accepts the restricted grammar", () => {
  for (const ok of ["1fr 1fr", "1.15fr .85fr", "1fr 1.2fr", "minmax(0,1fr) minmax(420px,.9fr)", "auto 1fr"])
    expect(sanitizeAuthoringGridTemplate(ok)).toBe(ok.replace(/\s+/g, " "));
});
it("sanitizeAuthoringGridTemplate rejects injection / out-of-grammar", () => {
  for (const bad of ["1fr;}body{display:none}", "url(evil)", "expression(alert(1))",
                     "repeat(999,1fr)", "<b>", "calc(100% - 10px)", "1fr @import", "", "  ",
                     "a".repeat(300), 42, null])
    expect(sanitizeAuthoringGridTemplate(bad as unknown)).toBeNull();
});

// ── page-renderer-v2.test.tsx (render) ──
it("emits gridRow/gridColumn span on the block frame present-only", () => {
  expect(toPageBlockRenderProps(makeBlock({ style: { rowSpan: 2 } })).style.gridRow).toBe("span 2");
  expect(toPageBlockRenderProps(makeBlock({ style: { colSpan: 2 } })).style.gridColumn).toBe("span 2");
  const bare = toPageBlockRenderProps(makeBlock({})).style;
  expect("gridRow" in bare).toBe(false);
  expect("gridColumn" in bare).toBe(false);
});
it("emits inline gridTemplateColumns overriding the symmetric grid class", () => {
  const s = toPageSectionRenderProps(makeSection({ style: { columnTemplate: "1.15fr .85fr" } }));
  expect(s.style.gridTemplateColumns).toBe("1.15fr .85fr");
  expect("gridTemplateColumns" in toPageSectionRenderProps(makeSection({})).style).toBe(false);
});

// ── control presence ──
it("registers block colSpan/rowSpan + section columnTemplate controls", () => {
  const ids = [...pageUniversalBlockControls, ...pageUniversalSectionControls].map(c => c.id);
  expect(ids).toEqual(expect.arrayContaining(
    ["block.style.colSpan", "block.style.rowSpan", "section.style.columnTemplate"]));
});
```

## Security note

Test-only leaf. The reject cases in `sanitizeAuthoringGridTemplate` are the primary
security assertion — they pin that no injection/out-of-grammar string round-trips into
`gridTemplateColumns`. Also assert the model omits a rejected `columnTemplate`
(present-only fail-soft), so a tampered payload cannot persist a raw grid string.

## Regression / breaking-test ownership

No prior assertion is weakened. If a control-count snapshot exists, its delta is the
only owned update (declared). All non-533 tests pass unchanged.

## Hard Invariants

1. Cover: round-trip, reject-unknown, present-only, clamp, sanitizer accept+reject,
   render emit (span + inline grid), control presence.
2. Sanitizer reject cases include `;`, `url(`, `expression(`, `repeat(999,…)`, HTML,
   `calc(`, over-length, non-string.
3. Byte-identity test: no-533-field doc deep-equals the pre-533 baseline.
4. Vitest lane (Bun-free domain/render).
