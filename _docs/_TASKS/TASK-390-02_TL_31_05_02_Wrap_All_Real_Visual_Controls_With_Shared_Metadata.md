# TASK-390-02: TL-31-05-02 - Wrap all real Visual controls with shared metadata
# FileName: TASK-390-02_TL_31_05_02_Wrap_All_Real_Visual_Controls_With_Shared_Metadata.md

**Priority:** High
**Category:** Widgets + Timeline + Admin UI + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-390
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for TL-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TIMELINE_WIDGET.md` and parent `TASK-390`.

Step count, mode/orientation, header, step fields, and some typography/spacing controls mutate state without complete `data-widget-control-path` metadata.

## Sub-Tasks

- [x] Reproduce TL-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Wrap controls in `WidgetControlRow` and align `timelineEditorContract` section ids/paths with actual UI placement.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Strict metadata test mapping section id to paths; smoke fails on unwrapped mutating controls.

## Owner Files

- `core/admin/ui/widgets/editors/TimelineEditors.tsx`
- `core/widgets/core/timeline.tsx`

## Security Contract

No public write. CTA/whole-step links must continue through safe destination helpers; admin metadata remains non-secret.

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

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Strict metadata test mapping section id to paths; smoke fails on unwrapped mutating controls.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TIMELINE_WIDGET.md`
- `_docs/_TASKS/TASK-390_Timeline_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- TL-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes

Closed on 2026-06-02. Timeline Visual mutating controls now expose shared control metadata and the editor contract paths match rendered sections for step count, header copy, marker color, step fields, and spacing/style controls.

Validation recorded for closure:

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 40 tests.
- `git diff --check` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
