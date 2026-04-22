# TASK-194-02-01: Template Options Loading Lifecycle and Settings Status Copy
# FileName: TASK-194-02-01_Template_Options_Loading_Lifecycle_and_Settings_Status_Copy.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-194-02
**Status:** Done (2026-04-22)

---

## Overview

Repair the template-options state model so the drawer does not look broken while
it is already usable.

Current owner seams:

- `core/admin/ui/pages/PageEditor.tsx:300-302` owns `templateOptions`,
  `templateOptionsError`, and `templateOptionsLoading`.
- `core/admin/ui/pages/PageEditor.tsx:450-475` loads template options when Page
  Settings opens.
- `core/admin/ui/pages/PageSettingsDrawer.tsx:129-159` builds a usable fallback
  option list even when the current template is not in the fetched list.
- `core/admin/ui/pages/PageSettingsDrawer.tsx:272-297` still shows
  `Loading template options...` whenever `templateOptionsLoading` is true.

That is how the report ended up with `Custom (landing)` being selectable while a
permanent loading message still suggested failure.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx:300-302`
- `core/admin/ui/pages/PageEditor.tsx:450-475`
- `core/admin/ui/pages/PageEditor.tsx:979-987`
- `core/admin/ui/pages/PageSettingsDrawer.tsx:129-159`
- `core/admin/ui/pages/PageSettingsDrawer.tsx:272-297`
- `tests/vitest/ui/page-settings-drawer.test.tsx:52-60`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx:719-831`
- `tests/vitest/admin/pagesClient.test.ts:735-745` only if the client fetch
  semantics change

## Implementation Direction

- Keep the existing lazy fetch-on-open behavior.
- Separate `blocking load` from `background refresh` in the UI copy.
- If the drawer already has at least one valid selectable option, replace the
  blocking copy with a softer background-refresh hint or hide it entirely.
- Preserve explicit error text when the fetch actually fails.
- Provide a retry affordance on failure instead of leaving the user with a dead
  status line.
- After success, prefer either silence or helper text about the selected
  template; do not keep any copy that still reads like an unresolved fetch.

## Implementation Sketch

```ts
const hasUsableTemplateChoices = resolvedTemplateOptions.length > 0;

const templateStatus =
  templateOptionsLoading && !hasUsableTemplateChoices
    ? "Loading template options..."
    : templateOptionsLoading
      ? "Refreshing theme templates..."
      : null;
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: a background-refresh hint must not suppress real API error
  messages; `templateOptionsError` still wins.

## Testing Requirements

- `tests/vitest/ui/page-settings-drawer.test.tsx`
  - blocking loading state only when there are no usable options.
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - fetch fires once on open,
  - success clears loading,
  - failure keeps explicit error copy,
  - retry reissues the fetch,
  - reopening does not regress into a stale permanent loading message.

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. A usable template dropdown no longer sits under misleading permanent loading
   copy.
2. Errors remain explicit when template loading actually fails.
3. Failed template loads offer a clear retry path.
4. The existing lazy-on-open template fetch path stays intact.
