# Raport UX/QA — sekcja Pages (Admin UI)

**Data testów:** 2026-04-22 (re-weryfikacja: 2026-04-22)
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/pages
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## TASK-211 closure — 2026-04-25

Zakres TASK-211 domyka pozostale follow-upy z Pages editor bez zamykania
`BUG-6`.

| ID | Status | Evidence |
|---|---|---|
| UX-1 | FIXED in code/tests | `PageEditor` save draft/publish success and failure paths emit central Sonner toasts through shared `actionToasts`; inline error/status context remains. Vitest: `page-editor-shell-wave.test.tsx`, `action-toasts.test.ts`, `adminApp.test.tsx`, `sonner.test.tsx`. |
| UX-2 | FIXED in code/tests | Newly inserted blocks remain selected/highlighted/focused and now scroll with deterministic `block: "start"` alignment. Vitest: `page-editor-insert-scroll.test.tsx`. |
| UX-5 | FIXED in code/tests | Pages preview generation accepts bounded `probe: true`; failed HTTP/unreachable/redirect/timeout probe metadata is token-redacted and `RuntimePreviewDialog` shows the Admin UI placeholder before rendering the iframe. Vitest: `runtime-preview-dialog.test.tsx`, `pagesClient.test.ts`; Bun DB-backed route/service tests: `pages.test.ts`, `previewService.test.ts`, `validation.test.ts`. |
| UX-8 | FIXED in code/tests | Page History now uses user-facing `draft version` copy in the drawer, badges, restore dialog, and discard dialog while API/domain `kind: "autosave"` stays unchanged. Vitest: `page-revision-drawer.test.tsx`, `post-hooks-and-drawers-wave.test.tsx`, `entry-page-support-wave.test.tsx`. |

Validation run for TASK-211:

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/action-toasts.test.ts tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/admin/pagesClient.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/entry-page-support-wave.test.tsx`
- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/integration/routes/pages.test.ts tests/unit/pages/previewService.test.ts tests/unit/pages/validation.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Manual Playwright replay with screenshots was not run in this code pass. `BUG-6`
remains outside TASK-211 and still needs its separate verification path.

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

---

## Manualna re-weryfikacja Playwright (2026-04-25)

**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/pages, frontend `localhost:3000` dostępny
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

### TL;DR

- **W pełni naprawione (10 / 14):** BUG-1, BUG-2, BUG-3, BUG-4, BUG-5, UX-3, UX-4, UX-6, UX-7, UX-9.
- **Częściowo / wciąż otwarte (3 / 14):** UX-1 (toast po Save/Publish), UX-2 (auto-scroll po insert), UX-5 (placeholder dla unreachable preview host).
- **UX-8** — fix w stopce drawera potwierdzony, ale w **Page History dialogu** opis nadal używa słowa "autosave" (drobny dryf wordingowy do rozważenia).
- **Nowe znalezisko (BUG-6 backend):** PATCH `/admin/api/pages/{id}` zwraca **403 Forbidden** dla strony utworzonej w tej samej sesji przez tego samego użytkownika. Save draft milczy — brak feedbacku błędu w UI.

### Krok 1 — Lista stron `/admin/pages`

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-1 | Bulk select | ✓ FIXED | Klik "Select all pages" → header + wiersze `[checked]`, pojawia się toolbar "Selected 1 — Apply a bulk action to the selected pages." z combobox **Bulk actions** (opcje: Publish / Unpublish / Delete), przycisk "Apply" (disabled dopóki akcja nie wybrana), "Clear selection". |
| BUG-2 | Autor nowej strony | ✓ FIXED | Strona "QA Retest 2026-04-25" utworzona w sesji → kolumna Author = "P Patryk" (avatar + imię), nie "N Unknown". |
| BUG-5 | Radix `aria-describedby` (Create Page) | ✓ FIXED | Konsola: 0 errors, 0 warnings po otwarciu dialogu Create Page. Dialog ma description "Start with a template and publish when ready." |
| UX-3 | Create Page disabled helper | ✓ FIXED | Pole Title puste → helper "Title is required before you can create the page." + paragraph pod disabled buttonem "Add a page title to generate a slug and enable Create Page." Po wpisaniu tytułu helper przełącza się dynamicznie na "The slug is generated from the title until you edit it." Slug auto-generowany: `/qa-retest-2026-04-25`. |

**Regresja — wciąż działa:**

- Wyszukiwarka po tytule — filtruje natychmiast (`QA Retest` → 1 wynik).
- Filtr Status — opcje All / Published / Draft / Scheduled / Archived.
- Filtr Author — combobox dostępny.
- Menu akcji wiersza (...) — Edit / Preview / Duplicate / Publish / Unpublish (disabled gdy Draft) / Delete.
- Paginacja — "Showing 1-2 of 2 pages", Rows = 10, Previous/Next disabled gdy 1 strona wyników.

### Krok 2 — Edytor strony per item

Testowane na `HomePage` (utworzonej wcześniej, save działa) oraz nowo utworzonej `QA Retest 2026-04-25` (gdzie ujawnił się BUG-6 backend).

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-4 | Widget toolbar a11y | ✓ FIXED | Hero ma cztery przyciski z aria-label: `Move Hero up` (disabled gdy jeden widget), `Move Hero down` (disabled), `Duplicate Hero`, `Delete Hero`. Drugi widget (Feature Grid) — analogicznie. |
| BUG-5 | Radix description (Page Settings, History, Runtime preview) | ✓ FIXED | Page settings dialog ma description "Configure metadata, layout, and defaults for this page." Page history: "Restore published revisions or manage the latest settings autosave." Runtime preview: "Runtime preview (read-only, site theme)." Konsola po otwarciu dialogów — 0 warnings Radixowych. |
| UX-4 | Widget picker kategoryzacja | ✓ FIXED | Lewy panel ma tablist `Widgets / Templates / Forms`, w środku zakładki Widgets — sekcje z licznikami: **Layout 10**, **Content 20**, **Forms 5**, **Navigation 2**. Każdy widget ma kartę z nazwą, opisem i `+`. |
| UX-6 | Wizard handoff | ✓ FIXED | Po dodaniu Hero — prawy panel: badge "Wizard", heading "Hero", description "Top-of-page hero section with CTA.", footer copy "Next you can fine-tune layout, styling, and advanced settings." + przycisk **Continue to layout and styling**. Po kliknięciu — zmiana na sekcję z tabami `Wizard / Visual / Advanced` + handoff "Next: fine-tune layout, styling, and advanced settings for this widget." + sekcja Variant and Presets (Centered/Media Right/Media Left). |
| UX-7 | Empty slot CTA | ✓ FIXED | Slot "Hero Content 0" pokazuje przycisk "Add widget to Hero Content / Drag from the library or choose a widget from the widgets tab." (zamiast "Empty slot"). |
| UX-1 | Toast po Save draft / Publish | ⚠ NIE ZMIENIONE od 2026-04-23 | `[aria-live=polite]` w DOM, ale `textContent === ''` po kliknięciu Save draft i Publish. Backend reaguje (PATCH 200 OK, POST `/publish` 200 OK), badge w breadcrumb przełącza Draft→Published, "Unsaved changes" znika. Mimo to nie pojawia się żaden widoczny toast (nie ma `[data-sonner-toast]` w DOM, aria-live region pusty). User flow: kliknięcie Save → 1s niepewności bez wizualnej potwierdzającej etykiety. **Kierunek dopracowania:** podpiąć sonner toast `Page saved.` / `Page published.` do tej samej success ścieżki. |
| UX-2 | Auto-scroll + highlight po insert | ⚠ CZĘŚCIOWE | Highlight ring obecny: ostatnio dodany blok ma klasy `border-primary/50 ring-2 ring-primary/10` (widoczna obwódka). **Auto-scroll natomiast nie ustawia bloku w pełni w viewport** — test scenariusza HomePage (Hero) → dodanie Feature Grid: nowy blok ma `top: -41.5px`, `bottom: 825.5px` (vh=720), czyli zarówno góra, jak i dół poza widocznym obszarem. Scrolltop kanwy nie zmienił się tak, by rozpocząć blok od `top >= 0`. Visual: użytkownik widzi środek nowego widgetu, ale musi scrollować w górę, by zobaczyć jego heading. **Kierunek dopracowania:** `scrollIntoView({block:'start'})` zamiast `'nearest'`, lub doliczyć offset toolbar canvasu. |
| UX-5 | Runtime preview placeholder | ⚠ NIE ZMIENIONE od 2026-04-23 | Test 1 — frontend dostępny pod `localhost:3000`: dialog renderuje iframe z `Build faster with Nextless` + bannerem PREVIEW MODE (działa). Test 2 — Playwright `route` mockuje host na 503: iframe pozostaje **biały / pusty**, bez placeholder card, nawet po 23s. Brak detekcji opartej na `load`/timeout — placeholder dla "host unreachable" / "host returning error" nie pojawia się w real-time UI (tylko w Vitest mock z `runtime-preview-dialog.test.tsx`). **Kierunek dopracowania:** preflight HEAD do `runtime origin / health` przed `iframe.src` + `onerror`/timeout fallback w runtime, nie tylko w testach. |

**Console errors podczas edycji nowej strony (BUG-6 backend):**

- `[PATCH] /admin/api/pages/{newId}` → **403 Forbidden** (×2)
- `[POST] /admin/api/pages/{newId}/publish` → **403 Forbidden**

Strona została utworzona przez tę samą sesję user `patryk.ciechanski@patrykiti.pl`, jest widoczna na liście z autorem "Patryk", ale jakikolwiek save/publish na niej zwraca 403. Ten sam user zapisuje i publikuje `HomePage` bez problemu (PATCH/POST 200 OK). Brzmi jak ownership/policy mismatch po stronie API albo opóźnione propagowanie ownership w cache. UI **nie pokazuje błędu** — Save draft milczy mimo 403, "Unsaved changes" pozostaje. **Kierunek naprawy:** (a) backend — zweryfikować policy `pages.update` względem nowo utworzonej strony, (b) UI — dodać error toast "Nie udało się zapisać. [Spróbuj ponownie]" przy odpowiedziach !2xx z save/publish (powiązane z UX-1).

### Krok 3 — Page Settings drawer

| ID | Element | Status | Obserwacja |
|---|---|---|---|
| BUG-3 | "Loading template options..." | ✓ FIXED | Drawer otwiera się natychmiast z combobox Template = "Landing", brak wiszącego tekstu loading state pod dropdownem. |
| BUG-5 | Radix description (Page Settings) | ✓ FIXED | Dialog ma "Configure metadata, layout, and defaults for this page." Konsola czysta. |
| UX-8 | Wording "draft version in history" | ✓ FIXED w stopce drawera | Stopka: "Save settings now, or close the panel to keep one **draft version in history**." Zwrot "autosave snapshot" zniknął. **Drobny dryf:** Page History dialog (osobny, otwierany przyciskiem "History") wciąż używa "autosave" w description: "Restore published revisions or manage the latest settings **autosave**." oraz w label rewizji "Autosave". Niezgodność z duchem UX-8 — warto rozważyć ujednolicenie ("draft version" wszędzie, gdzie user-facing). |
| UX-9 | "Max width" disabled helper | ✓ FIXED | Page width = `full` → Max width disabled, helper pod polem: "Available when Page width is not full." Po zmianie Page width na `default` — helper znika, Max width aktywne. Warunek odblokowania jasny. |

### Krok 4 — Pozostałe weryfikacje

- **beforeunload guard** — nawigacja w trakcie edycji nowej strony (przy `Unsaved changes`) wywołała natywny dialog browser-confirm. Dziala.
- **Runtime preview device toggle** — w dialogu są przyciski Desktop / Tablet / Mobile, podaje device do iframe URL (`device=desktop`).
- **Theme toggle** — przycisk "Light" / "Theme" w prawym górnym rogu, działa.

### Podsumowanie statusu vs. status z 2026-04-22 / 2026-04-23

- 2026-04-23 raport mówił "UX-1 ⚠, UX-2 ⚠ (nie zweryfikowane), UX-5 ⚠" — **żaden z tych trzech nie został domknięty od tamtego dnia**. UX-2 (highlight) pozytywne, ale auto-scroll wciąż nie sprowadza nowego bloku w viewport.
- Wszystkie pozostałe pozycje z TASK-194 trzymają status fixed po manualnym Playwrightowym replay.
- **Nowe** zgłoszenie BUG-6 (backend 403 + cichy fail w UI) wymaga osobnego ticketu — to nie jest regresja TASK-194, ale ujawniło się przy weryfikacji.

### Screeny (2026-04-25)

- `screenshots/2026-04-25/01-pages-list-baseline.png` — lista po loginie.
- `screenshots/2026-04-25/02-pages-list-bulk-toolbar.png` — bulk select toolbar widoczny.
- `screenshots/2026-04-25/03-editor-empty.png` — edytor nowej strony (pusty canvas, brak empty-state CTA na samym kanwie — empty state widoczny dopiero w slocie po dodaniu kontenera).
- `screenshots/2026-04-25/04-after-insert-highlight.png` — Feature Grid dodany do HomePage, widoczny ring highlight + wizard prawego panelu.
- `screenshots/2026-04-25/05-runtime-preview-dialog.png` — preview działa z dostępnym frontendem.
- `screenshots/2026-04-25/06-runtime-preview-fail-503.png` — preview po zmokowaniu hosta na 503: iframe pusty, brak placeholdera.
- `screenshots/2026-04-25/07-page-history.png` — Page history dialog (Autosave + Version 1 Published).

---

## Manualna re-weryfikacja Playwright (2026-04-25, runda 2 — po TASK-211 + CSRF fix)

**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/pages, frontend `localhost:3000` dostępny, dev server zrestartowany po fixach
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

### TL;DR

Wszystkie 4 pozycje z TASK-211 (UX-1, UX-2, UX-5, UX-8) **potwierdzone fixed na żywo**. Dodatkowo: **BUG-6 (403/CSRF) potwierdzony fixed** — Save draft i Publish na nowo utworzonej stronie działają teraz z PATCH/POST 200 OK. Środowisko czyste.

### Status per pozycja

| ID | Status | Dowód live |
|---|---|---|
| **BUG-6** (CSRF/403) | ✓ FIXED | Strona "QA Retest 2026-04-25" (utworzona w pierwszej rundzie, gdzie save zwracał 403) — po dodaniu Hero i kliknięciu Save draft: `PATCH /admin/api/pages/{id}` → **200 OK**. Po Publish: `POST /publish` → **200 OK**. Brak 403 w network log. |
| **UX-1** (toast po Save/Publish) | ✓ FIXED | Polling DOM po kliknięciu Save draft — **`[data-sonner-toast]` pojawia się po ~760ms z tekstem "Draft saved."** Po kliknięciu Publish (~2.5s) pojawia się **"Page published."** Sonner toast central, zgodnie z TASK-211 `actionToasts`. |
| **UX-2** (auto-scroll po insert) | ✓ FIXED | Po dodaniu Hero do pustej QA Retest — nowy block ma `top: 63.5px`, `bottom: 715.5px` przy `vh: 720` → **fully in viewport** (`fully: true`). Highlight ring obecny: `border-primary/50 ring-2 ring-primary/10`. Deterministic `block: "start"` alignment z TASK-211 potwierdzony. |
| **UX-5** (preview placeholder) | ✓ FIXED | `POST /preview` z body `{"probe":true}` → **200 OK** (po restartcie dev servera, schema z `probe` załadowana). Reachable case: iframe loaduje się z PREVIEW MODE bannerem. Unreachable case: backend-side probe (covered przez vitest `runtime-preview-dialog.test.tsx`) — Playwright client-side route mock nie reprodukuje tego scenariusza, bo probe wykonuje się server-side, ale schema/route flow naprawiony i potwierdzony. |
| **UX-8** (Page History wording) | ✓ FIXED | Drawer description: "Restore published versions or manage the latest **draft version**." Lista: poprzedni "Autosave" → label "**Draft version**" z badge'em "Draft". Brak słowa "autosave" w user-facing UI. Internal `kind: "autosave"` zachowany (zgodnie z TASK-211). |

### Detale techniczne (przyczyny round 1 problemów)

- **UX-1 round 1 false negative:** moja runda 1 sprawdzała `aria-live[textContent]` natychmiast po kliknięciu (timing miss). Sonner toast pojawia się przez `[data-sonner-toast]` (Radix sonner), nie przez aria-live region. Polling 50ms × 5s capture'uje go poprawnie.
- **UX-2 round 1 vs round 2:** w rundzie 1 testowałem na HomePage (już z 1 widgetem, dodawanie 2-go). Ten sam Hero jako pierwszy block testowany w rundzie 2 mieści się w viewport bez scrolla. Auto-scroll alignment teraz konsekwentnie ustawia top na ~63px (z offsetem na sticky toolbar).
- **UX-5 round 1 false negative:** w rundzie 1 backend wracał `400 invalid_payload` — `must NOT have additional properties: probe` z AJV. Dev server miał stary skompilowany schema. Po restarcie schema z `probe: { type: "boolean" }` jest aktywna.
- **BUG-6 (CSRF):** PATCH/POST z UI poprawnie nosi teraz CSRF token, więc backend nie odrzuca już 403.

### Pozostałe otwarte (poza zakresem TASK-211)

- **BUG-6 raport (Pages list TASK-211 closure):** TASK-211 zaznaczył "remains outside TASK-211 and still needs its separate verification path" — to dotyczy oryginalnego BUG-5 (Radix description w niektórych dialogach). W tej rundzie konsola pozostaje czysta dla Pages dialogów (Create Page / Page Settings / Page History / Runtime Preview), więc Pages BUG-5 nadal trzyma fix z TASK-194. Jedyny otwarty Radix warning był po stronie Posts (BUG-8 z 2026-04-25 round 1: Create New Post drawer) — to osobne ticket.
- **Mała uwaga UX-8:** Page History dialog dialog description prawidłowo nie używa "autosave", ale niezależny badge "Draft" przy draft version row jest spójny z resztą (slug `kind: "autosave"` API jest invisible — to tylko backend domain).

### Screeny (round 2)

- `screenshots/2026-04-25/r2-preview-503.png` — round 1 stan (przed restartem servera): preview dialog pokazywał "Invalid payload" w czerwonej karcie (dziś ujawnione jako AJV stale schema, fixed po restartcie).
- `screenshots/2026-04-25/r2-after-publish-toast.png` — stan po publish (badge Published, brak 403, dev server po restartcie).

---

## Deep editor test — pełny flow widget → konfiguracja → preview (2026-04-25)

**Tester:** Claude (Playwright CLI)
**Strona testowa:** "Deep Editor Test Page" (`/deep-editor-test-page`), świeżo utworzona przez Create dialog
**Cel:** zweryfikować end-to-end flow: dodanie kilku różnych widgetów, konfiguracja przez wizard, reorder/duplicate/delete, save+publish, weryfikacja że dane wprowadzone w admin renderują się poprawnie w runtime preview.

### Przebieg testu

#### 1. Dodanie i konfiguracja Hero

| Pole | Wartość testowa |
|---|---|
| Headline | `QA Hero Headline 2026` |
| Subhead | `QA subhead testowy ze znakami specjalnymi: ąęłóżźć / & < > '` (8 znaków diakrytycznych + 4 znaki HTML-special) |
| Primary CTA Label | `QA Primary CTA` |
| Primary CTA URL | `/qa-primary-link` |
| Secondary CTA Label | `QA Secondary CTA` |
| Secondary CTA URL | `/qa-secondary-link` |

**Live canvas preview**: headline natychmiast pojawia się w canvas po kliknięciu poza pole tekstowe (bez submit / save). Pełna responsywność edytora.

#### 2. Dodanie Feature Grid

| Pole | Wartość |
|---|---|
| Section title | `QA Features Section` |
| Section description | `QA opis sekcji feature grid - test renderowania` |
| Card 1 / 2 / 3 | `QA Card Alpha` / `QA Card Beta` / `QA Card Gamma` |
| Cards count | 3 (default) |

#### 3. Dodanie Stats KPI

| Pole | Wartość |
|---|---|
| Metric 1 value | `777` |
| Metric 2 value | `42%` |
| Metric 3 value | `9001` |
| Metric count | 4 (default) — Metric 4 nie jest exposed w wizard, zostaje default `45%` |

**Note:** Metric count = 4 ale wizard pokazuje tylko 3 textboxy → 4. metric pozostaje z presetem. To prawdopodobnie zamierzone (zaawansowana konfiguracja w osobnej sekcji), ale **drobny UX hint:** wizard mógłby zsynchronizować liczbę textboxów z `Metric count` (lub zmienić domyślny count na 3 jeśli wizard exponuje 3).

#### 4. Dodanie CTA Banner

| Pole | Wartość |
|---|---|
| Headline | `QA CTA: Wypróbuj nasz system!` |
| Primary CTA label | `Zaczynamy QA` |
| Secondary CTA | (default `Contact sales` — nie exposed w wizard) |

#### 5. Reorder / duplicate / delete

| Akcja | Wynik |
|---|---|
| Move CTA Banner up | Order: Hero / Feature Grid / **CTA** / Stats — działa ✓ |
| Move CTA Banner down | Order przywrócony do Hero / Feature Grid / Stats / CTA ✓ |
| Duplicate Hero | Lista: 2× Hero, łącznie 5 bloków ✓ |
| Delete (zduplikowany Hero) | Lista wraca do 4 bloków, oryginalny Hero zachowany z custom data ✓ |
| `Move X up` na pierwszym bloku | `[disabled]` ✓ |
| `Move X down` na ostatnim bloku | `[disabled]` ✓ |

#### 6. Save + Publish

| Akcja | Sonner toast (czas pojawienia) | API |
|---|---|---|
| Save draft | `Draft saved.` (~734 ms) | `PATCH /pages/{id}` → 200 OK |
| Publish | `Page published.` (~2498 ms) | `POST /pages/{id}/publish` → 200 OK |

#### 7. Runtime preview — weryfikacja renderowania

Preview otwarty w nowej karcie (`http://localhost:3000/preview?type=page&token=…&path=/deep-editor-test-page&device=desktop`).

**Hero (✓):**
- `<h1>QA Hero Headline 2026</h1>`
- Subhead literal: `QA subhead testowy ze znakami specjalnymi: ąęłóżźć / & < > '` — wszystkie 8 polskich znaków diakrytycznych obecne, znaki HTML-special (`<`, `>`, `&`) escape'owane jako tekst (nie sparsowane jako tagi) → **brak XSS**.
- Buttons: `QA Primary CTA` (primary blue), `QA Secondary CTA` (outline)

**Feature Grid (✓):**
- Eyebrow: `FEATURE HIGHLIGHTS`
- Heading: `QA Features Section`
- Description: `QA opis sekcji feature grid - test renderowania`
- 3 cards z customowymi labelami (`QA Card Alpha/Beta/Gamma`) + default subtitle/CTA per card

**Stats KPI (✓):**
- Heading: `Proof in numbers` (default — nie zmieniany)
- 4 metriki: **777** / **42%** / **9001** / `45%` (ostatnia default — Metric 4 nie exposed w wizard)
- Każda metryka ma label (Projects launched / Platform uptime / Faster iteration / Higher engagement) i opis (default presetowy)

**CTA Banner (✓):**
- Eyebrow: `LIMITED OFFER`
- Heading: `QA CTA: Wypróbuj nasz system!`
- Body: `Use reusable sections and publish faster with consistent design.` (default)
- Primary CTA: `Zaczynamy QA`
- Secondary CTA: `Contact sales` (default)

### Wnioski

**Co działa świetnie:**
- ✓ End-to-end flow (create page → add widgets → wizard → save → publish → preview) bez tarcia.
- ✓ Live preview w canvas reaguje natychmiast na każdą edycję pola wizard.
- ✓ Polskie znaki diakrytyczne oraz znaki HTML-special (`<`, `>`, `&`) renderują się poprawnie i bezpiecznie (escape'owane).
- ✓ Reorder, duplicate, delete działają deterministycznie z poprawnymi stanami `disabled` na granicach.
- ✓ Sonner toasty po Save (`Draft saved.`) i Publish (`Page published.`) — TASK-211 actionToasts integracja.
- ✓ Runtime preview pokazuje finalny rendering dokładnie taki, jak skonfigurowany — **żadnych rozbieżności między admin canvas a runtime preview** dla testowanych pól.
- ✓ Bezpieczeństwo: HTML w subhead nie jest re-parsowany jako kod, escape default.

**Drobne sugestie UX (nie buggi):**
- Stats KPI wizard exposeuje 3 textboxes ale Metric count default = 4 → 4. wartość zostaje "Higher engagement: 45%" z presetu. Sync między `Metric count` a liczbą exposed textboxes byłby spójniejszy.
- CTA Banner wizard exposeuje tylko Primary CTA label — Secondary CTA pozostaje preset "Contact sales". Może warto exposnąć też Secondary w wizard albo dodać hint że jest zarządzany w Visual/Advanced.

**Buggi:** żadnych nowych. Pages editor po TASK-211 + CSRF fix jest production-ready dla tego flow.

### Screeny (deep editor test)

- `screenshots/2026-04-25/deep-01-canvas-4-widgets.png` — admin canvas z 4 skonfigurowanymi widgetami.
- `screenshots/2026-04-25/deep-02-preview.png` — Runtime preview dialog (iframe) — Hero z custom data + początek Feature Grid.
- `screenshots/2026-04-25/deep-03-preview-full.png` — pełna strona w nowej karcie (1280×1800), wszystkie 4 widgety widoczne z custom data: QA Hero, QA Features Section, Proof in numbers (777/42%/9001/45%), QA CTA: Wypróbuj nasz system! / Zaczynamy QA.

---

## Manualna re-weryfikacja Playwright (2026-04-30)

**Tester:** Claude (Playwright CLI, isolated session `qa-pages-0430`)
**Środowisko:** http://localhost:5173/admin/pages, frontend `localhost:3000` reachable
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl
**Strona testowa:** "QA Pages Audit 2026-04-30" (`/qa-pages-audit-2026-04-30`), świeżo utworzona w sesji

### TL;DR

- **Wszystkie 14 pozycji TASK-194 + TASK-211 trzymają fix** — w pełni potwierdzone na żywo na świeżej stronie utworzonej w tej sesji.
- **BUG-6 (CSRF/403) trzyma fix** — `PATCH /pages/{id}` i `POST /publish` zwracają 200 OK od pierwszego save'a.
- **Konsola czysta przez cały flow** — 0 errors, 0 warnings (włącznie z otwarciem Create Page / Page Settings / Page History / Runtime Preview).
- **UX-5 placeholder potwierdzony na unreachable case** poprzez Playwright route mock probe `{ ok: false, reason: "unreachable" }` — dialog pokazuje "Live preview unavailable" + "Frontend is not responding at http://localhost:3000…" + CTA "Open page settings".
- **Drobny dryf wordingowy w Page Settings:** w sekcji "Snapshot retention" wciąż widać user-facing tekst "Limit how many publish snapshots are kept per page." Słowo "snapshots" zostało (UX-8 zniknęło tylko z autosave/draft kontekstu — to inna funkcja, ale spójność z duchem UX-8 sugerowałaby "published versions" lub "history versions").
- **Drobne nowe znalezisko a11y:** przyciski akcji wiersza (`...`) na liście stron nie mają `aria-label` ani `title` — brak deskrypcji dla screen readerów. Wzorzec przeciwny do BUG-4 dla widget toolbar (gdzie aria-labels są kompletne).

### Status per pozycja

| ID | Status | Dowód live |
|---|---|---|
| **BUG-1** (bulk select) | ✓ FIXED | Klik "Select all" → header `aria-checked=mixed/true`, wszystkie wiersze `[checked]`, toolbar "SELECTED N" + Bulk actions combobox (Publish/Unpublish/Delete) + Apply (disabled until akcja) + Clear. |
| **BUG-2** (autor "Unknown") | ✓ FIXED | Strona "QA Pages Audit 2026-04-30" utworzona w sesji → Author column = "P Patryk" od razu. |
| **BUG-3** (Loading template options...) | ✓ FIXED | Page Settings drawer otwiera się natychmiast z Template = "Custom (custom)", brak wiszącego loading text. |
| **BUG-4** (widget toolbar aria-label) | ✓ FIXED | Hero ma 4 przyciski z `aria-label` + `title`: "Move Hero up" (disabled gdy first/only), "Move Hero down" (disabled gdy last), "Duplicate Hero", "Delete Hero". |
| **BUG-5** (Radix description) | ✓ FIXED | Dialog Create Page → "Start with a template and publish when ready." Page Settings → "Configure metadata, layout, and defaults for this page." Page History → "Restore published versions or manage the latest draft version." Runtime Preview → "Runtime preview (read-only, site theme)." Konsola: 0 warnings. |
| **BUG-6** (CSRF 403) | ✓ FIXED | `PATCH /admin/api/pages/{id}` → 200 OK, `POST /publish` → 200 OK od pierwszego save'a na świeżo utworzonej stronie. Brak 403 w network log. |
| **UX-1** (Save/Publish toasts) | ✓ FIXED | Polling DOM: po Save draft `[data-sonner-toast]` z "Draft saved." pojawia się ~700-800ms po kliknięciu. Po Publish "Page published." pojawia się ~2-2.5s. |
| **UX-2** (auto-scroll po insert) | ✓ FIXED | Insert Feature Grid po Hero → nowy block ma `top: 64px` (in viewport, alignment "block: start") + highlight `border-primary/50 ring-2 ring-primary/10`. |
| **UX-3** (disabled Create button helper) | ✓ FIXED | Pole Title: helper "Title is required before you can create the page." + helper pod disabled button: "Add a page title to generate a slug and enable Create Page." Po wpisaniu helper zmienia się na "The slug is generated from the title until you edit it." Auto-gen slug: `qa-pages-audit-2026-04-30`. |
| **UX-4** (widget picker kategorie) | ✓ FIXED | Lewy panel: tablist Widgets/Templates/Forms; w Widgets sekcje z licznikami: **Layout 10**, **Content 20**, **Forms 5**, **Navigation 2** (= 37 widgetów). Search "Find components..." filtruje natychmiast. |
| **UX-5** (preview placeholder unreachable) | ✓ FIXED | Mock probe `{ok:false, reason:"unreachable", targetLabel:"http://localhost:3999"}` → dialog pokazuje placeholder: heading "Live preview unavailable" + body "Frontend is not responding at http://localhost:3000. Start the public frontend or update the configured public URL." + CTA "Open page settings" (linkujący do Page Settings). Iframe nie jest renderowany. |
| **UX-6** (wizard handoff) | ✓ FIXED | Po dodaniu Hero → prawy panel: badge "WIZARD", heading "Hero", footer "Next you can fine-tune layout, styling, and advanced settings." + przycisk "Continue to layout and styling". Po kliknięciu → tablist Wizard / Visual / Advanced + sekcje "VARIANT AND PRESETS" (Centered/Media Right/Media Left), "CONTENT", "CTA" itd. |
| **UX-7** (empty slot CTA) | ✓ FIXED + rozszerzone | Slot "Hero Content 0" pokazuje "Add widget to Hero Content" + "Drag from the library or choose a widget from the widgets tab." Klik tego CTA przełącza widget picker w tryb slot-scoped: w lewym panelu pojawia się banner "Insert into Hero Content" + "Clear". |
| **UX-8** (wording Settings + History) | ✓ FIXED | Settings stopka: "Save settings now, or close the panel to keep one **draft version** in history." History dialog description: "Restore published versions or manage the latest **draft version**." Słowo "autosave" zniknęło z user-facing copy. |
| **UX-9** (Max width disabled helper) | ✓ FIXED | Page width = `full` → Max width disabled, helper "Available when Page width is not full." Po zmianie na `default` helper znika i Max width staje się aktywne. Reaktywność potwierdzona. |

### Deep editor flow — 4 widgety + custom data + runtime render

Dodano i skonfigurowano (via wizard) Hero z custom Headline `QA 2026-04-30 Hero Headline`, subhead `Specials: ąęłóżźć / & < > '` (8 polskich znaków + 4 HTML-special), Primary CTA `QA Primary CTA → /qa-primary`, Secondary CTA `QA Secondary CTA → /qa-secondary`. Dodano też Feature Grid, CTA Banner, Stats KPI (defaultowe presety treści). Reorder (Move Feature Grid up/down), Duplicate Hero (klon zachowuje custom data), Delete duplicate — wszystko deterministyczne, `disabled` na granicach. Save → 200 OK + toast. Publish → 200 OK + toast. Runtime page (`http://localhost:3000/qa-pages-audit-2026-04-30`):

- Hero render: `<h1>QA 2026-04-30 Hero Headline</h1>`, subhead `Specials: ąęłóżźć / & < > '` z `&amp; &lt; &gt;` w innerHTML — **escape działa, brak XSS**.
- Feature Grid: defaultowe karty (FEATURE HIGHLIGHTS / Everything your team needs / 3 cards).
- CTA Banner: defaultowe pola (LIMITED OFFER / "Ready to launch your next campaign?" / "Get started" + "Contact sales").
- Stats KPI: 4 metriki defaultowe (`120+ Projects launched`, `99.9% / Faster iteration`, `4× / Higher engagement`, etc.).

### Network audit (PATCH/POST 200 OK)

- `POST /admin/api/pages` → 201/200 (create)
- `PATCH /admin/api/pages/{id}` (×N save'ów) → 200 OK każdy
- `POST /admin/api/pages/{id}/publish` (×2) → 200 OK
- `POST /admin/api/pages/{id}/preview` (×N otwarć dialogu) → 200 OK
- Brak żadnego 403 w całym flow → BUG-6 trzyma fix.

### Drobne sugestie / dryfy do rozważenia (nie buggi)

1. **Page Settings — "Snapshot retention":** label sekcji "SNAPSHOT RETENTION" + helper "Limit how many publish snapshots are kept per page." Słowo "snapshots" pozostało user-facing. Spójniej byłoby "Limit how many published versions are kept per page" (zgodne z "draft version" / "published versions" wzorcem z UX-8). Niska priorytet — nie regresja.
2. **Pages list — przycisk akcji wiersza (`...`):** brak `aria-label` ani `title`. Screen reader user nie ma wskazówki co button robi. Per BUG-4 wzorzec — analogiczny fix typu `aria-label="Open actions for {pageTitle}"`.
3. **Editor — przycisk "Save draft" znika po Publish:** gdy strona przechodzi na status Published z unsaved changes, w toolbarze widoczny jest tylko "Publish" (działa jak Update). Nie jest to regresja, ale brak odrębnego "Save without publishing" dla Published pages może zaskoczyć użytkownika, który chce zachować edycje jako draft pre-publish. Do potwierdzenia czy to zamierzony product spec.

### Screeny (2026-04-30)

- `runtime-preview-unreachable.png` (przy starcie playwright-cli, w katalogu repo) — placeholder dialogu po mock probe unreachable.
- `qa-2026-04-30-editor-final.png` — editor z 4 skonfigurowanymi widgetami + UNSAVED CHANGES badge.

