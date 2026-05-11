# TASK-252-06-11: Compare Timeline Two Track Segments Status and Highlight

# FileName: TASK-252-06-11_Compare_Timeline_Two_Track_Segments_Status_and_Highlight.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Define compare-timeline as a two-track dated comparison with segments,
track labels, status/current highlight, and no multi-track matrix expansion yet.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/compare-timeline/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/compare-timeline/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/compare-timeline/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: alternating two-side layout, dated event segments, track labels, and
  status/current highlight from `_docs/_WIDGETS/tmp/compare-timeline/MATRIX.md`.
  Start from the current owner fields `axis`, `tracks`, `guides`, `layout`,
  `highlight`, and `style`, then add schema-owned segment date/body/state/side
  fields plus a `highlightCurrent` path in
  `core/widgets/core/compareTimeline.tsx` when the live data model lacks them.
- Adapt: scroll narrative, progress indicator, and per-item CTA remain
  conditional; implement only when schema/defaults/normalizer/render/editor/
  tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `compare-timeline`.
- `Visual`: `Tracks`, `Segments`, `Dates`, `Status`, `Highlight`.
- `Advanced`: `Two-track diagnostics`, `Legacy segment mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/compareTimeline.tsx`
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer fields change.
- `tests/vitest/widgets/compareTimeline.test.tsx`
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/tmp/compare-timeline/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-11_Compare_Timeline_Two_Track_Segments_Status_and_Highlight.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeCompareTimelineData(data: CompareTimelineData): CompareTimelineData {
  return {
    axis: normalizeCompareTimelineAxis(data.axis),
    tracks: normalizeCompareTimelineTracks(data.tracks, data.axis?.steps?.length ?? 0),
    guides: normalizeCompareTimelineGuides(data.guides),
    layout: normalizeCompareTimelineLayout(data.layout),
    highlight: normalizeCompareTimelineHighlight(data.highlight, data.tracks),
    highlightCurrent: normalizeCompareTimelineHighlightCurrent(data.highlightCurrent, data.tracks),
    style: normalizeCompareTimelineStyle(data.style),
  };
}

function normalizeCompareTrack(item: CompareTrack, index: number, stepCount: number): CompareTrack {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `compare-timeline-${index + 1}`),
    segments: item.segments.map((segment) => normalizeCompareTrackSegment(segment, stepCount)),
  };
}

type CompareTimelineSegmentState = "past" | "current" | "future";

type CompareTimelineSegmentExtension = {
  date?: string;
  body?: string;
  side?: "left" | "right";
  state?: CompareTimelineSegmentState;
};

type CompareTimelineHighlightCurrent = {
  enabled: boolean;
  trackId?: string;
  segmentId?: string;
  state: "current";
};

function normalizeCompareTrackSegment(
  segment: CompareTrackSegment & CompareTimelineSegmentExtension,
  stepCount: number
): CompareTrackSegment & CompareTimelineSegmentExtension {
  return {
    ...segment,
    from: clampCompareTimelineStep(segment.from, stepCount),
    to: clampCompareTimelineStep(segment.to, stepCount),
    date: normalizeOptionalDateLabel(segment.date),
    body: normalizeOptionalPlainText(segment.body),
    side: normalizeTwoSide(segment.side),
    state: normalizeCompareSegmentState(segment.state),
  };
}

function normalizeCompareTimelineHighlightCurrent(
  highlightCurrent: Partial<CompareTimelineHighlightCurrent> | undefined,
  tracks: CompareTrack[]
): CompareTimelineHighlightCurrent {
  return {
    enabled: Boolean(highlightCurrent?.enabled),
    trackId: normalizeKnownCompareTrackId(highlightCurrent?.trackId, tracks),
    segmentId: normalizeKnownCompareSegmentId(highlightCurrent?.segmentId, tracks),
    state: "current",
  };
}

function CompareTimelineVisualEditor(props: WidgetEditorProps<CompareTimelineData>) {
  return (
    <WidgetEditorSection id="compare-timeline.tracks" title="Tracks">
      {props.value.tracks.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`compare-timeline.tracks.${index}.label`} label="Label" data-widget-control={`compare-timeline.tracks.${index}.label`}>
          <Input
            value={item.label ?? ""}
            onChange={(label) => props.onChange(updateCompareTimelineTrack(props.value, index, { label }))}
          />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/compare-timeline/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/compareTimeline.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `compare-timeline` output is public page/runtime output.
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
  - changed `compare-timeline` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/compareTimeline.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through a
    `core/widgets/core/widgetSafeHref.ts` helper with identical allowed/rejected
    protocol tests before render; media fields must stay on the
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
- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-11_Compare_Timeline_Two_Track_Segments_Status_and_Highlight.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `compare-timeline` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
