# TASK-179: LLM Guide Surface Hints, Filters, and Inspection UX
# FileName: TASK-179_LLM_Guide_Surface_Hints_Filters_and_Inspection_UX.md

**Priority:** High
**Category:** Assistant/Core + Admin UX + QA
**Estimated Effort:** Large
**Dependencies:** TASK-178
**Status:** To Do

---

## Overview

Improve `LLM Guide` handling of natural CMS inspection prompts where users describe where to look instead of naming exact resources.

Real prompts:

- `czy mozesz mi sprawdzic jakie ekrany customowe istnieja w admin ui?`
- `no a jakies sa opublikowane w sekcji 'Screens'?`
- `sprawdz menu Screens czy cos tam jest`

These prompts are valid user language. The system must distinguish:

- resource kind: `custom-screen`,
- surface/location hint: `Screens`, `admin ui`, `menu`,
- target query: actual resource names like `House Projects`,
- filters: `active`, `published`, `visible`, `showInSidebar`,
- operation: inspect/find/update/delete.

The current implementation can over-interpret UI words like `Screens` as resource names. This task adds first-class surface hints and filters to the operation contract and makes read-only inspection UI clearer.

## Sub-Tasks

- `TASK-179-01_Surface_Hint_and_Filter_Operation_Draft_Contract.md`
- `TASK-179-02_Provider_Prompt_and_Structured_Output_Surface_Hints.md`
- `TASK-179-03_Surface_Aware_Target_Resolver_and_Filtering.md`
- `TASK-179-04_Read_Only_Inspection_UI_Copy_and_State.md`
- `TASK-179-05_Natural_Prompt_Fixtures_and_Live_Provider_Regression.md`
- `TASK-179-06_Docs_Changelog_and_Closure.md`
- `TASK-179-07_Assistant_Action_Admin_Cache_and_Sidebar_Refresh.md`
- `TASK-179-08_Assistant_Conversation_State_Persistence.md`

## Architecture

Target planner shape:

```json
{
  "operation": "inspect",
  "resourceKind": "custom-screen",
  "surfaceHint": "Screens",
  "targetQuery": null,
  "filters": {
    "status": "active",
    "visible": true
  }
}
```

Rules:

- `surfaceHint` is never a target name.
- `targetQuery` is only for actual resource names/slugs/prefixes.
- `filters` are allowlisted and interpreted per resource family.
- Natural words like `opublikowane`, `widoczne`, `visible`, `active`, `published` map to safe resource-family filters.
- Ambiguous filter semantics return clear assumptions or `needs_input`, not guessed mutations.
- Assistant-executed mutations must refresh the relevant admin cache/sidebar state without a full page reload.
- Assistant conversation state must survive close/minimize and SPA route transitions without losing safe transcript/plan context.

## Security Contract

- Visibility: internal-only planner/assistant action endpoints.
- Auth model: existing admin session.
- RBAC: inspection still requires target-family read permissions through `/assistant/actions/plan`.
- CSRF: existing assistant action plan route CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - new surface/filter fields reject unknown keys and unsupported filter fields/operators,
  - provider output still passes strict schema and local normalization.
- Anti-abuse:
  - surface hints cannot authorize resource access,
  - filters cannot request arbitrary DB fields,
  - read-only inspection cannot execute actions.
- Secret handling:
  - no secrets, submissions, raw settings, cookies, provider keys, or full resource payloads in surface/filter state.

## Testing Requirements

- Vitest:
  - schema/normalizer tests for `surfaceHint` and filters,
  - provider prompt package tests,
  - resolver tests for `Screens` surface hint and visible/active filters,
  - UI tests for read-only inspection copy,
  - assistant execution cache invalidation tests,
  - assistant conversation persistence tests,
  - fixture matrix for natural Polish/English prompts.
- Bun:
  - route smoke for strict context/schema behavior if route payload changes,
  - opt-in live OpenAI/OpenRouter tests using `.env` test vars.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
