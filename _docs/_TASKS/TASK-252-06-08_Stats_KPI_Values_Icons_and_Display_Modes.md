# TASK-252-06-08: Stats KPI Values Icons and Display Modes

# FileName: TASK-252-06-08_Stats_KPI_Values_Icons_and_Display_Modes.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Give stats-kpi prefix/suffix, icon, and current variant-backed display modes while keeping
trend labels and media split presentation Adapt-only and rejecting animated
counters for this stage.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/stats-kpi/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md`; for this leaf, start from the current owner fields `header`, `items`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: stat grid, prefix/suffix, icon per KPI, and stable grid/strip semantics
  from `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md`; preserve current
  `cards`/`inline` variant ownership as the grid/strip display selector and add
  schema-owned prefix/suffix/icon fields in `core/widgets/core/statsKpi.tsx`.
- Adapt: trend label/direction and new media split presentation remain
  conditional. Preserve the existing `split-highlight` variant as current
  compatibility behavior unless this leaf intentionally migrates it with
  renderer/editor/tests together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `stats-kpi`.
- `Visual`: `Stats`, `Display mode`, `Icons`, `Tone`.
- `Advanced`: `Legacy value mapping`, `No-animation diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/statsKpi.tsx`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/statsKpi.test.tsx`
- `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-08_Stats_KPI_Values_Icons_and_Display_Modes.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeStatsKpiData(data: StatsKpiData): StatsKpiData {
  return {
    header: normalizeStatsKpiHeader(data.header),
    items: normalizeStatsKpiItems(data.items),
    style: normalizeStatsKpiStyle(data.style),
  };
}

function normalizeStatsKpiItem(item: StatsKpiItem, index: number): StatsKpiItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `stats-kpi-${index + 1}`),
    prefix: normalizeOptionalText(item.prefix),
    suffix: normalizeOptionalText(item.suffix),
    icon: normalizeOptionalIcon(item.icon),
  };
}

function resolveStatsKpiDisplayMode(variant: StatsKpiVariantId): "grid" | "strip" | "legacy-split" {
  if (variant === "inline") return "strip";
  if (variant === "split-highlight") return "legacy-split";
  return "grid";
}

function StatsKpiVisualEditor(props: WidgetEditorProps<StatsKpiData>) {
  return (
    <WidgetEditorSection id="stats-kpi.items" title="KPI items">
      {props.value.items.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`stats-kpi.items.${index}.value`} label="Value" data-widget-control={`stats-kpi.items.${index}.value`}>
          <Input
            value={item.value ?? ""}
            onChange={(value) => props.onChange(updateStatsKpiItem(props.value, index, { value }))}
          />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/statsKpi.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Add or preserve schema/default/normalizer/render/editor ownership for
  `items[].prefix`, `items[].suffix`, and `items[].icon`.
- Map current variants explicitly: `cards` is grid semantics, `inline` is strip
  semantics, and `split-highlight` remains compatibility behavior unless this
  leaf intentionally migrates it with renderer/editor/tests together.
- Refactor `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `stats-kpi` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `stats-kpi` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/statsKpi.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    leaf-owned safe-href normalizer, or a shared helper extracted with tests in
    the same implementation slice, before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change; include accepted-new-field, unknown-field rejection, and
  legacy-normalization assertions for this widget.
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-08_Stats_KPI_Values_Icons_and_Display_Modes.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `stats-kpi` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
