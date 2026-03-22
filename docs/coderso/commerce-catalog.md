---
title: "Commerce Catalog"
audience: "admin"
productArea: "coderso-commerce"
language: "en"
keywords:
  - commerce
  - catalog
  - products
  - product list
---

# Basic

Commerce Catalog is the list surface for managing products in the Coderso
commerce module. It is where you review product records, search by title or
slug, filter by status, and route into the product editor.

In the current UI, the catalog route includes:
- `Commerce` header,
- `New product`,
- search field,
- status tabs:
  `All`, `Published`, `Draft`, `Archived`,
- product table.

# Medium

Use the catalog route when you need to answer questions such as:
- which products already exist,
- which ones are still drafts,
- which records are archived,
- which product should be opened for deeper editing.

The local runtime currently shows the list shell and status controls clearly.
The list/table contract is also verified in code, so this route is the natural
entry point into the product editor workflow.

Think of this route as:
- catalog review,
- status-based triage,
- fast search,
- handoff into product editing.

# Instruction

1. Open `Coderso > Commerce`.
2. Start with the search field if you know the product title or slug.
3. Use the status tabs to narrow the catalog:
   - `All`
   - `Published`
   - `Draft`
   - `Archived`
4. Review the table row before opening a product:
   - title,
   - slug,
   - status,
   - last updated,
   - actions.
5. Click `New product` when you need to create a new catalog record.
6. Open an existing product by selecting it from the list.
7. Use delete only when you are sure the product should be removed from the
   catalog, not just unpublished.

Use this safe catalog flow when you want fewer mistakes:
1. Search first.
2. Filter by status.
3. Open the correct product.
4. Move into the editor for actual identity/pricing/stock work.

# Advanced

- The catalog route is best for operational review, not for deep product
  editing. Save detailed changes for the product editor.
- Status tabs are useful for launch discipline. Draft and archived products
  should not be treated as minor UI flags.
- Search by slug is especially helpful when catalog content is referenced by
  widgets, URLs, or integrations rather than by human-friendly title only.
- Empty or loading catalog states are still part of the product contract. They
  should guide product onboarding rather than create uncertainty.

# Troubleshooting

- You cannot find a product:
  clear the search field and switch back to `All`.
- A product should exist but does not appear:
  check whether it is in `Draft` or `Archived`.
- The product list feels sparse:
  confirm whether the local environment is simply not seeded with more products
  yet.
- You are tempted to delete a product to hide it:
  consider changing status instead of deleting when removal is not the right
  lifecycle decision.

# Decision Guide

- Choose search vs status tabs:
  use search when you know the exact product; use tabs when you need lifecycle
  review.
- Choose new product vs edit existing:
  create a new product for a new catalog record; edit existing when the product
  identity already exists.
- Choose draft vs archived:
  draft for work in progress; archived for records that should remain stored but
  no longer act like active catalog items.

# Checklist

1. Confirm the correct product is selected.
2. Confirm search and status filters are intentional.
3. Confirm the next action is edit, not delete.
4. Move into the editor for any meaningful product change.

# Security

- Commerce Catalog is an authenticated admin surface and should only be used by
  users with the appropriate commerce permissions.
- Product status and deletion decisions can affect public catalog behavior and
  downstream widget output.
- Do not use catalog records to store secrets, provider credentials, or other
  privileged operational values.
