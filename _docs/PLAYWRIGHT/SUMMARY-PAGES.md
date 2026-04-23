# Raport UX/QA — sekcja Pages (Admin UI)

**Data testów:** 2026-04-22 (re-weryfikacja: 2026-04-22)
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

**Kierunek naprawy UI:** Checkbox w nagłówku powinien mieć trzy stany: niezaznaczony, częściowo zaznaczony (indeterminate) i zaznaczony. Kliknięcie go zaznacza/odznacza wszystkie wiersze. Każdy wiersz ma własny klikalny checkbox. Po zaznaczeniu co najmniej jednego wiersza — nad tabelą pojawia się pasek akcji grupowych z licznikiem zaznaczonych pozycji i przyciskami (np. "Opublikuj", "Przenieś do kosza", "Zmień autora"). Wzorzec działający: Entries — można z niego dokładnie przenieść interakcję.

---

### [BUG-2] ŚREDNI: Autor strony = "Unknown" dla nowych stron

**Gdzie:** Lista stron → kolumna Author

**Co się dzieje:** Nowo tworzone strony wyświetlają autora jako "N Unknown" zamiast nazwy zalogowanego użytkownika. Przy stronach tworzonych wcześniej (about, cos — autor Patryk) działa poprawnie. Prawdopodobnie problem z przypisywaniem autora przy tworzeniu przez dialog "Create New Page".

**Kierunek naprawy UI:** Avatar i nazwa autora powinny pojawiać się natychmiast po utworzeniu strony — na liście i w edytorze. Widok "N Unknown" jest efektem braku dociągnięcia aktualnie zalogowanego użytkownika w momencie utworzenia. Do naprawienia po stronie serwisu tworzącego stronę (tam gdzie są już ownership pól) — nie wprowadzać równoległego mechanizmu autora. W UI: przy przyszłych błędach ownership (np. usunięty user) zamiast "Unknown" pokazywać grey state "Brak autora" z tooltipem "Poprzedni autor został usunięty".

---

### [BUG-3] ŚREDNI: "Loading template options..." nie kończy się

**Gdzie:** Page Settings → sekcja "Template and navigation" → pod dropdownem Template

**Co się dzieje:** Tekst `Loading template options...` permanentnie pozostaje pod dropdownem — nigdy nie znika. Dropdown działa (pokazuje "Custom (landing)"), ale wisząca informacja o ładowaniu sugeruje błąd lub nierozwiązany stan asynchroniczny.

**Kierunek naprawy UI:** Stan "loading" powinien znikać po zakończeniu pobrania listy templates (sukces lub błąd). Jeśli pobranie się nie udało — komunikat błędu "Nie udało się załadować szablonów. [Spróbuj ponownie]" z linkiem do retry. Jeśli pobranie się powiodło — tekst znika i pod dropdownem jest cisza lub helper text opisujący wybrany template. Nie wprowadzać nowego endpointu templates — użyć już istniejącego z widget library / templates (ten sam source of truth).

---

### [BUG-4] ŚREDNI: Przyciski akcji widgetu bez aria-label i tooltipów

**Gdzie:** Edytor strony → toolbar na karcie każdego widgetu (4 ikonki: góra, dół, duplikuj, usuń)

**Co się dzieje:** Żaden z przycisków toolbaru widgetu nie ma `aria-label`, `title` ani tooltipa. Brak dostępności (accessibility) i brak jasnej informacji co dany przycisk robi. Sprawdzone przez `el.getAttribute('aria-label')` — zwraca `null`.

**Kierunek naprawy UI:** Każdy przycisk w toolbarze widgetu ma aria-label i tooltip (hover) z jednoznaczną etykietą: "Przesuń w górę", "Przesuń w dół", "Duplikuj widget", "Usuń widget". Etykieta + ikonka razem — nie tylko sama ikonka. Przycisk "Usuń" dodatkowo w czerwonym akcentowym kolorze przy hover, żeby wyróżnić destructive action. Wzorzec spójny z Custom Screens (tam widget toolbar też ma reorder/delete) — nie tworzyć niezależnej implementacji.

---

### [BUG-5] NISKI: Ostrzeżenia Radix UI w konsoli

**Gdzie:** Konsole przeglądarki (wielokrotnie — zweryfikowane 2026-04-22: warning nadal obecny)

**Co się dzieje:** `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}` — pojawia się przy każdym otwarciu dialogów (Create Page, Page Settings, History). Problem z brakującymi opisami w komponentach Radix UI.

**Kierunek naprawy UI:** Każdy dialog powinien mieć Description (jedno-dwa zdania wyjaśniające cel dialogu) albo jawną deklarację `aria-describedby`. Dla Create Page: "Wpisz tytuł i slug aby utworzyć nową stronę". Dla Page Settings: "Zmień metadane i ustawienia strony". Dla History: "Przeglądaj wersje strony i przywróć wcześniejsze". Dotyczy wszystkich Radix Dialogów w całej aplikacji — zbiorczy fix w centralnym wrapperze DialogContent zamiast dodawania description do każdego dialogu osobno.

---

## Problemy UX

### [UX-1] Brak feedbacku po Save draft i Publish

**Gdzie:** Edytor → przyciski "Save draft" i "Publish"

**Problem:** Po kliknięciu nie pojawia się żaden toast ani powiadomienie. Jedynym sygnałem sukcesu jest znikający napis "UNSAVED CHANGES" (save) lub zmiana badge'a DRAFT→PUBLISHED (publish). To zbyt subtelne — użytkownik może nie wiedzieć że akcja się wykonała.

**Kierunek naprawy UI:** Toast w prawym dolnym/górnym rogu po każdej udanej akcji: "Szkic zapisany" / "Strona opublikowana". Toast znika automatycznie po 3-4 sekundach. W przypadku błędu — czerwony toast "Nie udało się zapisać. [Spróbuj ponownie]". To ta sama reguła we wszystkich sekcjach Admin UI — użyć istniejącego komponentu toast z aplikacji (nie tworzyć nowego systemu notyfikacji per sekcja).

---

### [UX-2] Canvas nie scrolluje automatycznie do nowego widgetu

**Gdzie:** Edytor → dodanie widgetu poniżej foldu

**Problem:** Po kliknięciu "+" przy widgecie (np. Feature Grid), nowy blok dodaje się na końcu strony, ale canvas nie przewija się do niego. Użytkownik musi ręcznie scrollować canvas by znaleźć nowo dodany widget.

**Kierunek naprawy UI:** Po wstawieniu widgetu — auto-scroll canvasu do nowo dodanego elementu (smooth scroll, nie nagłe skoki). Jednocześnie dodać chwilową ramkę/highlight wokół nowego widgetu (2 sekundy, fade-out) żeby wizualnie zaznaczyć gdzie się pojawił. Wzorzec spójny z kreatorem Custom Screens gdzie nowy widget pojawia się na końcu canvasu.

---

### [UX-3] Przycisk "Create Page" disabled bez wyjaśnienia

**Gdzie:** Dialog "Create New Page" → przycisk Create Page

**Problem:** Przycisk jest `disabled` dopóki nie zostanie wpisany tytuł, ale nie ma tooltipa ani helptextu tłumaczącego dlaczego. Nowy użytkownik może być zdezorientowany.

**Kierunek naprawy UI:** Pod polem "Title" dodać helper text "Tytuł jest wymagany" (szary gdy puste, znika po wpisaniu). Opcjonalnie: tooltip przy hover na disabled button "Wpisz tytuł aby kontynuować". Sama ikona/kursor blokady przy hover też pomaga. Zasada: disabled button zawsze daje wskazówkę co odblokuje — nigdy nie zostawiać bez wyjaśnienia.

---

### [UX-4] Lista widgetów bez kategoryzacji

**Gdzie:** Edytor → lewy panel z listą widgetów

**Problem:** Ponad 30 widgetów w płaskiej, niegrupowanej liście. Brak podziału na kategorie (Layout, Content, Commerce, Forms, itp.). Znalezienie konkretnego widgetu wymaga scrollowania przez całą listę.

**Kierunek naprawy UI:** Rozszerzyć istniejący komponent Widget Library (ten sam który jest w `/admin/coderso/widgets` i w Custom Screens) — tam kategorie i filtry już są zaimplementowane. Użyć go też w edytorze Pages zamiast osobnej płaskiej listy. Dzięki temu użytkownik dostaje te same filtry/kategorie wszędzie, a kod widgetów jest w jednym miejscu. Alternatywnie: jeśli integracja z Widget Library nie jest możliwa krótkoterminowo — podzielić listę w edytorze na collapsed sekcje wg kategorii (Layout/Content/Forms/Navigation/Media) z licznikami.

---

### [UX-5] Runtime preview — błąd bez komunikatu

**Gdzie:** Edytor → przycisk "Runtime preview" (wewnątrz edytora, jako iframe)

**Problem:** Gdy frontend nie jest uruchomiony pod adresem z konfiguracji (np. localhost:3000), iframe pokazuje ikonkę zepsutego dokumentu bez żadnego tekstu błędu ani wskazówki. Użytkownik nie wie co jest nie tak.

**Kierunek naprawy UI:** Przed wstawieniem URL do iframe sprawdzić dostępność endpointu. Jeśli niedostępny — zamiast iframe pokazać placeholder kartę z ikoną ostrzeżenia, nagłówkiem "Podgląd na żywo niedostępny" i treścią: "Frontend nie odpowiada pod [URL z konfiguracji]. Upewnij się, że serwis jest uruchomiony, lub zmień URL w ustawieniach." + link do ustawień. Wykorzystać istniejący stan "empty state" z innych sekcji — nie tworzyć nowego wzorca error state.

*Uwaga: Runtime preview działające poprawnie (otwieranie w nowej karcie przez menu "...") działa bez zarzutu po poprawnej konfiguracji.*

---

### [UX-6] Przejście Wizard → Layout view niejasne

**Gdzie:** Edytor → prawy panel po "Complete setup" w trybie Wizard

**Problem:** Po kliknięciu "Complete setup" wizard nie zamknął się — panel przełączył się w tryb wyboru wariantu layoutu (Centered / Media Right / Media Left) bez żadnego nagłówka wyjaśniającego co to jest i co użytkownik ma teraz zrobić.

**Kierunek naprawy UI:** Po "Complete setup" prawy panel pokazuje nowy nagłówek: "Wybierz wariant layoutu" + krótki opis "Te same dane, różne układy wizualne". Progressbar lub stepper u góry panelu pokazujący gdzie jest użytkownik w flow: `Config → Layout → Styling`. Dzięki temu "Complete setup" jest krokiem przejścia, a nie zakończenia. Alternatywnie: pozwolić pominąć layout i zamknąć wizard przyciskiem "Use defaults" — user może dostosować później.

---

### [UX-7] Slot "Hero Content" bez opisu

**Gdzie:** Edytor → canvas → widget Hero → sekcja "HERO CONTENT"

**Problem:** Slot wyświetla "Empty slot." bez żadnej wskazówki co można w nim umieścić ani jak (drag & drop? kliknięcie?).

**Kierunek naprawy UI:** Empty state slotu zawiera: ikonę "+" (widoczne CTA) + tekst "Dodaj widget do slotu Hero Content" + wskazówka niższa "Możesz przeciągnąć z biblioteki lub kliknąć aby wybrać". Hover na slot — highlight ramki i kursor pointer sugerujący klikalność. Po kliknięciu otwiera się Widget Library (mini) filtrowana do widgetów pasujących do tego typu slotu (np. tylko atomic). Wzorzec "Drop target" z Custom Screens — użyć tego samego komponentu empty state.

---

### [UX-8] Wording w Page Settings mylący

**Gdzie:** Page Settings → stopka drawera

**Problem:** Tekst "Save settings or close the drawer to keep one autosave snapshot" — zwrot "autosave snapshot" jest technicznym żargonem niezrozumiałym dla przeciętnego użytkownika.

**Kierunek naprawy UI:** Zastąpić technical speak prostym opisem: "Twoje zmiany zapiszą się automatycznie po zamknięciu panelu." Jeśli istnieje różnica między "Save settings" a "close and autosave" — wyjaśnić ją dwoma osobnymi linijkami: (1) "Zapisz i zamknij" → zapisuje od razu, (2) "Zamknij bez zapisu" → odrzuca zmiany. Usunąć koncept "snapshot" z UI — to koncept wewnętrzny, nie obchodzi użytkownika.

---

### [UX-9] "Max width" disabled bez wyjaśnienia

**Gdzie:** Page Settings → Layout and appearance → Max width

**Problem:** Dropdown "Max width" jest wyłączony gdy "Page width" = "full", ale nie ma tooltipa ani tekstu wyjaśniającego dlaczego.

**Kierunek naprawy UI:** Tooltip przy hover na disabled dropdown: "Max width nie ma zastosowania gdy Page width = full." Alternatywnie: pod polem szary helper text "Dostępne tylko gdy Page width ≠ full". Ogólna zasada w tym formularzu: każde disabled pole ma widoczny helper text lub tooltip wyjaśniający warunek odblokowania. Wskazane też: wizualna zależność (np. cienka linia łącząca Page width z Max width) sygnalizująca że są powiązane.

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

## Status po wdrozeniu TASK-194 (2026-04-22)

- BUG-1 — zaimplementowane:
  controlled header/row selection + Pages bulk actions (`publish`, `unpublish`,
  `delete`) z proofem w Vitest.
- BUG-2 — zaimplementowane:
  Pages list cache nie jest juz prime'owany authorless summary z detail/mutation
  payloads; author fallback ma osobny neutralny stan `No author`.
- BUG-3 — zaimplementowane:
  blocking `Loading template options...` znika, gdy drawer ma juz uzywalne
  choices; error state ma retry.
- BUG-4 — zaimplementowane:
  toolbar widgetu ma `aria-label` + `title`, a delete ma explicit destructive
  affordance.
- BUG-5 — zaimplementowane:
  Create Page, Page Settings, Page History i Runtime Preview maja explicit
  description owners.
- UX-1 — zaimplementowane:
  editor pokazuje widoczny success notice po `Save draft` i `Publish`.
- UX-2 — zaimplementowane:
  po insert/add blok jest przewijany do viewportu i chwilowo podswietlany.
- UX-3 — zaimplementowane:
  create drawer wyjasnia, dlaczego `Create Page` jest disabled.
- UX-4 — zaimplementowane:
  widget picker jest grupowany po istniejacych kategoriach widgetow.
- UX-5 — zaimplementowane:
  runtime preview pokazuje actionable placeholder dla unreachable host/timeout
  zamiast pustej ramki.
- UX-6 — zaimplementowane:
  wizard ma explicit handoff copy do layout/styling.
- UX-7 — zaimplementowane:
  empty slot pokazuje CTA i prowadzi do istniejacego widget library surface z
  contextem slotu.
- UX-8 — zaimplementowane:
  wording w Page Settings mowi o draft version in history, nie o
  `autosave snapshot`.
- UX-9 — zaimplementowane:
  disabled `Max width` pokazuje helper text z warunkiem odblokowania.

## Validation snapshot (2026-04-22)

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list-cache-behavior.test.tsx tests/vitest/ui/page-settings-drawer.test.tsx tests/vitest/ui/page-settings-drawer-wave.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/admin/pagesClient.test.ts tests/vitest/pageBuilder/blockToolbar.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx`

Uwaga: ten raport zostal zaktualizowany na podstawie wdrozenia + targeted
Vitest proof. Nie robilem ponownego manualnego replay Playwright na lokalnym
serwerze w tym samym kroku zamkniecia taska.

---

## Manualna re-weryfikacja Playwright (2026-04-23)

Ręczny przebieg E2E przez wszystkie bugi/UX po wdrożeniu TASK-194. Gdzie status vitest vs. Playwright różni się — to poniżej oznaczam.

### Zweryfikowane działające ✓

| ID | Element | Obserwacja na żywo |
|---|---|---|
| BUG-1 | Bulk select | Select all pages → "Selected 2" toolbar z "Bulk actions" dropdown (Publish/Unpublish/Delete) + "Clear selection". Działa idealnie. |
| BUG-2 | Autor nowych stron | Nowa strona "Retest Page" → autor "Patryk" od razu widoczny na liście. Brak "N Unknown". |
| BUG-3 | "Loading template options..." | W Page Settings drawer → Template dropdown pokazuje "Landing", brak wiszącego tekstu "Loading...". Stan loading rozwiązany. |
| BUG-4 | Widget toolbar aria-label | Hero widget ma: "Move Hero up" (disabled gdy jeden widget), "Move Hero down", "Duplicate Hero", "Delete Hero" — wszystkie z aria-label. Screen reader-friendly. |
| BUG-5 | Radix `aria-describedby` warning | 0 warnings w konsoli po otwarciu dialogów: Create Page, Page Settings, Page History, Runtime Preview. **Całkowicie rozwiązane dla Pages.** |
| UX-3 | Create Page disabled helper | Pole Title → helper "Title is required before you can create the page." Pod disabled button: "Add a page title to generate a slug and enable Create Page." Po wpisaniu → "The slug is generated from the title until you edit it." Świetna progresja. |
| UX-4 | Widget picker kategoryzacja | Panel Widgets ma zakładki "Widgets / Templates / Forms" + wewnątrz sekcje z licznikami ("Layout 10", "Content 20"). Dokładnie jak Widget Library — spójność osiągnięta. |
| UX-7 | Empty slot CTA | Slot "Hero Content" pokazuje: "0 | Add widget to Hero Content | Drag from the library or choose a widget from the widgets tab." Jasny call-to-action zamiast "Empty slot". |
| UX-8 | Wording Page Settings | Stopka: "Save settings now, or close the panel to keep one **draft version in history**." Koncept "autosave snapshot" zniknął z UI. |
| UX-9 | Max width disabled helper | Pole Max width (gdy Page width = full) pod polem: "Available when Page width is not full." Warunek jasny, bez żargonu. |

### Zweryfikowane częściowo / wymagają dopracowania ⚠

| ID | Element | Obserwacja |
|---|---|---|
| UX-1 | Toast po Save draft / Publish | Element `[aria-live=polite]` istnieje w DOM, ale **pozostaje pusty** po kliknięciu Save draft i Publish. Badge zmienia się z Draft → Published, przycisk Publish → Update — to pośredni feedback, ale nie ma widocznego toast notification. Vitest proof potwierdza mechanizm istnieje; w real-user feel nic nie migoce → użytkownik nadal może nie zauważyć że akcja się powiodła. **Kierunek dopracowania UI:** podpiąć toast z widocznym tekstem (np. sonner toast "Strona zapisana" / "Opublikowano") do tej samej aria-live region, albo użyć timeout render 3s z animacją pojawienia. |
| UX-2 | Auto-scroll po insert | Nie zweryfikowano w tym przebiegu bezpośrednio (widget dodano przez JS click a nie insert-from-library). Vitest potwierdza mechanizm. **Kierunek dopracowania UI:** warto w osobnym manualnym teście sprawdzić UX przy długiej stronie z 10+ widgetami — czy smooth-scroll faktycznie animuje się do nowo wstawionego elementu oraz czy highlight jest wystarczająco wyraźny. |
| UX-5 | Runtime preview placeholder | Dialog "Page Preview" otwiera się, ale przy `localhost:3000` zwracającym 404 iframe nadal renderuje cross-origin 404 zamiast placeholdera z admin UI. Testy Vitest (`runtime-preview-dialog.test.tsx`) potwierdzają logikę detection, ale na żywo placeholder nie jest wyraźnie widoczny w dialogu gdy backend jest dostępny a tylko ścieżka nie istnieje (404 inside iframe). **Kierunek dopracowania UI:** rozszerzyć detection na `load` event iframe z wynikiem 404 (HEAD preflight przed zasileniem src) — nie tylko na timeout/unreachable host. |

### UX feel — obserwacje po całym flow ✨

**Co jest super teraz:**
- Create Page dialog — helper texty prowadzą użytkownika, disabled state tłumaczy się sam. Nowy użytkownik ma komplet informacji bez chodzenia po dokumentacji.
- Widget picker z kategoriami + licznikami ("Layout 10") — redukuje paraliż decyzyjny (30 widgetów nie w jednym rzędzie).
- Widget toolbar z pełnymi aria-labels + stanem disabled dla niemożliwych ruchów ("Move up" disabled gdy to pierwszy widget) — bardzo czysto.
- Page Settings: "Available when Page width is not full." zamiast milczącego disabled — przykład jak disabled field powinien tłumaczyć się sam.

**Co nadal zostawia niedosyt:**
- Brak widocznego toast po Save/Publish — aria-live region jest, ale tekst się nie pojawia. To drobny drobiazg ale odczuwalny. Użytkownik po kliknięciu "Save draft" ma 1 sekundową niepewność.
- Runtime Preview dla niedostępnej ścieżki wewnątrz działającego frontendu (404 podstrona) nadal pokazuje surowy 404 zamiast admin-ui error state — poprawione tylko dla "host całkowicie niedostępny".

### Screeny

- `retest-fix/pages-list.png` — lista stron (Patryk jako autor)
- `retest-fix/bulk-select-works.png` — "Selected 2" toolbar + Bulk actions dropdown
- `retest-fix/create-dialog-helper.png` — Create Page z helper textami
- `retest-fix/page-editor.png` — edytor z widget picker kategorycznym
- `retest-fix/after-add-hero.png` — Hero z toolbar'em (Move up/down, Duplicate, Delete z aria-labels)
- `retest-fix/after-save-immediate.png` — stan po Save draft (badge zmieniony, brak toast)
- `retest-fix/after-publish.png` — po Publish (badge Published, przycisk → Update)
- `retest-fix/page-settings.png` — Page Settings z nowymi opisami (Max width helper, draft version in history)
- `retest-fix/runtime-preview.png` + `runtime-preview-content.png` — preview dialog z 404 w iframe

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
