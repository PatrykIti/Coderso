# TASK-364: Split Layout 31-05 UI Audit Remediation Family
# FileName: TASK-364_Split_Layout_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Split Layout + Admin UI + Builder Metadata + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPLIT_LAYOUT_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Make Split Layout diagnostics describe effective phone behavior and remove misleading fixed-pane move actions.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPLIT_LAYOUT_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Split Layout. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- SPL-31-05-01: Phone ratio summary must respect stacked mobile mode
- SPL-31-05-02: Do not show Move up/down for fixed left/right panes

## Sub-Tasks

- [x] [TASK-364-01](TASK-364-01_SPL_31_05_01_Phone_Ratio_Summary_Must_Respect_Stacked_Mobile_Mode.md): SPL-31-05-01 - Phone ratio summary must respect stacked mobile mode
- [x] [TASK-364-02](TASK-364-02_SPL_31_05_02_Do_Not_Show_Move_Up_Down_For_Fixed.md): SPL-31-05-02 - Do not show Move up/down for fixed left/right panes

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No API route or public write changes. Metadata changes stay admin-only and must not change public pane content rendering.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPLIT_LAYOUT_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1054; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Split Layout Visual now passes `collapseMobile` into the ratio disclosure, reports stacked phones as `phone stacked`, and labels saved phone ratios as dormant while `collapseMobile="stack"`.
- Active ratio metadata and the `Custom device layout` badge now ignore dormant phone-only ratios in stack mode while still preserving saved phone ratios for future `keep` mode.
- Desktop split card changes no longer create a tablet override only because a dormant phone split exists; tablet syncs with the selected desktop split unless an active tablet/phone override is present.
- Shared Structure metadata for fixed Split Layout panes now exposes `slots.left` and `slots.right` row paths while omitting non-applicable Move up / Move down controls.
- Rawls read-only agent found two TASK-364 drifts before closure; both were resolved with additional dormant-phone and interaction regression coverage.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts`; `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/widgets/editorContract.test.ts`; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`; `git diff --cached --check`; `timeout 120s claude -p --dangerously-skip-permissions --max-budget-usd 1 "Review staged diff for TASK-364 only..."` returned no blockers.
- Covered by changelog `1054` together with TASK-364-01 and TASK-364-02.
