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

---

## Audyt UX konfiguracji per-widget (2026-04-26)

**Tester:** Claude (Playwright CLI)
**Środowisko:** edytor strony `/admin/pages/{id}` — strona testowa "Widget UX Audit"
**Metoda:** każdy widget dodany do canvasu, zarejestrowane: pola Wizard (lewy szybki tryb), zawartość zakładki Visual (presety + sekcje copy/styling), zawartość zakładki Advanced (tokeny + raw JSON), oraz zachowanie po dodaniu (czy się crashuje, ile fields, czy wartości spójne).

**Kontekst:** Wizard / Visual / Advanced to TRZY zakładki w prawym panelu inspektora po kliknięciu "Continue to layout and styling" w wizardzie.
- **Wizard** — minimalny zestaw "must-have" pól dla szybkiego setupu (top of funnel).
- **Visual** — presety (variants), copy (headings/body), uporządkowane sekcje stylingowe.
- **Advanced** — surowe tokeny CSS, padding, normalization, raw payload JSON snapshot.

### Globalne obserwacje (dotyczą wielu widgetów)

#### [GLOBAL-1] Niespójność: `count` w wizardzie vs liczba exposed textboxów

Pojawia się w: Stats KPI, Logo Cloud, Team, Pricing Plans, Testimonials, Timeline, Compare Timeline, FAQ Accordion.

Wzorzec: combobox "X count" ma default = 4 / 5 / 6, ale wizard exposeuje tylko 3 lub 2 textboxy do edycji. Brakujące pozycje pozostają z presetowymi wartościami (np. Stats KPI: count=4, exposed 3 → 4. wartość "45% / Higher engagement" pozostaje preset).

**Naprawa:** sync między `count` a liczbą textboxów (auto-add/remove pól), albo preset count na liczbę exposed (3) z możliwością dodania w Visual/Advanced.

#### [GLOBAL-2] Niespójność: `<select>` vs Radix combobox

Pojawia się w: Product Gallery, Product Compare, Product Table, Listing Filters, Search Box.

Te widgety używają natywnego `<select>` zamiast Radix `[role=combobox]` używanego w pozostałych widgetach (Hero, Feature Grid, etc.). Różnica wizualna i funkcjonalna (style, klawiatura, search-within).

**Naprawa:** ujednolicić — wszystkie comboboxy w wizardzie powinny być Radix.

#### [GLOBAL-3] Wizard pól bez label (puste `previousElementSibling`)

W kilku widgetach pola CTA URL / link href / drugi-input-w-paru renderują się bez wizualnego label (label jest wspólny dla pary input). Przykłady: Navigation (3 pary "name + href" — tylko nazwa ma label), Footer, FAQ Accordion (pytania bez labela).

**Naprawa:** każdy input powinien mieć aria-label albo widoczny label. Nawet w grupowanych parach lepiej rozdzielić "Link 1 — name" / "Link 1 — href" niż dwa anonimowe inputy.

#### [GLOBAL-4] Visual ≡ Advanced (FALSE NEGATIVE z mojej automatycznej analizy)

Moja pierwsza pasja przez Layout widgety pokazała "Visual === Advanced" — okazało się że to **bug mojego helpera** (eval click nie działał na Radix tabs). Po naprawie (przez `playwright-cli click "getByRole('tab')"`) potwierdzone na Section + Hero + Feature Grid: Visual i Advanced są **różne** w treści i intencji.

**Wniosek:** Visual / Advanced split zaprojektowane poprawnie (Visual = preset chooser + copy editor, Advanced = raw tokens + JSON). To prawidłowe.

### Bugi nowe / krytyczne

#### [BUG-9] KRYTYCZNY: Form Embed widget crashuje cały edytor

**Gdzie:** Edytor strony → Widget Library → klik "+" przy "Form Embed"

**Co się dzieje:** Po kliknięciu Form Embed React ze złym renderem dialogu/Selectu wywala cały drzewo aplikacji do białego ekranu. `document.body.innerText.length` spada do 0, traci się każdy stan UI (otwarte drawery, niezapisane edycje innych widgetów na canvas). Tylko reload odzyskuje aplikację.

Konsola browser (Error level):

```
Error: A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear
the selection and show the placeholder.
    at SelectItem (@radix-ui_react-select.js:1062)
```

**Powtarzalne 100%** — testowane 3× (manual click + ref click + helper click).

**Kierunek naprawy UI:** w komponencie wizard / drawer dla Form Embed (najprawdopodobniej picker "Saved form" lub "Form ID"), Radix `<Select.Item>` ma `value=""` dla opcji typu "(none)" / "(unselected)" / placeholder. Radix zabrania empty string jako value (kolizja z internal "clear selection"). Zamienić `value=""` na sentinel jak `value="__none__"` i mapować z powrotem przy odczycie.

Symptom-analog do BUG-7 z 2026-04-23 (Posts taxonomy raw SQL leak) — różnica: tu nie 500, tylko stricte React Error Boundary trigger.

#### [BUG-10] ŚREDNI: Listing Filters / Search Box — combobox zostaje "Loading listing queries..."

**Gdzie:** Wizard widgetu Listing Filters lub Search Box → combobox wyboru listingu

**Co się dzieje:** Label combobox to dosłownie "Loading listing queries..." nawet po pełnym załadowaniu strony i wszystkich endpointów. Wewnątrz combobox: "No listing query selected" jako wartość. Brak listy listing query do wyboru (bo żaden nie istnieje w systemie testowym), ale label pozostaje "Loading..." w nieskończoność.

**Identyczny wzorzec** jak Pages BUG-3 (Loading template options...) zafixowany w TASK-194. Tu został.

**Kierunek naprawy UI:** stan loading powinien zniknąć gdy fetch się zakończy. Jeśli pusta lista → zmienić label combobox na "Listing query" + dodać helper text "No listings yet. [Create one]" z linkiem do `/admin/coderso/listings`. Spójnik z templates fix.

### Layout widgets (10)

| Widget | Wizard fields | Wizard kluczowe pola | Bugi/UX |
|---|---|---|---|
| **Section** | 4 | Section title, Description, Background color, Section layout (Default) | OK; Visual: Variant + structure (Default/Contained/Bleed), Heading and intro, Semantics and anchor (Anchor ID/Aria label), Surface and borders, Regions. Advanced: Technical tokens + Raw payload. |
| **Grid Columns** | 6 | Column 1/2 labels, Grid style (Equal), Column configs (2), Horizontal/Vertical gap | OK; expose tylko 2 kolumny labels mimo że potencjalnie więcej w configs. Sync z Column configs nie działa (count vs labels). |
| **Split Layout** | 3 | Split preset (50/50), Mobile behavior (Stack), Base gap | Minimalna konfiguracja w wizardzie — żaden slot label, żadne dane copy. Użytkownik musi do Visual/Advanced. **Sugestia:** dodać "Left content label" / "Right content label" do wizardu. |
| **Tabs** | 6 | Tab 1/2 (slot id) labels + bodies, Number of tabs (2), Initially active tab | OK — prosta i czytelna struktura. |
| **Accordion** | 6 | Item 1/2 (slot id) titles + bodies, Number of items, Initially open item | OK — symetryczne z Tabs. |
| **Toggle Block** | 3 | Primary label (View A), Secondary label (View B), Helper text | Bardzo minimalny — brak kontroli stanu domyślnego (który widok aktywny na start). |
| **Spacer** | 3 | Height combobox (16/4rem), Spacer mode (Responsive), Desktop height | OK — proste. |
| **Divider** | 2 | Divider style (Line), Line thickness (1px) | Najmniej fields — adekwatne dla widgetu. |
| **Stack** | 3 | Stack style (Vertical), Mobile direction (Column), Base gap | OK — żadnych slot labels (jak Split Layout). |
| **Hero** | 10 | Headline, Subhead, Primary/Secondary CTA Label+URL, Goal, Hero layout, CTA layout, Media | Najbardziej kompletny wizard. Single point of truth. |

**Layout findings:**
- ✓ 6 z 10 layout widgetów ma wizard ≤ 4 fields — odpowiednio minimalistyczne.
- ⚠ Split Layout / Stack — żadnych slot labels w wizardzie. User dodający te wraperami nie wie co dalej.
- ⚠ Grid Columns — `Column configs = 2` ale exposeuje tylko 2 labels. Co jeśli ktoś ustawi 3 lub 4? Wizard nie aktualizuje liczby labels (nie testowane na żywo, do weryfikacji).

### Content widgets (20)

| Widget | Wizard fields | Wizard pola | Bugi/UX |
|---|---|---|---|
| **Feature Grid** | 7 | Section title, description, Card 1/2/3 labels, Feature grid style, Cards count | OK; Cards count = 3 spójne z exposed cards. Visual ma Cards 3 / Cards 4 / Highlight First presets. |
| **Testimonials** | 9 | Section title, Testimonial 1-3 (text + author), style, count | Count = 3 spójne. Polskie nazwiska w defaultach. |
| **Pricing Plans** | 9 | Section title, Plan 1-3 (name + price), Pricing layout, Plans count | Count = 3 spójne. **Drobne UX:** kolumna price exposeuje surowy ciąg ($19) zamiast osobno value + currency. |
| **FAQ Accordion** | 4 | Section title + 2 question textboxes + FAQ layout | **GLOBAL-1**: tylko 2 questions exposed, nie ma "count" ani "answer" pól w wizardzie. Może być za mało. |
| **CTA Banner** | 3 | Headline, Primary CTA label, Banner layout | Wizard NIE pokazuje Secondary CTA, Description, eyebrow. Bardzo minimalne. |
| **Logo Cloud** | 6 | Section title, 3 names (Acme/North Labs/BlueRiver), layout, count=6 | **GLOBAL-1 INSTANCE:** count=6 ale exposed tylko 3 nazwy. 3 logo zostają preset. |
| **Gallery Mosaic** | 3 | Section title, Gallery layout, Initial media count=5 | Brak exposure plików media w wizardzie. Trzeba do Visual/Advanced lub Media Picker. |
| **Stats KPI** | 5 | 3 metric values + Stats layout + Metric count=4 | **GLOBAL-1 INSTANCE:** count=4 vs 3 exposed values. (Już zgłoszone przy Pages deep test.) |
| **Team** | 5 | 3 member names + Team layout + Members count=3 | OK — count=3 spójne z exposed. |
| **Rich Text Section** | 4 | Eyebrow, Title, Body HTML (textarea z `<h2>`/`<p>` raw), Layout | **UX:** Body HTML to surowy textarea — brak rich text editora. Zaskakujące w widget library, gdy Posts mają WYSIWYG. Sugestia: użyć tego samego rich-text editora co w Posts. |
| **Content List** | 3 | Source mode, Content type (No content type selected), Layout variant | Tylko 3 fields — wszystko comboboxy. Brak preview / count. |
| **Posts Feed** | 2 | Newest published posts (or all), Sort | **NAJUBÓŻSZY wizard z 20 Content widgetów.** Brak count, title, layout, filter. Dla bloga niedostatecznie konfigurowalne z poziomu wizard. |
| **Entry Teaser** | 4 | Data source mode, Mode (Latest entry), Content type, Layout variant | Wszystko comboboxy, żadnego copy. |
| **Product Gallery** | 6 | Search input, Collection IDs (CSV), Sort field/direction, Columns, Card style | **GLOBAL-2 INSTANCE:** używa natywnych `<select>` zamiast Radix combobox. **UX:** Collection IDs jako CSV to surowy field — analogicznie do BUG-4 starego (raw IDs zamiast picker). |
| **Product Compare** | 4 | Search, Collection IDs (CSV), Sort field/direction | Te same uwagi co Gallery. |
| **Product Table** | 4 | Search, Collection IDs (CSV), Sort field/direction | Te same uwagi. |
| **Listing Filters** | 6 | Show search field, helper text, Search/Apply labels + **Loading listing queries...** combobox | **BUG-10:** combobox label permanentnie "Loading listing queries...". |
| **Search Box** | 6 | Auto apply on input, helper, placeholder, button label + **2× Loading listing queries...** combobox | **BUG-10:** dwukrotnie label "Loading listing queries...". |
| **Timeline** | 6 | 3 step labels (Discovery/Planning/Build), style, count=3, orientation | OK; count=3 spójne. |
| **Compare Timeline** | 3 | Track 1 label (Traditional), Track 2 label (With us), Axis step count=3 | Tylko 2 track labels — zaskakująco mało dla widgetu o nazwie "compare". |

**Content findings:**
- 🚨 **BUG-10**: Listing Filters i Search Box — niekończący się "Loading listing queries..." (regresja wzorca BUG-3 z Pages).
- ⚠ **GLOBAL-1**: Stats KPI, Logo Cloud, Pricing — niespójność count vs exposed fields.
- ⚠ **GLOBAL-2**: Product Gallery/Compare/Table — natywne `<select>` zamiast Radix.
- ⚠ Rich Text Section — `Body HTML` jako raw textarea bez WYSIWYG (porównaj do Posts editor).
- ⚠ Posts Feed — najuboższy wizard, brak title/count/layout.
- ⚠ Product widgets — Collection IDs jako CSV string (raw IDs) — powtarzanie wzorca naprawionego w Posts BUG-4 (Featured Image picker).

### Forms widgets (5)

| Widget | Wizard fields | Wizard pola | Bugi/UX |
|---|---|---|---|
| **Newsletter** | 5 | Title (Join our newsletter), Description, Button label (Subscribe), Consent label, Newsletter style (Inline) | OK — typowy form widget. |
| **Booking Calendar** | 7 | Flow key (booking-flow), Title, Description, Service/Resource/Date label, Refresh button | "Flow key" — co to? Brak helper text. **UX:** użytkownik nie-techniczny nie wie do czego służy "flow key". Tooltip / opis pomocniczy by się przydał. |
| **Appointment Form** | 5 | Flow key, Title, Description, Submit button, Success message | Drugi widget z "Flow key" bez wyjaśnienia. Spójność z Booking Calendar dobra (oba mówią `booking-flow`). |
| **Form Embed** | 🚨 CRASH | (nie da się załadować) | **BUG-9 KRYTYCZNY** — crash całej aplikacji. |
| **Contact** | 5 | Submit label (Send message), Phone, Email, Address, Contact layout (Form left) | OK — typowy contact widget. |

**Forms findings:**
- 🚨 **BUG-9**: Form Embed crashuje editor (Radix Select.Item empty value).
- ⚠ "Flow key" pole w Booking Calendar i Appointment Form — bez wyjaśnienia dla nietechnicznego usera.

### Navigation widgets (2)

| Widget | Wizard fields | Wizard pola | Bugi/UX |
|---|---|---|---|
| **Navigation** | 11 | 3 link pairs (name+href: Home/About/Contact), Logo text + Logo URL, Navigation style (Simple), Links source (Manual links), Logo type (Text logo) | **GLOBAL-3 INSTANCE:** drugie pole z pary (href) bez label. **UX:** "Links source = Manual links" — dropdown sugeruje też "Auto from menus" / "From sitemap" — testowane? Dynamic source widzi pages? |
| **Footer** | 13+ | Column 1 (Resources): 3 links, Column 2: tagline, copyright, privacy URL, terms URL, social links (twitter/linkedin) | Najbardziej rozbudowany Navigation widget. **UX:** social links mają tylko 2 fixed (twitter + linkedin) — brak FB / IG / GitHub. Trzeba do Advanced? |

**Navigation findings:**
- ⚠ **GLOBAL-3**: pary name+href bez labels per-pole.
- ⚠ Footer — fixed social platforms (tylko 2). Sztywne ograniczenie. Powinno być dynamiczne (add/remove platform).
- ⚠ Navigation — "Links source: Manual links" sugeruje że są inne źródła (np. auto-generate z menus), ale wizard nie pokazuje co przełącza. **Sugestia:** dodaj helper text przy combobox "Links source" wyjaśniając opcje.

### Podsumowanie audytu (38 widgetów testowanych)

**Statystyki konfigurowalności (wizard fields):**
- Min: 2 (Posts Feed, Divider)
- Mediana: ~5 fields
- Max: ~13+ (Footer), 11 (Navigation), 10 (Hero)
- Crash: 1 (Form Embed)

**Buggi krytyczne:**
- 🚨 **BUG-9** Form Embed crashuje React (Select.Item empty value).
- 🚨 **BUG-10** Listing Filters + Search Box: "Loading listing queries..." nie znika.

**Wzorce UX do uspójnienia:**
- **GLOBAL-1** Count vs exposed fields (8+ widgetów).
- **GLOBAL-2** `<select>` natywny vs Radix combobox (5 product/listing widgetów).
- **GLOBAL-3** Pary inputów (name+href) bez per-pole labels (Navigation, Footer, Pricing Plans).

**Pozytywne wzorce (działa dobrze):**
- ✓ Trójka tabów Wizard / Visual / Advanced — czysta separacja zakresu (top-of-funnel vs preset+copy vs raw tokens).
- ✓ Większość widgetów ma `count` combobox + odpowiadające textboxy (Feature Grid, Tabs, Accordion, Team, Testimonials).
- ✓ Default values w języku polskim (Anna Kowalska, Marek Nowak, Ewa Zielinska) dla testimonials/team — lokalizacja na poziomie defaultu.
- ✓ Hero — najlepszy wizard balance: 10 fields kompletnych ale podzielonych logicznie (content / CTA / layout).
- ✓ Spójna interakcja: dodanie widgetu → wizard otwiera się natychmiast w prawym panelu z preset values → user widzi natychmiast w canvas (live preview) → "Continue to layout and styling" przejście do Visual.

**Propozycja priorytetyzacji fixów:**
1. **P0 — Hotfix BUG-9** (Form Embed crash). Każda godzina kosztuje user trust. 1-line fix.
2. **P1 — BUG-10** (Listing Filters/Search Box loading state). Reuse wzorca z TASK-194 templates fix.
3. **P2 — GLOBAL-1** count sync. Może być bulk PR przez wszystkie content widgety.
4. **P3 — GLOBAL-2** Radix Select unification. Duzy refactor, ale poprawi spójność.
5. **P4 — Polish** (helper texts, "Flow key" wyjaśnienia, social platforms dynamic).

### Screeny audytu

- `screenshots/2026-04-25/widget-hero-visual.png` — Hero Visual tab.
- `screenshots/2026-04-25/widget-hero-advanced.png` — Hero Advanced tab.
