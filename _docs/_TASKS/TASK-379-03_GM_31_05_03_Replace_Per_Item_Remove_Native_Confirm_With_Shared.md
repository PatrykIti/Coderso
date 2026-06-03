# TASK-379-03: GM-31-05-03 - Replace per-item Remove native confirm with shared ConfirmActionDialog
# FileName: TASK-379-03_GM_31_05_03_Replace_Per_Item_Remove_Native_Confirm_With_Shared.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Admin UI + UX + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-379
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for GM-31-05-03 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GALLERY_MOSAIC_WIDGET.md` and parent `TASK-379`.

Per-item `Remove` uses native `window.confirm`, while count reduction already uses `ConfirmActionDialog`. The removal flow works, but the admin UX and test surface drift from the shared destructive-action pattern.

## Sub-Tasks

- [x] Reproduce GM-31-05-03 with the report fixture before editing and record the observed admin state in closure notes.
- [x] Replace the per-item native confirm path with the same `ConfirmActionDialog` pattern used by count reduction.
- [x] Keep item removal non-destructive until the dialog is accepted; cancel must preserve item order and authored media.
- [x] Add focused UI regression coverage for cancel and accept.
- [x] Update parent task, report notes, and widget docs if the implementation changes admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Add `pendingItemRemoval` state keyed by item id/index in `GalleryMosaicVisualEditor`, route the Remove button through that state, and confirm through a shared `ConfirmActionDialog` action that calls the existing `removeItem` helper only after acceptance.

**Data flow:**

1. Visual item card Remove click stores the item identity and human-readable caption/title for dialog copy.
2. The dialog reads the pending item and shows the same destructive-action tone as count reduction.
3. Cancel clears `pendingItemRemoval` without mutating `items`.
4. Confirm calls the existing owner-side remove/update path, then clears pending state.
5. Renderer/runtime payloads are unchanged because this is an admin editor interaction only.

**Error handling:**

- If the pending item no longer exists, close the dialog without mutating state.
- Do not call `window.confirm` or introduce browser-global branching in tests.
- Preserve existing item normalization and safe media/link handling.

**Regression-test shape:** Gallery Mosaic editor UI test clicks Remove, verifies cancel leaves the item count unchanged, then accepts and verifies the item count/order update without stubbing `window.confirm`.

## Owner Files

- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`

## Security Contract

No route or public write change. This leaf only changes authenticated admin editor UX. Preserve existing media URL and link sanitization; do not expose raw media/link payloads in dialog copy beyond safe item labels.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Admin-only destructive UI remains session/RBAC/CSRF protected through the existing page save flow.
- Public renderer output and lightbox runtime remain read-only.
- Dialog copy must not include unsafe hrefs, raw HTML, provider secrets, or internal-only identifiers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Remove cancel/accept uses `ConfirmActionDialog` and never calls native `window.confirm`.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_TASKS/TASK-379_Gallery_Mosaic_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list `TASK-379-03` explicitly in the parent family changelog before moving this leaf to `Done`.

## Closure Notes (2026-06-01)

- Focused UI regression failed before fix because per-item Remove still mutated through native `window.confirm`.
- Removed browser-global confirmation from `removeItem`; it is now a pure normalized remove mutation.
- Added `pendingItemRemoval` state in Visual, keyed by item id with a stale-item no-op fallback, and routed cancel/accept through shared `ConfirmActionDialog`.
- Covered cancel and accept in `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`; count-reduction dialog coverage still passes.

## Acceptance Criteria

- GM-31-05-03 is fixed or reclassified with fresh evidence in the report and parent task.
- Per-item Remove uses `ConfirmActionDialog` for cancel and accept.
- Existing count reduction confirmation still works and is not duplicated inside item removal state.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
