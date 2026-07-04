# TASK-469-02-L01: Canvas Rich ContentEditable And Panel Parity
# FileName: TASK-469-02-L01-Canvas-Rich-ContentEditable-And-Panel-Parity.md

**Parent Subtask:** TASK-469-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Admin Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-469-01-L01
**Status:** ✅ Done
**Completed:** 2026-06-20

---

## Overview

Executable leaf for the canvas wiring. In `PageAuthoringCanvas.tsx`,
`InlineEditableCanvasText` (lines ~71–156) currently renders the fail-closed
fallback when `resolveInlineEditTarget` returns `null`. With the rich-aware
contract, rich targets now resolve, so the component must seed a `contentEditable`
surface from the sanitized rich tree (`children`) and, on `onBlur` (lines
~133–142), read `innerHTML` for rich targets (plain text for the rest) and commit
through `commitInlineText`.

## Sub-Tasks

- [x] Branch the editable surface: rich targets render the sanitized rich
      `children` inside the `contentEditable`; plain targets keep text.
- [x] On commit, read `innerHTML` for rich targets and the existing plain-text
      reader otherwise; call `commitInlineText(target, previous, raw)`.
- [x] Keep the null-guard fail-closed render for non-resolving targets.
- [x] Preserve existing focus/blur/escape behavior and dirty-state semantics.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` | Rich editable branch + commit reader. |
| (canvas inline-edit UI flow suite) | Rich round-trip + plain no-regression. |

## Implementation Pseudocode

```tsx
// --- PageAuthoringCanvas.tsx : InlineEditableCanvasText (lines ~71-156) ---
const target = resolveInlineEditTarget(block, propPath);
if (!target) return <>{children ?? text}</>; // unchanged fail-closed render

// Rich targets edit the rendered tree; the surface is seeded from `children`
// (the sanitized rich JSX), NOT from the plain-text fallback.
const isRich = target.preserveMarkup === true;

// onBlur (lines ~133-142): read edited content, then commit.
const raw = isRich
  ? editableElement.innerHTML                       // rich: read HTML
  : readInlineEditableElementText(editableElement); // plain: existing reader
const committed = commitInlineText(target, previousStored, raw);
onCommit(committed); // sanitized; renderer re-sanitizes on paint
```

**Data flow.**

- Selecting/activating a rich block focuses a `contentEditable` seeded from the
  sanitized rich `children`.
- Blur reads `innerHTML`; `commitInlineText` re-sanitizes via the shared
  allowlist; the committed string updates `block.props.text`.
- The renderer (`renderTextBlock` → `sanitizeAuthoringRichTextHtml` →
  `renderSanitizedRichTextHtml`) re-sanitizes on paint — no trust in innerHTML.

**Error handling.**

- Non-resolving target → fail-closed fallback render (unchanged).
- Empty rich commit on the required `text` prop keeps the previous value.
- Escape/cancel keeps the prior value (existing behavior preserved).

**Regression-test shape.**

```ts
test("rich block inline edit preserves markup and matches panel persistence", async () => {
  // render canvas with a format:"rich" text block, focus inline, set innerHTML
  // "<strong>Bold</strong> and <a href='https://x.test'>link</a>", blur.
  // expect committed block.props.text to contain <strong> and a sanitized <a href>.
});

test("plain-text inline edit still strips markup (no regression)", async () => {
  // heading block inline edit "<b>x</b>" commits "x".
});
```

## Security Contract

- **Endpoint visibility:** none; admin UI.
- **Auth / RBAC:** existing `content:write`.
- **CSRF / Rate-limit:** unchanged.
- **Validation:** committed value is `commitInlineText` output (shared sanitizer);
  innerHTML is re-sanitized on commit and again on render; no new
  `dangerouslySetInnerHTML`.
- **React Hooks:** no synchronous `setState` in effect bodies; preserve dirty
  state and selection semantics.

## Testing Requirements

- Canvas inline-edit UI flow suite (rich round-trip + plain no-regression).
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None at leaf level; closure docs in TASK-469-03.

## Acceptance Criteria

1. Rich block inline edit preserves bold/italic/link; commit equals panel
   persistence for the same input.
2. Plain-text targets unchanged.
3. Fail-closed render preserved for non-resolving targets.
4. No new `dangerouslySetInnerHTML`; hooks lint clean.
