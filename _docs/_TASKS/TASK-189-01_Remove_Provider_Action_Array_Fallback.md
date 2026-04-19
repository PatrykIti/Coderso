# TASK-189-01: Remove Provider Action Array Fallback
# FileName: TASK-189-01_Remove_Provider_Action_Array_Fallback.md

**Priority:** High
**Category:** Assistant/Core + Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-189
**Status:** To Do

---

## Overview

Remove the remaining provider-to-executor path. Providers must only return CMS operation drafts that are normalized through `assistantOperationPolicy`, resolved against trusted context, safety-checked, and mapped locally.

The current fallback path still calls `adaptProviderDraftPlan` when provider output is not a valid `CmsOperationDraft`. That adapter accepts provider-supplied `actions[]` when the action type exists in the global action registry. This violates the TASK-188 non-goal: no provider-to-executor path.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
  - Remove import and use of `adaptProviderDraftPlan`.
  - Remove fallback behavior that accepts provider `actions[]`.
  - Preserve local fallback by re-running the local policy planner only from the original prompt/context.
- `core/services/assistant/actionPlanProviderAdapter.ts`
  - Delete the file if no longer used.
  - Or reduce it to a test-only/non-executable reject helper if deletion would create a large migration.
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - Delete or replace with rejection/removal tests.
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`

## Acceptance Criteria

1. Provider output containing only `actions[]` never returns `ready` with provider-supplied actions.
2. Provider output containing arbitrary typed actions such as `content-type.upsert`, `page.delete`, or `site-kit.install` is rejected or ignored unless it can be independently reconstructed from a valid `CmsOperationDraft` through local policy mapping.
3. Provider unavailable/error/malformed paths still fall back to deterministic local policy planning from prompt/context only.
4. Provider metadata no longer implies that provider action payloads were used.
5. Tests explicitly fail if a fake provider action array can reach dry-run/review.

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session on `/assistant/actions/plan`.
- RBAC: unchanged; route/domain enforcement remains authoritative.
- CSRF: unchanged; no new write endpoint.
- Rate-limit bucket: existing assistant planning bucket.
- Reject-unknown validation: provider payloads outside `CmsOperationDraft` must not create executable actions.
- Anti-abuse: provider cannot supply action ids, target ids, executor inputs, destructive actions, or bulk actions.
- Public-write hardening: not applicable; no public endpoint. Nonce/signature/HMAC and reCAPTCHA are not applicable.
- Secret handling: reject or ignore provider payloads with secret-like keys; never reuse provider action inputs.

## Testing Requirements

- Add/adjust Vitest coverage:
  - fake provider `actions[]` only -> no executable plan,
  - fake provider `content-type.upsert` action -> no provider action reuse,
  - fake provider `page.delete` action with ids -> no provider action reuse,
  - valid provider `CmsOperationDraft` still maps through local policy.
- Run:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- Changelog entry on completion.
