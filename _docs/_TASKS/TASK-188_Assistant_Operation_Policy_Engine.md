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

## Replacement Plan

This task must replace the current scattered policy-like logic, not add another parallel layer.

Current modules that will be reduced to orchestration/adapters:

- `core/services/assistant/cmsResourceRegistry.ts`
  - Removed in TASK-188-09 after policy lookup cutover.
- `core/services/assistant/cmsTargetResolver.ts`
  - Remove local alias/filter/surface-only word lists.
  - Keep catalog traversal and candidate matching mechanics, but drive matching/filter rules from policy.
- `core/services/assistant/cmsOperationActionMapper.ts`
  - Remove hard-coded resource/field/action mapping branches where policy can express them.
  - Keep typed action builders only as small adapter functions referenced by policy.
- `core/services/assistant/cmsPlanningState.ts`
  - Remove hard-coded follow-up pronouns/count words.
  - Drive follow-up selection and count words from policy.
- `core/services/assistant/actionPlannerService.ts`
  - Remove provider post-validation guard lists and read-only/local-first one-offs.
  - Keep high-level orchestration only: classify -> provider/local draft -> policy normalize -> resolve -> map.

New policy module layout:

```text
core/services/assistant/operationPolicy/
  policyTypes.ts
  policySchema.ts
  assistantOperationPolicy.ts
  policyLookup.ts
  providerGuidance.ts
  resolverPolicy.ts
  actionMappingPolicy.ts
  safetyPolicy.ts
  followUpPolicy.ts
  coveragePolicy.ts
```

Policy resource example:

```ts
page: {
  kind: "page",
  aliases: ["page", "pages", "strona", "strony"],
  operations: ["inspect", "find", "create", "update", "delete"],
  filters: {
    status: {
      values: {
        published: ["published", "opublikowane", "opublikowana"],
        draft: ["draft", "szkic"],
      },
    },
  },
  fields: {
    title: {
      aliases: ["title", "tytuł", "tytul", "nazwa"],
      action: { type: "page.update", patchPath: ["title"] },
    },
  },
  destructive: {
    requireReview: true,
    allowAllWhenFiltered: true,
    allowAllUnfiltered: false,
    requireExpectedCountForPartialMatch: true,
  },
}
```

## Cutover Rules

1. Add policy modules and tests without changing behavior.
2. Migrate policy data for current resources.
3. Switch provider guidance generation to policy while keeping old tests green.
4. Switch resolver/filtering to policy.
5. Switch action mapping/safety to policy.
6. Switch planning state/follow-up to policy.
7. Remove duplicated hard-coded lists and one-off guards.
8. Run full live assistant matrix before closing.

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
