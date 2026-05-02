# TASK-250-03-02: `admin-editor-view` Registry, Picker, and Surface Contract Coverage
# FileName: TASK-250-03-02_Admin_Editor_View_Registry_Picker_and_Surface_Coverage.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Registry QA
**Estimated Effort:** Medium
**Dependencies:** TASK-250-03-01
**Status:** To Do

---

## Overview

Add end-to-end assertions for the real `admin-editor-view` widget contract so
screen widget metadata, surface filtering, and picker composition cannot drift
without tests failing.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/registry.ts`
- `core/widgets/core/index.ts`
- `tests/unit/widgets/registry.test.ts`
- `tests/unit/widgets/runtimeRegistry.test.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- new `tests/vitest/ui/custom-screen-widget-picker.test.tsx`

## Implementation Pseudocode

```ts
expect(listRegisteredWidgetsForSurface({
  surface: "admin-editor-view",
  contentType,
}).map((widget) => widget.type)).toEqual([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);
```

```tsx
render(<CustomScreenEditorPage />);
expect(leftPicker).toContain("Screen Record Header");
expect(leftPicker).toContain("Screen Field Value");
expect(leftPicker).not.toContain("Hero");
```

## Security Contract

- Visibility: internal admin UI metadata only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged current screen editor permission model.
- CSRF: none; this leaf is metadata/test coverage work.
- Rate-limit bucket: none; this leaf is metadata/test coverage work.
- Reject-unknown validation: registry tests must assert the actual concrete
  screen widget metadata, not only generic dummy definitions.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun/Vitest:
  - concrete `screen-*` metadata is asserted for `admin-editor-view`,
  - picker composition is asserted through `CustomScreenEditorPage`,
  - runtime registry re-registration still covers screen widgets.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Concrete `screen-*` registry metadata is covered, not only generic registry
   normalization.
2. The actual left picker for `admin-editor-view` is test-covered.
