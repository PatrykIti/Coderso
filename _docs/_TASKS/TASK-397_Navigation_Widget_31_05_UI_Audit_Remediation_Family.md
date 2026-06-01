# TASK-397: Navigation 31-05 UI Audit Remediation Family
# FileName: TASK-397_Navigation_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Navigation + Runtime Security + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NAVIGATION_WIDGET.md
**Status:** To Do

---

## Overview

Close Navigation schema, unsafe href, drawer a11y, metadata, public DOM, and color-bound issues.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NAVIGATION_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Navigation. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- NV-31-05-01: Empty resolved link list must not make public widget invalid
- NV-31-05-02: Unsafe manual href must not degrade to clickable `#`
- NV-31-05-03: Drawer active link clones need truthful `aria-current` semantics
- NV-31-05-04: Complete Visual path metadata
- NV-31-05-05: Remove or justify public `data-menu-key` exposure
- NV-31-05-06: Bound persisted/imported style colors

## Sub-Tasks

- [ ] [TASK-397-01](TASK-397-01_NV_31_05_01_Empty_Resolved_Link_List_Must_Not_Make_Public.md): NV-31-05-01 - Empty resolved link list must not make public widget invalid
- [ ] [TASK-397-02](TASK-397-02_NV_31_05_02_Unsafe_Manual_Href_Must_Not_Degrade_To_Clickable.md): NV-31-05-02 - Unsafe manual href must not degrade to clickable `#`
- [ ] [TASK-397-03](TASK-397-03_NV_31_05_03_Drawer_Active_Link_Clones_Need_Truthful_Aria_Current.md): NV-31-05-03 - Drawer active link clones need truthful `aria-current` semantics
- [ ] [TASK-397-04](TASK-397-04_NV_31_05_04_Complete_Visual_Path_Metadata.md): NV-31-05-04 - Complete Visual path metadata
- [ ] [TASK-397-05](TASK-397-05_NV_31_05_05_Remove_Or_Justify_Public_Data_Menu_Key_Exposure.md): NV-31-05-05 - Remove or justify public `data-menu-key` exposure
- [ ] [TASK-397-06](TASK-397-06_NV_31_05_06_Bound_Persisted_Imported_Style_Colors.md): NV-31-05-06 - Bound persisted/imported style colors

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write. Public navigation data is read-only but must avoid unsafe hrefs, unbounded style CSS, and sensitive internal identifiers. Admin writes internal/session/RBAC/CSRF protected with strict schema validation.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1087; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
