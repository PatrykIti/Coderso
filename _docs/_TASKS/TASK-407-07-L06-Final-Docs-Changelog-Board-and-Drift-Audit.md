# TASK-407-07-L06: Final Docs Changelog Board and Drift Audit
# FileName: TASK-407-07-L06-Final-Docs-Changelog-Board-and-Drift-Audit.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Docs + Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-407-07-L05
**Status:** ⏳ To Do

---

## Overview

Close TASK-407 with synchronized docs, coverage matrices, task board, changelog,
and a final Claude/agent drift audit over implementation, UX, security, and E2E
evidence.

## Sub-Tasks

- Update assistant docs, developer docs, media docs if changed, and live/acceptance
  coverage matrices.
- Move completed TASK-407 leaves/workstreams/parent through board statuses in
  dependency order.
- Add changelog coverage that lists TASK-407 and every closed leaf id, or add
  standalone leaf changelog entries.
- Run final read-only Claude/agent review with sanitized evidence and fix every
  blocking drift before closure.
- Verify no secrets, auth state, screenshots with secrets, raw provider output,
  or raw uploaded bytes are committed.

## Security Contract

- Endpoint visibility: no endpoint changes in this leaf.
- Auth model: unchanged.
- RBAC: closure evidence must report route/RBAC validation for changed routes.
- CSRF: closure evidence must report CSRF validation for changed admin writes.
- Rate-limit bucket: closure evidence must report assistant bucket validation
  for changed assistant routes.
- Reject unknown validation: closure evidence must report reject-unknown tests
  for changed schemas.
- Anti-abuse: final audit must cover prompt poisoning, reference/media gates,
  scoped cleanup, and no public assistant write endpoint.
- Secret handling: committed docs/changelog/task evidence must be sanitized.

## Files To Change

| Area | Files |
|---|---|
| Docs | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, `_docs/MEDIA_SPEC.md` if changed |
| Matrices | `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` |
| Board/changelog | `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, new changelog entry |

## Implementation Pseudocode

```ts
async function closeTask407() {
  await assertValidationEvidenceComplete();
  await assertPlaywrightEvidenceSanitized();
  await runClaudeAndAgentDriftAudit();
  await patchBlockingDrift();
  await syncTaskBoardAndChangelog({ taskIds: allClosedTask407Ids });
}
```

## Data Flow and Error Handling

- Validation/E2E evidence is sanitized, summarized in docs/matrices, then used
  for final drift review.
- Any blocker from Claude/agent review reopens patch -> validate -> review loop.
- TASK-407 cannot close while any leaf remains open or changelog coverage omits
  a closed leaf id.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- Targeted suites and Playwright evidence from previous leaves must be recorded.
- Final Claude/agent read-only audit with no blocking findings.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New TASK-407 changelog entry listing all closed TASK-407 ids.

## Acceptance Criteria

- Docs, matrices, board, and changelog are synchronized.
- Final Claude/agent audit has no blocking findings.
- No secret or raw sensitive evidence is committed.
- TASK-407 closure lists every completed leaf id.
