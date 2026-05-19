# TASK-279-08: Product Compare Report Docs Changelog and Closure

# FileName: TASK-279-08_Product_Compare_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Docs + Playwright QA + Release Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-279-01, TASK-279-02, TASK-279-03, TASK-279-04, TASK-279-05, TASK-279-06, TASK-279-07
**Status:** Done (2026-05-19)

---

## Overview

Close the Product Compare Playwright follow-up family only after implementation
leaves, report evidence, source-of-truth docs, changelog, board state, and
validation output are synchronized.

Source report coverage:

- Final fixed/deferred evidence for all Product Compare findings in
  `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`.
- Screenshot policy from the report: PNG files are local labels and must not be
  committed as required evidence.

## Scope Boundary

In scope:

- Refresh Product Compare report rows with fixed/deferred/current-state notes.
- Update Product Compare widget docs and pack matrix only for behavior that
  actually landed.
- Close TASK-279 rows in `_docs/_TASKS/README.md` with accurate counts.
- Add changelog entry and changelog index rows when leaves/umbrella move to
  Done.

Out of scope:

- Claiming closure for TASK-256 shared-contract fixes.
- Marking report findings fixed based only on task prose or planned work.
- Committing Playwright PNG screenshots.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/WIDGETS.md` only if global widget wording changed.
- `_docs/WIDGET_PACK_MATRIX.md` if readiness/completeness changed.
- `_docs/_TASKS/TASK-279*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/`
- `_docs/_CHANGELOG/README.md`

## Implementation Pseudocode

```md
for each finding in REPORT_PRODUCT_COMPARE_WIDGET:
  if fixed by a TASK-279 leaf:
    record fixed evidence with commit/test references
  else if owned by TASK-256:
    record TASK-256 owner and do not claim fixed here
  else if deferred:
    name the future owner and reason
  else:
    keep TASK-279 open

update task statuses:
  leaf -> Done (YYYY-MM-DD) only after code/docs/tests land
  umbrella -> Done only after every leaf is fixed/deferred with evidence

update changelog:
  add one TASK-279 entry if the family lands as one implementation wave
  or separate entries if leaves land separately
```

Error handling:

- If validation fails for unrelated legacy reasons, record the exact blocker
  and keep the affected TASK-279 row open unless the touched contract is proven
  by a narrower lane.
- If a report item is out of scope because TASK-256 owns it, keep the report
  note explicit and do not list it as TASK-279 fixed.
- If docs and code disagree, fix docs or reopen the leaf before closure.

Regression shape:

- Final audit must map every BF/UX/A finding to fixed, TASK-256, no-action, or
  deferred.
- `git diff --check` must pass for docs.
- Required implementation lanes from completed leaves must be listed with exact
  commands and results.

## Security Contract

This leaf does not add routes or runtime behavior.

- Endpoint visibility: unchanged.
- Auth/RBAC/CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: closure docs must not claim schema validation
  unless validator tests ran.
- Anti-abuse: docs must not publish provider secrets, private product payloads,
  nonce values, or internal-only URLs.
- Secret handling: changelog/report evidence must use redacted or public-safe
  details only.

## Testing Requirements

- `git diff --check`
- All required commands from completed TASK-279 implementation leaves.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/WIDGETS.md` only if global widget wording changed.
- `_docs/WIDGET_PACK_MATRIX.md` if readiness/completeness changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Every Product Compare report finding has explicit final routing and evidence.
- No TASK-256 shared-contract item is overclaimed as fixed by TASK-279.
- Task board statistics and statuses match the physical task files.
- Changelog and source-of-truth docs match the behavior that actually landed.
- Final validation output is recorded before marking TASK-279 Done.
