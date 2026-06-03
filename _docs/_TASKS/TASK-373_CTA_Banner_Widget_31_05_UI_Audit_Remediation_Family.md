# TASK-373: CTA Banner 31-05 UI Audit Remediation Family
# FileName: TASK-373_CTA_Banner_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + CTA Banner + Admin UI + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CTA_BANNER_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Fix CTA Banner Advanced background diagnostics when a gradient is configured.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CTA_BANNER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for CTA Banner. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- CTA-31-05-01: Advanced must report active background gradients

## Sub-Tasks

- [x] [TASK-373-01](TASK-373-01_CTA_31_05_01_Advanced_Must_Report_Active_Background_Gradients.md): CTA-31-05-01 - Advanced must report active background gradients

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No route change. Keep gradient values normalized through existing background style owner; do not expose raw unsafe CSS strings.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CTA_BANNER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1063; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Reproduced CTA-31-05-01 with a failing Advanced UI regression: an active `background.gradient` rendered in runtime but Advanced `Style diagnostics` omitted it and only showed the background color fallback.
- CTA Banner Advanced now includes a read-only `Background gradient` diagnostic with `Configured` or `Not configured`, so gradient-only backgrounds are no longer reported as theme-default color state.
- The diagnostic intentionally does not print the raw gradient CSS string; runtime rendering and normalization stay owned by the existing CTA Banner widget contract.
- Added a focused Advanced regression that asserts the configured gradient state appears and the raw `linear-gradient(...)` value is not exposed.
- Epicurus read-only agent confirmed the source/report drift and the expected no-raw-CSS Advanced diagnostics fix.
- Claude staged review reported no blockers and confirmed gradient diagnostic truthfulness, no raw CSS exposure, test coverage, docs/task/changelog consistency, and no runtime regression.
- Validation: focused regression failed before the fix and passed after; `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx`; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1063` together with TASK-373-01.
