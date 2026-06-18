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
3. If `Recover draft version` appears, decide before continuing:
   - choose `Restore draft` to load the autosaved version into the editor,
   - choose `Discard draft` to remove that autosave revision,
   - choose `Keep current` to hide the prompt for this editing session without
     deleting the autosave.
   Leaving the editor while this prompt is pending asks for confirmation; it
   does not delete the autosaved revision.
4. Use the add/command controls when you need a new section or atomic block.
   - The `Add section` button at the top of the canvas opens the command
     palette and appends the chosen section at the end of the page.
   - Hovering the gap above, between, or below sections reveals an inline
     `Add section` insertion point. It opens the same command palette, and the
     chosen section is inserted exactly at that gap instead of being appended.
5. Move your focus to the canvas:
   - select a section,
   - confirm it appears in the canvas where you expect,
   - use the canvas as the editable version of the page.
6. After selecting a section, use the floating toolbar at the bottom of the
   canvas for layout, content, style, spacing, responsive, and visibility
   controls. The toolbar names the selection by its type (`Hero`, `Text`,
   `Statistic`, `Quote`, ...), never by the text you typed into the block, so
   the label stays stable while you edit content.
   - When you select a text-bearing block (heading, text, button, quote,
     statistic, list, card), the toolbar additionally shows a `Typography`
     panel with font family, font size, font weight, line height, letter
     spacing, and text align. Font choices are site design tokens (Sans /
     Display and the token size scale), not free-form values, so pages stay
     consistent with the site theme. The panel is per-block: sections and
     non-text blocks (image, divider, spacer) do not show it.
   - Adding a form to a page: insert the `Form` block from the command
     palette, then open the `Content` panel and pick one of your saved forms
     in the searchable `Form` picker (forms are built in the Forms admin
     first). The canvas shows a non-interactive preview of the form's fields;
     the published page renders the live form with the normal submit
     protections. An optional `Title` field overrides the form name shown
     above the fields, and choosing `None` detaches the form again. If the
     picked form is later deleted, the picker marks the missing reference and
     the published page shows a safe "form not available" message instead of
     a broken form.
   - Listing collection entries on a page: insert the `Collection` block from
     the command palette, then open the `Content` panel and pick a content
     type (for example `Services` or `Projects`) in the searchable
     `Content type` picker. The canvas immediately previews the published
     entries of that type (drafts never show), and the published page renders
     the live listing. Optional refinements: a `Saved query` (only queries
     built for the picked content type appear; switching the content type
     clears the query so it never points at the wrong type), a `Limit` slider
     for how many entries to show (1 to 24 — the same bound the published page
     enforces), and a `Listing template` for the entry layout. A bound
     template also styles the listing: its column count, gap, and card
     variant (default, compact, or minimal) replace the standard grid, and
     its empty-state title and description show when no entries match. Saved
     queries and templates are built in the Listings admin first. Choosing
     `None` clears any of the three references; if a referenced resource is
     later deleted, the picker marks the missing reference and the published
     page shows a safe "collection not available" message instead of a broken
     listing. Card links need a matching content route (Site Settings →
     Content routes): when the entry type has no enabled route, cards render
     without links and show a short "links unavailable" note instead of
     pointing at pages that do not exist.
   - Paging a long listing: the same `Content` panel has a `Pagination` strip
     (`none`, `paged`, `load-more`) and a `Page size` slider (1 to 24; when
     unset, the page size follows `Limit`). `None` is the default and keeps
     the single-list render every existing page already has. `Paged` adds a
     pager line under the listing on the published page: the total result
     count ("N results"), numbered page links (long ranges collapse to
     1 … 4 5 6 … 12), and Previous/Next. `Load-more` renders a single
     "Load more" link that grows the list page by page. Page links are real
     links — they work without JavaScript and produce shareable addresses —
     and on listings bound to a saved query the pager updates the list in
     place without a full reload. The canvas preview keeps all pagination
     affordances non-interactive.
   - Letting visitors filter and sort a listing page: insert the `Filters`
     block from the command palette next to your `Collection` block, then open
     the `Content` panel and pick the SAME `Saved query` the collection block
     uses — that shared query is what connects the filter controls to the
     listed entries. Build the filter controls in the `Facets` editor: each
     facet has a kind (`Checkbox`, `Radio`, `Taxonomy`, `Range`, `Date range`,
     or `Sort`), a visitor-facing label, and the entry field it filters (any
     schema field path such as `data.rooms` — facets are fully generic, so the
     same block powers real-estate catalogs, job boards, directories, or any
     other listing). Option-backed kinds list their choices one per line as
     `value | Label`; the `Sort` kind lists sort options as `field:asc | Label`
     (with no facets configured, the block shows a generic newest/oldest sort).
     Behavior toggles cover `Auto apply` (filter on every change vs an explicit
     apply button), `Show search` (a free-text search row), and
     `Show result count` (the number of matching entries above the form); the
     `Layout` panel switches between the horizontal bar and the sidebar shape.
     The canvas shows a non-interactive preview of the facet form; on the
     published page, filtering updates the listing in place and the address
     bar, so filtered views are shareable links — and everything still works
     as a plain form submit when JavaScript is unavailable. If the saved query
     is later deleted, the published page shows a safe "filters not available"
     message instead of broken controls.
   - The `Responsive` panel is the dedicated breakpoint surface for the
     selected section or block. It contains:
     - `Hide on desktop` / `Hide on tablet` / `Hide on mobile` toggles. The
       desktop toggle changes the base visibility (smaller screens inherit
       it); the tablet and mobile toggles store per-screen overrides you can
       reset back to inheritance.
     - `Stack vertically` (sections only): forces the section content into a
       single column on the screen you are editing. Set it while editing
       Mobile to stack a multi-column section on phones only; the published
       site applies the same behavior at real viewport widths.
     - A per-field override list showing every responsive-capable field of
       the selection with its `Base` / `Override` / `Inherited` state and a
       `Reset` action next to each overridden field. On Desktop the list is
       informational because desktop is the base.
7. Save your work early with `Save draft`.
   Do this before opening preview if you want to validate the latest draft.
8. Use the device control to choose desktop,
   tablet, or mobile editing/preview mode. Each option shows its label and
   canvas width (`Desktop 1080`, `Tablet 744`, `Mobile 390`), and the floating
   toolbar shows an `Editing: …` pill so you always know which breakpoint your
   edits target. Edits made on Tablet or Mobile become overrides; Desktop edits
   change the base.
9. Click `Runtime preview` to open the read-only runtime dialog.
    Use it to verify site-theme rendering, not to edit content. The dialog
    renders the saved draft ("Runtime preview of the saved draft"); if the
    preview target is temporarily unreachable, the dialog shows a bounded
    diagnostic and a `Retry preview` button that regenerates the preview.
10. Open `Page settings` when you need page-wide controls rather than one
   section’s controls.
11. In `Page settings`, work top to bottom:
    - confirm `Page title`,
    - confirm `Slug`,
    - choose `Template`,
    - decide `Show in navigation`,
    - set `Revisions to keep`.
12. Click `Save settings` when the drawer values are correct.
    If you close the drawer instead, the UI can keep one settings autosave
    snapshot, but that is not the same as a published revision.
13. Open `History` when you need to inspect or restore revisions.
14. Use `Publish` only after:
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
- You try to leave and see a discard confirmation:
  the editor has unsaved local changes or a recoverable autosave prompt is
  pending. Cancel to keep editing, or confirm only when it is safe to leave the
  current local state.
- `Recover draft version` appears after reopening:
  a newer autosave revision exists than the saved draft currently loaded in the
  page. Restore it to continue from that autosave, discard it to remove that
  autosave revision, or keep the current draft for this session.
- Runtime preview opens but looks empty:
  confirm the page has actual content and that you saved the draft before
  previewing.
- Runtime preview cannot be generated:
  save the resource first. The editor requires a saved page before preview can
  be generated reliably.
- Runtime preview shows `Live preview unavailable`:
  the public frontend did not answer the server-side preview probe. The
  diagnostic names the target host without the preview token. Check that the
  public frontend is running and the configured public URL is correct, then use
  `Retry preview` to regenerate the preview session.
- Template options are still loading in Page settings:
  wait for the async options load to finish before changing the template.
- History shows `No revisions yet`:
  the page does not yet have publish revisions or settings autosaves available
  for restore/discard actions.
- You changed page-wide values but the section still looks wrong:
  verify whether the section has its own explicit layout/style/spacing values.
- A field will not follow your desktop edit on tablet or mobile:
  that screen has a per-field override. Open the `Responsive` panel on that
  device and use the override list `Reset` action to restore inheritance.
- A section unexpectedly renders as one column on a small screen:
  check the `Stack vertically` toggle in the `Responsive` panel for that
  screen, then the section `Columns` override.

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
