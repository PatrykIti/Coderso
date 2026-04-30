# Raport UX/QA — sekcja Custom Screens (Admin UI)

**Data testów:** 2026-04-30
**Tester:** Claude (playwright-cli, sesja izolowana `screens-test`)
**Środowisko:** http://localhost:5173/admin/advanced/custom-screens
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl
**Poprzedni raport:** `SUMMARY-SCREENS.md` (2026-04-22)

---

## Status bugów z poprzedniego raportu

| ID | Tytuł | Status |
|---|---|---|
| BUG-1 | Delete screen — brak potwierdzenia i brak toast | ✅ **NAPRAWIONY** |
| BUG-2 | "Back to list" z niezapisanymi zmianami — brak ostrzeżenia | ❌ **NADAL OBECNY** |
| BUG-3 | Brak toast po "Save screen" / "Save record" | ❌ **NADAL OBECNY** |
| BUG-4 | Usunięcie widgetu — brak potwierdzenia | ❌ **NADAL OBECNY** |
| BUG-5 | Richtext field renderuje się jako textarea | ⚠️ **NIE MOŻNA PRZETESTOWAĆ** (patrz BUG-NEW-1) |
| BUG-6 | Brak statusu "Archived" | ❌ **NADAL OBECNY** |

---

## Nowe bugi

### [BUG-NEW-1] KRYTYCZNY: 500 Internal Server Error przy tworzeniu entry — wiele content types

**Gdzie:** Records list screena → "New record" → wypełnienie formularza → "Create Draft"

**Co się dzieje:** API zwraca 500 przy tworzeniu nowego rekordu dla przynajmniej dwóch content types:
- `notes-cfec6a03-ab6d-4dd9-b827-e5d486049756` → `POST /admin/api/content/notes-cfec6a03.../entries` → **500**
- `article-qa-test-2026` → `POST /admin/api/content/article-qa-test-2026/entries` → **500**

Widoczny efekt: dialog tworzenia rekordu pozostaje otwarty (nie zamknął się), tabela nadal pokazuje "No records yet." Brak komunikatu błędu dla użytkownika — tylko console error.

**Wpływ:** Niemożność tworzenia nowych rekordów przez custom screen dla tych content types. BUG-5 (richtext w record edytorze) nie mógł być przetestowany z powodu tego błędu.

**Kierunek naprawy:** Sprawdzić czy tabele bazodanowe dla tych content types istnieją i są poprawnie zmigrowane. Dodać czytelny komunikat błędu dla użytkownika zamiast cichego failowania.

---

### [BUG-NEW-2] ŚREDNI: Delete rekordu z records list — brak potwierdzenia

**Gdzie:** Records list screena → menu "..." przy rekordzie → "Delete"

**Co się dzieje:** Kliknięcie "Delete" usuwa rekord natychmiastowo bez żadnego potwierdzenia. Analogiczny problem jak stary BUG-1 (delete screen), który już naprawiono — ale records list jeszcze nie ma tej ochrony.

**Zaobserwowane:** Rekord "Test /test draft" w screenie "Test" (Screen 2dcaeaad) został usunięty bez potwierdzenia jednym kliknięciem.

**Kierunek naprawy:** Dodać Radix AlertDialog identyczny jak przy delete screena ("Usuń rekord? Ta operacja jest nieodwracalna."). Wzorzec jest już zaimplementowany dla delete screen — wystarczy przenieść go na records list.

---

## Status UX-issues z poprzedniego raportu

| ID | Tytuł | Status |
|---|---|---|
| UX-1 | Duplikaty w dropdown Content type | ❌ **GORZEJ** — jeszcze więcej "Screen xxx", "Route Docs", "Route Stories" |
| UX-2 | Library — tylko 4 widgety | ❌ **BEZ ZMIAN** — nadal 4 widgety |
| UX-3 | "Widget prop path" domyślnie "align" | ❌ **NADAL OBECNY** |
| UX-4 | Brak wyszukiwarki / filtrów na liście screens | ✅ **NAPRAWIONY** |
| UX-5 | Drag-and-drop z library — niejasne | ❌ **BEZ ZMIAN** — canvas nadal mówi "Drag..." |

---

## Szczegóły naprawionych bugów / UX

### ✅ BUG-1 naprawiony: Delete screen ma teraz AlertDialog

Po kliknięciu Delete w menu "..." screena pojawia się dialog:
- Tytuł: "Delete custom screen?"
- Treść: "Delete this custom screen? This cannot be undone."
- Przyciski: "Cancel" + "Delete custom screen"

Anulowanie zachowuje screen na liście. Działanie poprawne.

### ✅ UX-4 naprawiona: Lista screens ma wyszukiwarkę i filtry

- Pole wyszukiwania: "Search custom screens..." — filtruje w czasie rzeczywistym
- Filtr Status: All / Active / Draft
- Filtr Content type: lista wszystkich content types (zaśmiecona, ale działa)
- Przycisk "Custom screen columns" (toggle kolumn) — działa

---

## Nowe funkcje (nie było w poprzednim raporcie)

### Nowa kolumna Mode w tabeli screens

Tabela screens ma nową kolumnę **Mode** z dwoma wartościami:
- **Collection** — screen bez widgetów na canvasie; "Open records" prowadzi do uproszczonej listy rekordów z linkiem do Classic editor. Pojawia się pomocny komunikat: *"This shortcut narrows the records list for the selected content type. Add dedicated screen widgets and field bindings in the builder if you want a custom record screen instead of the classic editor."*
- **Editor** — screen z widgetami na canvasie; "Edit record" prowadzi do custom screen record editora

### Menu screena: "Activate" / "Move to draft"

Kontekstowe opcje zależne od statusu:
- Draft → menu zawiera **"Activate"**
- Active → menu zawiera **"Move to draft"**

### Block tab — nowe zakładki Wizard / Visual / Advanced

Po kliknięciu "Continue to layout and styling" w Block tab, panel przechodzi do trybu z 3 zakładkami:

**Visual:**
- Variant selector (Card / Compact)
- **"Add variant preset"** — nowy przycisk (nie testowany)
- Pola Content (Eyebrow, Title, Subtitle, Description, Badge)
- Alignment

**Advanced:**
- Wszystkie pola z Visual
- Sekcja **Layout (Tokens only)**: Container, Padding top, Padding bottom, Margin top, Margin bottom
- Sekcja **Visibility**: przełączniki Desktop / Tablet / Mobile (domyślnie wszystkie włączone)

### Sidebar shortcut: logika poprawnie spięta ze statusem

- Screen Draft + sidebar on → nie pojawia się w sidebarze (prawidłowo)
- Screen Active + sidebar on → pojawia się jako link w sidebarze z właściwym URL do records list

### Screen tab: nowe pole "Open in builder after create"

Podczas tworzenia screena w dialogu "Create Custom Screen" dostępny jest checkbox **"Open in builder after create"** który automatycznie przenosi do editora po stworzeniu screena.

---

## Szczegółowe wyniki testów przepływów

### Lista screens — ✅ Działa

| Funkcja | Wynik |
|---|---|
| Wyszukiwarka "Search custom screens..." | ✅ Działa |
| Filtr Status (All / Active / Draft) | ✅ Działa |
| Filtr Content type | ✅ Działa (lista zaśmiecona duplikatami) |
| Przycisk "Custom screen columns" | ✅ Działa |
| Kolumna Mode (Collection/Editor) | ✅ Działa — nowa funkcja |
| Kolumna Sidebar | ✅ Działa — "Visible / Not shown" |
| Menu "..." → Records | ✅ Działa |
| Menu "..." → Edit | ✅ Działa |
| Menu "..." → Activate (dla Draft) | ✅ Działa |
| Menu "..." → Move to draft (dla Active) | ✅ Działa |
| Menu "..." → Delete | ✅ Działa z AlertDialog (BUG-1 naprawiony) |

### Tworzenie screena — ✅ Działa

| Funkcja | Wynik |
|---|---|
| Dialog "Create Custom Screen" | ✅ Formularz: nazwa, content type, status, sidebar shortcut |
| Walidacja wymaganego pola | ✅ "Create Custom Screen" disabled bez nazwy |
| "Open in builder after create" | ✅ Przenosi do editora po stworzeniu |
| URL po stworzeniu | ✅ UUID-based URL |

### Edytor screena — Canvas

| Funkcja | Wynik |
|---|---|
| Dodawanie widgetu przyciskiem "+" | ✅ Działa |
| Usuwanie widgetu | ✅ Działa (bez potwierdzenia — BUG-4) |
| Duplicate widget | ✅ Działa |
| Move up / Move down | ✅ Działa; first/last correctly disabled |
| "Unsaved changes" badge | ✅ Pojawia się natychmiastowo |
| "Back to list" z Unsaved changes | ❌ Nawiguje bez ostrzeżenia (BUG-2) |
| Wyszukiwarka "Find components..." | ✅ Filtruje widgety w czasie rzeczywistym |
| Przycisk Preview / Builder | ✅ Przełącza tryby |
| "Bound preview" label | ✅ Wyświetla sample data |
| "Open records" | ✅ Nawiguje do records list |
| "Save screen" | ✅ Zapisuje ale bez toast (BUG-3) |

### Edytor screena — Screen tab

| Funkcja | Wynik |
|---|---|
| Screen name editable | ✅ Działa |
| Content type zmiana | ✅ Dropdown (zaśmiecony duplikatami) |
| Status Draft/Active | ✅ Działa |
| Sidebar shortcut toggle | ✅ ON = Sidebar label aktywny; OFF = Sidebar label disabled |
| Sidebar label editable | ✅ Gdy switch on |

### Edytor screena — Bindings tab

| Funkcja | Wynik |
|---|---|
| "Add binding" | ✅ Tworzy nowy binding |
| Widget prop path default value | ❌ Domyślnie "align" (UX-3) |
| Content field dropdown | ✅ Pola z typami |
| Mode (Read/write, Read only, Write only) | ✅ Trzy opcje |
| Usuwanie bindingu | ✅ Przycisk X przy bindingu |

### Edytor screena — Block tab

| Funkcja | Wynik |
|---|---|
| Wizard: Card/Compact variant | ✅ Działa |
| Wizard: Content fields (Eyebrow/Title etc.) | ✅ Edytowalne |
| Wizard: Alignment dropdown | ✅ Działa |
| "Continue to layout and styling" | ✅ Otwiera Visual/Advanced tabs |
| Visual: Add variant preset | ⚠️ Przycisk istnieje, nie przetestowano |
| Advanced: Layout tokens | ✅ Container, Padding, Margin |
| Advanced: Visibility (Desktop/Tablet/Mobile) | ✅ Trzy przełączniki |

### Records list — Mixed

| Funkcja | Wynik |
|---|---|
| Tabela rekordów | ✅ Działa |
| "New record" button | ✅ Otwiera Create dialog |
| Create record — API call | ❌ 500 na Notes i Article QA (BUG-NEW-1) |
| Record delete | ❌ Bez potwierdzenia (BUG-NEW-2) |
| Record menu — "Edit record" | ✅ (gdy widgety skonfigurowane) |
| Record menu — "Classic editor" | ✅ Nawiguje do classic Entries editor |
| "Open builder" button | ✅ Nowy przycisk, wraca do screen editora |

---

## Błędy w konsoli przeglądarki

| Typ | Treść |
|---|---|
| WARNING | "Select is changing from uncontrolled to controlled. Components should not switch from controlled to uncontrolled" — pojawia się po dodaniu widgetu Screen Record Header |
| ERROR | "Failed to load resource: 500 Internal Server Error" — przy Create Draft dla Notes i Article QA content types |

---

## Screenshoty

- `screens-list.png` — lista screens z nowymi kolumnami (Mode, Sidebar) i filtrami
- `delete-confirmation-dialog.png` — BUG-1 naprawiony: AlertDialog przed usunięciem screena
- `screen-editor-empty.png` — edytor nowego screena (pusty canvas)
- `screen-with-widget.png` — Screen Record Header na canvasie + Unsaved changes badge
- `after-save-screen.png` — po Save screen (brak toast — BUG-3)
- `bindings-prop-dropdown.png` — Widget prop path z wartością "align" (UX-3)
- `screen-preview-mode.png` — tryb Preview ("Bound preview")
- `screen-active.png` — screen ze statusem Active + visible w sidebarze
- `screens-list-columns.png` — przycisk "Custom screen columns"
