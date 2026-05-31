# TASK-281-10: Product Table Report, Docs, Changelog, and Closure

# FileName: TASK-281-10_Product_Table_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Commerce + Playwright QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-281-03, TASK-281-04, TASK-281-05, TASK-281-06, TASK-281-07, TASK-281-08, TASK-281-09
**Status:** Done (2026-05-22)

---

## Overview

Close the Product Table Playwright follow-up family after implementation leaves
land. This leaf owns final report evidence, widget docs, changelog, task-board
status, and validation records for TASK-281.

## Scope Boundary

In scope:

- finding-by-finding closure of
  `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`;
- Product Table widget docs updates;
- task status and `_docs/_TASKS/README.md` synchronization;
- changelog entry and changelog index update;
- final validation evidence for all Product Table leaves.

Out of scope:

- implementing new Product Table behavior;
- reopening TASK-256 shared-contract fixes;
- committing Playwright PNG screenshot artifacts.

## Sub-Tasks

- [x] Build a finding-by-finding Product Table closure matrix, including no-action and TASK-256-owned rows.
- [x] Add the missing TASK-281-09 and final TASK-281-10 closure evidence to the Product Table Playwright report.
- [x] Update Product Table widget docs and any impacted pack/global docs only where the final shipped behavior still lacks closure wording.
- [x] Add the final family changelog entry and changelog index row after the last validation rerun.
- [x] Move TASK-281 and TASK-281-10 rows to the correct board status and record the exact final validation outcomes, including accepted local scanner gaps.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` | Add the missing TASK-281-09 evidence, a final closure matrix for every Product Table finding/no-action row, and final family validation notes. Keep screenshot filenames textual only. |
| `_docs/_WIDGETS/PRODUCT_TABLE.md` | Reflect final schema, editor, runtime, accessibility, preview, and public-control behavior. |
| `_docs/WIDGETS.md` | Update only if TASK-281 changes a global widget summary or Product Table readiness text. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Product Table readiness/completeness changes. |
| `_docs/_TASKS/TASK-281*.md` | Move TASK-281-10 and the TASK-281 umbrella to `Done (YYYY-MM-DD)` only after validation and changelog evidence exist. |
| `_docs/_TASKS/README.md` | Move `TASK-281-10` from To Do, move the `TASK-281` umbrella from In Progress to Done, remove the stale `TASK-281-08` duplicate To Do row, and recompute statistics. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-281-product-table-widget-followups.md` | Add the final family closure changelog entry after the last validation rerun. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog row with the correct number/order. |

## Implementation Pseudocode

Closure matrix:

```ts
type ProductTableFindingStatus =
  | "fixed"
  | "deferred"
  | "no-action"
  | "covered-by-task-256";

type ProductTableClosureRow = {
  reportId: string;
  status: ProductTableFindingStatus;
  ownerTask: string;
  evidence: string;
  validation: string[];
};
```

Checklist flow:

```md
| Finding | Status | Owner | Evidence | Validation |
|---|---|---|---|---|
| BUG-00 | fixed | TASK-281-01 | Admin preview renders resolved rows | product-table-editor-wave |
```

Error handling:

- If a finding is not implemented, record `deferred` with a concrete reason and
  future task owner, not a vague "later" note.
- If a validation command cannot run, keep the relevant task open unless the
  blocker is documented and accepted.
- If another agent changed `_docs/_TASKS/README.md`, preserve both task families
  and recompute statistics instead of replacing the file wholesale.

## Security Contract

No API routes are added by closure docs.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must verify any schema changes from
  implementation leaves remain covered by tests.
- Anti-abuse: report/changelog must not include secrets, tokens, private URLs,
  or privileged debug payloads.
- Secret handling: redact logs/report snippets if they contain sensitive data;
  do not commit Playwright screenshot artifacts.

## Testing Requirements

Final family validation must include the commands required by completed leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- This leaf is the documentation closure leaf; all files listed above must be
  current before TASK-281 moves to Done.

## Changelog Policy

- TASK-281 cannot move to `Done` without a changelog entry under
  `_docs/_CHANGELOG/` and a matching `_docs/_CHANGELOG/README.md` row.
- If leaves are completed in separate commits, each completed leaf must either
  have its own changelog entry or be explicitly covered by the final family
  entry.

## Acceptance Criteria

- Every Product Table report finding and already-working/no-action Product Table row has an explicit fixed/deferred/no-action/TASK-256 status.
- `_docs/_TASKS/README.md` statistics and rows match the physical TASK-281 files.
- Widget docs and report evidence describe the final behavior that actually
  exists in code.
- Final validation commands are recorded with pass/fail status and any accepted
  local blockers such as missing security scanners.
- No Playwright PNG artifacts or sensitive debug payloads are committed.

## Completion Record

- `TASK-281` and `TASK-281-10` are closed as `Done (2026-05-22)` after the final family rerun.
- Changelog entry: `_docs/_CHANGELOG/903-2026-05-22-task-281-product-table-widget-closure.md`.
- Final validation outcomes:
  - `bun --cwd core lint` — PASS
  - `bun --cwd core lint:types` — PASS
  - `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx` — PASS
  - `set -a && source .env && set +a && bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts` — PASS
  - `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts` — PASS
  - `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts` — PASS
  - `set -a && source .env && set +a && bun test tests/integration/runtime/product-table-runtime-pagination.test.ts` — PASS
  - `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts` — PASS
  - `set -a && source .env && set +a && bun run gates:coderso` — PASS
  - `bun run scan:security:strict` — PARTIAL PASS (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)
  - `bun run precommit` — PASS
  - `git diff --check` — PASS
