# TASK-382: Content List 31-05 UI Audit Remediation Family
# FileName: TASK-382_Content_List_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Content List + Admin UI + Runtime Fixtures + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTENT_LIST_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Fix hidden legacy taxonomy state when Content List switches to listing-query mode and add populated fixture coverage.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTENT_LIST_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Content List. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- CL-31-05-01: `legacy -> listing` must not report hidden taxonomy as active
- CL-31-05-02: Add populated Content List browser fixture

## Sub-Tasks

- [x] [TASK-382-01](TASK-382-01_CL_31_05_01_Legacy_Listing_Must_Not_Report_Hidden_Taxonomy_As.md): CL-31-05-01 - `legacy -> listing` must not report hidden taxonomy as active
- [x] [TASK-382-02](TASK-382-02_CL_31_05_02_Add_Populated_Content_List_Browser_Fixture.md): CL-31-05-02 - Add populated Content List browser fixture

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new public write. Listing/content fixture setup must use internal/admin APIs with auth/RBAC/CSRF. Public renderer remains read-only and safe-link bounded.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/contentList.test.tsx`
- Content List populated Playwright smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTENT_LIST_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1072; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes

- CL-31-05-01 fixed: `updateSourceMode(...listing)` clears `filters.taxonomy`, and `normalizeContentListData` clears dormant legacy filters for listing-mode payloads before Advanced/runtime summaries.
- CL-31-05-02 fixed: widget smoke now bootstraps a populated Content List page fixture with image, tags, hrefs, load-more runtime, view-all destination, PATCH+publish via authenticated admin page APIs, and a dedicated `contentProof` result.
- Focused regressions failed before the fix for stale taxonomy, listing-mode normalizer state, and missing Content List smoke fixture helpers.
- Validation passed: `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`; `bun test tests/unit/widgets/contentList.test.tsx tests/unit/playwright-widget-contract-smoke.test.ts`; `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget content-list --output-json .tmp/task-382-content-list-smoke-dry-run.json --output-md .tmp/task-382-content-list-smoke-dry-run.md`; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- The task references `tests/vitest/widgets/contentList.test.tsx`, but the current checked-out lane owns this widget renderer/domain coverage in `tests/unit/widgets/contentList.test.tsx`; that Bun suite was run instead.
- Full live Playwright replay was not run because `CODERSO_PLAYWRIGHT_EMAIL` and `CODERSO_PLAYWRIGHT_PASSWORD` are not available in `.env`.
