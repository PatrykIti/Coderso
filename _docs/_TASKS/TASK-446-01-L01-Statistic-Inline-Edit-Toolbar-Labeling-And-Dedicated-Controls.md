# TASK-446-01-L01: Statistic Inline Edit Toolbar Labeling And Dedicated Controls
# FileName: TASK-446-01-L01-Statistic-Inline-Edit-Toolbar-Labeling-And-Dedicated-Controls.md

**Parent Subtask:** TASK-446-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-446-01, TASK-451-02
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the shared inline-edit and dedicated control paths for Statistic and
verify the toolbar label reads `Statistic tools` instead of transient default
content like `0 tools`. Toolbar-label derivation is owned by TASK-451-02-L01
via `resolveToolbarTargetLabel` in
`core/admin/ui/pages/editor/pageEditorOptions.ts`; this leaf only verifies the
statistic fallback. Inline-edit
entry/commit machinery is owned by TASK-422
(`core/services/pages/pageInlineEditContract.ts` targets map plus the shared
canvas contenteditable flow); this leaf only verifies the existing statistic
value/label/caption targets in `inlineEditableTargets`.

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
expect(floatingToolbar.getAttribute("aria-label")).toBe("Statistic tools");

// Inline edit: machinery owned by TASK-422. Verify the existing statistic
// value/label/caption targets in the TASK-422-owned inlineEditableTargets map
// (core/services/pages/pageInlineEditContract.ts).

// Dedicated controls: verify the statistic panels render the shared TASK-421
// widgets resolved via getPageEditorControlsForTarget(...)
// (core/services/pages/pageEditorControlRegistry.ts:870-890) and rendered
// through PageEditor.
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx` (verify-only: toolbar-label fallback is
  consumed here; inline-edit machinery is owned by TASK-422)
- `core/admin/ui/pages/editor/pageEditorOptions.ts` (verify-only:
  `resolveToolbarTargetLabel`)
- `core/services/pages/pageEditorControlRegistry.ts` (verify-only: statistic
  control entries resolved through `getPageEditorControlsForTarget`)
- `core/services/pages/pageRendererV2.tsx` (verify-only: published statistic
  output stays truthful)
- `core/services/pages/pageDocumentV2.ts` (verify-only: statistic
  schema/defaults stay the contract source)

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Value/label/caption edits share the one owner path registered in the
  TASK-422 inline-edit contract across canvas and inspector.
- After TASK-451-02-L01 lands, the floating toolbar reads `Statistic tools`
  instead of `0 tools` (verified here, not implemented here).
- The statistic panels render the shared TASK-421 widgets.

Error handling:

- Empty required fields fall back to current valid values.
- Unknown typography/style values fall back safely.

Regression-test shape:

- Vitest UI coverage for inline edits, the `Statistic tools` toolbar-label
  verification, and runtime output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Statistic fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Statistic runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
