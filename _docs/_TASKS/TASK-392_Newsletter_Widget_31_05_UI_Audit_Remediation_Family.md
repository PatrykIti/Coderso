# TASK-392: Newsletter 31-05 UI Audit Remediation Family
# FileName: TASK-392_Newsletter_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Newsletter + Forms Runtime + Public Security + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NEWSLETTER_WIDGET.md
**Status:** To Do

---

## Overview

Close Newsletter Forms-runtime preview, legacy webhook, nonce, and variant ownership defects.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NEWSLETTER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Newsletter. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- NL-31-05-01: Normalize bound Forms runtime fields before admin preview
- NL-31-05-02: Legacy `webhookId` diagnostics must not claim an inactive submit path
- NL-31-05-03: Public Forms runtime must not be interactive without widget-level nonce
- NL-31-05-04: Variant cards must not look active without `onVariantChange`

## Sub-Tasks

- [ ] [TASK-392-01](TASK-392-01_NL_31_05_01_Normalize_Bound_Forms_Runtime_Fields_Before_Admin_Preview.md): NL-31-05-01 - Normalize bound Forms runtime fields before admin preview
- [ ] [TASK-392-02](TASK-392-02_NL_31_05_02_Legacy_WebhookId_Diagnostics_Must_Not_Claim_An_Inactive.md): NL-31-05-02 - Legacy `webhookId` diagnostics must not claim an inactive submit path
- [ ] [TASK-392-03](TASK-392-03_NL_31_05_03_Public_Forms_Runtime_Must_Not_Be_Interactive_Without.md): NL-31-05-03 - Public Forms runtime must not be interactive without widget-level nonce
- [ ] [TASK-392-04](TASK-392-04_NL_31_05_04_Variant_Cards_Must_Not_Look_Active_Without_OnVariantChange.md): NL-31-05-04 - Variant cards must not look active without `onVariantChange`

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Public write surface: newsletter/forms submissions. Public endpoint must require nonce and existing CAPTCHA policy when configured, reject unknown fields, rate-limit by forms/newsletter bucket, and never store privileged settings in browser cache. Internal/admin paths remain session/RBAC/CSRF protected.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun test` targeted public forms/newsletter route coverage if route owner is Bun-backed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1082; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
