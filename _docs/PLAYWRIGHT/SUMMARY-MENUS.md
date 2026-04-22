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
