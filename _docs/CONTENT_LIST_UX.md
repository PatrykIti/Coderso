# Content List UX (v1)

Opisuje UX listy wpisow (Entry List) w panelu admina.

## Cele

- Latwe filtrowanie wpisow po typie, statusie i autorze.
- WordPress‑like bulk actions z potwierdzeniem usuwania.
- Czytelny podglad statusu i ostatniej edycji.

## Filtry

- Basic: Search (tytul, slug) i Status (All, Published, Draft, Scheduled,
  Archived).
- Advanced: Type (content type), Author (lista autorow z widocznych wpisow),
  Updated from, Updated to.

## Bulk actions

Gdy zaznaczysz wpisy na liscie:
- pojawia sie panel akcji zbiorczych,
- dostepne akcje: Publish, Move to Draft, Archive, Delete,
- Delete wymaga potwierdzenia,
- po akcji lista odswieza sie automatycznie.

## Zachowanie

- Entries first screen pokazuje jeden all-entries table read model z kolumna
  `Content Type`.
- Zaznaczenie dotyczy wpisow widocznych po filtrach i na aktualnej stronie
  paginacji. Bulk execution przenosi `id` razem z `contentType.slug`, bez
  globalnego `activeSlug`.

## Shared List Action Toasts

- Pages, Posts, Menus, Content Types, Entries, and Custom Screens emit the
  shared top-right Admin UI toast after list-owned create, publish,
  unpublish/draft, archive, activate, move-to-draft, and delete mutations
  complete.
- Delete toasts are emitted only after the shared confirmation dialog is
  confirmed and the delete mutation settles. Opening or cancelling the
  confirmation dialog does not emit a floating toast.
- List screens use `core/admin/ui/shared/listActionToasts.ts` for success,
  error, and bulk result copy. Resource components pass labels/action copy and
  keep owning mutations, cache refresh, selection cleanup, navigation, and
  inline partial-failure alerts.
- Reusable create drawers/dialogs keep local validation inline-only. Rejected
  create mutations/API failures can emit a list-scoped toast only when the list
  owner passes the adapter-backed error callback.
- Bulk partial failures remain truthful inline and in the floating toast. Content
  Types keep failed IDs selected; Pages, Posts, Menus, and Entries keep their
  existing selection cleanup behavior.
- Entries continue to use `GET /content-entries` through
  `entriesClient.listAllEntries()` for the all-entries read model, while editor
  navigation keeps the existing Entries route aliases.

## Shared Admin List Pagination

- Content Types, Pages, Posts, and Menus use one shared client-side pagination
  owner:
  - `core/admin/ui/shared/useListPagination.ts` owns page-size normalization,
    page index, clamping, range metadata, and visible-row slicing.
  - `core/admin/ui/shared/ListPaginationFooter.tsx` owns the footer UI,
    page-size selector, count copy, and `Previous` / `Next` controls.
- Lists keep their own search, filters, sort, loading state, empty state,
  resource copy, and write orchestration. They pass the filtered/sorted rows
  into the shared pagination contract.
- Default page size is `10`.
- Page-size options are `10`, `20`, `30`, `50`, `100`, `150`, `200`, and
  `500`.
- Footer copy is based on the filtered set, for example
  `Showing 1-10 of 42 pages`; empty lists render truthful zero-state copy.
- Search, status filters, resource-specific filters, and sorting happen before
  pagination.
- Filter, sort, and page-size changes reset or clamp the page index so the
  footer never points to an empty hidden page.
- Header selection consumers select only the current paginated visible rows.
  Hidden rows from other pages are trimmed from selection before bulk actions
  can mutate them.

## Entries parity

- Entries list uses the same `AdminShell`, `PageHeader`, centered list width,
  inline selected-row bulk actions, and shared pagination footer as Pages,
  Posts, Menus, and Content Types.
- Entries no longer starts from a left content-type sidebar or a single active
  type. The first screen reads `GET /content-entries`, filters client-side, and
  keeps the existing type-scoped editor route for row navigation.
- The `Content Type` column links each row back to the owning Engine editor via
  shared admin navigation.
- Row delete and bulk delete use the shared app confirmation dialog, not native
  `window.confirm()`.
- Row duplicate is a real Entries mutation. It creates a draft clone, refreshes
  list/detail cache state, and navigates feedback through the shared toast
  surface.

## Posts list

- Posts korzysta z tego samego wzorca filtrowania i bulk actions co inne listy
  admina, ale z resource-specific copy:
  - search placeholder: `Search posts by title...`
  - accessible search label: `Search posts by title`
- Checkbox w naglowku zaznacza tylko aktualnie widoczne wiersze po filtrach.
- Toolbar bulk actions pojawia sie dopiero po zaznaczeniu co najmniej jednego
  posta, jest renderowany inline w header actions obok `New`, i obsluguje:
  - Publish
  - Move to Draft
  - Delete
- Po bulk action selection jest czyszczone, lista odswiezana, a wynik surfacowany
  jako success lub partial-failure message.
- Stopka listy korzysta ze wspolnego kontraktu paginacji, pokazuje zakres
  widocznych postow wzgledem przefiltrowanej listy i obsluguje prawdziwe
  `Previous` / `Next`.

## Pages parity

- Pages list follows the same visible-scope bulk-selection rule as Entries.
- Bulk actions on Pages cover `Publish`, `Unpublish`, and `Delete`.
- Destructive bulk delete requires confirmation and the list refreshes after the
  apply path completes.
- Pages renders bulk actions inline in the page header actions, immediately to
  the left of `New`, so selecting rows does not insert a new row above the table.
- Pages list rows keep real author identity from authoritative list payloads;
  detail or mutation payloads that do not resolve `author` must not overwrite
  cached list author state.
- Pages list uses the shared admin pagination footer after filtering and keeps
  header selection scoped to the current visible page.

## Content Types parity

- Content Types use the same shared pagination footer as Pages, Posts, and
  Menus after search, status filtering, and table sorting.
- The Content Types table receives only the current visible paginated rows.
- Header selection applies only to the current visible page. Page, filter, sort,
  and page-size changes trim hidden IDs from selection.
- Bulk controls render inline in the header actions area beside `New` and
  support:
  - Publish,
  - Move to Draft,
  - Delete.
- Bulk publish and draft reuse the existing content type update client contract.
- Bulk delete reuses the existing content type delete client contract and the
  existing service guards; guarded failures are reported as partial-failure
  copy instead of being hidden.
- Destructive row and bulk delete use the shared Admin UI confirmation dialog.

## Custom Screens parity

- Custom Screens list follows the Pages first-screen pattern: `AdminShell`,
  `PageHeader`, compact `New`, filter strip, table card, inline selected-row
  bulk controls, and shared pagination footer.
- Filters are Custom Screens-specific:
  - search by screen name, sidebar label, content-type label, or
    `contentTypeId`,
  - status: `All`, `Active`, `Draft`,
  - content type: fetched labels plus stable missing-`contentTypeId` fallback
    options for legacy or deleted content types.
- Rows keep Custom Screens domain columns and routes:
  - `Screen` links to `/admin/coderso/custom-screens/:id`,
  - `Records` links to `/admin/coderso/custom-screens/:id/entries`,
  - columns show active/draft status, content type, capability mode, derived
    sidebar shortcut state, and updated date.
- Sidebar shortcut display is derived, not persisted:
  - active + shortcut-enabled -> `Visible`,
  - draft + shortcut-enabled -> `Configured after activation`,
  - otherwise -> `Not shown`.
- Row actions are limited to `Records`, `Edit`, `Activate` or `Move to draft`,
  and `Delete`. Preview and duplicate remain absent until a dedicated Custom
  Screens service/API contract exists.
- `New` opens a list-owned create drawer for the existing create schema fields:
  name, `contentTypeId`, status, optional sidebar shortcut, and empty
  `blocks`/`bindings`. The drawer blocks submit until a fetched content type is
  selected and links admins to Engine when no content type exists.
- `customScreens.openAfterCreate` persists the drawer preference separately
  from Pages while defaulting to opening the builder after create.
- Row delete and bulk delete require `ConfirmActionDialog`; delete mutations do
  not run from the dropdown or bulk select directly.
- Bulk actions operate only on currently visible selected rows and support:
  - Activate,
  - Move to draft,
  - Delete.

## Forms parity

- Forms list follows the Pages first-screen pattern at canonical route
  `/admin/coderso/forms`: `AdminShell`, `PageHeader`, compact `New`, filter
  strip, table card, inline selected-row bulk controls, shared pagination
  footer, token-backed confirmations, and shared list-action toasts.
- `/admin/forms` remains a legacy alias through shared admin path helpers; new
  list/editor/action-log links use `/admin/coderso/forms`.
- Filters are Forms-specific:
  - search by form name, slug, or description,
  - status: `All`, `Published`, `Draft`, `Archived`,
  - access: `All`, `Public`, `Internal`.
- Rows keep Forms domain columns and routes:
  - `Form` links to `/admin/coderso/forms/:id`,
  - `Action logs` opens `/admin/coderso/forms/:id/action-runs`,
  - columns show status, submission access, and updated date.
- Row actions are limited to `Edit`, `Action logs`, `Publish`,
  `Move to draft`, `Archive`, and `Delete`. Duplicate, Runtime Preview, and
  Embed Code remain absent until separate Forms service/API/UI contracts exist.
- `New` opens the list-owned create drawer for the list fields only: name,
  optional slug, status, and description. Builder-owned fields such as
  `submissionAccess`, success behavior, and settings stay in the builder/client
  contract rather than drawer UI state.
- `forms.openAfterCreate` persists the drawer preference separately from Pages
  and Custom Screens while defaulting to opening the builder after create.
- Row delete and bulk delete require `ConfirmActionDialog`; delete mutations do
  not run from a dropdown or bulk select directly.
- Bulk actions operate only on currently visible selected rows and support:
  - Publish,
  - Move to draft,
  - Archive,
  - Delete.
- Forms with retained submissions or action diagnostics return a stable
  `form_delete_restricted` conflict on hard delete; the list keeps the row
  recoverable and Archive remains the safe retained-history lifecycle action.

## Listings parity

- Listings list follows the Pages first-screen pattern at
  `/admin/coderso/listings` while preserving two tab-scoped resources:
  `Queries` and `Templates`.
- The header `New` action is active-tab scoped:
  - Queries navigates to `/admin/coderso/listings/new` through the shared admin
    router.
  - Templates opens the controlled listing-template create dialog.
- Filters are Listings-specific:
  - Queries search by name/description and filter by source.
  - Templates search by name/slug/description and filter by layout.
- Query and template tables use checkbox selection, selected-row styling,
  row-owned Edit/Delete actions, and shared pagination. Selection is trimmed to
  the current visible page, so hidden rows from inactive tabs, filters, or other
  pages are never submitted to bulk actions.
- Bulk actions render inline in the header actions beside `New` and support
  confirmed Delete only. Listings has no lifecycle statuses, so Publish,
  Archive, Preview, Duplicate, and View Usages remain follow-up work.
- Row and bulk delete require `ConfirmActionDialog`; delete mutations do not run
  from row menus or bulk controls directly.
- Query create/update, template create/update, row delete, and bulk delete use
  shared list-action toast adapters with resource-specific copy for `listing
  query` / `listing queries` and `listing template` / `listing templates`.
- Template create/edit form draft state stays inside the controlled dialog, but
  template list rows, selection, delete confirmations, and bulk metadata are
  owned by the list shell.

## Menus parity

- Menus list follows the Pages/Posts list layout: header action area, filter
  strip, controlled table selection, selected-row styling, right-aligned
  three-dot row actions, and list footer.
- The Menus create trigger is labeled `New`; there is no primary `Refresh`
  button in the list header.
- Filters are Menus-specific:
  - search by menu name or location,
  - status: `All`, `Published`, `Draft`,
  - location: `All locations`, concrete existing locations, and `Not assigned`.
- Checkbox selection applies only to the currently visible filtered rows.
  Hidden filtered-out rows are trimmed from selection.
- Bulk actions render inline in the header actions beside `New` and support:
  - Publish,
  - Move to Draft,
  - Delete.
- Destructive row and bulk delete require confirmation; successful row/bulk
  lifecycle actions refresh the list and clear selection where applicable.
- Menus persist whole-menu lifecycle state via `draft` / `published`.
  Existing menus migrate as `published` so public navigation does not disappear;
  new menus default to `draft`.
- Menus list uses the shared admin pagination footer after filtering and keeps
  header selection scoped to the current visible page.
