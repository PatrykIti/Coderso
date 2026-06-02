# TASK-391-01: CT-31-05-01 - `Hidden` label size must either hide labels or be renamed
# FileName: TASK-391-01_CT_31_05_01_Hidden_Label_Size_Must_Either_Hide_Labels_Or.md

**Priority:** High
**Category:** Widgets + Compare Timeline + Admin UI + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-391
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for CT-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_COMPARE_TIMELINE_WIDGET.md` and parent `TASK-391`.

`none` removes size classes but labels remain visible, while UI labels say `Hidden` for track, step, and segment label size.

## Sub-Tasks

- [x] Reproduce CT-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Treat the `none` label-size option as inherited/default sizing, rename the admin copy to `Default / no explicit size`, and keep labels rendered for accessibility instead of hiding them.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Renderer/UI regressions for track/step/segment `none` matching chosen semantics.

## Owner Files

- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `core/widgets/core/compareTimeline.tsx`

## Closure Notes

Closed on 2026-06-02.

- Reproduced from the 31-05 report evidence: `none` removed text-size classes but did not hide track, step, or segment labels.
- Kept the accessible visible-label behavior and renamed the admin option copy from `Hidden` to `Inherit`.
- Added renderer/UI regression coverage proving `none` keeps labels visible without explicit bounded text-size classes and no select copy promises hidden labels.
- Validation recorded in the parent TASK-391 closure notes.

## Security Contract

No public write. Segment links must remain safe-link resolved and dormant diagnostics must not expose hidden privileged data.

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

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Renderer/UI regressions for track/step/segment `none` matching chosen semantics.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_COMPARE_TIMELINE_WIDGET.md`
- `_docs/_TASKS/TASK-391_Compare_Timeline_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- CT-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
