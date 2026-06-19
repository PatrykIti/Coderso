# TASK-469-03-L01: Live Smoke Docs Changelog And Audit Closure
# FileName: TASK-469-03-L01-Live-Smoke-Docs-Changelog-And-Audit-Closure.md

**Parent Subtask:** TASK-469-03
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-469-02-L01
**Status:** ⏳ To Do

---

## Overview

Final executable leaf: run the targeted lanes + release gate, perform a live
`playwright-cli` rich inline-edit replay, write the changelog, sync the board, and
reconcile the audit residual.

## Sub-Tasks

- [ ] Run the Vitest contract + sanitizer suites, the canvas UI flow suite, lint,
      types, and `bun run gates:coderso`; record results.
- [ ] Live `coderso-dev-core-host` + `playwright-cli`: publish a page with a
      `format:"rich"` block, inline-edit on the canvas (add `<strong>` + a link),
      blur, confirm the panel field shows the same markup and the public front
      paints it; delete the throwaway page afterward.
- [ ] Add a dated changelog entry (next free number at closure) and index it in
      `_docs/_CHANGELOG/README.md`.
- [ ] Move TASK-469 and all children to `✅ Done` in `_docs/_TASKS/README.md`;
      update To Do / Done statistics.
- [ ] Reconcile `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §9.4 item 1 and the
      §3.4 row to resolved, referencing TASK-469.

## Files To Change

| File | Required change |
|---|---|
| `_docs/_CHANGELOG/{N}-{date}-task-469-rich-inline-edit-fidelity.md` | New entry (allocate next free number at closure). |
| `_docs/_CHANGELOG/README.md` | Index row + next-number bump. |
| `_docs/_TASKS/README.md` | Status + statistics. |
| `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` | §9.4 item 1 + §3.4 reconciled. |

## Testing Requirements

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-authoring-sanitizers.test.ts`
- Canvas inline-edit UI flow suite.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`

## Documentation Updates Required

- Changelog entry + index, board, audit §9.4 (see Files To Change).

## Acceptance Criteria

1. All lanes/gates green and recorded; live smoke evidence captured.
2. Changelog entry added + indexed; board + statistics synced.
3. Audit §9.4 item 1 + §3.4 reconciled to resolved.
4. TASK-469 has no open children.
