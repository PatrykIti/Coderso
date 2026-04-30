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

Menus is the navigation builder for the site. The admin flow is now split into
two connected screens:

- a list screen at `Menus` where you create or choose a menu,
- a dedicated editor screen for one selected menu.

In the current UI, the Menus experience includes:

- a list-first screen with `New`, filters, selection, lifecycle actions, and
  one row per menu,
- an editor route that opens only after you choose a menu from the list,
- save state controls such as `Unsaved changes`, `Discard`, and `Save changes`,
- lifecycle controls such as `Draft`, `Published`, `Publish`, and
  `Move to Draft`,
- menu-level fields for `Theme location` and `Menu name`,
- a `Menu Structure` area for hierarchy editing,
- a create dialog for new menus,
- an item-details workflow for editing one selected menu item,
- a branded delete confirmation dialog before removing a menu item.

# Medium

Use Menus after you already know which pages, posts, or external destinations
should be reachable from navigation. The list screen helps you choose the
correct navigation surface first; the editor then focuses on exactly one menu.

The Menus experience is easiest to understand as five connected workflows:

- menu selection:
  start on the list and choose the menu you want to edit
- menu creation:
  create a new named menu and optionally assign a location
- menu-level editing:
  update location and menu name on the selected menu
- structure editing:
  add items, reorder them, and build parent/child hierarchy
- item-level editing:
  define what each link points to and when it should appear

The editor also exposes a clear save model:

- status badges such as `Draft` and `Published` in the main admin header
- `Unsaved changes` in the main admin header only when local edits are pending
- `Discard` when you want to throw away unsaved changes
- `Save changes` when you want to persist the current editor state
- `Publish` when a draft menu should become available to runtime navigation
- `Move to Draft` when a published menu should be hidden from runtime
  navigation

Publishing from the editor saves valid metadata and item changes first, then
switches the menu to `Published`. Runtime navigation only uses published menus
with usable items.

# Instruction

1. Open `Menus` from the main admin navigation.
2. Start on the Menus list.
   Confirm:
   - which menus already exist,
   - which one you want to edit,
   - whether you need a brand-new menu instead.
3. If you need a new menu, click `New`.
4. In the create dialog, fill the fields in this order:
   - `Menu name`
   - `Location (optional)`
5. Use `Create Menu` to add the menu to the list.
6. Open the chosen menu from the list when you are ready to edit it.
7. In the editor header, confirm:
   - you are editing the correct menu,
   - whether the menu is `Draft` or `Published`,
   - whether `Unsaved changes` is already shown,
   - whether `Discard`, `Save changes`, and `Publish` or `Move to Draft` are
     available.
8. Review the menu-level fields before touching the structure:
   - `Theme location`
   - `Menu name`
9. Use `Theme location` for the theme slot identifier the frontend expects, for
   example `primary` or `footer`. Leave it empty for menus that are not mounted
   in a theme slot yet.
10. Scroll to `Menu Structure`.
11. Use `Add Item` when you need a new link.
12. Reorder items in the structure area by dragging the grip handle:
    - drop near the top of a row to place before that item,
    - drop near the bottom of a row to place after that item,
    - keep the handle lane on the left for same-level before/after placement,
    - move the cursor deliberately to the right side of a row to create a
      sub-menu.
13. Select an existing item when you need to edit its details.
14. In item settings, work top to bottom:
    - `Navigation Label`
    - `Link Type`
    - linked page or custom URL
    - `Parent Item`
    - `Visibility`
    - `Badge Label`
    - `Badge Tone`
    - `Description`
    - `Icon Name`
15. Choose `Link Type` carefully:
    - `Page` when the menu item should point to an internal page,
    - `Custom URL` when the item should point to an external or custom route.
16. Use `Parent Item` when you want the link nested under another item instead
    of sitting at the top level.
17. Use `Visibility` when the link should appear only for:
    - everyone,
    - logged-in users,
    - logged-out users.
18. Use `Badge Label`, `Badge Tone`, `Description`, and `Icon Name` only when
    your menu presentation needs extra metadata.
19. Use the delete action only after reading the confirmation dialog. If the
    item has children, the dialog tells you how many nested items will also be
    removed from the current draft menu.
20. Click `Save changes` after updating menu metadata, structure, or item
    settings.
21. Click `Publish` when the current valid menu should become available to
    runtime navigation. The editor saves valid pending changes first.
22. Click `Move to Draft` when a published menu should stop powering runtime
    navigation while you revise it.
23. Use `Discard` only when you intentionally want to throw away the unsaved
    state.
24. Use the contextual `Refresh` action only when the editor warns that the
    same menu changed elsewhere and you intentionally want the latest server
    state.

Use this safe working order when you want the fewest mistakes:

1. Choose the correct menu from the list.
2. Update menu-level name/location first.
3. Build the hierarchy.
4. Edit item details one item at a time.
5. Save changes.
6. Publish only after the menu structure and theme location are intentional.

# Advanced

- Do not build navigation before the underlying routes are stable. Menus should
  reflect product structure, not guess it.
- The list screen exists to reduce mode confusion. Do not treat the editor as a
  place to browse between unrelated menus; return to the list when you want a
  different navigation surface.
- Use top-level items for primary journeys and nesting for secondary or
  contextual links. If every item becomes nested, the information architecture
  is usually doing too much.
- `Location` is operational metadata for theme mapping. Use consistent location
  names across environments instead of inventing similar labels for the same
  purpose.
- A draft menu can have a location, but runtime navigation ignores it until the
  menu is published.
- `Visibility` is more than presentation polish. It changes who can discover a
  path through navigation.
- Badge, description, and icon fields are optional enrichments. Only use them
  when the runtime menu presenter actually benefits from the extra signal.
- Drag-and-drop hierarchy is powerful, but it is easy to create confusing
  trees. Review the final structure as a user journey, not just as a technical
  nesting exercise.
- The editor can surface remote updates without overwriting your unsaved draft.
  Refresh intentionally only from that warning state when another tab changed
  the same menu.

# Troubleshooting

- Menus appears to be stuck on loading:
  return to the Menus list, choose the menu again, and confirm the current menu
  still exists.
- You cannot find the menu you expected:
  return to the Menus list and confirm it was created successfully.
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
  it, then confirm the menu is `Published`.
- You want to remove an item but are unsure whether children will be affected:
  open delete intentionally and read the confirmation dialog before continuing.

# Decision Guide

- Choose `New Menu` vs editing an existing menu:
  create a new menu when the navigation surface is conceptually different; edit
  an existing menu when you are refining the same navigation area.
- Choose list screen vs editor:
  use the list to choose the correct menu first; use the editor only for the
  selected menu you are actively changing.
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
- Choose `Save changes` vs `Publish`:
  save when you want to keep working in the admin editor; publish when the
  current valid menu should power runtime navigation.

# Checklist

1. Confirm you opened the correct menu from the list.
2. Confirm menu `Theme location` and `Menu name` are correct.
3. Confirm top-level and nested item hierarchy matches user journeys.
4. Confirm each item points to the correct page or custom URL.
5. Confirm `Visibility` rules are intentional.
6. Confirm optional badge/description/icon metadata is actually needed.
7. Click `Save changes`.
8. Click `Publish` if the menu should be used by runtime navigation.
9. Re-check the saved structure before leaving the editor.

# Security

- Menus is an authenticated admin surface and should only be used by signed-in
  users with the appropriate content/navigation permissions.
- Custom URLs should be reviewed carefully before saving, especially when they
  point outside the trusted site surface.
- Visibility rules can accidentally expose or hide important navigation paths,
  so treat them as access-sensitive presentation rules rather than decoration.
- Deleting or misrouting menu items can break core site journeys even without
  changing page content, so save and review deliberately.
