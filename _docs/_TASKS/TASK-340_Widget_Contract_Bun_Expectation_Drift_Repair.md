# TASK-340: Widget Contract Bun Expectation Drift Repair

# FileName: TASK-340_Widget_Contract_Bun_Expectation_Drift_Repair.md

**Priority:** High
**Category:** QA + Widgets + Admin UI + Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-339-15, TASK-339-16
**Status:** Done (2026-05-27)

---

## Overview

Repair the failing full `bun run test:bun` lane after `TASK-339` by aligning
stale Bun expectations with the current `content-list` and `posts-feed`
editor-contract owners.

The regressions are expectation drift only. The fix must preserve the live
widget contract instead of restoring the retired `posts-feed`
`runtime-summary` section or the older `content-list` advanced-section order.

## Source Findings

- Full `bun run test:bun` was failing with exactly `2` tests.
- `tests/unit/widgets/contentList.test.tsx` still expected the pre-`TASK-339`
  `Advanced` order instead of the rendered `source summary -> style summary ->
  runtime summary` sequence.
- `tests/unit/widgets/postsFeedWidget.test.tsx` still expected the retired
  `posts-feed.advanced.runtime-summary` section even though `TASK-339-15`
  explicitly removed that stale contract claim.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `tests/unit/widgets/contentList.test.tsx` | Update the strict section-id expectation to the current `Advanced` section order owned by `contentListEditorContract`. |
| `tests/unit/widgets/postsFeedWidget.test.tsx` | Remove the retired `posts-feed.advanced.runtime-summary` expectation from the strict contract assertion. |
| `_docs/_TASKS/TASK-340_Widget_Contract_Bun_Expectation_Drift_Repair.md` | Track status, validation, and closure notes for this Bun-lane repair. |
| `_docs/_TASKS/README.md` | Keep board counts and the Done table synchronized with the new repair leaf. |
| `_docs/_CHANGELOG/989-2026-05-27-widget-contract-bun-expectation-drift-repair.md` | Record the user-facing QA repair summary. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row for entry `989`. |

## Implementation Pseudocode

```ts
expect(contentList.editorContract.sections).toMatchLiveAdvancedOrder([
  "content-list.advanced.source-summary",
  "content-list.advanced.style-summary",
  "content-list.advanced.runtime-summary",
]);

expect(postsFeed.editorContract.sections).not.toContain(
  "posts-feed.advanced.runtime-summary"
);
```

Data flow:

- Keep `contentListEditorContract` and `postsFeedEditorContract` as the single
  source of truth.
- Repair only stale Bun expectations; do not widen production contracts or add
  compatibility shims.

Error handling:

- Do not reintroduce retired `Advanced` diagnostics just to satisfy old tests.
- Keep assertions strict and explicit so future contract drift remains visible.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schemas and editor contracts.
- Anti-abuse: unchanged.
- Secret handling: no runtime payloads, keys, or hidden diagnostics are exposed
  beyond the existing read-only summaries.

## Testing Requirements

- `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:bun`

## Documentation Updates Required

- Update this task file with final status and validation notes.
- Update `_docs/_TASKS/README.md` with the new Done row and synchronized task
  counts.
- Add changelog entry `989` and update `_docs/_CHANGELOG/README.md`.

## Acceptance Criteria

- Full `bun run test:bun` is green again.
- `content-list` and `posts-feed` Bun tests follow the live `TASK-339`
  editor-contract shape.
- No production widget contract is weakened to satisfy stale expectations.

## Completion Notes (2026-05-27)

- Full `bun run test:bun` is green again with `869 pass` and `0 fail`.
- `content-list` now expects the live read-only `Advanced` order exported by
  `contentListEditorContract`.
- `posts-feed` no longer expects the removed `runtime-summary` diagnostic and
  now matches the live read-only `resolved query`, `runtime status`, and
  `contract summary` sections.
- Validation passed:
  - `bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:bun`
