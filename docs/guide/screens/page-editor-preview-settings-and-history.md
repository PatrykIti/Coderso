---
title: "Page Editor, Runtime Preview, Settings, and History"
audience: "editor"
productArea: "pages"
language: "en"
keywords:
  - page editor
  - runtime preview
  - page settings
  - page history
  - page revisions
  - widgets
---

# Basic

Page Editor is the workspace where you build and maintain one page. It combines
an insert library, an editable canvas, a block details area, runtime preview,
page-wide settings, and revision/history controls.

In the shipped UI, the editor is organized into three working zones:
- left:
  library tabs for `Widgets`, `Templates`, and `Forms`
- center:
  editable page canvas
- right:
  details area for the currently selected block, or a placeholder when nothing
  is selected

The editor toolbar also exposes the page-wide actions:
- runtime preview device selection,
- `Runtime preview`,
- `Save draft`,
- `Publish`,
- `Page settings`,
- `History`.

# Medium

Use Page Editor when you already know which page you are working on and need to
shape its actual content, layout, and runtime behavior. This is the screen for
assembling page structure, not just managing list state.

Think of the editor as five connected workflows:
- library workflow:
  choose what to insert
- canvas workflow:
  place, select, and organize blocks
- details workflow:
  edit the selected block
- page-wide workflow:
  adjust title, slug, navigation, wrapper layout, and defaults in `Page
  settings`
- runtime workflow:
  validate output in `Runtime preview` and inspect past state in `History`

The breadcrumb/status strip also matters:
- `Pages / {page name}`
- status badge such as `Draft` or `Published`
- `Unsaved changes` badge when the editor state differs from the saved draft

# Instruction

1. Open a page from the Pages list.
2. Before inserting anything, orient yourself:
   - confirm the page title in the breadcrumb,
   - confirm whether the page is `Draft` or `Published`,
   - check whether `Unsaved changes` is already shown.
3. Start in the left library.
   Use the three tabs based on what you need:
   - `Widgets` for standard page sections and content blocks,
   - `Templates` for reusable prepared structures,
   - `Forms` for saved form embeds.
4. Use `Find components...` if the library is long.
5. Insert the needed block or template into the page.
6. Move your focus to the canvas:
   - select a block,
   - confirm it appears in the canvas where you expect,
   - use the canvas as the editable version of the page.
7. After selecting a block, use the right-side details area.
   If the right side says `Select a block to edit its settings`, go back and
   click a block in the canvas first.
8. Save your work early with `Save draft`.
   Do this before opening preview if you want to validate the latest draft.
9. Use the device control under `Runtime preview device` to choose desktop,
   tablet, or mobile preview mode.
10. Click `Runtime preview` to open the read-only runtime dialog.
    Use it to verify site-theme rendering, not to edit content.
11. Open `Page settings` when you need page-wide controls rather than one
    block’s settings.
12. In `Page settings`, work top to bottom:
    - confirm `Page title`,
    - confirm `Slug`,
    - choose `Template`,
    - decide `Show in navigation`,
    - set `Revisions to keep`,
    - review layout and appearance,
    - review default widget layout values.
13. In the `Layout and appearance` section, check:
    - `Page width`
    - `Max width`
    - `Section spacing`
    - `Background color`
    - `Background media URL`
14. In `Default widget layout`, check:
    - `Default container`
    - `Apply defaults to new blocks`
    - default top/bottom padding
    - default top/bottom margin
15. Click `Save settings` when the drawer values are correct.
    If you close the drawer instead, the UI can keep one settings autosave
    snapshot, but that is not the same as a published revision.
16. Open `History` when you need to inspect or restore revisions.
17. Use `Publish` only after:
    - the canvas is correct,
    - settings are correct,
    - runtime preview has been checked,
    - the public-facing route and navigation behavior are acceptable.

Use this safe working order when you want the lowest chance of mistakes:
1. Insert or edit blocks.
2. Save draft.
3. Open Page settings and review page-wide behavior.
4. Save settings.
5. Open runtime preview in the correct device mode.
6. Check History only if you need recovery or revision context.
7. Publish.

# Advanced

- Separate block work from page-wide work.
  If the change affects one content block, stay in the canvas and details area.
  If the change affects routing, navigation, wrapper behavior, or inherited
  layout defaults, use `Page settings`.
- Treat runtime preview as a final verification surface, not as the place to
  discover basic editing mistakes. Save the draft first and preview only after
  the editor state is coherent.
- `Apply defaults to new blocks` changes insertion behavior for future blocks.
  It does not magically rewrite every existing block on the page.
- Revision retention is a page-level policy. Keep it higher when the page is
  operationally sensitive or edited often, and lower when the page is stable and
  low-risk.
- A visually simple page can still have meaningful runtime behavior through its
  template, navigation visibility, wrapper width, spacing, background, and
  inherited layout defaults.
- If the canvas is empty, the page may still be valid as a shell, but preview
  can look nearly blank. That is expected until real content is inserted.
- The standalone preview flow exists, but the primary editor workflow is the
  `Runtime preview` action from inside Page Editor.

# Troubleshooting

- The right-side panel is empty:
  select a block in the canvas first.
- The canvas looks blank:
  the page may have no inserted blocks yet. Start from the left library.
- You changed something but do not see `Unsaved changes` clear:
  use `Save draft`.
- Runtime preview opens but looks empty:
  confirm the page has actual content and that you saved the draft before
  previewing.
- Runtime preview cannot be generated:
  save the resource first. The editor requires a saved page before preview can
  be generated reliably.
- Template options are still loading in Page settings:
  wait for the async options load to finish before changing the template.
- History shows `No revisions yet`:
  the page does not yet have publish revisions or settings autosaves available
  for restore/discard actions.
- You changed page-wide values but the block still looks wrong:
  verify whether the block is using inherited defaults or its own explicit
  values.

# Decision Guide

- Choose `Widgets` vs `Templates` vs `Forms`:
  use Widgets for standard page blocks, Templates for reusable prepared
  structures, and Forms for saved form embeds.
- Choose block details vs Page settings:
  use block details for one selected component; use Page settings for title,
  slug, navigation, wrapper layout, revision retention, and default layout
  values.
- Choose `Save draft` vs `Publish`:
  save draft while the page is still internal; publish when the runtime version
  should update publicly.
- Choose canvas vs runtime preview:
  use canvas for editing and selection; use runtime preview for read-only
  runtime validation with site theme rendering.
- Choose close drawer vs save settings:
  close only when an autosave snapshot is acceptable; save settings when you
  want an explicit committed page-settings update.
- Choose History vs manual re-editing:
  use History when you need revision recovery or autosave management, not when a
  simple manual correction is faster and lower risk.

# Checklist

1. Confirm you opened the correct page.
2. Confirm the page status (`Draft` or `Published`) before editing.
3. Insert or edit the necessary blocks.
4. Select critical blocks and review their details.
5. Save draft.
6. Open Page settings and confirm title, slug, template, navigation, and
   wrapper settings.
7. Save settings if you changed any page-wide values.
8. Run runtime preview in the needed device mode.
9. Check History if revision context or recovery matters for this release.
10. Publish only after the runtime result is acceptable.

# Security

- Page Editor is an authenticated admin surface and should only be used by
  users with the appropriate content/page editing permissions.
- Runtime preview uses a generated preview URL with a tokenized preview session.
  Treat preview links as sensitive operational artifacts.
- Publishing changes the public runtime state. Saving a draft does not.
- `Show in navigation` affects public discoverability, so treat it as a release
  decision rather than a cosmetic preference.
- Background media URLs, slugs, and other page-wide settings should be reviewed
  carefully because they influence public rendering, routing, or both.
