# TASK-464-07: Compose Slim PageEditor Shell And Close Validation
# FileName: TASK-464-07-Compose-Slim-PageEditor-Shell-And-Close-Validation.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-464-01, TASK-464-02, TASK-464-03, TASK-464-04, TASK-464-05, TASK-464-06
**Status:** ⏳ To Do

---

## Overview

Recompose `core/admin/ui/pages/PageEditor.tsx` as a slim orchestrator over the
extracted modules and close the modularization family with full validation.
The final PageEditor should own host lifecycle, save/publish/preview/settings
orchestration, cache/hydration discipline, and document state, while reusable
modules own canvas, floating toolbar, layers, command palette, template picker,
and sanitizer-safe authoring surfaces.

Hard constraint: **no UX/UI changes**. Final closure must prove Pages, Page
Templates, and Menu Design behave and look the same after modularization.

---

## Sub-Tasks

- [ ] [TASK-464-07-L01](TASK-464-07-L01-Compose-Slim-Shell-And-Remove-Duplicates.md): Compose slim shell and remove duplicates.
- [ ] [TASK-464-07-L02](TASK-464-07-L02-Final-Parity-Security-Docs-And-Changelog-Closure.md): Final parity, security, docs, and changelog closure.

---

## Implementation Pseudocode

```tsx
export function PageEditor(props: PageEditorProps) {
  const host = usePageEditorHost(props.host);
  const documentState = usePageEditorDocumentState(host, props);
  const selection = usePageEditorSelection(documentState.document);
  const toolbar = usePageEditorToolbarState(host);
  const actions = usePageEditorActions({ host, documentState, selection, toolbar });

  return (
    <PageEditorShell host={host} documentState={documentState}>
      <PageEditorCommandPalette state={actions.commandPalette} />
      <PageAuthoringCanvas
        document={documentState.document}
        selection={selection.resolved}
        device={documentState.device}
        actions={actions.canvas}
      />
      <FloatingEditorToolbar
        targetLabel={selection.toolbarLabel}
        panels={actions.toolbarPanels}
        actions={actions.toolbarActions}
      />
      <PageEditorLayers state={actions.layers} />
    </PageEditorShell>
  );
}
```

Expected data flow:

- The shell remains the only place that talks to host load/save/publish/preview
  callbacks and admin cache lifecycle.
- Reusable modules receive immutable document data plus typed callbacks.
- Sanitizer helpers sit on mutation boundaries, not only render boundaries.
- Pages, Page Templates, and Menu Design continue to use the same host seam.

Error handling:

- Existing save/publish/autosave/preview/settings/revision error messages and
  fallback behavior remain unchanged.
- Module errors should be prevented by type and sanitizer boundaries; do not add
  broad catch-all UI that hides actionable errors.

Regression-test shape:

- Existing PageEditor UI tests remain green.
- New module tests remain green.
- Admin build and boundary guard prove browser-safe imports.
- Real browser smoke compares representative pre/post behaviors: select
  section, select block, edit text, switch panels, adjust controls, use layers,
  insert block, apply template, preview, save, publish, and use Menu Design
  appearance panel.

---

## Security Contract

- No new endpoints.
- No route auth/RBAC/CSRF/rate-limit changes.
- Final import graph must preserve TASK-462 admin browser boundary.
- Final authoring paths must preserve TASK-463 sanitized rendering guarantees.
- Reusable modules must be safe for future CMS surfaces by default: typed
  callbacks, no raw HTML sinks, no server imports, and sanitizer helpers on
  mutation boundaries.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- Targeted pure Vitest suites created by TASK-464-02 through TASK-464-06.
- `bun run scan:security:strict` where local scanner tooling is available;
  otherwise record which scanner steps remain CI-only.
- Real browser smoke for Pages, Page Templates, and Menu Design.
- `bun run precommit` before manual commit.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md` if reusable CMS authoring surface rules change.
- `_docs/SECURITY_SPEC.md` if sanitizer/scanner contract changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`
