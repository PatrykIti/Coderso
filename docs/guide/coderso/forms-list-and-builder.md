---
title: "Forms List and Form Builder"
audience: "admin"
productArea: "coderso-forms"
language: "en"
keywords:
  - forms
  - form builder
  - submissions
  - automation
  - runtime preview
---

# Basic

Forms List and Form Builder are the main surfaces for creating and configuring
forms. The list route helps you find or create forms; the builder route is
where you design fields, define settings, configure automation, and preview the
submission experience.

In the current UI, the canonical list route is `/admin/advanced/forms`.
`/admin/forms` is kept only as a legacy admin alias. The list route includes:
- `Forms` header,
- compact `New`,
- search, status, and submission-access filters,
- Forms table with selection, status, submission access, updated date, and row
  actions,
- shared pagination footer,
- inline bulk actions for selected visible rows,
- confirmed row and bulk delete,
- create drawer for name, slug, description, initial status, and
  open-after-create preference.

The builder route includes:
- `Fields` and `Library` rails,
- form canvas/drop target,
- `Settings` and `Automation` tabs,
- `Action logs`,
- `Runtime preview`,
- `Save form`.

# Medium

Use the list route when you need to manage the catalog of forms. Use the builder
route when you are shaping one form’s structure, submission rules, and follow-up
behavior.

The overall workflow has four parts:
- create the form shell,
- add fields and structure,
- configure settings and automation,
- preview and save before embedding or publishing the form elsewhere.

In the current UI, the builder makes it clear that form structure and
automation belong together. A form is not complete just because it has fields;
submission access, success behavior, and retries also matter.

# Instruction

1. Open `Coderso > Forms`.
2. On the list route, review existing forms before creating a new one.
3. Use search/status/access filters to narrow the visible list when needed.
4. Select visible rows when you need bulk lifecycle actions:
   - `Publish`
   - `Move to draft`
   - `Archive`
   - `Delete`
5. Confirm delete actions before they run. Forms with retained submissions or
   action diagnostics cannot be hard-deleted and should be archived instead.
6. Click `New` when you need a new form shell.
7. In `Create New Form`, fill the fields in this order:
   - `Form name`
   - `Slug`
   - `Description`
   - `Status`
8. Choose whether to open the form in the builder after create.
9. Click `Create form`.
10. Open the form in the builder when you are ready to configure fields,
    settings, and automation.
11. Start with the left rail:
   - `Fields`
   - `Library`
12. Add fields into the form canvas.
   The builder explicitly shows an empty drop target when the form has no fields
   yet.
13. Move to the `Settings` tab after basic field structure exists.
14. In `Form Settings`, work top to bottom:
    - basics:
      name, description, status
    - experience:
      preset, layout mode, save progress
    - submission access:
      public vs internal mode
    - success fallback:
      success message and redirect URL
    - automation reliability:
      retry settings
15. Use `Runtime preview` before considering the form ready.
16. Use `Save form` to persist structure and settings.
17. Open `Action logs` when you need operational visibility after submission
    activity starts.

Use this safe authoring order when you want fewer mistakes:
1. Create the form shell.
2. Add fields.
3. Configure settings.
4. Configure automation/reliability.
5. Run runtime preview.
6. Save form.

# Advanced

- Treat submission access as part of the form contract, not as an afterthought.
  `Public` and `Internal` imply different security and runtime expectations.
- `Save progress` changes user experience and should be intentional, especially
  for multi-step or longer forms.
- Retry settings belong to reliability design, not only operations. A form with
  actions but no resilience can fail silently at the worst time.
- Keep form structure, success behavior, and action workflow aligned. If the
  form promises a redirect or success message that automation cannot support,
  users will experience inconsistency.
- The builder currently separates `Settings` and `Automation`, but in practice
  both shape the post-submit contract and should be reviewed together.
- List row actions intentionally do not include Duplicate, Runtime Preview, or
  Embed Code. Those flows require their own service/API/UI contracts before they
  can appear in the Forms list.
- The list create drawer passes only name, slug, status, and description to the
  create client. Builder-owned fields such as submission access, success
  behavior, and settings remain in the builder/client contract.

# Troubleshooting

- The form exists but has no usable submission flow:
  review both `Settings` and `Automation`, not only the field canvas.
- Runtime preview is missing:
  save the form first and confirm the builder state is coherent.
- The form should be internal-only:
  verify `Submission access` and `Access mode`.
- Users are losing progress:
  review the `Save progress` setting.
- The form builder feels empty:
  add fields from the left rail before debugging deeper settings.
- Delete is blocked:
  if the API returns `form_delete_restricted`, the form has retained
  submissions or action diagnostics. Archive it to preserve history.

# Decision Guide

- Choose list vs builder:
  use the list for catalog management; use the builder for actual form design.
- Choose public vs internal submission access:
  use public for normal frontend capture; use internal when submissions should
  require admin/API-key context.
- Choose inline success vs redirect:
  use inline success for contained completion; use redirect when the next step
  belongs on a dedicated route.
- Choose simple retry defaults vs tuned reliability:
  keep defaults when reliability needs are normal; tune attempts and delays when
  actions are critical or failure-prone.

# Checklist

1. Confirm form name, slug, and status.
2. Confirm list filters and bulk actions target only visible selected rows.
3. Confirm the necessary fields exist.
4. Confirm submission access mode is intentional.
5. Confirm success message or redirect behavior is correct.
6. Confirm retry settings are acceptable.
7. Run runtime preview.
8. Save form before rollout.

# Security

- Forms surfaces are authenticated admin routes and should only be used by users
  with the appropriate form-management permissions.
- Public forms should be reviewed for anti-abuse posture; internal forms should
  remain behind authenticated/session or API-key constraints.
- Do not put secrets, provider keys, or privileged operational values into form
  definitions or visible success messages.
- Hard delete is deletion-safe only. Retained submission payloads and action-run
  diagnostics are not exposed or destroyed by the list UI.
