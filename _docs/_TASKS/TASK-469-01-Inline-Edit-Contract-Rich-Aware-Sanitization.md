# TASK-469-01: Inline-Edit Contract Rich-Aware Sanitization
# FileName: TASK-469-01-Inline-Edit-Contract-Rich-Aware-Sanitization.md

**Parent Task:** TASK-469
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Inline Edit Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-422, TASK-438
**Status:** ✅ Done
**Completed:** 2026-06-20

---

## Overview

Make the Bun-free inline-edit contract rich-aware so a `format:"rich"` text block
commits sanitized inline HTML instead of being panel-only or flattened. All
changes stay in `core/services/pages/pageInlineEditContract.ts` and reuse the
shared `sanitizeAuthoringRichTextHtml` from `pageAuthoringSanitizers.ts` — no
second allowlist. `stripInlineMarkup` / `sanitizeInlineText` remain the path for
every non-rich (plain-text) target.

This subtask is independently testable in the Vitest lane and unblocks the canvas
wiring (TASK-469-02).

## Sub-Tasks

- [x] TASK-469-01-L01: Rich Target Resolution And Shared-Sanitizer Commit

## Files To Change

| File | Required change |
|---|---|
| `core/services/pages/pageInlineEditContract.ts` | Add `preserveMarkup` to `InlineEditableTarget`; rich-aware `resolveInlineEditTarget`; new `sanitizeInlineRichText`; dispatch in `commitInlineText`. |
| `tests/vitest/services/page-inline-edit-contract.test.ts` | Replace the panel-only rich assertion (lines 94–99); add rich resolve/sanitize/dispatch/no-regression coverage. |

## Implementation Pseudocode

Full shape lives in TASK-469-01-L01; the contract surface introduced here is:

```ts
import { sanitizeAuthoringRichTextHtml } from "./pageAuthoringSanitizers";

export type InlineEditableTarget = {
  blockType: PageBlockType;
  propPath: string;
  multiline: boolean;
  allowEmpty: boolean;
  /** Rich targets sanitize-and-preserve allowlisted HTML instead of stripping to text. */
  preserveMarkup?: boolean;
};
```

## Security Contract

- **Endpoint visibility:** none; pure Bun-free domain contract.
- **Auth / RBAC / CSRF / Rate-limit:** n/a (no route surface).
- **Validation:** single shared allowlist (`pageRichTextAllowedTags`); dangerous
  tags + content dropped via `dangerousHtmlContentTagSet`; `<a href>` validated;
  non-string values fail closed; empty-commit policy preserved.
- **Boundary:** the new `sanitizeAuthoringRichTextHtml` import must keep the
  module Bun-free / no-DOM / no-admin-UI (the sanitizer chain
  `pageAuthoringSanitizers` → `postRichTextHtmlUtils` is pure string work).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None at subtask level beyond the parent's closure docs (TASK-469-03).

## Acceptance Criteria

1. A `format:"rich"` text block with a string value resolves to a target with
   `preserveMarkup === true`; non-string still resolves to `null`.
2. Rich commit preserves `pageRichTextAllowedTags` and drops dangerous tags +
   content; output equals `sanitizeAuthoringRichTextHtml(raw)` (trimmed).
3. Plain-text targets still strip markup (no regression).
4. The module remains Bun-free; the Vitest suite imports it without runtime
   coupling.
