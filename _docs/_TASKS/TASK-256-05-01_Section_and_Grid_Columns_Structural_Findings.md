# TASK-256-05-01: Section and Grid Columns Structural Findings

# FileName: TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-03, TASK-256-05
**Status:** To Do

---

## Overview

Repair the structural report findings for `section` and `grid-columns` without
mixing them with unrelated structural widgets.

This leaf owns two contract classes:

- public runtime must not leak editor-only placeholders or technical labels;
- editor controls must be truthful about anchors, tokens, cardized columns, and
  slot/config synchronization.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:73-99` for gradient clear and CSS
  variable picker drift.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:252,270,280-298` for public
  `Empty region.`, anchor validation, duplicate Advanced controls, bleed, and
  heading-level issues.
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:63,90,104,150-160` for
  manual slot/config sync and cardize Advanced drift.
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:187-191,212-217` for public
  `Column 1/2` label leakage and empty placeholder risk.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Section `Empty region.` in public output | Fix here through TASK-256-03 render context | `section.tsx` | None |
| Section anchor accepts invalid IDs | Fix here with schema/editor validation and tests | `SectionEditors.tsx`, `section.tsx` | None |
| Section heading level control | Fix if existing report confirms hardcoded invalid hierarchy; otherwise defer with report note | `section.tsx` | TASK-256-08 creates future task if it becomes product scope |
| Grid `Column 1/2` public labels | Treat as editor metadata and hide publicly unless a real caption field is introduced | `gridColumns.tsx` | Caption feature is future scope |
| Grid slot/config count drift | Fix here | `GridColumnsEditors.tsx`, `VisualPanel.tsx` slot metadata | None |

## Sub-Tasks

- [ ] Gate `section` public empty-region output through the TASK-256-03 render
  context.
- [ ] Add section anchor validation in the editor and keep runtime output safe
  for legacy anchors.
- [ ] Add explicit default-token guards for section style values without
  rejecting valid CSS variables.
- [ ] Reconcile `grid-columns` config rows with slot targets or add an explicit
  sync action that does not silently delete legacy config.
- [ ] Hide public grid column labels that are editor metadata.
- [ ] Keep cardize-only Advanced controls hidden or disabled when cardized
  styling is inactive.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/widgets/core/section.tsx` | 180-207, 380-413 | Normalize style defaults explicitly, label headings safely, and render `Empty region.` only for editor/admin preview. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | 59-99, 159-215 | Validate anchor IDs, add missing clear controls, and avoid duplicated Advanced controls that mirror Visual without extra ownership. |
| `core/widgets/core/gridColumns.tsx` | 452-503 | Hide public `Empty column.` and `Column N` editor labels unless a real caption is configured. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | column config sections | Reconcile repeated column configs with slot targets and gate cardized-only controls. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | existing suite | Add anchor, clear, and duplicated-control assertions. |
| `tests/vitest/widgets/section.test.tsx` | existing suite | Add public vs editor placeholder assertions. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | existing suite | Add slot/config sync and cardize-control assertions. |
| `tests/vitest/widgets/gridColumns.test.tsx` | existing suite | Add public label/placeholder assertions. |

## Implementation Pseudocode

Section placeholder:

```tsx
function renderSectionRegion({ children, renderContext }: SectionRegionProps) {
  if (children) return children;
  if (renderContext?.mode !== "editor-preview" && renderContext?.mode !== "admin-preview") {
    return null;
  }
  return <EmptySlotPlaceholder label="Empty region." />;
}
```

Grid sync:

```tsx
function reconcileColumnConfigsWithSlotTargets(
  data: GridColumnsData,
  targets: Array<{ slotId: string; label: string }>
): GridColumnsData {
  const existing = new Map(normalizeGridColumnsData(data).columns.map((column) => [column.slotId, column]));
  return normalizeGridColumnsData({
    ...data,
    columns: targets.map((target, index) =>
      normalizeGridColumnConfig(existing.get(target.slotId), {
        slotId: target.slotId,
        label: target.label,
        index,
      })
    ),
  });
}
```

Error handling:

- Legacy grid configs without current slots stay in persisted data until the
  editor user confirms a sync.
- Invalid section anchors show editor feedback and are stripped or ignored at
  render time rather than emitted into public DOM.
- CSS variable color values remain valid; only picker fallback display changes.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update widget validator tests if schemas change.
- Anti-abuse: no admin placeholder copy, debug IDs, unsafe anchors, or duplicate
  public DOM IDs may leak into runtime output.
- Secret handling: no secrets in widget data, diagnostics, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- Run `tests/unit/widgets/validator.test.ts` and `tests/unit/widgets/registry.test.ts`
  if schema/defaults change.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` and
  `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md`.
- Update `_docs/_WIDGETS/SECTION.md` and `_docs/_WIDGETS/GRID_COLUMNS.md` when
  editor/runtime behavior changes.
- Update `_docs/WIDGETS.md` only if the shared placeholder/slot contract changes.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Public runtime contains no section/grid editor placeholders or technical
  column labels.
- Section anchors are validated and safe.
- Grid config and slot targets cannot silently drift.
- Tests cover both editor affordances and public runtime output.
