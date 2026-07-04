# TASK-469: Pages Editor Rich-Text Inline Canvas Edit Fidelity
# FileName: TASK-469_Pages_Editor_Rich_Text_Inline_Canvas_Edit_Fidelity.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Inline Edit
**Estimated Effort:** Medium
**Dependencies:** TASK-422 (inline-edit contract + canvas `contentEditable` infrastructure, Done), TASK-438 (text-block remediation that made `format:"rich"` panel-only, Done). Shares `core/services/pages/pageRendererV2.tsx` with sibling TASK-470 — coordinate so both land in one renderer touch.
**Status:** ✅ Done
**Completed:** 2026-06-20

---

## Overview

Carried-forward residual from the audit follow-up closure
(`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1; originally the §3.4
row, a residuum owned out of TASK-422). Severity **MEDIUM (UX)**.

A `text` block with `props.format === "rich"` stores allowlisted inline HTML
(`<strong>`, `<em>`, `<a>`, lists, …). The floating-panel "Primary text" content
field preserves that markup, but **inline canvas edit is lossy**:

- `resolveInlineEditTarget` returns `null` for `text` + `propPath === "text"` +
  `format === "rich"` (`core/services/pages/pageInlineEditContract.ts`
  lines 114–116), so the canvas `contentEditable` surface never activates for
  rich blocks — they are panel-only by design (TASK-438 made this an intentional
  fail-closed gate so inline edit could not collapse stored HTML to plain text).
- The plain-text inline commit path runs `sanitizeInlineText` →
  `stripInlineMarkup` (lines 249–263, 289–295), a one-way fixpoint loop that
  **strips ALL markup to plain text**. Routed naively, a rich block would commit
  `<p>Hello <strong>world</strong></p>` as `Hello world`.

The audit logged the net effect: panel and canvas diverge for the same block, and
any inline edit of a rich block flattens its formatting.

**Goal.** Inline canvas edit of `format:"rich"` text blocks must round-trip
formatting consistently with the panel field — bold/italic/links/lists survive —
by routing the rich commit through the **same sanitized rich-text contract the
front renderer already trusts** (`sanitizeAuthoringRichTextHtml` →
`renderSanitizedRichTextHtml`), instead of `stripInlineMarkup`. Plain-text
targets keep their existing `stripInlineMarkup` path unchanged.

**Owning modules.**

- `core/services/pages/pageInlineEditContract.ts` — Bun-free contract: target
  resolution, sanitizer, empty-commit policy. Primary change surface (469-01).
- `core/services/pages/pageAuthoringSanitizers.ts` — owns the canonical shared
  `sanitizeAuthoringRichTextHtml` (lines 103–111) and the `pageRichTextAllowedTags`
  / `pageRichTextSelfClosingTags` allowlist (lines 80–93). Reused, not re-derived.
- `core/services/pages/pageRendererV2.tsx` — `renderTextBlock` (lines 726–741)
  sanitizes via `sanitizeAuthoringRichTextHtml` and renders through
  `renderSanitizedRichTextHtml` (no `dangerouslySetInnerHTML`).
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` —
  `InlineEditableCanvasText` (lines 71–156): null-guard (92–93) and `onBlur`
  commit (133–142). Change surface (469-02).

**Source of truth.** `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1 and
§3.4.

**Out of scope.**

- `image.fit` / `video.title` render wiring — **TASK-470** (same §9.4 class,
  shares `pageRendererV2.tsx`).
- New formatting affordances (toolbar, slash commands, new tags) beyond what the
  panel field and `pageRichTextAllowedTags` already support. This is parity +
  fidelity, not feature expansion.
- The panel "Primary text" editor stack or its sanitizer.
- Making any other block prop newly inline-editable.

---

## Security Contract

**No endpoint, route, or permission-model changes.** HTML sanitization / XSS is
the core risk because this task newly admits markup into the inline commit path,
so the sanitizer invariants are load-bearing and enforced per leaf:

- **Single allowlist, no second source of truth.** The rich inline commit reuses
  `sanitizeAuthoringRichTextHtml` — the exact sanitizer the renderer
  (`pageRendererV2.tsx`) and panel already enforce. No parallel tag allowlist.
  Allowed tags stay `pageRichTextAllowedTags` (`a, br, code, em, i, li, ol, p,
  strong, ul`); self-closing stays `pageRichTextSelfClosingTags` (`br`).
- **Dangerous tags + content dropped.** `dangerousHtmlContentTagSet`
  (`script, style, iframe, object, embed, form, button, textarea, select, svg,
  math`) and their content are removed; `<a>` keeps only a validated `href`
  re-emitted with `rel="nofollow noreferrer"`.
- **Fail closed on drift.** Non-string `block.props.text`, unknown block/prop
  combos, and schema drift still resolve to `null` / keep previous value. No
  non-rich target is widened.
- **No raw-HTML injection path.** Commit output is the sanitizer's output, never
  the raw `contentEditable` string; no new `dangerouslySetInnerHTML`.
- **Control-character hygiene + empty-commit policy preserved** on the rich path.
- **No new data reaches client cache or logs.**

---

## Sub-Tasks

- [x] TASK-469-01: Inline-Edit Contract Rich-Aware Sanitization
- [x] TASK-469-02: Canvas Inline Rich-Text Surface And Commit Wiring
- [x] TASK-469-03: Validation Docs And Closure

## Implementation Order

1. Land the Bun-free contract change first (469-01): rich-aware target resolution
   + shared-sanitizer commit + Vitest coverage. It is independently testable and
   unblocks the canvas wiring.
2. Wire the canvas rich `contentEditable` surface and commit path (469-02) on top
   of the new contract.
3. Validate, live-smoke, doc, changelog, and close (469-03), coordinating the
   shared `pageRendererV2.tsx` touch with TASK-470 if landed together.

## Implementation Pseudocode

High-level shape; concrete pseudocode lives in the executable leaves.

```ts
// pageInlineEditContract.ts (469-01-L01)
import { sanitizeAuthoringRichTextHtml } from "./pageAuthoringSanitizers";

// resolveInlineEditTarget: stop returning null for format === "rich";
// materialize a frozen { ...target, preserveMarkup: true } when the stored
// value is a string, else keep failing closed.

// New rich sanitizer (never calls stripInlineMarkup):
export function sanitizeInlineRichText(target, raw) {
  const normalized = removeControlCharacters(normalizeLineEndings(raw));
  return sanitizeAuthoringRichTextHtml(normalized).trim();
}

// commitInlineText: dispatch on target.preserveMarkup; empty-commit policy unchanged.
```

```tsx
// PageAuthoringCanvas.tsx (469-02-L01)
// Rich targets activate a contentEditable seeded from the rendered rich tree
// (children), and onBlur reads innerHTML and commits via the rich dispatcher.
// Plain-text targets are unchanged.
```

Data flow, error handling, and regression-test shapes are specified per leaf.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts`
- Canvas inline-edit UI flow suite for `PageAuthoringCanvas` (469-02).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `coderso-dev-core-host` + `playwright-cli`: inline-edit a `format:"rich"`
  block, add `<strong>` + a link, blur, confirm panel parity and front paint.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board + statistics sync (umbrella + children).
- `_docs/_CHANGELOG/` entry on completion (next free number at closure time).
- `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` — reconcile §9.4 item 1 (and §3.4
  row) status to resolved on closure.
- If landed with TASK-470, note the single shared `pageRendererV2.tsx` touch in
  both changelog entries.
