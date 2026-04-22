# Raport UX/QA — sekcja Listings (Admin UI, Beta)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/listings
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Co to jest i co przetestowano

Listings to kreator presetów zapytań (queries) i szablonów wyświetlania (templates) dla dynamicznych list treści. Pozwala zdefiniować: źródło danych (content type / screen), filtry, sortowanie, paginację, wybrane pola — i przypisać do tego szablon (grid/card layout). Output: reusable "query preset" konsumowany przez widgety listingowe na stronach.

**Przetestowane przepływy:**

- Lista listings z dwoma zakładkami: Queries (2 istniejące: "House Projects Catalog Query a3afbe30", "33151341") i Templates (2 istniejące)
- "New query" → strona /admin/coderso/listings/new z edytorem query
- Edytor query: Basics (Name, Description), Source (Source type = Content entries, Content type dropdown, Include drafts), Filters (Add filter → field path + operator + value + Remove), Sort and Pagination (Add sort + sort field + direction, Limit=12, Offset=0), Fields and Template (Fields comma separated: "id, title, slug, status, updatedAt", Template for preview context)
- Live Preview sekcja ("Preview payload will appear here")
- "Run preview" → wywołuje `/admin/api/listings/queries/preview`
- "Save query" → zapis, przekierowanie do `/admin/coderso/listings/{uuid}`
- "Back to list" / "Discard" buttons
- Zakładka Templates — lista: kolumny Template / Layout / Updated / Actions
- "New template" → dialog "New listing template" z polami: Name, Slug, Layout (Grid domyślnie), Description, Dynamic field bindings (Add binding)
- Row menu "..." na queries — opcje Edit / Delete

---

## Bugi

### [BUG-1] KRYTYCZNY: "Run preview" z pustym filtrem → 400 Bad Request, brak komunikatu dla użytkownika

**Gdzie:** Edytor query → "Add filter" (tworzy pusty filtr) → "Run preview"

**Co się dzieje:** Jeśli użytkownik doda filtr (przez "Add filter") ale nie wypełni field path ani wartości, kliknięcie "Run preview" wywołuje `POST /admin/api/listings/queries/preview` który zwraca HTTP 400 Bad Request. W UI: sekcja Live Preview pozostaje pusta z tekstem "Preview payload will appear here" — żaden error toast, żaden czerwony komunikat, żadnego wskazania że coś poszło nie tak. Użytkownik myśli że po prostu brak wyników. Po usunięciu pustego filtra preview działa poprawnie i zwraca dane.

**Kierunek naprawy UI:** Dwa podejścia równolegle: (a) **Walidacja po stronie UI** — przycisk "Run preview" disabled gdy jakiś filtr ma puste pole; alternatywnie walidacja field path + value przed submitem z czerwonym outlinem niewypełnionych pól i tooltipem "Wypełnij field path i wartość". (b) **Obsługa błędu z API** — gdy 400 wraca, pokazać czerwony banner w sekcji Live Preview: "Nie udało się uruchomić podglądu. Sprawdź konfigurację filtrów." Zasada: silent fail = najgorszy UX; zawsze pokazuj albo walidację client-side, albo error state server-side.

---

### [BUG-2] KRYTYCZNY: Delete query — brak potwierdzenia, brak toast, natychmiastowe usunięcie

**Gdzie:** Lista queries → menu "..." → opcja "Delete"

**Co się dzieje:** Kliknięcie "Delete" w menu wiersza natychmiastowo usuwa query bez żadnego dialogu potwierdzenia ani toast. Query znika z listy. Identyczny problem jak w Forms, Custom Screens — pattern cichego destruktywnego działania bez jakiejkolwiek bariery.

**Kierunek naprawy UI:** Użyć tego samego AlertDialog komponentu co w sekcji Menus (lub docelowo: zbiorczo w całym Admin UI). Dialog: "Usuń query [nazwa]?" + "Ta operacja jest nieodwracalna. Widgety używające tego query mogą przestać działać." + przyciski "Usuń" (czerwony) i "Anuluj". Toast sukcesu "Query usunięty" po zamknięciu dialogu. Dodatkowo (ważne dla queries): jeśli query jest używane przez jakiś widget/page — blokować delete lub pokazywać warning "To query jest używane przez X miejsc. Usunięcie może zepsuć te strony." Warto użyć tej samej logiki referencyjnej co w Custom Screens (tam jest Content type w bindingu — analogiczny reverse lookup).

---

### [BUG-3] ŚREDNI: Menu wiersza ma tylko Edit/Delete — brak Duplicate, Preview, kopiowania

**Gdzie:** Lista queries/templates → menu "..."

**Co się dzieje:** Menu oferuje wyłącznie Edit i Delete. Brak: Duplicate (tworzenie wariantu istniejącego query — bardzo przydatne przy A/B testing), Preview (szybki podgląd wyników bez wchodzenia do edytora), Copy as JSON (skopiowanie definicji do schowka), Copy ID (UUID do referencji w kodzie widgetów). Dla porównania Pages/Posts/Entries mają bogatsze menu.

**Kierunek naprawy UI:** Rozszerzyć menu o: Duplicate (tworzy kopię z przyrostkiem "Copy of"), Quick preview (open modal z preview payload bez otwierania edytora), "Copy UUID" (dla devów integrujących z widgetami), "View usages" (pokazuje listę widgetów/stron używających tego query). Użyć tego samego wzorca co w innych sekcjach — nie wymyślać per Listings.

---

### [BUG-4] ŚREDNI: Brak toast po Save query / Save template

**Gdzie:** Edytor query → "Save query" / Dialog New template → "Save template"

**Co się dzieje:** Po zapisaniu query URL zmienia się na `/listings/{uuid}` — to jedyny sygnał że zapis się powiódł. Brak toast. Dla template (w dialogu) — dialog zamyka się bez toast. Spójne z problemem we wszystkich sekcjach.

**Kierunek naprawy UI:** Toast "Query zapisany" / "Template zapisany" po sukcesie. Globalna reguła we wszystkich sekcjach — użyć istniejącego komponentu toast.

---

### [BUG-5] ŚREDNI: Duplikowane nazwy queries i templates ("House Projects Catalog Query a3afbe30", "33151341")

**Gdzie:** Lista queries i templates

**Co się dzieje:** Dwa istniejące queries mają prawie identyczne nazwy różniące się tylko UUID-like suffixem: "House Projects Catalog Query a3afbe30" vs "House Projects Catalog Query 33151341". Analogicznie templates: "House Projects Catalog Grid a3afbe30" vs "House Projects Catalog Grid 33151341". Nazwy wyglądają jak auto-generowane. Użytkownik nie rozróżnia które jest właściwe.

**Kierunek naprawy UI:** Jeśli UUID-suffix jest efektem wewnętrznej logiki (np. migration backfill) — nie przeciekać go do nazwy w UI. Nazwa widoczna dla użytkownika powinna być semantyczna ("House Projects Catalog"), a jeśli istnieje potrzeba rozróżnienia dwóch — dodać opis / content type / slug jako drugą linijkę (identyfikator techniczny). Docelowo: walidacja unikalności nazwy przy tworzeniu + rekomendacja w dialogu "Create New Query" gdy użytkownik wpisze nazwę już istniejącą.

---

### [BUG-6] NISKI: Content type dropdown pokazuje duplikaty ("News" 3×, "Notes" 2×) + śmieciowe "Screen [UUID]"

**Gdzie:** Edytor query → combobox "Content type"

**Co się dzieje:** Dropdown zawiera ten sam śmieciowy zestaw content types co Engine, Entries, Custom Screens: 3× "News", 2× "Notes", ~15 "Screen [UUID]", "testowy", "testowy2", "test3". Identyczny root cause.

**Kierunek naprawy UI:** Dokładnie ten sam fix co w Engine (BUG-2) i Custom Screens (UX-1) — w dropdownie pokazywać slug obok duplikatów nazwy (`News (news-855f...)`), docelowo: posprzątanie danych w bazie (usunięcie zduplikowanych content types + "Screen [UUID]"). Wspólny component do wyboru content type powinien filtrować / stylizować duplikaty jednolicie we wszystkich sekcjach.

---

## Problemy UX

### [UX-1] Brak search / filter na liście queries i templates

**Gdzie:** /admin/coderso/listings → zakładki Queries i Templates

**Problem:** Oba widoki (Queries i Templates) nie mają search bar ani filtrów (po Source, po Layout, po Content type). Przy rosnącej liczbie presetów zarządzanie będzie niemożliwe — już teraz 2 queries i 2 templates mają prawie identyczne nazwy, co wymaga dokładnego czytania każdego wpisu.

**Kierunek naprawy UI:** Dodać search bar nad tabelą (filtrowanie po name/description/source) + filtry: dla Queries — Source type (Content entries/Screen), Content type; dla Templates — Layout (Grid/List/Card). Wzorzec analogiczny do Pages/Posts/Entries — ta sama komponenta DataTable toolbar.

---

### [UX-2] "Source type: Content entries" — brak alternatyw lub bez kontekstu

**Gdzie:** Edytor query → Source → Source type combobox

**Problem:** Combobox "Source type" sugeruje kilka opcji, ale domyślnie (i jedynie wizualnie) pokazuje "Content entries". Bez kontekstu — czym byłyby inne source types? Custom Screens? Collection? Forms submissions? Bez listy dostępnych wariantów użytkownik nie wie co Listings faktycznie obsługuje.

**Kierunek naprawy UI:** Jeśli "Content entries" jest jedynym Source type — ukryć pole lub zastąpić czytelnym tekstem "Źródło: Wpisy z Content Type" (jako informacja, nie combobox). Jeśli są inne source types w roadmapie — wypełnić dropdown i pokazać krótki opis każdego (typ → opis → przykład). Nie zostawiać comboboxa z jedną opcją.

---

### [UX-3] "Fields (comma separated)" — surowe textbox przy definicji pól

**Gdzie:** Edytor query → Fields and Template → textbox "Fields (comma separated)"

**Problem:** Pole z listą pól query (id, title, slug, status, updatedAt) jest jednym textboxem z przecinkami. Użytkownik musi znać listę dostępnych pól schematu content type wybranego source. Brak: autocomplete, chip/tag UI, walidacji nazw pól, info o typach (text/number/date). Kopiowanie z dokumentacji to jedyna droga.

**Kierunek naprawy UI:** Zastąpić textbox multi-select dropdownem z listą pól pobraną ze schematu wybranego content type (tak jak Custom Screens → Bindings → Content field dropdown już to robi — `content (richtext)`, `excerpt (text)`, itp.). Pola wybrane pokazywać jako chipy z możliwością przeciągania kolejności. Spójne z wzorcem Custom Screens bindings.

---

### [UX-4] Filter: surowe "field path" zamiast dropdowna pól

**Gdzie:** Edytor query → Filters → textbox "field path (e.g. status)"

**Problem:** Analogicznie do UX-3 — field path w filtrze to surowy tekst. Użytkownik musi znać wewnętrzną nazwę pola (np. `status`, `publishedAt`, `category.id` dla nested). Brak autocomplete, brak walidacji poprawności. Co gorsza — jak widzieliśmy w BUG-1 — przy pustym lub błędnym field path całe preview się sypie z 400 bez komunikatu.

**Kierunek naprawy UI:** Dropdown field path z listą pól schematu content type + nested paths (np. `category.name`, `author.email`). Pokazywać typ pola obok (`status (enum)`, `publishedAt (date)`). Dzięki temu operator combobox też może być inteligentny — dla `(enum)` pokazywać `equals/in/not in`, dla `(date)` `before/after/between`, dla `(text)` `contains/starts with/equals`. Zmniejsza margines na błąd wpisywania.

---

### [UX-5] Live Preview pokazuje surowy JSON — brak renderowanego podglądu

**Gdzie:** Edytor query → sekcja "Live Preview" → po "Run preview"

**Problem:** Preview pokazuje pełny JSON wyniku (`{"id": "...", "title": "...", "slug": "..."}`). Dla dev-u super, ale dla użytkownika (content managera) bez orientacji technicznej — trudne do odczytu. Nie widać jak to wygląda w UI frontendu — to jest rola Template ("Grid layout") ale nie ma podglądu rendrowania.

**Kierunek naprawy UI:** Dodać tryby podglądu w sekcji Live Preview: toggle "JSON / Rendered" (domyślnie Rendered). Rendered tryb pokazuje kafelki/wiersze wg wybranego template z danych z preview. JSON tryb zachowany dla developerów. Wzorzec analogiczny do "Block" tab w Engine Schema Preview gdzie jest podgląd JSON — ale w Listings to jest widoczne również dla user którzy powinni widzieć output wizualny.

---

### [UX-6] Beta badge w sidebarze — brak ostrzeżenia w samej sekcji

**Gdzie:** Sidebar "Listings Beta" + strona /admin/coderso/listings

**Problem:** W sidebarze jest "Beta" badge obok Listings, ale wchodząc na stronę sekcji nie ma żadnego info-banner tego że funkcja jest w wersji beta, co może się zmienić, z jakimi ryzykami produkcyjnymi. Użytkownik który nie widzi badge (np. zwiniętej nawigacji) nie wie że używa niedojrzałej funkcjonalności.

**Kierunek naprawy UI:** W nagłówku strony Listings dodać dyskretny info-banner (żółte tło, info icon): "Listings są w fazie Beta. API i UI mogą się zmienić. Zgłaszaj uwagi w [link do feedback]." Alternatywnie: tooltip przy "Beta" badge w sidebarze z tym samym komunikatem. Spójna zasada dla wszystkich Beta sekcji (Listings, Filters, Search, Booking, Reviews, Commerce, Popups, Solution Kits, Screens).

---

### [UX-7] Layout "Grid" domyślny w New Template — brak alternatywnych layoutów?

**Gdzie:** Dialog "New listing template" → pole Layout

**Problem:** Pole Layout pokazuje "Grid" jako domyślną wartość. Nie wiem (bez klikania) czy są inne opcje (List, Card, Table, Custom). Istniejące templates wszystkie mają layout "grid" — więc być może to jedyny. Jeśli tak, pole jest redundantne.

**Kierunek naprawy UI:** Jeśli Layout ma więcej wariantów — pokazać je jako wizualne opcje (miniaturki/ikony) zamiast tekstowego comboboxa: grid/list/card/table. Użytkownik wybierający layout chce widzieć różnicę wizualną, nie czytać etykiety. Jeśli jest tylko "grid" — ukryć pole lub oznaczyć "Wkrótce: dodatkowe layouty".

---

### [UX-8] "Add binding" / "Dynamic field bindings" — funkcja mało widoczna w dialogu template

**Gdzie:** Dialog "New listing template" → sekcja "Dynamic field bindings"

**Problem:** W dialogu template jest sekcja "Dynamic field bindings — Map listing row fields to template keys and define row visibility rules" z "Add binding" i placeholder "No field bindings defined yet." Bez kontekstu co to są bindingi w tym kontekście — Custom Screens ma bindingi, Listings też mają, ale z innych powodów (tutaj row fields → template keys, nie widget props → content fields). Zmieszane użycie terminologii.

**Kierunek naprawy UI:** Dodać krótki przykład w opisie: "Np. zmapuj pole 'title' z content type na klucz 'headline' w template." Link "Zobacz przykład bindingu" otwierający popover z przykładowym mapowaniem. Alternatywnie: prefill 1-2 standardowe bindingi (title→headline, description→subtitle) żeby użytkownik zobaczył jak to wygląda bez wypełniania od zera.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Sekcje Queries / Templates jako tabs | Czysty podział — queries = dane, templates = prezentacja |
| Edytor query z sekcjami: Basics / Source / Filters / Sort / Fields / Live Preview | Logiczny przepływ od góry do dołu |
| Live Preview — "Run preview" po naprawieniu filtra zwraca JSON z danymi | Natychmiastowy feedback dla query |
| "1 matching row" — licznik wyników przed JSON | Szybka orientacja ile danych matchuje |
| Ordering: Add sort + sort field + Descending switch + Remove | Pełna kontrola sortowania |
| Pagination: Limit + Offset | Podstawowe — wystarczające dla MVP |
| "Include drafts" toggle | Kontrola nad pokazywaniem szkiców w dynamicznych listach |
| Back to list / Discard / Run preview / Save query toolbar | Jasny zestaw akcji u góry |
| Po Save query → nawigacja do `/listings/{uuid}` | Trwała edycja zapisanego query |
| Templates z layoutem "grid" i opisem | Reusable preset (tak jak Widget templates) |
| Dialog "New listing template" z polami bindingów | Zaawansowana kompozycja jak Custom Screens |
| Default fields "id, title, slug, status, updatedAt" | Sensowny starting point |
| "Add filter" + "Add sort" + "Remove" | Pełny CRUD konfiguracji |
| URL query po save jest deep-linkable | Można wysłać link do zespołu |
| `Content type` dropdown wypełniany ze schematu | Użycie istniejącego source of truth |

---

## Screenshoty

- `listings-list.png` — lista Queries (2 istniejące House Projects)
- `row-menu.png` — menu "..." z opcjami Edit/Delete
- `new-query-editor.png` — edytor nowego query (Basics/Source/Filters/Sort/Fields/Live Preview)
- `add-filter.png` — wiersz filtra (field path, operator Equals, value, Remove)
- `preview-result.png` — Live Preview z "1 matching row" i JSON payload
- `templates-tab.png` — zakładka Templates z 2 House Projects Catalog Grid
- `new-template-dialog.png` — dialog New listing template z Name/Slug/Layout/Description/Dynamic field bindings

---

## Błędy z konsoli (runtime)

```
POST /admin/api/listings/queries/preview → 400 Bad Request (gdy pusty filtr)
```
