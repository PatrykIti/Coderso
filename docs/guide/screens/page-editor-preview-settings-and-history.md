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
- canvas workflow:
  place, select, and organize sections and atomic blocks
- command workflow:
  add sections or blocks from the command palette
- toolbar workflow:
  edit the selected section layout, content, style, spacing, visibility, and
  responsive overrides
- page-wide workflow:
  adjust title, slug, navigation, template, and revision policy in `Page
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
3. Use the add/command controls when you need a new section or atomic block.
4. Move your focus to the canvas:
   - select a section,
   - confirm it appears in the canvas where you expect,
   - use the canvas as the editable version of the page.
5. After selecting a section, use the floating toolbar at the bottom of the
   canvas for layout, content, style, spacing, responsive, and visibility
   controls.
6. Save your work early with `Save draft`.
   Do this before opening preview if you want to validate the latest draft.
7. Use the device control to choose desktop,
   tablet, or mobile preview mode.
8. Click `Runtime preview` to open the read-only runtime dialog.
    Use it to verify site-theme rendering, not to edit content.
9. Open `Page settings` when you need page-wide controls rather than one
   section’s controls.
10. In `Page settings`, work top to bottom:
    - confirm `Page title`,
    - confirm `Slug`,
    - choose `Template`,
    - decide `Show in navigation`,
    - set `Revisions to keep`.
11. Click `Save settings` when the drawer values are correct.
    If you close the drawer instead, the UI can keep one settings autosave
    snapshot, but that is not the same as a published revision.
12. Open `History` when you need to inspect or restore revisions.
13. Use `Publish` only after:
    - the canvas is correct,
    - settings are correct,
    - runtime preview has been checked,
    - the public-facing route and navigation behavior are acceptable.

Use this safe working order when you want the lowest chance of mistakes:
1. Insert or edit sections/blocks.
2. Save draft.
3. Open Page settings and review page-wide behavior.
4. Save settings.
5. Open runtime preview in the correct device mode.
6. Check History only if you need recovery or revision context.
7. Publish.

# Advanced

- Separate section work from page-wide work.
  If the change affects one section or atom, stay in the canvas and floating
  toolbar. If the change affects routing, navigation visibility, template, or
  revision policy, use `Page settings`.
- Treat runtime preview as a final verification surface, not as the place to
  discover basic editing mistakes. Save the draft first and preview only after
  the editor state is coherent.
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
  the v2 editor no longer uses a persistent right-side details panel; select a
  section and use the floating toolbar.
- The canvas looks blank:
  the page may have no inserted sections yet. Use the add/command controls.
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
- You changed page-wide values but the section still looks wrong:
  verify whether the section has its own explicit layout/style/spacing values.

# Decision Guide

- Choose block details vs Page settings:
  use the floating toolbar for one selected section/component; use Page settings
  for title, slug, navigation, template, and revision retention.
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
3. Insert or edit the necessary sections and blocks.
4. Select critical sections and review their floating-toolbar controls.
5. Save draft.
6. Open Page settings and confirm title, slug, template, navigation, and
   revision policy.
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
