# TASK-389: Search Box 31-05 UI Audit Remediation Family
# FileName: TASK-389_Search_Box_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Search Box + Admin UI + Runtime Diagnostics + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SEARCH_BOX_WIDGET.md
**Status:** Done (2026-06-02)

---

## Overview

Fix Search Box Advanced route-submit diagnostics in listing/global modes.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SEARCH_BOX_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Search Box. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- SB-31-05-01: Route-submit rows must be hidden or marked inactive outside route-submit mode

## Sub-Tasks

- [x] [TASK-389-01](TASK-389-01_SB_31_05_01_Route_Submit_Rows_Must_Be_Hidden_Or_Marked.md): SB-31-05-01 - Route-submit rows must be hidden or marked inactive outside route-submit mode

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write. Search forms remain read-only query/navigation endpoints; keep route destinations safe and schema-bounded.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/SEARCH_BOX.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SEARCH_BOX_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1079; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes

Closed on 2026-06-02. Search Box Advanced now shows an `Active routing` summary for the effective runtime branch and only renders `Results page` plus `Search term routing` rows when `mode="route-submit"`.

Validation recorded for closure:

- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx` - passed, 18 tests.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts` - passed, 9 tests.
- `git diff --check` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
