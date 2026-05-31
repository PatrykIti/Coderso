---
title: "Pages List and Page Creation"
audience: "editor"
productArea: "pages"
language: "en"
keywords:
  - pages
  - page list
  - page creation
  - create page
  - draft
  - publish
---

# Basic

Pages List is the control center for standalone site pages. It is where you
review existing pages, filter the list, open a page in the editor, and start a
new page from the `Create New Page` drawer.

In the current UI, this screen includes:
- a page-specific title search field,
- `Status` and `Author` filters,
- a table with page title, status, author, last updated, and actions,
- a create drawer with title, slug, template, and an option to open the editor
  immediately after creation.

# Medium

Use the Pages list when you need to answer one of these questions:
- Which pages already exist?
- Which pages are still drafts?
- Who last worked on a page?
- Should I start from scratch or duplicate an existing page?

This screen is best for list-level decisions and entry points, not deep editing.
Once you know which page you want, the list should hand you off quickly to Page
Editor or to a row action such as preview, duplicate, publish, unpublish, or
delete.

The main parts of the screen are:
- list header:
  `Pages` plus the description `Manage your content and page structures.`
- creation entry point:
  `Create New Page`
- filters:
  title search, `Status`, `Author`
- table:
  `Page title`, `Status`, `Author`, `Last updated`, `Actions`
- pagination:
  `Previous` and `Next`

# Instruction

1. Open `Pages` from the main admin sidebar.
2. Start by scanning the table instead of clicking immediately.
   Check:
   - the page title,
   - the slug shown below the title,
   - the status badge,
   - the author,
   - the last updated date.
3. If the list is long, use the page search field first.
   Type part of the title to narrow the table before changing anything else.
4. If search is still too broad, use filters:
   - `Status` when you want only drafts or only published pages,
   - `Author` when you want pages owned or last touched by one person.
5. To open a page for editing, click the page title.
   This is the fastest path into Page Editor.
6. To create a page, click `Create New Page`.
7. In the create drawer, fill the fields in this order:
   - `Page title`
   - `Slug`
   - `Template`
8. Decide whether to keep `Open in editor after create` enabled.
   - keep it enabled when you want to start building immediately,
   - disable it when you only want to create the shell and stay in the list.
9. Click `Create Page`.
10. After creation:
   - if `Open in editor after create` is enabled, you go directly to the
     editor,
   - if it is disabled, the new page stays in the list and you can continue
     list-level work.
11. Use the row actions menu when you need list-level operations without first
    opening the full editor:
   - `Edit`
   - `Preview`
   - `Duplicate`
   - `Publish`
   - `Unpublish`
   - `Delete`

Follow this creation pattern when you want the least friction:
1. Choose a clear title.
2. Set a clean slug.
3. Keep the default template unless you know a different template is required.
4. Open the page in the editor immediately.
5. Save draft before doing anything more advanced.

# Advanced

- Prefer creating a new page when the future content will differ in structure
  and intent. Prefer duplication when the new page should inherit an existing
  layout pattern.
- Do not use the Pages list as a content model. If you are creating many pages
  that only differ by one or two fields, that usually means the content belongs
  in a structured record workflow instead.
- Filters are operational tools, not just convenience UI. Use them before bulk
  review or release checks, especially when you need to answer "what is still in
  draft?"
- The list gives you a publishing overview, but not full revision context. Once
  work becomes page-specific, move into the editor and use `History`.
- The create drawer is intentionally small. It defines the page shell, not the
  full content. Deeper layout, defaults, and runtime decisions belong in the
  editor.

# Troubleshooting

- You cannot find a page you expect:
  clear the search field first, then reset `Status` and `Author` to `All`.
- The page exists but is not visible in your current filtered list:
  check whether it is in `Draft` rather than `Published`, or assigned to a
  different author.
- You created a page but did not land in the editor:
  check whether `Open in editor after create` was disabled.
- The slug looks wrong after typing the title:
  correct it in the create drawer before you click `Create Page`.
- Preview is available from the list, but you need deeper editing context:
  use `Edit` instead of staying in list actions.
- You are tempted to delete a page to "start fresh":
  duplicate or edit it first unless you are certain the page should be removed.

# Decision Guide

- Choose search vs filter:
  use search when you know the title; use filters when you know the state or
  owner but not the exact page name.
- Choose click title vs row action:
  click the title when you want full editing; use row actions for fast
  operational actions.
- Choose create vs duplicate:
  create for a clean shell; duplicate for a layout or content pattern you want
  to reuse.
- Choose stay in list vs open editor after create:
  stay in the list when you are setting up several placeholders; open the editor
  when you are ready to build immediately.
- Choose publish vs unpublish from the list:
  publish when the runtime version should become available; unpublish when the
  public runtime should stop serving that page version.

# Checklist

1. Confirm you are on the correct page row before using row actions.
2. Confirm the status badge matches your expectation.
3. Confirm the slug under the title is the route you want.
4. When creating a page, confirm title, slug, and template before clicking
   `Create Page`.
5. Decide explicitly whether the page should open in the editor immediately.
6. If the page is going live soon, open it in the editor next and verify
   settings, preview, and publish state there.

# Security

- Pages List is an authenticated admin surface and should only be used by
  signed-in users with the right page/content permissions.
- `Preview`, `Publish`, `Unpublish`, and `Delete` have runtime impact and should
  be treated as operational actions, not casual navigation shortcuts.
- `Delete` is destructive. Use it only when you are certain the page should be
  removed.
- A page slug affects the public-facing route. Review slugs carefully before
  publishing because route mistakes become public-facing mistakes.
