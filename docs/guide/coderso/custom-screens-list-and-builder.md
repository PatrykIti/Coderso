---
title: "Custom Screens List and Screen Builder"
audience: "admin"
productArea: "coderso-custom-screens"
language: "en"
keywords:
  - custom screens
  - screen builder
  - bindings
  - admin workflow
  - screen blocks
---

# Basic

Custom Screens List and Screen Builder let you design purpose-built admin
surfaces on top of existing Engine content types. The list route is where you
review or create screens; the builder route is where you compose the actual
screen from screen-owned blocks, content-field bindings, and list-view columns.

In the current UI, the list route includes:
- `Custom Screens` header,
- `New screen`,
- an empty state when no screens exist yet.

In the current builder route, the screen is organized into:
- `List View` for the records table configuration,
- `Editor View` for the screen-owned record canvas,
- `Preview`,
- floating Editor View panels for Insert, Layers, Content, Binding, Style, and
  Settings.

# Medium

Use Custom Screens when the default record editor is too generic and a team
needs a workflow-specific admin surface for one content type. This is a builder
for admin experiences, not a replacement for the underlying content model.

The current screen-building workflow breaks into four parts:
- screen shell:
  define name, content type, status, and sidebar shortcut behavior
- screen composition:
  add screen-owned blocks or content fields from the floating Insert panel
- bindings:
  connect blocks to fields from the bound content type
- preview:
  confirm what the admin experience will look like before real record work

In the local UI, the screen block library currently includes items
such as:
- `Record header`
- `Field`
- `Field group`
- `Two columns`
- `Image`
- `Tabs`
- `Button`
- `Help text`

# Instruction

1. Open `Coderso > Screens`.
2. If the list is empty, use `New screen` immediately.
3. In the list route, treat the screen catalog as the place to decide whether a
   workflow-specific screen already exists before creating a new one.
4. In the builder route, start from `List View` if you need table columns or
   `Editor View` if you need the record canvas.
5. Fill the screen-level settings in this order:
   - `Screen name`
   - `Content type`
   - `Status`
   - `Sidebar shortcut`
   - `Sidebar label`
6. Choose the content type before you try to reason about bindings or record
   preview. The screen cannot become meaningful without a bound type.
7. In `Editor View`, use the floating Insert panel to add screen blocks or
   content fields to the canvas.
8. Use Layers to select sections and blocks, then Content/Binding/Style to edit
   the selected block.
9. Switch to `Preview` when you want to inspect the current admin experience
   rather than continuing to place blocks.
10. Use the `Binding` panel when blocks need to pull data from content type
    fields.
    A Button can bind its Link target to an eligible field or use a static safe
    link. Button actions other than Link are not available.
11. Use the `Content` or `Style` panel when you need configuration for one
    selected block instead of the whole screen.
12. For Tabs, add and name each tab, select `Edit content` for the intended tab,
    and insert blocks into that active panel. Preview with both mouse and
    keyboard before publishing the workflow.
13. Use `Create screen` only after the screen shell and block composition are
    coherent enough to support a real record workflow.
14. Use `Back to list` when you want to return to the screen catalog. If the
    Screen has unsaved document or binding changes, confirm whether to stay or
    discard them.

Use this safe builder order when you want fewer design mistakes:
1. Choose the content type.
2. Name the screen clearly.
3. Add the smallest useful set of screen blocks.
4. Bind them to the right fields.
5. Preview the screen.
6. Only then create/save the screen for real record work.

# Advanced

- Build the data model first in Engine. Custom Screens should focus the admin
  experience, not repair an unclear schema.
- The dedicated screen block library is intentionally smaller than the Page
  section/block system. That is a feature, not a limitation. It keeps the surface
  workflow-specific.
- Custom Screens are built from their own sections and blocks. They do not use
  Dashboard widgets or Widget Templates as a second authoring model.
- Image URLs and Button links are validated when authored and again when
  rendered. If a link or image source is rejected, correct it instead of trying
  to work around the disabled/placeholder state.
- The floating tools panel overlays narrow canvases without reserving desktop
  width. On larger screens the canvas makes room for it. The panel remains an
  accessible labelled region in both layouts.
- `Sidebar shortcut` changes navigation exposure, so treat it as information
  architecture, not decoration.
- `Sidebar label` should be short and operationally clear. It is a navigation
  affordance for people doing real record work.
- A screen without bindings can still preview layout, but it will not become a
  useful record tool until the data contract is wired in.
- Use `Preview` to validate workflow clarity, not just visual arrangement. The
  real question is whether the screen helps a team do a job faster than the
  generic editor.

# Troubleshooting

- The screen feels empty:
  open the floating Insert panel and add screen blocks or content fields first.
- Preview is not meaningful:
  confirm the content type is selected and the screen has useful bound blocks.
- A Button is disabled in Preview:
  confirm it has a supported safe static Link or an eligible bound URL field.
- A Tab looks empty:
  select that tab's `Edit content` target before inserting blocks, then verify
  the visible panel in Preview.
- Save reports removed bindings:
  one or more referenced fields or blocks no longer exists. Review the named
  fields and reconnect only the bindings the workflow still needs.
- You are not sure what `Bindings` should do:
  think of bindings as the bridge from content type fields into the custom
  admin surface.
- The screen should appear in the sidebar but does not:
  review `Sidebar shortcut` and `Sidebar label`.
- The screen looks polished but still does not help the workflow:
  review whether the problem is missing bindings or a weak underlying schema.

# Decision Guide

- Choose Custom Screens vs plain Entries:
  use Custom Screens when the team needs a focused workflow-specific admin
  experience; stay in Entries when the generic editor is already sufficient.
- Choose `List View` vs `Editor View` vs `Preview`:
  use List View for table columns, Editor View to compose the record canvas, and
  Preview to verify workflow clarity.
- Choose `Settings` vs `Binding` vs `Content`:
  use Settings for overall surface settings, Binding for field mapping, and
  Content/Style for one selected block’s configuration.
- Choose sidebar shortcut on vs off:
  enable it when the workflow deserves direct navigation; leave it off when the
  screen is not ready or should stay secondary.

# Checklist

1. Confirm the correct content type is selected.
2. Confirm screen name is clear.
3. Confirm the screen has the minimum useful block composition.
4. Confirm bindings match the intended content fields.
5. Confirm sidebar shortcut and label are intentional.
6. Confirm every Tab exposes its intended content and every Button has a safe
   Link target.
7. Review preview before handing the screen to real users.

# Security

- Custom Screen Builder is an authenticated admin surface and should only be
  used by users with the right admin/workflow permissions.
- A custom screen can reshape how teams interact with records, so a bad binding
  or misleading block can create operational errors even without changing raw
  data.
- Do not use custom screens to expose fields or workflows that should remain
  hidden by RBAC or internal policy.
