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
  posta i obsluguje:
  - Publish
  - Move to Draft
  - Delete
- Po bulk action selection jest czyszczone, lista odswiezana, a wynik surfacowany
  jako success lub partial-failure message.
