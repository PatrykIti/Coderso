# TASK-170-01-01: Entry Action Contracts
# FileName: TASK-170-01-01_Entry_Action_Contracts.md

**Priority:** High  
**Category:** Core/Assistant + Content Entries  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-01  
**Status:** To Do

---

## Overview

Define `entry.*` assistant actions for safe content entry setup and refinement. This leaf is contract-only unless the implementation leaf explicitly follows.

## Sub-Tasks

No child task files.

## Target Actions

- `entry.upsert-draft`
- `entry.sample.create`
- `entry.bulk-draft.create`
- `entry.field.patch` only for schema-known fields and non-destructive updates

## Pseudocode

```ts
const entryAction = normalizeEntryAction(providerOrLocalDraft);

assertKnownContentType(entryAction.input.contentTypeSlug);
assertKnownSchemaFields(entryAction.input.values);
assertNoPublishWithoutExplicitPlan(entryAction);

return {
  type: "entry.upsert-draft",
  input: normalizeEntryDraftInput(entryAction.input),
};
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/content/entryService.ts` only if reusable helpers are missing
- `core/services/content/typeService.ts` for schema lookup only through existing APIs
- tests under `tests/vitest/assistant/*`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run, `content:write` for execute, `content:publish` only if a future action publishes.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: reject values not present in the content type schema.
- Anti-abuse: no public entry writes; no nonce/HMAC/reCAPTCHA path.
- Idempotency: entry writes must be replay-safe by actor/plan/hash.
- Secret handling: do not place raw form submissions, secret fields, or hidden admin data into previews/audit/idempotency metadata.

## Testing Requirements

- Vitest:
  - valid draft entry action passes strict schema,
  - unknown field and unknown content type examples fail safely,
  - sample content payloads stay bounded.
- Bun:
  - deferred to executor leaf; DB-backed entry mutation tests required before execution ships.

## Documentation Updates Required

- `_docs/CMS_API.md` action plan examples when executable.
- `_docs/SECURITY_SPEC.md` if entry action permissions differ from current assistant baseline.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. `entry.*` actions are explicitly scoped to drafts unless publish is separately planned.
2. Schema-known fields are the only writeable values.
3. The executor implementation can call `entryService` without inventing assistant-only persistence.
