# TASK-339-01: Shared Block Settings Daily Live Preview Surface

# FileName: TASK-339-01_Shared_Block_Settings_Daily_Live_Preview_Surface.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-317, TASK-336-16
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude not required for this shared shell leaf

---

## Overview

Remove the shared live preview row from daily `Visual` / `Advanced` tabs while
keeping the preview seam in code and preserving unfinished Wizard support.

## Source Findings

- `core/admin/ui/pages/builder/BlockSettings.tsx` renders
  `WidgetEditorLivePreview` in unfinished Wizard mode and again after the daily
  tabset.
- The user request is precise: keep the preview contract available, but remove
  it only from `Visual` / `Advanced`.
- `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` already covers the
  existing shared live-preview behavior and needs to be updated rather than
  worked around in production code.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Gate `WidgetEditorLivePreview` to unfinished Wizard mode only. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Replace daily-tab preview expectations with assertions that preview is absent after setup completion but still present in unfinished Wizard mode. |
| `tests/vitest/pageBuilder/blockSettings.test.tsx` | Keep basic shell coverage green if text or section ordering changes. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update any `BlockSettings` shell assertions that still expect the daily preview row. |

## Implementation Pseudocode

```tsx
const showLivePreviewInWizard =
  resolvedEditorContext?.surface === "page-builder" && !editorState.wizardCompleted;

if (!editorState.wizardCompleted) {
  return (
    <>
      <WizardPanel ... />
      {showLivePreviewInWizard ? <WidgetEditorLivePreview ... /> : null}
    </>
  );
}

return (
  <>
    <Tabs>...</Tabs>
    {/* no WidgetEditorLivePreview here */}
  </>
);
```

Data flow:

- Keep `previewState`, `WidgetRenderer`, and the error boundary untouched.
- Only the placement of the shared preview row changes.

Error handling:

- Do not remove the preview seam entirely.
- Do not change unfinished Wizard behavior.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`

## Documentation Updates Required

- Update this task file with closure notes.
- Update `_docs/_TASKS/README.md` on status changes.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Unfinished Wizard mode can still show the shared live preview row.
- Completed widgets on daily `Visual` / `Advanced` tabs no longer show the
  shared live preview row.
- Shared preview-state plumbing and renderer coverage remain intact.
