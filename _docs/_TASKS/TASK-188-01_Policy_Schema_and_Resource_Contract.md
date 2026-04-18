# TASK-188-01: Policy Schema and Resource Contract
# FileName: TASK-188-01_Policy_Schema_and_Resource_Contract.md

**Priority:** High
**Category:** Assistant/Core + Policy Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-188
**Status:** To Do

---

## Overview

Create the typed policy schema that will replace scattered assistant resource aliases, filter aliases, field intents, and safety rules.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/operationPolicy/*` (new)
- `core/services/assistant/actionPlanTypes.ts` only if shared types are needed
- `tests/vitest/assistant/operation-policy.test.ts`

## Policy Shape

The policy must describe each resource:

- canonical `resourceKind`,
- display label,
- admin routes/surfaces,
- aliases per language,
- supported operations,
- read permissions,
- write/execute permissions,
- filters,
- fields/intents,
- action mapping,
- destructive/bulk rules,
- secret policy,
- live coverage state.

## Acceptance Criteria

1. Policy schema is strict and typed.
2. Unknown resource/operation/filter/field keys are rejected.
3. Existing CMS resources from `cmsResourceRegistry` can be represented.
4. Policy can express read-only/gated surfaces such as Settings, Audit Logs, Backups, and planned Coderso modules.

## Security Contract

- Visibility: internal assistant policy only.
- Auth model: no runtime change.
- RBAC: policy describes permissions but does not enforce alone.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: strict policy schema.
- Anti-abuse: destructive defaults must be deny-by-default.
- Secret handling: secret-bearing surfaces must be declarable and redacted by default.

## Testing Requirements

- Vitest schema tests for valid/invalid policy.
- Regression that missing destructive rules default to safe denial.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest policy tests.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion
