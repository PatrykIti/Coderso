# TASK-438-01-L01: Text Inline Edit Typography Format Truthfulness And Toolbar Labeling
# FileName: TASK-438-01-L01-Text-Inline-Edit-Typography-Format-Truthfulness-And-Toolbar-Labeling.md

**Parent Subtask:** TASK-438-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-438-01, TASK-451-02
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the inline-edit and typography flows for Text, verify the toolbar-label
fallback after the TASK-451-02-L01 owner lands, and make `format:rich` produce
sanitized rich output on canvas and the published front (per the §5 block-table
row in `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md`, reproduced on HEAD during
the TASK-438-01 contract freeze). Inline-edit entry/commit machinery is owned
by TASK-422 (`core/services/pages/pageInlineEditContract.ts` targets map plus
the shared canvas contenteditable flow); this leaf only verifies the existing
`text.text` target in `inlineEditableTargets` and its behavior. Toolbar-label
derivation is owned by TASK-451-02-L01 via `resolveToolbarTargetLabel` in
`core/admin/ui/pages/editor/pageEditorOptions.ts`; this leaf only verifies the
`Text tools` fallback.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Toolbar label: derivation owned by TASK-451-02-L01
// (resolveToolbarTargetLabel in core/admin/ui/pages/editor/pageEditorOptions.ts).
// This leaf verifies the existing fallback:
expect(floatingToolbar.getAttribute("aria-label")).toBe("Text tools");

// Inline edit: machinery owned by TASK-422. Verify the existing text targets
// in the TASK-422-owned inlineEditableTargets map
// (core/services/pages/pageInlineEditContract.ts).

// Dedicated controls: verify the text panels render the shared TASK-421
// widgets resolved via getPageEditorControlsForTarget(...)
// (core/services/pages/pageEditorControlRegistry.ts:870-890) and rendered
// through the PageEditor registry control switch (text controls: text/format/
// align, registry lines 636-652).

// Rich format fix (owned here): extend the text branch of
// renderPageBlockContent (core/services/pages/pageRendererV2.tsx, case "text")
// so format === "rich" emits sanitized rich output and paints typography on the
// generated rich text nodes. The admin canvas inline-edit hook passes rich
// children with display: "block", so PageAuthoringCanvas must render a block
// wrapper instead of nesting <p>/<ul>/<ol> under <span>. Keep
// format === "plain" output unchanged.
```

Owner files:

- `core/services/pages/pageRendererV2.tsx` (text branch rich-format output)
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` (rich canvas wrapper
  selection for block children)
- `core/services/pages/pageDocumentV2.ts` (rich-content sanitization/normalize
  contract if the fix needs it)
- `core/services/pages/pageEditorControlRegistry.ts` (verify-only: text
  format/align controls already exist)
- `core/admin/ui/pages/editor/pageEditorOptions.ts` (verify-only:
  toolbar-label fallback is owned by TASK-451-02-L01)
- `core/admin/ui/pages/PageEditor.tsx` (verify-only: inline-edit machinery is
  owned by TASK-422 and consumes the shared label helper)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Text content edits on canvas and in the inspector share the one owner path
  registered in the TASK-422 inline-edit contract.
- After TASK-451-02-L01 lands, the floating toolbar reads `Text tools` for
  default/placeholder text content (verified here, not implemented here).
- Acceptance: `format:rich` must produce sanitized rich output on canvas and
  the published front, with regression evidence; `format:plain` keeps the
  current plain output.

Error handling:

- Unsupported format values fall back to `plain`.
- Empty required text falls back to the current valid value.

Regression-test shape:

- Vitest UI coverage for inline edit, toolbar-label verification (`Text
  tools`), format changes, and front runtime truthfulness, including a
  renderer regression that proves `format:rich` no longer renders plain and a
  mounted canvas regression that proves rich block children are not nested under
  an inline `<span>`.

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



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
