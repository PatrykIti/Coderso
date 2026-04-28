---
title: "Content Type Editor and Schema Builder"
audience: "admin"
productArea: "coderso-engine"
language: "en"
keywords:
  - content type editor
  - schema builder
  - fields
  - taxonomies
  - json schema
  - coderso engine
---

# Basic

Content Type Editor and Schema Builder are the working surfaces where you define
the fields, taxonomy behavior, and schema shape for one structured content
model. In the current product they appear as two closely related routes:
- content type editor:
  metadata, field settings, taxonomies, save/publish, and schema preview
- schema builder route:
  collection sidebar, field cards, and generated JSON schema view

Together, they turn an empty collection shell into a usable structured model.

# Medium

Use these surfaces when the content type already exists and you need to decide:
- which fields belong in the model,
- what each field is called,
- which field types and validations should apply,
- whether categories or tags should be enabled,
- what JSON schema the API should ultimately enforce.

The current workflow breaks down into four connected parts:
- field inventory:
  review the field list and add/remove fields
- field design:
  edit field name, label, type, layout, help text, validation, and defaults
- taxonomy design:
  enable categories and tags where needed
- schema review:
  inspect the generated JSON schema before saving

# Instruction

1. Open a content type from the Engine list.
2. Before changing anything, orient yourself:
   - confirm the content type name,
   - confirm the slug,
   - review how many fields already exist,
   - check whether the right preview/schema panel is visible.
3. Start with the fields list.
   In the current editor, the left-side list shows existing fields such as
   `New field` placeholders when the model is still early.
4. Select one field before editing details.
5. In `Field settings`, work top to bottom:
   - `Field name (kebab-case)`
   - `Label`
   - `Field type`
   - `Tab`
   - `Section`
   - `Width`
   - `Display density`
   - `Help text`
   - `Required`
   - `Default value`
6. Choose `Field type` carefully.
   The shipped UI currently exposes text-style configuration directly, and the
   broader schema workflow supports multiple field categories.
7. Use `Help text` when an entry editor will need guidance at data-entry time.
8. Turn on `Required` only when the field must exist on every record.
9. Review `Taxonomies` if the content type should support categories or tags:
   - `Categories`
   - `Tags`
10. Use `Save draft` to persist the schema work in progress.
11. Use `Publish` only when the content model is ready for downstream usage.
12. Review `Schema Preview` before leaving the screen.
    Confirm:
   - field keys,
   - titles,
   - JSON types,
   - additionalProperties behavior.
13. Open the dedicated `/schema` route when you want a schema-focused working
    surface.
14. In `Schema Builder`, review:
   - the collections sidebar,
   - field cards,
   - `Create New Type`,
   - `Add new field`,
   - `Save schema`,
   - `Discard`,
   - `Copy JSON`.
15. Use the schema builder route when the JSON schema and field structure are
    the primary focus, not broader editor metadata.

Use this safe modeling order when you want the lowest risk of downstream churn:
1. Confirm the collection shell is correct.
2. Add the minimum useful fields.
3. Set field names, labels, and types carefully.
4. Add validation and defaults.
5. Review taxonomy needs.
6. Review generated schema.
7. Save draft.
8. Publish only after downstream implications are understood.

# Advanced

- Field names are long-lived contract identifiers. Change them cautiously,
  especially after records or integrations already exist.
- `Label` is for editors; `Field name` is for the data contract. Do not treat
  them as interchangeable.
- Categories and tags should only be enabled when downstream workflows truly
  need taxonomy behavior. Avoid turning them on by habit.
- Layout and grouping fields such as tab, section, width, and density affect the
  entry editing experience even though they are not the core data type itself.
- JSON schema preview is not only a reference artifact. It is the fastest way to
  sanity-check whether your configuration matches the contract you think you are
  building.
- The separate `/schema` route suggests a schema-first workflow for heavier
  modeling sessions, while the regular editor route is better for balanced
  metadata + field work.
- Placeholder-heavy models are a risk signal. If many fields are still named
  `field-*` or `New field`, do not treat the type as production-ready.

# Troubleshooting

- Records later fail validation:
  re-check required flags, default values, and field types in the editor.
- Downstream modules render inconsistent data:
  inspect field names and schema preview before debugging the downstream UI.
- Editors are confused while entering data:
  review labels, help text, and layout/grouping configuration.
- You are not sure whether to use the editor or `/schema`:
  use the editor for balanced content-type setup; use `/schema` when the field
  graph and JSON contract are the main focus.
- The schema looks valid but the model still feels wrong:
  revisit the content strategy before adding more fields. More fields do not
  automatically mean a better model.
- Taxonomy behavior is showing up where it should not:
  review the `Categories` and `Tags` toggles.
- Entry editor says categories and tags are disabled:
  open this content type editor from the Entry metadata panel link and review
  the taxonomy toggles here.

# Decision Guide

- Choose editor route vs schema route:
  use the editor route for end-to-end type setup; use `/schema` for a more
  schema-focused workflow.
- Choose required vs optional:
  required for contract-critical data; optional when flexibility matters more
  than strict completeness.
- Choose explicit defaults vs no defaults:
  use defaults when most records share the same starting value; avoid defaults
  when they would hide meaningful data-entry choices.
- Choose taxonomy vs plain fields:
  use categories/tags for shared classification behavior; use plain fields when
  a simple value is enough.
- Choose save draft vs publish:
  save draft while the model is still being shaped; publish only when downstream
  modules can safely depend on it.

# Checklist

1. Confirm you are editing the correct content type.
2. Confirm field names are stable and intentional.
3. Confirm labels and help text are editor-friendly.
4. Confirm field types and validation rules match the real data shape.
5. Confirm taxonomy toggles are intentional.
6. Confirm JSON schema preview matches expectations.
7. Save draft.
8. Publish only when the model is ready for downstream modules and entries.

# Security

- Content Type Editor and Schema Builder are authenticated admin surfaces and
  should only be used by users with content-model permissions.
- Schema changes can affect multiple downstream modules at once, so model edits
  should be treated as high-impact operational changes.
- Do not model secrets, privileged tokens, or backend-only operational values as
  ordinary content fields.
- Keep schema strict enough to reject unknown fields and accidental abuse.
