# TASK-534-05: Behavioral Runtime Tests + Docs + Closure

# FileName: TASK-534-05-Behavioral-Tests-Docs-Closure.md

**Parent Task:** TASK-534
**Priority:** High
**Category:** Tests / Docs
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Closure subtask. Authors the BEHAVIORAL runtime tests (execute the
`PAGE_EFFECTS_RUNTIME_SOURCE` IIFE against a jsdom fixture and simulate
click/keyboard/scroll/pointer to assert the switcher toggle, filter show/hide, and
magnetic transform actually work + reduced-motion suppresses motion), then the
docs + changelog closure. Runs AFTER 534-01..04 landed. Owns its test files +
`_docs/*.md` (NOT `_docs/_TASKS/README.md` / `_docs/_CHANGELOG/*` — orchestrator).

## Leaves

| Leaf | Scope |
|------|-------|
| **534-05-L01** | Behavioral IIFE-exec tests (switcher click/arrow, filter chip, magnetic pointer, reduced-motion) |
| **534-05-L02** | Docs + changelog closure + `_TMP-cms-ograniczenia.md` gap-closure note |

## Coordination

- Behavioral tests are the RUNTIME-lane counterpart to the model/render/static
  lanes (534-01-L04 / 534-02-L04 / 534-03-L02 / 534-04-L04). Per parent 521-01-L04
  precedent, jsdom-exec tests live in the Vitest `tests/vitest/content*` lane.
- Closure changelog number RESOLVED at closure by grepping next-free
  (`_docs/_CHANGELOG/`) — `1243+` after 531/532/533.
- The ≥5-scenario Playwright smoke (parent Acceptance Criteria) is run LIVE by the
  final reviewer post-merge on `:5173`/`:3000` (owner mandate); this subtask
  documents the smoke scenarios, it does not replace the live run.
