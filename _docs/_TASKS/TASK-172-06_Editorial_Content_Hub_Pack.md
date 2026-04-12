# TASK-172-06: Editorial Content Hub Pack
# FileName: TASK-172-06_Editorial_Content_Hub_Pack.md

**Priority:** Medium  
**Category:** Assistant/Product + Posts + Pages  
**Estimated Effort:** Large  
**Dependencies:** TASK-172-01, TASK-170  
**Status:** To Do

---

## Overview

Add an editorial/content hub blueprint that composes posts, pages, listings, and navigation without violating the dedicated posts domain split.

## Sub-Tasks

No child task files yet. Split posts-specific action work into `TASK-170` leaves if new `post.*` actions are required.

## Pseudocode

```ts
if (requiresPostMutation(prompt) && !postActionsSupported()) {
  return needsInput("I can draft the hub structure, but post mutations need a supported post action family.");
}

return buildContentHubPlan({ page, postsFeedWidget, navigationLink });
```

## Files to Change

- `core/services/assistant/blueprints/*`
- `core/services/assistant/actionPlannerService.ts`
- posts/page/listing/navigation services only through existing contracts
- post feed widget contracts if plan output changes
- `tests/vitest/assistant/actionPlannerService.test.ts`
- posts/page Bun runtime tests selected by touched contracts

## Security Contract

- Visibility: internal action endpoints.
- Auth model: admin session.
- RBAC: posts/content/page/menu permissions according to planned actions.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: no post mutation payload without strict `post.*` contract.
- Anti-abuse: no public write path.
- Idempotency: no duplicate hub page/menu resources.
- Secret handling: no unpublished/private post content in provider/audit metadata unless explicitly part of admin-authorized action and redacted in metadata.

## Testing Requirements

- Vitest:
  - content hub prompt routing,
  - unsupported post mutation returns typed question,
  - page/posts-feed plan shape.
- Bun:
  - public runtime acceptance for generated content hub page,
  - posts route/runtime smoke if post contracts are touched.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` if posts action boundary is introduced.
- `_docs/CMS_API.md` if action plan examples expand.
- posts assistant docs in `docs/` if user-facing.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Pack respects the dedicated posts architecture.
2. Unsupported post mutations are questions, not unsafe plans.
3. Generated content hub runtime is covered by Bun acceptance tests.
