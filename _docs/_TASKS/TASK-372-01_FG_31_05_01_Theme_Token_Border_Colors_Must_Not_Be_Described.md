# TASK-372-01: FG-31-05-01 - Theme token border colors must not be described as saved custom colors
# FileName: TASK-372-01_FG_31_05_01_Theme_Token_Border_Colors_Must_Not_Be_Described.md

**Priority:** Medium
**Category:** Widgets + Feature Grid + Admin UI + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-372
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for FG-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FEATURE_GRID_WIDGET.md` and parent `TASK-372`.

`describeFeatureGridColor` treats `var(...)` as `Saved custom color`, making default token state look user-authored.

## Sub-Tasks

- [x] Reproduce FG-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Reuse shared color state description or add token/color-mix recognition so `surfaceColor`, `borderColor`, and `sectionBackground` describe theme tokens, theme defaults, and `color-mix(...)` values accurately instead of calling them saved custom colors.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** UI regression: `style.surfaceColor`, `style.borderColor`, and `style.sectionBackground` values such as `var(--color-border)` and `color-mix(...)` render token/default/mixed-color copy, not saved custom color.

## Owner Files

- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx`

## Security Contract

No route or public write changes. Do not expose raw style values beyond existing safe summaries.

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

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/widgets/featureGrid.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: UI regression: `style.surfaceColor`, `style.borderColor`, and `style.sectionBackground` token or `color-mix(...)` values render token/default/mixed-color copy, not saved custom color.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-372_Feature_Grid_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- FG-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced FG-31-05-01 with a focused Advanced UI regression: `style.surfaceColor`, `style.borderColor`, and `style.sectionBackground` token values all rendered as `Saved custom color`.
- Replaced the local Advanced-only color wording with the shared `describeSharedColorControlState()` contract used by shared color controls.
- `var(...)` and `color-mix(...)` now summarize as `Theme token`, empty values as `Theme default`, `transparent` as `Transparent`, picker values as selected color, and non-representable values as saved custom color.
- No route, public write, renderer, or persistence contract changed; this is read-only admin diagnostics wording.
- Claude staged review reported no blockers for shared color contract alignment, Advanced wording, focused regression, and read-only scope.
- Validation: focused regression failed before the fix and passed after; Feature Grid Vitest lane passed; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1062`.
