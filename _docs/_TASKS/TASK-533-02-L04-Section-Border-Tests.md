# TASK-533-02-L04: Tests — Per-Edge Section Border (model, render, controls)

# FileName: TASK-533-02-L04-Section-Border-Tests.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-02
**Priority:** High
**Category:** Testing / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Vitest coverage for all 533-02 additions: model normalize/round-trip/reject-unknown/
present-only/clamp/bad-color-dropped, render emit (per-edge `border*` declarations,
`border-block` = top+bottom only), and control presence. Model/render are Bun-free ⇒
**Vitest**.

## Grounded anchors (RE-GREP at implement time)

- **`tests/vitest/pages/page-document-v2.test.ts`** — section-style normalize/
  round-trip suite (grep `normalizeSectionStyle` / `PageDocumentError`).
- **`tests/vitest/pages/page-renderer-v2.test.tsx`** — `toPageSectionStyle` coverage
  (grep `toPageSectionStyle`).

## Test cases

```ts
// ── page-document-v2.test.ts (model) ──
it("section border round-trips per-edge present-only", () => {
  const s = normSectionStyle({ border: { top: { color: "#ffffff33", width: 1 },
                                          bottom: { color: "#ffffff33", width: 1 } } });
  expect(s.border?.top).toEqual({ color: "#ffffff33", width: 1, style: "solid" });
  expect(s.border?.bottom?.width).toBe(1);
  expect("left" in (s.border ?? {})).toBe(false);        // border-block: no left/right
  expect("border" in normSectionStyle({})).toBe(false);  // present-only whole-object omit
});
it("clamps width and drops a bad color", () => {
  expect(normSectionStyle({ border: { top: { width: 99 } } }).border?.top?.width).toBe(16);
  const bad = normSectionStyle({ border: { top: { color: "javascript:alert(1)", width: 1 } } });
  expect(bad.border?.top?.color).toBeUndefined();        // sanitized away; width kept
});
it("omits an all-empty border object entirely", () => {
  expect("border" in normSectionStyle({ border: { top: {}, bottom: {} } })).toBe(false);
});
it("rejects unknown border edge / prop keys", () => {
  expect(() => normSectionStyle({ border: { middle: { width: 1 } } })).toThrow(PageDocumentError);
  expect(() => normSectionStyle({ border: { top: { widthX: 1 } } })).toThrow(PageDocumentError);
});

// ── page-renderer-v2.test.tsx (render) ──
it("emits per-edge border on the section box (border-block = top+bottom only)", () => {
  const st = toPageSectionStyle(makeSection({ style: { border:
    { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } } } }));
  expect(st.borderTopWidth).toBe("1px");
  expect(st.borderBottomWidth).toBe("1px");
  expect("borderLeftWidth" in st).toBe(false);
  expect("borderRightWidth" in st).toBe(false);
});
it("emits nothing when border unset (byte-identical)", () => {
  const st = toPageSectionStyle(makeSection({}));
  expect(Object.keys(st).some(k => k.startsWith("border"))).toBe(false);
});

// ── control presence ──
it("registers 12 per-edge section border controls", () => {
  const ids = pageUniversalSectionControls.map(c => c.id);
  for (const side of ["top","right","bottom","left"])
    for (const prop of ["color","width","style"])
      expect(ids).toContain(`section.style.border.${side}.${prop}`);
});
```

## Security note

Test-only leaf. The bad-color-dropped + reject-unknown cases pin that no
author-controlled raw value persists or emits into the section border CSS.

## Regression / breaking-test ownership

No prior assertion weakened. A control-count snapshot delta (if any) is the only owned
update (declared). All non-533 tests pass unchanged.

## Hard Invariants

1. Cover: round-trip, reject-unknown (edge + prop), present-only (unset + all-empty),
   clamp, bad-color-dropped, `border-block` emit (top+bottom only), byte-identity when
   unset, control presence.
2. Vitest lane (Bun-free domain/render).
