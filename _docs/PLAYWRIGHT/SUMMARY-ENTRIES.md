# Raport UX/QA — sekcja Entries (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/entries
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Lista content types w sidebarze lewym (35+ typów) + wyszukiwarka "Search types..."
- Wybór content type z sidebaru → przełączenie listy wpisów po prawej
- Tworzenie nowego entry ("My First Article") przez dialog "Create New Post"
- Edytor entry: pola Title, Slug, Content (tab), Media (tab), prawy panel sidebar
- Pola wg schematu Engine: tekst, excerpt, dokument, featured (boolean), featuredImage (media)
- Pole richtext z Engine — zachowanie w edytorze entry
- Prawy panel: Status (Draft/Published/Scheduled/Archived), Publish checklist, SEO snippet, Taxonomy
- Przycisk "Save metadata" w prawym panelu
- Przyciski "Save draft" (toolbar) i "Update" (toolbar)
- Preview dialog (Desktop/Tablet/Mobile) — iframe live preview
- Bulk select: "Select all entries" + indywidualne checkboxy
- Bulk actions: Publish, Move to Draft, Archive, Delete
- Akcje wiersza ("..."): Edit, Duplicate, Delete
- Przełącznik widoku: lista (tabela) ↔ siatka (karty)
- Filtry: Status, Author filter + "Clear All"
- Wyszukiwarka wpisów "Search entries..."
- Paginacja (Previous / Next)

---

## Bugi

### [BUG-1] KRYTYCZNY: Save metadata zwraca 500 i nie pokazuje błędu

**Gdzie:** Edytor entry → prawy panel → przycisk "Save metadata"

**Co się dzieje:** Kliknięcie "Save metadata" wysyła żądanie `POST /api/content/post/entries/{uuid}/metadata`, które zwraca HTTP 500 Internal Server Error. Użytkownik nie widzi żadnej informacji o błędzie — brak toast, brak komunikatu w UI. Przycisk wygląda jak nieaktywny. Jedynym śladem błędu jest konsola przeglądarki. Przycisk "Update" w toolbarze też wywołuje ten sam endpoint z błędem.

**Kierunek naprawy UI:** Na poziomie UI — przechwycić błąd API i wyświetlić toast "Błąd zapisu metadanych. Spróbuj ponownie." z czerwonym kolorem. Przycisk "Save metadata" po niepowodzeniu powinien wrócić do stanu aktywnego, nie pozostawać w "zamrożeniu". Backend endpoint wymaga odrębnej naprawy.

---

### [BUG-2] KRYTYCZNY: Pole Rich text renderuje się jako zwykły textarea

**Gdzie:** Edytor entry → zakładka Content → pola typu "Rich text" (zdefiniowane w Engine)

**Co się dzieje:** Gdy content type w Engine ma zdefiniowane pole z typem "Rich text", edytor entry renderuje je jako zwykłe pole tekstowe (textarea), a nie blokowy edytor rich text (jak w Posts). Użytkownik traci możliwość formatowania: nagłówki, pogrubienie, linki, listy są niedostępne. Wpisana treść to zwykły string bez żadnego formatowania.

**Kierunek naprawy UI:** Pole Rich text powinno renderować się jako osadzony blokowy edytor (taki jak w edytorze Posts). Typ pola z Engine powinien sterować typem komponentu formularza w entry edytorze — "rich text" → block editor, "text" → textbox, "number" → input numeryczny. Aktualnie ta mapa wydaje się brakować lub nie działać dla rich text.

---

### [BUG-3] ŚREDNI: Delete entry używa natywnego window.confirm()

**Gdzie:** Lista entries → menu "..." → opcja "Delete"

**Co się dzieje:** Kliknięcie "Delete" wywołuje natywny dialog przeglądarki `window.confirm("Delete this entry? This cannot be undone.")`. Natywny dialog blokuje przeglądarkę, nie pasuje do stylu aplikacji, nie może być dostosowany do dark mode, nie obsługuje klawisza Escape elegancko. Identyczny problem jak w sekcji Menus.

**Kierunek naprawy UI:** Zastąpić natywny confirm dialogs Radix AlertDialog, spójny z UI aplikacji. Tytuł: "Usuń wpis", treść: "Ta operacja jest nieodwracalna. Wpis zostanie trwale usunięty." + przyciski "Usuń" (czerwony) i "Anuluj". Wzorzec stosowany już w Posts ("Move to trash" nie używa confirm).

---

### [BUG-4] ŚREDNI: Duplicate entry — brak feedbacku, prawdopodobnie nie działa

**Gdzie:** Lista entries → menu "..." → opcja "Duplicate"

**Co się dzieje:** Po kliknięciu "Duplicate" nie pojawia się żaden toast ani potwierdzenie. Po przeładowaniu strony liczba wpisów w danym typie pozostaje niezmieniona — duplikat nie jest tworzony (lub tworzy się w niewidocznym miejscu). W konsoli przeglądarki brak błędów przy kliknięciu.

**Kierunek naprawy UI:** Wymagane minimum: toast "Wpis zduplikowany" po sukcesie, toast z błędem jeśli operacja się nie powiodła. Docelowo: po duplikacji lista odświeża się i nowy wpis jest widoczny (z nazwą "Kopia [oryginał]" w statusie Draft). Przed naprawą warto upewnić się że endpoint `/api/.../duplicate` jest zaimplementowany i zwraca 201.

---

### [BUG-5] ŚREDNI: Dwa przyciski "Save draft" bez rozróżnienia roli

**Gdzie:** Edytor entry — toolbar (góra) i prawy panel sidebar (dół)

**Co się dzieje:** W edytorze entry istnieją dwa oddzielne przyciski "Save draft": jeden w toolbarze na górze strony (obok "Update") i jeden na dole prawego panelu sidebar. Nie jest jasne czy robią to samo, czy jeden zapisuje pola a drugi metadane. Żaden nie pokazuje feedbacku. Użytkownik nie wie który wybrać ani czy oba są wymagane.

**Kierunek naprawy UI:** Jeden przycisk zapisu — w toolbarze. Prawy panel sidebar nie powinien duplikować akcji zapis. Jeśli "Save metadata" i "Save draft" to różne operacje — należy to jasno wyjaśnić etykietami (np. "Zapisz metadane" obok "Zapisz treść") lub połączyć w jedno wywołanie. Reguła: jeden punkt wyjścia dla każdej akcji.

---

### [BUG-6] ŚREDNI: Brak opcji Delete / Danger zone wewnątrz edytora entry

**Gdzie:** Edytor entry — brak sekcji usunięcia

**Co się dzieje:** Wewnątrz edytora entry nie ma żadnego przycisku "Usuń wpis" ani sekcji "Danger zone". Usunięcie możliwe jest tylko przez wyjście z edytora, powrót do listy i użycie menu "...". Niespójne z Posts editor, który ma "Danger zone" → "Move to trash" wewnątrz edytora.

**Kierunek naprawy UI:** Dodać "Danger zone" na dole prawego panelu sidebar w edytorze entry, z przyciskiem "Usuń wpis" (red button) i potwierdzeniem przez Radix AlertDialog (nie window.confirm). Po usunięciu — przekierowanie do listy wpisów z toast "Wpis usunięty".

---

### [BUG-7] NISKI: Brak toast po "Save draft" i "Update" w toolbarze

**Gdzie:** Edytor entry → przyciski "Save draft" i "Update" w toolbarze

**Co się dzieje:** Po kliknięciu "Save draft" lub "Update" brak widocznego feedbacku sukcesu. Brak toast, brak zmiany etykiety, brak timestamp. Identyczny problem jak w Pages, Posts i Engine.

**Kierunek naprawy UI:** Toast "Zapisano szkic" / "Zaktualizowano" po każdej udanej akcji zapisu. Spójna reguła dla całego admin UI — każda akcja zapisu musi dawać widoczny sygnał sukcesu lub błędu.

---

### [BUG-8] NISKI: Podgląd SEO pokazuje hardcoded URL "nextless.cms"

**Gdzie:** Edytor entry → prawy panel → sekcja "Search Engine Optimization" → Snippet preview

**Co się dzieje:** Podgląd snippetu SEO wyświetla URL: `https://nextless.cms/blog/my-first-article`. Domena `nextless.cms` jest zahardcodowana zamiast pobrana z ustawień strony. Właściciel strony zobaczy URL który nie odpowiada jego domenie.

**Kierunek naprawy UI:** URL w podglądzie SEO powinien pobierać domenę z ustawień strony (np. z `settings.siteUrl`). Jeśli ustawienie jest puste — pokazywać szary placeholder np. `yourdomain.com/blog/[slug]` zamiast hardcoded wartości.

---

## Problemy UX

### [UX-1] Sidebar content types — 35+ typów bez grupowania

**Gdzie:** Lewa kolumna sidebaru na stronie /admin/coderso/entries

**Problem:** Sidebar zawiera 35+ typów content (w tym ~15 "Screen [UUID]", zduplikowane "News", "Notes") bez żadnego grupowania, kategoryzacji ani możliwości zwinięcia sekcji. Wyszukiwarka "Search types..." filtruje na bieżąco (działa dobrze), ale brak możliwości schowania nieużywanych/przestarzałych typów.

**Kierunek naprawy UI:** Grupować typy według kategorii lub statusu (np. "Aktywne" vs "Nieużywane"). Umożliwić zarchiwizowanie / ukrycie typów bez usuwania (np. toggle "Ukryj puste typy"). Licznik wpisów przy każdym typie (np. "Post 2") pomaga — dodać go gdzie brakuje. Docelowo: posprzątanie danych (usunięcie Screen UUID typów) rozwiąże problem ilości.

---

### [UX-2] Status zmieniany przez dropdown ale wymaga osobnego zapisu

**Gdzie:** Edytor entry → prawy panel → sekcja Publishing → dropdown Status

**Problem:** Użytkownik może zmienić status z "Draft" na "Published" przez dropdown, ale zmiana nie jest automatycznie zapisywana. Wymaga kliknięcia "Save metadata" (które zwraca 500) lub "Update" (który też wywołuje ten sam endpoint). Użytkownik myśląc że status zmienił, może zamknąć edytor bez zapisu — status pozostaje niezaktualizowany bez żadnego ostrzeżenia.

**Kierunek naprawy UI:** Zmiana statusu przez dropdown powinna albo: (a) automatycznie zapisywać się (inline update), albo (b) powodować pojawienie się widocznego "niezapisane zmiany" alertu (jak w Engine). Nie powinno być możliwe opuszczenie edytora ze zmienionymi ale niezapisanymi metadanymi bez ostrzeżenia.

---

### [UX-3] Sekcja "What is this?" rozwinięta domyślnie — zajmuje miejsce

**Gdzie:** Edytor entry → prawy panel sidebar → sekcja "What is this?"

**Problem:** Sekcja z wyjaśnieniem ("Fields are defined by the content type schema", "Media fields pull assets from the Media Library", itd.) jest rozwinięta domyślnie. Dla nowego użytkownika jest pomocna, ale dla regularnego użytkownika to 4 linie tekstu które zajmują miejsce w i tak ciasnym prawym panelu.

**Kierunek naprawy UI:** Domyślnie zwinięta sekcja z małą ikoną "?" lub chevronem do rozwinięcia. Alternatywnie: pokaż sekcję tylko przy pierwszym wejściu do edytora (na podstawie localStorage), potem automatycznie ją ukryj.

---

### [UX-4] Brak podglądu (Preview) wewnątrz edytora entry

**Gdzie:** Edytor entry — toolbar

**Problem:** Edytor entry nie ma przycisku "Preview" w toolbarze. W Posts editor jest przycisk Preview, który otwiera dialog z podglądem w Desktop/Tablet/Mobile. W Entries editor ta opcja jest niedostępna bezpośrednio — użytkownik musi wrócić do listy i skorzystać z... właściwie nie ma tam preview.

**Kierunek naprawy UI:** Dodać przycisk "Preview" w toolbarze edytora entry (jeśli preview jest obsługiwane przez frontend). Powinien otwierać ten sam dialog z iFrame i przełącznikami urządzeń co w Posts, z tokenem umożliwiającym podgląd draft content.

---

### [UX-5] Taxonomy — komunikat "disabled" bez linku do naprawy

**Gdzie:** Edytor entry → prawy panel → sekcja Taxonomy

**Problem:** Sekcja wyświetla komunikat "Categories and tags are disabled for this content type." bez żadnego linku do włączenia tej funkcji. Użytkownik nie wie gdzie to zmienić — musi samodzielnie odnaleźć edytor content type w Engine → Settings → Taxonomies.

**Kierunek naprawy UI:** Do komunikatu dodać link "Włącz kategorie" który prowadzi bezpośrednio do ustawień odpowiedniego content type w Engine. Eliminuje zgadywanie przez użytkownika i redukuje liczbę kroków potrzebnych do włączenia funkcji.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Bulk select (Select All + wiersze) działa poprawnie | Zaznacza wszystkie wpisy, pokazuje "Selected N" |
| Bulk actions: Publish, Move to Draft, Archive, Delete | Pełny zestaw operacji grupowych |
| Filtry Status (Draft/Published/Scheduled/Archived) | Filtrują poprawnie, natychmiast |
| Filtr Author | Dostępny obok Status |
| "Clear All" — resetuje wszystkie filtry jednym kliknięciem | Wygodne |
| Wyszukiwarka "Search entries..." | Filtrowanie w czasie rzeczywistym po tytule |
| "Search types..." w sidebarze | Filtruje listę typów — przydatne przy 35+ wpisach |
| Licznik wpisów przy typie ("Post 2") | Szybka informacja o stanie kolekcji |
| Przełącznik widoku lista ↔ siatka (karty) | Grid view z kartami działa, kliknięcie otwiera edytor |
| Media tab w edytorze — "Browse media" picker | Właściwy UX: wybór z biblioteki, miniatura, nie surowe ID |
| Publish checklist "3/4 ready" z listą wymagań | Czytelna informacja co brakuje przed publikacją |
| SEO snippet preview z live edycją opisu | Użyteczny podgląd jak wpis wygląda w Google |
| Przycisk "New Collection" w sidebarze | Tworzenie content type bez opuszczania Entries |
| Scheduled status — aktywuje pole datetime | Poprawna logika: pole schedule date pojawia się tylko dla Scheduled |
| Status "Published" i "Draft" widoczne w tabeli listowej | Szybka orientacja bez otwierania edytora |
| Pole "featuredImage" (Media) używa właściwego pickera | Spójne z oczekiwanym zachowaniem media field |

---

## Błędy z konsoli (runtime)

```
POST http://localhost:5173/admin/api/content/post/entries/{uuid}/metadata → 500 Internal Server Error
GET http://localhost:3000/preview?type=content&token=...&contentType=post&slug=my-first-article&device=desktop → 404 Not Found
```

---

## Closure TASK-203 (2026-04-23)

All findings from this report were mapped into `TASK-203` and closed through
the existing Entries owners rather than a parallel editor, route, preview, or
storage path.

| Finding | Closure |
|---|---|
| BUG-1 | Fixed metadata route/client/editor feedback. Metadata errors are bounded, failed writes do not mutate cache, and publish transitions via metadata require `content:publish`. |
| BUG-2 | Fixed `richtext` field rendering through the shared rich text adapter/serializer instead of textarea-only editing. |
| BUG-3 | Replaced native row/bulk delete confirms with the app dialog pattern. |
| BUG-4 | Implemented real duplicate flow through `EntryTable -> EntryList -> entriesClient -> contentEntryRoutes -> entryService`; clone is draft and cache-safe. |
| BUG-5 | Removed duplicate sidebar `Save draft` actions; toolbar owns content save/update and sidebar owns metadata save. |
| BUG-6 | Added editor danger zone delete with app confirmation, toast feedback, and list navigation after delete. |
| BUG-7 | Added shared success/failure toast feedback for save draft, update, metadata, publish, duplicate, and delete flows. |
| BUG-8 | SEO snippet URL now resolves from site settings/content routes with a neutral fallback instead of `nextless.cms`. |
| UX-1 | Sidebar groups populated/empty types, supports `Hide empty content types`, preserves the active empty type, and disambiguates duplicate names with slugs. |
| UX-2 | Metadata edits now set a separate dirty flag and participate in the leave-page/refresh guard until `Save metadata` succeeds. |
| UX-3 | `What is this?` help is collapsible and persists its collapsed state in localStorage. |
| UX-4 | Existing Entries runtime preview action remains; runtime content preview now keeps generic entries on the generic content path when `contentType=post/posts`, fixing the captured 404 class. |
| UX-5 | Disabled taxonomy state links to the owning Engine content type editor where taxonomy toggles live. |

Validation:
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/content/entryService.test.ts tests/integration/routes/contentTypes.test.ts tests/integration/runtime/pages-runtime.test.ts` (16 pass, 0 fail outside the sandbox)

---

## Screenshoty

- `entries-list.png` — lista entry dla typu "testowy" (2 wpisy)
- `create-entry-dialog.png` — dialog tworzenia nowego entry
- `entry-editor.png` — edytor entry po otwarciu (My First Article)
- `media-picker.png` — picker mediów po kliknięciu "Browse media"
- `entry-after-reload.png` — edytor po przeładowaniu (status: Published)
- `bulk-select.png` — zaznaczone 2 wpisy, "Selected 2", toolbar bulk actions
- `bulk-actions-dropdown.png` — dropdown z opcjami: Publish, Move to Draft, Archive, Delete
- `entry-actions-menu.png` — menu "..." z opcjami: Edit, Duplicate, Delete
- `sidebar-search.png` — wyszukiwarka "Search types..." filtruje do "Post"
- `status-filter.png` — filtr Status: "Draft" — lista ograniczona do drafts
- `view-toggle-grid.png` — widok siatki (kart) zamiast tabeli
- `grid-view.png` — karty wpisów w trybie grid
- `entry-editor-richtext.png` — pole Rich text renderuje się jako textarea (BUG-2)
- `entry-media-tab.png` — zakładka Media z browse media picker i miniaturą
- `entry-editor-bottom.png` — dół edytora entry (prawy panel: SEO snippet, Taxonomy)
