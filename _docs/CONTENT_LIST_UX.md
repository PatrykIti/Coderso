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

- Pages, Posts, Menus, Content Types, and Entries emit the shared top-right
  Admin UI toast after list-owned create, publish, unpublish/draft, archive,
  and delete mutations complete.
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
