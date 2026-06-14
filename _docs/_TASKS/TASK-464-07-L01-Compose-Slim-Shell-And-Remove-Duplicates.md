# TASK-464-07-L01: Compose Slim Shell And Remove Duplicates
# FileName: TASK-464-07-L01-Compose-Slim-Shell-And-Remove-Duplicates.md

**Parent Subtask:** TASK-464-07
**Priority:** High
**Category:** Pages / Admin UI / Refactor Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-464-06-L03
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Replace local PageEditor JSX/helper chunks with the extracted modules and
remove duplicate helpers left behind by earlier leaves. `PageEditor.tsx` should
become a host lifecycle and orchestration shell, not the owner of every canvas
and panel detail.

Earlier leaves must already rewire `PageEditor.tsx` to consume their extracted
modules. This leaf is for removing residual duplicates and composing the final
shell. If a large residual module swap remains, split it into a physical
`TASK-464-07-S01-*` follow-up before implementing this leaf.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Compose extracted canvas module.
- [x] Compose extracted floating toolbar module.
- [x] Compose extracted layers/command/template modules.
- [x] Remove duplicated local helpers.
- [x] Verify Pages, Page Templates, and Menu Design imports.
- [x] Split residual large module swaps into `TASK-464-07-S01-*` before coding
      if this leaf no longer fits Medium effort.

---

## Implementation Pseudocode

```tsx
export function PageEditor(props: PageEditorProps) {
  const host = useResolvedPageEditorHost(props.host);
  const state = usePageEditorDocumentState(host, props);
  const selection = usePageEditorSelection(state.document);
  const actions = usePageEditorActions({ host, state, selection });
  return (
    <PageEditorShell state={state}>
      <PageEditorCommandPalette {...actions.commandPaletteProps} />
      <PageAuthoringCanvas {...actions.canvasProps} />
      <FloatingEditorToolbar {...actions.toolbarProps} />
      <PageEditorLayers {...actions.layersProps} />
    </PageEditorShell>
  );
}
```

Expected data flow:

- Host load/save/publish/preview/settings stays in shell.
- Modules receive typed props/actions only.

Error handling:

- Existing error copy and save/publish behavior remains unchanged.

Regression-test shape:

- Existing PageEditor flow suite remains green.
- PageEditor file size meaningfully drops, but no line-count target replaces
  behavior validation.

---

## Security Contract

- Final imports must preserve admin browser boundary.
- No sanitizer bypasses while composing extracted modules.
- No route changes.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
