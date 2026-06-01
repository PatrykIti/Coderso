# TASK-396: Contact 31-05 UI Audit Remediation Family
# FileName: TASK-396_Contact_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Contact + Public Forms API + Security + Admin UI + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTACT_WIDGET.md
**Status:** To Do

---

## Overview

Close Contact public Forms runtime, error state, binding, CAPTCHA projection, admin canvas, metadata, URL safety, and Visual path gaps.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTACT_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Contact. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- CONTACT-31-05-01: Mount Contact public Forms runtime submit route
- CONTACT-31-05-02: Reset submit button label after failure
- CONTACT-31-05-03: Bind duplicate Contact runtimes independently
- CONTACT-31-05-04: Project `botProtection` into Contact Forms runtime
- CONTACT-31-05-05: Admin canvas should render mapped Forms runtime or explicit boundary
- CONTACT-31-05-06: Configured/effective runtime metadata must not claim forms-runtime when fallback is static/internal
- CONTACT-31-05-07: Tighten legacy map/social URL safety
- CONTACT-31-05-08: Complete Visual path metadata beyond style rows

## Sub-Tasks

- [ ] [TASK-396-01](TASK-396-01_CONTACT_31_05_01_Mount_Contact_Public_Forms_Runtime_Submit_Route.md): CONTACT-31-05-01 - Mount Contact public Forms runtime submit route
- [ ] [TASK-396-02](TASK-396-02_CONTACT_31_05_02_Reset_Submit_Button_Label_After_Failure.md): CONTACT-31-05-02 - Reset submit button label after failure
- [ ] [TASK-396-03](TASK-396-03_CONTACT_31_05_03_Bind_Duplicate_Contact_Runtimes_Independently.md): CONTACT-31-05-03 - Bind duplicate Contact runtimes independently
- [ ] [TASK-396-04](TASK-396-04_CONTACT_31_05_04_Project_BotProtection_Into_Contact_Forms_Runtime.md): CONTACT-31-05-04 - Project `botProtection` into Contact Forms runtime
- [ ] [TASK-396-05](TASK-396-05_CONTACT_31_05_05_Admin_Canvas_Should_Render_Mapped_Forms_Runtime_Or.md): CONTACT-31-05-05 - Admin canvas should render mapped Forms runtime or explicit boundary
- [ ] [TASK-396-06](TASK-396-06_CONTACT_31_05_06_Configured_Effective_Runtime_Metadata_Must_Not_Claim_Forms.md): CONTACT-31-05-06 - Configured/effective runtime metadata must not claim forms-runtime when fallback is static/internal
- [ ] [TASK-396-07](TASK-396-07_CONTACT_31_05_07_Tighten_Legacy_Map_Social_URL_Safety.md): CONTACT-31-05-07 - Tighten legacy map/social URL safety
- [ ] [TASK-396-08](TASK-396-08_CONTACT_31_05_08_Complete_Visual_Path_Metadata_Beyond_Style_Rows.md): CONTACT-31-05-08 - Complete Visual path metadata beyond style rows

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Public write endpoint: contact form submission. Must enforce access evaluator, nonce/signature/HMAC where required, CAPTCHA/botProtection policy, forms/contact rate-limit bucket, strict reject-unknown validation, safe URL protocols, and no secrets in browser cache. Internal admin writes remain session/RBAC/CSRF protected.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun test` public forms/contact route suites with env loaded when DB-backed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/CONTACT.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_CONTACT_WIDGET.md`
- `_docs/CMS_API.md` if submit route contract changes.
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1086; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
