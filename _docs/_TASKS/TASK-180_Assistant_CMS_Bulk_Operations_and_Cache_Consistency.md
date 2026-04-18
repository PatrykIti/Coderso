# TASK-180: Assistant CMS Bulk Operations and Cache Consistency
# FileName: TASK-180_Assistant_CMS_Bulk_Operations_and_Cache_Consistency.md

**Priority:** High
**Category:** Assistant/Product UX + CMS Operations
**Estimated Effort:** Large
**Dependencies:** TASK-179-07, TASK-178-05, TASK-174, TASK-170-03
**Status:** To Do

---

## Overview

Make `LLM Guide` feel consistent when it mutates CMS resources across the admin app.

Business problem:

- a user can ask the assistant to delete or edit CMS resources,
- the mutation can succeed on the backend,
- but only pages and custom screens currently refresh their admin cache from assistant execution results,
- other CMS families can stay stale until manual refresh or full reload,
- counted prompts such as "delete the two House Projects pages/screens/forms" need a predictable reviewed multi-action plan, not one-off page-only behavior.

Product examples:

- "Delete the two pages whose title starts with Katalog Projektow."
- "Archive all two public lead forms named Inquiry."
- "Delete the two listing templates that match House Projects."
- "Rename these three menu items to ...", only when every target and patch is explicit.
- "Create three pages/forms/listings", only when every requested resource has explicit validated input.

This wave must not introduce broad autonomous bulk mutation. It should make many-resource work use the same strict contract as single-resource work:

`trusted CMS context -> exact targets -> typed actions -> dry-run -> review -> execute -> cache invalidation`

## Sub-Tasks

- `TASK-180-01_Assistant_Execution_Cache_Consistency.md`
  - `TASK-180-01-01_Execution_Result_to_Cache_Event_Matrix.md`
  - `TASK-180-01-02_Admin_Cache_Subscribers_and_Clear_Helpers.md`
- `TASK-180-02_Assistant_CMS_Multi_Target_Planning.md`
  - `TASK-180-02-01_Counted_Delete_and_Archive_Target_Planning.md`
  - `TASK-180-02-02_Multi_Update_and_Create_Planning_Boundaries.md`
- `TASK-180-03_Docs_Gates_and_Closure.md`

## Architecture

The implementation stays inside the existing assistant action engine:

1. Planning remains under `/admin/api/assistant/actions/plan`.
2. Dry-run remains under `/admin/api/assistant/actions/dry-run`.
3. Execute remains under `/admin/api/assistant/actions/execute`.
4. Mutations remain strict `AssistantPlannedAction` items from the existing action registry.
5. Admin UI refresh happens through `cacheBus` and known `cacheKeys`, not reloads.

No task in this wave may add:

- generic provider-defined bulk actions,
- arbitrary cache key broadcasts,
- direct execute without review,
- assistant-only backend mutation paths,
- broad "delete all" behavior without exact counted or selected targets.

## Business Acceptance Criteria

1. After successful assistant-executed CMS mutations, the relevant admin list/editor/sidebar state refreshes without full reload.
2. Cache behavior is not page-only or custom-screen-only; it covers all supported executable CMS action families where the admin has cache keys/subscribers.
3. Counted multi-target delete/archive prompts produce reviewed plans for safe supported resource families.
4. Multi-update and multi-create prompts are supported only when every target/input can be validated into existing typed actions.
5. Ambiguous, broad, or unsafe bulk prompts return `needs_input` instead of guessing.
6. Existing page/custom-screen behavior from TASK-179-07 and changelog `667` remains green.

## Security Contract

- Visibility: internal admin assistant action flow only.
- Auth model: existing admin session.
- RBAC: unchanged; plan/dry-run/execute must continue enforcing target-family permissions through existing action family contracts.
- CSRF: unchanged; assistant POST endpoints remain CSRF-protected.
- Rate-limit bucket: existing `assistant` route bucket.
- Reject-unknown validation:
  - all plans/actions/results remain strict,
  - no provider/client payload can provide arbitrary cache keys or bulk operation shapes.
- Anti-abuse:
  - no public write endpoint,
  - destructive/bulk mutations require exact targets plus review,
  - mismatched counts and broad prompts return `needs_input`.
- Secret handling:
  - no provider raw output, prompt packages, CSRF tokens, cookies, API keys, form submissions, webhook secrets, or privileged settings in cache events, persisted state, review metadata, or audit payloads.

## Testing Requirements

- Each technical leaf owns its targeted Vitest/Bun suites.
- Umbrella closure requires:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest suites from leaves
  - targeted Bun route/executor suites if route/result contracts change
  - relevant UI tests when review rendering changes

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md` if action/result/cache metadata security contract changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entries for completed leaves and final closure

## Implementation Order

1. Finish `TASK-180-01-01` so assistant execution emits the right cache events from known action/result data.
2. Finish `TASK-180-01-02` so subscribed admin surfaces consume those events.
3. Finish `TASK-180-02-01` for counted delete/archive planning.
4. Finish `TASK-180-02-02` for conservative multi-update/create boundaries.
5. Finish `TASK-180-03` docs, gates, changelog, and board closure.
