# TASK-188: Assistant Operation Policy Engine
# FileName: TASK-188_Assistant_Operation_Policy_Engine.md

**Priority:** High
**Category:** Assistant/Core + Architecture + Safety
**Estimated Effort:** Large
**Dependencies:** TASK-184, TASK-185, TASK-186, TASK-187
**Status:** To Do

---

## Overview

Replace the current scattered `LLM Guide` prompt heuristics with a central, typed `assistantOperationPolicy` engine.

The current system is safe, but live OpenAI/OpenRouter tests forced many localized guards in:

- `actionPlannerService.ts`,
- `cmsTargetResolver.ts`,
- `cmsOperationActionMapper.ts`,
- `cmsPlanningState.ts`,
- provider prompt strings,
- live test expectations.

This task turns those guards into a source-of-truth policy layer that describes:

- Admin/CMS resources,
- aliases and supported operations,
- allowed filters and field intents,
- destructive/bulk rules,
- read-only/gated behavior,
- action mapping contracts,
- provider guidance,
- docs/test coverage ownership.

The goal is not to trust the model more. The goal is to keep model reasoning while making local contracts, safety rules, and test coverage data-driven and consistent.

## Sub-Tasks

- `TASK-188-01_Policy_Schema_and_Resource_Contract.md`
- `TASK-188-02_Policy_Migration_for_Current_CMS_Resources.md`
- `TASK-188-03_Provider_Guidance_and_JSON_Schema_From_Policy.md`
- `TASK-188-04_Resolver_and_Filtering_From_Policy.md`
- `TASK-188-05_Action_Mapping_and_Safety_Rules_From_Policy.md`
- `TASK-188-06_Planning_State_and_Follow_Up_Policy.md`
- `TASK-188-07_Navigation_Coverage_and_Live_Matrix_From_Policy.md`
- `TASK-188-08_LangGraph_Orchestration_Evaluation.md`
- `TASK-188-09_Policy_Engine_Cutover_and_Heuristic_Removal.md`
- `TASK-188-10_Docs_Changelog_and_Closure.md`

## Architecture

Target architecture:

```text
prompt
  -> provider/local draft
  -> normalize through assistantOperationPolicy
  -> resolve trusted targets
  -> enforce policy safety rules
  -> map to strict typed action plan
  -> dry-run
  -> review
  -> execute
```

The model may infer intent, but the policy engine remains the authority for:

- which resources exist,
- which fields and filters are understood,
- which bulk/destructive operations are allowed,
- which prompts are read-only or gated,
- which typed actions can be produced.

Non-goals:

- no provider-to-executor path,
- no untyped action format,
- no autonomous broad destructive execution,
- no external framework owning domain permissions or target resolution.

## External Package Direction

Evaluate `@langchain/langgraph` / LangGraph.js only for workflow orchestration:

- state graph for `plan -> resolve -> validate -> dry-run -> review -> execute`,
- explicit branch/control flow,
- optional checkpointing/human-in-the-loop patterns.

Do not use LangGraph to replace:

- resource policy,
- typed action schemas,
- RBAC/CSRF,
- target resolver,
- domain services,
- security rules.

Adopt a package only if it materially simplifies orchestration without adding provider lock-in, heavy dependencies, or runtime coupling.

## Security Contract

- Visibility: internal assistant planning/execution only.
- Auth model: existing admin session.
- RBAC: policy may describe permissions but route/domain enforcement remains authoritative.
- CSRF: no route weakening.
- Rate-limit bucket: existing assistant buckets.
- Reject-unknown validation:
  - policy schema is strict,
  - provider drafts remain untrusted,
  - generated plans must pass existing strict action schemas.
- Anti-abuse:
  - destructive operations require review,
  - broad destructive prompts require explicit safe filters or return `needs_input`,
  - unsupported/planned Admin UI routes remain gated.
- Secret handling:
  - policy must declare secret-bearing surfaces,
  - provider prompts must receive only redacted summaries,
  - no provider keys, webhook secrets, API keys, SMTP/storage credentials, cookies, CSRF tokens, access logs, or submissions in prompts/audit/browser cache.

## Testing Requirements

- Vitest:
  - policy schema validation,
  - generated provider guidance,
  - resolver behavior generated from policy,
  - action mapping generated from policy,
  - safety rule matrix,
  - navigation coverage matrix.
- Bun:
  - route/executor behavior remains green,
  - live OpenAI/OpenRouter matrix remains green.
- Final validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - relevant targeted Vitest suites
  - `set -a && source .env && set +a && bun run test:assistant:live`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entries for completed leaves
