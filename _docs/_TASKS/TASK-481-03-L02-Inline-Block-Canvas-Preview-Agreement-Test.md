# TASK-481-03-L02: Inline + Block + In-Canvas Preview Agreement Test

# FileName: TASK-481-03-L02-Inline-Block-Canvas-Preview-Agreement-Test.md

**Parent Subtask:** TASK-481-03
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-03-L01
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (pinned; create only at TASK-481 closure)

---

## Overview

**Goal:** Pin the unification invariant: for a given brand token, the inline-toolbar
swatch preview, the block-level control swatch preview, and the in-canvas resolved
brand value all agree (no preview/apply or inline/block mismatch). This is the
acceptance test for "Inline and block-level brand swatch previews agree with each
other and with the in-canvas render" from the umbrella success criteria.

**Owning module(s) to create-or-extend:**
- `tests/vitest/ui/shared-color-control.test.tsx` (extend the existing suite).

**Source-of-truth docs:**
- `_docs/DESIGN_TOKENS.md`, `_docs/PAGE_MODEL.md`.

**Out-of-scope:** Real-browser colour resolution (Playwright smoke is TASK-481-04-L01);
neutral tokens (this leaf asserts brand agreement).

## Security Contract

Not a route/auth/data leaf — N/A (test-only). No endpoint/auth/RBAC/CSRF/rate-limit
surface; no validation-owner change; no secrets/PII.

## Implementation Pseudocode

```tsx
// tests/vitest/ui/shared-color-control.test.tsx
describe("brand swatch preview agreement (TASK-481-03)", () => {
  const site = mergeTokens(DEFAULT_TOKENS, { colors: { accent: "#f59e0b" }, neutrals: { border: "#e5e7eb" } });
  const palette = getPageEditorColorPalette(site);

  it("inline toolbar and block control preview the SAME site value for a brand token", () => {
    const inline = palette.find((s) => s.id === "accent");
    // render inline toolbar (live palette) + block ColorSwatchControl (live palette)
    expect(inlineSwatchBg("accent")).toBe(inline!.previewValue);   // "#f59e0b"
    expect(blockSwatchBg("accent")).toBe(inline!.previewValue);    // same
  });

  it("the in-canvas content scope resolves the brand var to the same site value", () => {
    // SectionCanvas content scope carries --color-accent: #f59e0b (from 481-02-L02);
    // a block colored var(--color-accent) reads that on the content scope.
    expect(contentScopeStyle()).toContain("--color-accent: #f59e0b");
  });

  it("the committed mark/style value stays the var(--color-*) token (not the hex)", () => {
    expect(committedAccentValue()).toBe("var(--color-accent)");
  });
});
```

Notes for the implementer:
- Drive previews from `getPageEditorColorPalette(site)` (the single palette owner) so
  the test asserts both controls consume the SAME source — not hand-rolled values.
- Assert on `style`-strings / `previewValue` (jsdom does not resolve custom
  properties); the real cascade is covered by the Playwright smoke (481-04-L01).
- Reuse fixtures/helpers already in `shared-color-control.test.tsx`; do not add a new
  file.

## Testing Requirements

- Vitest lane only: `tests/vitest/ui/shared-color-control.test.tsx`.
- Cases: inline↔block preview equality for each brand id; content-scope var equals the
  same site value; committed value remains the token.
- No DB migration artifacts.
