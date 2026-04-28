---
title: "Post Editor, Preview, Revisions, and Editor Settings"
audience: "editor"
productArea: "coderso-posts"
language: "en"
keywords:
  - post editor
  - preview
  - revisions
  - editor settings
  - block editor
  - publishing
---

# Basic

Post Editor is the main writing workspace for Posts. It combines a block-based
editor canvas, outline and list-view tools, post and block details, runtime
preview, revision recovery, and editor preferences.

In the current UI, the block editor is organized into three main working areas:
- left:
  document overview with `Outline` and `List view`
- center:
  writing canvas and block content
- right:
  `Post` and `Block` details, publishing metadata, taxonomy, featured image,
  advanced fields, and danger zone

The top action bar exposes the main workflow actions:
- `Preview`
- `Publish`
- `Add block`
- `Outline`
- `Details`
- `Focus`
- `Revisions`
- `Editor settings` via the gear action

# Medium

Use Post Editor when you are writing, restructuring, reviewing, or publishing
one article. This is not just a metadata form; it is the daily editorial
workspace where content quality, structure, hierarchy, and release readiness are
checked together.

The editor is easiest to understand as six connected workflows:
- writing workflow:
  edit the content blocks in the main canvas
- structure workflow:
  review hierarchy in `Outline` or reorder by using list-based navigation
- formatting workflow:
  use the inline text toolbar for type, text style, list, and code controls
- publishing workflow:
  inspect post-level data in the `Post` details tab and publish from the top bar
- preview workflow:
  open read-only runtime preview for the current draft
- recovery workflow:
  use `Revisions` to restore earlier snapshots

The shell also communicates editorial state directly:
- breadcrumb path back to `Posts`
- current status such as `Draft`
- autosave status such as `Autosaved at ...`
- outline warnings such as heading hierarchy issues

# Instruction

1. Open a post from the Posts list.
2. Before editing, orient yourself:
   - confirm the post title in the breadcrumb,
   - confirm the current status (`Draft` or published state),
   - check the autosave indicator,
   - check whether the outline already reports warnings.
3. Start with the left overview panel.
   Use:
   - `Outline` to inspect heading structure and warnings,
   - `List view` when you need a more block-oriented overview.
4. If the outline shows warnings, review them before publishing.
   In the current UI, heading hierarchy warnings are surfaced directly in the
   outline area.
5. Use `Add block` when you need to insert more content.
6. Work in the main canvas block by block.
   The current post shown in the local UI contains examples such as:
   - section/callout-like content,
   - paragraphs,
   - heading,
   - list,
   - quote,
   - code,
   - image,
   - CTA block,
   - embed block.
7. Use the inline text toolbar for writing controls such as:
   - `Type`
   - `Text`
   - `List`
   - `Code`
   - typography family and size
   - `More formatting`
8. Open `Details` when you need the right-side inspector.
9. In the right inspector, use the `Post` tab for article-level data:
   - publishing status,
   - last updated / published / scheduled values,
   - categories and tags,
   - featured image,
   - advanced fields,
   - danger zone.
10. Use the `Block` tab when you need settings for one selected block rather
    than the whole article.
11. Open `Preview` when you want the runtime version of the current draft.
    The preview opens as a read-only runtime dialog, not as an editable canvas.
12. Use `Revisions` when you need to inspect or restore previous snapshots.
    Each entry shows:
    - version number,
    - timestamp,
    - author,
    - block count,
    - `Restore`
13. Open `Editor settings` when you want to tune how the editor behaves for
    you personally rather than changing post content.
14. In `Editor settings`, review the sections in order:
    - `Startup`
    - `Panels and density`
    - `Guidance`
15. In `Startup`, decide:
    - `Open in focus mode`
    - `Restore panel state`
    - `Default inspector tab`
16. In `Panels and density`, decide:
    - `Compact side panels`
    - `Editor density`
17. In `Guidance`, decide:
    - `Show outline hints`
    - `Show keyboard hints`
18. Use `Publish` only after:
    - outline warnings are understood or resolved,
    - content blocks are correct,
    - post-level metadata is correct,
    - runtime preview looks acceptable,
    - you are comfortable with the available revision state.

Use this safe working order when you want the lowest chance of editorial
mistakes:
1. Review outline warnings.
2. Edit the content blocks.
3. Review the `Post` tab in the right inspector.
4. Check runtime preview.
5. Open `Revisions` if recovery context matters.
6. Publish.

# Advanced

- Treat the outline as an editorial QA tool, not just navigation. Heading
  warnings are an early signal that the article structure may confuse readers or
  render inconsistently.
- Separate `Post` concerns from `Block` concerns.
  If the change affects publication, taxonomy, featured image, or danger-zone
  actions, stay in the `Post` tab. If the change affects one content block, use
  the `Block` tab.
- `Focus` mode is useful for uninterrupted writing, but it should not replace
  structured review. Switch back to overview and details before release.
- Runtime preview validates the rendered draft, not your editing comfort. Use it
  near publishing time, not as a substitute for basic writing review.
- Revisions are especially valuable for long or high-risk editorial work because
  the drawer exposes version number, author, timestamp, and block count for each
  restore point.
- Editor settings are user-preference controls. They shape your working
  environment, not the published article itself.
- The editor also supports a classic mode in the broader product contract, but
  the currently active local workflow is the block editor shell.

# Troubleshooting

- The outline reports heading issues:
  review your heading order before publishing instead of ignoring the warning.
- The content area feels too cramped:
  open `Editor settings` and review `Compact side panels`, `Editor density`, and
  `Open in focus mode`.
- You cannot find a previous version:
  open `Revisions` and use version number, author, timestamp, and block count to
  locate the right snapshot.
- Preview looks wrong:
  confirm you are checking the runtime preview, not the editable canvas, and
  validate the latest draft state before publishing.
- You changed the wrong thing in the inspector:
  verify whether you are on the `Post` tab or the `Block` tab.
- An old revision looks safer than the current draft:
  use `Revisions` instead of manually trying to reconstruct prior block states.
- The editor behavior feels inconsistent between sessions:
  check whether `Restore panel state` is enabled in `Editor settings`.

# Decision Guide

- Choose `Outline` vs `List view`:
  use `Outline` for heading structure and editorial hierarchy; use `List view`
  when thinking in block order and layout units.
- Choose `Post` vs `Block` details:
  use `Post` for article-level settings and publish data; use `Block` for one
  selected content block.
- Choose `Preview` vs staying in canvas:
  use canvas to edit; use preview to validate the rendered draft.
- Choose `Focus` mode vs full layout:
  use focus mode for uninterrupted writing; return to the full layout for
  structure, metadata, and release review.
- Choose `Revisions` vs manual rollback:
  use revisions when you need a reliable earlier snapshot instead of recreating
  content by hand.
- Choose changing editor settings vs changing post content:
  editor settings change your workspace behavior; they do not change the post
  itself.

# Checklist

1. Confirm you opened the correct post.
2. Confirm the status and autosave indicator.
3. Review outline warnings.
4. Edit the required blocks in the canvas.
5. Review the `Post` inspector tab for publication metadata, taxonomy, and
   featured image.
6. Open runtime preview and confirm the rendered result.
7. Open revisions if recovery confidence matters before release.
8. Publish only when content, structure, and runtime rendering are acceptable.

# Security

- Post Editor is an authenticated admin surface and should only be used by
  signed-in users with the appropriate editorial permissions.
- Runtime preview uses a generated preview URL with a tokenized preview session.
  Treat preview links as sensitive operational artifacts.
- Publishing changes the public-facing article state. Preview and autosave do
  not.
- The danger zone includes `Move to trash`, which is destructive and should be
  treated carefully.
- Avoid placing internal-only notes, operational secrets, or unsafe embed/link
  targets into publishable post content.
