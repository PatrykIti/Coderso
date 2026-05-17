# 850 - TASK-260 compare timeline widget followups

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-260, TASK-260-01, TASK-260-02, TASK-260-03, TASK-260-04, TASK-260-05

## Key Changes

### CMS Widgets

- Rebuilt the Compare Timeline renderer so desktop grids follow the actual step
  count, guide borders disappear truthfully when disabled, highlighted segments
  keep a compatibility fallback before `color-mix(...)`, and the runtime now
  exposes readable section/track/step/segment accessibility labels.
- Expanded the Compare Timeline data model and editor flow with one-track or
  both-track highlighting, Wizard/Visual segment authoring, preserved hidden
  segment messaging, range feedback, `3-10` axis steps, optional step icons and
  safe links, and Compare Timeline-owned layout/style controls for heading,
  width, padding, track order, marker shape, track background, and font
  weights.
- Adopted the landed shared clear/mode contracts locally in Compare Timeline:
  label/background color fields now clear correctly, and Visual is the single
  truthful owner for layout/spacing controls while Advanced stays metadata-only.

### QA and Documentation

- Refreshed the Compare Timeline widget source doc, task family, board state,
  and report closure notes so every report row now ends as fixed, routed to an
  exact shared owner, or deferred to a concrete future task.
- Created exact deferred follow-up owners for the remaining non-landed rows:
  `TASK-293` for shared widget contrast guidance/validation and `TASK-294` for
  Compare Timeline motion presets/reduced-motion policy.
- Added focused coverage for the new Compare Timeline schema/editor/runtime
  contract through `compareTimeline.test.tsx`,
  `compare-timeline-editor-wave.test.tsx`, `renderer.test.tsx`, and
  `validator.test.ts`.
