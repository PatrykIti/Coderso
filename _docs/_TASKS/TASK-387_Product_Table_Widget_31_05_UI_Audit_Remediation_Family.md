# TASK-387: Product Table 31-05 UI Audit Remediation Family
# FileName: TASK-387_Product_Table_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Product Table + Commerce UI + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_TABLE_WIDGET.md
**Status:** Done (2026-06-02)

---

## Overview

Fix Product Table Advanced visitor-control truthfulness for collection filters without available collections.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_TABLE_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Product Table. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- PT-31-05-01: Saved collection filter toggle must be distinguished from active public control
- PT-31-05-02: Add commerce image/detail/action fixture coverage

## Sub-Tasks

- [x] [TASK-387-01](TASK-387-01_PT_31_05_01_Saved_Collection_Filter_Toggle_Must_Be_Distinguished_From.md): PT-31-05-01 - Saved collection filter toggle must be distinguished from active public control
- [x] [TASK-387-02](TASK-387-02_PT_31_05_02_Add_Commerce_Image_Detail_Action_Fixture_Coverage.md): PT-31-05-02 - Add commerce image/detail/action fixture coverage

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new route. Public controls remain read-only query controls; no secrets or backend-only commerce data in Advanced summaries.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productTable.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_TABLE_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1077; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes

Done on 2026-06-02.

- Product Table Advanced now distinguishes saved public filter toggles from visible visitor controls when runtime options are unavailable.
- Product Table smoke bootstrap now seeds media-backed commerce products, a safe `/fixture-products/:slug` products route, audited page data, and publish for Product Table.
- Product Table generated smoke proof now checks admin and public images, safe Product-column title links, and visible action CTAs.
- Changelog coverage: `_docs/_CHANGELOG/1077-2026-06-02-product-table-widget-31-05-ui-audit-remediation.md`.

Validation:

- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productTable.test.tsx`
- `bun test tests/integration/routes/productTablePreview.test.ts tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget product-table --output-json .tmp/task-387-product-table-smoke-dry-run.json --output-md .tmp/task-387-product-table-smoke-dry-run.md`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
