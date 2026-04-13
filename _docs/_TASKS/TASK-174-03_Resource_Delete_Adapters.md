# TASK-174-03: Resource Delete Adapters
# FileName: TASK-174-03_Resource_Delete_Adapters.md

**Priority:** High
**Category:** Assistant/Core + Domain Services
**Estimated Effort:** Large
**Dependencies:** TASK-174-01, TASK-174-02
**Status:** To Do

---

## Overview

Implement delete/archive adapters for resources targeted by user prompts, whether those resources were created by the assistant or manually by the user.

Assistant provenance is useful for undo, but it must not be required for ordinary user-directed deletion. For user-created resources, target resolution must come from server-side resource catalog and active context, followed by dry-run/review/execute.

## Sub-Tasks

- `TASK-174-03-01_Custom_Screen_Delete_Action.md`
- `TASK-174-03-02_Page_Delete_Action.md`
- `TASK-174-03-03_Widget_Template_Delete_Action.md`
- `TASK-174-03-04_Content_Type_and_Entry_Delete_Actions.md`
- `TASK-174-03-05_Listing_Query_and_Template_Delete_Actions.md`
- `TASK-174-03-06_Form_Delete_or_Archive_Action.md`
- `TASK-174-03-07_Menu_and_SEO_Delete_Actions.md`

## Progress Notes

- 2026-04-12: Completed `TASK-174-03-01`; `custom-screen.delete` is executable through the normal LLM Guide plan/dry-run/execute flow.
- 2026-04-13: Completed `TASK-174-03-02`; `page.delete` is executable for active-context pages through the normal LLM Guide plan/dry-run/execute flow.
- 2026-04-13: Completed `TASK-174-03-03`; `widget-template.delete` is executable for active-context reusable widget templates.

## Architecture

Delete action families to add or expand:
- `custom-screen.delete` (done for prefix/catalog-resolved screens),
- `page.delete`,
- `widget-template.delete`,
- `content-type.delete`,
- `entry.delete`,
- `listing-query.delete`,
- `listing-template.delete`,
- `form.delete` or `form.archive` when submissions exist,
- `menu.item.delete`,
- `seo.document.delete`.

Policies:
- server-side catalog or active resource context must resolve ids,
- ambiguous name/prefix matches return `needs_input`,
- public/published resource deletes show public impact warnings,
- forms with submissions archive or block rather than hard-delete,
- media references detach; media asset deletion remains separate and must be explicit,
- content types with entries/screens/listings block unless dependencies are included in the same reviewed plan.

## Pseudocode

```ts
const targets = resolveDeleteTargetsFromContext({ prompt, activeContext, catalog });
if (targets.ambiguous) return needsInput(targets);

const plan = targets.map((target) => ({
  type: `${target.family}.delete`,
  input: { id: target.id, expectedName: target.name, expectedFingerprint: target.fingerprint },
}));
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- domain services selected by resource family
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- DB-backed route/executor suites where required

## Security Contract

- Visibility: internal execute only through assistant action execute flow.
- Auth model: existing admin session.
- RBAC:
  - content/page/entry/listing/template deletes require `content:write`,
  - page delete for published pages requires `content:publish` when existing domain rules require it,
  - form delete/archive requires `forms:write`,
  - menu delete requires `menus:write`,
  - SEO delete requires `content:write`,
  - widget template delete requires `widgets:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict per-action delete schemas reject unknown fields.
- Anti-abuse:
  - no public write endpoint,
  - no arbitrary client/provider resource ids,
  - destructive actions require dry-run/review,
  - ambiguous targets return `needs_input`.
- Idempotency: execute requires `idempotencyKey`.
- Secret handling: results and audit payloads must not expose raw snapshots, submissions, or secret-like values.

## Testing Requirements

- Vitest:
  - target resolution for active page/screen/template and prefix/name prompts,
  - ambiguous targets return `needs_input`,
  - strict schema rejects unknown fields.
- Bun:
  - each delete adapter calls existing domain service,
  - public/data-loss warnings in dry-run,
  - route permission checks per action,
  - idempotency replay/conflict.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant can delete supported resources created by either the assistant or the user after dry-run/review.
2. Delete target ids come from trusted server-side context/catalog resolution.
3. Unsafe or ambiguous destructive operations are blocked with machine-readable conflicts or `needs_input`.
4. Existing domain services own deletion/archive behavior.
