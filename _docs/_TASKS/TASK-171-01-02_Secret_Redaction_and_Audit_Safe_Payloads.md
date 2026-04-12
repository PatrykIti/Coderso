# TASK-171-01-02: Secret Redaction and Audit-Safe Payloads
# FileName: TASK-171-01-02_Secret_Redaction_and_Audit_Safe_Payloads.md

**Priority:** High  
**Category:** Core/Assistant + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171-01  
**Status:** Done (2026-04-12)

---

## Overview

Harden provider planning payloads and diagnostics so prompt packages, provider responses, errors, audit records, and metrics never store secrets or raw sensitive context.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const safePrompt = redactObject(promptPackage, secretLikeKeyPolicy);
const draft = await provider.plan(safePrompt);
const safeDraftForAudit = redactObject(draft, secretLikeKeyPolicy);

audit("assistant.provider.plan", {
  status,
  model,
  promptHash: hashSafePrompt(safePrompt),
  draftSummary: summarizeDraft(safeDraftForAudit),
});
```

## Files to Change

- `core/services/assistant/assistantRedaction.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- provider planner helper module if introduced
- `tests/vitest/assistant/assistantRedaction.test.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`

## Security Contract

- Visibility: internal planning only.
- Auth model: admin session.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: redaction does not replace strict schema; it runs before provider/audit boundaries.
- Anti-abuse: no public write path.
- Idempotency: not applicable.
- Secret handling: redact provider keys, API keys, cookies, CSRF tokens, sessions, raw permission lists, form submissions, webhook secrets, signed URLs, and secret-like settings.

## Testing Requirements

- Vitest:
  - known secret-like keys are redacted recursively,
  - arrays and nested objects remain structurally safe,
  - provider draft audit summary contains no raw prompt or secrets.
- Bun:
  - audit persistence checks only if audit route/service integration changes.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Provider prompt and draft diagnostics use the same redaction policy.
2. Audit/metrics metadata is support-useful but secret-free.
3. Redaction tests include nested malicious-looking payloads.

## Completion Notes (2026-04-12)

- Extended assistant redaction to cover signed-url-like metadata keys.
- Provider planning prompt packages are passed through `redactAssistantMetadata`.
- Added Vitest coverage for nested arrays, signed URL redaction, and provider prompt redaction.
