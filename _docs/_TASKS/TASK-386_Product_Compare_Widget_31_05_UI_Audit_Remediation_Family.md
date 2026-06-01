# TASK-386: Product Compare 31-05 UI Audit Remediation Family
# FileName: TASK-386_Product_Compare_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Product Compare + Commerce UI + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_COMPARE_WIDGET.md
**Status:** To Do

---

## Overview

Fix Product Compare Advanced query diagnostics when exact selected products override filters.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_COMPARE_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Product Compare. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- PC-31-05-01: Search/collections/status filters must be marked ignored for selected products
- PC-31-05-02: Add commerce detail/image fixture coverage

## Sub-Tasks

- [ ] [TASK-386-01](TASK-386-01_PC_31_05_01_Search_Collections_Status_Filters_Must_Be_Marked_Ignored.md): PC-31-05-01 - Search/collections/status filters must be marked ignored for selected products
- [ ] [TASK-386-02](TASK-386-02_PC_31_05_02_Add_Commerce_Detail_Image_Fixture_Coverage.md): PC-31-05-02 - Add commerce detail/image fixture coverage

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write. Safe link resolution must continue to reject unsafe product hrefs and add target/rel correctly.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx`
- Product Compare populated Playwright smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1076; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
