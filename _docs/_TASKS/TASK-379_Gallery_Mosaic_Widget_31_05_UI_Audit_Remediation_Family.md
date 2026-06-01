# TASK-379: Gallery Mosaic 31-05 UI Audit Remediation Family
# FileName: TASK-379_Gallery_Mosaic_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Admin UI + Media Fixtures + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GALLERY_MOSAIC_WIDGET.md
**Status:** To Do

---

## Overview

Fix Gallery Mosaic lightbox diagnostics, close media/public-lightbox fixture gaps, and align destructive item removal with the shared admin confirmation UI.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GALLERY_MOSAIC_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Gallery Mosaic. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- GM-31-05-01: Advanced must distinguish selected lightbox mode from eligible lightbox tiles
- GM-31-05-02: Add media and public lightbox browser fixtures
- GM-31-05-03: Replace per-item Remove native confirm with shared ConfirmActionDialog

## Sub-Tasks

- [ ] [TASK-379-01](TASK-379-01_GM_31_05_01_Advanced_Must_Distinguish_Selected_Lightbox_Mode_From_Eligible.md): GM-31-05-01 - Advanced must distinguish selected lightbox mode from eligible lightbox tiles
- [ ] [TASK-379-02](TASK-379-02_GM_31_05_02_Add_Media_And_Public_Lightbox_Browser_Fixtures.md): GM-31-05-02 - Add media and public lightbox browser fixtures
- [ ] [TASK-379-03](TASK-379-03_GM_31_05_03_Replace_Per_Item_Remove_Native_Confirm_With_Shared.md): GM-31-05-03 - Replace per-item Remove native confirm with shared ConfirmActionDialog

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No public write change. Lightbox runtime stays read-only. Media fixtures must use existing authenticated admin/media setup and safe public URLs.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- Gallery Mosaic Playwright media/lightbox smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1069; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
