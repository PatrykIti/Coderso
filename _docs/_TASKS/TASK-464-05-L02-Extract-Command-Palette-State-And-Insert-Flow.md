# TASK-464-05-L02: Extract Command Palette State And Insert Flow
# FileName: TASK-464-05-L02-Extract-Command-Palette-State-And-Insert-Flow.md

**Parent Subtask:** TASK-464-05
**Priority:** High
**Category:** Pages / Admin UI / Command Palette
**Estimated Effort:** Medium
**Dependencies:** TASK-464-05-L01
**Status:** ⏳ To Do

---

## Overview

Extract command palette state, query filtering, active-index keyboard behavior,
section/block grouping, targeted insert flow, and add-beside insert flow.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Extract command palette state helpers.
- [ ] Extract command palette UI.
- [ ] Preserve section/block/template group order.
- [ ] Preserve keyboard behavior and active index reset.
- [ ] Add command palette tests.

---

## Implementation Pseudocode

```tsx
export function PageEditorCommandPalette(props: PageEditorCommandPaletteProps) {
  const results = resolveCommandResults({
    query: props.query,
    sections: props.sectionOptions,
    blocks: props.blockOptions,
    templates: props.templateOptions
  });
  return (
    <CommandDialog open={props.open} onOpenChange={props.onOpenChange}>
      <CommandSearch value={props.query} onChange={props.onQueryChange} onKeyDown={props.onKeyDown} />
      <CommandResults results={results} activeIndex={props.activeIndex} onRun={props.onRun} />
    </CommandDialog>
  );
}
```

Expected data flow:

- Parent owns document mutation and pending insert targets.
- Palette resolves display results and emits typed selected result.

Error handling:

- Empty results keep current empty-state behavior.
- Invalid pending target clears without mutating.

Regression-test shape:

- Query filters, keyboard up/down/enter, section insert, block insert, targeted
  insert, add-beside insert, and close behavior.

---

## Security Contract

- Option labels render as text.
- Palette cannot widen host palette/capability gates.
- No raw document patches or untrusted HTML.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
