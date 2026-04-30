# TASK-244-01: Widget Surface Inventory and Clear Semantics

# FileName: TASK-244-01_Widget_Surface_Inventory_and_Clear_Semantics.md

**Priority:** High
**Category:** Widgets + Inventory + UX Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-242
**Status:** Done (2026-04-30)

---

## Overview

Lock the inventory and semantics for clearable widget surfaces before runtime
edits start.

This subtask owns the rule boundary:

- `None` remains the TASK-242 language for token/select off states.
- `Clear` is the UI action for color, background, surface, gradient, and overlay
  fields.
- `Clear` removes style data and rendered style output; it must not serialize
  `"transparent"` as a fake off state.

## Sub-Tasks

- [x] TASK-244-01-01: Widget Surface Background Inventory
- [x] TASK-244-01-02: Clear Semantics and Backward Compatibility

## Files to Change

- `_docs/_TASKS/TASK-244-01-01_Widget_Surface_Background_Inventory.md`
- `_docs/_TASKS/TASK-244-01-02_Clear_Semantics_and_Backward_Compatibility.md`
- no production files in this subtask unless line references are being updated
  after implementation drift

## Implementation Order

1. Scan `core/widgets/core/*.tsx` for rendered gradients, backgrounds, overlays,
   surfaces, and framed shells.
2. Scan `core/admin/ui/widgets/editors/*.tsx` for matching editor controls.
3. Classify every finding as `clear-required`, `already-clearable`,
   `intentional-state`, or `exclude-admin-only`.
4. Confirm test owners for every `clear-required` widget.
5. Keep the field semantics aligned with TASK-244-01-02 before implementation
   starts.

## Security Contract

- Visibility:
  - this inventory is an internal planning contract for admin widget editors and
    public widget render output.
- Auth model:
  - no new endpoint is introduced;
  - future widget edits continue through the existing authenticated admin
    page/template save flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this subtask does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - inventory decisions must preserve strict widget schema validation and must
    call out any field that needs schema/default/normalizer changes.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - user-controlled color/background values must remain validated tokens or
    inline-style values, never interpolated class-name fragments.

## Testing Requirements

- Documentation-only validation:
  - `git diff --check`
- If the inventory changes after implementation starts, rerun targeted `rg`
  scans and update the inventory file before code changes continue.

## Documentation Updates Required

- `_docs/_TASKS/TASK-244-01-01_Widget_Surface_Background_Inventory.md`
- `_docs/_TASKS/TASK-244-01-02_Clear_Semantics_and_Backward_Compatibility.md`
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. Every rendered widget surface is classified.
2. Every `clear-required` surface has an owner leaf.
3. `Clear` semantics are documented before any runtime helper is added.
4. Exclusions are explicit and explain why they are not the user-facing problem.
