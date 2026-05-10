# TASK-252-04-01: Timeline Chronology Motion and Editor IA

# FileName: TASK-252-04-01_Timeline_Chronology_Motion_and_Editor_IA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-04
**Status:** To Do

---

## Overview

Expand Timeline from a process-step block into a true chronology-capable widget with accessible modes, dates/statuses, and optional reduced-motion-safe reveal behavior.

This is an execution leaf under `TASK-252-04`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/timeline/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/timeline/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Keep one `timeline` widget type and preserve existing `milestones`, `cards`, and `compact` payloads through compatibility mapping.
- Support axis, vertical chronology, alternating layout, dates, statuses,
  per-item CTA/link, icon/accent, and current milestone highlighting.
- Treat feed/activity presentation and optional motion as Adapt-only progressive
  enhancement: no layout shift, no required runtime dependency, and
  `prefers-reduced-motion` must disable reveal behavior.
- Use semantic ordered-list output and `<time>` when date data exists.

## Research Decisions

- Keep: vertical dated axis, alternating layout, icon/status indicators, and
  per-item CTA from `_docs/_WIDGETS/tmp/timeline/MATRIX.md`; start from the
  current `TimelineData` owner and add schema-owned date/status/link fields
  only in `core/widgets/core/timeline.tsx`.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat feed/activity presentation and motion/reveal behavior as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: always-on motion without reduced-motion fallback, nested arbitrary timelines, and raw HTML step content.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `timeline`.
- `Visual`: `Mode and layout`, `Items and dates`, `Motion`, `Axis and markers`, `Colors`, `Typography and spacing`.
- `Advanced`: `Legacy variant mapping`, `Reduced-motion diagnostics`, `Stable item IDs`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/timeline.tsx`
- `core/admin/ui/widgets/editors/TimelineEditors.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token adjacency changes.
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/timeline.test.tsx`
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/ui/timeline-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/tmp/timeline/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-04-01_Timeline_Chronology_Motion_and_Editor_IA.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
type TimelineMode = "process" | "axis" | "chronology" | "alternating";
// Adapt-only. Do not expose this until motion schema, render, editor, and
// reduced-motion tests are implemented together.
type TimelineReveal = "none" | "scroll-sequence" | "connector-progress";

type TimelineStep = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  dateLabel?: string;
  icon?: string;
  accent?: string;
  cta?: {
    label: string;
    href: string;
  };
  status?: "upcoming" | "current" | "complete";
};

function normalizeTimelineData(raw: unknown): TimelineData {
  const input = coerceTimelineInput(raw);
  const legacy = normalizeLegacyTimelinePayload(raw);
  return {
    ...legacy,
    mode: normalizeTimelineMode(input.mode, legacy.variant),
    steps: normalizeTimelineSteps(input.steps ?? legacy.steps, {
      normalizeCta: normalizeTimelineStepCta,
    }),
    ...(isTimelineMotionAdaptEnabled(input) ? { motion: normalizeTimelineMotion(input.motion) } : {}),
  };
}

function renderTimeline(data: TimelineData) {
  return (
    <ol data-timeline-mode={data.mode} {...resolveTimelineMotionDataAttributes(data.motion)}>
      {data.steps.map((step) => <TimelineStepView key={step.id} step={step} />)}
    </ol>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/timeline/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/timeline.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/TimelineEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `timeline` output is public page/runtime output.
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
  - changed `timeline` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/timeline.tsx`.
- Anti-abuse:
  - Item titles/descriptions/icons are text or existing safe rich text only; no raw HTML expansion.
  - Optional item hrefs use the existing safe URL pattern.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema validation changes.
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-04-01_Timeline_Chronology_Motion_and_Editor_IA.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- Timeline renders process, axis, chronology, and alternating patterns from one
  schema; feed/activity mode stays Adapt-only unless implemented with full
  schema/render/editor/test ownership.
- Legacy timeline variants continue to render and edit safely.
- If the Adapt reveal slice is implemented, it respects reduced motion and has
  focused runtime/UI test proof.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
