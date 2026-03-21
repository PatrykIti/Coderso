---
title: "Menus"
audience: "editor"
productArea: "menus"
language: "en"
keywords:
  - menus
  - navigation
  - links
  - hierarchy
  - menu builder
  - menu items
---

# Basic

Menus is the navigation builder for the site. It combines menu creation,
menu-level metadata, item hierarchy editing, and per-item settings in one admin
screen.

In the current UI, the Menus surface includes:
- page header with `Refresh` and `New Menu`,
- save state controls such as `All changes saved`, `Discard`, and `Save changes`,
- menu-level fields for active menu, location, and menu name,
- a `Menu Structure` area for hierarchy editing,
- a create dialog for new menus,
- an item-details workflow for editing one selected menu item.

# Medium

Use Menus after you already know which pages, posts, or external destinations
should be reachable from navigation. The screen is best when route structure is
already fairly stable and you are ready to shape user-facing journeys.

The Menus screen is easiest to understand as four connected workflows:
- menu creation:
  create a new named menu and optionally assign a location
- menu-level editing:
  choose the active menu, update location, update menu name
- structure editing:
  add items, reorder them, and build parent/child hierarchy
- item-level editing:
  define what each link points to and when it should appear

The builder also exposes a clear save model:
- `All changes saved` when nothing is pending
- `Discard` when you want to throw away unsaved changes
- `Save changes` when you want to persist current builder state

# Instruction

1. Open `Menus` from the main admin navigation.
2. Start at the top of the screen.
   Confirm:
   - which menu is active,
   - whether the page says `All changes saved`,
   - whether `Discard` and `Save changes` are available.
3. If you need a brand-new menu, click `New Menu`.
4. In the create dialog, fill the fields in this order:
   - `Menu name`
   - `Location (optional)`
5. Use `Create Menu` to open the new menu in the builder.
6. If you are editing an existing menu, review the menu-level fields before
   touching the structure:
   - `Active menu`
   - `Location`
   - `Menu name`
7. Scroll to `Menu Structure`.
8. Use `Add Item` when you need a new link.
9. Reorder items in the structure area by dragging:
   - up or down to reorder,
   - right to create a sub-menu.
10. Select an existing item when you need to edit its details.
11. In item settings, work top to bottom:
    - `Navigation Label`
    - `Link Type`
    - linked page or custom URL
    - `Parent Item`
    - `Visibility`
    - `Badge Label`
    - `Badge Tone`
    - `Description`
    - `Icon Name`
12. Choose `Link Type` carefully:
    - `Page` when the menu item should point to an internal page,
    - `Custom URL` when the item should point to an external or custom route.
13. Use `Parent Item` when you want the link nested under another item instead
    of sitting at the top level.
14. Use `Visibility` when the link should appear only for:
    - everyone,
    - logged-in users,
    - logged-out users.
15. Use `Badge Label`, `Badge Tone`, `Description`, and `Icon Name` only when
    your menu presentation needs extra metadata.
16. Click `Save changes` after updating menu metadata, structure, or item
    settings.
17. Use `Discard` only when you intentionally want to throw away the unsaved
    state.
18. Use `Refresh` when the menu changed elsewhere and you want the latest
    server state.

Use this safe working order when you want the fewest mistakes:
1. Create or choose the correct menu.
2. Update menu-level name/location first.
3. Build the hierarchy.
4. Edit item details one item at a time.
5. Save changes.

# Advanced

- Do not build navigation before the underlying routes are stable. Menus should
  reflect product structure, not guess it.
- Use top-level items for primary journeys and nesting for secondary or
  contextual links. If every item becomes nested, the information architecture
  is usually doing too much.
- `Location` is operational metadata for theme mapping. Use consistent location
  names across environments instead of inventing similar labels for the same
  purpose.
- `Visibility` is more than presentation polish. It changes who can discover a
  path through navigation.
- Badge, description, and icon fields are optional enrichments. Only use them
  when the runtime menu presenter actually benefits from the extra signal.
- Drag-and-drop hierarchy is powerful, but it is easy to create confusing
  trees. Review the final structure as a user journey, not just as a technical
  nesting exercise.
- The builder can surface slow-loading or refreshed menu state, so save often
  and refresh intentionally instead of assuming local state is the only truth.

# Troubleshooting

- Menus appears to be stuck on loading:
  wait for hydration to finish, then use `Refresh` if the builder still has not
  loaded current menu data.
- You cannot create a page-linked item:
  confirm there are pages available to select. If not, create the page first or
  use `Custom URL` temporarily.
- The link is showing in the wrong place:
  re-check drag position and `Parent Item`.
- The link is missing for some users:
  verify the `Visibility` rule.
- You changed a menu item but nothing persisted:
  use `Save changes`; item edits alone do not finish the workflow.
- A menu looks correct but is not appearing where expected:
  review the menu `Location` value and the theme/runtime mapping that consumes
  it.
- You want to remove an item but are unsure whether children will be affected:
  verify the hierarchy first and then delete intentionally from the item drawer.

# Decision Guide

- Choose `New Menu` vs editing an existing menu:
  create a new menu when the navigation surface is conceptually different; edit
  the existing menu when you are refining the same navigation area.
- Choose `Page` vs `Custom URL`:
  use `Page` for internal managed pages; use `Custom URL` for external
  destinations or routes not modeled as managed pages.
- Choose top-level vs child item:
  use top-level for primary journeys; use child items for secondary structure.
- Choose simple label vs enriched item:
  start with label and target only; add badge, description, or icon only when
  they clearly improve the navigation UI.
- Choose `Discard` vs `Save changes`:
  discard only when you intentionally want to revert; save when the current menu
  state should become the source of truth.

# Checklist

1. Confirm the correct menu is active.
2. Confirm menu `Location` and `Menu name` are correct.
3. Confirm top-level and nested item hierarchy matches user journeys.
4. Confirm each item points to the correct page or custom URL.
5. Confirm `Visibility` rules are intentional.
6. Confirm optional badge/description/icon metadata is actually needed.
7. Click `Save changes`.
8. Re-check the saved structure before leaving the screen.

# Security

- Menus is an authenticated admin surface and should only be used by signed-in
  users with the appropriate content/navigation permissions.
- Custom URLs should be reviewed carefully before saving, especially when they
  point outside the trusted site surface.
- Visibility rules can accidentally expose or hide important navigation paths,
  so treat them as access-sensitive presentation rules rather than decoration.
- Deleting or misrouting menu items can break core site journeys even without
  changing page content, so save and review deliberately.
