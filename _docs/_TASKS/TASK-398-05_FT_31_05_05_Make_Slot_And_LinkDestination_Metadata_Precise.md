# TASK-398-05: FT-31-05-05 - Make slot and LinkDestination metadata precise
# FileName: TASK-398-05_FT_31_05_05_Make_Slot_And_LinkDestination_Metadata_Precise.md

**Priority:** High
**Category:** Widgets + Footer + Runtime Security + Admin UI + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-398
**Status:** Done

---

## Overview

Execution-ready leaf task for FT-31-05-05 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md` and parent `TASK-398`.

Slot/link destination controls function but metadata is too generic for per-option audit.

Status log:

- 2026-06-02: Moved to In Progress with TASK-398 Footer remediation.
- 2026-06-02: Done. Destination field metadata has a single owner per path,
  and Visual/Advanced expose read-only `slots` metadata rows.

## Sub-Tasks

- [x] Reproduce FT-31-05-05 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Add stable paths/action ids for footer slots and destination controls, including column/link target identifiers.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** DOM metadata regression for Footer link/slot controls.

## Owner Files

- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`

## Security Contract

No public write. Public footer must fail closed for unsafe hrefs/logo URLs and bounded style data; admin writes remain internal/session/RBAC/CSRF protected and strict-schema validated.

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

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: DOM metadata regression for Footer link/slot controls.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/TASK-398_Footer_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- FT-31-05-05 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes

- Observed stale report state: Footer destination controls had duplicate
  writable path wrappers, and `slots` was declared read-only without a DOM row
  in Visual/Advanced.
- Removed duplicate Footer wrappers around `LinkDestinationField` and added
  read-only `slots` summary rows in Visual slot overview and Advanced support
  summary.
- Added focused DOM metadata regression coverage in
  `tests/vitest/ui/footer-editor-wave.test.tsx`.
- Validation: `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` passed, 3 files / 41 tests.
