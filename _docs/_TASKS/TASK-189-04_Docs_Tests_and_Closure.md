# TASK-189-04: Docs, Tests, and Closure
# FileName: TASK-189-04_Docs_Tests_and_Closure.md

**Priority:** High
**Category:** Docs + QA Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-189-01, TASK-189-02, TASK-189-03
**Status:** To Do

---

## Overview

Close TASK-189 after the assistant policy engine remediation is implemented and validated.

This closure must update TASK-188-era docs that claimed the policy engine was already the sole source of truth, then record the final corrected architecture and validation status.

## Sub-Tasks

No child task files.

## Closure Checklist

1. Provider executable action arrays are removed or rejected.
2. Policy resource identity is collision-free for settings/admin shared-kind resources.
3. `actionPlannerService.ts` is orchestration-only for CMS/admin operation planning, except explicitly documented adapter exceptions.
4. LLM Guide matrices and security docs describe the corrected single policy path.
5. Targeted Vitest, lint/typecheck, and live assistant matrix are recorded.
6. `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/README.md` are synchronized.

## Security Contract

- Visibility: docs/process plus internal assistant planning verification.
- Auth model: no runtime change.
- RBAC: docs must preserve policy-vs-domain enforcement boundary.
- CSRF: no runtime change.
- Rate-limit bucket: no runtime change.
- Reject-unknown validation: docs must state that provider output is operation-draft-only and action arrays are rejected.
- Anti-abuse: docs must preserve destructive denial defaults, exact target requirements, and gated secret-bearing surfaces.
- Public-write hardening: not applicable; no public endpoint.
- Secret handling: no secrets in docs/changelog; redaction requirements documented.

## Testing Requirements

- Run final targeted assistant Vitest suite:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts`
- Run lint/typecheck:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Run live assistant matrix:
  - `set -a && source .env && set +a && bun run test:assistant:live`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entries for TASK-189 leaves and final closure.
