# TASK-103: Agent Guidelines Hardening and Contribution Guardrails
# FileName: TASK-103_Agent_Guidelines_Hardening_and_Contribution_Guardrails.md

**Priority:** Medium  
**Category:** Docs/Architecture  
**Estimated Effort:** Small  
**Dependencies:** None  
**Status:** Done (2026-03-06)

---

## Overview
Utwardzic `AGENTS.md`, aby wszyscy agenci pracowali wedlug tych samych repo-specyficznych kontraktow wynikajacych z architektury, cache, security, pluginow, widgetow, release gates i workflow task/changelog.

## Scope
1. Przeanalizowac aktualne `AGENTS.md` wzgledem source-of-truth docs i reprezentatywnych wzorcow w kodzie/testach.
2. Dopisac guardraile dla:
   - schema-first + `normalize*`,
   - deterministycznych kontraktow danych,
   - route-level `map*Error` + route tests,
   - admin cache/invalidation contract,
   - widget/plugin/assistant product contracts,
   - release-gate sync i docs sync.
3. Dolozyc historie zmiany do task board i changelogu.
4. Dostarczyc update `AGENTS.md` w osobnym worktree, aby nie kolidowac z rownolegla praca innych agentow.

## Architecture / Source Contracts Reviewed
- `AGENTS.md`
- `_docs/ARCHITECTURE.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Implementation Order
1. Audit docs + representative code/test patterns.
2. Update task board/changelog history.
3. Land `AGENTS.md` patch in dedicated worktree.
4. Verify clean separation between current and dedicated worktree.

## Testing Requirements
- Docs/workflow change only; no runtime or DB contract was modified.
- Verify markdown/task/changelog consistency.
- Verify `git status` and file placement in both worktrees after moving the `AGENTS.md` patch.

## Documentation Updates Required
- `AGENTS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/358-2026-03-06-task-103-agent-guidelines-hardening-and-contribution-guardrails.md`

