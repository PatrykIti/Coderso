# TASK-579: Smoke Adapter Modularization (task-517 browser-actions 1519 Lines)

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1301 (pinned)
**Priority:** Medium
**Size:** Medium

# FileName: TASK-579_Smoke_Adapter_Modularization_Browser_Actions.md

**Parent Task:** none
**Source Findings:** M-560-01 (docs-only finding from the 2026-08-17 TASK-560 audit sweep; audit reports removed by owner 2026-08-18, evidence re-anchored at HEAD `6ca20b38`)

## Purpose

`scripts/runtime-smoke/adapters/task-517/browser-actions.ts` is **1519**
physical lines — a human-authored production smoke module touched by TASK-560,
above the hard 1,000-line AGENTS gate. The subtask contract itself repeats the
limit (`TASK-560-02-...md:40`).

## Evidence

- `wc -l scripts/runtime-smoke/adapters/task-517/browser-actions.ts` = 1519.
- TASK-560-02 contract pins the 1,000-line gate.

## Scope

- Extract cohesive responsibilities into named modules: fixture provisioning,
  public entry actions/assertions, admin actions/assertions (and any other
  natural seams).
- Keep a thin adapter/exports surface and independently runnable tests for the
  extracted modules.
- Do not cut the file arbitrarily by line range; follow cohesive responsibility.

## Fix Strategy

Create e.g. `fixtures.ts`, `public-actions.ts`, `admin-actions.ts` under the
same adapter directory, import/export through a thin `browser-actions.ts`
(index-like), and move the owning tests accordingly.

## Security Contract

- No endpoint change; smoke tooling only. Keep redaction and
  no-secrets-in-screenshots contract.

## Validation

- `wc -l` on every touched file <= 1000.
- `bun test tests/unit/runtime-smoke/cli-registry.test.ts` green (adapter shape
  pinned).
- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Re-run task-517 fast smoke to confirm behavior unchanged.

## Notes

- Hard gate; not a TASK-9999 candidate.
