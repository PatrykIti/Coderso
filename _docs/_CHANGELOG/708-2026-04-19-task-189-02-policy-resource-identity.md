# 708. TASK-189-02 policy resource identity

Date: 2026-04-19
Version: unreleased
Tasks: TASK-189-02

## Key Changes

### Assistant/Core

- Added exact `resourceKey` support to CMS operation drafts and provider draft schemas.
- Updated policy lookup/resolver helpers so shared-kind settings/admin surfaces resolve to the exact policy entry.
- Prevented quoted target text from influencing policy resource alias scoring.

### QA

- Added coverage for API Keys, Assistant Settings, Security Settings, Webhooks, and other shared-kind settings resources.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
