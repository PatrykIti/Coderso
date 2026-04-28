# Raport UX/QA — sekcja Engine / Content Types (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/engine
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Lista content types — tabela Name / Slug / Fields / Status / Actions
- Tworzenie nowego content type ("Article") — dialog z Name + Slug
- Autogeneracja sluga z nazwy + blokada po ręcznej edycji
- Edytor content type — 3-panelowy layout (Fields / Settings / Schema Preview)
- Dodawanie pól — wszystkie 7 typów: Text, Rich text, Number, Boolean, Select, Media, Relation
- Konfiguracja pól: Label, Field name (kebab-case), Required, Default value, Help text
- Layout & grouping: Tab, Section, Width, Display density
- Taxonomies: Categories switch, Tags switch
- Schema Preview live-update i "Copy" button
- "Hide preview" toggle
- Save draft i Publish
- Remove field
- Wyszukiwarka pól w lewym panelu
- Relation: "Allow multiple" + dropdown content types
- Media: Accepted file types (MIME) + "Allow multiple"
- Select: "Options (comma separated)"
- Istniejący Post type (5 pól): content, excerpt, document, featured, featuredImage

---

## Stan danych — istniejące typy

| Problem | Liczba |
|---|---|
| Łączna liczba content types | **35** |
| Zduplikowane nazwy "News" | 4 |
| Zduplikowane nazwy "Notes" | 3 |
| Typy "Screen [UUID]" z UUID w nazwie | ~15 |
| Typy testowe (testowy, testowy2, test3) | 3 |
| "Legacy Service Type" | 1 |

---

## Bugi

### [BUG-1] KRYTYCZNY: Brak możliwości usunięcia content type

**Gdzie:** Lista content types (kolumna Actions) + edytor content type

**Co się dzieje:** Kolumna "Actions" na liście zawiera wyłącznie link "Edit". Wewnątrz edytora brak sekcji "Danger zone" ani żadnego przycisku usunięcia całego content type. Nie można usunąć istniejących typów — w tym typów testowych, zduplikowanych i z UUID w nazwie.

**Kierunek naprawy UI:** Dodać opcję usunięcia w dwóch miejscach: (1) przycisk "Delete type" w edytorze (np. w sekcji "Danger zone" na końcu strony, z wyraźnym ostrzeżeniem że usuwa się schemat i może wpływać na istniejące wpisy), (2) opcjonalnie: "..." menu w kolumnie Actions na liście z opcjami Edit / Duplicate / Delete.

---

### [BUG-2] KRYTYCZNY: Duplikaty content types z identyczną nazwą

**Gdzie:** Lista content types

**Co się dzieje:** W liście istnieje 4× "News" i 3× "Notes" z różnymi slug-ami (UUID-based). W dropdownie Relation type pojawia się np. trzy razy "News" bez rozróżnienia. Użytkownik nie może stwierdzić który "News" jest właściwy.

**Kierunek naprawy UI:** Zabezpieczyć formularz tworzenia przed duplikatami nazw (walidacja "Ta nazwa jest już zajęta"). W dropdownie Relation — pokazywać slug obok nazwy: `News (news-855f...)`, `News (news-463f...)`. Docelowo: pozwolić na porządkowanie listy (usuwanie zduplikowanych).

---

### [BUG-3] ŚREDNI: Brak feedbacku po "Save draft" i "Publish"

**Gdzie:** Edytor content type → przyciski Save draft i Publish

**Co się dzieje:** Po kliknięciu "Save draft" jedynym sygnałem jest zniknięcie alertu "Unsaved changes". Po "Publish" — żaden sygnał. Brak toast, brak zmiany etykiety przycisku, brak badge statusu. Identyczny problem jak w Pages i Posts.

**Kierunek naprawy UI:** Toast "Draft zapisany" / "Opublikowano" po każdej akcji zapisu. Publish powinien zmieniać badge statusu na "published" widoczny przy nazwie typu.

---

### [BUG-4] ŚREDNI: Remove field bez potwierdzenia

**Gdzie:** Edytor content type → "Field settings" → przycisk "Remove field"

**Co się dzieje:** Kliknięcie "Remove field" natychmiast usuwa pole bez żadnego potwierdzenia dialogu. Usunięcie pola może wpłynąć na istniejące wpisy — jest to operacja nieodwracalna (wymaga ręcznego dodania pola z powrotem).

**Kierunek naprawy UI:** Dialog potwierdzenia: "Usunięcie pola [nazwa] może wpłynąć na istniejące wpisy. Czy chcesz kontynuować?" z przyciskami "Usuń" (czerwony) i "Anuluj". Opcjonalnie: soft-delete z możliwością cofnięcia przez 5 sekund (undo toast).

---

### [BUG-5] ŚREDNI: Field name (key) nie autogeneruje się z Label

**Gdzie:** Edytor content type → Field settings → pola "Field name (kebab-case)" i "Label"

**Co się dzieje:** Wpisanie Label ("Title") nie aktualizuje Field name klucza (pozostaje "field-1", "field-2"). Użytkownik musi ręcznie zmienić klucz. Dla kontrastu: slug content type autogeneruje się poprawnie z nazwy. Niespójność w obrębie tego samego formularza.

**Kierunek naprawy UI:** Przy tworzeniu nowego pola — gdy użytkownik wpisze Label, Field name (key) powinien automatycznie generować się jako kebab-case Label (np. "Featured Image" → "featured-image"). Po ręcznej edycji klucza — zablokować autogenerowanie (tak samo jak działa slug content type).

---

### [BUG-6] NISKI: Tworzenie collection nie nawiguje do edytora

**Gdzie:** Lista content types → dialog "Create New Collection" → po kliknięciu "Create Collection"

**Co się dzieje:** Po utworzeniu nowego content type dialog zamyka się, ale użytkownik pozostaje na liście. Nie ma automatycznego przejścia do edytora nowo utworzonego typu, ani żadnego toast "Collection created". Użytkownik musi samodzielnie odnaleźć nowy typ na liście i kliknąć Edit.

**Kierunek naprawy UI:** Po utworzeniu collection — automatyczne przekierowanie do edytora `/admin/coderso/engine/[new-id]` z toast "Kolekcja 'Article' utworzona. Dodaj pierwsze pole." Wzorzec: Strapi, Contentful.

---

### [BUG-7] NISKI: "Screen [UUID]" — content types z UUID w nazwie

**Gdzie:** Lista content types — ~15 typów o nazwie "Screen [UUID]"

**Co się dzieje:** Wiele content types zostało auto-wygenerowanych z UUID jako częścią nazwy (np. "Screen 2dcaeaad", "Screen d4d0bb4d"). Wskazuje na brak walidacji nazwy przy auto-generowaniu lub błąd w procesie tworzenia screen-types. Wszystkie mają 0 pól i status "published".

**Kierunek naprawy UI:** Docelowo — możliwość masowego usunięcia / archiwizacji. Krótkoterminowo: walidacja przy tworzeniu nie dopuszczająca UUID-based nazw lub auto-generacja czytelnych nazw (np. "Screen 1", "Screen 2").

---

## Problemy UX

### [UX-1] Lista 35 content types bez wyszukiwarki ani filtrów

**Gdzie:** /admin/coderso/engine — główna lista

**Problem:** 35 typów wyświetlane w jednej tabeli bez możliwości filtrowania po statusie, przeszukiwania po nazwie, sortowania po kolumnach. Przy rosnącej liczbie typów lista staje się niemożliwa do zarządzania.

**Kierunek naprawy UI:** Dodać search bar nad tabelą (filtrowanie po Name/Slug w czasie rzeczywistym) + sortowanie po kliknięciu nagłówków kolumn + opcjonalnie filter Status (draft/published).

---

### [UX-2] Relacja w dropdownie pokazuje zduplikowane nazwy bez kontekstu

**Gdzie:** Edytor pola → Field type "Relation" → dropdown "Related content type"

**Problem:** Dropdown zawiera np. troje "News" i dwa "Notes" — niemożliwe do odróżnienia. Użytkownik nie wie który wybrać. Dodatkowo "Screen [UUID]" typy zaśmiecają dropdown.

**Kierunek naprawy UI:** W dropdownzie Relation pokazywać slug obok nazwy (jako subtitle lub badge), np. `News` + `news-855f2ed1`. Pozwala jednoznacznie zidentyfikować właściwy typ.

---

### [UX-3] Select field: "Options (comma separated)" — prymitywny UX

**Gdzie:** Edytor pola → Field type "Select"

**Problem:** Opcje definiowane jako tekst rozdzielony przecinkiem (np. `published,draft,archived`). Brak: indywidualnych pól per opcja, obsługi wartość vs etykieta (np. "Published" → "published"), możliwości zmiany kolejności, multi-select wariantu.

**Kierunek naprawy UI:** Zastąpić pole tekstowe dynamiczną listą par Label + Value z przyciskiem "Add option". Drag-to-reorder opcji. Dodatkowy przełącznik "Multi-select" (allow multiple selected values). Wzorzec: Strapi, Directus.

---

### [UX-4] Number field bez walidacji min/max i formatu

**Gdzie:** Edytor pola → Field type "Number"

**Problem:** Typ Number nie oferuje żadnych dodatkowych opcji — brak walidacji min/max, brak rozróżnienia integer/decimal, brak "step" (np. 0.01 dla cen). Editor wygląda identycznie jak Text.

**Kierunek naprawy UI:** Dla Number dodać: Min value, Max value, Format (Integer / Decimal), Step. Te opcje mapują się na JSON Schema `minimum`, `maximum`, `multipleOf`.

---

### [UX-5] Label field nie jest pre-filled czytelną wartością dla istniejących pól

**Gdzie:** Post content type → pole "featuredImage" → Label

**Problem:** Istniejące pole "featuredImage" ma Label ustawiony na "featuredImage" (identyczne z kluczem). Powinno być "Featured Image" (human-readable). Wskazuje że Label nie był wypełniany przy tworzeniu lub nie ma auto-formatowania.

**Kierunek naprawy UI:** Przy generowaniu Label z klucza — stosować Title Case i zamianę myślników na spacje: `featured-image` → `Featured Image`. To przynajmniej jako wartość startowa którą użytkownik może edytować.

---

### [UX-6] Brak opcji "Duplicate content type"

**Gdzie:** Lista content types, edytor

**Problem:** Nie ma możliwości zduplikowania istniejącego content type. Tworzenie podobnych schematów (np. "Article" i "Newsletter" z identyczną bazą pól) wymaga ręcznego odtwarzania wszystkich pól od zera.

**Kierunek naprawy UI:** Opcja "Duplicate" w kolumnie Actions lub w edytorze. Duplikat tworzy nowy typ z nazwą "Copy of [oryginał]" i identyczną strukturą pól — bez wpisów.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| 3-panelowy layout edytora (Fields / Settings / Schema Preview) | Przemyślany, profesjonalny UX |
| Schema Preview live-update w JSON przy każdej zmianie | Przydatne dla deweloperów |
| Autogeneracja sluga z nazwy + blokada po ręcznej edycji | Poprawne zachowanie |
| Taxonomies: Categories + Tags toggle per content type | Elastyczna konfiguracja |
| Relation: "Allow multiple" switch | Obsługuje one-to-one i one-to-many |
| Media: Accepted file types (MIME) + "Allow multiple" | Granularna konfiguracja |
| Layout & grouping (Tab, Section, Width, Display density) | Zaawansowane — pozwala strukturyzować Entry editor |
| "Field type help" przycisk przy Field type | Kontekstowa pomoc |
| Wyszukiwarka pól w lewym panelu | Przydatna przy wielu polach |
| Alert "Unsaved changes" + znikanie po Save | Poprawny sygnał stanu |
| "Hide preview" toggle — ukrywa Schema Preview | Więcej miejsca na edycję |
| Required switch aktualizuje JSON Schema `required[]` | Poprawna implementacja |
| Kebab-case walidacja z pomocą ikony | Wskazówka przy polu Field name |
| "Copy" na Schema Preview | Wygodne kopiowanie do dokumentacji/kodu |

---

## Screenshoty

- `engine-list.png` — pełna lista 35 content types
- `create-collection-dialog.png` — dialog tworzenia "Create New Collection"
- `content-type-editor-empty.png` — edytor 3-panelowy z pustymi polami
- `editor-two-fields.png` — edytor po dodaniu 2 pól (title + field-2), schema live
- `content-types-list-full.png` — lista po dodaniu "Article"

---

## TASK-202 closure — 2026-04-23

TASK-202 zamyka wszystkie elementy z tego raportu przez istniejace kontrakty
Engine/content types, bez drugiego schema buildera ani osobnego klienta admina.

| Finding | Status | Dowod zamkniecia |
|---|---|---|
| BUG-1 Delete content type | Fixed | `typeService.deleteContentType` blokuje entries, custom screens, taxonomie, content routes i listings; lista i edytor maja potwierdzenia delete oraz cache invalidation. |
| BUG-2 Duplikaty nazw | Fixed for future writes | `typeService` waliduje unikalna nazwe/slug przy create/update/duplicate; lista pokazuje duplicate badge, a relation dropdown pokazuje `Name (slug)`. Istniejace brudne rekordy nie sa usuwane automatycznie. |
| BUG-3 Brak feedbacku save/publish | Fixed | Save draft i Publish uzywaja shared admin toastera i aktualizuja realny status badge. |
| BUG-4 Remove field bez potwierdzenia | Fixed | Remove field otwiera dialog potwierdzenia, a lokalnie usuniete pole mozna cofnac przed zapisem. |
| BUG-5 Field name nie generuje sie z Label | Fixed | Nowe pola maja `keyAuto`; etykieta generuje kebab-case key do momentu recznej edycji key. |
| BUG-6 Create nie nawiguje do edytora | Fixed | Create drawer waliduje duplikaty, tworzy draft, pokazuje toast i przechodzi do edytora nowego typu. |
| BUG-7 `Screen <uuid>` typy | Guarded | Shared content type name normalization odrzuca nowe nazwy `Screen <uuid>`; solution-kit writer i assistant path ida przez ten sam kontrakt. Existing-record cleanup zostaje poza TASK-202. |
| UX-1 Lista bez search/filter/sort | Fixed | Engine list ma search po name/slug, sortable headers i filtr `draft` / `published`. |
| UX-2 Relation bez kontekstu | Fixed | Relation target selector pokazuje nazwe i slug. |
| UX-3 Select comma-separated | Fixed | Select ma wiersze Label/Value, add/remove/reorder i multi-select schema contract. Legacy `string[]` options sa nadal odczytywane. |
| UX-4 Number bez min/max/format/step | Fixed | Number field zapisuje format integer/decimal, min/max i step do JSON Schema. |
| UX-5 Machine-readable label | Fixed | `fieldsFromSchema` humanizuje label, gdy zapisany title byl identyczny z technicznym kluczem. |
| UX-6 Brak Duplicate | Fixed | Duplicate jest dostepne z listy i edytora, kopiuje schema-only i tworzy draft z unikalna nazwa/slug. |

Validation wykonane dla TASK-202:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `vitest run` dla content types client/table/editor/schema mapping/field renderer/integration suites
- `bun test tests/integration/routes/contentTypes.test.ts tests/unit/content/typeService.test.ts tests/unit/content/validation.test.ts tests/unit/assistant/actionExecutorService.test.ts`
- `bun test tests/unit/kits/installService.test.ts tests/unit/kits/schema.test.ts`

DB-backed suites w tej sesji pominely przypadki wymagajace polaczenia z DB
(`DATABASE_URL` byl ustawiony, ale testowy `canConnect()` nie przeszedl), wiec
biezacy runtime inventory brudnych content types nie zostal ponownie przeliczony.
