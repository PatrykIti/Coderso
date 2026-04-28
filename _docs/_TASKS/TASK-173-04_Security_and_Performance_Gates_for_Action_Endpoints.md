# TASK-173-04: Security and Performance Gates for Action Endpoints
# FileName: TASK-173-04_Security_and_Performance_Gates_for_Action_Endpoints.md

**Priority:** High  
**Category:** Security + Performance + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-01, TASK-170, TASK-171, TASK-172  
**Status:** Done (2026-04-12)

---

## Overview

Add or update security/performance validation for assistant action endpoints when the supported action surface grows.

## Sub-Tasks

No child task files yet. Add scanner/config leaves if Semgrep, Trivy, or Gitleaks configuration must change.

## Pseudocode

```ts
await expectRateLimitBucket("/admin/api/assistant/actions/plan", "assistant");
await expectRejectsMissingCsrf("/admin/api/assistant/actions/execute");
await expectPlannerRejectsOversizedPrompt();
await expectProviderPromptRedacted();
```

## Files to Change

- `tests/security/*assistant*` if existing security suite has assistant coverage
- `tests/perf/*assistant*` if action endpoint budgets are added
- `scripts/coderso-release-gates.ts` if release-gate contract changes
- workflow files only if CI gate set changes
- `_docs/CODERSO_RELEASE_GATES.md` if release-gate behavior changes

## Security Contract

- Visibility: validates internal endpoints.
- Auth model: admin session.
- RBAC: security tests include permission enforcement where feasible.
- CSRF: security tests include missing/invalid CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: oversized/unknown/malformed payloads rejected.
- Anti-abuse: no public write path; public generated forms use their own existing gates.
- Idempotency: execute gate covers missing key and replay/conflict where feasible.
- Secret handling: scanner/gate tests assert no secrets in payload/log output where feasible.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun:
  - relevant `tests/security/*`,
  - relevant `tests/perf/*`,
  - `bun run gates:coderso` when release-gated behavior changes.
- Vitest:
  - pure redaction/budget helpers if extracted.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gates change.
- `_docs/TESTING_STRATEGY.md` if lane ownership changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Expanded action endpoints keep security gate coverage.
2. Performance budgets are explicit when action planning cost grows.
3. Scanner allowlist/config changes include owner, reason, expiry, and ticket.

## Completion Notes (2026-04-12)

- Revalidated existing security/performance gate coverage for assistant-related contracts.
- Ran assistant rate-limit route checks alongside security/performance gates.
- No scanner allowlist/config changes were required.
- No `scripts/coderso-release-gates.ts` or workflow changes were required.
