---
title: "Widget Template Editor"
audience: "editor"
productArea: "coderso-widgets"
language: "en"
keywords:
  - widget template
  - template editor
  - reusable layout
  - template settings
  - template canvas
  - hero
  - block settings
  - visual settings
  - details panel
---

# Basic

Widget Template Editor is the workspace for building reusable layout templates
from widgets. It combines a widget library rail, a template canvas, preview and
details areas, and a template settings workflow.

In the current UI, the editor includes:
- left-side widget library by category,
- central `Template Canvas`,
- top actions such as `Preview`, `Discard`, and `Save Template`,
- side tabs `Settings` and `Details`,
- template metadata and layout controls.

# Medium

Use Template Editor when you need a reusable composition that can be applied to
multiple pages or other surfaces instead of rebuilding the same structure by
hand. This is a composition workflow, not just a single-widget configuration
screen.

The current template workflow breaks down into four parts:
- widget selection:
  choose reusable building blocks from the left rail
- composition:
  place widgets into the template canvas
- selected block details:
  configure widget-level visuals such as Hero colors, borders, and background
- template settings:
  name, description, category, status, wrapper layout, and background
- preview/review:
  inspect the template before saving

The local `new` route currently shows:
- category filter at the top of the library,
- dedicated reusable widgets in the rail,
- empty template canvas with drag/drop guidance,
- `Settings` and `Details` tabs,
- template metadata plus layout controls.

# Instruction

You can configure Hero widget colors from block-level details rather than from
the library or template-wide settings.

1. Open a template editor route, such as `new`.
2. Select the `Hero` block in `Template Canvas`.
3. Open `Details`.
4. In `Block Settings`, stay in `Visual`.
5. Use `Colors and Borders` for Hero text, button, and frame colors.
6. Use `Background` for Hero background color, gradient, or media.
7. Switch to `Settings` only when the template needs metadata or wrapper layout
   decisions.
8. In template settings, work top to bottom:
   - `Template name`
   - `Description`
   - `Category`
   - `Status`
   - layout controls
   - background media
9. Review layout controls carefully:
   - container
   - max width
   - section gap
   - wrapper padding top
   - wrapper padding bottom
   - background color
10. Use background media only when the wrapper truly needs image/video treatment.
11. Use `Preview` when you want to inspect the current template state rather than
   continuing to compose.
12. Use `Discard` only when you intentionally want to throw away unsaved work.
13. Use `Save Template` when the composition and settings are ready for reuse.

Use this safe authoring order when you want fewer reuse mistakes:
1. Build the template canvas.
2. Select the correct block.
3. Finish block-level visuals in `Details`.
4. Fill metadata and template-wide layout in `Settings`.
5. Preview.
6. Save template.

# Advanced

- A reusable template should be narrower than a full one-off page. Build for a
  repeatable pattern, not every possible scenario.
- Category choice matters because it shapes discoverability in the library later
  on.
- Template-wide settings and selected block details are different layers.
  Use `Settings` for wrapper behavior and use `Details` when you need to
  configure Hero widget colors or other block-specific visuals.
- Layout controls belong to the template contract, not just its current visual
  appearance. Treat wrapper spacing, max width, and background as reuse
  decisions.
- Background media can easily make templates harder to reuse. Only add it when
  the template’s identity genuinely depends on it.
- The `Details` tab should be used when a selected block needs focused
  configuration beyond global template settings.
- A template should feel more reusable after editing, not more specialized. If
  it becomes too specific, it probably belongs on a one-off page instead.

# Troubleshooting

- The canvas feels empty:
  add widgets from the library first; the `new` route starts from an empty
  template shell.
- The template looks wrong even though widgets are present:
  review wrapper layout controls and background settings in `Settings`.
- Hero colors are not changing:
  confirm the `Hero` block is selected and you are editing `Details > Block
  Settings > Visual`, not only template-wide `Settings`.
- Reuse feels awkward:
  the template may be too specialized and should be split into smaller reusable
  compositions.
- You are not sure whether to edit template settings or block details:
  use template settings for global template behavior and details for one selected
  block.
- The template is hard to find later:
  review its name and category, not just the widget composition.

# Decision Guide

- Choose template vs one-off page edit:
  use a template when the composition should be reused; use one-off editing when
  the layout is genuinely unique.
- Choose `Settings` vs `Details`:
  use `Settings` for global template metadata/layout; use `Details` for one
  selected block.
- Choose template settings vs Hero visual settings:
  use template settings for wrapper/container behavior; use `Details > Block
  Settings > Visual` for Hero colors, borders, and background.
- Choose preview vs immediate save:
  preview when layout or wrapper behavior still feels uncertain; save only when
  reuse intent is clear.

# Checklist

1. Confirm the widget composition is reusable.
2. Confirm the correct block is selected before changing widget-level styling.
3. Confirm Hero visual settings were edited in `Details > Block Settings >
   Visual`.
4. Confirm template name and category are clear.
5. Confirm layout controls reflect the intended reuse behavior.
6. Confirm background choices are intentional.
7. Preview before saving.
8. Save template only when it is actually ready for reuse.

# Security

- Template Editor is an authenticated admin surface and should only be used by
  users with the appropriate editor permissions.
- Reusable templates should not embed secrets, provider keys, or internal-only
  operational data.
- A bad reusable template can spread mistakes across many surfaces quickly, so
  template-level changes should be reviewed carefully before broad reuse.
