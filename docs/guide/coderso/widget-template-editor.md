---
title: "Widget Template Editor (retired)"
audience: "editor"
productArea: "coderso-pages"
language: "en"
keywords:
  - retired widget template editor
  - page templates
  - reusable sections
  - reusable blocks
  - dashboard widgets
---

# Basic

The old non-dashboard **Widget Template Editor** is retired. Do not use an
`Advanced > Widgets` route, a widget library, or Wizard/Visual/Advanced widget
editors to create new Page, Form, Menu, Post, or Custom Screen content.

Use the current owner for the work instead:

- reusable public page composition: **Pages > Page Templates**;
- one page: the Page editor's sections and blocks;
- a Form: the Forms builder, then place the existing Form block/section;
- a Custom Screen: its screen-owned sections, blocks, and bindings;
- a Post: the Posts block editor;
- configurable admin panels: Dashboard widgets, which are a separate admin-only
  feature.

Historical records and code may still use names such as `widget-template` or live
under `core/widgets/**`. Those names describe compatibility storage/runtime seams,
not a selectable product authoring surface.

# Instruction

To build a reusable page composition:

1. Open `Pages`.
2. Open `Page Templates` from the Pages surface.
3. Create or open a Page Template.
4. Compose it from Page-owned sections and blocks.
5. Configure the selected section/block through the Page editor controls.
6. Preview and save the template.
7. Insert the template into a Page; insertion creates fresh section/block IDs.

Do not create a legacy widget template as a workaround. Do not add a
non-dashboard widget registry entry, preset, module-pack entry, or editor mode.

# Advanced

- Page Templates store the Page v2 section/block document contract.
- Custom Screens and other editors keep their own bounded section/block models;
  a Page Template is not a cross-editor generic payload.
- Dashboard widgets use the Dashboard registry, RBAC, cache, and per-user layout
  contract. They are not Page blocks and do not use `core/widgets/**`.
- Stored legacy widget-shaped data may have a non-destructive read adapter. That
  compatibility path does not permit new writes in the retired format.

# Troubleshooting

- You cannot find `Advanced > Widgets`:
  this is expected; the old authoring surface is retired.
- You need reusable Page content:
  use `Pages > Page Templates`.
- You need a reusable pattern in another editor:
  use that editor's own section/block/template feature rather than a generic
  widget template.
- You only need to configure the Admin Dashboard:
  use Dashboard widget settings; this retirement does not remove Dashboard
  widgets.

# Checklist

1. Confirm the target editor that owns the content.
2. Use only that editor's section/block schema and controls.
3. Use Page Templates only for Page v2 compositions.
4. Keep Dashboard widgets admin-only and separate.
5. Do not persist a new legacy widget-template document.

# Security

- Template and editor routes remain authenticated admin surfaces with their
  existing RBAC and CSRF requirements.
- Never put secrets, provider keys, internal tokens, or privileged operational
  data into reusable section/block content.
- Preview and publish through the owning editor so its validation and sanitizers
  remain authoritative.
