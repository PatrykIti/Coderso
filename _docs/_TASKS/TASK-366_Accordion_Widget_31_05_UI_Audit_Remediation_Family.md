# TASK-366: Accordion 31-05 UI Audit Remediation Family
# FileName: TASK-366_Accordion_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Accordion + Runtime Security + Builder Metadata + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ACCORDION_WIDGET.md
**Status:** To Do

---

## Overview

Close Accordion runtime identity, unsafe style, and repeatable Structure metadata gaps.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ACCORDION_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Accordion. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- ACC-31-05-01: Custom item IDs must match `defaultOpenIds` in public runtime
- ACC-31-05-02: Sanitize Accordion surface/text/border color fields
- ACC-31-05-03: Complete repeatable Structure metadata for item actions

## Sub-Tasks

- [ ] [TASK-366-01](TASK-366-01_ACC_31_05_01_Custom_Item_IDs_Must_Match_DefaultOpenIds_In_Public.md): ACC-31-05-01 - Custom item IDs must match `defaultOpenIds` in public runtime
- [ ] [TASK-366-02](TASK-366-02_ACC_31_05_02_Sanitize_Accordion_Surface_Text_Border_Color_Fields.md): ACC-31-05-02 - Sanitize Accordion surface/text/border color fields
- [ ] [TASK-366-03](TASK-366-03_ACC_31_05_03_Complete_Repeatable_Structure_Metadata_For_Item_Actions.md): ACC-31-05-03 - Complete repeatable Structure metadata for item actions

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new route. Style and imported widget payloads must be sanitized before public render. Admin writes remain internal/session/RBAC/CSRF protected and strict-schema validated.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ACCORDION_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1056; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
