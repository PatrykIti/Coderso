---
title: "Widget Library"
audience: "editor"
productArea: "coderso-widgets"
language: "en"
keywords:
  - widgets
  - widget library
  - reusable blocks
  - favorites
  - categories
---

# Basic

Widget Library is the discovery surface for reusable interface components and
templates. It helps you browse available items, search by name, narrow the
catalog by scope or category, and jump into template work when reusable layout
assets are needed.

In the current UI, the library includes:
- left-side navigation for library scopes,
- widget category shortcuts,
- one favorites scope with accessible favorite controls,
- search field,
- widget/template filters,
- grid/list result area,
- category management entry point.

# Medium

Use Widget Library when you need to answer one of these questions:
- What reusable components already exist?
- Is there a template I should reuse instead of building again?
- Which widgets belong to layout, content, forms, navigation, or media?
- Which items have I favorited for frequent use?

The library route is a selection and routing surface, not the final place where
complex template composition happens. It is best used for discovery, filtering,
and deciding whether to insert, inspect, or edit a reusable item.

The current workflow areas are:
- scopes:
  `All Items`, `Favorites`, `Templates`
- widget categories:
  `All Widgets`, `Layout`, `Content`, `Forms`, `Navigation`, `Media`
- favorites:
  quick access to saved items
- filters:
  search, `Recommended`, `All widgets`, advanced mode, module filter, complexity
- results:
  grid or list of matching items

Core widget cards are configuration-first. Open a card to review or adjust its
wizard data, then use the insert dialog to choose the target page/template and
placement. Successful inserts show an admin notification with an editor action;
failed inserts keep the dialog open and show bounded error copy.

Template rows can be edited, duplicated, selected, and deleted from the
Templates scope. Destructive row and bulk actions require confirmation and use
the shared admin notification pattern.

# Instruction

1. Open `Coderso > Widgets`.
2. Start in the left library rail.
   Decide whether you are looking for:
   - any reusable item,
   - a favorite,
   - a template,
   - a widget from a specific category.
3. Use the search field when you know part of the item name.
4. Use the top filters to narrow results:
   - `Recommended`
   - `All widgets`
   - `Advanced mode`
   - module filter
   - complexity filter
5. Switch between grid and list view if one layout is easier for the current
   discovery task.
6. If the item is a template, use row actions to edit, duplicate, or delete it.
7. If the item is a core widget, configure it first, then insert it into the
   target surface from the insert dialog.
8. Use favorites for repeat-use items instead of relying only on search.
9. Open `Categories` when you need to manage template categories for reusable
   organization.

Use this safe discovery flow when you want fewer reuse mistakes:
1. Search first.
2. Confirm scope and category.
3. Inspect before inserting or editing.
4. Reuse an existing template when it already solves the problem.

# Advanced

- Treat the library as a reuse boundary. If the same visual pattern is being
  recreated repeatedly elsewhere, it probably belongs here as a reusable asset.
- `Advanced mode` is useful when simple recommended discovery is not enough, but
  it should not be the default for less experienced editors. It unlocks
  complexity-oriented filtering for users who intentionally need that axis.
- Favorites are a workflow accelerator, not an information architecture system.
  Use them for personal speed, not as the canonical source of truth.
- Module readiness labels are editor-facing. `Ready to use`, `Ready to use
  (Beta)`, and `In preparation` describe product availability, not test
  coverage language.
- An empty result state is often a filtering problem, not proof that the item
  does not exist. Clear filters before concluding the library lacks the asset.
- The local UI currently shows an empty catalog state. Documented behavior still
  reflects the intended shipped library contract, not just one transient local
  dataset.

# Troubleshooting

- No items appear:
  clear search, reset scope, and review active filters before assuming the
  library is empty.
- You cannot find a previously used item:
  check `Favorites`, then broaden filters and category selection.
- You are unsure whether to choose widget or template:
  choose a widget for one reusable block; choose a template for a reusable
  composition of blocks.
- Insert seems to do nothing:
  check the admin notification area. Success includes an editor action, and
  failure keeps the insert dialog open with the error.
- The item exists but is hard to reuse consistently:
  it may need better categorization, naming, or promotion into a template.

# Decision Guide

- Choose widget vs template:
  use a widget for one reusable component; use a template for a reusable layout
  composition.
- Choose recommended vs advanced mode:
  use recommended for quick discovery; use advanced mode when you need fine
  control over module/complexity filters.
- Choose favorite vs search:
  use favorites for frequent repeat-use items; use search when looking for
  something less common.

# Checklist

1. Confirm the right library scope is selected.
2. Confirm filters are intentional.
3. Confirm the chosen item is really reusable for the target scenario.
4. Open template editing when composition reuse matters more than one block.

# Security

- Widget Library is an authenticated admin surface and should only be used by
  users with the appropriate admin/editor permissions.
- Reusable presentation assets should not embed secrets, provider keys, or
  privileged operational values.
- Reuse should not bypass review; a reusable item can still spread a mistake
  across many surfaces if chosen carelessly.
