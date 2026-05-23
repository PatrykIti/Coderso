# TASK-336-05: Search Box Mode Ownership

# FileName: TASK-336-05_Search_Box_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Search Box + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Split `search-box` into explicit mode owners and stop presenting the same
search configuration controls across all editor modes.

Search Box is a P0 contract problem because search source, user-facing copy,
visual presentation, and runtime behavior are currently too easy to mix. The
final editor must make it obvious which settings configure search behavior and
which settings affect daily visual/copy work.

## Ownership Decision

- `Wizard` owns first-time search mode, target/source selection, and minimum
  required setup.
- `Visual` owns placeholder text, button copy, visible layout, surface,
  alignment, spacing, and daily copy/presentation choices.
- `Advanced` owns read-only resolved source, query parameter diagnostics,
  debounce/runtime notes, and technical integration summaries.

Evidence caveat: the re-audit finding is source-backed, not a completed
38-widget browser traversal. TASK-336-03 admin smoke must confirm this widget
before the task can move to Done.

## Sub-Tasks

- [ ] Inventory every writable path in the current Search Box editor.
- [ ] Add `search-box` `editorContract` metadata.
- [ ] Split source/setup controls from copy and style controls.
- [ ] Move placeholder/button/display controls to Visual.
- [ ] Convert Advanced behavior/source duplicates into read-only diagnostics
  unless they are truly technical-only controls.
- [ ] Add explicit empty-state guidance for unavailable search sources.
- [ ] Add Vitest UI tests for all three modes.
- [ ] Publish a public test fixture page for `search-box` or document why the
  widget remains admin-only; record the URL or deferral in the smoke inventory.
- [ ] Add Playwright admin smoke and frontend fixture verification.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/searchBox.tsx` | Add `editorContract`; keep schema/defaults/normalize deterministic. |
| `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` | Split Wizard/Visual/Advanced mode ownership. |
| `tests/vitest/widgets/searchBox.test.tsx` | Cover schema/normalize/contract if touched. |
| `tests/vitest/ui/search-box-editor-wave.test.tsx` | Cover mode sections, writable paths, and no duplicates. |
| `_docs/_WIDGETS/SEARCH_BOX.md` | Document final ownership if the widget doc exists or is created. |

## Implementation Pseudocode

```tsx
const searchBoxEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    { mode: "wizard", id: "search-source", role: "source", title: "Search source", writablePaths: ["source.type", "source.target"] },
    { mode: "visual", id: "search-copy", role: "content", title: "Search copy", writablePaths: ["placeholder", "buttonLabel"] },
    { mode: "visual", id: "search-surface", role: "visual", title: "Search surface", writablePaths: ["style.variant", "style.align", "style.spacing"] },
    { mode: "advanced", id: "search-runtime", role: "diagnostics", title: "Runtime diagnostics", writablePaths: [], readOnlyPaths: ["source.type", "queryParam"] },
  ],
};
```

Data flow:

- Wizard sets the source once.
- Visual edits public-facing text and presentation.
- Advanced reads normalized data and renders technical summaries.
- Runtime rendering continues to use normalized widget data, not editor-mode
  state.

Error handling:

- Missing search source should render actionable setup guidance in Wizard.
- Legacy source values should normalize before editor display.
- Advanced must not expose writable raw query or provider settings unless the
  schema already supports them and the contract marks them technical-only.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict widget schema.
- Anti-abuse: no public search endpoint changes in this task.
- Secret handling: do not expose search provider secrets or private index
  settings in Advanced diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `search-box` admin modes.

Regression-test shape:

- Wizard has a source/setup section.
- Visual has copy and surface sections.
- Advanced has read-only runtime/source diagnostics.
- Placeholder/button paths are not writable outside Visual.
- Source paths are not duplicated outside Wizard unless explicitly allowed.

## Documentation Updates Required

- Update Search Box widget docs with final mode ownership.
- Append a dated TASK-336-05 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- `search-box` mode labels match actual controls.
- No duplicate writable source/copy/style paths remain.
- Admin smoke can identify all Search Box sections through DOM metadata.
