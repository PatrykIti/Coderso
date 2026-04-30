# TASK-244-05-01: Widget Surface Clear Test Matrix and Docs Closure

# FileName: TASK-244-05-01_Widget_Surface_Clear_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widgets + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-244-05
**Status:** To Do

---

## Overview

Create and execute the final TASK-244 validation matrix. The implementer must
not close the task based only on broad lint/type success; every real surface
problem needs targeted proof.

## Sub-Tasks

- None. This is an execution leaf.

## Required Matrix

| Group | Runtime proof | Editor proof | Docs proof |
|---|---|---|---|
| Hero/shared controls | cleared gradient/background/overlay omit output | `Clear` removes nested `background` keys | `_docs/_WIDGETS/HERO.md` |
| Screen widgets | cleared frame surfaces omit background classes/styles | screen editor emits removed style keys | screen widget docs / `_docs/WIDGETS.md` |
| Operational widgets | cleared shells/tables/cards omit forced backgrounds | operational editor waves expose `Clear` | operational widget docs |
| Composite/content widgets | cleared surfaces/overlays omit output | editor waves expose `Clear` and remove keys | per-widget docs |
| Form/shell/panel widgets | cleared form/shell/panel backgrounds omit output | editor waves expose `Clear` and remove keys | per-widget docs |

## Testing Requirements

- Run all targeted suites from implementation leaves.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
- Final:
  - `bun run gates:coderso`
  - `bun run precommit` before manual commit
- DB-backed suites:
  - source `.env` first when required by the touched Bun-owned suites:
    `set -a && source .env && set +a`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/TASK-244*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Closure Notes

Fill this section during implementation closure.

- Final changelog number:
- Validation commands:
- Known skipped suites:
- Remaining exclusions:

## Acceptance Criteria

1. Matrix is complete and references real tests.
2. TASK-244 task files are marked Done only after implementation validates.
3. Board counts and changelog index are synchronized.
4. Any skipped tests or compatibility exceptions are explicit.
