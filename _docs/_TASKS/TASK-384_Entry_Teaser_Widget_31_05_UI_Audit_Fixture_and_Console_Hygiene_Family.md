# TASK-384: Entry Teaser 31-05 UI Audit Fixture and Console Hygiene Family
# FileName: TASK-384_Entry_Teaser_Widget_31_05_UI_Audit_Fixture_and_Console_Hygiene_Family.md

**Priority:** Medium
**Category:** Widgets + Entry Teaser + Runtime Fixtures + Admin Console + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ENTRY_TEASER_WIDGET.md
**Status:** To Do

---

## Overview

Entry Teaser had no hard widget-owned defect; close the populated fixture gap and investigate repeatable app-level console noise.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ENTRY_TEASER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Entry Teaser. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- ET-31-05-01: Add seeded content/listing fixture for resolved teaser branches
- ET-31-05-02: Investigate app-level React `createRoot/createPortal` console error if reproducible

## Sub-Tasks

- [ ] [TASK-384-01](TASK-384-01_ET_31_05_01_Add_Seeded_Content_Listing_Fixture_For_Resolved_Teaser.md): ET-31-05-01 - Add seeded content/listing fixture for resolved teaser branches
- [ ] [TASK-384-02](TASK-384-02_ET_31_05_02_Investigate_App_Level_React_CreateRoot_CreatePortal_Console_Error.md): ET-31-05-02 - Investigate app-level React `createRoot/createPortal` console error if reproducible

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write. Fixture setup uses authenticated internal/admin APIs only; renderer keeps safe link/media policies.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- Entry Teaser populated Playwright smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1074; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
