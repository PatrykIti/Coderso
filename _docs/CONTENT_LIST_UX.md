# Content List UX (v1)

Opisuje UX listy wpisow (Entry List) w panelu admina.

## Cele

- Latwe filtrowanie wpisow po typie, statusie i autorze.
- WordPress‑like bulk actions z potwierdzeniem usuwania.
- Czytelny podglad statusu i ostatniej edycji.

## Filtry

- Search (tytul, slug)
- Status (All, Published, Draft, Scheduled, Archived)
- Author (lista autorow z widocznych wpisow)
- Type (content type)

## Bulk actions

Gdy zaznaczysz wpisy na liscie:
- pojawia sie panel akcji zbiorczych,
- dostepne akcje: Publish, Move to Draft, Archive, Delete,
- Delete wymaga potwierdzenia,
- po akcji lista odswieza sie automatycznie.

## Zachowanie

- Zaznaczenie dotyczy wpisow widocznych po filtrach.
- W widoku grid selection jest czyszczone, aby uniknac ukrytych zaznaczen.

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
- Stopka listy pokazuje liczbe widocznych postow wzgledem pelnej listy oraz
  zachowuje ten sam uklad `Previous` / `Next` co Pages i Menus.

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
