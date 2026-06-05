# TASK-407-07-L01: Targeted Validation Lanes and Release Gates
# FileName: TASK-407-07-L01-Targeted-Validation-Lanes-and-Release-Gates.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Validation Gates
**Estimated Effort:** Medium
**Dependencies:** TASK-407-06-L05
**Status:** ⏳ To Do

---

## Overview

Run the required static checks, targeted Bun/Vitest suites, precommit, and
release gates for the implemented TASK-407 contracts before live browser E2E.

## Sub-Tasks

- Identify touched contracts and map each to the correct Bun or Vitest lane.
- Run `bun --cwd core lint`, `bun --cwd core lint:types`, targeted suites, and
  `bun run precommit`.
- Run `bun run gates:coderso` plus exact release-gate suites when changed
  contracts require them.
- Record any unrelated pre-existing failures separately from TASK-407 failures.

## Security Contract

- Endpoint visibility: no new endpoint in this leaf.
- Auth model: unchanged.
- RBAC: validation must include route/RBAC tests for changed route families.
- CSRF: validation must include CSRF tests when route payloads change.
- Rate-limit bucket: route tests must verify `assistant` bucket where relevant.
- Reject unknown validation: targeted tests must include reject-unknown coverage
  for changed schemas.
- Anti-abuse: security/fail-closed tests must run for prompt-poisoning,
  reference intake, media trust, and public write boundaries where touched.
- Secret handling: logs and task evidence must not include keys, cookies, CSRF
  tokens, auth state, signed URLs, or raw provider output.

## Files To Change

| Area | Files |
|---|---|
| Validation notes | TASK-407 closure notes and changelog once completed |
| Gates | `scripts/coderso-release-gates.ts` only if gate contracts change |
| Tests | targeted suites added by previous leaves |

## Implementation Pseudocode

```ts
function selectValidationLanes(changedFiles: string[]) {
  return {
    vitest: selectBunFreeSuites(changedFiles),
    bun: selectRuntimeSuites(changedFiles),
    gates: selectReleaseGates(changedFiles),
  };
}
```

## Data Flow and Error Handling

- Changed file list maps to test lanes; failed checks block live E2E unless
  isolated as unrelated and documented.
- DB-backed suites load `.env` and use scoped fixtures.
- Security-gated changes require targeted security tests, not only broad gates.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest/Bun suites for all changed contracts.
- `bun run precommit`
- `bun run gates:coderso`
- Additional security/performance/reliability gates when contracts change.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` and closure notes for validation evidence.

## Acceptance Criteria

- Correct test lanes are selected and run.
- Failures are fixed or clearly isolated as unrelated.
- Live E2E starts only after targeted validation is green or documented.
