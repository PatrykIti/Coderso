---
title: "Commerce Product Editor"
audience: "admin"
productArea: "coderso-commerce"
language: "en"
keywords:
  - commerce editor
  - product editor
  - pricing
  - stock
  - collections
---

# Basic

Commerce Product Editor is the workspace for configuring one product’s identity,
pricing, stock, collection membership, and media references. In the current
product it uses a main editing area plus side context/details panels.

In the current UI, the editor includes:
- top actions:
  `Back to list`, `Discard`, `Publish`, `Save changes`
- product identity section,
- pricing section,
- stock section,
- left context panel,
- right collections/details panel.

# Medium

Use the product editor when you need to shape one product in detail rather than
review the catalog broadly. This is where product identity, pricing, stock
state, and collection assignment come together.

The current workflow breaks down into:
- product context:
  status, lifecycle, identity state
- main editor:
  title, slug, status, excerpt, description, pricing, stock
- details panel:
  collection assignment and media IDs
- action bar:
  save, publish/unpublish, discard, and back-to-list navigation

In the local `new` route, the UI clearly shows a fresh product draft state and
the full authoring contract for a new product.

# Instruction

1. Open a product from the catalog, or choose `New product`.
2. Start by checking the context panel:
   - current status,
   - whether the product already exists,
   - whether there are unsaved changes.
3. In the main editor, work top to bottom:
   - `Title`
   - `Slug`
   - `Status`
   - `Excerpt`
   - `Description`
4. Move to `Pricing`:
   - amount
   - currency
   - compare-at amount
5. Move to `Stock`:
   - stock state
   - quantity
6. Open the details/collections side when you need:
   - collection assignments,
   - media IDs
7. Use `Publish` when the product should become active for downstream catalog
   experiences.
8. Use `Save changes` when you want to persist edits without changing the
   publish lifecycle.
9. Use `Discard` only when you intentionally want to revert unsaved edits.
10. Use `Back to list` when the current product state is saved or intentionally
    abandoned.

Use this safe product-editing order when you want fewer mistakes:
1. Identity first.
2. Pricing second.
3. Stock third.
4. Collections/media after the product core is coherent.
5. Save.
6. Publish only when the product is ready for runtime use.

# Advanced

- Treat status as a product lifecycle control, not just a UI badge. Publishing
  or moving back to draft changes how the product should be treated downstream.
- Keep pricing fields precise and stable. They are more than presentation copy;
  downstream commerce blocks and catalog logic often depend on them.
- Collections should reflect navigation and merchandising strategy, not only
  internal grouping convenience.
- Media IDs are operational references. Even when the UI calls out future media
  picker integration, the current contract already treats them as meaningful
  catalog inputs.
- `Discard` is safest when you know the snapshot you are returning to is the one
  you actually want. Do not use it casually in a long editing session.

# Troubleshooting

- The product feels incomplete:
  check title, slug, status, and pricing before debugging downstream rendering.
- The product exists but should not be active:
  move it back to draft instead of deleting unless removal is truly required.
- Collections are not behaving as expected:
  review collection assignments in the details panel.
- Media linkage feels weak:
  verify the current media ID inputs rather than assuming the future picker flow
  already exists.
- Save and publish outcomes feel confusing:
  remember that `Save changes` and `Publish` are not the same lifecycle action.

# Decision Guide

- Choose save vs publish:
  save for draft persistence; publish when the product should become active for
  downstream catalog use.
- Choose discard vs continue editing:
  discard only when you want to revert to the last saved snapshot.
- Choose collection change vs product field change:
  edit collections when merchandising/grouping is wrong; edit product fields
  when the product record itself is wrong.

# Checklist

1. Confirm title and slug are correct.
2. Confirm status is intentional.
3. Confirm pricing values are correct.
4. Confirm stock state and quantity are correct.
5. Confirm collection assignments are intentional.
6. Save changes.
7. Publish only when the product is truly ready.

# Security

- Commerce Product Editor is an authenticated admin surface and should only be
  used by users with the appropriate commerce permissions.
- Pricing and product-state changes can affect public runtime behavior and
  business logic, so they should be treated as operationally sensitive.
- Do not store payment/provider secrets or privileged operational values inside
  product content fields.
