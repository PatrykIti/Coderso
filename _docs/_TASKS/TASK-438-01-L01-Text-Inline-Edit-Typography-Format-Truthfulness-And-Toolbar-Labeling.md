# TASK-438-01-L01: Text Inline Edit Typography Format Truthfulness And Toolbar Labeling
# FileName: TASK-438-01-L01-Text-Inline-Edit-Typography-Format-Truthfulness-And-Toolbar-Labeling.md

**Parent Subtask:** TASK-438-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-438-01
**Status:** ⏳ To Do

---

## Overview

Adopt the inline-edit and typography flows for Text, normalize the toolbar label
away from placeholder copy, and keep `plain`/`rich` behavior truthful across
editor and front runtime.

---

## Implementation Pseudocode

```tsx
const toolbarLabel = resolveBlockToolbarLabel(block, { fallback: "Text" });
renderInlineEditableText(block.props.text);
renderTextFormatControls(block.props.format);
```

Expected data flow:

- Text content edits on canvas and in the inspector share one owner path.
- Toolbar labels prefer stable human names over placeholder copy.
- `plain` vs `rich` continues to map to real runtime behavior.

Error handling:

- Unsupported format values fall back to `plain`.
- Empty required text falls back to the current valid value.

Regression-test shape:

- Vitest UI coverage for inline edit, toolbar labels, format changes, and front
  runtime truthfulness.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Text fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

