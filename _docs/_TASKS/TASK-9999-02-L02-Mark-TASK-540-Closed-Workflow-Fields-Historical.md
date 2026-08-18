# TASK-9999-02-L02: Mark TASK-540 Closed Workflow Fields Historical

**Status:** ✅ Done
**Started:** 2026-08-17
**Completed:** 2026-08-18
**Changelog:** 1304 (pinned)

# FileName: TASK-9999-02-L02-Mark-TASK-540-Closed-Workflow-Fields-Historical.md

**Parent Subtask:** TASK-9999-02
**Source Findings:** M-540-03 (docs-only finding from the TASK-560 audit sweep,
re-anchored to current task files at HEAD `6ca20b38`; the original
`_TMP-audit-task-540-custom-screens.md` report was removed by the owner on
2026-08-18).

## Purpose

TASK-540 parent has `**Status:** ✅ Done` and a Completion section
(`TASK-540_...md:9-10`, `:794-799`), yet earlier "Current/..." fields still
describe pending post-audit, full validation, smoke, changelog, and closure
work (`:14-37`, `:50-66`, `:87-101`). Children 03/04/06 also retain
"remain pending" wording despite `✅ Done`. This is documentation drift that
could mislead an operator into re-closing the family.

## Scope

- Mark the historical workflow fields as historical (e.g. "Historical workflow
  notes — completed via Changelog 1252").
- Remove/neutralize "Current/pending" language in the parent and children
  03/04/06.
- Point smoke ownership to TASK-552/TASK-560.
- Do NOT change any `**Status:**` field or README statistics.

## Validation

- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` stays green.
- `git diff --stat` shows only TASK-540 parent + children 03/04/06 wording, no
  `Status:` changes.

## Deferral Rationale

Docs-only workflow wording; zero product/data/security/perf/test-integrity
impact. Changelog 1252 already records the actual closure.
