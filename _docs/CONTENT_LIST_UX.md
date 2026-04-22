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

## Pages parity

- Pages list follows the same visible-scope bulk-selection rule as Entries.
- Bulk actions on Pages cover `Publish`, `Unpublish`, and `Delete`.
- Destructive bulk delete requires confirmation and the list refreshes after the
  apply path completes.
- Pages list rows keep real author identity from authoritative list payloads;
  detail or mutation payloads that do not resolve `author` must not overwrite
  cached list author state.
