# TASK-472-05-L01: Bold / Italic / Link / Highlight Marks
# FileName: TASK-472-05-L01-Bold-Italic-Link-Highlight-Marks.md

**Parent Subtask:** TASK-472-05
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-471-03, TASK-464, TASK-469
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Extend the TASK-471-03 fragment marks with `bold`, `italic`, `link` (href), and
`highlight` (background color) on the same canvas selection, reusing the 471-03
toolbar + Posts inline-marks pattern. Must land after TASK-471-03.

## Current State (verified / from dependency)

- TASK-471-03 introduces the `marks` structure, selection mini-toolbar, and safe
  segment renderer (color-only); this extends the union.
- Sanitizer allowlist already permits `strong`, `em`, `i`, `a` (href + `rel`):
  `pageAuthoringSanitizers.ts:80-111`.
- Safe href owner: `sanitizeAuthoringLinkHref` (no `javascript:`/`data:`); safe
  color: `isSafeAuthoringCssColor`.
- Helper naming: link marks use the neutral Page/authoring
  `normalizeAuthoringSafeHref` helper; Page Editor canvas code stays on
  sections/blocks and does not import widget-core modules.
- Posts reference: `tests/vitest/ui/post-richtext-inline-*.test.ts`.

## Sub-Tasks

- [x] Extend the mark union with `bold`, `italic`, `link(href)`,
      `highlight(color)`; update `normalizeBlockTextMarks` (href via
      `sanitizeAuthoringLinkHref`; highlight color via `isSafeAuthoringCssColor`;
      bold/italic carry no attributes).
- [x] Add B / I / link / highlight buttons to the 471-03 inline mini-toolbar.
- [x] Render: `bold→<strong>`, `italic→<em>`, `link→<a href rel="nofollow
      noreferrer">` (match the page rich-text sanitizer, `pageAuthoringSanitizers.ts:100`),
      `highlight→<span background-color>`; support stacked marks
      (e.g. bold+color) per the Posts rule.
- [x] Keep the sanitizer allowlist exact + no `dangerouslySetInnerHTML`; clamp
      total marks per block.
- [x] Reconcile with TASK-469 inline-edit round-trip.
- [x] XSS + render + round-trip coverage.

## Implementation Pseudocode

```ts
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
    case "link":      { const h = sanitizeAuthoringLinkHref(m.href);  return h ? {...m, ...range, href: h}  : null; }
    case "bold":
    case "italic":    return { ...m, ...range };
    default: return null;                                              // reject unknown
  }
}
// renderMarkedText: wrap each segment in stacked tags: bold→<strong>, italic→<em>,
// link→<a rel="nofollow noreferrer">, color→style.color, highlight→style.backgroundColor.
```

Regression-test shape:
- Toggle bold/italic/link/highlight on a fragment ⇒ correct tags/styles persist +
  render; stacked marks (bold+color) compose.
- `link` with `javascript:`/`data:` dropped; highlight `url()`/unsafe color dropped.
- Marks clamped; ranges normalized; no `dangerouslySetInnerHTML`.

## Security Contract

- No new endpoints. **Link sink:** href via `sanitizeAuthoringLinkHref`
  (allowlisted protocols, no `javascript:`/`data:`), rendered `rel="nofollow
  noreferrer"` (matching the existing page rich-text sanitizer). **Highlight/color
  sink:** `isSafeAuthoringCssColor` (no
  `url()`/`calc()`/`expression()`). Bold/italic structural-only. Sanitizer
  allowlist stays exact (reuse TASK-463/464 owners; no second raw-HTML allowlist;
  no `dangerouslySetInnerHTML`). Clamp marks per block (DoS).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun --cwd core lint` / `bun --cwd core lint:types` / `bun run check:admin-boundary`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (mark types), `_docs/SECURITY_SPEC.md` (link/color sinks).
- `_docs/_TASKS/TASK-472-05*.md` status; changelog rolled up by TASK-472-06.
