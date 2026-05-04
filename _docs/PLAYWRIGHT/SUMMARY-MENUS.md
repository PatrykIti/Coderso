# Raport UX/QA — sekcja Menus (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/menus
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Empty state — brak menu przed pierwszym uruchomieniem
- Tworzenie menu ("Main Navigation" z lokalizacją "primary")
- Dodawanie itemów: typ Page (dropdown stron), typ Custom URL
- Edycja itemu — Navigation Label, Badge (label + tone), Icon Name, Description
- Visibility dropdown (Show to everyone / Only logged-in / Only logged-out)
- Parent Item dropdown — ustawianie sub-menu
- Przełączanie między menu przez "Active menu" combobox
- Tworzenie drugiego menu ("Footer Menu" z lokalizacją "footer")
- Usuwanie itemu (przycisk Delete Item i ikonka delete)
- Save changes / Discard
- Refresh

---

## Bugi

### [BUG-1] KRYTYCZNY: Delete używa natywnego `window.confirm()` zamiast UI dialogu

**Gdzie:** Lista itemów → ikonka usunięcia ORAZ panel "Edit Menu Item" → przycisk "Delete Item"

**Co się dzieje:** Kliknięcie delete (zarówno z ikonki w liście, jak i z przycisku "Delete Item" w panelu) wywołuje natywny dialog przeglądarki `window.confirm("Delete this menu item and its children?")`. Natywny dialog:
- Blokuje cały interfejs
- Nie ma stylizacji marki (wygląda jak systemowy alert)
- Nie pokazuje kontekstu (co dokładnie się usuwa)
- Na niektórych systemach pojawia się w nieoczekiwanym miejscu

**Kierunek naprawy UI:** Zastąpić natywny confirm stylizowanym dialogiem (modal) zintegrowanym z UI. Dialog powinien: pokazywać nazwę usuwanego itemu, wymienić liczbę dzieci jeśli są, mieć wyraźnie rozróżnione przyciski "Usuń" (czerwony/danger) i "Anuluj". Usunięcie jest nieodwracalne — wymaga świadomej decyzji, którą lepiej zapewnia własny modal.

---

### [BUG-2] ŚREDNI: Sub-menu nie ma wizualnego wcięcia w strukturze

**Gdzie:** Lista itemów → sekcja "Menu Structure"

**Co się dzieje:** Ustawienie Parent Item w panelu edycji (np. "About Us" → parent: "Home") jest poprawnie zapisywane w danych, ale wizualnie lista itemów nie odzwierciedla hierarchii — wszystkie pozycje wyświetlają się na tym samym poziomie bez wcięcia. Użytkownik nie widzi że "About Us" jest dzieckiem "Home".

Instrukcja "Drag right to create sub-menus" sugeruje że drag jest jedynym wizualnym mechanizmem hierarchii, ale przy ustawieniu Parent Item przez dropdown hierarchia powinna też być widoczna.

**Kierunek naprawy UI:** Itemy z Parent Item powinny być wcięte w liście (np. 16-24px z pionową linią po lewej). Opcjonalnie: obok nazwy child-itemu pokazać mały label "↳ Home" informujący o rodzicu.

---

### [BUG-3] ŚREDNI: "Active menu" dropdown nie przełącza się po utworzeniu nowego menu

**Gdzie:** Po kliknięciu "New Menu" i utworzeniu menu → sekcja "Active menu"

**Co się dzieje:** Po utworzeniu "Footer Menu" dropdown "Active menu" nadal pokazuje "Main Navigation" zamiast automatycznie przełączyć się na nowo utworzone menu. Użytkownik widzi edytuje Footer Menu (pola Menu name i Location pokazują poprawne dane), ale wskaźnik "Active menu" jest mylący — sugeruje że wciąż jest w Main Navigation.

**Kierunek naprawy UI:** Po utworzeniu nowego menu — combobox "Active menu" powinien automatycznie przełączyć się na nowo utworzone menu. Alternatywnie: jeśli "Active menu" oznacza aktywne na stronie (nie edytowane), zmienić nazwę na "Editing menu" lub "Current menu" żeby uniknąć niejednoznaczności.

---

### [BUG-4] NISKI: Brak potwierdzenia toast po "Save changes"

**Gdzie:** Toolbar → przycisk "Save changes"

**Co się dzieje:** Po zapisaniu jedynym feedbackiem jest zmiana tekstu statusu z "Unsaved changes" na "All changes saved" w małym pasku nad strukturą. Brak wyraźnego toasta/powiadomienia. Podobny problem co w Pages i Posts.

**Kierunek naprawy UI:** Toast "Menu zapisane" w rogu ekranu przez ~3 sekundy. Aktualny status bar jest słabo widoczny i nie przyciąga uwagi.

---

## Problemy UX

### [UX-1] Kliknięcie ikonki przy itemie vs kliknięcie samego itemu — niespójna nawigacja

**Gdzie:** Lista itemów → każdy wiersz

**Problem:** Każdy item ma dwa przyciski po prawej: pierwszy otwiera prawy panel edycji, drugi usuwa (z confirm). Ale kliknięcie samego przycisku z nazwą itemu (np. "Home Page: Homepage") RÓWNIEŻ otwiera prawy panel. Oznacza to że pierwsza ikonka jest redundantna — obie akcje (klik wiersz + klik ikonka) robią to samo.

**Kierunek naprawy UI:** Wyjaśnić intencję ikon. Jeśli ikonka = edit to powinna mieć tooltip "Edit" lub ikonę ołówka. Alternatywnie: pierwsza ikonka = drag handle (reorder), druga = delete. To byłoby spójne z informacją "Drag up or down to reorder."

---

### [UX-2] "Active menu" — niejednoznaczna nazwa

**Gdzie:** Sekcja ustawień menu → dropdown "Active menu"

**Problem:** Termin "Active menu" sugeruje "menu opublikowane/aktywne na stronie" (semantic: które menu jest live). Faktycznie to selektor edytowanego menu — przełącznik edytora. Ta niejednoznaczność powoduje zamieszanie (patrz BUG-3).

**Kierunek naprawy UI:** Zmienić label na "Wybrane menu" / "Current menu" / "Editing:" żeby jasno komunikowało cel. Jeśli termin "Active" odnosi się do live stanu — dodać osobny wskaźnik który menu jest aktualnie opublikowane na stronie.

---

### [UX-3] Drag & drop — brak wizualnego potwierdzenia (nie przetestowany, ale hint jest)

**Gdzie:** Menu Structure → hint "Drag up or down to reorder. Drag right to create sub-menus."

**Problem:** Tekst instrukcji nie ma żadnego wizualnego wsparcia — brak drag handle, brak kursora grab, brak animacji placeholder przy przeciąganiu (na podstawie wyglądu itemów w snapshot). Użytkownik nie wie intuicyjnie że może przeciągać.

**Kierunek naprawy UI:** Dodać widoczny drag handle (sześć kropek ⋮⋮) po lewej stronie każdego itemu, który zmienia kursor na `grab` po najechaniu. Przy aktywnym przeciąganiu — placeholder linii pokazujący gdzie item zostanie upuszczony.

---

### [UX-4] Pole "Icon Name" — brak pomocy przy wyborze

**Gdzie:** Panel edycji itemu → pole "Icon Name" z placeholderem "e.g. sparkles"

**Problem:** Pole przyjmuje "token ikony" (np. `sparkles`) ale nie ma podglądu ikony, listy dostępnych tokenów ani linku do dokumentacji. Użytkownik musi znać dokładną nazwę tokenu — wpisanie złej nie daje błędu ani podglądu.

**Kierunek naprawy UI:** Dodać podgląd ikony (mała ikona obok pola aktualizowana na bieżąco), dropdown z wyszukiwarką dostępnych ikon, lub link "Browse icons →" otwierający picker. Pole bez feedbacku to pole w próżnię.

---

### [UX-5] Location field — brak wyjaśnienia co to "location"

**Gdzie:** Górna sekcja ustawień menu → pole "Location" (placeholder "primary") z opisem "Useful when mapping menus to theme locations."

**Problem:** Opis "mapping menus to theme locations" jest zbyt abstrakcyjny dla użytkownika niebędącego deweloperem. Nie wiadomo co wpisać, jakie wartości są prawidłowe, skąd wziąć tę wartość ani co się stanie jeśli pozostawi się domyślne "primary".

**Kierunek naprawy UI:** Zmienić opis na konkretny przykład: "Identyfikator miejsca w szablonie frontendu gdzie menu ma się wyświetlić. Sprawdź dokumentację swojego motywu." Lub dodać dropdown z listą predefiniowanych lokalizacji (primary, footer, sidebar, etc.) zamiast wolnego pola tekstowego.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Empty state z CTA "Create Menu" | Czytelny komunikat i szybka akcja |
| Dialog tworzenia menu — prosta forma (nazwa + lokalizacja) | Minimalistyczny, bez zbędnych pól |
| Prawy panel "Edit Menu Item" z pełną listą opcji | Bogaty — Label, Link Type, Page/URL, Parent, Visibility, Badge, Icon |
| Link Type "Page" — dropdown pobierający istniejące strony | Nie trzeba znać URL — wybór z listy |
| Link Type "Custom URL" — pole na dowolny URL | Elastyczność dla zewnętrznych linków |
| Visibility: 3 opcje (everyone / logged-in / logged-out) | Przydatne dla auth-aware nawigacji |
| Badge Label + Badge Tone (5 kolorów) | Estetyczny sposób oznaczania nowości |
| Parent Item dropdown — blokuje obecny item jako opcję | Zapobiega circular dependency |
| "Active menu" combobox — przełączanie między menu | Wygodna nawigacja bez opuszczania strony |
| Status bar "All changes saved" / "Unsaved changes" | Jasny stan zapisu |
| "Save changes" / "Discard" — oba działają poprawnie | Discard prawidłowo przywraca zmiany |
| Refresh — przeładowuje dane bez utraty stanu | Działa poprawnie |
| Usunięcie itemu z panelu lub ikonki — działa poprawnie | Usunięcie zapisywane do stanu "Unsaved" |

---

## Screenshoty

- `menus-empty-state.png` — widok przed pierwszym menu (empty state + CTA)
- `create-menu-dialog.png` — dialog tworzenia menu (Menu name, Location)
- `menu-created.png` — po utworzeniu Main Navigation, pusta struktura
- `add-item-panel.png` — prawy panel "Edit Menu Item" po kliknięciu Add Item
- `menu-two-items.png` — struktura z Home (Page) i Blog (Custom URL + badge)
- `submenu-no-indent.png` — About Us z Parent: Home, ale brak wcięcia w liście (bug)
- `about-us-parent-home.png` — panel Edit pokazuje Parent Item: Home (dane poprawne)
- `menus-final-state.png` — końcowy stan: Main Navigation z Home + Blog

---

## Manualna re-weryfikacja Playwright (2026-04-23)

Ręczny przebieg po wdrożeniu fixów. Sekcja Menus została **znacznie przeprojektowana** od czasu pierwotnego raportu — teraz to pełny list+detail flow zamiast pojedynczej strony z "Active menu" dropdownem.

### Architektura: redesign zamiast patchu 🏗️

Przed fixem: jedna strona z comboboxem "Active menu" przełączającym między menu.
Po fixie: lista menusów (tabela) → klik w wiersz → dedykowany edytor pod `/admin/menus/{uuid}`.

Ten redesign **jednym pociągnięciem** eliminuje 2 bugi z oryginalnego raportu (BUG-3: Active menu nie przełącza się; UX-2: "Active menu" niejednoznaczna nazwa) — bo po prostu nie ma już comboboxa "Active menu", jest naturalny wzorzec jak w Pages/Posts.

### Zweryfikowane działające ✓

| ID | Element | Obserwacja na żywo |
|---|---|---|
| BUG-1 | Natywny window.confirm() | Usunięty. Teraz klik "Delete Item" otwiera Radix AlertDialog: "Delete menu item? — [item] will be removed from the current draft menu. This action cannot be undone after you save the menu. Only this item will be removed." + Cancel / Delete item. Stylistyka spójna z Admin UI, z kontekstem co się usuwa. |
| BUG-2 | Sub-menu bez wcięcia | Ustawienie Parent Item na child skutkuje teraz widocznym wcięciem w liście Menu Structure (zmierzone: +24px left offset). Hierarchia widoczna wizualnie. |
| BUG-3 | "Active menu" dropdown nie przełącza się | Nie ma już "Active menu" dropdowna — cały flow przepisany na list+detail. Problem rozwiązany przez redesign. |
| BUG-4 | Toast po Save changes | Po "Save changes" aria-live region pokazuje "Menu saved." — widoczny, mierzalny success indicator. (W przeciwieństwie do Pages/Posts gdzie toast pozostaje pusty — tutaj działa!) |
| UX-1 | Redundantna ikonka edit | Każdy item w liście ma teraz 3 buttony z distinct aria-labels: "Open menu item details for [item]" (click wiersz), "Open details for [item]" (ikona edit), "Delete [item]" (ikona trash). Rozróżnienie jednoznaczne. |
| UX-2 | Niejednoznaczna nazwa "Active menu" | Wyeliminowane przez redesign. Nawigacja jest teraz "Back to menus" (breadcrumb-style). |
| UX-3 | Brak drag handle | Draggable items z `cursor-grab` klasą. Instrukcja precyzyjna: "Drag the handle to reorder. Move slightly to the right while dragging to turn an item into a sub-menu." (wcześniej było bardziej ogólne). |
| UX-5 | Location field bez wyjaśnienia | Pole Location ma teraz opis: "Theme slot identifier such as primary or footer. Use the value your frontend theme expects for navigation placement." + w dialogu Create Menu: inline code examples `primary` / `footer`. Nowy użytkownik wie co wpisać. |

### Zweryfikowane częściowo ⚠

| ID | Element | Obserwacja |
|---|---|---|
| UX-4 | Icon Name picker | Opis pola się poprawił: "Optional runtime icon token such as sparkles. Keep the token simple and lowercase; the active menu presenter decides which icon names it can render." — więcej kontekstu. **Ale nadal brak wizualnego pickera ikon / autocomplete / podglądu** — textbox pozostaje wolnym polem. Copy-fix bez UI-fixa. **Kierunek dopracowania UI:** dropdown z wyszukiwarką dostępnych tokenów + live preview małej ikonki obok pola. |

### Nowa obserwacja: Create Menu dialog ma helper ✓ (bonus fix)

Poza oryginalnymi bugami — w dialogu Create Menu dodano walidację "Menu name is required." (analogicznie do Pages UX-3). Przycisk Create Menu disabled gdy puste — z widoczną przyczyną. Ten sam wzorzec rozpięty spójnie przez Pages → Posts → Menus.

### UX feel — obserwacje po całym flow ✨

**Co jest super teraz:**
- **Toast po Save changes DZIAŁA** ("Menu saved.") — Menus jako jedyna z 3 sekcji poprawionych ma widoczny success feedback. To co nie zadziałało w Pages/Posts (mimo vitest proof) — tutaj zadziałało w real-user feel.
- Delete AlertDialog z pełnym kontekstem (nazwa, warning, zakres) — najlepszy delete UX w całym Admin UI. Wzorzec który powinien trafić do Forms/Listings/Custom Screens/Commerce (które nadal mają silent delete).
- Redesign z "Active menu" dropdown na list+detail — zamiast patchować bug, usunięto źródło. Przykład podejścia "rozszerzamy istniejące kontrakty" (Pages/Posts pattern) zamiast tworzenia równoległego flow.
- Ujednolicenie aria-labels ("Open menu item details for X", "Delete X") — każdy button "wie kim jest".

**Co nadal zostawia niedosyt:**
- Icon Name — opis lepszy, ale brak wizualnego wsparcia. Użytkownik nadal musi znać token (`sparkles`, `bookmark`, …). Dla content managera to UX martwy.
- Drag handle istnieje (`cursor-grab`), ale brak dedicated drag handle icon (six-dot grip ⋮⋮) — trzeba najechać żeby zobaczyć kursor, sama wizualna sugestia drag'alności jest subtelna.

### Screeny

- `retest-fix/menus-list.png` — nowa lista menusów (tabela z kolumnami)
- `retest-fix/menu-editor.png` — dedykowany edytor pod URL/uuid
- `retest-fix/submenu-parent.png` — drugi item z parent = pierwszy
- `retest-fix/submenu-applied.png` — sub-menu wcięte (24px offset)
- `retest-fix/delete-confirm.png` — Radix AlertDialog "Delete menu item?" z warning i kontekstem

---

## Re-retest #2 (2026-04-26) — pełna ścieżka list+editor

**Środowisko:** http://localhost:5173/admin/menus, login patryk.ciechanski@patrykiti.pl, sesja `playwright-cli -s=menus` (izolowana od innych równoległych agentów).

**Zakres:** lista (search, status filter, location filter, kolumny, bulk-select, akcje rzędu), Create Menu dialog (walidacja, helper text), edytor menu (Add Item, Page selector, Custom URL, Parent dropdown, Visibility, Badge label+tone, Icon, Description, Update Item), zapis/Discard, dialog usuwania item + dialog usuwania całego menu, hierarchia sub-menu, status flow Draft↔Published.

### Zweryfikowane działające ✓ (kontynuacja z poprzednich rund)

| ID | Element | Obserwacja po fix-ie |
|---|---|---|
| BUG-1 | window.confirm dla item delete | **Trzymane.** Klik "Delete Blog" → Radix dialog `[role=dialog][data-state=open]` z treścią "Delete menu item? Blog will be removed from the current draft menu. This action cannot be undone after you save the menu. Only this item will be removed." + Cancel / Delete item. Stylistyka spójna. |
| BUG-2 | Brak wcięcia sub-menu | **Trzymane.** Po ustawieniu Parent: Home dla Blog: `data-menu-depth="1"`, `style="margin-left: 24px"`, w treści wiersza ikona `↳` + tekst "Sub-item of Home". Hierarchia czytelna. |
| BUG-3/UX-2 | "Active menu" combobox | **Wyeliminowane.** Lista + dedykowany edytor `/admin/menus/{uuid}`, breadcrumb `Content / Menus / Main Navigation` + button "Back to menus". |
| BUG-4 | Brak toasta po Save | **Trzymane.** Po "Save changes" pojawia się toast "Menu saved." (region notyfikacji `alt+T`). Po "Menu created" — toast `Menu "Main Navigation" created.`. |
| UX-1 | Redundantne ikony w wierszu | **Trzymane.** W liście menusów każdy wiersz ma rozróżnione: checkbox `Select Main Navigation`, link `Open menu editor for Main Navigation` (przejście na detail), button `Open menu actions` (kebab menu z Edit/Publish/Move to Draft/Delete). |
| UX-3 | Drag handle | **Działa.** Każdy item ma widoczną ikonkę grip-vertical (lucide `grip-vertical`) w kontenerze `bg-muted/40 ... cursor-grab`. Instrukcja: "Drag the handle to reorder. Move slightly to the right while dragging to turn an item into a sub-menu." |
| UX-5 | Location helper | **Trzymane.** Pole Location ma helper: "Theme slot identifier such as `primary` or `footer`. Use the value your frontend theme expects for navigation placement." (z inline `<code>` tagami). |

### Nowe obserwacje na pozytywie ✨

1. **Lista menusów = pełna parytet z Pages/Posts.** Tabela z kolumnami MENU/STATUS/LOCATION/PUBLISHED/CREATED/ACTIONS, search po name/location, filtry Status (All/Published/Draft) i Location (All/Not assigned/footer/primary — dynamicznie z istniejących menusów), paginacja.
2. **Akcje rzędu (kebab)**: Edit, Publish, Move to Draft, Delete — wszystkie działają (Publish zmienia Status z Draft → Published i wypełnia kolumnę Published datą Apr 26, 2026 inline w tabeli, bez nawigacji).
3. **Bulk select** z checkboxem `Select all menus` → toolbar "SELECTED 2, Apply a bulk action to the selected menus" + combobox "Bulk actions" (Publish / Move to Draft / Delete) + przyciski Apply/Clear. Solidnie zrealizowane.
4. **Walidacja w Create Menu**: pole Menu name nie ma `disabled`, ale klik "Create Menu" z pustą nazwą pokazuje błąd "Menu name is required." pod polem (inline). Działa.
5. **Helper inline `<code>`** w Create Menu Location: "Theme slot identifier such as `primary` or `footer`. Use the value your frontend theme expects for navigation placement." — zgodnie z poprzednim raportem.
6. **Discard**: Modyfikacja pola Menu name → status zmienia się na "Unsaved changes", przyciski Discard/Save changes się odblokowują. Discard cofa zmianę i przywraca "All changes saved", value pola wraca do oryginału.
7. **Token preview ikony**: Po wpisaniu `home` w Icon Name i kliknięciu Update Item — w panelu pokazuje się "Current token: home" pod polem. Mały krok do przodu w stosunku do "tokenu w próżnię" z poprzedniego raportu, ale wciąż NIE ma wizualnej miniatury ikony.
8. **Delete menu (cały menu z listy)** też używa Radix dialogu — "Delete menu? Delete this menu? This cannot be undone." + Cancel / Delete menu. Dialog spójny.

### Nowe bugi / regresje 🐞

#### [BUG-N1] ŚREDNI: "Customize menu columns" button nie reaguje — popover nie otwiera się

**Gdzie:** `/admin/menus` → toolbar listy → ikona kolumn (lucide `columns-2`) z aria-label `Customize menu columns`.

**Co się dzieje:** Klik na button **nie otwiera żadnego popovera/menu**. Sprawdzone:
- `[data-state=open]` count = 0
- `[role=menu]`, `[role=dialog][data-state=open]`, `[data-radix-popper-content-wrapper]` count = 0
- Button nie ma `aria-haspopup`, `aria-expanded`, `aria-controls`, ani innego znacznika triggera popovera
- HTML buttona to plain `<button aria-label="Customize menu columns">` ze SVG bez listenera widocznego z poziomu DOM-u

**Skutek:** Użytkownik nie może dostosować widocznych kolumn tabeli. W innych sekcjach Admin UI (Pages, Posts) ten sam wzorzec działa — tu jest "głuchy" przycisk.

**Kierunek naprawy:** Albo podpiąć rzeczywiste sterowanie kolumnami (Popover z listą checkboxów MENU/STATUS/LOCATION/PUBLISHED/CREATED), albo — jeśli funkcja nie jest jeszcze gotowa — schować przycisk za feature flag i pokazać tylko gdy działa. Pozostawienie nieaktywnego buttona to UX dłuższy niż jego brak.

**Screen:** `2026-04-26/menus-retest3/customize-columns-no-popover.png`

---

#### [BUG-N2] NISKI: Hidden native `<select>` w Parent Item dropdown ma stale label

**Gdzie:** Edytor menu → panel Edit Menu Item → combobox Parent Item.

**Co się dzieje:** Radix Select renderuje równolegle widoczny popup (z aktualnym labelem itemu, np. "Home") oraz hidden native `<select>` dla a11y. Native `<select>` zachowuje label sprzed renamea — w eksperymencie:
1. Add Item → label domyślny "New item", UUID = X
2. Zmień label na "Home", klik Update Item
3. Add Item drugi → otwórz Parent Item dropdown
4. Widoczny popup pokazuje opcje: "No Parent (Top Level)", "Home", **"New item"** (disabled = current item being edited)
5. Hidden `<select>` w DOM-ie ma `<option value="X-uuid">New item</option>` — **stary label**

**Skutek:** Screen reader anonsuje "New item" zamiast aktualnej nazwy. Wpis "New item" w popupie też jest błędny — po zmianie label-a "Home" przed save'em, ten sam wpis powinien się odświeżyć.

**Powtarzalność:** 100% — każdy świeży Add Item z natychmiastową zmianą label-a powoduje rozjazd między popupem a native `<select>`. Po Update Item native `<select>` zostaje zsynchronizowany dla wszystkich INNYCH itemów, ale podczas tworzenia kolejnego itemu znowu się rozjeżdża dla niego samego.

**Kierunek naprawy:** Synchronizować hidden `<select>` z aktualnie wpisanym labelem (live, on-change), nie tylko po Update Item.

---

#### [BUG-N3] NISKI: Page/Custom URL toggle nie ma `role="radiogroup"` / `aria-pressed`

**Gdzie:** Edytor menu → panel Edit Menu Item → Link Type sekcja → buttony "Page" i "Custom URL".

**Co się dzieje:** Toggle wizualny działa (selected → `data-variant="secondary"`, deselected → `data-variant="ghost"`), ale a11y atrybuty puste:
- `aria-pressed` = null
- `role` = "button" (nie `radio`)
- Brak wspólnego `role="radiogroup"` na kontenerze

**Skutek:** Screen reader anonsuje to jako dwa zwykłe przyciski bez wskazania który jest aktywny. Klawiatura: brak wzorca arrow-key navigation typowego dla radiogroup.

**Kierunek naprawy:** Dodać `role="radiogroup"` na kontenerze, `role="radio"` + `aria-checked="true|false"` na każdym buttonie, klawiszowa nawigacja strzałkami.

---

#### [BUG-N4] DROBNY: Menu delete dialog (cały menu) nie podaje nazwy menu

**Gdzie:** `/admin/menus` → kebab "Open menu actions" → Delete.

**Co się dzieje:** Dialog ma treść "Delete menu? Delete this menu? This cannot be undone." — nie zawiera nazwy menu (np. "Footer Menu"). Dla porównania: dialog usuwania ITEMU ma nazwę ("Blog will be removed from the current draft menu.") — kontekst jest, w dialogu menu — go brak.

**Skutek:** Drobna niespójność — usuwa się "ten" menu, ale nie wiadomo który dokładnie (jeśli kebab został otwarty z drugiego rzędu i flow zostało przerwane).

**Kierunek naprawy:** Tytuł "Delete menu **Footer Menu**?" + opis "Footer Menu and its items will be removed. This cannot be undone." — analogicznie do dialogu usuwania itemu.

### Ciągłe problemy (nie naprawione, status: jak w poprzednim raporcie) ⚠

| ID | Element | Status |
|---|---|---|
| UX-4 | Icon Name picker | **Częściowo.** Po Update Item pojawia się "Current token: home" w panelu (tekst, NIE wizualna ikonka). Brak listy/autocomplete tokenów. Content manager wciąż w próżni. |
| UX-3 (rozszerzenie) | Drag handle widoczność | Drag handle istnieje (lucide `grip-vertical` w kontenerze `bg-muted/40 cursor-grab`), wizualnie obecny dla widzącego. Brak hover state przyciągającego uwagę, ale poprawa względem oryginału. |

### Zweryfikowane działające ✓ (nowe checkpoint-y)

| Funkcja | Obserwacja |
|---|---|
| Status flow z listy (Publish action) | Po klik "Publish" w kebabie: Status zmienia się Draft → Published, kolumna Published wypełnia się datą `Apr 26, 2026`. Inline, bez page reload. |
| Search po name + location | `footer` → filtruje do "Footer Menu", clear → wszystkie wracają. |
| Status filter | Draft → 1 pasujący wynik. All → 2 wyniki. |
| Location filter | Opcje generowane dynamicznie: All locations, Not assigned, footer, primary. Filter `primary` → tylko Main Navigation. |
| Bulk select | Checkbox `Select all menus` → toolbar "SELECTED 2" + combobox "Bulk actions" (Publish/Move to Draft/Delete) + Apply/Clear. |
| Page selector w Page Link Type | Lista istniejących stron: Widget UX Audit, Deep Editor Test Page, QA Retest 2026-04-25, HomePage. Wybór → label trzyma się z UUID. |
| Custom URL field | Pole `https://` placeholder, zapisuje wprowadzoną wartość, w liście widoczna pod nazwą itemu. |
| Visibility | 3 opcje: Show to everyone / Only logged-in users / Only logged-out users. |
| Badge tone | 5 opcji: default, accent, success, warning, danger. |
| Sub-menu indent | 24px ml + ↳ + "Sub-item of Home" w treści. |
| Refresh button (editor) | Obecny w toolbarze edytora. |
| Back to menus | Powrót do `/admin/menus` z zachowanym stanem (z listy). |
| Breadcrumb | `Content / Menus / Main Navigation` (Menus jest klikalnym buttonem). |

### UX feel — obserwacje całościowe

**Co świetne:**
- **Pełna parytetyczność z Pages/Posts** — lista, akcje rzędu, bulk select, filtry, paginacja, breadcrumb, save toast — wszystkie wzorce identyczne. Drugie redesign (po wcześniejszej rundzie z list+detail) jest bezbłędne.
- **Dialog item delete** wciąż wygrywa: nazwa + warning + zakres ("Only this item will be removed"). Wzorzec do skopiowania do menu delete.
- **Discard rzeczywiście cofa** — testowane z Menu name: zmiana → "Unsaved changes" → Discard → "All changes saved" + value przywrócone.
- **Status zmiana inline** (Publish z kebabu zmienia Status w tej samej tabeli) — żadnego flicker, żadnego full reload.

**Co zostawia niedosyt:**
- **Customize menu columns** = niewypał. Button widoczny, klik nic nie robi. Poważny pierwszy-wrażeniowy minus dla kogoś próbującego dostosować widok.
- **Icon picker** — UX-4 z poprzednich rund wciąż żyje. Mały token preview ("Current token: home") nie zastępuje listy ani podglądu.
- **A11y radiogroup** — Page/Custom URL bez `role=radio`. Drobne, ale kumuluje się z stale-label w native `<select>`.
- **Menu delete dialog** bez nazwy — niespójne z item delete.

### Screenshoty

- `2026-04-26/menus-retest3/list-view.png` — widok listy z 2 menusami (po Publish Main Navigation)
- `2026-04-26/menus-retest3/editor.png` — edytor `/admin/menus/{uuid}` z item Home (Page link + badge v2 success + ikona + sub-item Blog wcięty)
- `2026-04-26/menus-retest3/customize-columns-no-popover.png` — dowód że button "Customize menu columns" nie otwiera popovera

### Stan testowych danych

Po zakończeniu testów w bazie pozostają:
- Menu **Main Navigation** (Published, primary) — pusty (po wyczyszczeniu items)
- Menu **Footer Menu** (Draft, footer) — pusty

Możliwe pozostałości z wcześniejszych testów innych agentów: nie obserwowano kolizji UUID, lista przed testami była pusta (No menus yet).

---

## Re-retest #3 (2026-04-30) — pełna ścieżka lista + edytor

**Środowisko:** http://localhost:5173/admin/menus, login patryk.ciechanski@patrykiti.pl, sesja `menus-retest-apr30` (izolowana).

**Zakres:** lista (search, filtry Status/Location, kolumny, bulk-select, kebab), Create Menu dialog (walidacja, helper text, toast), edytor menu (Add Item, Page/URL toggle, Badge/Visibility/Icon/Description/Parent, hierarchia sub-menu, Indent/Outdent/Move, Save/Discard, delete item dialog, delete menu dialog), status flow Draft↔Published z edytora i listy.

---

### Status bugów z poprzednich rund

| ID | Tytuł | Status | Obserwacja 2026-04-30 |
|---|---|---|---|
| BUG-1 | window.confirm dla item delete | ✅ **NAPRAWIONY** | Radix dialog "Delete menu item?" z nazwą itemu ("About will be removed…"), Cancel / Delete item. Działa zarówno z ikonki w liście itemów jak i z "Delete Item" w panelu. |
| BUG-2 | Brak wcięcia sub-menu | ✅ **NAPRAWIONY** | `data-menu-depth="1"`, `margin-left: 24px`, tekst "Sub-item of Home" w wierszu. Hierarchia czytelna wizualnie. |
| BUG-3 / UX-2 | "Active menu" combobox | ✅ **NAPRAWIONY** | Nie ma comboboxa — architektura list+detail, breadcrumb "Content / Menus / [nazwa]", button "Menus" wraca do listy. |
| BUG-4 | Brak toasta po Save changes | ✅ **NAPRAWIONY** | Toast "Menu saved." po Save changes. Toast "Menu published." / brak toastu po Move to Draft (toast minął za szybko, ale status się zmienił). Toast po Create: `Menu "Test Menu Apr30" created.` |
| UX-1 | Redundantne ikony | ✅ **NAPRAWIONY** | Każdy wiersz itemu ma rozróżnione: "Open menu item details for X" (klik na wiersz), "Open details for X" (ikonka), "Delete X" (ikonka trash). Jasna semantyka. |
| UX-3 | Brak drag handle | ✅ **NAPRAWIONY** | `cursor-grab` potwierdzone kodu (`window.getComputedStyle`). Ikonka `lucide-grip-vertical` wizualnie. Instrukcja: "Drag from the grip handle to reorder. Drop near the top or bottom…". |
| UX-5 | Location bez wyjaśnienia | ✅ **NAPRAWIONY** | Helper z `<code>primary</code>` i `<code>footer</code>`. W edytorze: "Slot key used by the theme or Navigation widget, for example `primary` or `footer`. Leave empty for menus that are not mounted in a theme slot yet." |
| BUG-N1 | "Customize menu columns" nieaktywny | 🔴 **OTWARTY** | Klik button nie otwiera popovera. `querySelectorAll('[data-state=open]')` = 0. Button widoczny w toolbarze listy — nadal "głuchy". |
| BUG-N2 | Stale label w native `<select>` | 🔴 **OTWARTY** | Native `<select>` dla Parent Item pokazuje "New item" zamiast "About" — zarówno przed Update Item (live) jak i po nim dla innych itemów otwartych w panelu. Regresja vs poprzedni raport który mówił "synchronizuje po Update Item". Teraz NIE synchronizuje wcale. |
| BUG-N3 | Page/Custom URL bez role=radiogroup | 🔴 **OTWARTY** | `role=null`, `aria-pressed=null`, brak `role="radiogroup"` na kontenerze. Brak zmian. |
| BUG-N4 | Menu delete dialog bez nazwy menu | 🔴 **OTWARTY** | Dialog: "Delete menu? Delete this menu? This cannot be undone." — nadal brak nazwy. Niespójne z item delete dialog który ma nazwę. |
| UX-4 | Icon Name bez wizualnego pickera | ⚠️ **CZĘŚCIOWO** | Po Update Item pojawia się `"Current token:" <code>home</code>` pod polem — tylko tekst, NIE wizualna miniatura. Brak listy/autocomplete tokenów. |

---

### Nowe obserwacje 2026-04-30

#### [OBS-1] Przycisk "Refresh" celowo usunięty z toolbar edytora ✅

**Gdzie:** `/admin/menus/{uuid}` → toolbar nagłówka.

**Co się dzieje:** W re-retescie z 2026-04-26 raportowano "Refresh button — Obecny w toolbarze edytora." Teraz go nie ma — i słusznie. Refresh był potrzebny w starym flow z "Active menu" comboboxem (jedna strona dla wszystkich menu). Po redesignie na architekturę list+detail, każdy edytor jest dedykowany jednemu menu — reload strony po prostu wraca do tego samego URL z aktualnym stanem. Discard + nawigacja breadcrumb zastępują Refresh w 100%.

**Ocena:** Celowe, uzasadnione usunięcie. Nie bug.

---

#### [OBS-2] Indent/Outdent przyciski w liście itemów — nowa funkcja ✅

**Gdzie:** Każdy item w Menu Structure → zestaw 6 przycisków akcji.

**Co się dzieje:** Poza Move up/down (znane) widoczne przyciski "Indent [nazwa]" i "Outdent [nazwa]". Testowane:
- Indent: przesuwa item o poziom w dół hierarchii (staje się child poprzedniego), tworzy `data-menu-depth="1"` i `margin-left: 24px`. Działa równoważnie z drag right.
- Outdent: cofa item na poziom wyżej. Działa.
- Przyciski disabled gdy operacja niemożliwa (top-level bez poprzedniego sibling → Indent disabled; depth=0 → Outdent disabled).

**Ocena:** Porządna alternatywa dla drag&drop, szczególnie dla użytkowników klawiaturowych.

---

#### [OBS-3] BUG-N2 pogłębiony — native select nie synchronizuje WCALE po Update Item

**Gdzie:** Edytor menu → panel Edit Menu Item → Parent Item Radix Select → hidden `<select>`.

**Co się dzieje:** Po dodaniu itemu "About" (domyślnie "New item"), zmianie label na "About" i kliknięciu Update Item — native `<select>` dla Parent Item nadal zawiera "New item" zamiast "About". W poprzednim raporcie (2026-04-26) pisano że "Po Update Item native select zostaje zsynchronizowany dla wszystkich INNYCH itemów" — teraz tak się nie dzieje. Bug pogłębiony.

**Skutek:** Screen reader na każdym kolejnym Add Item anonsuje stary label nowo dodanego itemu.

---

### Co działa dobrze — nowe potwierdzenia

| Funkcja | Obserwacja |
|---|---|
| Search po nazwie | "test2" → 1 wynik, clear → 3 wyniki. |
| Status filter | Draft → 3 (wszystkie draft), Published → 0. |
| Location filter | "Not assigned" → 3 (wszystkie bez lokalizacji). Opcje generowane dynamicznie. |
| Bulk select | "Selected 3" + Publish/Move to Draft/Delete z Apply/Clear. |
| Kebab menu w liście | Edit/Publish/Move to Draft (disabled gdy Draft)/Delete — logika disabled prawidłowa. |
| Publish z listy | Status Draft → Published, kolumna Published wypełnia się datą. Toast "Menu published." |
| Move to Draft z listy | Status Published → Draft, data Published znika. Inline, bez page reload. |
| Publish z edytora | Button Publish → toast "Menu published.", status badge "Published", button → "Move to Draft". |
| Move to Draft z edytora | Button Move to Draft → status → "Draft", button → "Publish". |
| Create Menu walidacja | Pusty input → "Menu name is required." inline pod polem. |
| Create Menu helper | Location z `<code>primary</code>` / `<code>footer</code>` inline. |
| Create Menu toast | `Menu "Test Menu Apr30" created.` — widoczny. |
| Page dropdown w Link Type | Lista stron ładuje się: QA Pages Audit 2026-04-30, HomePage, Widget UX Audit, Deep Editor Test Page, QA Retest 2026-04-25. |
| Custom URL toggle | Przełączenie → URL Path z `https://` placeholder. |
| Badge Tone | 5 opcji: default/accent/success/warning/danger. |
| Visibility | 3 opcje: Show to everyone / Only logged-in users / Only logged-out users. |
| Hierarchia 24px | `data-menu-depth="1"`, `margin-left: 24px`, "Sub-item of [parent]". |
| Parent Item disabled self | "About" disabled gdy edytujemy "About" — zapobiega circular dependency. |
| Breadcrumb | Content / Menus / [nazwa] z klikalnym buttonem "Menus". |
| Discard | Przywraca zmiany, status → "All changes saved". |
| Save changes | Toast "Menu saved.", przyciski Discard/Save → disabled. |
| Delete menu alert | Radix dialog "Delete menu?" — menu znika z listy po potwierdzeniu. |
| Move up/down | Zmiana kolejności itemów. |
| Indent/Outdent | Tworzenie i cofanie hierarchii przez przyciski (alternatywa dla drag). |
| Drag handle | `cursor-grab` potwierdzone CSS, ikonka grip-vertical. |

---

### UX feel — obserwacje całościowe 2026-04-30

**Co jest super:**
- Pełny coverage funkcji CRUD z właściwym stanem przycisków (disabled gdy niedostępne).
- Indent/Outdent jako klawiaturowa alternatywa dla drag — solidny UX dla dostępności.
- Toast feedback spójny: created, saved, published.
- Hierarchia sub-menu działa bezbłędnie przez 3 drogi: drag, Indent button, Parent dropdown.

**Co wymaga uwagi:**
- **BUG-N1** — "Customize menu columns" to deadweight UI. Widoczny przycisk bez funkcji szkodzi zaufaniu do UI.
- **BUG-N2** — native `<select>` stale label po rename — teraz NIE synchronizuje się nawet po Update Item (regresja).
- **BUG-N3** — brak `role="radiogroup"` na toggle Page/Custom URL — pomijany przez screen readery.
- **BUG-N4** — dialog usuwania menu bez nazwy — niespójność z item delete.
- **OBS-1** — Refresh usunięty celowo (był zbędny w architekturze per-menu editor). ✅
- **UX-4** — Icon Name bez wizualnego podglądu — content manager nie wie co wpisać.

### Screenshoty (2026-04-30)

- `screenshots/2026-04-30/menus-full/01-list-view.png` — widok listy (3 menu: test/test2/tesy3)
- `screenshots/2026-04-30/menus-full/02-customize-columns-no-popover.png` — BUG-N1: button aktywny, brak popovera
- `screenshots/2026-04-30/menus-full/03-kebab-menu.png` — kebab: Edit/Publish/Move to Draft (disabled)/Delete
- `screenshots/2026-04-30/menus-full/04-bulk-select.png` — "Selected 3" + Bulk actions
- `screenshots/2026-04-30/menus-full/05-create-menu-dialog.png` — dialog tworzenia z helper location
- `screenshots/2026-04-30/menus-full/06-create-menu-validation.png` — "Menu name is required." inline
- `screenshots/2026-04-30/menus-full/07-editor-empty.png` — edytor pustego menu (brak Refresh w toolbarze)
- `screenshots/2026-04-30/menus-full/08-item-home-configured.png` — item Home: Page/Badge/Icon skonfigurowany
- `screenshots/2026-04-30/menus-full/09-submenu-indent.png` — "Sub-item of Home" z 24px indent
- `screenshots/2026-04-30/menus-full/10-delete-item-dialog.png` — BUG-1 naprawiony: Radix dialog z nazwą "About"
- `screenshots/2026-04-30/menus-full/11-editor-toolbar.png` — toolbar edytora (Discard/Save/Publish, bez Refresh)
- `screenshots/2026-04-30/menus-full/12-delete-menu-dialog-no-name.png` — BUG-N4: dialog bez nazwy menu
- `screenshots/2026-04-30/menus-full/13-final-state.png` — końcowy stan edytora

### Stan testowych danych po teście

Przed testem: test (Draft), test2 (Draft), tesy3 (Draft) — 3 menu bez itemów.
Po teście: test (Draft, 2 itemy: Home/Cos w oryginalnej kolejności po Discard), test2 (Draft), tesy3 (Draft).
Menu "Test Menu Apr30" — utworzone i usunięte w ramach testu.
