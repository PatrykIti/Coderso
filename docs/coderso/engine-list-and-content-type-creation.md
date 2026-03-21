---
title: "Engine Content Types List and Type Creation"
audience: "admin"
productArea: "coderso-engine"
language: "en"
keywords:
  - engine
  - content types
  - create collection
  - schema
  - content model
---

# Basic

Engine Content Types is the index of structured content models used by Coderso.
It is where you review existing content types, inspect field counts and slugs,
and start a new collection from the `New type` drawer.

In the current UI, this surface includes:
- a `Content Types` list,
- a primary action `New type`,
- a table with name, slug, field count, status, and edit action,
- a create drawer labeled `Create New Collection`.

# Medium

Use this screen when you need to manage the catalog of content models before
teams create actual records. This is the place to decide whether a new domain
should become its own collection and whether an existing type is the right
starting point.

The list answers questions such as:
- which content types already exist,
- how many fields each type currently has,
- which slug identifies the type,
- whether you should create a new type or edit an existing one.

Think of this screen as the routing layer for structured content design:
- list existing types,
- create a new type shell,
- hand off to the editor or schema builder for actual field design.

# Instruction

1. Open `Coderso > Engine`.
2. Start by scanning the `Content Types` table.
   Check:
   - content type name,
   - slug,
   - field count,
   - status,
   - `Edit` action.
3. Before creating a new type, verify that a suitable type does not already
   exist.
4. Click `New type` when a new structured model is actually needed.
5. In `Create New Collection`, fill the fields in this order:
   - `Name`
   - `Slug`
6. Use a human-readable `Name` and a stable, deterministic `Slug`.
7. Click `Create Collection`.
8. After creation, move directly into the content type editor to define fields
   and validation rules.
9. Use `Edit` from the table when the type already exists and only needs
   schema-level work.

Use this safe creation flow when you want fewer model mistakes:
1. Confirm the model really needs its own collection.
2. Choose a clear collection name.
3. Choose a stable slug.
4. Create the collection shell.
5. Open the editor and define fields before teams start creating records.

# Advanced

- Do not create a new content type just because one screen needs a slightly
  different presentation. First check whether the difference belongs in entries,
  listings, or UI logic rather than the core schema.
- Field count is a useful signal. A type with zero or very few fields may still
  be unfinished or only a shell waiting for schema work.
- Stable slugs matter because downstream modules and integrations often anchor
  to them more than to display names.
- Some collections in the local instance clearly come from generated/custom
  screen workflows. Treat those as signals that Engine is shared infrastructure,
  not just a simple admin list.
- Creating the collection is intentionally lightweight. Real modeling decisions
  happen after the shell exists.

# Troubleshooting

- You are unsure whether to create a new type:
  check the existing list first and compare the field intent, not just the type
  name.
- The type exists but seems incomplete:
  open it in the editor and verify whether it still has placeholder fields or an
  unfinished schema.
- The slug is not what you want:
  fix it in the create drawer before creating the collection.
- The list has many similar or generated-looking types:
  confirm ownership and downstream purpose before editing or duplicating schema
  ideas.
- You expected schema design controls in the list itself:
  move into the content type editor or schema builder route. The list is only
  the entry point.

# Decision Guide

- Choose create vs edit:
  create when the model is genuinely new; edit when the domain already exists.
- Choose name vs slug carefully:
  name is for humans; slug is for stable system identity.
- Choose Engine vs Entries:
  use Engine to define structure; use Entries only after the structure is
  approved.
- Choose Engine vs Pages/Posts:
  use Engine for reusable structured content; use Pages or Posts for authored or
  layout-first content.

# Checklist

1. Confirm the type does not already exist.
2. Confirm the new model really needs its own collection.
3. Confirm `Name` is understandable to admins.
4. Confirm `Slug` is stable and predictable.
5. Create the collection.
6. Open the editor immediately and continue with schema work.

# Security

- Engine is an authenticated admin surface and should only be used by users with
  the right content-model permissions.
- Slug and schema mistakes can cascade into downstream modules, so model changes
  should be treated as operationally sensitive.
- Do not encode secrets, keys, or privileged operational tokens as content
  model fields.
