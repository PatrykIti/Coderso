# Raport UX/QA — sekcja Widget Library (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/widgets
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Co to jest i co przetestowano

Widget Library to centralny katalog komponentów UI wielokrotnego użytku — 38 widgetów podzielonych na kategorie (Layout 11, Content 20, Forms 5, Navigation 2, Media 0) + 5 szablonów (Templates). Widgety można wstawiać do stron (Pages) albo do istniejących bloków, oraz komponować własne szablony z widgetów atomicznych.

**Przetestowane przepływy:**

- Lista widgetów: 43 pozycje (38 widgets + 5 templates) — widok kart
- Sidebar po lewej: Items (All Items, Favorites, Templates), Widgets (All Widgets, Layout, Content, Forms, Navigation, Media), sekcja Favorites z listą ulubionych
- Tabs: "Recommended 28" / "All widgets 38"
- Switch "Advanced mode" — odblokowuje filtr złożoności
- Filtry: "All modules" (Commerce, Content, Forms, Listings, Booking, Engagement, Media…), "All complexity" (Composite / Atomic)
- View toggle (2 nieoznaczone przyciski)
- Kliknięcie karty widgetu → dialog/drawer ze szczegółami (Module, Complexity, Audience, Requires) + wizard konfiguracji
- "Insert" → dialog "Insert Widget" z Placement (Insert as new section / Insert into existing block), Target page dropdown
- "Insert into existing block" → hierarchiczny picker (Page → Section → Block)
- Przycisk gwiazdki na karcie widgetu → toggle Favorites
- Zakładka Templates — lista (test, main-footer, test2, test1, test — 5 pozycji)
- "New Template" link → edytor template z Template canvas, sidebar library, prawy panel Settings/Details
- "Save Template" — utworzenie templatu, nawigacja do edytora
- Dialog "Categories" — zarządzanie kategoriami szablonów: New category (Add), Existing categories (pencil/trash per row)
- Edit category inline (pencil → input + check/x)
- Delete category inline (trash → "Delete this category?" Cancel/Delete)
- Wyszukiwarka widgetów "Search items..." / "Find components..."
- "Complete setup" w wizardzie
- "Cancel" / "Insert Widget" buttons w dialogu

---

## Bugi

### [BUG-1] KRYTYCZNY: "Insert Widget" — brak feedbacku sukcesu, brak weryfikacji efektu

**Gdzie:** Dialog "Insert Widget" → przycisk "Insert Widget"

**Co się dzieje:** Po kliknięciu "Insert Widget" dialog zamyka się, ale nie ma żadnego komunikatu sukcesu (toast) ani nawigacji do strony docelowej. Użytkownik nie wie czy widget został faktycznie dodany, gdzie dokładnie i w jakim statusie. Brak linku typu "Zobacz w edytorze Pages". W konsoli brak błędów, ale też brak widocznego potwierdzenia.

**Kierunek naprawy UI:** Po udanym insert — toast "Widget dodany do strony [Homepage]" z linkiem "Otwórz edytor" prowadzącym bezpośrednio do /admin/pages/[slug]. Toast z errorem jeśli endpoint zwrócił błąd. Alternatywnie: opcja "Insert and open editor" jako drugi przycisk — dla użytkowników którzy chcą od razu dopasować widget.

---

### [BUG-2] ŚREDNI: Przycisk Favorite na karcie widgetu — brak etykiety i wizualnego stanu

**Gdzie:** Karta widgetu (wszystkie 38 widgetów) — przycisk ze statusem gwiazdki

**Co się dzieje:** W lewym górnym rogu każdej karty widgetu jest przycisk z ikoną gwiazdki (lucide-star) który toggluje Favorites. Problem: `aria-label` = null, brak `title`, brak `tooltip`, brak tekstu. Screen readery nie wiedzą co to za przycisk. Użytkownik hoverujący nie widzi wyjaśnienia. Kliknięcie — favorites się zmieniają, ale bez żadnego feedbacku (toast / animacja gwiazdki).

**Kierunek naprawy UI:** Dodać `aria-label="Dodaj do ulubionych"` / `"Usuń z ulubionych"` zależnie od stanu. Dodać tooltip przy hover. Wypełniona gwiazdka (żółta) dla favorites, pusta dla non-favorites. Krótka animacja pulse/fade po toggle. Opcjonalnie toast "Widget dodany do ulubionych".

---

### [BUG-3] ŚREDNI: Brak toast po "Save Template" i "Create screen template"

**Gdzie:** Edytor New Template → "Save Template" / kreator Template

**Co się dzieje:** Po kliknięciu "Save Template" template jest tworzony i URL zmienia się na `/widgets/templates/{uuid}`, ale nie ma żadnego komunikatu sukcesu. Jedyną wskazówką jest zmiana URL. Identyczny wzorzec jak w innych sekcjach — brak toast po każdym zapisie.

**Kierunek naprawy UI:** Toast "Template '[nazwa]' utworzony" po create, "Template zapisany" po subsequent save. Reguła spójna dla całego Admin UI.

---

### [BUG-4] ŚREDNI: Delete template / Edit template — nie przetestowane, ale brak delete w liście

**Gdzie:** Lista Templates — kolumna "Edit" przy każdym templatcie

**Co się dzieje:** Lista templates zawiera wyłącznie przycisk "Edit" per wiersz. Brak opcji "Delete template" ani menu "...". Aby usunąć przestarzałe templates (np. "test", "test1", "test2" — 3 testowe) trzeba wejść w Edit i szukać opcji tam. Nie ma bulk select ani akcji zbiorczych.

**Kierunek naprawy UI:** Dodać menu "..." w kolumnie Edit z opcjami: Edit / Duplicate / Delete — tak jak w Pages, Posts, Entries. Potwierdzenie przez Radix AlertDialog. Docelowo: bulk select dla porządkowania listy.

---

### [BUG-5] ŚREDNI: Widget detail drawer — "Insert Widget" duplikuje funkcjonalność karty

**Gdzie:** Dialog/drawer szczegółów widgetu (po kliknięciu karty)

**Co się dzieje:** Po kliknięciu karty widgetu otwiera się drawer z konfiguracją i przyciskami "Cancel" / "Insert Widget" na dole. Ale na liście głównej każda karta ma już swój przycisk "Insert". Są to dwa równoległe punkty wejścia do tego samego flow "Insert Widget", ale drawer dodatkowo pokazuje konfigurację widgetu. Niejasne kiedy użytkownik ma użyć karty "Insert", a kiedy najpierw otworzyć drawer.

**Kierunek naprawy UI:** Skonsolidować — kliknięcie karty zawsze otwiera drawer z konfiguracją, a "Insert Widget" w drawerze jest jedynym punktem wstawiania. Usunąć przycisk "Insert" z karty widgetu (lub zmienić na ikonę podglądu/info). Eliminuje to duplikowane flow. Wzorzec: Block Inserter w Posts editor — tam kliknięcie bloku wstawia go natychmiast, bez dodatkowego dialogu.

---

### [BUG-6] NISKI: "New Template" nie jest widocznym przyciskiem w Tab Templates

**Gdzie:** Tab Templates → header

**Co się dzieje:** W zakładce Templates jest link "New Template" (jako `<a>` stylizowany na button), ale nie jest on jednoznacznie widoczny jako CTA — kryje się obok "All categories" dropdowna. Użytkownik szukający jak utworzyć template może go przeoczyć.

**Kierunek naprawy UI:** Wyeksponować "New Template" jako primary button (solid variant) w prawym górnym rogu sekcji Templates — analogicznie do "New screen", "Create New Collection" w innych sekcjach. Spójny wzorzec: primary CTA w nagłówku listy.

---

### [BUG-7] NISKI: Tabs "Recommended 28" / "All widgets 38" nie aktualizują liczników przy filtrze kategorii

**Gdzie:** Tab bar w głównym widoku → po wybraniu kategorii (np. Layout 11)

**Co się dzieje:** Po wybraniu kategorii "Layout" (11 widgetów) nagłówek zmienia się na "11 widgets", ale tabs nadal pokazują "Recommended 28" i "All widgets 38" — liczniki nie reflektują aktywnego filtra kategorii. Użytkownik może myśleć że przełączając na "Recommended" dostanie 28 widgetów niezależnie od kategorii.

**Kierunek naprawy UI:** Liczniki w tabach powinny się aktualizować wraz z aktywną kategorią, np. "Recommended 8" / "All widgets 11" dla Layout. Lub: dezaktywować/wyszarzać tabs gdy filtr kategoryjny jest aktywny, z informacją "Filtr kategorii nadpisuje widok Recommended".

---

## Problemy UX

### [UX-1] Kliknięcie karty widgetu otwiera drawer — oczekiwanie "add to favorites" lub "insert"

**Gdzie:** Karta widgetu

**Problem:** Klikając kartę (nie przycisk Insert ani przycisk Favorite) użytkownik otwiera drawer szczegółów. Wzorzec "Block Inserter" w Posts działa inaczej — tam kliknięcie bloku wstawia go natychmiast. Tu trzeba dodatkowo kliknąć "Insert Widget" w drawerze + "Placement" + "Target page" + znowu "Insert Widget". 5 kliknięć żeby dodać widget do strony to za dużo dla prostego action.

**Kierunek naprawy UI:** Zmienić domyślne zachowanie klika karty na "Insert" (otwiera dialog Insert Widget bezpośrednio). Aby zobaczyć szczegóły widgetu — przycisk "..." lub "i" w rogu karty, albo hoverable info popover. Minimalizuje liczbę kliknięć do najczęstszego scenariusza (insert).

---

### [UX-2] "All modules" combobox — status "Ready" / "Needs coverage" nie jest objaśniony

**Gdzie:** Main toolbar → combobox "All modules" → rozwinięcie

**Problem:** Dropdown pokazuje moduły z adnotacjami: `Commerce - Ready`, `Content - Ready`, `Booking - Needs coverage`, `Media - Needs coverage`. Nie jest jasne co znaczy "Needs coverage" — czy to oznacza że widgetów w tym module brakuje, czy że coverage testowy jest niekompletny. Etykieta dev-centric która przecieka do UI użytkownika.

**Kierunek naprawy UI:** Zmienić etykiety na user-friendly: "Gotowe do użycia" / "W przygotowaniu" + kolorowy badge (zielony / żółty). Lub ukryć status "Needs coverage" całkowicie — filtrować moduły które nie mają dostępnych widgetów. Aktualny tekst wprowadza szum.

---

### [UX-3] "Advanced mode" — bez tooltipa co odblokowuje

**Gdzie:** Main toolbar → switch "Advanced mode"

**Problem:** Switch "Advanced mode" bez wyjaśnienia co robi. W rzeczywistości odblokowuje filtr "All complexity" (Composite / Atomic), ale to nie jest dokumentowane. Użytkownik nie wie co zyskuje aktywując tryb zaawansowany.

**Kierunek naprawy UI:** Tooltip przy hoverze na switch: "Włącz, aby filtrować widgety po złożoności (Composite / Atomic)". Lub: zmienić switch na przycisk "Show advanced filters" z ikoną filter+ która po kliknięciu rozwija dodatkowy rząd filtrów (zamiast trybu on/off globalnego).

---

### [UX-4] Dwa nieoznaczone przyciski w toolbarze — nie działają (?)

**Gdzie:** Main toolbar → dwa ghost buttony po prawej stronie switcha "Advanced mode"

**Problem:** Dwa przyciski bez aria-label i bez widocznego rezultatu kliknięcia. Testowałem oba — żaden nie zmienia widocznego layoutu (nie jest to toggle lista/siatka). Prawdopodobnie view toggle który jeszcze nie działa lub placeholder.

**Kierunek naprawy UI:** Jeśli to view toggle (lista ↔ siatka) — dodać aria-label, pressed state, faktyczną zmianę layoutu. Jeśli to placeholder — ukryć do czasu implementacji. Puste/nieoznaczone przyciski są frustrujące.

---

### [UX-5] "Advanced mode" + "Recommended" + "Categories" sidebar + "All modules" + "All complexity" — za dużo filtrów o niejasnej hierarchii

**Gdzie:** Main toolbar + lewy sidebar + tab bar

**Problem:** Na jednym ekranie użytkownik widzi: sidebar z kategoriami (Items / Favorites / Templates / Widgets × 5 kategorii), tab "Recommended / All widgets", switch "Advanced mode", combobox "All modules", combobox "All complexity" + wyszukiwarka. 6 różnych osi filtrowania bez jasnej wzajemnej zależności. Łatwo pomylić: czy Layout w sidebarze to to samo co "Layout" module w combobox?

**Kierunek naprawy UI:** Uprościć informację. Sidebar powinien zawierać tylko główne podziały (Templates / Favorites / All widgets). Filtry kontekstowe (module, complexity) w jednym zwijanym panelu "Filters" obok wyszukiwarki. Tab "Recommended" może być prostym toggle'em w tym samym panelu filtrów. Hierarchia: sidebar → tryb widoku (widgets vs templates), toolbar → filtry wewnątrz trybu.

---

### [UX-6] Lista Templates — 3 pozycje o nazwach "test", "test1", "test2" + zduplikowane "test"

**Gdzie:** Tab Templates → lista 5 templatów

**Problem:** Aż 3 templates zaczynają się od "test" (test, test1, test2), plus drugi "test" (jedną z drobnicy). Czyli 4/5 wpisów to "śmieci testowe". Bez możliwości delete z listy + bez bulk action — pełne porządkowanie wymaga wchodzenia do każdego editora osobno.

**Kierunek naprawy UI:** (a) dodać Delete do menu wiersza (zob. BUG-4), (b) dodać bulk select + "Delete selected" tak jak w Posts/Entries, (c) docelowo: walidacja unikalności nazwy przy tworzeniu (nie pozwalać na duplikaty), (d) placeholder w input "Template name" z lepszą sugestią (np. "np. Strona o nas — 2 kolumny").

---

### [UX-7] Categories dialog — edycja i kasowanie inline może zmylić

**Gdzie:** Categories dialog → pencil (edit) + trash (delete) na kategoriach

**Problem:** Kliknięcie pencil zamienia nazwę kategorii na pole input z check/x buttonami — OK, wzorzec inline edit. Kliknięcie trash zamienia nazwę na pytanie "Delete this category? Cancel / Delete" — również inline. Problem: obie operacje zastępują kafelek kategorii, więc wizualnie kategoria "znika". Użytkownik który nie wie że jest w trybie edycji może pomyśleć że kategoria została usunięta (przy kliknięciu pencil!).

**Kierunek naprawy UI:** Edit mode — input powinien być *obok* nazwy, nie zastępować ją (np. nazwa wyszarzona + input pod spodem). Delete mode — ekspresywne tło czerwone lub przekreślenie nazwy + pytanie obok. Wizualne rozróżnienie między "edit" a "delete" jest kluczowe aby użytkownik nie panikował.

---

### [UX-8] "Favorites" licznik w sidebarze nie aktualizuje się z sekcją "Favorites" obok

**Gdzie:** Sidebar → Items → "Favorites 1" + poniżej sekcja "Favorites" z listą ulubionych

**Problem:** W sidebarze jest dwa razy "Favorites": raz jako przycisk tab "Favorites 1", raz jako osobna lista poniżej. Dwukrotne wyświetlenie tej samej informacji w tak bliskiej odległości to szum. Licznik "1" jest przy tabie, ale lista poniżej też pokazuje ten sam element. Redundancja.

**Kierunek naprawy UI:** Zostawić tylko jedno miejsce — albo tab button (z licznikiem), albo rozwiniętą listę poniżej. Nie oba naraz. Jeśli zostawić listę: kliknięcie elementu na liście powinno od razu otwierać widget detail (a nie najpierw filtrować). Jeśli zostawić tab: dopiero po kliknięciu pokazywać listę w głównym obszarze.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Wyszukiwarka "Find components..." w bibliotece widgetów | Działa, filtruje w czasie rzeczywistym |
| Kategorie Layout/Content/Forms/Navigation/Media z licznikami | Czytelne, ikony + liczby |
| Insert dialog — "Insert as new section" / "Insert into existing block" | Klarowne dwa tryby + krótki opis różnicy |
| "Insert into existing block" → hierarchiczny picker (Page → Section → Block) | Dobry UX: progressywne zawężanie |
| Target page dropdown | Pokazuje rzeczywiste strony z systemu (Homepage, SEO Test Page, about) |
| Drawer szczegółów widgetu — metadane Module/Complexity/Audience/Requires | Profesjonalny, dev-friendly |
| Wizard w drawerze (Flow key, Copy: Title/Description/Submit/Success) | Podgląd konfiguracji przed insertem |
| Categories dialog — prosta CRUD na kategoriach szablonów | Inline edit + inline delete confirmation |
| Inline confirmation "Delete this category? Cancel / Delete" | Lepsze niż window.confirm — stylizowane, zintegrowane |
| Wyszukiwarka widgetów typu "Find components..." w wielu miejscach | Spójny wzorzec (też w Template editor, Custom Screens) |
| Template editor z Template canvas + Settings/Details tabs | Analogiczna do Custom Screens — spójne UX |
| Favorites count w sidebarze oraz dedykowany tab | Kiedy ktoś już zrozumie jak działa — użyteczne |
| "Advanced mode" odblokowuje dodatkowy filtr | Separacja zaawansowanych opcji od podstawowego trybu |
| Tabs "Recommended 28" / "All widgets 38" | Szybki dostęp do kuratorskiego podglądu |
| Moduły z informacją o gotowości (Ready/Needs coverage) | Transparent message (mimo dev-centric tonu) |
| Hierarchia w lewym sidebarze: Items → Widgets → Categories | Logiczna struktura (tylko zbyt dużo poziomów) |

---

## Screenshoty

- `widgets-list.png` — główny widok 43 widgetów z sidebarem, tabami, filtrami
- `insert-dialog.png` — dialog "Insert Widget" (Placement + Target page)
- `insert-page-picker.png` — dropdown Target page z Homepage, SEO Test Page, about
- `insert-into-block.png` — "Insert into existing block" → 4 comboboxy (Page, Homepage, Hero, Hero Content)
- `widget-card.png` — karta widgetu (Appointment Form) po kliknięciu
- `widget-detail-panel.png` — drawer szczegółów widgetu z metadanymi i wizardem
- `view-toggle.png` — test przycisków view toggle w toolbarze
- `templates-tab.png` — tab Templates z 5 pozycjami (3× test)
- `new-template-editor.png` — edytor nowego template (Template canvas + library + Settings)
- `advanced-mode.png` — Advanced mode ON odblokowuje filtr complexity
- `modules-filter.png` — dropdown "All modules" z Ready / Needs coverage
- `categories-dialog.png` — Template categories dialog
- `category-delete-confirm.png` — inline confirmation "Delete this category? Cancel / Delete"
- `category-rename-mode.png` — inline edit mode kategorii (input z check/x)
- `favorites-tab.png` — tab Favorites z 1 elementem (Appointment Form)
