# Raport UX/QA — sekcja Custom Screens (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/custom-screens
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Co to jest i co przetestowano

Custom Screens to kreator niestandardowych widoków administracyjnych powiązanych z content types. Każdy screen składa się z widgetów ułożonych na canvasie (Screen Record Header, Screen Field Value, Screen Field Group, Screen Two Column). Screens mogą wyświetlać rekordy danego content type i dostarczać uproszczonego formularza edycji zawierającego tylko pola zmapowane przez bindingi.

**Przetestowane przepływy:**

- Lista screens — tabela Screen / Content type / Status / Updated / Actions
- Tworzenie nowego screena ("Test Screen") — formularz: Screen name, Content type, Status, Sidebar shortcut
- Kreator screena: canvas (środek), library widgetów (lewo), panel ustawień (prawo)
- Dodawanie widgetów przez przycisk "+" w library
- Zakładka "Screen" — Screen name, Content type, Status, Sidebar shortcut, Sidebar label
- Zakładka "Bindings" — Add binding, Widget prop path, Content field, Read/Write mode
- Zakładka "Block" — Wizard: Header Variant (Card/Compact), pola tekstowe (Eyebrow, Title, Subtitle, Description, Badge), Alignment
- Preview mode ("Bound preview")
- "Create screen" → nawigacja do edytora, zmiana przycisku na "Save screen"
- "Open records" → lista rekordów content type ze statusami i datami
- Akcje wiersza w records list: "Edit record", "Classic editor", "Delete"
- Edytor rekordu przez custom screen (zbound fields, Save record)
- Przycisk "Classic editor" — fallback do edytora Entries
- Usuwanie widgetu z canvasu
- "Back to list" z niezapisanymi zmianami
- Usuwanie screena z listy przez menu "..."
- Wyszukiwarka widgetów "Find components..."
- Status dropdown screena (Draft / Active)
- Sidebar shortcut toggle
- Istniejące screeny: test111 (Notes, active), test (testowy, draft)

---

## Bugi

### [BUG-1] KRYTYCZNY: Delete screen — brak potwierdzenia i brak toast

**Gdzie:** Lista screens → menu "..." (Records / Edit / Delete) → opcja "Delete"

**Co się dzieje:** Kliknięcie "Delete" usuwa screen natychmiastowo, bez żadnego potwierdzenia i bez komunikatu sukcesu (toast). Screen znika z listy bez śladu. Użytkownik który kliknął Delete przez pomyłkę nie ma żadnej szansy na cofnięcie. Nawet sekcje z window.confirm() (Menus, Entries) mają jakiś barrier — tutaj nie ma nic.

**Kierunek naprawy UI:** Dodać Radix AlertDialog przed usunięciem ("Usuń screen?" + "Ta operacja jest nieodwracalna." + przyciski "Usuń" / "Anuluj"). Po udanym usunięciu — toast "Screen usunięty". To jest minimalny standard ochrony przed przypadkowym kliknięciem.

---

### [BUG-2] ŚREDNI: "Back to list" z niezapisanymi zmianami — brak ostrzeżenia

**Gdzie:** Edytor screena → przycisk "Back to list" gdy widoczny badge "Unsaved changes"

**Co się dzieje:** Gdy screen ma niezapisane zmiany (widoczny badge "Unsaved changes" w rogu), kliknięcie "Back to list" natychmiastowo nawiguje do listy i traci wszystkie zmiany bez pytania. Użytkownik który pomyłkowo kliknął lub chciał najpierw zapisać — traci pracę bez ostrzeżenia.

**Kierunek naprawy UI:** Interceptować nawigację gdy `isDirty === true`. Dialog: "Masz niezapisane zmiany. Wyjść bez zapisywania?" + "Zapisz i wyjdź" / "Wyjdź bez zapisu" / "Anuluj". Wzorzec stosowany w Pages editor (alert "UNSAVED CHANGES" informuje, chociaż nie blokuje).

---

### [BUG-3] ŚREDNI: Brak toast po "Create screen", "Save screen", "Save record"

**Gdzie:** Edytor screena → przycisk "Create screen" / "Save screen" / "Save record"

**Co się dzieje:** Wszystkie trzy operacje zapisu nie dają żadnego wizualnego feedbacku sukcesu. Jedyną wskazówką po "Create screen" jest zmiana URL i zmiana etykiety przycisku na "Save screen". Po "Save screen" i "Save record" — absolutnie żaden sygnał. Badge "Unsaved changes" znika, ale to subtelny sygnał który łatwo przeoczyć.

**Kierunek naprawy UI:** Toast po każdej akcji zapisu: "Screen zapisany" / "Rekord zaktualizowany" — tak samo jak we wszystkich innych sekcjach Admin UI. Spójna reguła: każda akcja zapisu → toast sukcesu lub błędu.

---

### [BUG-4] ŚREDNI: Usunięcie widgetu z canvasu — brak potwierdzenia

**Gdzie:** Edytor screena → canvas → widget → przycisk usuń (X)

**Co się dzieje:** Kliknięcie przycisku usunięcia widgetu (ikonka X obok widgetu na canvasie) usuwa go natychmiastowo bez żadnego potwierdzenia. Jeśli widget miał skonfigurowane bindingi, te są też utracone. Operacja nieodwracalna bez przycisku Undo.

**Kierunek naprawy UI:** Opcja (a): potwierdzenie prostym Radix AlertDialog gdy widget ma bindingi ("Widget ma skonfigurowane bindingi. Usunąć?"). Opcja (b): miękkie usunięcie z 5-sekundowym undo toast ("Widget usunięty — Cofnij"). Opcja b jest bardziej płynna dla częstego użycia.

---

### [BUG-5] ŚREDNI: Bound richtext field nadal renderuje się jako textarea w edytorze rekordu

**Gdzie:** Edytor rekordu przez custom screen → `/custom-screens/{id}/entries/{entry-id}` → sekcja "Bound fields"

**Co się dzieje:** Pola richtext zmapowane przez bindingi w custom screen renderują się jako zwykłe `<textarea>` zamiast blokowego edytora — identyczny problem jak BUG-2 w SUMMARY-ENTRIES.md. Custom screen nie naprawia leżącego u podstaw błędu renderowania pola richtext. Użytkownik edytujący rekord przez custom screen traci formatting capabilities.

**Kierunek naprawy UI:** Ta naprawa jest po stronie komponentu renderującego pola wg typu schematu — zarówno w Entries jak i w custom screen record edytorze. Typ "rich text" → blokowy edytor (jak w Posts). Dotyczy wszystkich miejsc renderowania pól entry.

---

### [BUG-6] NISKI: Status screena tylko "Draft" / "Active" — brak "Archived"

**Gdzie:** Edytor screena → prawy panel → zakładka Screen → combobox Status

**Co się dzieje:** Status screena ma tylko dwa stany: Draft i Active. Brak możliwości archiwizacji screena bez jego usunięcia — np. gdy screen jest przestarzały ale chcemy zachować jego konfigurację. To minor gap, ale spójny ze wzorcem statusów w reszcie systemu (Draft/Published/Archived).

**Kierunek naprawy UI:** Rozważyć dodanie trzeciego stanu "Archived" — screen niewidoczny w bocznym menu i na liście rekordów (dla użytkowników), ale zachowany w systemie dla ewentualnego przywrócenia.

---

## Problemy UX

### [UX-1] Duplikaty "Notes" w dropdownie Content type (3×)

**Gdzie:** Nowy screen → prawy panel → zakładka Screen → combobox "Content type"

**Problem:** Dropdown zawiera 3× "Notes" bez żadnego rozróżnienia (brak sluga). Użytkownik nie wie który "Notes" wybrać. Identyczny problem jak w Engine (Relation field) i Entries (sidebar type list). Zaśmiecone dane (zduplikowane content types) produkują zaśmiecony dropdown.

**Kierunek naprawy UI:** W dropdownie pokazywać slug obok nazwy: `Notes (notes-abc1...)`. Docelowo — posprzątanie bazy przez usunięcie zduplikowanych content types (powiązane z BUG-2 w SUMMARY-ENGINE.md).

---

### [UX-2] Library widgetów — tylko 4 widgety, brak rozbudowanych opcji

**Gdzie:** Edytor screena → lewy panel (library)

**Problem:** Library zawiera wyłącznie 4 widgety: Screen Record Header, Screen Field Value, Screen Field Group, Screen Two Column. Dla sekcji "Custom Screens" (czyli admin UI builder) to bardzo skromna oferta. Brak: tabeli powiązanych rekordów, wykresu, listy aktywności/logów, rich text viewer, sekcji statystyk, embedów itp. Użytkownik ma bardzo ograniczone możliwości kompozycji widoku.

**Kierunek naprawy UI:** Docelowo rozszerzać library o kolejne widgety zgodnie z potrzebami użytkowników. Krótkoterminowo — jasno zakomunikować że library jest w fazie beta i będzie rozbudowywana (np. sekcja "Coming soon" na końcu listy). Opcjonalnie: pozwolić na tworzenie custom widgetów przez devów (jak Strapi plugins).

---

### [UX-3] "Widget prop path" domyślnie pokazuje "align" zamiast semantycznej nazwy

**Gdzie:** Edytor screena → prawy panel → zakładka Bindings → "Add binding" → combobox "Widget prop path"

**Problem:** Po kliknięciu "Add binding" combobox "Widget prop path" domyślnie pokazuje wartość "align" — co nie jest intuicyjnym pierwszym wyborem dla nagłówka rekordu. Etykieta comboboxa mówi "heading.title" (co sugeruje że to jest opcja/placeholder), ale value jest "align". Użytkownik nie rozumie co właściwie musi zmienić.

**Kierunek naprawy UI:** Domyślna wartość po "Add binding" powinna być pusta (placeholder: "Wybierz właściwość widgetu...") albo pierwsza semantyczna właściwość (np. "heading.title"). Lista opcji w dropdownie powinna zawierać czytelne opisy: "heading.title — tytuł nagłówka rekordu", nie surowe ścieżki.

---

### [UX-4] Brak wyszukiwarki / filtrów na liście screens

**Gdzie:** Lista /admin/coderso/custom-screens

**Problem:** Lista screens nie ma pola wyszukiwania ani filtra statusu. Przy rosnącej liczbie screenów zarządzanie listą będzie trudne. Już teraz "testowy", "testowy2", "test3" i podobne pojawiają się obok produkcyjnych screenów.

**Kierunek naprawy UI:** Dodać search bar nad tabelą (filtrowanie po nazwie screena / content type) + filtr Status (All / Draft / Active). Wzorzec jak w Pages i Posts.

---

### [UX-5] Drag-and-drop z library na canvas — niejasne czy działa

**Gdzie:** Edytor screena → canvas

**Problem:** Tekst canvasu mówi "Drag dedicated screen widgets from the library". Tymczasem jedyną działającą metodą jest kliknięcie przycisku "+" obok widgetu w library. Próba ciągnięcia widgetu z library na canvas jest niejasna (brak wizualnego feedbacku drag zone, drop target, preview przy drag). Użytkownik który próbuje drag-and-drop może myśleć że feature nie działa.

**Kierunek naprawy UI:** Jeśli drag-and-drop jest zaimplementowany — dodać wizualny feedback: outline drop zone na canvasie podczas drag, ghost preview widgetu pod kursorem. Jeśli nie jest zaimplementowany — zmienić copy na "Click + to add widgets from the library" i nie wspominać o drag.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Po "Create screen" → nawigacja do edytora | Dobry flow — nie wymaga ręcznego szukania na liście |
| Zakładka "Bindings" — lista pól content type z typem | `content (richtext)`, `excerpt (text)` — czytelne, z kontekstem |
| Read/Write mode w bindingu | Pozwala kontrolować czy pole jest edytowalne czy tylko do odczytu |
| Zakładka "Block" → Wizard konfiguracji widgetu | Variant (Card/Compact), pola tekstowe, Alignment — przemyślane |
| Preview mode → label "Bound preview" | Jasny komunikat że używa sample data |
| "Open records" → lista rekordów content type | Seamless przejście do zarządzania rekordami |
| Records list: "Edit record", "Classic editor", "Delete" | Dobre opcje — fallback do classic editor dla pełnych możliwości |
| "Back to records" w edytorze rekordu | Spójna nawigacja w ramach custom screen flow |
| Sidebar shortcut → aktywuje textbox Sidebar label | Logiczne: label edytowalny tylko gdy shortcut włączony |
| Wyszukiwarka "Find components..." w library | Filtruje widgety w czasie rzeczywistym |
| "Unsaved changes" badge | Pojawia się natychmiastowo po modyfikacji |
| Status "Active" / "Draft" — logiczne rozróżnienie | Draft = ukryty, Active = dostępny dla rekordów |
| Widget delete — brak animacji, natychmiastowe | Szybkie (mimo braku potwierdzenia) |
| "New screen" → naviguje do /custom-screens/new | Czysty URL |

---

## Screenshoty

- `screens-list.png` — lista screens: test111 (active), test (draft)
- `new-screen-editor.png` — pusty edytor nowego screena (canvas + library + prawy panel)
- `new-screen-with-content-type.png` — po wyborze Content type "Post"
- `widget-added.png` — Screen Record Header dodany do canvasu
- `add-binding.png` — zakładka Bindings po kliknięciu "Add binding"
- `binding-prop-dropdown.png` — dropdown "Widget prop path" (wartość "align")
- `content-field-dropdown.png` — dropdown Content field z polami Post: content, excerpt, document, featured, featuredImage
- `block-tab-wizard.png` — zakładka Block z wizard: Card/Compact variant, pola Eyebrow/Title/Subtitle/Description/Badge
- `screen-preview.png` — Preview mode ("Bound preview")
- `after-create.png` — edytor po "Create screen" (URL z UUID, przycisk "Save screen")
- `screen-records-list.png` — lista rekordów Test Screen: My First Article (published), Product (draft)
- `record-actions-menu.png` — menu rekordu: "Edit record", "Classic editor", "Delete"
- `custom-screen-record-editor.png` — edytor rekordu przez custom screen: "Bound fields" z textarea
- `screen-row-menu.png` — menu screena na liście: "Records", "Edit", "Delete"
- `test111-editor.png` — edytor test111 (pusty canvas, Screen tab)
- `sidebar-shortcut.png` — Sidebar shortcut włączony → textbox Sidebar label aktywny
- `status-dropdown.png` — Status dropdown: Draft / Active
