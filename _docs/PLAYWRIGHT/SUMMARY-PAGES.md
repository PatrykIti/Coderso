# Raport UX/QA — sekcja Pages (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/pages
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Tworzenie nowej strony (Homepage)
- Dodawanie i konfiguracja widgetów (Hero + Feature Grid przez Wizard)
- Save draft / Publish
- Page settings, History
- Runtime preview
- Lista stron: wyszukiwarka, filtry, menu akcji (...)

---

## Bugi

### [BUG-1] KRYTYCZNY: Bulk select nie działa

**Gdzie:** Lista stron → checkbox "Select all pages"

**Co się dzieje:** Kliknięcie "Select all" zaznacza tylko checkbox w nagłówku tabeli, ale checkboxy przy poszczególnych wierszach pozostają niezaznaczone. Nie pojawia się żaden toolbar z bulk akcjami. DOM potwierdza: header `[checked]`, wiersze bez atrybutu `checked`.

---

### [BUG-2] ŚREDNI: Autor strony = "Unknown" dla nowych stron

**Gdzie:** Lista stron → kolumna Author

**Co się dzieje:** Nowo tworzone strony wyświetlają autora jako "N Unknown" zamiast nazwy zalogowanego użytkownika. Przy stronach tworzonych wcześniej (about, cos — autor Patryk) działa poprawnie. Prawdopodobnie problem z przypisywaniem autora przy tworzeniu przez dialog "Create New Page".

---

### [BUG-3] ŚREDNI: "Loading template options..." nie kończy się

**Gdzie:** Page Settings → sekcja "Template and navigation" → pod dropdownem Template

**Co się dzieje:** Tekst `Loading template options...` permanentnie pozostaje pod dropdownem — nigdy nie znika. Dropdown działa (pokazuje "Custom (landing)"), ale wisząca informacja o ładowaniu sugeruje błąd lub nierozwiązany stan asynchroniczny.

---

### [BUG-4] ŚREDNI: Przyciski akcji widgetu bez aria-label i tooltipów

**Gdzie:** Edytor strony → toolbar na karcie każdego widgetu (4 ikonki: góra, dół, duplikuj, usuń)

**Co się dzieje:** Żaden z przycisków toolbaru widgetu nie ma `aria-label`, `title` ani tooltipa. Brak dostępności (accessibility) i brak jasnej informacji co dany przycisk robi. Sprawdzone przez `el.getAttribute('aria-label')` — zwraca `null`.

---

### [BUG-5] NISKI: Ostrzeżenia Radix UI w konsoli

**Gdzie:** Konsole przeglądarki (wielokrotnie)

**Co się dzieje:** `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}` — pojawia się przy każdym otwarciu dialogów (Create Page, Page Settings, History). Problem z brakującymi opisami w komponentach Radix UI.

---

## Problemy UX

### [UX-1] Brak feedbacku po Save draft i Publish

**Gdzie:** Edytor → przyciski "Save draft" i "Publish"

**Problem:** Po kliknięciu nie pojawia się żaden toast ani powiadomienie. Jedynym sygnałem sukcesu jest znikający napis "UNSAVED CHANGES" (save) lub zmiana badge'a DRAFT→PUBLISHED (publish). To zbyt subtelne — użytkownik może nie wiedzieć że akcja się wykonała.

**Sugestia:** Dodać toast notification ("Saved", "Published successfully").

---

### [UX-2] Canvas nie scrolluje automatycznie do nowego widgetu

**Gdzie:** Edytor → dodanie widgetu poniżej foldu

**Problem:** Po kliknięciu "+" przy widgecie (np. Feature Grid), nowy blok dodaje się na końcu strony, ale canvas nie przewija się do niego. Użytkownik musi ręcznie scrollować canvas by znaleźć nowo dodany widget.

**Sugestia:** Po dodaniu widgetu — auto-scroll canvas do nowego elementu.

---

### [UX-3] Przycisk "Create Page" disabled bez wyjaśnienia

**Gdzie:** Dialog "Create New Page" → przycisk Create Page

**Problem:** Przycisk jest `disabled` dopóki nie zostanie wpisany tytuł, ale nie ma tooltipa ani helptextu tłumaczącego dlaczego. Nowy użytkownik może być zdezorientowany.

**Sugestia:** Dodać helper text np. "Enter a page title to continue" lub tooltip na disabled button.

---

### [UX-4] Lista widgetów bez kategoryzacji

**Gdzie:** Edytor → lewy panel z listą widgetów

**Problem:** Ponad 30 widgetów w płaskiej, niegrupowanej liście. Brak podziału na kategorie (Layout, Content, Commerce, Forms, itp.). Znalezienie konkretnego widgetu wymaga scrollowania przez całą listę.

**Sugestia:** Pogrupować widgety w sekcje z nagłówkami lub dodać collapsed accordion per kategoria.

---

### [UX-5] Runtime preview — błąd bez komunikatu

**Gdzie:** Edytor → przycisk "Runtime preview" (wewnątrz edytora, jako iframe)

**Problem:** Gdy frontend nie jest uruchomiony pod adresem z konfiguracji (np. localhost:3000), iframe pokazuje ikonkę zepsutego dokumentu bez żadnego tekstu błędu ani wskazówki. Użytkownik nie wie co jest nie tak.

**Sugestia:** Dodać czytelny fallback w iframie z komunikatem np. "Frontend preview unavailable. Make sure your site is running at [URL]."

*Uwaga: Runtime preview działające poprawnie (otwieranie w nowej karcie przez menu "...") działa bez zarzutu po poprawnej konfiguracji.*

---

### [UX-6] Przejście Wizard → Layout view niejasne

**Gdzie:** Edytor → prawy panel po "Complete setup" w trybie Wizard

**Problem:** Po kliknięciu "Complete setup" wizard nie zamknął się — panel przełączył się w tryb wyboru wariantu layoutu (Centered / Media Right / Media Left) bez żadnego nagłówka wyjaśniającego co to jest i co użytkownik ma teraz zrobić.

**Sugestia:** Dodać nagłówek/opis sekcji "Choose layout variant" lub wyraźnie oddzielić etapy konfiguracji.

---

### [UX-7] Slot "Hero Content" bez opisu

**Gdzie:** Edytor → canvas → widget Hero → sekcja "HERO CONTENT"

**Problem:** Slot wyświetla "Empty slot." bez żadnej wskazówki co można w nim umieścić ani jak (drag & drop? kliknięcie?).

**Sugestia:** Dodać pomocniczy tekst np. "Drag a widget here or click + to add content".

---

### [UX-8] Wording w Page Settings mylący

**Gdzie:** Page Settings → stopka drawera

**Problem:** Tekst "Save settings or close the drawer to keep one autosave snapshot" — zwrot "autosave snapshot" jest technicznym żargonem niezrozumiałym dla przeciętnego użytkownika.

**Sugestia:** Uprościć do np. "Your changes will be saved automatically when you close this panel."

---

### [UX-9] "Max width" disabled bez wyjaśnienia

**Gdzie:** Page Settings → Layout and appearance → Max width

**Problem:** Dropdown "Max width" jest wyłączony gdy "Page width" = "full", ale nie ma tooltipa ani tekstu wyjaśniającego dlaczego.

**Sugestia:** Dodać tooltip "Max width is not applicable when page width is set to full."

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Auto-generowanie sluga z tytułu | Działa natychmiast i poprawnie |
| Live preview w canvasie podczas edycji pól | Bardzo responsywny, aktualizuje się na bieżąco |
| Guard "beforeunload" przy niezapisanych zmianach | Dialog pojawia się przy próbie opuszczenia edytora |
| Wskaźnik "UNSAVED CHANGES" w breadcrumbie | Pomocny kontekst stanu |
| Filtr Status (All/Published/Draft/Scheduled/Archived) | Działa poprawnie |
| Wyszukiwarka po tytule strony | Filtruje na bieżąco, poprawnie |
| History (wersjonowanie) | Pokazuje opublikowane wersje z datą i opcją Restore |
| Menu akcji (...) | Kompletne; "Publish" poprawnie disabled gdy strona już opublikowana |
| Runtime Preview (nowa karta) | Po poprawce konfiguracji działa, strona z tokenem, oba widgety w motywie |
| Wizard konfiguracji widgetu | Intuicyjny dla podstawowej konfiguracji (Hero, Feature Grid) |
| Checkbox "Open in editor after create" | Przenosi do edytora po zapisie — wygodne |
| Wybór wariantu layoutu widgetu (Centered/Media Right/Media Left) | Działa |

---

## Screenshoty

Dostępne w katalogu `screenshots/`:

- `pages-list.png` — lista stron przed testami
- `create-page-dialog.png` — dialog tworzenia strony
- `page-editor.png` — edytor po otwarciu nowej strony
- `hero-added.png` — po dodaniu Hero widget (Wizard)
- `hero-configured.png` — Hero po konfiguracji (layout options)
- `both-widgets.png` — canvas z Hero + Feature Grid
- `after-save-top.png` — stan po zapisaniu draftu (UNSAVED CHANGES zniknął)
- `after-publish.png` — badge zmieniony na PUBLISHED
- `page-settings.png` — Page Settings drawer
- `history.png` — Page History (Version 1 Published)
- `hero-toolbar.png` — widoczny toolbar widgetu (up/down/duplicate/delete)
- `runtime-preview2.png` — preview otwarte w nowej karcie (bug: blank)
- `preview-tab.png` — strona renderuje się poprawnie w motywie frontendu
- `pages-list-updated.png` — lista z nową stroną Homepage (Published)
- `page-actions-menu.png` — menu (...) z opcjami
- `search-test.png` — wyszukiwarka filtruje do "Homepage"
- `status-filter.png` — dropdown filtra statusu
- `draft-filter.png` — wynik filtrowania po Draft (2 z 4 stron)
- `bulk-select.png` — bug: Select all nie zaznacza wierszy
