---
title: "Widget Library (retired)"
audience: "editor"
productArea: "coderso-authoring"
language: "en"
keywords:
  - retired widget library
  - sections and blocks
  - page templates
  - dashboard widgets
---

# Basic

The old non-dashboard **Widget Library** is retired. Do not use a hidden
`Advanced > Widgets` route or a generic widget catalog to build Pages, Page
Templates, Forms, Menus, Posts, or Custom Screens.

Use the authoring surface that owns the document:

- Pages and Page Templates use Page sections and blocks.
- Forms use form fields and Form blocks/sections where they are placed.
- Menus, Posts, and Custom Screens use their own editor sections and blocks.
- Configurable widgets belong only to the Admin Dashboard.

# Medium

Historical records and source paths can still contain names such as
`core/widgets`, `WidgetBlock`, or `widget-template`. They are compatibility
identifiers for existing data and renderers, not a product surface for new
authoring. Do not create a legacy widget template as a workaround.

For reusable page composition, use **Page Templates**. For an editor-specific
reusable pattern, use that editor's supported section/block presets. For an
Admin Dashboard panel, use the Dashboard widget registry and its documented
RBAC/cache contract.

# Instruction

1. Open the editor that owns the content.
2. Add or edit its sections and blocks there.
3. Use Page Templates for reusable Page layouts.
4. Configure Dashboard widgets only from the Dashboard surface.
5. If an old record fails to render, treat the legacy widget path as a
   read-compatibility or migration issue; do not expose it as a new editor.

# Troubleshooting

- An old link points to Widget Library:
  return to the owning editor. The legacy route is not a supported authoring
  workflow.
- You need to reuse a full Page layout:
  create or apply a Page Template.
- You need a reusable block in a Form, Menu, Post, or Custom Screen:
  use the options supplied by that domain editor.
- You need a configurable admin overview panel:
  use an Admin Dashboard widget, not a public/content block.

# Security

- Retained legacy adapters must reject unknown data and must not expose a write
  path merely because old records remain readable.
- Sections, blocks, and Dashboard widgets must continue to enforce the auth,
  RBAC, validation, and secret-handling rules of their owning domain.
