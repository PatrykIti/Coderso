# TASK-438-01-L01: Text Inline Edit Typography Format Truthfulness And Toolbar Labeling
# FileName: TASK-438-01-L01-Text-Inline-Edit-Typography-Format-Truthfulness-And-Toolbar-Labeling.md

**Parent Subtask:** TASK-438-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-438-01, TASK-451-02
**Status:** ⏳ To Do

---

## Overview

Adopt the inline-edit and typography flows for Text, verify the toolbar-label
fallback after the TASK-451-02-L01 owner lands, and make `format:rich` produce
sanitized rich output on canvas and the published front (per the §5 block-table
row in `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md`, reproduced on HEAD during
the TASK-438-01 contract freeze). Inline-edit entry/commit machinery is owned
by TASK-422 (`core/services/pages/pageInlineEditContract.ts` targets map plus
the shared canvas contenteditable flow); this leaf only registers the text
targets in `inlineEditableTargets` and verifies behavior. Toolbar-label
derivation is owned by TASK-451-02-L01 via
`resolveToolbarTargetLabel(target, { fallbackToTypeName: true })` (new helper,
to be created in `core/admin/ui/pages/PageEditor.tsx`); this leaf only verifies
the `Text tools` fallback.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Toolbar label: derivation owned by TASK-451-02-L01
// (resolveToolbarTargetLabel(target, { fallbackToTypeName: true }) in
// core/admin/ui/pages/PageEditor.tsx). This leaf only verifies the fallback
// once the owner lands:
expect(floatingToolbar.getAttribute("aria-label")).toBe("Text tools");

// Inline edit: machinery owned by TASK-422. Register/verify the text targets
// in the TASK-422-owned inlineEditableTargets map
// (core/services/pages/pageInlineEditContract.ts).

// Dedicated controls: verify the text panels render the shared TASK-421
// widgets resolved via getPageEditorControlsForTarget(...)
// (core/services/pages/pageEditorControlRegistry.ts:508) and rendered through
// RegistryControlField in core/admin/ui/pages/PageEditor.tsx (text controls:
// text/format/align, registry lines ~375-387).

// Rich format fix (owned here): extend the text branch of
// renderPageBlockContent (core/services/pages/pageRendererV2.tsx, case "text")
// so format === "rich" emits sanitized rich output instead of the current
// plain readText() <p>; keep format === "plain" output unchanged.
```

Owner files:

- `core/services/pages/pageRendererV2.tsx` (text branch rich-format output)
- `core/services/pages/pageDocumentV2.ts` (rich-content sanitization/normalize
  contract if the fix needs it)
- `core/services/pages/pageEditorControlRegistry.ts` (verify-only: text
  format/align controls already exist)
- `core/admin/ui/pages/PageEditor.tsx` (verify-only: toolbar-label fallback is
  owned by TASK-451-02-L01; inline-edit machinery is owned by TASK-422)

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
  renderer regression that proves `format:rich` no longer renders plain.

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
