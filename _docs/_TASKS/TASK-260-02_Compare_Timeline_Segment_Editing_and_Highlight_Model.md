# TASK-260-02: Compare Timeline Segment Editing and Highlight Model

# FileName: TASK-260-02_Compare_Timeline_Segment_Editing_and_Highlight_Model.md

**Priority:** High
**Category:** Widgets + Admin UI + Data Model
**Estimated Effort:** Large
**Dependencies:** TASK-260, TASK-260-01
**Status:** To Do

---

## Overview

Repair Compare Timeline segment and highlight editing gaps from
`REPORT_COMPARE_TIMELINE_WIDGET.md` without widening into a shared editor-mode
contract.

This leaf covers C1, C2, C3, W1, U2, U3, U6, U7, and U8. It keeps segment
data schema-owned by `core/widgets/core/compareTimeline.tsx` and editor UX owned
by `CompareTimelineEditors.tsx`.

## Sub-Tasks

- [ ] Expose `SegmentEditor` for both tracks in the
  `dual-track-highlight` Visual editor, not only the selected target track.
- [ ] Decide whether W1 requires a new bounded highlight model
  (`targetTrackId: "a" | "b" | "both"` or an explicit `highlight.trackIds[]`)
  and implement it only with schema/defaults/normalizer/tests.
- [ ] Add basic Wizard segment setup when highlight mode is enabled, limited to
  beginner-safe add/edit/remove controls.
- [ ] Keep `dual-track` variant segment data non-destructive and show clear
  editor copy that segments are preserved but hidden until highlight mode is
  enabled.
- [ ] Add immediate editor feedback when `from > to` before normalization
  rewrites the range.
- [ ] Improve segment label placeholder/help so fallback text is visible before
  render.
- [ ] Warn when a track has no active markers and explain the visual result.
- [ ] Render Advanced target-track options as label plus stable ID instead of
  raw `a`/`b` IDs only.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Extend highlight model only if W1 is implemented; keep legacy `targetTrackId` payloads backward compatible. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Update Visual/Wizard/Advanced segment and target-track controls with non-destructive variant messaging and range feedback. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Add normalizer/schema coverage for any new highlight model and legacy payload compatibility. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Add editor-flow coverage for both-track segment editing, Wizard segment setup, `from > to` feedback, empty-marker warning, and friendly Advanced labels. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |

## Implementation Pseudocode

```ts
type CompareHighlightTarget = "a" | "b" | "both";

function normalizeCompareHighlight(
  input: CompareTimelineData["highlight"],
  tracks: CompareTrack[]
): { targetTrackId: CompareHighlightTarget } {
  const ids = tracks.map((track) => track.id);
  if (input?.targetTrackId === "both") return { targetTrackId: "both" };
  if (ids.includes(input?.targetTrackId ?? "")) {
    return { targetTrackId: input?.targetTrackId as CompareHighlightTarget };
  }
  return { targetTrackId: tracks[1]?.id ?? tracks[0]?.id ?? "a" };
}

function shouldRenderTrackSegments(trackId: string, target: CompareHighlightTarget) {
  return target === "both" || target === trackId;
}

function resolveSegmentRangeMessage(segment: CompareTrackSegment) {
  if (segment.from <= segment.to) return undefined;
  return "The saved range will be normalized from the earlier step to the later step.";
}
```

Editor flow:

1. Normalize current data once at render.
2. In highlight mode, render each track with marker controls and its own
   `SegmentEditor`.
3. Show target-track control separately from segment list so selecting the
   target never hides the other track's persisted segments.
4. In `dual-track`, render a compact preserved-data notice when any segment
   exists.
5. Advanced editor displays `Traditional (a)` and `With us (b)` style labels.

Error handling:

- Unknown highlight target falls back to the current second track behavior.
- Empty segment labels remain optional and use the existing fallback label.
- Invalid ranges remain normalized by the domain normalizer; editor feedback is
  advisory and must not bypass normalization.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new highlight fields must reject unknown values and
  preserve legacy `targetTrackId` payloads.
- Anti-abuse: no raw HTML, scripts, external fetches, or user-authored class
  names in segment labels or helper copy.
- Secret handling: no secrets in widget data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` rows C1, C2, C3,
  W1, U2, U3, U6, U7, and U8 after validation.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` for final segment/highlight model
  and editor mode ownership.

## Changelog Policy

- Covered by the TASK-260 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Visual editor can edit segments on both tracks in highlight mode.
- Switching to `dual-track` does not imply segment data loss.
- Wizard exposes a beginner-safe segment path when highlight mode is enabled.
- Invalid segment ranges are visible to editors before normalization silently
  repairs them.
