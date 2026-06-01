# TASK-374: FAQ Accordion 31-05 UI Audit Remediation Family
# FileName: TASK-374_FAQ_Accordion_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + FAQ Accordion + Admin Preview + Accessibility + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FAQ_ACCORDION_WIDGET.md
**Status:** To Do

---

## Overview

Make FAQ admin preview disclosure accessibility state match public runtime or clearly document the preview boundary.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FAQ_ACCORDION_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for FAQ Accordion. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- FAQ-31-05-01: Admin preview click must sync `summary[aria-expanded]` or show a boundary notice

## Sub-Tasks

- [ ] [TASK-374-01](TASK-374-01_FAQ_31_05_01_Admin_Preview_Click_Must_Sync_Summary_Aria_Expanded.md): FAQ-31-05-01 - Admin preview click must sync `summary[aria-expanded]` or show a boundary notice

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No API route or public write changes. Admin bootstrap must be read-only and must not execute arbitrary persisted scripts.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FAQ.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FAQ_ACCORDION_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1064; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
