# TASK-174-04: Inverse Patch and Attach Adapters
# FileName: TASK-174-04_Inverse_Patch_and_Attach_Adapters.md

**Priority:** High  
**Category:** Assistant/Core + Domain Services  
**Estimated Effort:** Large  
**Dependencies:** TASK-174-01, TASK-174-02  
**Status:** To Do

---

## Overview

Implement cleanup adapters for actions that patch, attach, or update existing resources instead of creating a whole resource.

This leaf covers:
- menu item upsert,
- SEO document upsert,
- media reference attach,
- page widget patch,
- form automation upsert,
- future-safe restore-snapshot hooks for assistant updates.

## Sub-Tasks

No child task files.

## Architecture

Patch cleanup is not always deletion. The adapter must pick the persisted undo strategy:
- delete a menu item created by assistant,
- restore menu tree snapshot for assistant-updated menu structure,
- delete a created SEO document or restore previous SEO snapshot,
- detach media reference but never delete the media asset,
- remove a page block created by assistant or restore previous block snapshot,
- remove a form automation action created by assistant or restore previous action snapshot.

## Pseudocode

```ts
switch (item.undoStrategy) {
  case "detach":
    return detachReferenceIfStillMatches(item);
  case "restore-snapshot":
    return restoreSanitizedSnapshotIfCurrentMatches(item);
  case "restore-tree":
    return restoreMenuTreeIfCurrentMatches(item);
  case "delete":
    return deleteCreatedSubresource(item);
  default:
    return blockUndo(item, "assistant_undo_strategy_not_supported");
}
```

## Files to Change

- `core/services/assistant/actionUndoExecutor.ts`
- `core/services/assistant/actionUndoManifest.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/menus/menuService.ts`
- `core/services/seo/seoService.ts`
- `core/services/media/mediaService.ts` only if read helpers are needed
- `core/services/pages/pageService.ts`
- `core/services/forms/formActionsService.ts`
- `tests/unit/assistant/actionUndoExecutor.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`

## Security Contract

- Visibility: internal execute only through assistant cleanup execute flow.
- Auth model: existing admin session.
- RBAC:
  - menu cleanup requires `menus:write`,
  - SEO cleanup requires `content:write`,
  - media detach requires `media:read` plus `content:write`,
  - page widget cleanup requires `content:write`,
  - form automation cleanup requires `forms:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: only strict cleanup plans from persisted undo items execute.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - never delete media assets when undoing `media.reference.attach`.
- Idempotency: cleanup execute requires `idempotencyKey` and must replay safely.
- Secret handling:
  - SEO snapshots, form action snapshots, and page block data must be sanitized,
  - webhook form automation stays unsupported unless explicit secret handling lands first.

## Testing Requirements

- Bun:
  - delete created menu item and block unsafe/external href drift,
  - delete or restore SEO document depending on persisted strategy,
  - detach media reference without deleting media asset,
  - remove assistant-created page widget block,
  - restore page widget snapshot when assistant updated an existing block,
  - remove safe non-webhook form automation action,
  - block webhook cleanup until explicit secret handling exists,
  - idempotency replay/conflict.
- Vitest:
  - pure snapshot/fingerprint helper coverage if extracted.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Patch/attach actions get reversible cleanup where the current state still matches the assistant-owned state.
2. Media cleanup detaches references only and never deletes assets.
3. Webhook/secret-bearing form automation remains blocked until a separate explicit secret contract exists.
4. Partial cleanup reports item-level statuses and conflicts.
