# TASK-476: Page Editor Inline Rich-Text Formatting Marks
# FileName: TASK-476_Page_Editor_Inline_Rich_Text_Formatting_Marks.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-471-03 (per-fragment color marks model + inline toolbar),
TASK-464 (authoring sanitizers), TASK-469 (rich-text inline edit fidelity)
**Status:** ⏳ To Do

---

## Overview

Extend the per-fragment text marks introduced in TASK-471-03 (color) with the
rest of inline formatting on the **same canvas selection**: **bold**, *italic*,
**link**, and **highlight** (background color). This is the natural completion of
the inline mini-toolbar so an author can fully format a fragment without leaving
the canvas.

Builds directly on the 471-03 marks model + inline toolbar and reuses the Posts
inline-marks pattern; do not fork a parallel system.

---

## Current State (verified / assumed-from-dependency)

- TASK-471-03 adds a `marks` structure on text-bearing blocks (color-only) plus
  a canvas selection mini-toolbar and a safe segment renderer; this task extends
  that union — it must land after 471-03.
- Sanitizer allowlist already permits structural inline tags `strong`, `em`,
  `i`, and `a` (href only, with `rel`): `pageAuthoringSanitizers.ts:80-111`.
- Safe link href owner: `widgetSafeHref` / `normalizeWidgetSafeHref` (no
  `javascript:`/`data:`); safe color owner: `isSafeAuthoringCssColor`.
- Posts inline marks reference: `tests/vitest/ui/post-richtext-inline-*.test.ts`.

---

## Sub-Tasks

- [ ] Extend the 471-03 mark union with `bold`, `italic`, `link` (`href`), and
      `highlight` (`color`); update `normalizeBlockTextMarks` (validate href via
      `normalizeWidgetSafeHref`, highlight color via `isSafeAuthoringCssColor`;
      bold/italic carry no attributes).
- [ ] Add B / I / link / highlight buttons to the inline selection mini-toolbar
      (toggle on the active selection), reusing the 471-03 toolbar + Posts UX.
- [ ] Render marked segments: `bold → <strong>`, `italic → <em>`,
      `link → <a href rel="noopener noreferrer">`, `highlight → <span
      background-color>`; support overlapping/stacked marks (e.g. bold + color)
      per the Posts rule.
- [ ] Keep the sanitizer allowlist exact (only these validated shapes) and the
      no-`dangerouslySetInnerHTML` render path; clamp total marks per block.
- [ ] Reconcile with TASK-469 inline-edit round-trip (marks survive an inline
      edit or the block stays panel-safe).
- [ ] Add XSS + render + round-trip coverage (incl. `javascript:` link
      rejection and unsafe highlight color drop).

---

## Implementation Pseudocode

```ts
// Extends the TASK-471-03 mark union:
type PageTextMark =
  | { type: "color";     from: number; to: number; color: string }   // 471-03
  | { type: "highlight"; from: number; to: number; color: string }
  | { type: "link";      from: number; to: number; href: string }
  | { type: "bold";      from: number; to: number }
  | { type: "italic";    from: number; to: number };

function normalizeMark(text, m): PageTextMark | null {
  const range = clampRange(m, text.length); if (!range) return null;
  switch (m.type) {
    case "color":
    case "highlight": { const c = sanitizeAuthoringCssColor(m.color); return c ? {...m, ...range, color: c} : null; }
    case "link":      { const h = normalizeWidgetSafeHref(m.href);    return h ? {...m, ...range, href: h}  : null; }
    case "bold":
    case "italic":    return { ...m, ...range };
    default: return null;                                              // reject unknown
  }
}

// renderMarkedText: wrap each segment in the stacked tags it carries:
//   bold→<strong>, italic→<em>, link→<a rel="noopener noreferrer">,
//   color→style.color, highlight→style.backgroundColor (all pre-sanitized).
```

Regression-test shape:
- Selecting a fragment and toggling bold/italic/link/highlight persists + renders
  the right tags/styles; stacked marks (bold + color) compose.
- `link` with `javascript:`/`data:` href is dropped; highlight `url()`/unsafe
  color dropped.
- Mark count is clamped; ranges normalized to text bounds; no
  `dangerouslySetInnerHTML`.

---

## Security Contract

- No new endpoints. **Link sink:** href via `normalizeWidgetSafeHref`
  (allowlisted protocols, no `javascript:`/`data:`), rendered with
  `rel="noopener noreferrer"`. **Highlight/color sink:** `isSafeAuthoringCssColor`
  (no `url()`/`calc()`/`expression()`). Bold/italic are structural-only.
  Sanitizer allowlist stays exact; reuse the TASK-463/464 owners — no second
  raw-HTML allowlist; no `dangerouslySetInnerHTML`. Clamp marks per block (DoS).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun --cwd core lint` / `bun --cwd core lint:types`
- `bun run check:admin-boundary` (if sanitizer helpers move)

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (mark types), `_docs/SECURITY_SPEC.md` (link/color
  sinks).
- `_docs/_TASKS/README.md` (board + statistics), `_docs/_CHANGELOG/` on
  completion.
