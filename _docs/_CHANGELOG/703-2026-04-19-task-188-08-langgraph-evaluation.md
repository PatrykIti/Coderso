# 703. TASK-188-08 LangGraph evaluation

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-08

## Key Changes

### Assistant/Architecture

- Added an ADR evaluating `@langchain/langgraph` for assistant orchestration.
- Decision: defer adoption until after the TASK-188 policy cutover and only revisit for genuinely long-running resumable workflows.
- Kept production dependencies unchanged.

### Docs

- Linked the LangGraph decision from Architecture docs.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
