# TASK-250-02-02: Selected Element Interaction and Element-Scoped Editing Flow
# FileName: TASK-250-02-02_Selected_Element_Interaction_and_Element_Scoped_Editing_Flow.md

**Priority:** High
**Category:** Coderso Custom Screens + Record Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-250-02-01
**Status:** To Do

---

## Overview

Take the current selected-element behavior in the screen-owned record editor
and harden it into a stronger, more coherent editing model so the admin record
surface feels closer to a page-like composed editor.

The baseline flow already exists today:

- the record editor keeps selected runtime block state,
- the canvas supports click-to-select and pencil-to-focus,
- the details rail already exposes a `Selected Element` area.

This leaf is about turning that baseline into a more deliberate, better-covered
interaction model instead of claiming the feature does not exist yet.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`

## Implementation Pseudocode

```tsx
function handleSelectBlock(blockId: string) {
  setSelectedRuntimeBlockId(blockId);
  openSelectedElementPanelIfNeeded();
}
```

```tsx
<SelectedElementPanel
  widget={selectedRuntimeWidget}
  bindings={selectedRuntimeBindings}
  renderBoundEditors={renderSelectedBlockBindingEditor}
/>
```

```ts
function preserveSelectedElementAcrossRefresh(input: {
  selectedBlockId: string | null;
  nextBlocks: WidgetBlock[];
}) {
  return input.nextBlocks.some((block) => block.id === input.selectedBlockId)
    ? input.selectedBlockId
    : input.nextBlocks[0]?.id ?? null;
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: record editing keeps existing `content:write` / `content:publish`
  boundaries.
- CSRF: unchanged existing entry client path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: element-scoped editors still emit only normalized
  record payload changes.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - clicking a widget activates it,
  - selected-element rail focuses the correct bound fields,
  - pencil affordance opens element-scoped editing flow,
  - selection remains stable through save/refresh where expected,
  - current behavior regressions are distinguished from genuinely new behavior.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The existing selected-element workflow is hardened into a more deliberate and
   more resilient interaction model.
2. Element-scoped editing flow is stronger and better tested.
