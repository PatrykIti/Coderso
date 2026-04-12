# TASK-174-03: Create Resource Delete Adapters
# FileName: TASK-174-03_Create_Resource_Delete_Adapters.md

**Priority:** High  
**Category:** Assistant/Core + Domain Services  
**Estimated Effort:** Large  
**Dependencies:** TASK-174-01, TASK-174-02  
**Status:** To Do

---

## Overview

Implement cleanup execution adapters for resources the assistant can create.

This leaf focuses on resources whose primary undo strategy is `delete` or `archive`:
- content type,
- custom screen,
- listing query,
- listing template,
- page,
- form,
- entry draft.

## Sub-Tasks

No child task files.

## Architecture

Each adapter must:
- load the persisted undo item,
- load current resource state by server-side resource id,
- verify the current state fingerprint or conflict,
- check dependency blockers,
- call the existing domain service delete/archive function,
- record cleanup result status,
- support idempotent replay.

Resource policies:
- `content-type`: delete only when created by the assistant and no external entries/screens/listings remain outside the cleanup set.
- `custom-screen`: delete only when created by the assistant and fingerprint still matches.
- `listing-query`: delete only when not referenced by surviving pages/widgets outside cleanup set.
- `listing-template`: delete only when not referenced by surviving pages/widgets outside cleanup set.
- `page`: delete assistant-created pages; public/published pages must show public impact in preview.
- `form`: hard delete only when no submissions exist; otherwise archive/block according to the existing form contract.
- `entry.upsert-draft`: delete only draft entries created by the assistant; block if published or externally modified.

## Pseudocode

```ts
async function executeDeleteCreatedResource(item) {
  const current = await loadCurrentResource(item);
  assertFingerprintMatches(item, current);
  assertNoExternalDependencies(item, current);

  return domainDelete(item.resourceId);
}
```

## Files to Change

- `core/services/assistant/actionUndoExecutor.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/content/typeService.ts` only if safe dependency checks need public helpers
- `core/services/customScreens/customScreenService.ts`
- `core/services/content/listingQueriesService.ts`
- `core/services/content/listingTemplatesService.ts`
- `core/services/pages/pageService.ts`
- `core/services/forms/formsService.ts`
- `core/services/content/entryService.ts`
- `tests/unit/assistant/actionUndoExecutor.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`

## Security Contract

- Visibility: internal execute only through assistant action execute flow.
- Auth model: existing admin session.
- RBAC:
  - content/page/entry/listing cleanup requires `content:write`,
  - page cleanup that affects published content requires `content:publish` when existing page contract requires it,
  - form cleanup requires `forms:write`,
  - custom screen cleanup requires the existing custom-screen/content write permission path.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: execute accepts only strict cleanup plans generated from persisted undo items.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - cannot delete resources that were not recorded as assistant-created in the selected execution.
- Idempotency: cleanup execute requires `idempotencyKey` and must replay the same result for the same actor/plan/hash.
- Secret handling: cleanup results must not expose raw snapshots, form submissions, or secret-like metadata.

## Testing Requirements

- Bun:
  - delete created content type after dependent resources are gone,
  - block content type delete when external entries/screens/listings exist,
  - delete created custom screen,
  - delete created listing query/template only when unreferenced externally,
  - delete created page with public-impact preview,
  - archive/block form with submissions,
  - delete draft entry and block published/external-modified entries,
  - idempotency replay and conflict.
- Vitest:
  - pure adapter decision helpers if extracted without runtime/DB imports.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant-created create resources can be safely deleted or archived from the persisted undo manifest.
2. Externally modified or externally referenced resources are blocked with machine-readable conflicts.
3. Existing domain services own deletion/archive behavior.
4. Cleanup execution is audited and idempotent.
