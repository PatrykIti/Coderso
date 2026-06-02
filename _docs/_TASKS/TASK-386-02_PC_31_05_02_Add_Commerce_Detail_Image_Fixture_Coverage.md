# TASK-386-02: PC-31-05-02 - Add commerce detail/image fixture coverage
# FileName: TASK-386-02_PC_31_05_02_Add_Commerce_Detail_Image_Fixture_Coverage.md

**Priority:** Medium
**Category:** Widgets + Product Compare + Commerce UI + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-386
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for PC-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_COMPARE_WIDGET.md` and parent `TASK-386`.

No product detail route or image URLs meant linked titles, CTA, and product images were not browser-proven.

## Sub-Tasks

- [x] Reproduce PC-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Seed product detail routes, safe hrefs, and image URLs.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Product Compare populated Playwright smoke for images/title links/CTA.

## Owner Files

- `scripts/playwright-widget-contract-smoke.ts`
- `core/widgets/core/productCompare.tsx`

## Security Contract

No public write. Safe link resolution must continue to reject unsafe product hrefs and add target/rel correctly.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Endpoint visibility must be explicit if a route is touched: internal admin routes require session/RBAC/CSRF; public routes require the existing widget-specific public access contract.
- Public writes must use nonce/signature/HMAC or the existing equivalent, optional CAPTCHA where configured, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for malformed IDs, unsafe hrefs, unsafe CSS, stale runtime data, and empty resolver states.
- Browser-visible state must not contain secrets, provider keys, privileged settings, persisted nonce values, or internal-only identifiers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx`
- Product Compare populated Playwright smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Product Compare populated Playwright smoke for images/title links/CTA.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/TASK-386_Product_Compare_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- PC-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes

Done on 2026-06-02.

- Product Compare smoke bootstrap now ensures deterministic media-backed products, a safe products detail route, the 31-05 audit page patch, and publish.
- Generated admin smoke proof now verifies Product Compare admin/public image output, safe title links, and visible CTAs.
- Shared commerce seed now includes an out-of-stock fixture product for visible stock-label coverage.
- Changelog coverage: `_docs/_CHANGELOG/1076-2026-06-02-product-compare-widget-31-05-ui-audit-remediation.md`.

Validation:

- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget product-compare --output-json .tmp/task-386-product-compare-smoke-dry-run.json --output-md .tmp/task-386-product-compare-smoke-dry-run.md`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
