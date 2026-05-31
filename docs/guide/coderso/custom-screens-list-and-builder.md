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
  - screen widgets
---

# Basic

Custom Screens List and Screen Builder let you design purpose-built admin
surfaces on top of existing Engine content types. The list route is where you
review or create screens; the builder route is where you compose the actual
screen from dedicated screen widgets and bindings.

In the current UI, the list route includes:
- `Custom Screens` header,
- `New screen`,
- an empty state when no screens exist yet.

In the current builder route, the screen is organized into:
- left library of dedicated screen widgets,
- center screen canvas with `Builder` and `Preview`,
- right settings tabs:
  `Screen`, `Bindings`, `Block`.

# Medium

Use Custom Screens when the default record editor is too generic and a team
needs a workflow-specific admin surface for one content type. This is a builder
for admin experiences, not a replacement for the underlying content model.

The current screen-building workflow breaks into four parts:
- screen shell:
  define name, content type, status, and sidebar shortcut behavior
- widget composition:
  add dedicated screen widgets from the library
- bindings:
  connect widgets to fields from the bound content type
- preview:
  confirm what the admin experience will look like before real record work

In the local UI, the dedicated screen widget library currently includes items
such as:
- `Screen Record Header`
- `Screen Field Value`
- `Screen Field Group`
- `Screen Two Column`

# Instruction

1. Open `Coderso > Screens`.
2. If the list is empty, use `New screen` immediately.
3. In the list route, treat the screen catalog as the place to decide whether a
   workflow-specific screen already exists before creating a new one.
4. In the builder route, start with the right-side `Screen` tab.
5. Fill the screen-level settings in this order:
   - `Screen name`
   - `Content type`
   - `Status`
   - `Sidebar shortcut`
   - `Sidebar label`
6. Choose the content type before you try to reason about bindings or record
   preview. The screen cannot become meaningful without a bound type.
7. Use the left library to add dedicated screen widgets to the canvas.
8. Stay in `Builder` mode while composing the screen.
9. Switch to `Preview` when you want to inspect the current admin experience
   rather than continuing to place widgets.
10. Use the `Bindings` tab when widgets need to pull data from content type
    fields.
11. Use the `Block` tab when you need configuration for one selected widget
    block instead of the whole screen.
12. Use `Create screen` only after the screen shell and widget composition are
    coherent enough to support a real record workflow.
13. Use `Back to list` when you want to return to the screen catalog.

Use this safe builder order when you want fewer design mistakes:
1. Choose the content type.
2. Name the screen clearly.
3. Add the smallest useful set of screen widgets.
4. Bind them to the right fields.
5. Preview the screen.
6. Only then create/save the screen for real record work.

# Advanced

- Build the data model first in Engine. Custom Screens should focus the admin
  experience, not repair an unclear schema.
- The dedicated screen widget library is intentionally smaller than the general
  page/widget system. That is a feature, not a limitation. It keeps the surface
  workflow-specific.
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
  add dedicated screen widgets from the left library first.
- Preview is not meaningful:
  confirm the content type is selected and the screen has useful bound widgets.
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
- Choose `Builder` vs `Preview`:
  use Builder to compose; use Preview to verify workflow clarity.
- Choose `Screen` vs `Bindings` vs `Block` settings:
  use `Screen` for overall surface settings, `Bindings` for field mapping, and
  `Block` for one selected widget’s configuration.
- Choose sidebar shortcut on vs off:
  enable it when the workflow deserves direct navigation; leave it off when the
  screen is not ready or should stay secondary.

# Checklist

1. Confirm the correct content type is selected.
2. Confirm screen name is clear.
3. Confirm the screen has the minimum useful widget composition.
4. Confirm bindings match the intended content fields.
5. Confirm sidebar shortcut and label are intentional.
6. Review preview before handing the screen to real users.

# Security

- Custom Screen Builder is an authenticated admin surface and should only be
  used by users with the right admin/workflow permissions.
- A custom screen can reshape how teams interact with records, so a bad binding
  or misleading widget can create operational errors even without changing raw
  data.
- Do not use custom screens to expose fields or workflows that should remain
  hidden by RBAC or internal policy.
