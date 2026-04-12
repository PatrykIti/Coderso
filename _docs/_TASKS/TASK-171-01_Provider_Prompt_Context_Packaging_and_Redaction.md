# TASK-171-01: Provider Prompt Context Packaging and Redaction
# FileName: TASK-171-01_Provider_Prompt_Context_Packaging_and_Redaction.md

**Priority:** High  
**Category:** Core/Assistant + LLM Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171  
**Status:** Done (2026-04-12)

---

## Overview

Create the bounded prompt package that the provider planner may receive. This subtask owns context budgets, docs evidence packaging, runtime snapshot summarization, and secret redaction before any provider call is made.

## Sub-Tasks

- `TASK-171-01-01_Docs_and_Runtime_Context_Budgeting.md`
- `TASK-171-01-02_Secret_Redaction_and_Audit_Safe_Payloads.md`

## Pseudocode

```ts
const package = buildProviderPlanningPrompt({
  prompt: userPrompt,
  docs: selectBoundedEvidence(retrievedDocs),
  runtime: summarizeRuntimeSnapshot(context.runtimeSnapshot),
  resources: summarizeResourceCatalog(context.resourceCatalog),
});

return redactAssistantPromptPackage(package, {
  denyKeys: SECRET_LIKE_KEYS,
  maxChars: planningBudget.maxInputChars,
});
```

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/assistantRedaction.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- new pure helper module if prompt packaging would otherwise couple to runtime services

## Security Contract

- Visibility: internal planning only.
- Auth model: admin session.
- RBAC: packaging uses only context available to the already-authorized plan route.
- CSRF: unchanged through `POST /assistant/actions/plan`.
- Rate-limit bucket: `assistant` plus LLM budget.
- Reject-unknown validation: context is normalized before packaging.
- Anti-abuse: no public write path; provider prompt is bounded and redacted.
- Idempotency: not applicable to planning prompt packaging.
- Secret handling: provider package must exclude credentials, sessions, CSRF, raw permissions, form submissions, access logs, and secret-like settings.

## Testing Requirements

- Vitest:
  - prompt package includes bounded docs/resource/runtime context,
  - long docs/resource catalogs are truncated deterministically,
  - secret-like keys are redacted before provider call.
- Bun:
  - route-level packaging only if helper imports runtime/DB-backed context builders.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` provider prompt redaction notes when implementation lands.
- `_docs/ARCHITECTURE.md` for provider planner packaging flow.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Provider planning has a single redacted prompt package owner.
2. Context budgets are deterministic and test-covered.
3. No provider call receives raw admin secrets or sensitive runtime data.

## Completion Notes (2026-04-12)

- Added `providerPlanningContext.ts` as the single pure owner for provider planning prompt packages.
- The helper packages user prompt, bounded docs evidence, advisory runtime snapshot, and bounded resource catalog summaries.
- The helper redacts prompt package metadata before any future provider call boundary.
- No live provider call was introduced in this task.
