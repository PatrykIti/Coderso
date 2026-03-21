---
title: "Pages, Preview, and Page Editor"
audience: "editor"
productArea: "pages"
language: "en"
keywords:
  - pages
  - page list
  - page editor
  - preview
  - page builder
  - page settings
  - revisions
---

# Basic

Pages is the admin surface for managing standalone site pages such as home,
about, landing, legal, and campaign pages. The workflow starts in the Pages
list, moves into Page Editor for content and layout work, and finishes with
runtime preview, settings, and publish history checks.

The current UI includes:
- a Pages list with search, status filter, author filter, pagination, and row
  actions,
- a create drawer for title, slug, template, and "open in editor after create",
- a Page Editor with a left-side component library, editable canvas, top action
  bar, and contextual details/settings surfaces.

# Medium

Use Pages when you need a bespoke page that should be edited as a composed page
layout rather than as a repeatable structured record. If the content is better
modeled as a reusable data type with many records, use Coderso Engine and
Entries instead of adding more standalone pages.

The Pages surface is split into a few clear responsibilities:
- Pages list:
  find pages, check status, open editor, or use row actions.
- Create New Page:
  start from a title, slug, and template before entering the editor.
- Page Editor:
  assemble content with widgets, templates, and forms.
- Page settings:
  control metadata, navigation visibility, revision retention, wrapper layout,
  and default widget layout values.
- History:
  review publish revisions and settings autosaves when they exist.
- Runtime preview:
  open a read-only preview rendered with the site theme instead of the admin
  editing chrome.

# Instruction

1. Open `Pages` from the main admin navigation.
2. Use the list screen to search by title, filter by status or author, and scan
   the table columns for page title, status, author, last updated, and actions.
3. Click `Create New Page` when you need a new page.
   Fill in:
   - `Page title`
   - `Slug`
   - `Template`
   - optional `Open in editor after create`
4. Open an existing page by clicking its title in the table.
5. In Page Editor, use the left library tabs:
   - `Widgets`
   - `Templates`
   - `Forms`
   Search within the library, then insert content into the page canvas.
6. Use the top editor actions while you work:
   - device switcher for preview mode selection,
   - `Runtime preview`,
   - `Save draft`,
   - `Publish`,
   - `Page settings`,
   - `History`.
7. Open `Page settings` to manage:
   - page title and slug,
   - template and navigation visibility,
   - revision retention,
   - wrapper width, spacing, background color/media,
   - default widget layout values for new or inherited blocks.
8. Open `History` to restore published revisions or manage the latest settings
   autosave snapshot when revisions exist.
9. Use `Runtime preview` to verify the page in a read-only site-theme frame
   before publishing.
10. Return to the Pages list when you need list-level actions such as
    duplicate, preview, publish/unpublish, or delete from the row actions menu.

Successful completion looks like this:
- the page has the correct title and slug,
- the editor draft is saved,
- runtime preview has been checked on the needed device mode,
- the final page status in the list matches your intent (`Draft` or
  `Published`).

# Advanced

- Treat Pages as a composite page-building surface, not a dumping ground for
  repeatable business records. If you find yourself cloning many near-identical
  pages only to swap data, that is a signal to move the data model into Entries.
- Distinguish canvas editing from runtime preview:
  canvas is editable and shown inside admin chrome, while runtime preview is
  read-only and rendered through the site runtime.
- Distinguish page-wide settings from block-level settings:
  page settings shape wrapper layout and defaults; block settings shape one
  selected component.
- Revision retention only governs kept publish snapshots. It is not the same as
  save frequency, and it does not replace draft discipline.
- Closing the settings drawer can preserve one autosave snapshot for settings,
  but that is not the same as publishing a revision.
- When a page uses navigation visibility, template overrides, wrapper spacing,
  or inherited widget defaults, those choices affect the runtime result even if
  the canvas itself looks minimal.

# Troubleshooting

- A page is "missing" from the list:
  clear the title search box and reset the `Status` and `Author` filters before
  assuming the record is gone.
- The details panel is empty:
  select a block in the canvas first. The editor shows a placeholder when no
  block is selected.
- Runtime preview looks blank:
  save the page first, confirm the preview opened successfully, and remember
  that an empty page can legitimately preview as an almost blank surface.
- You expected revision entries but History says none:
  no publish revisions or settings autosaves have been created yet for that
  page.
- Settings changes are not reflected:
  use `Save settings` in the drawer. Closing the drawer preserves only one
  autosave snapshot for settings, not a committed published state.
- Template options do not appear immediately:
  the settings drawer loads template options asynchronously; wait for the list
  to finish loading before assuming the template is unavailable.

# Decision Guide

- Choose `Pages` vs `Entries`:
  use Pages for bespoke standalone layouts; use Entries for repeatable records
  driven by a shared schema.
- Choose `Save draft` vs `Publish`:
  save draft when work should remain internal; publish when the runtime version
  should update.
- Choose canvas editing vs runtime preview:
  use canvas for content assembly and block selection; use runtime preview to
  validate read-only public rendering and device output.
- Choose `Duplicate` vs `Create New Page`:
  duplicate when a new page should inherit an existing structure; create a new
  page when you want a clean start from title, slug, and template selection.
- Choose `Page settings` vs block details:
  use Page settings for page-wide behavior, layout, and defaults; use block
  details for one selected widget or section.

# Checklist

1. Confirm the page title and slug are correct.
2. Confirm the right template is selected.
3. Confirm `Show in navigation` matches the intended menu behavior.
4. Confirm wrapper layout and default widget layout values are intentional.
5. Confirm the canvas contains the expected blocks and that block details are
   reviewed where needed.
6. Run runtime preview in the required device mode before publishing.
7. Save draft, then publish only when the runtime state is ready.
8. Check History if you need proof of revisions or a settings autosave path.

# Security

- Pages is an authenticated admin surface and should only be used by signed-in
  users with the appropriate content/page permissions.
- Runtime preview uses a generated preview URL and tokenized preview session.
  Treat preview links as sensitive operational links, not public share links.
- `Publish` affects the public-facing runtime; `Save draft` does not.
- `Show in navigation` changes public discoverability, so review it as part of
  release readiness instead of treating it like a cosmetic toggle.
