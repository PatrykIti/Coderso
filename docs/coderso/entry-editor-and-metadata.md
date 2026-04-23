---
title: "Entry Editor and Metadata Workflow"
audience: "editor"
productArea: "coderso-entries"
language: "en"
keywords:
  - entry editor
  - metadata
  - structured records
  - seo
  - taxonomy
  - runtime preview
---

# Basic

Entry Editor is the detailed editing workspace for one structured record. It
combines title and slug editing, tabbed schema fields, runtime preview, draft
save/publish actions, and a metadata sidebar for status, SEO, taxonomy, and
checklist review.

In the current UI, the editor is organized into two main working zones:
- main content area:
  title, slug, tabbed field groups, required-field feedback, save/publish
  actions
- right metadata area:
  publishing, schedule date, publish checklist, SEO, taxonomy, author info, and
  metadata save

# Medium

Use Entry Editor when you already know which record you are editing and need to
complete or correct its structured data. This is where schema-defined fields and
record-level metadata come together before a record is considered publish-ready.

The editor works as five connected workflows:
- identity workflow:
  title and slug
- field workflow:
  schema-defined entry fields grouped into tabs/sections
- publish workflow:
  status, schedule date, save draft, publish/update
- metadata workflow:
  SEO summary, taxonomy, checklist, author context
- preview workflow:
  runtime preview of the current record

# Instruction

1. Open a record from the Entries list.
2. Before editing, orient yourself:
   - confirm the content type and record label in the breadcrumb,
   - confirm whether the record is `Draft` or `Published`,
   - check whether `Unsaved changes` is shown.
3. Start at the top of the editor:
   - confirm the title,
   - confirm the slug,
   - regenerate the slug only if it no longer matches the record identity.
4. Work through the tabbed field groups in the main content area.
   The fields shown here come from the Engine schema for the selected content
   type.
5. For each field card, check:
   - field label,
   - help text,
   - whether it is required,
   - whether it is currently missing.
6. Fill the required fields first.
   The UI explicitly marks missing required fields.
7. Use `Save draft` while the record is still internal.
8. Use `Runtime preview` when you need to validate the record in runtime
   rendering rather than only in the editor.
9. Move to the right metadata panel for record-level controls.
10. In `Publishing`, review:
    - current status,
    - schedule date,
    - publish checklist.
11. In `Search Engine Optimization`, review:
    - snippet preview,
    - meta description.
    The preview URL comes from site settings and the active content route, not a
    hardcoded demo domain.
12. In `Taxonomy`, review:
    - categories,
    - tags,
    - whether the current content type even enables them.
    If taxonomy is disabled, use the Engine settings link from the panel to
    enable categories or tags for the owning content type.
13. Use `Save metadata` after adjusting status, SEO, or taxonomy.
14. Use the main primary action:
    - `Publish` for drafts,
    - `Update` for already published records.
15. Treat the checklist before publishing as a real gate:
    - title added,
    - slug added,
    - required fields filled,
    - schedule date only when needed.

Use this safe editing order when you want fewer publish mistakes:
1. Confirm title and slug.
2. Fill required schema fields.
3. Save draft.
4. Review metadata and checklist.
5. Run runtime preview.
6. Publish or update.

# Advanced

- Entry Editor is schema-driven. If a field feels wrong, missing, or too vague,
  the real fix may belong in Engine rather than in the entry itself.
- Use the publish checklist as an operational QA layer, not just informational
  text. It helps distinguish field completeness from release readiness.
- Slug and title belong together but serve different purposes: title is for
  humans, slug is for stable addressing and downstream references.
- SEO fields matter even for structured records because record-driven content can
  still surface in runtime pages and snippets.
- Taxonomy should only be used when the content type enables it. If the editor
  says categories and tags are disabled, treat that as a schema decision, not a
  missing UI bug.
- Runtime preview is more valuable late in the workflow, after required fields
  and metadata are already coherent.
- Rich text fields use the rich text editor surface. Plain textarea behavior is
  reserved for text fields, not Engine `richtext`.
- Metadata changes have their own dirty state. Leaving the editor with unsaved
  status, schedule, SEO, category, or tag changes should trigger the same guard
  as unsaved field edits.

# Troubleshooting

- Save or publish fails:
  check the required-field cards first.
- The record looks incomplete even though the main fields are filled:
  review the metadata panel, especially status, checklist, SEO, and taxonomy.
- Categories or tags are not available:
  the content type may have taxonomy disabled in Engine; use the panel link to
  open that content type's settings.
- The record renders oddly in downstream UI:
  verify field values, slug, and preview, then trace back to the schema if
  needed.
- You changed content but the publish action still feels unsafe:
  use `Save draft`, review the checklist, and only then publish/update.
- Save metadata fails:
  check the visible toast/error and retry after correcting the status, schedule,
  or taxonomy input; failed metadata writes should not silently change cache
  state.

# Decision Guide

- Choose save draft vs publish/update:
  save draft while the record is still being shaped; publish or update only when
  both fields and metadata are acceptable.
- Choose field edit vs metadata edit:
  use the main content area for schema fields; use the right sidebar for status,
  SEO, taxonomy, and checklist decisions.
- Choose fix in entry vs fix in Engine:
  fix it in the entry when the data is wrong; fix it in Engine when the field
  contract itself is wrong.
- Choose preview now vs preview later:
  preview later, after required fields and metadata are already coherent.

# Checklist

1. Confirm the correct record is open.
2. Confirm title and slug are correct.
3. Fill all required fields.
4. Save draft.
5. Review status, checklist, SEO, and taxonomy.
6. Run runtime preview.
7. Publish or update only when the record is truly ready.

# Security

- Entry Editor is an authenticated admin surface and should only be used by
  users with the appropriate record-editing permissions.
- Metadata such as status and slug can influence downstream visibility and
  runtime behavior, so treat them as high-impact fields.
- Do not use entry records to store secrets, credentials, or privileged
  operational values.
