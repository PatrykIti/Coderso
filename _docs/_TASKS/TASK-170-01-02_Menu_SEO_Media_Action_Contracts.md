# TASK-170-01-02: Menu, SEO, and Media Action Contracts
# FileName: TASK-170-01-02_Menu_SEO_Media_Action_Contracts.md

**Priority:** High  
**Category:** Core/Assistant + Navigation + SEO + Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-01  
**Status:** Done (2026-04-12)

---

## Overview

Define contracts for assistant actions that connect generated surfaces to navigation, SEO metadata, and existing media references. This task must stay conservative because these areas can affect public routing and discoverability.

## Sub-Tasks

No child task files.

## Target Actions

- `menu.item.upsert`
- `menu.structure.patch`
- `seo.document.upsert`
- `media.reference.attach`

## Pseudocode

```ts
const action = normalizeAction(input);

if (action.type.startsWith("menu.")) {
  assertSafeAdminOrPublicHref(action.input.href);
  assertNoExternalHrefUnlessExplicit(action.input.href);
}

if (action.type.startsWith("seo.")) {
  assertKnownSeoTarget(action.input.targetType, action.input.targetId);
}

if (action.type.startsWith("media.")) {
  assertExistingMediaAsset(action.input.mediaId);
  assertNoRawUploadBytes(action.input);
}
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/menus/*` contract/service modules as needed
- `core/services/seo/*` contract/service modules as needed
- `core/services/media/*` reference helpers as needed
- `core/admin/utils/adminPaths.ts` only if canonical admin href helpers need extension

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC:
  - menu actions require menu/navigation write permissions,
  - SEO actions require SEO/content write permissions,
  - media reference actions require media read plus target resource write.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: reject unknown href shape, unknown target type, raw upload payloads, and extra fields.
- Anti-abuse: no public write endpoint; no upload bytes through assistant action plan.
- Idempotency: replay must not duplicate menu items.
- Secret handling: no signed media URLs, private file paths, or storage credentials in previews/audit/idempotency metadata.

## Testing Requirements

- Vitest:
  - safe href normalization,
  - SEO target validation,
  - media reference input rejects raw bytes and unknown fields.
- Bun:
  - route/executor tests when service adapters land,
  - public runtime smoke for generated navigation only when menu writes become executable.

## Documentation Updates Required

- `_docs/CMS_API.md` for new action examples when executable.
- `_docs/SECURITY_SPEC.md` for media/SEO/menu permission notes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Menu actions cannot create unsafe or duplicate navigation targets.
2. SEO actions are target-scoped and deterministic.
3. Media actions only attach existing assets and never transport raw file data.

## Completion Notes (2026-04-12)

- Registered contract-only menu, SEO, and media actions: `menu.item.upsert`, `menu.structure.patch`, `seo.document.upsert`, and `media.reference.attach`.
- Documented `menus:*`, `content:*`, and `media:*` permission ownership plus no raw-upload/media-secret handling.
- Added Vitest coverage for the contract boundary and domain permission metadata.

## Follow-Up Notes

- 2026-04-12: `TASK-170-03-02-01` promoted `menu.item.upsert` to an executable action. `menu.structure.patch`, `seo.document.upsert`, and `media.reference.attach` remain contract-only.
- 2026-04-12: `TASK-170-03-02-02` promoted `seo.document.upsert` to an executable action. `menu.structure.patch` and `media.reference.attach` remain contract-only.
- 2026-04-12: `TASK-170-03-02-03` promoted `media.reference.attach` to an executable action for entry targets. `menu.structure.patch` remains contract-only.
