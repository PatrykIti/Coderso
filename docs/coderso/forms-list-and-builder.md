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

In the current UI, the list route includes:
- `Forms` header,
- `New form`,
- forms table with status and updated date,
- create drawer for name, slug, description, and initial status.

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
3. Click `New form` when you need a new form shell.
4. In `Create New Form`, fill the fields in this order:
   - `Form name`
   - `Slug`
   - `Description`
   - `Status`
5. Click `Create form`.
6. Open the form in the builder.
7. Start with the left rail:
   - `Fields`
   - `Library`
8. Add fields into the form canvas.
   The builder explicitly shows an empty drop target when the form has no fields
   yet.
9. Move to the `Settings` tab after basic field structure exists.
10. In `Form Settings`, work top to bottom:
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
11. Use `Runtime preview` before considering the form ready.
12. Use `Save form` to persist structure and settings.
13. Open `Action logs` when you need operational visibility after submission
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
2. Confirm the necessary fields exist.
3. Confirm submission access mode is intentional.
4. Confirm success message or redirect behavior is correct.
5. Confirm retry settings are acceptable.
6. Run runtime preview.
7. Save form before rollout.

# Security

- Forms surfaces are authenticated admin routes and should only be used by users
  with the appropriate form-management permissions.
- Public forms should be reviewed for anti-abuse posture; internal forms should
  remain behind authenticated/session or API-key constraints.
- Do not put secrets, provider keys, or privileged operational values into form
  definitions or visible success messages.
