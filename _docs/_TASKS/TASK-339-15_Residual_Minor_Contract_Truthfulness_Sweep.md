# TASK-339-15: Residual Minor Contract Truthfulness Sweep

# FileName: TASK-339-15_Residual_Minor_Contract_Truthfulness_Sweep.md

**Priority:** Medium
**Category:** Widgets + Admin UI + UX Contract
**Estimated Effort:** Large
**Dependencies:** TASK-339-02, TASK-339-04, TASK-339-05, TASK-339-06, TASK-339-07, TASK-339-08, TASK-339-09, TASK-339-10, TASK-339-11, TASK-339-12, TASK-339-13, TASK-339-14
**Status:** Done (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude review optional only if the sweep exposes user-visible IA drift

---

## Overview

Close the smaller truthfulness mismatches that remain after the larger hero
parity and contract-sync leaves stop moving.

This sweep is intentionally for minor title/order/summary truthfulness drift,
not for fresh hero-level UI rewrites. If one of these widgets turns out to need
real IA expansion after the larger leaves land, stop and split a dedicated leaf
instead of hiding that scope inside this cleanup batch.

Hard stop criteria for splitting a new dedicated leaf:

- the fix adds or removes a rendered section,
- the fix introduces a new writable control surface,
- the fix changes daily authoring for colors, media, links, or source setup,
- the fix changes frontend-visible UX rather than contract wording/metadata only.

## Widgets In Scope

- layout/support: `section`, `split-layout`, `toggle-block`, `spacer`,
  `divider`, `stack`
- source/runtime truthfulness: `content-list`, `posts-feed`,
  `listing-filters`, `compare-timeline`, `booking-calendar`,
  `appointment-form`

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows these widgets mostly differ by
  title wording, order, runtime-summary labels, or other low-risk truthfulness
  gaps.
- Examples:
  - `section` and `split-layout` have title wording drift between contract and
    rendered UI,
  - `posts-feed` contract still declares an extra `runtime-summary` section the
    rendered UI no longer exposes,
  - `booking-calendar` and `appointment-form` still have stale Wizard title
    copy relative to the rendered UI.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/*Editors.tsx` | Touch only the in-scope widgets above when the rendered metadata itself needs a low-risk truthfulness fix. |
| `core/widgets/core/*.tsx` | Align the in-scope `editorContract` owners to the rendered ids/titles/roles. |
| `tests/vitest/ui/*editor*.test.tsx` | Update the affected section-title / metadata expectations. |
| `tests/vitest/widgets/*.test.tsx` | Keep widget-local behavior green where runtime-summary labels or Wizard section metadata change. |

## Implementation Pseudocode

```ts
for (const widget of residualWidgets) {
  syncContractTitlesToRenderedUi(widget);
  removeStaleRuntimeSummaryClaims(widget);
  preserveCurrentBehavior(widget);
}
```

Data flow:

- Prefer contract-owner fixes over UI rewrites for this residual batch.

Error handling:

- If a widget needs a real IA expansion, stop and split a new dedicated leaf.
- Do not bury user-visible hero-parity work inside this residual sweep.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schemas.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Run the targeted Vitest suites for each touched residual widget.
- If this sweep touches `booking-calendar` or `appointment-form`, run a quick
  Playwright admin pass as well, even when the change looks title-only.

## Documentation Updates Required

- Update this task file with the final per-widget list actually touched.
- Update `_docs/_TASKS/README.md` on status changes.
- Add changelog entries and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Progress Notes

- 2026-05-27: Widgets actually touched in this residual sweep:
  - `section`
  - `split-layout`
  - `toggle-block`
  - `spacer`
  - `divider`
  - `stack`
  - `content-list`
  - `posts-feed`
  - `listing-filters`
  - `compare-timeline`
  - `booking-calendar`
  - `appointment-form`
- 2026-05-27: Sweep scope stayed within task guardrails:
  - no new rendered sections were added,
  - no new writable controls were introduced,
  - no user-facing hero-level IA rewrites were hidden inside the batch.
- 2026-05-27: Concrete residual fixes landed:
  - Wizard titles now match rendered UI for `section`, `split-layout`,
    `spacer`, `divider`, `stack`, `booking-calendar`, `appointment-form`, and
    `compare-timeline`,
  - stale Advanced wording/runtime-summary claims were removed or renamed for
    `posts-feed`, `section`, `split-layout`, `toggle-block`, `stack`, and
    `booking-calendar`,
  - section ordering now matches the rendered UI for `section`,
    `listing-filters`, and `content-list`.
- 2026-05-27: Focused validation is green:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/contentList.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/postsFeed.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- 2026-05-27: Quick Playwright admin pass for `booking-calendar` and
  `appointment-form` was rechecked after the title-only contract sync; no new
  admin-side regressions surfaced during widget insertion/opening.

## Acceptance Criteria

- Residual widgets no longer have stale contract titles/order/runtime-summary claims.
- No dedicated hero-parity UI rewrite is smuggled into this batch.
