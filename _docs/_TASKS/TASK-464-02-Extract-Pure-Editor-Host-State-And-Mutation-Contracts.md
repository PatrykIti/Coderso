# TASK-464-02: Extract Pure Editor Host State And Mutation Contracts
# FileName: TASK-464-02-Extract-Pure-Editor-Host-State-And-Mutation-Contracts.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-464-01
**Status:** ⏳ To Do

---

## Overview

Move Page Editor host types, selection state, toolbar state, device state, and
mutation callback contracts out of `PageEditor.tsx` into browser-safe modules.
This task should not extract major JSX. It prepares later canvas and toolbar
work by giving them stable typed inputs instead of reaching into the
monolithic component.

Hard constraint: **no UX/UI changes**. State extraction must preserve the same
initial selection, active panel defaults, toolbar collapsed/drag behavior,
dirty-state transitions, selected block path semantics, and host behavior.

---

## Sub-Tasks

- [ ] [TASK-464-02-L01](TASK-464-02-L01-Extract-Host-Contracts-And-Import-Guards.md): Extract host contracts and import guards.
- [ ] [TASK-464-02-L02](TASK-464-02-L02-Extract-Selection-Device-And-Toolbar-State-Helpers.md): Extract selection, device, and toolbar state helpers.
- [ ] [TASK-464-02-L03](TASK-464-02-L03-Extract-Typed-Mutation-Action-Groups.md): Extract typed mutation action groups.

---

## Implementation Pseudocode

```ts
export type PageEditorSelectionState = {
  selectedSectionId: string | null;
  selectedBlockPath: PageBlockPath | null;
};

export function resolvePageEditorSelection(
  document: PageDocumentV2,
  state: PageEditorSelectionState
): ResolvedPageEditorSelection {
  const section = findSection(document, state.selectedSectionId);
  const block = section && state.selectedBlockPath
    ? getPageBlockAtPath(section, state.selectedBlockPath)
    : null;
  return { section, block, selectedBlockId: block?.id ?? null };
}

export type PageEditorToolbarState = {
  activePanel: ToolbarPanel | null;
  collapsed: boolean;
  offset: { x: number; y: number };
};
```

Expected data flow:

- `PageEditor` remains the owner of React state, but state shape and pure
  derivations move to extracted modules.
- Canvas, toolbar, layers, and command modules receive typed state and typed
  mutation groups instead of importing each other.
- Host contracts stay page-document oriented but browser-safe.

Error handling:

- Invalid selected block paths resolve to `null` and must not throw during
  render.
- Host callbacks keep current error mapping in `PageEditor`; extraction must
  not swallow save/publish/autosave errors.

Regression-test shape:

- Pure tests cover selection derivation, stale path handling, active panel
  defaults for hosts with and without `appearancePanel`, and toolbar clearance
  calculations if extracted.
- Existing UI tests prove the visible behavior did not change.

---

## Security Contract

- Extracted modules must be import-safe for the admin browser bundle.
- No extracted state module may import admin API clients, cache clients,
  server/runtime modules, or storage/provider/auth dependencies.
- Mutation contracts must remain typed; no `any` payload escape hatches.

---

## Testing Requirements

- New targeted Vitest suite for extracted host/state helpers.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if exported host/state contracts become part of the
  reusable editor contract.
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
