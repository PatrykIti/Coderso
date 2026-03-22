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

For Hero color work, the important distinction is between selected block
details and template-wide settings. Use `Details > Block Settings > Visual` for
Hero-specific colors, borders, button styling, and background choices. Use
template `Settings` only for wrapper-level layout, spacing, metadata, and
template-wide background behavior.

In practice, Hero color work usually means you are already past discovery and
composition. You are not deciding whether Hero exists in the library first.
You are editing one selected Hero instance that is already placed in the
template canvas.

That is why the normal path for this task is simple. Open the template that
already contains Hero. Select that Hero block in the canvas. Adjust its visual
settings in `Details`. Move to template `Settings` only when the change should
affect the wrapper around the whole template rather than the Hero block itself.

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
- Hero styling should stay block-specific when the visual change belongs only to
  one Hero instance. Moving every color choice into template-wide wrapper
  settings is an anti-pattern because it blurs block visuals with layout
  contract.
- Category choice matters because it shapes discoverability in the library later
  on.
- Template-wide settings and selected block details are different layers.
  Use `Settings` for wrapper behavior and use `Details` when you need to
  configure Hero widget colors or other block-specific visuals.
- Layout controls belong to the template contract, not just its current visual
  appearance. Treat wrapper spacing, max width, and background as reuse
  decisions.
- If Hero colors vary by campaign or locale, prefer separate presets or
  purpose-driven template variants over one overloaded template that tries to
  cover every palette combination.
- Background media can easily make templates harder to reuse. Only add it when
  the template’s identity genuinely depends on it.
- Avoid hiding a weak Hero configuration behind global wrapper polish. If the
  Hero still needs per-block fixes in typography, buttons, or background
  contrast, solve those in `Details` first.
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

1. Use template editing when the Hero composition should stay reusable across
   multiple pages or other template consumers.
2. Use one-off page editing when the color change is truly local to one page
   and should not affect the reusable template.
3. Use `Details > Block Settings > Visual` when the change belongs to Hero
   colors, borders, buttons, or Hero background styling.
4. Use template `Settings` when the change belongs to wrapper layout, metadata,
   section spacing, or template-wide background behavior.
5. Use `Preview` before saving when you are unsure whether the visual change is
   really block-specific or if it affects the template wrapper more broadly.

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
- Hero color configuration is presentation-only and should stay that way. Do not
  place secrets, API keys, internal tokens, or privileged operational data in
  Hero copy, button URLs, or media metadata while styling the block.
- Review external background media and CTA targets carefully. A visual change in
  Hero can still expose unsafe URLs, untrusted assets, or internal-only routes
  if the block content is edited carelessly.
- Reusable templates should not embed secrets, provider keys, or internal-only
  operational data.
- A bad reusable template can spread mistakes across many surfaces quickly, so
  template-level changes should be reviewed carefully before broad reuse.
