# TASK-371: Hero 31-05 UI Audit Continuation and Remediation Family
# FileName: TASK-371_Hero_Widget_31_05_UI_Audit_Continuation_and_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md
**Status:** To Do

---

## Overview

Complete the partial Hero audit and fix the confirmed CTA layout UX defect found in the first pass.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Hero. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- HERO-31-05-01: Dual CTA should restore a useful secondary CTA after Single CTA
- HERO-31-05-02: Finish the remaining Hero option matrix from the report

## Sub-Tasks

- [ ] [TASK-371-01](TASK-371-01_HERO_31_05_01_Dual_CTA_Should_Restore_A_Useful_Secondary_CTA.md): HERO-31-05-01 - Dual CTA should restore a useful secondary CTA after Single CTA
- [ ] [TASK-371-02](TASK-371-02_HERO_31_05_02_Finish_The_Remaining_Hero_Option_Matrix_From_The.md): HERO-31-05-02 - Finish the remaining Hero option matrix from the report

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new route expected. Destination/media URLs remain schema-bounded and rendered through safe link/media helpers; admin writes internal/session/RBAC/CSRF protected.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- Hero Playwright replay for all remaining UI options
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1061; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
