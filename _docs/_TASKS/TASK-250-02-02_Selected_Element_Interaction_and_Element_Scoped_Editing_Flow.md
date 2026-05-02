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
- the canvas already wraps runtime blocks in selectable affordances, but nested
  block clicks can still bubble back into ancestor wrappers,
- the details rail already exposes a `Selected Element` area, but the pencil
  path does not yet force that tab to become the active owner.

This leaf is about turning that baseline into a more deliberate, better-covered
interaction model instead of claiming the feature does not exist yet.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `tests/vitest/ui/custom-screen-records.test.tsx`
- new `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`

## Implementation Pseudocode

```tsx
function handleSelectBlock(event: React.MouseEvent, blockId: string) {
  event.stopPropagation();
  setSelectedRuntimeBlockId(blockId);
  setActiveDetailsTab("element");
}
```

```tsx
<div
  onClick={(event) => handleSelectBlock(event, block.id)}
  data-selected-block-id={block.id}
>
  {content}
</div>
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

```tsx
function handleEditBlock(blockId: string) {
  setSelectedRuntimeBlockId(blockId);
  setActiveDetailsTab("element");
  setDetailsOpen(true);
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
  - nested child clicks do not reselect an ancestor wrapper through bubbling,
  - selected-element rail focuses the correct bound fields,
  - pencil affordance opens element-scoped editing flow and activates the
    `Selected Element` tab instead of leaving `record` active,
  - selection remains stable through save/refresh where expected,
  - the interaction-heavy flow is covered by a dedicated happy-dom /
    ui-integration suite instead of only by static `renderAdminUi` smoke
    assertions; keep `custom-screen-records.test.tsx` as static shell/regression
    coverage and prove interaction semantics in the new mounted suite,
  - current behavior regressions are distinguished from genuinely new behavior.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The existing selected-element workflow is hardened into a more deliberate and
   more resilient interaction model.
2. Element-scoped editing flow is stronger and better tested.
