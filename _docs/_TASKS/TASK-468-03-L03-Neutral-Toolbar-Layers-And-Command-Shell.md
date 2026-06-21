# TASK-468-03-L03: Neutral Toolbar Layers And Command Shell
# FileName: TASK-468-03-L03-Neutral-Toolbar-Layers-And-Command-Shell.md

**Parent Subtask:** TASK-468-03
**Priority:** High
**Category:** Admin UI / Authoring Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-468-03-L02
**Status:** ✅ Done
**Completed:** 2026-06-21

---

## Overview

Extract toolbar, layers tree, command dispatch, and inspector slot chrome into
neutral authoring modules. The extracted shell must support Page Editor and
Custom Screens without embedding Page-specific labels, publish commands, route
paths, or block registries.

2026-06-21 completion: added `AuthoringFloatingToolbar`,
`AuthoringLayersPanel`, `AuthoringCommandPalette`, and
`authoringCommands`. Screen labels, block menus, bindings, and persistence
commands are assembled by the Custom Screen adapter rather than the neutral
modules.

## Sub-Tasks

- [ ] Add neutral command descriptors and command dispatch helpers.
- [ ] Extract layers tree rendering with adapter-provided labels/icons.
- [ ] Extract toolbar slots for insert, undo/redo, viewport, preview, and save.
- [ ] Keep Page publish, page preview, and page-specific block menus in Page
  adapters.
- [ ] Add tests for disabled commands, keyboard command routing, and layers
  selection.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/authoring/AuthoringToolbar.tsx` | New neutral toolbar shell. |
| `core/admin/ui/authoring/AuthoringLayersPanel.tsx` | New neutral layers tree. |
| `core/admin/ui/authoring/authoringCommands.ts` | New command descriptor/dispatch helpers. |
| `core/admin/ui/pages/editor/**` | Replace local toolbar/layers chrome with Page adapter usage. |
| `tests/vitest/ui-integration/authoring/**` | Toolbar/layers/command coverage. |

## Implementation Pseudocode

```ts
export interface AuthoringCommand {
  id: string;
  label: string;
  icon?: LucideIcon;
  enabled: boolean;
  run(): void | Promise<void>;
}

export function runAuthoringCommand(command: AuthoringCommand): Promise<void> {
  if (!command.enabled) {
    return Promise.resolve();
  }
  return Promise.resolve(command.run());
}
```

Data flow:

- Domain adapters assemble commands from local editor state.
- Neutral toolbar renders commands and delegates execution.
- Layers tree receives a normalized read model from the adapter and emits
  neutral selection targets.

Error handling:

- Disabled commands are inert and accessible as disabled controls.
- Async command failures route to the existing toast/error boundary path.
- Missing layer nodes do not crash the panel; stale selection clears through
  adapter state reconciliation.

Regression-test shape:

```tsx
test("layers selection delegates through neutral target", async () => {
  render(<AuthoringLayersPanel nodes={nodes} selection={null} onSelect={onSelect} />);
  await user.click(screen.getByRole("treeitem", { name: "Hero title" }));
  expect(onSelect).toHaveBeenCalledWith({ kind: "block", sectionId: "hero", id: "title" });
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** save/publish commands remain owned by domain adapters.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** commands receive typed adapter data only.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** command labels and layer summaries must not expose hidden
  field values or provider settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/authoring`
- Page Editor toolbar/layers regression tests.
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/PAGE_MODEL.md`

## Acceptance Criteria

1. Toolbar, layers, and command shell are reusable through typed adapters.
2. Page-specific publish/preview/block registry logic stays outside neutral
   authoring modules.
3. Existing Page Editor toolbar and layers behavior is preserved.
