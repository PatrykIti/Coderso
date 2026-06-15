# TASK-464-01-L01: Map PageEditor Monolith Responsibilities And Boundaries
# FileName: TASK-464-01-L01-Map-PageEditor-Monolith-Responsibilities-And-Boundaries.md

**Parent Subtask:** TASK-464-01
**Priority:** High
**Category:** Pages / Admin UI / Architecture
**Estimated Effort:** Small
**Dependencies:** TASK-464-01
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Create the source-range and ownership map for the current
`core/admin/ui/pages/PageEditor.tsx` monolith before implementation starts.
This is a read/contract task: identify exactly which lines belong to host
lifecycle, document state, selection, canvas, floating toolbar, registry
panels, responsive panel, layers, command palette, template picker, preview,
settings, revisions, and sanitizer boundaries.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Record PageEditor source ranges by responsibility.
- [x] List target module names and their ownership boundaries.
- [x] List forbidden imports per target module.
- [x] Record dependency order for TASK-464 implementation leaves.
- [x] Update TASK-464 files if the map exposes missing leaf ownership.

---

## Implementation Pseudocode

```ts
type Responsibility = {
  name: string;
  currentFile: "core/admin/ui/pages/PageEditor.tsx";
  lineRanges: readonly SourceRange[];
  targetModule: string;
  forbiddenImports: readonly string[];
  parityTests: readonly string[];
};

function buildPageEditorResponsibilityMap(source: string): Responsibility[] {
  const ranges = locateKnownSymbols(source, [
    "PageEditorHost",
    "SectionCanvas",
    "LayerBlockRows",
    "PageEditor",
    "ToolbarSubpanel",
    "ResponsivePanelContent",
    "CommandButton"
  ]);
  return assignTargetModules(ranges);
}
```

Expected data flow:

- Read PageEditor and related tests.
- Produce documentation-only output in TASK-464 docs or `_docs/PAGE_MODEL.md`.
- Do not move code in this leaf.

Error handling:

- If a responsibility is ambiguous, record it as shared and split a follow-up
  leaf before implementation.

Regression-test shape:

- No new runtime tests required unless a missing characterization test is found.

---

## Security Contract

- No endpoints, persistence, or browser runtime behavior changes.
- The map must identify every author-controlled render/mutation sink.
- The map must keep reusable modules browser-safe by construction.

---

## Testing Requirements

- `rg -n "const SectionCanvas|const ToolbarSubpanel|const ResponsivePanelContent|const LayerBlockRows|export function PageEditor" core/admin/ui/pages/PageEditor.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
