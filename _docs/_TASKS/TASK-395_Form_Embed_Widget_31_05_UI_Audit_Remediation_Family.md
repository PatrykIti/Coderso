# TASK-395: Form Embed 31-05 UI Audit Remediation Family
# FileName: TASK-395_Form_Embed_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Form Embed + Public Forms API + Security + Runtime + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md
**Status:** To Do

---

## Overview

Close all Form Embed public submit, binding, access, checkbox, progress, field naming, success policy, nonce persistence, and admin canvas gaps.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Form Embed. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- FE-31-05-01: Mount public Form Embed submit route
- FE-31-05-02: Bind duplicate Form Embed instances independently
- FE-31-05-03: Do not render internal-only forms as public interactive forms
- FE-31-05-04: Normalize checkbox payload to backend schema
- FE-31-05-05: Saved progress must not skip required previous-step fields
- FE-31-05-06: Split overloaded `settings.step` meanings
- FE-31-05-07: Clarify widget vs form-level success and redirect policy
- FE-31-05-08: Keep `resolved.submissionNonce` out of persisted widget schema
- FE-31-05-09: Admin canvas should render real mapped form or explicit static boundary

## Sub-Tasks

- [ ] [TASK-395-01](TASK-395-01_FE_31_05_01_Mount_Public_Form_Embed_Submit_Route.md): FE-31-05-01 - Mount public Form Embed submit route
- [ ] [TASK-395-02](TASK-395-02_FE_31_05_02_Bind_Duplicate_Form_Embed_Instances_Independently.md): FE-31-05-02 - Bind duplicate Form Embed instances independently
- [ ] [TASK-395-03](TASK-395-03_FE_31_05_03_Do_Not_Render_Internal_Only_Forms_As_Public.md): FE-31-05-03 - Do not render internal-only forms as public interactive forms
- [ ] [TASK-395-04](TASK-395-04_FE_31_05_04_Normalize_Checkbox_Payload_To_Backend_Schema.md): FE-31-05-04 - Normalize checkbox payload to backend schema
- [ ] [TASK-395-05](TASK-395-05_FE_31_05_05_Saved_Progress_Must_Not_Skip_Required_Previous_Step.md): FE-31-05-05 - Saved progress must not skip required previous-step fields
- [ ] [TASK-395-06](TASK-395-06_FE_31_05_06_Split_Overloaded_Settings_Step_Meanings.md): FE-31-05-06 - Split overloaded `settings.step` meanings
- [ ] [TASK-395-07](TASK-395-07_FE_31_05_07_Clarify_Widget_Vs_Form_Level_Success_And_Redirect.md): FE-31-05-07 - Clarify widget vs form-level success and redirect policy
- [ ] [TASK-395-08](TASK-395-08_FE_31_05_08_Keep_Resolved_SubmissionNonce_Out_Of_Persisted_Widget_Schema.md): FE-31-05-08 - Keep `resolved.submissionNonce` out of persisted widget schema
- [ ] [TASK-395-09](TASK-395-09_FE_31_05_09_Admin_Canvas_Should_Render_Real_Mapped_Form_Or.md): FE-31-05-09 - Admin canvas should render real mapped form or explicit static boundary

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Public write endpoint: form submission. Must be public only when form access allows it, require nonce/signature/HMAC where contract expects it, optional reCAPTCHA/botProtection, rate-limit forms bucket, strict reject-unknown validation, no persisted nonce, CSRF/session/RBAC for internal admin writes, and API key scope only for explicitly internal integrations.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun test` public forms route/security suites with env loaded when DB-backed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md`
- `_docs/CMS_API.md` if route contract changes.
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1085; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
