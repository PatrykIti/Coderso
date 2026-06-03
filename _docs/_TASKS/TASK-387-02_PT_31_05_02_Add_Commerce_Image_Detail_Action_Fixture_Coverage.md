# TASK-387-02: PT-31-05-02 - Add commerce image/detail/action fixture coverage
# FileName: TASK-387-02_PT_31_05_02_Add_Commerce_Image_Detail_Action_Fixture_Coverage.md

**Priority:** Medium
**Category:** Widgets + Product Table + Commerce UI + Playwright Fixtures + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-387
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for the Product Table fixture limitation from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_TABLE_WIDGET.md` and parent `TASK-387`.

The 31-05 browser pass could only verify Product Table image/link/action fallback behavior because the audited fixture lacked media-backed products and a safe product detail route.

## Sub-Tasks

- [x] Reproduce the fixture limitation from the report and record the observed admin/public state in closure notes.
- [x] Extend smoke bootstrap without weakening safe href or media resolution contracts.
- [x] Add focused smoke helper coverage for Product Table page fixture and browser proof behavior.
- [x] Update parent task, report notes, widget docs, and changelog coverage before closure.

## Implementation Pseudocode

**Helper/function shape:** Add Product Table fixture selection, page-data builder, and generated Playwright proof for images, safe linked cells, and action CTAs.

**Data flow:**

1. Reuse authenticated commerce fixture products, media, and products content-route bootstrap.
2. Patch only the audited Product Table page block, preserving page metadata and unrelated blocks.
3. Enable image column, safe linked Product column, and action CTAs in deterministic page data.
4. In generated Playwright proof, verify admin and public output for image alt, safe relative product links, and visible action CTAs.

**Error handling:**

- Keep all writes under authenticated admin APIs with CSRF.
- Keep public output read-only and fail closed for unsafe/missing `productHref` or media.
- Do not expose secrets, nonce material, provider keys, or backend-only debug payloads in browser-visible state.

**Regression-test shape:** Smoke helper unit tests for Product Table page-data fixture and authenticated admin bootstrap; Product Table smoke dry-run for inventory selection.

## Owner Files

- `scripts/playwright-widget-contract-smoke.ts`
- `tests/unit/playwright-widget-contract-smoke.test.ts`
- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json`

## Security Contract

No public write. Product Table public controls remain read-only GET/query controls. Safe product links must remain relative and must suppress unsafe/missing hrefs.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility remains explicit: fixture writes use internal authenticated admin routes with session and CSRF.
- Auth/RBAC/CSRF follows existing admin route conventions for page, settings, media, and commerce writes.
- Public writes are not introduced.
- Public read/render paths fail closed for malformed IDs, unsafe hrefs, unsafe CSS, stale runtime data, missing media, and empty resolver states.
- Browser-visible state must not contain secrets, provider keys, privileged settings, persisted nonce values, or internal-only identifiers.

## Testing Requirements

- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget product-table --output-json .tmp/task-387-product-table-smoke-dry-run.json --output-md .tmp/task-387-product-table-smoke-dry-run.md`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_TABLE_WIDGET.md`
- `_docs/_TASKS/TASK-387_Product_Table_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- Product Table smoke fixture proves image, safe linked Product cell, and action CTA branches or reclassifies the limitation with fresh evidence.
- Safe href/media fail-closed behavior remains intact.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes

Done on 2026-06-02.

- Product Table smoke bootstrap now ensures media-backed commerce products, a safe products detail route, audited Product Table page data, and publish.
- Generated admin smoke proof now verifies Product Table admin/public image output, safe Product-column title links, and visible action CTAs.
- Shared commerce seed keeps the out-of-stock fixture product for visible stock-state coverage.
- Changelog coverage: `_docs/_CHANGELOG/1077-2026-06-02-product-table-widget-31-05-ui-audit-remediation.md`.

Validation:

- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget product-table --output-json .tmp/task-387-product-table-smoke-dry-run.json --output-md .tmp/task-387-product-table-smoke-dry-run.md`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
