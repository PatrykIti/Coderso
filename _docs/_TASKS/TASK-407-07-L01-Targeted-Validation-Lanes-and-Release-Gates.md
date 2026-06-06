# TASK-407-07-L01: Targeted Validation Lanes and Release Gates
# FileName: TASK-407-07-L01-Targeted-Validation-Lanes-and-Release-Gates.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Validation Gates
**Estimated Effort:** Medium
**Dependencies:** TASK-407-06-L06
**Status:** ✅ Done
**Completed:** 2026-06-06

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
- `git diff --check`
- Targeted Vitest/Bun suites for all changed contracts.
- `bun run precommit`
- `bun run gates:coderso`
- Local security scanner evidence or CI-only rationale when secret-handling or
  redaction contracts are touched.
- Additional security/performance/reliability gates when contracts change.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` and closure notes for validation evidence.

## Acceptance Criteria

- Correct test lanes are selected and run.
- Failures are fixed or clearly isolated as unrelated.
- Live E2E starts only after targeted validation is green or documented.

## Validation Evidence

- Pre-audit:
  - Claude CLI read-only audit on HEAD `33377b9011dae92ac65619c7981947b504e53108`
    returned GO for L01 validation and recommended adding
    `assistant-rate-limit.test.ts`, `git diff --check`, and explicit DB-gated
    gate evidence.
  - Subagent read-only audit returned GO and flagged low closure hygiene for the
    L01 dependency and security-scan evidence; both are addressed in this
    closeout.
- Static validation:
  - `git diff --check` passed.
  - `bun --cwd core lint` passed.
  - `bun --cwd core lint:types` passed.
- Targeted Vitest:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts ...`
    passed for 34 assistant/admin/UI files and 354 tests, covering admin client,
    action schema, planner, admin context, redaction, Basic/Advanced intake,
    follow-up scoping, review summary, static actions, conversation state,
    assistant panel interaction, intake browser state, intake UI, and Solution
    Kits CTA coverage.
- Targeted Bun:
  - `set -a && [ -f .env ] && source .env && set +a; NODE_ENV=test bun test ...`
    passed for 5 assistant runtime/route files and 104 tests, including dry-run,
    executor, route, assistant rate-limit bucket, and public catalog/detail
    runtime coverage.
- Release gates:
  - `set -a && [ -f .env ] && source .env && set +a; bun run gates:coderso`
    passed functional, UX, performance, security, and reliability gates.
  - `.tmp/coderso-release-gates.json` reported no skipped commands; DB-gated
    public booking, solution-kit install, and store revocation checks ran.
- Precommit:
  - `bun run precommit` passed, including core lint/typecheck, store lint, SDK
    typecheck, and root typecheck.
- Security scanners:
  - `bun run scan:security:strict` passed Semgrep SAST, Bun audit, Trivy CVE,
    Trivy config, Trivy filesystem secret, Gitleaks history, and Gitleaks
    worktree scans. The optional container image scan was skipped because no
    `SECURITY_SCAN_IMAGE` was provided.
