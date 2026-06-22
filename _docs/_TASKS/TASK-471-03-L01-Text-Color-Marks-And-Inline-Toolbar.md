# TASK-471-03-L01: Text Color Marks And Inline Toolbar
# FileName: TASK-471-03-L01-Text-Color-Marks-And-Inline-Toolbar.md

**Parent Subtask:** TASK-471-03
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-464 (authoring sanitizers), TASK-469 (rich-text inline
edit fidelity)
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Add a validated color-mark model to text-bearing blocks, a canvas
fragment-selection mini-toolbar with a color swatch, a sanitizer that permits
only validated color spans, and a renderer that paints marked segments — reusing
the Posts inline-marks pattern.

## Design decisions (confirmed in TASK-471-05)

- **Mark type:** `color` only (others are TASK-472-05).
- **Scope:** `heading`, `text`, `quote` (`pageTypographyCapableBlockTypes`);
  button/list/statistic deferred.
- **Storage:** align with the Posts mark representation (structured
  `{type:"color"; from; to; color}[]` preferred; mirror Posts if it uses spans).
- **UX:** selection → floating swatch mini-toolbar (owner's flow), reusing the
  Posts selection wrapper; block-wide `textColor` stays the base.
- **Responsive:** marks base-only.

## Current State (verified)

- `pageDocumentV2.ts` — flat string text; `text.format` plain|rich; no marks.
- `pageInlineEditContract.ts:114-115, 249-263, 289-295` — strips markup / rejects
  rich (same lossy path as TASK-469).
- `pageAuthoringSanitizers.ts:29-32, 80-111` — `isSafeAuthoringCssColor`;
  structural-only allowlist (no span/style).
- `pageRendererV2.tsx:718-771` — `renderTextBlock` (718-748) / `renderHeading`
  (750-771); single `--coderso-block-text`; sanitized React-node path (no
  `dangerouslySetInnerHTML`).

## Sub-Tasks

- [ ] Inventory the Posts marks model + selection UI; decide shared vs adapted;
      record the decision.
- [ ] Extend in-scope text blocks with a validated `marks` structure +
      `normalizeBlockTextColorMarks` (clamp ranges to text length, drop
      overlaps/empties per Posts rule, cap count, reject unknown types, validate
      each color via `isSafeAuthoringCssColor`).
- [ ] Canvas fragment selection + floating color swatch reading/writing marks for
      the active selection (reuse Posts wrapper); base = block `textColor`.
- [ ] Sanitizer: permit only the exact validated color-span shape, or keep marks
      JSON and convert to safe spans at render — no broad span/style allowlist,
      no new raw-HTML sink.
- [ ] Renderer: split text into marked segments and paint each color (mark
      overrides base), canvas == front.
- [ ] Reconcile with TASK-469 (inline commit preserves marks or block stays
      panel-safe).
- [ ] XSS + round-trip + render coverage.

## Implementation Pseudocode

```ts
// pageDocumentV2.ts
export const PAGE_TEXT_MARK_MAX = 24 as const;
export type PageTextColorMark = { type: "color"; from: number; to: number; color: string };

export function normalizeBlockTextColorMarks(text: string, raw: unknown): PageTextColorMark[] {
  if (!Array.isArray(raw)) return [];
  const len = text.length, out: PageTextColorMark[] = [];
  for (const m of raw) {
    if (!m || m.type !== "color") continue;
    const color = sanitizeAuthoringCssColor(m.color); if (!color) continue;   // fail-closed
    const from = clampInt(m.from, 0, len), to = clampInt(m.to, 0, len);
    if (to <= from) continue;
    out.push({ type: "color", from, to, color });
    if (out.length >= PAGE_TEXT_MARK_MAX) break;
  }
  return dedupeAndOrderMarks(out);   // Posts rule (no overlap)
}

// pageRendererV2.tsx
function renderMarkedText(text: string, marks: PageTextColorMark[]) {
  if (!marks.length) return renderBlockText(text);
  return splitTextByMarks(text, marks).map((s, i) =>
    s.color ? <span key={i} style={{ color: s.color }}>{s.text}</span>
            : <span key={i}>{s.text}</span>);
}
```

Data flow: selection → swatch writes a mark → `normalize*` validates/clamps →
persisted on the text prop → renderer splits → safe `<span style="color">` per
segment (no `dangerouslySetInnerHTML`); block `textColor` = base.

Regression-test shape:
- Heading "Hello world" + mark `0..5` ⇒ two segments, first colored, second base.
- `url(x)`/`calc()`/`expression()`/`;`-injection/overlong color ⇒ fails closed.
- Out-of-range / overlapping / over-cap marks normalized away.
- Round-trip survives (coordinated with TASK-469); no-marks block byte-identical.

## Security Contract

- **No new endpoints.** Marks persist via existing pages save/draft routes (admin
  session, `pages:write`, existing CSRF).
- **Color sink:** every mark color passes `isSafeAuthoringCssColor` /
  `sanitizeAuthoringCssColor` before store *and* render; fail closed. No `url()`,
  `calc()`, `expression()`, semicolons.
- **HTML sink:** if rendered as spans, whitelist only the exact
  `data-mark="color"` + sanitized `color` shape; reuse the TASK-463/464 sanitizer
  owner; no general span/style allowlist; no `dangerouslySetInnerHTML`.
- **DoS bounds:** clamp count (`PAGE_TEXT_MARK_MAX`) + ranges; drop
  overlaps/empties on normalize. No secrets touched.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types` / `bun run check:admin-boundary`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md`, `_docs/DESIGN_TOKENS.md`.
- `_docs/_TASKS/TASK-471-03*.md` status; changelog rolled up by TASK-471-05.
