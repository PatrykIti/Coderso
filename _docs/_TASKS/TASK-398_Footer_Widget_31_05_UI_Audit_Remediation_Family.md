# TASK-398: Footer 31-05 UI Audit Remediation Family
# FileName: TASK-398_Footer_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Footer + Runtime Security + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md
**Status:** To Do

---

## Overview

Close Footer minimal utility, unsafe links/logo preview, Wizard ownership, and metadata precision issues.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Footer. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- FT-31-05-01: Minimal variant must not omit useful contact/back-to-top utilities unintentionally
- FT-31-05-02: Unsafe column links must not degrade to clickable `#`
- FT-31-05-03: Visual logo preview must not render raw unsafe `brand.logoUrl`
- FT-31-05-04: Wizard variant ownership must align with contract
- FT-31-05-05: Make slot and LinkDestination metadata precise

## Sub-Tasks

- [ ] [TASK-398-01](TASK-398-01_FT_31_05_01_Minimal_Variant_Must_Not_Omit_Useful_Contact_Back.md): FT-31-05-01 - Minimal variant must not omit useful contact/back-to-top utilities unintentionally
- [ ] [TASK-398-02](TASK-398-02_FT_31_05_02_Unsafe_Column_Links_Must_Not_Degrade_To_Clickable.md): FT-31-05-02 - Unsafe column links must not degrade to clickable `#`
- [ ] [TASK-398-03](TASK-398-03_FT_31_05_03_Visual_Logo_Preview_Must_Not_Render_Raw_Unsafe.md): FT-31-05-03 - Visual logo preview must not render raw unsafe `brand.logoUrl`
- [ ] [TASK-398-04](TASK-398-04_FT_31_05_04_Wizard_Variant_Ownership_Must_Align_With_Contract.md): FT-31-05-04 - Wizard variant ownership must align with contract
- [ ] [TASK-398-05](TASK-398-05_FT_31_05_05_Make_Slot_And_LinkDestination_Metadata_Precise.md): FT-31-05-05 - Make slot and LinkDestination metadata precise

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write. Public footer must fail closed for unsafe hrefs/logo URLs and bounded style data; admin writes remain internal/session/RBAC/CSRF protected and strict-schema validated.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1088; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
