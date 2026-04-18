# TASK-188-08: LangGraph Orchestration Evaluation
# FileName: TASK-188-08_LangGraph_Orchestration_Evaluation.md

**Priority:** Medium
**Category:** Assistant/Architecture + Dependency Evaluation
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01
**Status:** To Do

---

## Overview

Evaluate whether `@langchain/langgraph` should be adopted for assistant workflow orchestration.

LangGraph.js is a TypeScript graph/state orchestration framework with controllable state graphs, branching, persistence, and human-in-the-loop patterns. It may help structure `plan -> resolve -> validate -> dry-run -> review -> execute`, but it must not replace the domain policy engine or action contracts.

## Sub-Tasks

No child task files.

## Evaluation Questions

1. Does LangGraph materially simplify the existing assistant flow?
2. Can it run cleanly in Bun without adding runtime coupling?
3. Does it add acceptable dependency weight?
4. Can it preserve our existing typed action schemas and route/domain enforcement?
5. Does it improve testability or observability enough to justify adoption?

## Acceptance Criteria

1. Produce a short architecture decision record.
2. Prototype a tiny graph around existing pure functions if useful.
3. Recommend adopt/defer/reject.
4. If adopted, create follow-up implementation leaves with package changes and tests.

## Files to Inspect or Prototype

- `package.json`
- `core/services/assistant/actionPlannerService.ts`
- `core/server/routes/assistantRoutes.ts`
- optional prototype:
  - `core/services/assistant/operationGraph/*`
  - `tests/vitest/assistant/operation-graph.test.ts`

## Evaluation Pseudocode

```ts
const graph = new StateGraph(AssistantOperationState)
  .addNode("draft", draftNode)
  .addNode("policyNormalize", policyNormalizeNode)
  .addNode("resolveTargets", resolveTargetsNode)
  .addNode("safety", safetyNode)
  .addNode("mapActions", mapActionsNode)
  .addConditionalEdges("safety", routeSafetyResult)
  .compile();
```

## Decision Output

```text
Decision: adopt | defer | reject
Reason:
- ...
Dependency impact:
- ...
Security impact:
- ...
Migration plan if adopted:
- ...
```

Do not add LangGraph to production dependencies in this evaluation leaf unless the ADR recommends adoption and a separate implementation leaf is created.

## Security Contract

- Visibility: architecture evaluation only.
- Auth model: no runtime change.
- RBAC: no permission change.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: external package cannot loosen schemas.
- Anti-abuse: graph cannot bypass review/execute.
- Secret handling: no provider keys or prompt payloads in prototype logs.

## Testing Requirements

- If prototype is created:
  - Vitest pure graph test.
  - No live provider calls required.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` or ADR
- `_docs/_TASKS/README.md`
- changelog on completion
