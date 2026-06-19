# TASK-471-03: Per-Fragment Rich-Text Color
# FileName: TASK-471-03-Per-Fragment-Rich-Text-Color.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-464 (authoring sanitizers), TASK-469 (rich-text inline
edit fidelity — shared inline-edit contract + renderer)
**Status:** ⏳ To Do

---

## Overview

Authors can only set a single block-wide text color (`block.style.textColor`).
The owner wants to **select a fragment** of text inside a text-presentation
block on the canvas (hero header, heading, paragraph) and recolor only that
fragment, so one header can carry 2–4 colors.

This requires an inline **mark** model on text-bearing blocks, a canvas
selection mini-toolbar with a color swatch, a sanitizer that allows *validated*
color spans, and a renderer that paints marked segments — all reusing the
existing Posts inline-marks pattern instead of inventing a parallel system.

**Reuse mandate:** the Posts editor already implements inline mark selection +
rendering (`tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`,
`post-richtext-inline-wrapper.test.ts`). Inventory that model first and share a
common inline-marks contract where feasible (own it in one module, re-export);
do not duplicate mark logic.

---

## Current State (verified)

- Text is a flat string in block props (`heading.text`, `text.text`,
  `quote.text`, …); the `text` block has `format: "plain" | "rich"`
  (`pageDocumentV2.ts`). No mark/span structure exists.
- Inline canvas edit strips all markup on commit (`stripInlineMarkup`) and
  rejects `format:"rich"` as panel-only (`pageInlineEditContract.ts:114-115,
  249-263, 289-295`) — this is the same lossy path TASK-469 addresses.
- Rich-text sanitizer allowlist is structural-only (no `span`, no `style`):
  `pageAuthoringSanitizers.ts:80-111`; color validation primitive
  `isSafeAuthoringCssColor` (~line 29-32) + `sanitizeAuthoringCssColor`.
- Renderer: `renderTextBlock` / `renderHeading`
  (`pageRendererV2.tsx:718-757`) escape plain text or render sanitized rich
  prose; block text color via the single `--coderso-block-text` var. No
  per-segment paint. No `dangerouslySetInnerHTML` (uses the sanitized
  React-node path).
- Block color control: single `block.style.textColor`
  (`pageEditorControlRegistry.ts:376-383`).

---

## Design decisions (defaults — confirm in closure)

- **Mark type:** `color` only for this leaf (bold/italic/link/highlight are
  adjacent follow-ups). One header carrying multiple colors is the goal.
- **Scope:** the typography-capable text blocks that present prose —
  `heading`, `text`, `quote` to start (`pageTypographyCapableBlockTypes`).
  `button`/`list`/`statistic` deferred.
- **Storage:** align with the Posts mark representation. Preferred: a structured
  `marks` array `{ type: "color"; from: number; to: number; color: string }[]`
  on the text prop, sanitized + clamped on normalize. If Posts stores sanitized
  inline spans instead, mirror that representation rather than adding a second.
- **Editing UX:** canvas selection → floating mini-toolbar anchored to the
  selection with a color swatch (the owner's described flow), reusing the Posts
  inline selection wrapper. Panel also exposes the block-wide `textColor` as the
  fallback/base color.
- **Responsive:** marks are base-only (no per-breakpoint mark overrides) to bound
  scope.

---

## Sub-Tasks

- [ ] Inventory the Posts inline-marks model + selection UI; decide shared
      contract vs adapted copy; record the decision.
- [ ] Extend the text-block schema with a validated `marks` structure
      (color-only) on the in-scope blocks; add `normalizeBlockMarks` (clamp
      ranges to text length, drop overlaps/empties per the Posts rule, cap mark
      count, reject unknown mark types, validate each color via
      `isSafeAuthoringCssColor`).
- [ ] Add canvas fragment-selection handling + a floating color swatch
      mini-toolbar that reads/writes marks for the active selection (reuse Posts
      selection wrapper). Keep block-wide `textColor` as the base.
- [ ] Extend the sanitizer to permit *only* the exact validated color-span shape
      (e.g. `<span data-mark="color" style="color:<safe>">`), or keep marks as
      JSON and convert to safe spans at render — no broad `span`/`style`
      allowlist, no new raw-HTML sink.
- [ ] Update `renderTextBlock` / `renderHeading` to split text into marked
      segments and paint each segment's color (mark color overrides the block
      `--coderso-block-text` base), on both canvas and front, identically.
- [ ] Reconcile with TASK-469: the inline commit path must preserve marks
      (or the block stays panel-safe) — do not regress 469's rich round-trip;
      coordinate so both land coherently on the shared files.
- [ ] Add XSS + round-trip + render regression coverage.

---

## Implementation Pseudocode

```ts
// pageDocumentV2.ts — schema + normalize (color-only marks)
export const PAGE_TEXT_MARK_MAX = 24 as const;
export type PageTextColorMark = { type: "color"; from: number; to: number; color: string };

export function normalizeBlockTextColorMarks(text: string, raw: unknown): PageTextColorMark[] {
  if (!Array.isArray(raw)) return [];
  const len = text.length;
  const out: PageTextColorMark[] = [];
  for (const m of raw) {
    if (!m || m.type !== "color") continue;
    const color = sanitizeAuthoringCssColor(m.color);   // fail-closed → null
    if (!color) continue;
    const from = clampInt(m.from, 0, len);
    const to = clampInt(m.to, 0, len);
    if (to <= from) continue;                            // drop empty
    out.push({ type: "color", from, to, color });
    if (out.length >= PAGE_TEXT_MARK_MAX) break;
  }
  return dedupeAndOrderMarks(out);                        // Posts rule (no overlap)
}

// pageRendererV2.tsx — paint marked segments
function renderMarkedText(text: string, marks: PageTextColorMark[]): React.ReactNode {
  if (!marks.length) return renderBlockText(text);       // unchanged plain path
  const segments = splitTextByMarks(text, marks);        // [{text, color?}]
  return segments.map((s, i) =>
    s.color
      ? <span key={i} style={{ color: s.color }}>{s.text}</span>   // color already sanitized
      : <span key={i}>{s.text}</span>,
  );
}
```

Data flow: canvas selection → swatch writes a `color` mark → `normalize*`
validates/clamps → persisted on the text prop → renderer splits into segments →
safe `<span style="color">` per segment (no `dangerouslySetInnerHTML`). Block
`textColor` remains the base; marks override their range only.

Regression-test shape:
- A heading "Hello world" with a `color` mark on `0..5` renders two segments,
  the first colored, the second using the base color.
- Mark colors are sanitized: `url(x)`, `calc(...)`, `expression(...)`,
  `;`-injection, and overlong values fail closed (no span emitted / dropped).
- Marks beyond text length / overlapping / over the cap are normalized away.
- Round-trip: edit fragment color, save, reload — marks survive (coordinated
  with TASK-469's commit path); a block with no marks is byte-identical to today.

---

## Security Contract

- **No new endpoints.** Marks persist via the existing pages save/draft routes
  (admin session, `pages:write`, existing CSRF).
- **Color sink:** every mark color passes `isSafeAuthoringCssColor` /
  `sanitizeAuthoringCssColor` before storage *and* before render; fail closed to
  no mark. No `url()`, `calc()`, `expression()`, semicolons, or arbitrary CSS.
- **HTML sink:** if marks are stored/rendered as spans, whitelist *only* the
  exact `data-mark="color"` + sanitized inline `color` shape — no general
  `span`/`style` allowlist, and reuse the TASK-463/464 sanitizer owner. No
  `dangerouslySetInnerHTML`; keep the sanitized React-node render path.
- **DoS bounds:** clamp mark count (`PAGE_TEXT_MARK_MAX`) and ranges to text
  length; drop overlaps/empties on normalize.
- No secrets/provider keys touched.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun run test:vitest` (control registry + editor flow)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary` (if sanitizer helpers move)

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (text color-mark model), `_docs/SECURITY_SPEC.md`
  (color-span sink policy), `_docs/DESIGN_TOKENS.md` (mark vs block color).
- `_docs/_TASKS/TASK-471*.md` (status), `_docs/_CHANGELOG/` on family closure.
