# TASK-205-01: Content Type JSON Preview Scroll Containment
# FileName: TASK-205-01_Content_Type_JSON_Preview_Scroll_Containment.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-205
**Status:** Done (2026-04-24)

---

## Overview

Fix the content type editor right-panel JSON preview so large schemas remain
scrollable and do not push the panel beyond the viewport.

The current editor renders `ContentTypePreviewPanel` inside the `EditorShell`
right panel, but long JSON can make the preview area unusable when a content
type has many fields. The fix should identify the real scroll owner and keep the
right panel, mobile preview sheet, and editor center content independently
scrollable.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - ensure the right panel wrapper has bounded height and `min-h-0`,
  - avoid nested scroll containers that cancel the preview scroll area.
- `core/admin/ui/content-types/ContentTypePreviewPanel.tsx`
  - make the JSON area the scrollable region,
  - keep header/actions and type metadata visible,
  - support horizontal overflow for long schema lines without stretching the
    panel.
- `core/admin/ui/layouts/EditorShell.tsx`
  - change only if the shared shell is the root cause; verify other editor
    shells do not regress.
- `tests/vitest/ui/content-type-editor.test.tsx`
  - replace the current negative scroll assertion with a positive containment
    assertion.
- `tests/vitest/ui/content-type-preview-panel.test.tsx`
  - add if preview-specific rendering is easier to cover separately.

## Implementation Direction

Prefer a single bounded scroll owner around the JSON:

```tsx
<div className="flex h-full min-h-0 flex-col gap-4">
  <header>...</header>
  <ScrollArea className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40">
    <pre className="min-w-max whitespace-pre text-xs leading-relaxed">
      {JSON.stringify(schema, null, 2)}
    </pre>
  </ScrollArea>
  <footer>...</footer>
</div>
```

If `ScrollArea` does not expose native overflow in SSR tests, keep the rendered
DOM class contract explicit enough for Vitest to assert the containment.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx`
- Add `tests/vitest/ui/content-type-preview-panel.test.tsx` if the preview
  panel gets its own focused assertions.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Long JSON schemas scroll inside the preview panel on desktop.
2. Mobile schema preview sheet keeps its own scroll behavior.
3. The editor center and field settings panels remain independently usable.
4. Tests prove the preview uses bounded scroll containment instead of relying on
   page-level overflow.

## Completion Notes

- `ContentTypePreviewPanel` now owns a bounded `min-h-0 flex-1 overflow-auto`
  JSON scroll region with horizontal overflow for long schema lines.
- `ContentTypeEditor` keeps the desktop right panel and mobile preview sheet
  bounded so preview scrolling does not depend on page-level overflow.
- Covered by `tests/vitest/ui/content-type-editor.test.tsx` and
  `tests/vitest/ui/content-type-preview-panel.test.tsx`.
