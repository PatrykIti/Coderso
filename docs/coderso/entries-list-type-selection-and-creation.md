---
title: "Entries List, Type Selection, and Entry Creation"
audience: "editor"
productArea: "coderso-entries"
language: "en"
keywords:
  - entries
  - records
  - content type
  - create entry
  - structured data
---

# Basic

Entries List is the operational surface for structured records created from
Engine content types. It combines content type selection, record browsing,
filtering, list/grid switching, and a create-entry drawer.

In the current UI, this surface includes:
- a left sidebar of content types with record counts,
- a main list area for the selected type,
- `Create New {type}` action,
- filters and type switching,
- list/grid view switch,
- a create drawer for new records.

# Medium

Use this screen when you need to work with records that belong to a structured
content type rather than a freeform page or post. The first decision is always
which content type you are working on; only then does the record list make
sense.

The current Entries list is easiest to understand as four connected workflows:
- choose the active content type,
- browse records in list or grid mode,
- filter or search within the chosen type,
- create a new draft record for that type.

This is the correct surface when:
- the schema already exists in Engine,
- records must stay consistent across many entries,
- downstream modules such as listings or custom screens depend on the same data
  model.

# Instruction

1. Open `Coderso > Entries`.
2. Start in the content type sidebar.
   Pick the correct type before touching filters or create actions.
3. Confirm the active content type in the main header.
   The page title and badge both reflect the selected collection.
4. Use the view toggle to decide how you want to scan records:
   - list view for row-by-row operations,
   - grid view for card-based scanning.
5. Use filters when the active type has many records:
   - search field,
   - status filter,
   - content type switch,
   - author filter,
   - `Clear All`
6. In list view, review each row for:
   - title,
   - status,
   - author,
   - last updated,
   - actions.
7. To create a new record, click `Create New {type}`.
8. In the create drawer, fill the fields in this order:
   - `Content type`
   - `Title`
   - `Slug`
   - optional tags input
9. Decide whether `Open in editor after create` should remain enabled.
   - keep it enabled when you want to continue editing immediately,
   - disable it when you are only creating the shell and staying in the list.
10. Click `Create Draft`.
11. After creation:
    - with `Open in editor after create`, the UI sends you directly to the
      editor,
    - without it, the draft stays in the list for later work.
12. Open an existing record by clicking its row title.

Use this safe list workflow when you want fewer mistakes:
1. Pick the correct content type.
2. Filter the record list if needed.
3. Create or open the record.
4. Move into the editor for actual field and metadata work.

# Advanced

- Always choose the content type first. Record operations only make sense in the
  context of the schema that owns them.
- The same screen can show many generated or operational content types. Treat
  counts and naming patterns as signals of ownership and downstream usage before
  editing records casually.
- List view is safer for bulk-style operational review. Grid view is better when
  visual scanning matters more than dense row data.
- Tags in the create drawer are only a starting point. Metadata and taxonomy
  review still belong in the editor.
- If a record feels too custom for its content type, the problem may be the
  Engine schema rather than the entry itself.

# Troubleshooting

- You cannot find the record you expect:
  confirm the active content type first, then clear filters.
- The wrong records are showing:
  verify that the selected type in the sidebar matches the record family you
  intended to work on.
- A new record did not open in the editor:
  `Open in editor after create` was likely disabled.
- The list feels inconsistent:
  switch between list and grid mode and verify whether filters are still
  applied.
- A record should exist but the count looks wrong:
  refresh your understanding of the active content type before assuming the data
  is missing.

# Decision Guide

- Choose Entries vs Pages/Posts:
  use Entries for structured reusable records; use Pages or Posts for narrative
  or layout-first content.
- Choose list vs grid:
  use list for denser operational review; use grid for higher-level visual
  scanning.
- Choose create vs edit:
  create when the record does not exist; edit when the schema and record shell
  already exist.
- Choose stay in list vs open editor after create:
  stay in the list for batch shell creation; open the editor for immediate field
  completion.

# Checklist

1. Confirm the correct content type is selected.
2. Confirm filters are intentional.
3. Confirm title and slug are correct before creating the draft.
4. Decide explicitly whether the draft should open in the editor immediately.
5. Open the record in the editor before treating it as ready for downstream use.

# Security

- Entries is an authenticated admin surface and should only be used by users
  with the appropriate record-editing permissions.
- Record slugs and statuses can influence public or downstream behavior, so they
  should be treated as operationally meaningful fields.
- Do not use structured records to store secrets, tokens, or privileged
  operational values.
