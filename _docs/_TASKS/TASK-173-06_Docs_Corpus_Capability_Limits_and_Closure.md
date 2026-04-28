# TASK-173-06: Docs Corpus Capability Limits and Closure
# FileName: TASK-173-06_Docs_Corpus_Capability_Limits_and_Closure.md

**Priority:** High  
**Category:** Docs/Assistant + QA Closure  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-01, TASK-173-02, TASK-173-03, TASK-173-04, TASK-173-05  
**Status:** Done (2026-04-12)

---

## Overview

Close production readiness by updating assistant-facing docs, source-of-truth architecture/security docs, task board, and changelog. The docs must describe supported capabilities and limitations honestly.

## Sub-Tasks

No child task files.

## Pseudocode

```md
Supported:
- docs-only answers documentation questions.
- LLM Guide can plan and execute only listed typed actions.

Not supported:
- arbitrary code execution.
- autonomous mutation without review/confirm.
- unsupported business packs without explicit task coverage.
```

## Files to Change

- relevant `docs/` assistant corpus pages
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md` if testing lanes changed
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog file for completed readiness wave

## Security Contract

- Visibility: docs-only change unless paired with implementation closure.
- Auth model: not applicable to docs.
- RBAC: docs must match implemented route/domain permissions.
- CSRF: docs must match implemented action endpoint requirements.
- Rate-limit bucket: docs must state `assistant` bucket where endpoint docs mention limits.
- Reject-unknown validation: docs must mention strict action schemas for supported flows.
- Anti-abuse: docs must distinguish internal setup actions from public form hardening.
- Idempotency: docs must state execute idempotency behavior.
- Secret handling: docs must state provider/action metadata redaction limits.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest/Bun suites from preceding readiness tasks.
- Docs-only wording changes do not require additional runtime tests unless they update generated docs contracts.

## Documentation Updates Required

- This task is the documentation closure task; update every doc listed above.
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-173-llm-guide-production-readiness.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Docs do not overclaim assistant autonomy.
2. Capability limits match the acceptance matrix.
3. Board, changelog, and docs are synchronized at closure.

## Completion Notes (2026-04-12)

- Updated the assistant corpus pages to describe `Docs only` vs `LLM Guide`
  behavior honestly:
  - docs-only remains read-only,
  - LLM Guide runs reviewed typed action flows only,
  - arbitrary code execution and autonomous mutation are unsupported.
- Updated source-of-truth architecture/API/security/site-builder docs and the
  acceptance matrix with the supported and gated capability set.
- No testing lane ownership changed, so `_docs/TESTING_STRATEGY.md` did not
  need an update.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/security/codersoSecurityGate.test.ts tests/perf/codersoPerformanceGate.test.ts tests/integration/routes/assistant-rate-limit.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/assistant/assistantMetrics.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/assistantRedaction.test.ts tests/vitest/assistant/action-diff-service.test.ts`
