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
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:63-68,90,104,121-133,150-160`
  for manual slot/config sync, CSS-variable color picker drift, span
  validation/preview, asymmetric span truthfulness, masonry cardize
  truthfulness, and cardize Advanced drift.
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:187-191,212-217` for public
  `Column 1/2` label leakage and empty placeholder risk.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Section `Empty region.` in public output | Consume TASK-256-03 render-context placeholder gating and verify this report closes for Section | TASK-256-03 owns the shared placeholder contract; `section.tsx` may only adopt that helper in the same dependency slice | None |
| Section anchor accepts invalid IDs | Fix here with schema/editor validation and tests | `SectionEditors.tsx`, `section.tsx` | None |
| Section resolver fallback and duplicated Advanced style controls | Fix here because current controls/defaults are misleading | `SectionEditors.tsx`, `section.tsx` | None |
| Section `Wide`/`Content` duplicate semantics and bleed variant copy | Relabel or disable the existing duplicated controls so the editor matches current runtime behavior; do not add new layout semantics here | `SectionEditors.tsx`, `section.tsx` | Product-level layout semantics route to TASK-283 |
| Section heading level control | Repair current hardcoded invalid hierarchy using existing section title/structure data; do not add a new heading-level schema here | `section.tsx` | Heading-level product controls route to TASK-283 |
| Section fullscreen/min-height, horizontal region layouts, text typography controls, background media, presets, responsive padding, shadows, custom region names | Product scope in TASK-283; TASK-256 only fixes current misleading controls named above | `TASK-283` family | TASK-256-08 references TASK-283 instead of creating duplicate Section follow-ups |
| Grid `asymmetric` variant does not update existing explicit spans | Fix here through variant-aware span reconciliation or editor warning | `GridColumnsEditors.tsx`, `gridColumns.tsx` | None |
| Grid `masonry-lite` forces cardized render while switch stays off | Fix here by synchronizing switch state, disabling the switch with explanation, or making renderer honor the visible switch | `GridColumnsEditors.tsx`, `gridColumns.tsx` | None |
| Grid color picker does not represent CSS variables | Fix here through token-aware picker display that preserves `var(...)` values | `GridColumnsEditors.tsx`, shared picker helper if reused | None |
| Grid span preview and span-sum validation | Add warning/disabled-state feedback for current span controls that can create broken layouts; richer preview UX routes to TASK-271 | `GridColumnsEditors.tsx` | TASK-256-08 references TASK-271 for expanded editor UX |
| Grid `Column 1/2` public labels | Consume TASK-256-03 editor-metadata/public-placeholder gating and verify this report closes for Grid Columns | TASK-256-03 owns shared slot label/placeholder metadata; `gridColumns.tsx` may only adopt that helper in the same dependency slice | Caption feature routes to TASK-271 |
| Grid slot/config count drift | Consume TASK-256-03 repeatable slot-target metadata and reconcile Grid Columns editor data against it | `GridColumnsEditors.tsx`; `BlockSettings.tsx`/`core/widgets/slots.ts` stay TASK-256-03 owners for shared metadata shape | None |

## Sub-Tasks

- [ ] Verify `section` public empty-region output after TASK-256-03 render
  context lands; do not create a second placeholder contract in this leaf.
- [ ] Add section anchor validation in the editor and keep runtime output safe
  for legacy anchors.
- [ ] Relabel or disable duplicated section style/default controls,
  `Wide`/`Content` ambiguity, and bleed copy so editor-visible choices match
  runtime behavior.
- [ ] Record section fullscreen/layout/media/preset/responsive-padding feature
  requests as TASK-283 future scope during TASK-256-08 if they remain outside
  the shared-contract repair.
- [ ] Add explicit default-token guards for section style values without
  rejecting valid CSS variables.
- [ ] Reconcile `grid-columns` config rows with TASK-256-03 slot targets or add
  an explicit sync action that does not silently delete legacy config.
- [ ] Make `asymmetric` and `masonry-lite` variants truthful for existing saved
  columns by either updating spans/switch state atomically or showing an
  explicit inactive-control warning.
- [ ] Preserve and visibly represent CSS variable color tokens in grid column
  picker controls.
- [ ] Add span-sum validation or disabled-state feedback for current controls;
  leave richer preview UX to TASK-271.
- [ ] Verify public grid column labels are hidden through TASK-256-03 editor
  metadata/public-placeholder gating.
- [ ] Keep cardize-only Advanced controls hidden or disabled when cardized
  styling is inactive.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/widgets/core/section.tsx` | 180-207, 380-413 | Normalize style defaults explicitly and label headings safely. Public `Empty region.` gating is owned by TASK-256-03; this leaf verifies Section adoption instead of redefining the contract. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | 485-498, 651-667, 826-850 | Validate anchor IDs, add missing gradient clear controls, and avoid duplicated Advanced controls that mirror Visual without extra ownership. |
| `core/widgets/core/gridColumns.tsx` | 452-503 | Adopt TASK-256-03 public placeholder/label gating and verify no `Empty column.` or `Column N` editor labels leak publicly unless a real caption is configured. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | slot target helpers around 42 and editor context assembly | Shared repeatable slot target owner for TASK-256-03 only; this leaf consumes the resulting `WidgetEditorContext.slotTargets` contract. |
| `core/widgets/slots.ts` | slot topology helpers | Shared slot topology owner for TASK-256-03 only; this leaf must not introduce a second repeated-slot metadata shape. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | variant, span, color, and cardize controls | Reconcile repeated column configs from TASK-256-03 `context.slotTargets`, preserve CSS variable picker values, make `asymmetric` span changes truthful, add span feedback, and gate cardized-only controls for `masonry-lite`. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | existing suite | Add anchor, clear, and duplicated-control assertions. |
| `tests/vitest/widgets/section.test.tsx` | existing suite | Add public vs editor placeholder assertions. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | existing suite | Add slot/config sync, CSS-variable picker, span validation/preview, and cardize-control assertions. |
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
  context: WidgetEditorContext
): GridColumnsData {
  const targets = (context.slotTargets ?? []).filter(
    (target) => target.definitionId === "column"
  );
  const normalized = normalizeGridColumnsData(data);
  const existing = new Map((normalized.columns ?? []).map((column) => [column.id ?? "", column]));
  return normalizeGridColumnsData({
    ...data,
    columns: targets.map((target, index) => {
      const parsed = parseRepeatableSlotId(target.slotId);
      const columnId = parsed?.instanceId ?? String(index + 1);
      const current = existing.get(columnId) ?? normalized.columns?.[index] ?? {};
      return {
        ...current,
        id: columnId,
        label: current.label?.trim() || target.label || `Column ${index + 1}`,
      };
    }),
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
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.
- Run `bun run gates:coderso` for the completed implementation leaf.
- Run `bun run scan:security:strict`.
- Run `bun run precommit` before any manual commit or task closure commit.

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
