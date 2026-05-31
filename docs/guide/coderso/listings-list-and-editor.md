---
title: "Listings List and Listing Query Editor"
audience: "admin"
productArea: "coderso-listings"
language: "en"
keywords:
  - listings
  - query
  - listing editor
  - preview
  - templates
---

# Basic

Listings turns structured content into reusable query presets and list views.
The list route helps you manage query presets and listing templates, while the
editor route lets you build one listing query in detail and preview the runtime
payload.

In the current UI, the list route includes:
- `Listings` header,
- `New query`,
- top tabs:
  `Queries`, `Templates`
- query table with an empty state when no queries exist yet.

The editor route includes:
- basics panel,
- source selection,
- filters,
- sort and pagination,
- fields and template context,
- live preview,
- top actions:
  `Back to list`, `Discard`, `Run preview`, `Save query`.

# Medium

Use Listings when your records already exist in Engine and Entries and you need
to define how collections of records should be queried and rendered together.
Listings is not record authoring; it is query design plus preview of the result
shape.

Think of the current workflow in three parts:
- list route:
  manage query presets and templates
- editor route:
  define the query logic
- live preview:
  inspect the rows and payload shape before saving

The local UI currently shows an empty query list, which makes the `New query`
path the primary entry point for authoring.

# Instruction

1. Open `Coderso > Listings`.
2. Start on the list route and decide which tab you need:
   - `Queries`
   - `Templates`
3. If you need a new query preset, click `New query`.
4. In the editor, work top to bottom.
5. Start in `Basics`:
   - `Name`
   - `Description`
6. Move to `Source`.
   Decide what the listing should query:
   - source type,
   - content type,
   - whether drafts are included.
7. Add filters only after the source is correct.
8. Configure `Sort and Pagination`:
   - add sort rules,
   - choose direction,
   - set limit,
   - set offset.
9. In `Fields and Template`, define:
   - returned fields,
   - optional template context for preview.
10. Use `Run preview` before saving.
    The preview is the fastest way to check whether the query shape is useful.
11. Use `Discard` only when you intentionally want to throw away unsaved query
    work.
12. Use `Save query` once the source, filters, sorting, and fields all look
    coherent.
13. Return to the list when the preset is ready to be reused elsewhere.

Use this safe query-authoring order when you want fewer mistakes:
1. Name the query.
2. Choose the source correctly.
3. Add filters.
4. Add sorting and pagination.
5. Define returned fields.
6. Run preview.
7. Save query.

# Advanced

- Source selection is the highest-leverage decision. If the source is wrong,
  everything downstream becomes misleading even when filters and sorting look
  valid.
- Include drafts only when the workflow truly needs draft visibility. It changes
  operational semantics, not just the preview result.
- Returned fields are part of the contract. Keep them explicit and purposeful so
  downstream consumers do not depend on accidental extra data.
- Pagination values are not cosmetic. They define how much data moves through
  the listing runtime and how the public experience scales.
- Template context in preview is useful for understanding how the query and
  presentation layer fit together, but it should not hide a weak underlying
  query.
- The separate `Templates` tab signals that query logic and reusable listing
  presentation are related but not identical concerns.

# Troubleshooting

- The list is empty:
  use `New query`; the local UI currently shows the empty-state path.
- Preview results are not useful:
  re-check source type and content type before touching filters again.
- Sorting behaves oddly:
  inspect sort field, direction, and whether the source actually supports that
  field predictably.
- Too much or too little data appears:
  review `Limit` and `Offset`.
- The query saves but downstream behavior still feels wrong:
  check the returned fields and template context, not only the filter rules.

# Decision Guide

- Choose query preset vs one-off manual result:
  use a listing query when the same record discovery logic should be reused.
- Choose include drafts vs published-only:
  include drafts only for internal/editorial workflows.
- Choose broad fields vs minimal fields:
  use only the fields downstream consumers actually need.
- Choose save now vs preview again:
  preview again whenever source/filter logic still feels uncertain.

# Checklist

1. Confirm the query name is clear.
2. Confirm the source type and content type are correct.
3. Confirm filters match real user or editorial intent.
4. Confirm sorting and pagination are intentional.
5. Confirm returned fields are sufficient and not excessive.
6. Run preview.
7. Save query.

# Security

- Listings routes are authenticated admin surfaces and should only be used by
  users with the appropriate query/configuration permissions.
- Including draft data changes visibility and should be treated as an
  operational choice.
- Do not design listing payloads that expose internal-only fields or sensitive
  content unintentionally.
