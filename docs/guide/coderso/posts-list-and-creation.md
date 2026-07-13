---
title: "Posts List and Post Creation"
audience: "editor"
productArea: "coderso-posts"
language: "en"
keywords:
  - posts
  - posts list
  - create post
  - editorial
  - draft
  - publish
---

# Basic

Posts List is the operational entry point for article-style content. It is
where you review existing posts, search and filter the list, open a post in the
editor, and start a new post from the `Create New Post` drawer.

In the current UI, this surface includes:
- a list header with `Posts` and a short editorial description,
- a primary action `New post`,
- status and author filters,
- a posts table with title, status, author, published date, and actions,
- a create drawer with title, slug, and `Open in editor after create`.

# Medium

Use the Posts list when you need to answer editorial management questions such
as:
- which posts already exist,
- which posts are still drafts,
- who last worked on a post,
- whether a new post should start from scratch or from duplication.

This screen is best for list-level control, not long-form editing. Once you
know which post you want to work on, the main job of the list is to route you
into the post editor or a row-level operation.

The key parts of the screen are:
- page header:
  `Posts` plus guidance for creating and publishing block-authored articles.
- filters:
  title search, `Status`, `Author`
- table columns:
  `Title`, `Status`, `Author`, `Published`, `Actions`
- row actions:
  edit, preview, duplicate, publish, unpublish, delete

The row itself is not a navigation control, so clicking blank row space does not open
the editor. Use the post-title link or the explicit `Edit` row action; the checkbox and
actions button keep their own native keyboard and pointer behavior. On mid-width
layouts, author and published/date context remains visible below the title until the
dedicated large-screen columns take over.

# Instruction

1. Open `Posts` from the main sidebar.
2. Scan the list before clicking anything.
   Check:
   - post title,
   - slug shown under the title,
   - status badge,
   - author,
   - published date when visible.
3. Use the search field when you know part of the post title or slug.
4. Use `Status` if you want to isolate drafts or published posts.
5. Use `Author` if you want to narrow the list to one editor’s work.
6. Open a post for editing by clicking or keyboard-activating its title link.
   Clicking empty row space does not navigate.
7. Use the row actions menu when you need a fast operation without first
   entering the full editor:
   - `Edit`
   - `Preview`
   - `Duplicate`
   - `Publish`
   - `Unpublish`
   - `Delete`
8. To create a new post, click `New post`.
9. In the create drawer, fill the fields in this order:
   - `Post title`
   - `Slug`
10. Decide whether to keep `Open in editor after create` enabled.
    - keep it enabled when you want to start writing immediately,
    - disable it when you only want to create the post shell and stay in the
      list.
11. Click `Create Post`.
12. After creation:
    - with `Open in editor after create`, the UI sends you directly into the
      editor,
    - without it, the post remains in the list for later editing.

Use this safe list workflow when you want the least friction:
1. Search or filter first.
2. Confirm you have the right post row.
3. Create or open the post.
4. Move into the editor for actual writing and publishing work.

# Advanced

- Treat the Posts list as editorial operations, not as the writing workspace.
  It should help you route work, not replace the editor.
- Search is useful when you know the title. Filters are useful when you know the
  editorial state but not the exact post.
- Use duplication when a new article should inherit an existing writing
  structure or content scaffold. Use create when you want a clean editorial
  shell.
- Categories and tags are managed in the editor rather than displayed in the
  Posts list. Resolve taxonomy there as part of the editorial workflow.
- Publishing from the list is operationally fast, but the editor remains the
  safer place for release decisions when content, preview, and revision context
  matter.

# Troubleshooting

- You cannot find a post:
  clear the search field first, then reset `Status` and `Author` to `All`.
- Clicking blank space in a post row does nothing:
  this is intentional. Use the title link to open the editor, the checkbox to
  select the row, or the named actions button for row operations.
- The post exists but is not in the current result set:
  check whether it is filtered out by status or author.
- You created a post but did not land in the editor:
  `Open in editor after create` was likely disabled.
- The generated slug is not what you want:
  correct it in the drawer before clicking `Create Post`.
- You want to review content before publishing:
  use `Edit` and `Preview` instead of publishing directly from the list.
- You are about to delete a post only because the draft is messy:
  consider editing or duplicating first unless you are certain the post should
  be removed.

# Decision Guide

- Choose search vs filter:
  use search for known title/slug fragments; use filters for state- or
  owner-based review.
- Choose title link vs row action:
  use the title link for full editorial work; use row actions for fast
  operational actions. The surrounding row is intentionally passive.
- Choose create vs duplicate:
  create for a clean editorial shell; duplicate when you want a reusable
  structure or content pattern.
- Choose stay in list vs open editor after create:
  stay in the list when you are setting up placeholders; open the editor when
  you are ready to write immediately.
- Choose publish from list vs publish from editor:
  use the list only when you already trust the post state; use the editor when
  preview, revisions, and content checks still matter.

# Checklist

1. Confirm you are working on the correct post row.
2. Confirm the title and slug are correct.
3. Confirm the status badge matches your expectation.
4. If creating a post, confirm `Post title`, `Slug`, and `Open in editor after
   create` before submission.
5. If the post is moving toward release, open it in the editor next and verify
   preview, revisions, and publish state there.

# Security

- Posts List is an authenticated admin surface and should only be used by
  signed-in users with the appropriate editorial permissions.
- `Preview`, `Publish`, `Unpublish`, and `Delete` have runtime consequences and
  should be treated as operational actions.
- `Delete` is destructive and should not be used casually as a cleanup shortcut.
- Post slugs affect public-facing routes, so route mistakes become user-facing
  mistakes once a post is published.
