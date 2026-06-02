# TASK-380-01: TEAM-31-05-01 - Replace member-count native confirm with shared ConfirmActionDialog
# FileName: TASK-380-01_TEAM_31_05_01_Replace_Member_Count_Native_Confirm_With_Shared_ConfirmActionDialog.md

**Priority:** Medium
**Category:** Widgets + Team + Admin UX + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-380
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for TEAM-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TEAM_WIDGET.md` and parent `TASK-380`.

Native `window.confirm` works but is inconsistent with admin UX and awkward for automated tests.

## Sub-Tasks

- [x] Reproduce TEAM-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Move destructive member count reduction into shared confirm dialog, preserving current copy and undo/safe behavior.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** UI regression: count reduction uses dialog, cancel preserves members, confirm truncates as before.

## Owner Files

- `core/admin/ui/widgets/editors/TeamEditors.tsx`

## Security Contract

No route or public write change. This leaf only changes authenticated admin editor UX for destructive member-count reduction; do not expose raw member payloads, media URLs, or internal identifiers in dialog copy.

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

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx tests/vitest/ui/team-editor-wave.test.tsx`
- Team Playwright count-reduction confirm/cancel smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: UI regression: count reduction uses dialog, cancel preserves members, confirm truncates as before.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/TEAM.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TEAM_WIDGET.md`
- `_docs/_TASKS/TASK-380_Team_Widget_31_05_UI_Audit_UX_and_Fixture_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Closure Notes (2026-06-01)

- Focused UI regression failed before fix because member count reduction mutated through native confirm behavior.
- `setMembersCount` is now confirmation-free and only applies normalized count changes.
- Visual owns pending member-count reduction state and routes destructive reductions through shared `ConfirmActionDialog`.
- Covered by `tests/vitest/ui/team-editor-wave.test.tsx`; existing Team renderer/editor lane remains green.

## Acceptance Criteria

- TEAM-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
