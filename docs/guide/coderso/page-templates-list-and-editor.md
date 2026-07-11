---
title: "Page Templates List and Editor"
audience: "editor"
productArea: "coderso-pages"
language: "en"
keywords:
  - page templates
  - reusable sections
  - page blocks
  - Page Editor
  - draft
  - published
---

# Basic

Page Templates are reusable Page v2 section stacks. They use the same Page-owned
sections, blocks, canvas renderer, inline editing, and preview flow as the normal
Page Editor. They are not generic widgets and do not use the retired Widget
Library or Widget Template Editor. Configurable widgets belong only to the Admin
Dashboard.

Open Page Templates at `/admin/advanced/page-templates`. The list shows a card
for each template with its name, category or status, slug, section count, and
last updated date. From a card you can:

- open `Edit`,
- duplicate the template,
- delete it after confirmation.

Use `New template` to create an empty draft Page v2 document. A name is required;
category is optional. After creation, Coderso opens the new template in the Page
Template editor.

# Medium

Use a Page Template when you want to reuse a Page-owned composition instead of
rebuilding the same section stack on each Page. The list provides:

- search by name, slug, or category,
- `All`, `Published`, and `Draft` status filters with counts,
- draft and published status visibility,
- duplicate and confirmed delete actions,
- clear empty, loading, and error states.

The editor at `/admin/advanced/page-templates/:id` is the shared Page Editor v2
surface in Page Template mode. The document itself contains Page sections and
blocks. `Template settings` owns only template metadata:

- name,
- slug,
- description,
- category,
- status: `Draft` or `Published`.

Published templates are offered by the Page Editor insert picker. Draft
templates remain in the Page Templates library and are not offered for
insertion.

# Instruction

1. Open `Pages`, then open `Page Templates`.
2. Search or select `All`, `Published`, or `Draft` before creating a duplicate.
3. Click `New template`.
4. Enter a required template name.
5. Optionally enter a category that will help editors find related templates.
6. Click `Create template`.
7. In the Page Template editor, add and arrange Page-owned sections and blocks
   with the shared Page Editor controls.
8. Edit block content and presentation through the owning Page controls. Do not
   create a generic widget or legacy widget template as a workaround.
9. Save the template document deliberately. Page Templates do not advertise the
   normal Page revisions, autosave, or assistant surfaces in the current editor.
10. Use `Preview`; the dialog opens as `Template preview` and checks the reusable
    section stack through the Page preview pipeline.
11. Open `Template settings`.
12. Confirm the name and slug, then add an optional description and category.
13. Keep the status `Draft` while the template is incomplete.
14. Change the status to `Published` when it is ready for the Page Editor insert
    picker.
15. Click `Save settings`.
16. Open the target Page and choose the published template from the Page Editor
    insert picker.
17. Review the inserted sections and blocks in that Page before publishing it.

To manage an existing template from the list:

1. Click its name or `Edit` to open it.
2. Use the copy action to create a separate duplicate. The list refreshes after
   the duplicate is created.
3. Use delete only when the reusable source is no longer needed.
4. Confirm permanent deletion in `Delete page template`. Pages that already
   received the template keep their inserted sections.

# Advanced

- The reusable document is Page v2: the Page domain owns its sections, blocks,
  validation, renderer, and editor controls.
- Template metadata does not become Page metadata. Template settings, SEO, and
  breakpoints do not apply to a target Page; only the template sections are
  inserted.
- A template can remain a draft for internal preparation. Publication only
  controls whether it is offered by the Page Editor insert picker.
- Duplicate creates a separate reusable template. Edit the original when you
  want to change the reusable source for future insertions or linked site-wide
  consumers; duplicate when you need a divergent starting point.
- The list's site-wide information note applies to templates used as linked
  site-wide resources. Sections inserted into a Page remain on that Page even if
  the reusable template is later deleted.
- A Page Template can participate in supported page-scoped site composition,
  such as a configured footer. The main header/navigation remains owned by the
  Menus surface, not by a Page Template.
- The current Page Template editor exposes preview and explicit document saves,
  but does not advertise Page revisions, autosave history, SEO, or an assistant
  active surface.

# Troubleshooting

- A template does not appear in the Page insert picker:
  open `Template settings`, set it to `Published`, save settings, and reopen the
  picker.
- `Create template` is disabled:
  enter a non-empty name. Category is optional.
- The list shows no result:
  clear the search field or switch the status filter to `All`.
- The list or an action shows an error:
  keep the visible error message, correct the input if applicable, and retry the
  action. Do not assume a failed create, duplicate, delete, or save succeeded.
- Template settings did not change an inserted Page's SEO or breakpoints:
  this is expected. Only sections are inserted; configure Page-level settings on
  the target Page.
- You cannot find revisions, autosave history, or assistant actions:
  those surfaces are not advertised for Page Templates in the current editor.
- A deleted template still appears on a Page:
  applied Pages keep their inserted sections. Edit or remove those sections from
  the Page itself.
- You need to change the site's main navigation:
  use Menus. Do not model the header menu as a Page Template.
- An old link opens Advanced Widgets or Widget Templates:
  return to Page Templates. Those are retired compatibility paths, not the
  current reusable Page authoring workflow.

# Decision Guide

- Choose a Page vs a Page Template:
  use a Page for one published route; use a Page Template for a reusable Page
  section/block starting point.
- Choose edit vs duplicate:
  edit when the reusable source should remain one template; duplicate when the
  new version needs an independent identity and lifecycle.
- Choose `Draft` vs `Published`:
  use `Draft` while building or reviewing; use `Published` when editors should
  see it in the Page insert picker.
- Choose category vs no category:
  add a category when it improves search and recognition; leave it empty when
  the name and slug are enough.
- Choose Page Template vs Dashboard widget:
  use Page Templates for public Page sections and blocks; use Dashboard widgets
  only for configurable admin Dashboard panels.
- Choose Page Template vs Menu:
  use the Page Template for Page composition; use Menus for the main navigation
  structure and links.

# Checklist

1. Confirm you are in Page Templates, not the retired Widget Library.
2. Give the template a clear name and optional category.
3. Compose it only from Page-owned sections and blocks.
4. Save the template document.
5. Use `Preview` and review the section stack in `Template preview`.
6. Review name, slug, description, category, and status in `Template settings`.
7. Publish only when the template should appear in the Page insert picker.
8. Insert it into a target Page and review the inserted sections there.
9. Configure Page-level settings, SEO, and breakpoints on the target Page.
10. Confirm destructive deletion; remember that already applied Pages retain
    their sections.

# Security

- Page Templates are authenticated admin resources. Use them only with the
  appropriate content read/write permissions; write operations retain the admin
  CSRF contract.
- Preview links are temporary. Treat them as review links and do not publish or
  share them as permanent public URLs.
- Page Template documents pass through the Page-owned validation and rendering
  boundary. Do not bypass it with a generic widget payload or legacy
  `WidgetBlock` document.
- Do not place secrets, credentials, provider keys, session data, or privileged
  operational values in template metadata, sections, or blocks.
- Review links, embeds, forms, and media in the inserted Page under the security
  rules of their owning block before publishing.
- Delete is permanent for the reusable template and requires confirmation. It
  does not silently remove sections already inserted into Pages.
