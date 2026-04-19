# TASK-189: Assistant Policy Engine Audit Remediation
# FileName: TASK-189_Assistant_Policy_Engine_Audit_Remediation.md

**Priority:** High
**Category:** Assistant/Core + Architecture + Safety
**Estimated Effort:** Large
**Dependencies:** TASK-188
**Status:** To Do

---

## Overview

Remediate the TASK-188 audit gaps that left more than one assistant planning path in production.

TASK-188 declared `assistantOperationPolicy` as the source of truth for provider guidance, resolver/filtering, action mapping/safety, follow-up planning state, and coverage metadata. The follow-up audit found three remaining gaps:

1. Provider `actions[]` drafts can still become executable plans through `actionPlanProviderAdapter.ts`.
2. Settings/admin surface policies collide because multiple policy entries share `kind: "settings-surface"` and resolver lookup falls back to the first matching kind.
3. `actionPlannerService.ts` still owns large local keyword lists and local-first branches that duplicate policy ownership.

The goal of TASK-189 is to remove the parallel path, keep only the policy-normalized operation-draft path, and make every remaining orchestration exception explicit, tested, and policy-owned.

## Sub-Tasks

- `TASK-189-01_Remove_Provider_Action_Array_Fallback.md`
- `TASK-189-02_Fix_Policy_Resource_Identity_and_Settings_Collisions.md`
- `TASK-189-03_Remove_Parallel_Planner_Heuristics.md`
- `TASK-189-04_Docs_Tests_and_Closure.md`

## Architecture

Required final architecture:

```text
prompt
  -> local draft OR provider CMS operation draft
  -> normalize through assistantOperationPolicy
  -> resolve exact policy resource identity
  -> resolve trusted targets
  -> enforce policy safety rules
  -> map through policy-declared typed actions
  -> dry-run
  -> review
  -> execute
```

Provider output may only provide an untrusted operation draft. Provider output must never provide executable action arrays, typed action inputs, resource ids, or direct executor payloads.

Policy resource identity must be stable and collision-free. A policy entry may expose a broad `kind` for compatibility, but resolver, provider guidance, coverage, and mapping must preserve the exact policy resource key when multiple entries share the same kind.

`actionPlannerService.ts` must become orchestration-only for CMS/admin operation planning. Product blueprint planners may remain local because they are separate composite setup flows, but CMS/admin operation routing, gated/read-only behavior, field aliases, filters, destructive safety, and target resolution must be policy-driven.

## Acceptance Criteria

1. `actionPlanProviderAdapter.ts` is removed or reduced to a non-executable compatibility rejector with no path to `actions[]`.
2. `planAssistantActionsWithProviderDraft` cannot return provider-supplied typed actions. Fake provider `actions[]` payloads return `needs_input` or route through local policy planning with zero provider action reuse.
3. Provider prompt/schema/tests state and enforce that providers return `CmsOperationDraft` only.
4. Policy lookup resolves settings sub-surfaces by exact policy key, not by first matching `kind`.
5. Prompts for `API Keys`, `Assistant Settings`, `Security Settings`, `Webhooks`, `Email Settings`, `Storage Settings`, and `Integrations` map to the correct route/policy metadata and stay gated/redacted.
6. `actionPlannerService.ts` no longer contains duplicated CMS resource alias/delete/update keyword lists where the policy already owns the resource/field/action contract.
7. Remaining local planner branches are either product blueprint flows or explicitly documented adapter exceptions with policy coverage and tests.
8. Existing TASK-184/TASK-185/TASK-186/TASK-187 behavior remains green through targeted Vitest and the live assistant matrix.

## Implementation Order

1. Remove provider executable action adaptation and update provider tests.
2. Add exact policy resource identity through lookup, draft normalization, provider guidance, and resolver/mapping paths.
3. Collapse duplicate local planner branches into the policy draft -> resolver -> mapper pipeline.
4. Update docs, live matrix notes, changelog, and task board after validation.

## Security Contract

- Visibility: internal assistant planning and execution only.
- Auth model: existing admin session on `/assistant/actions/*`.
- RBAC: no weakening; route and domain enforcement remain authoritative.
- CSRF: existing admin/internal write expectations remain unchanged for dry-run/execute routes.
- Rate-limit bucket: existing assistant planning/execution buckets remain unchanged.
- Reject-unknown validation: provider drafts and generated plans must pass strict schemas; unknown provider action arrays are rejected.
- Anti-abuse: providers cannot supply executor payloads; destructive and bulk actions require policy safety evaluation, exact trusted targets, and reviewed dry-run.
- Public-write hardening: not applicable; no new public write endpoint is introduced. Nonce/signature/HMAC and reCAPTCHA remain not applicable for this internal-only flow.
- Secret handling: provider prompts receive redacted policy/context only; secret-bearing settings/admin surfaces must stay gated and provider disallowed.

## Testing Requirements

- Vitest:
  - `tests/vitest/assistant/actionPlannerService.test.ts`
  - `tests/vitest/assistant/provider-planner-fixtures.test.ts`
  - `tests/vitest/assistant/action-plan-provider-adapter.test.ts` or its replacement removal tests
  - `tests/vitest/assistant/provider-planning-context.test.ts`
  - `tests/vitest/assistant/cms-operation-draft-schema.test.ts`
  - `tests/vitest/assistant/cms-target-resolver.test.ts`
  - `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
  - `tests/vitest/assistant/operation-policy-resolver.test.ts`
  - `tests/vitest/assistant/operation-policy-provider-guidance.test.ts`
  - `tests/vitest/assistant/operation-policy-admin-surfaces.test.ts`
  - `tests/vitest/assistant/operation-policy-coverage.test.ts`
  - `tests/vitest/assistant/live-coverage-matrix.test.ts`
- Lint/typecheck:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Live provider matrix after cutover:
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
- New changelog entries for completed leaves and final closure.
