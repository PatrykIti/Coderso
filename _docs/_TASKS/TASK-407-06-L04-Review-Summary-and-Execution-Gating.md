# TASK-407-06-L04: Review Summary and Execution Gating
# FileName: TASK-407-06-L04-Review-Summary-and-Execution-Gating.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Review UI
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L03, TASK-407-05-L06
**Status:** ⏳ To Do

---

## Overview

Build the final guided review summary and dry-run/execute gating. Users must see
what will be created before any mutation can be submitted.

## Sub-Tasks

- Render pages, menu/footer, hero, sections, subpages, content engines, custom
  screens, media policy, SEO, lead capture, and gates.
- Require explicit review confirmation before plan submission.
- Keep dry-run and execute disabled until a strict reviewed action plan exists.
- Show conflicts and gates without allowing partial unreviewed execution.

## Security Contract

- Endpoint visibility: internal admin assistant routes only.
- Auth model: existing admin session.
- RBAC: backend action contracts enforce write/publish permissions.
- CSRF: required for plan/dry-run/execute POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: review confirmation payloads must be strict and
  tied to the current normalized session version/hash.
- Anti-abuse: no mutation before review confirmation, dry-run, and backend
  execute authorization.
- Secret handling: review summaries must not expose provider keys, cookies,
  CSRF tokens, auth state, raw files, signed URLs, or raw suspicious reference
  text.

## Files To Change

| Area | Files |
|---|---|
| Review UI | `core/admin/ui/assistant/GuidedReviewSummary.tsx` |
| Plan handoff | `core/admin/ui/assistant/AssistantPanel.tsx`, assistant client helpers |
| Tests | `tests/vitest/ui/assistant-guided-review.test.tsx` |

## Implementation Pseudocode

```tsx
function canSubmitGuidedPlan(session: GuidedSiteBuilderSession, review: ReviewState) {
  return session.readyForReview && review.confirmedHash === session.reviewHash && !hasBlockingGate(session);
}

function GuidedReviewSummary({ session, onConfirm, onPlan }: Props) {
  const canPlan = canSubmitGuidedPlan(session, session.reviewState);
  return <ReviewPanel summary={session.reviewSummary} onConfirm={onConfirm} planDisabled={!canPlan} onPlan={onPlan} />;
}
```

## Data Flow and Error Handling

- Server-normalized review facts render the summary; user confirmation records a
  session/review hash.
- Any answer change invalidates confirmation and disables plan/dry-run/execute.
- Blocking gates, conflicts, rejected references, or stale session hashes prevent
  plan submission.

## Testing Requirements

- UI tests for review summary content and confirmation invalidation.
- Tests that dry-run/execute remain disabled before reviewed plan readiness.
- Tests for gate/conflict rendering and stale hash rejection.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for review-before-mutation behavior.

## Acceptance Criteria

- Users see the full guided plan summary before mutation.
- Dry-run/execute cannot be reached from unreviewed or stale sessions.
- Blocking gates are visible and enforce execution disablement.
