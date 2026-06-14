# TASK-464-01: Contract Freeze Module Map And UI Parity Baseline
# FileName: TASK-464-01-Contract-Freeze-Module-Map-And-UI-Parity-Baseline.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Architecture
**Estimated Effort:** Medium
**Dependencies:** TASK-464
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Freeze the Page Editor modularization contract before implementation. This
task maps the current `PageEditor.tsx` responsibilities, defines module
ownership, records browser-safe dependency boundaries, and creates UI/UX parity
baselines that every later extraction task must preserve.

Hard constraint: **no UX/UI changes**. The baseline must cover visible layout,
copy, button/icon order, panel order, drag/collapse behavior, selected
section/block behavior, command palette behavior, layers overlay behavior,
template insertion behavior, Page Templates behavior, and Menu Design behavior.

---

## Sub-Tasks

- [x] [TASK-464-01-L01](TASK-464-01-L01-Map-PageEditor-Monolith-Responsibilities-And-Boundaries.md): Map PageEditor monolith responsibilities and boundaries.
- [x] [TASK-464-01-L02](TASK-464-01-L02-Capture-UI-Parity-Characterization-Baseline.md): Capture UI parity characterization baseline.

---

## Implementation Pseudocode

```ts
type PageEditorModuleMap = {
  host: SourceRange[];
  state: SourceRange[];
  canvas: SourceRange[];
  floatingToolbar: SourceRange[];
  registryPanels: SourceRange[];
  layers: SourceRange[];
  commandPalette: SourceRange[];
  templatePicker: SourceRange[];
  security: SourceRange[];
};

function freezePageEditorModularContract(): PageEditorModuleMap {
  const ranges = inspectPageEditorSource("core/admin/ui/pages/PageEditor.tsx");
  assertNoUxChangesPlanned(ranges);
  assertBrowserSafeBoundaries(ranges);
  return writeArchitectureContract(ranges);
}
```

Expected data flow:

- The task reads source/docs/tests and writes only documentation plus focused
  characterization tests if the current coverage does not protect a planned
  extraction seam.
- The module map must identify which module owns each user-visible surface and
  which tests prove parity.
- The contract must explicitly state that extracted modules receive data and
  callbacks from the host shell instead of importing admin clients directly.

Error handling:

- If a responsibility cannot be cleanly assigned, split it into a follow-up
  child task before extraction starts.
- If a baseline test currently fails for unrelated reasons, record it and add a
  narrow characterization test that isolates the refactor seam.

Regression-test shape:

- Tests should assert existing DOM/data-attribute shape for representative
  selections and panels.
- Tests should protect Pages, Page Templates, and Menu Design host behavior.
- No snapshot should be so broad that harmless whitespace churn blocks future
  work; prefer semantic DOM assertions for visible parity.

---

## Security Contract

- No routes or persistence changes.
- The contract must list forbidden imports for reusable modules: DB, server,
  runtime loaders, storage adapters, provider SDKs, auth hashing, and secret
  stores.
- The contract must identify every current admin rendering path that accepts
  user-controlled text, URL, media, style, or HTML-like data.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_TASKS/README.md`
