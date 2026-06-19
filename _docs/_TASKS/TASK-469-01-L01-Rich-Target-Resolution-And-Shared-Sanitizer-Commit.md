# TASK-469-01-L01: Rich Target Resolution And Shared-Sanitizer Commit
# FileName: TASK-469-01-L01-Rich-Target-Resolution-And-Shared-Sanitizer-Commit.md

**Parent Subtask:** TASK-469-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Inline Edit Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-422, TASK-438
**Status:** ⏳ To Do

---

## Overview

Executable leaf for the contract change. In
`core/services/pages/pageInlineEditContract.ts`: stop returning `null` for
`text` + `format:"rich"`, add `sanitizeInlineRichText` that delegates tag
preservation to the shared `sanitizeAuthoringRichTextHtml`, and dispatch
`commitInlineText` on a new `preserveMarkup` flag. The empty-commit policy and
control-character hygiene are preserved; `stripInlineMarkup` stays for plain-text
targets.

## Sub-Tasks

- [ ] Add optional `preserveMarkup` to `InlineEditableTarget` (defaults false).
- [ ] In `resolveInlineEditTarget`, replace the `format === "rich"` `null` branch
      (lines 114–116) with a frozen rich-aware target when the stored value is a
      string; keep every other fail-closed branch intact.
- [ ] Add `sanitizeInlineRichText(target, raw)` delegating to
      `sanitizeAuthoringRichTextHtml`; never call `stripInlineMarkup`.
- [ ] Branch `commitInlineText` on `target.preserveMarkup`; wrap both branches in
      the unchanged empty-commit guard.
- [ ] Replace the panel-only assertion at
      `page-inline-edit-contract.test.ts:94–99` and add rich coverage.

## Files To Change

| File | Required change |
|---|---|
| `core/services/pages/pageInlineEditContract.ts` | Type field, resolution branch, `sanitizeInlineRichText`, commit dispatch. |
| `tests/vitest/services/page-inline-edit-contract.test.ts` | Rich resolve / sanitize / dispatch / empty / no-regression tests. |

## Implementation Pseudocode

```ts
// --- pageInlineEditContract.ts ---
import { sanitizeAuthoringRichTextHtml } from "./pageAuthoringSanitizers";

// 1) Target type gains an optional, defaulted-false rich flag.
export type InlineEditableTarget = {
  blockType: PageBlockType;
  propPath: string;
  multiline: boolean;
  allowEmpty: boolean;
  /** Rich targets sanitize-and-preserve allowlisted HTML instead of stripping to text. */
  preserveMarkup?: boolean;
};

// 2) resolveInlineEditTarget: stop returning null for format === "rich".
if (target.propPath === propPath) {
  if (block.type === "text" && propPath === "text" && block.props.format === "rich") {
    // Was: return null;  (panel-only fail-closed gate)
    return typeof block.props[propPath] === "string"
      ? Object.freeze({ ...target, preserveMarkup: true })
      : null; // non-string stored value still fails closed
  }
  return typeof block.props[propPath] === "string" ? target : null;
}

// 3) New rich sanitizer: delegate tag preservation to the shared sanitizer,
//    keep line-ending + control-char hygiene. NEVER calls stripInlineMarkup.
export function sanitizeInlineRichText(
  target: InlineEditableTarget,
  raw: string
): string {
  const normalizedLineEndings = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n");
  const cleaned = removeControlCharacters(normalizedLineEndings);
  // Shared allowlist policy: keeps pageRichTextAllowedTags, drops
  // dangerousHtmlContentTagSet + their content, validates <a href>,
  // returns "" for non-string input (fail closed).
  return sanitizeAuthoringRichTextHtml(cleaned).trim();
}

// 4) commitInlineText: dispatch on preserveMarkup; empty-commit policy unchanged.
export function commitInlineText(
  target: InlineEditableTarget,
  previous: string,
  raw: string
): string {
  const next = target.preserveMarkup
    ? sanitizeInlineRichText(target, raw)
    : sanitizeInlineText(target, raw); // plain-text path, still strips markup
  if (next.length === 0 && !target.allowEmpty) return previous;
  return next;
}
```

**Data flow.** canvas `contentEditable` innerHTML →
`commitInlineText(target{preserveMarkup}, previous, rawHtml)` →
`sanitizeInlineRichText` → `sanitizeAuthoringRichTextHtml` (allowlist +
dangerous-tag drop + `<a href>` validation) → trimmed safe HTML →
`block.props.text`. The renderer independently re-runs
`sanitizeAuthoringRichTextHtml` → `renderSanitizedRichTextHtml`, so the stored
value is sanitized on both write and render (defense in depth, no
`dangerouslySetInnerHTML`).

**Error handling.**

- Non-string stored value → `null` (fail closed; no `contentEditable` surface).
- Hostile input → dangerous tags/content + unsafe attrs stripped; output contains
  only `pageRichTextAllowedTags`.
- Empty sanitized result on a required target → `previous` retained (no hollowing).
- Sanitizer returns `""` for any non-string, so the empty-commit guard catches it.

**Regression-test shape** — `tests/vitest/services/page-inline-edit-contract.test.ts`:

```ts
// resolveInlineEditTarget: rich block now resolves (was null)
const rich = /* text block, props.text = "<strong>Bold</strong> text", format: "rich" */;
const target = resolveInlineEditTarget(rich, "text");
expect(target).not.toBeNull();
expect(target?.preserveMarkup).toBe(true);

// non-string rich text still fails closed
expect(resolveInlineEditTarget(/* rich block, props.text = 42 */, "text")).toBeNull();

// sanitizeInlineRichText preserves allowlisted markup...
const safe = sanitizeInlineRichText(target!, "<strong>Bold</strong> and <em>italic</em>");
expect(safe).toContain("<strong>");
expect(safe).toContain("<em>");

// ...and drops dangerous tags + content
const hostile = sanitizeInlineRichText(target!, "<strong>ok</strong><script>alert(1)</script>");
expect(hostile).not.toContain("script");
expect(hostile).toContain("<strong>");

// commitInlineText dispatches rich vs plain
expect(commitInlineText(target!, "<strong>old</strong>", "<em>new</em>")).toContain("<em>");
// empty rich commit keeps previous (required field, no hollowing)
expect(commitInlineText(target!, "<strong>old</strong>", "   ")).toBe("<strong>old</strong>");
// plain-text targets STILL strip markup (no regression)
const headingTarget = resolveInlineEditTarget(/* heading block */, "text")!;
expect(commitInlineText(headingTarget, "old", "<b>x</b>")).toBe("x");
```

Reuse the sanitizer-fidelity shape already proven in
`tests/vitest/pages/page-authoring-sanitizers.test.ts:65–77` (keeps `<strong>`,
`<a href>`; rejects `onclick`, `<script>`, `javascript:`).

## Security Contract

- **Endpoint visibility:** none; Bun-free domain contract.
- **Auth / RBAC / CSRF / Rate-limit:** n/a.
- **Validation:** single shared allowlist; `dangerousHtmlContentTagSet` dropped;
  `<a href>` validated and re-emitted `rel="nofollow noreferrer"`; non-string
  fails closed; empty-commit policy preserved.
- **Boundary:** import must not break the Bun-free / no-DOM / no-admin-UI
  boundary; `pageAuthoringSanitizers` → `postRichTextHtmlUtils` is pure string.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts`
- `bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None at leaf level; closure docs handled in TASK-469-03.

## Acceptance Criteria

1. Rich string block resolves with `preserveMarkup === true`; non-string → `null`.
2. `sanitizeInlineRichText` output equals trimmed `sanitizeAuthoringRichTextHtml`;
   no `stripInlineMarkup` on the rich path.
3. `commitInlineText` dispatches correctly; empty required commit keeps previous.
4. Plain-text targets unchanged; suite stays Bun-free and green.
