---
title: "Custom Screen Records and Screen-Bound Entry Workflow"
audience: "admin"
productArea: "coderso-custom-screens"
language: "en"
keywords:
  - custom screens records
  - screen records
  - custom entry editor
  - bindings
  - collection-only
---

# Basic

Custom Screen Records routes connect a saved custom screen to the records it is
supposed to manage. Depending on the screen configuration, the workflow can act
as:
- a collection-only records shortcut,
- a read-only screen preview for records,
- a writable custom record screen.

In the current local UI, the records route is present and shows a
`Collection-only screen` state when the screen is not editor-ready. Screens that
provide writable bindings open a canvas-based record editor with a floating
Value panel for the selected bound field.

# Medium

Use the records routes when a custom screen is no longer just a builder artifact
and is ready to shape actual record work. This area is where the screen either:
- narrows the records list for one content type,
- previews mapped record data,
- or replaces part of the classic editing experience.

The route family currently includes:
- `/advanced/custom-screens/:id/entries`
  for the screen-bound records list,
- `/advanced/custom-screens/:id/entries/:entryId`
  for the screen-bound record editor.

The local runtime currently demonstrates the collection-only branch:
- `Open builder`
- `New record`
- collection-only informational alert
- records table shell

# Instruction

1. Open a custom screen’s records route.
2. Start by checking which mode the screen is in.
   In the current product contract, it can behave as:
   - collection-only,
   - read-only dashboard-style preview,
   - writable custom record screen.
3. If the route shows `Collection-only screen`, interpret it literally:
   the route is narrowing the records workflow, but it is not yet replacing the
   classic entry editor.
4. Use `Open builder` when the screen still needs dedicated blocks and
   bindings.
5. Use `New record` when the content type is ready and you want to create a new
   entry from the screen-bound workflow.
6. In the records list view, treat the route as a focused records shortcut for
   the bound content type.
7. When the screen-bound record editor is available, expect these workflow
   layers:
   - breadcrumb path back to Screens,
   - custom screen record canvas,
   - floating `Value` panel after selecting a bound field,
   - `Save record`.
8. Use the default Entries editor when the custom screen is read-only or not yet
   complete for full editing.
9. Use `Save record` only when the custom screen is in a writable mode and the
   required bindings exist.
10. Use the custom screen preview to confirm that mapped record data appears in
    the intended admin-focused layout.

Use this safe records workflow when a screen is still maturing:
1. Open the records route.
2. Confirm whether the screen is collection-only, read-only, or writable.
3. If it is collection-only, use it as a shortcut and fall back to the classic
   editor for edits.
4. If it is writable, test save behavior only after bindings and screen blocks
   are coherent.

# Advanced

- A custom screen route should not be assumed to be fully editable just because
  it has a records URL. Capability depends on bindings and widget composition.
- The collection-only mode is a valid product state. It means the screen helps
  navigation and narrowing, but not full record editing yet.
- The read-only dashboard mode is also a legitimate intermediate state. It can
  preview mapped record data while preserving the classic editor as the true
  editing surface.
- The default Entries editor is not a failure fallback. It is a deliberate
  interoperability path while the custom screen workflow evolves.
- A writable custom screen should be treated like workflow-specific tooling: it
  must be simpler and safer for the target job than the generic editor, not just
  visually different.
- Record mode intentionally does not show builder controls. Add, move,
  duplicate, delete, block library, settings, and right-side Sheet controls
  belong to the screen builder, not the record editor.
- Record-specific presentation overrides such as custom image choices or
  text-size/style tweaks are not persisted yet; they require a separate storage
  contract and are tracked outside this workflow.

# Troubleshooting

- The records route shows collection-only messaging:
  the screen does not yet define a dedicated writable record experience.
- You expected record editing but only got preview:
  check whether the screen is operating in a read-only/dashboard mode.
- The custom screen does not show meaningful data:
  review bindings and the underlying content type fields in the builder.
- You selected a field but cannot find builder controls:
  that is expected in record mode; use the floating Value panel for record data
  and return to the builder for layout changes.
- The route exists but work still needs the classic editor:
  use the default Entries editor intentionally instead of forcing edits through
  an incomplete custom surface.
- `New record` is available but the workflow still feels generic:
  the screen may only be narrowing the records list, not replacing record
  editing.

# Decision Guide

- Choose screen-bound records route vs classic Entries:
  use the screen-bound route when the custom workflow clearly helps; stay in
  classic Entries when the custom screen is still incomplete.
- Choose builder vs records route:
  use builder to improve the screen; use records route to operate the workflow
  the screen already supports.
- Choose custom record screen vs classic editor:
  use the custom screen only when bindings and widgets make the task safer or
  faster; otherwise use the classic editor.

# Checklist

1. Confirm the screen is bound to the right content type.
2. Confirm whether the screen is collection-only, read-only, or writable.
3. If collection-only, use it as a shortcut and keep editing in the classic
   editor.
4. If writable, confirm bound fields and preview output before trusting it for
   real record work.
5. Keep `Open builder` as the corrective path whenever the workflow still feels
   incomplete.

# Security

- Screen-bound records routes are authenticated admin surfaces and should only
  be used by users with the right workflow and record permissions.
- A misleading custom record screen can cause operational mistakes faster than a
  generic editor because it narrows the operator’s context.
- Do not use writable custom screens to bypass field visibility, validation, or
  RBAC expectations that should still hold at the data-contract level.
