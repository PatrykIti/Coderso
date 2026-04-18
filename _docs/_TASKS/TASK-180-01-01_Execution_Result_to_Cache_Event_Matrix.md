# TASK-180-01-01: Execution Result to Cache Event Matrix
# FileName: TASK-180-01-01_Execution_Result_to_Cache_Event_Matrix.md

**Priority:** High
**Category:** Assistant/Admin Client + Cache Mapping
**Estimated Effort:** Medium
**Dependencies:** TASK-180-01, TASK-179-07
**Status:** To Do

---

## Overview

Replace the hard-coded page/custom-screen invalidation block in `executeAssistantActions` with a typed cache event derivation helper.

The helper should make it obvious which assistant action families invalidate which admin cache keys and which action input fields are required for detail keys.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/services/assistantClient.ts`
- `core/admin/services/cachePolicy.ts` only if a required cache key is missing
- `core/services/assistant/actionPlanTypes.ts` only if non-sensitive cache metadata must be added
- `core/services/assistant/actionExecutorService.ts` only if execute results must carry new non-sensitive cache address metadata
- `tests/vitest/admin/assistantClient.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts` if result shape changes
- `tests/unit/assistant/actionExecutorService.test.ts` if result metadata changes
- `tests/integration/routes/assistant.test.ts` if route/result validation changes

## Cache Event Matrix

Implement and test this mapping:

| Action family | Required key inputs | Cache events |
|---|---|---|
| `content-type.upsert/delete` | `resourceId` or action `input.id`/`input.slug` | `contentTypes:list`, `contentTypes:detail:<id>` when id is known |
| `entry.upsert-draft/delete/update` | action `input.contentTypeSlug`, `resourceId` or action `input.id` | `entries:list:<typeSlug>`, `entries:detail:<typeSlug>:<id>` when id is known |
| `custom-screen.upsert/delete/update/widget.patch` | `resourceId` or action `input.id` | `customScreens:list`, `customScreens:detail:<id>` |
| `page.upsert/delete/update/widget.patch` | `resourceId` or action `input.id` | `pages:list`, `pages:detail:<id>` |
| `form.upsert/delete/archive/update` | `resourceId` or action `input.id` | `forms:list`, `forms:detail:<id>` |
| `form.automation.upsert` | action form id | `forms:actions:<id>`, `forms:action-runs:<id>` |
| `listing-query.upsert/delete/update/filters.patch` | `resourceId` or action `input.id` | `listings:queries:list`, `listings:queries:detail:<id>` |
| `listing-template.upsert/delete/update/card.patch` | `resourceId` or action `input.id` | `listings:templates:list`, `listings:templates:detail:<id>` |
| `widget-template.delete/update/block.patch` | `resourceId` or action `input.id` | `widgetTemplates:list`, `widgetTemplates:detail:<id>`, `widgetCatalog:list` |
| `menu.item.upsert/delete/update` | action `input.menuId` | `menus:list`, `menus:detail:<menuId>` |
| `seo.document.upsert/delete/update` | SEO document id or target id | add/use explicit SEO cache keys or document no cache event if no admin cache owner exists |
| `media.reference.attach` | action `input.contentTypeSlug`, target entry id | target entry list/detail; `media:list` only if required by existing media cache contract |
| `setting.content-route.upsert` | content type slug | route/settings cache keys only if currently cache-owned |

## Implementation Notes

- Build a `Map<actionId, action>` from `result.plan.actions`.
- Determine `update` vs `invalidate` from action operation/type:
  - `*.delete` -> `invalidate`
  - archive/update/upsert/patch/attach -> `update` unless a local client convention requires invalidation.
- Do not broadcast detail keys when required identifiers are missing.
- Keep page/custom-screen behavior from TASK-179-07 intact.
- Prefer a small pure helper that can be unit-tested through `assistantClient.test.ts`.

## Acceptance Criteria

1. `executeAssistantActions` emits cache events for all mapped successful CMS action families.
2. Failed results emit no cache mutation events.
3. Missing detail identifiers still emit safe list-level events when appropriate.
4. Entry and menu detail keys are derived from the original action input, not guessed from display text.
5. Tests prove arbitrary/unknown action types do not emit arbitrary keys.

## Security Contract

- Visibility: admin UI/client only.
- Auth model: existing admin session.
- RBAC: no cache event can bypass backend permissions.
- CSRF: unchanged assistant execute CSRF.
- Rate-limit bucket: unchanged `assistant`.
- Reject-unknown validation: unknown action/result types are ignored by the cache mapper.
- Anti-abuse: never use provider text, `targetKey`, or arbitrary metadata as cache keys.
- Secret handling: cache mapper must not read or broadcast raw provider output, form submissions, API keys, cookies, CSRF tokens, or privileged settings.

## Testing Requirements

- `tests/vitest/admin/assistantClient.test.ts`
  - one table-driven test for action family -> cache keys,
  - failed result emits no event,
  - unknown action/result emits no event,
  - entry keys include `typeSlug`,
  - menu keys include `menuId`,
  - page/custom-screen regression stays green.
- If result schema changes:
  - `tests/vitest/assistant/action-plan-schema.test.ts`
  - `tests/unit/assistant/actionExecutorService.test.ts`
  - `tests/integration/routes/assistant.test.ts`
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md` if new subscribers/cache owners are added
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if lane ownership notes change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
