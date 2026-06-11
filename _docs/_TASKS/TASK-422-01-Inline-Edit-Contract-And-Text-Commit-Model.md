# TASK-422-01: Inline Edit Contract And Text Commit Model
# FileName: TASK-422-01-Inline-Edit-Contract-And-Text-Commit-Model.md

**Parent Task:** TASK-422
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Freeze the inline-edit contract before touching `PageEditor.tsx`: which blocks
and props are inline-editable, the entry/exit semantics, the empty-value
policy, and the sanitization helpers. The helpers must live in a Bun-free
domain module so Vitest owns their tests and the implementation leaf
(TASK-422-02) consumes them without rediscovering decisions.

Contract to decide and record in this file when work starts:

- Inline-editable map: `heading.text`, `text.text`, `quote.text`,
  `quote.cite`, `statistic.value|label|caption`, `button.label`,
  `list.items[n]`. Anything else stays panel-only.
- Entry: double-click on a selected block or Enter while selected.
- Exit/commit: blur or Escape commits; no separate cancel path in v1 (panel
  history/undo is out of scope).
- Empty commit policy: keep previous value for required fields, allow empty
  for optional fields (`quote.cite`, `statistic.caption`), never let an empty
  commit cause block pruning (see TASK-442/TASK-449 pruning findings).
- Sanitization: plain-text-only commit (strip elements, collapse control
  characters, preserve internal whitespace); `text.format === "rich"` commits
  through a sanitized rich subset only if TASK-438 lands real rich rendering,
  otherwise plain text.

---

## Sub-Tasks

- [x] TASK-422-01-L01: Inline editable target map and sanitization helpers.

## Implementation Pseudocode

```ts
// core/services/pages/pageInlineEditContract.ts (new, Bun-free)
export type InlineEditableTarget = {
  blockType: PageBlockType;
  propPath: string;            // e.g. "text", "items.0", "label"
  multiline: boolean;
  allowEmpty: boolean;
};

export const inlineEditableTargets: readonly InlineEditableTarget[] = [
  { blockType: "heading", propPath: "text", multiline: false, allowEmpty: false },
  { blockType: "text", propPath: "text", multiline: true, allowEmpty: false },
  // … full map per Overview
];

export function resolveInlineEditTarget(block: PageBlockV2, propPath: string):
  InlineEditableTarget | null;

export function sanitizeInlineText(target: InlineEditableTarget, raw: string): string {
  const collapsed = raw.replace(/\u00A0/g, " ").replace(/[\u0000-\u0008\u000B-\u001F]/g, "");
  const text = target.multiline ? collapsed : collapsed.replace(/\s*\n+\s*/g, " ");
  return text.trim();
}

export function commitInlineText(target, previous: string, raw: string): string {
  const next = sanitizeInlineText(target, raw);
  if (next.length === 0 && !target.allowEmpty) return previous;
  return next;
}
```

Error handling:

- `resolveInlineEditTarget` returns `null` for non-editable targets; the UI
  must fail closed (no `contentEditable` rendered).
- Helpers are pure; no DOM or Bun APIs (Vitest lane requirement from
  `_docs/TESTING_STRATEGY.md`).

Regression-test shape:

- Vitest unit tests for the target map, sanitization (markup stripped, control
  characters removed, multiline vs single-line), and empty-commit policy.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** committed values must satisfy the existing
  `pageDocumentV2.ts` prop schemas; sanitizer rejects markup.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- New Vitest suite `tests/vitest/services/page-inline-edit-contract.test.ts`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` note on the inline-editable prop map if it becomes a
  contract surface.

---

## Completion Notes

Completed 2026-06-11: core/services/pages/pageInlineEditContract.ts (Bun-free) with the inlineEditableTargets literal (heading/text/quote/statistic/button/list items), resolveInlineEditTarget, sanitizeInlineText, commitInlineText with the empty-commit policy; 31 Vitest tests.
