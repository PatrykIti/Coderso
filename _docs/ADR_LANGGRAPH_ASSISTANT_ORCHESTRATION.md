# ADR: LangGraph for Assistant Orchestration

Date: 2026-04-19
Status: Deferred
Related tasks: TASK-188-08

## Context

TASK-188 is replacing scattered LLM Guide heuristics with a typed operation
policy engine. The current assistant action path is already split into pure
stages:

`classify -> provider/local draft -> policy guidance -> policy resolver -> policy safety -> typed action mapping -> strict schema -> dry-run/review/execute`

LangGraph.js provides TypeScript `StateGraph` workflows with nodes, edges,
conditional edges, `compile()`/`invoke()`, checkpointers, streaming, and
human-in-the-loop interrupts. Those capabilities are relevant to long-running
agent workflows, but they overlap with guarantees this repo already enforces
through route-level review/dry-run/execute, idempotency, strict action schemas,
and domain service adapters.

## Decision

Defer adopting `@langchain/langgraph`.

Do not add it to production dependencies in the TASK-188 policy cutover. Keep
`actionPlannerService.ts` as the orchestration entry point while moving business
rules into policy modules.

## Rationale

- The remaining TASK-188 work is a deterministic cutover, not a long-running
  agent graph problem.
- The policy modules are pure TypeScript and import-safe for Vitest; adding a
  graph runtime now would increase dependency surface without removing the need
  for strict local validation.
- Human review is already explicit in the existing `plan -> dry-run -> review ->
  execute` route model. LangGraph interrupts would duplicate that UI/server
  contract unless execution became resumable across long-lived graph threads.
- Durable execution/checkpointing is not currently the bottleneck. Existing
  idempotency storage and undo manifests protect action execution.
- LangGraph must never own permissions, CSRF, strict schema validation, or domain
  action contracts. Those remain Nextless-owned regardless of orchestration.

## Dependency Impact

- No new dependency.
- No lockfile/package changes.
- Re-evaluate only if a future task introduces genuinely long-running,
  resumable, multi-step assistant workflows that cannot be cleanly expressed as
  pure staged functions.

## Security Impact

- No runtime behavior change.
- No provider prompts, secrets, action payloads, or admin context are sent to a
  new dependency.
- Review/dry-run/execute boundaries stay enforced by existing internal routes.

## Revisit Criteria

Revisit LangGraph only after TASK-188 policy cutover if at least two of these are
true:

- workflow execution must pause/resume across server restarts,
- a graph needs durable per-thread state beyond current idempotency records,
- multiple independent tool/model loops need conditional routing and streaming,
- human-in-the-loop review cannot be represented by the current action review UI,
- the prototype removes more orchestration code than it adds.

If revisited, create a separate implementation leaf that adds the package,
captures dependency size, adds Bun/Vitest compatibility tests, and proves strict
action schemas still gate every mutation.
