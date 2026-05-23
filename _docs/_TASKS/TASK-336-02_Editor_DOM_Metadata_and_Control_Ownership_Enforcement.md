# TASK-336-02: Editor DOM Metadata and Control Ownership Enforcement

# FileName: TASK-336-02_Editor_DOM_Metadata_and_Control_Ownership_Enforcement.md

**Priority:** High
**Category:** Admin UI + Widgets + Playwright Contract
**Estimated Effort:** Large
**Dependencies:** TASK-336-01
**Status:** To Do

---

## Overview

Make every widget editor mode, section, and writable control discoverable by
Vitest and Playwright through shared DOM metadata.

Current editor tests rely too much on labels, titles, and local component
structure. This makes duplicate ownership hard to detect because two modes may
render the same field with different local markup. Shared metadata is required
before the 38-widget smoke harness can be strict.

## Scope

- Add shared section/control props to `WidgetEditorControls.tsx`.
- Ensure `Wizard`, `Visual`, and `Advanced` root surfaces expose stable
  `data-widget-editor-mode` attributes.
- Ensure every section has an explicit non-title-derived
  `data-widget-editor-section`.
- Ensure writable controls can expose `data-widget-control-path` alongside the
  existing `data-widget-control` marker.
- Ensure read-only summaries and diagnostics expose a non-writable marker.
- Remove or wrap raw `div` control rows where they block ownership inspection.

## Sub-Tasks

- [ ] Extend the existing `WidgetEditorModeRoot` without changing its current
  `data-widget-editor` / `data-widget-editor-mode` contract.
- [ ] Extend the existing `WidgetEditorSection` `id` contract with optional
  `mode` and `role` metadata; do not replace `id` with a second naming model.
- [ ] Extend the existing `WidgetControlRow` and `data-widget-control` contract
  with optional `path`, `ownership`, and `readOnly` metadata.
- [ ] Add a lightweight `ReadonlyWidgetSummaryRow` for Advanced diagnostics.
- [ ] Replace local title-derived ids in the first migrated editors.
- [ ] Add Vitest coverage that renders sample modes and inspects the emitted
  DOM contract.
- [ ] Document the DOM metadata naming convention for later leaves.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` | Add shared mode/section/control metadata props and read-only summary primitive. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Use the new primitives where the shared wrapper can be adopted without changing behavior. |
| `tests/vitest/ui/widget-editor-contract-dom.test.tsx` | New focused tests for root, section, writable path, and read-only metadata. |
| `_docs/WIDGETS.md` | Add DOM metadata rules if they become part of the public contributor contract. |

## Implementation Pseudocode

```tsx
export function WidgetEditorModeRoot({
  mode,
  widgetType,
  children,
}: WidgetEditorModeRootProps) {
  return (
    <div data-widget-editor={widgetType} data-widget-editor-mode={mode}>
      {children}
    </div>
  );
}

export function WidgetEditorSection({
  mode,
  id,
  role,
  title,
  children,
}: WidgetEditorSectionProps) {
  return (
    <section
      data-widget-editor-mode={mode}
      data-widget-editor-section={id}
      data-widget-editor-section-role={role}
    >
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function WidgetControlRow({ path, readOnly, children }: WidgetControlRowProps) {
  return (
    <div
      data-widget-control-path={path}
      data-widget-control-readonly={readOnly ? "true" : undefined}
    >
      {children}
    </div>
  );
}
```

Data flow:

- Editor contract metadata and rendered DOM metadata use the same mode/section
  ids.
- Writable controls mark the persisted path they mutate.
- Read-only controls either omit `data-widget-control-path` or set
  `data-widget-control-readonly="true"` when a path is displayed as a summary.
- Playwright reads DOM metadata instead of inferring ownership from labels.

Error handling:

- Do not auto-generate ids from section titles because translated or edited
  copy would break selectors.
- Do not mark a row writable if it only displays a summary.
- Do not use raw `data-testid` as the primary ownership contract.
- If a third-party/custom control cannot expose a path, wrap it in a
  `WidgetControlRow` that owns the path metadata.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: not applicable.
- Secret handling: metadata must expose paths and roles only, never sensitive
  values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/widget-editor-contract-dom.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Regression-test shape:

- Rendering a mode root exposes `data-widget-editor-mode`.
- Rendering a section exposes explicit section id and role.
- Rendering a writable row exposes exactly one path marker.
- Rendering a read-only summary cannot be counted as writable.
- A local `EditorSection` replacement keeps accessible headings intact.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` if contributor-facing DOM metadata rules are added.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Shared editor primitives can express mode, section, role, writable path, and
  read-only summary state.
- Playwright can inspect ownership without brittle label heuristics.
- No user-facing editor behavior changes except improved markup consistency.
