# TASK-407-06-L04: Review Summary and Execution Gating
# FileName: TASK-407-06-L04-Review-Summary-and-Execution-Gating.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Review UI
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L03, TASK-407-05-L06
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Build the final site-builder intake review summary and dry-run/execute gating. Users must see
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
| Review UI | `core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper.tsx` |
| Review contract | `core/services/assistant/assistantSiteBuilderIntakeReviewSummary.ts`, `assistantSiteBuilderIntakeFacts.ts`, `assistantSiteBuilderIntakeNormalizer.ts` |
| Plan handoff | `core/services/assistant/actionPlannerService.ts`, `assistantSiteBuilderIntakeCompiler.ts` |
| Tests | `tests/vitest/ui/assistant-site-builder-intake-review.test.tsx`, `tests/vitest/assistant/assistantSiteBuilderIntakeReviewSummary.test.ts` |

## Implementation Pseudocode

```tsx
function canSubmitSiteBuilderIntakePlan(session: AssistantSiteBuilderIntakeSession, review: ReviewState) {
  return session.readyForReview && review.confirmedHash === session.reviewHash && !hasBlockingGate(session);
}

function SiteBuilderIntakeReviewSummary({ session, onConfirm, onPlan }: Props) {
  const canPlan = canSubmitSiteBuilderIntakePlan(session, session.reviewState);
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

- Users see the full intake-generated plan summary before mutation.
- Dry-run/execute cannot be reached from unreviewed or stale sessions.
- Blocking gates are visible and enforce execution disablement.

## Completion Notes

- Added normalized review hash facts and strict `confirmedReviewHash`
  validation. Any non-review answer change makes the previous confirmation stale
  and keeps `readyForExecution` false.
- Added a shared review summary contract for pages, menu/footer, hero,
  homepage sections, subpages, content engines, custom screens, media policy,
  SEO defaults, lead capture, and review gates.
- Rendered the final summary in the floating assistant intake review step and
  auto-submitted the current server-normalized review hash when the user
  confirms review.
- Enforced the same blocking review gates server-side before compiling reviewed
  intake to `siteKit`, closing the direct-request bypass found by Claude.
- Routed reviewed active intake sessions to the existing strict `siteKit`
  action-plan path; unreviewed/stale sessions remain `needs_input`.
- Added TASK-407-06-L06 for the legacy `AiSiteWizard` convergence found during
  Claude/subagent audit so the remaining divergent surface is explicit.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntake*.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.tsx`
  - 23 files, 128 tests passed.
- `bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts`
  - 1 test passed.
- `bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
  - 1 DB-backed runtime test passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Review Evidence

- Subagent read-only audit found missing backend handoff, missing final review
  summary, stale hash fixture drift, and parent/task legacy wizard drift.
- Claude read-only audit found a server-side fail-open risk for review summary
  gates. The fix moved `confirmationAllowed` enforcement into
  `buildActionPlanRequestFromReviewedIntake` and added regression coverage for
  `media_library_selection_required`.
