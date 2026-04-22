# Raport UX/QA — sekcja Forms (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/forms
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Co to jest i co przetestowano

Forms to kreator formularzy z konfigurowalnymi polami, akcjami po wysłaniu (email/webhook/sync/redirect) i panelem diagnostycznym (Action logs). Każdy form ma status (Draft/Active/?), slug, opis i ustawienia reliability (retry, backoff).

**Przetestowane przepływy:**

- Lista forms — empty state, kolumny Form name / Status / Last updated / Actions
- "New form" → dialog Create New Form: Form name, Slug (auto-generacja), Description, Status (Draft default)
- Edytor formularza — 3-panelowy layout (Fields/Library | Canvas | Settings/Automation)
- Lewy panel: tab "Fields" (lista dodanych pól) / "Library" (typy pól)
- Library → 6 typów pól: Text Input, Email Field, Checkbox, Select Menu, Textarea, Date Picker + "Advanced Fields"
- Kliknięcie typu pola → dodanie do canvasu
- Field Settings (prawy panel): tabs General / Logic / Style
- General: Label, Placeholder, Helper Text, Step number, Required Field (switch), Regex Pattern (z "Regex help")
- Logic: Visibility rule ("Always visible" / Hidden fields description)
- Style: Field width, Label position
- Reorder field / Remove field / Duplicate Field buttons — wszystkie z etykietami
- Canvas: widget Contact Form + Submit Form button + field preview
- Form Settings (prawy panel → zakładka Settings): Basics (name/description/status), Experience (Preset, Layout mode, Save progress), Submission Access (Public/Internal), Success Fallback (Success message, Redirect URL), Automation Reliability (Auto-retry, max attempts, base/max delay)
- Automation tab: Send email / Call webhook / Sync entry / Redirect / Success message — każda z Enabled, Continue on error, Run condition (Always)
- "Send email" action po dodaniu: "New submission received" default subject, info "SMTP and default sender are loaded from Settings > Email."
- "Runtime preview" → dialog z formularzem + "Submit preview" + "Open action logs"
- "Action logs" → strona /forms/{id}/action-runs z metrics (Success/Failed/Skipped), filter Status, pusta tabela z empty state
- "Save form" — zapis formularza
- Row menu "..." → Edit / Delete

---

## Bugi

### [BUG-1] KRYTYCZNY: Runtime Preview submit zwraca 500 Internal Server Error

**Gdzie:** Edytor formularza → "Runtime preview" → przycisk "Submit preview"

**Co się dzieje:** Kliknięcie "Submit preview" wysyła żądanie `POST /admin/api/forms/{uuid}/submissions` które zwraca HTTP 500 Internal Server Error. W UI pojawia się czerwona wiadomość błędu, ale serwer wyraźnie zwraca błąd zanim payload zostanie przetworzony. Formularz użytkownika końcowego również wywołuje ten endpoint — czyli cała funkcja Forms może być obecnie nieoperacyjna.

**Kierunek naprawy UI:** Na poziomie UI — po otrzymaniu 500 pokazywać specyficzny komunikat: "Błąd serwera przy wysyłce formularza. Skontaktuj się z administratorem lub sprawdź logi." zamiast generycznego kodu błędu. Zachęcić do otwarcia Action logs (link "Zobacz logi"). Backend wymaga odrębnego fixu — to endpoint core, nie tworzyć równoległego mechanizmu submissions. Przed uruchomieniem funkcji w produkcji potrzebny test e2e całego submit-flow.

---

### [BUG-2] KRYTYCZNY: Delete form — brak potwierdzenia, brak toast, natychmiastowe usunięcie

**Gdzie:** Lista forms → menu "..." → opcja "Delete"

**Co się dzieje:** Kliknięcie "Delete" w menu wiersza natychmiastowo usuwa formularz bez żadnego dialogu potwierdzenia i bez toast. Form znika z listy bez śladu. Identyczny problem jak w Custom Screens — użytkownik który pomyłkowo kliknął nie ma żadnej szansy na cofnięcie.

**Kierunek naprawy UI:** Dodać Radix AlertDialog przed usunięciem: "Usuń formularz [nazwa]?" + treść "Ta operacja jest nieodwracalna. Wszystkie zgromadzone odpowiedzi będą niedostępne." + przyciski "Usuń" (czerwony) i "Anuluj". Po udanym usunięciu — toast "Formularz usunięty". Użyć tego samego komponentu AlertDialog co w Menus i (docelowo) we wszystkich innych sekcjach — nie tworzyć niezależnej implementacji per sekcja.

---

### [BUG-3] ŚREDNI: Raw error code "form_payload_required" pokazywany użytkownikowi

**Gdzie:** Runtime Preview dialog → po nieudanym submit

**Co się dzieje:** Gdy submit się nie powiedzie, dialog pokazuje: "Preview submit failed — form_payload_required". `form_payload_required` to wewnętrzny kod błędu API, nie etykieta UI. Użytkownik nie wie co to oznacza ani jak to naprawić. Identyczny wzorzec jak "Ready / Needs coverage" w Widget Library.

**Kierunek naprawy UI:** Zmapować kody błędów API na user-friendly komunikaty w jednym miejscu (słownik lokalizacji błędów). `form_payload_required` → "Wypełnij wymagane pola przed wysłaniem". Inne kody analogicznie. Słownik w istniejącym mechanizmie i18n aplikacji — nie tworzyć osobnego mapowania per form. Zasada: kody techniczne nie przeciekają do UI — zawsze renderowane przez warstwę translacji.

---

### [BUG-4] ŚREDNI: Brak toast po "Save form"

**Gdzie:** Edytor formularza → przycisk "Save form"

**Co się dzieje:** Po kliknięciu "Save form" przycisk staje się disabled (sygnalizacja że zapisano) ale nie ma toast/powiadomienia. Nie ma też zmiany koloru statusu czy wyraźnego wizualnego potwierdzenia. Użytkownik może nie wiedzieć czy akcja się wykonała. Spójne z problemem we wszystkich sekcjach Admin UI.

**Kierunek naprawy UI:** Toast "Formularz zapisany" po każdym udanym save. Toast z błędem jeśli save nie powiódł. Reguła globalna dla wszystkich sekcji — użyć istniejącego komponentu toast aplikacji.

---

### [BUG-5] ŚREDNI: Row menu na liście forms ma tylko Edit/Delete

**Gdzie:** Lista forms → menu "..."

**Co się dzieje:** Menu wiersza zawiera tylko dwie opcje: Edit i Delete. Brak: Duplicate (tworzy się formularze podobne do istniejących), Publish (zmiana statusu draft→active bez wchodzenia do edytora), skrótu do Action logs, skrótu do Runtime preview, opcji "Zobacz embed code" (jak wkleić form na stronę). Dla porównania Pages/Posts/Entries mają znacznie bogatsze menu.

**Kierunek naprawy UI:** Rozszerzyć menu o Duplicate, Publish/Unpublish (zależnie od statusu), "Show embed code", "View action logs", "Runtime preview". Trzymać się wzorca z Pages/Posts — ten sam komponent row actions menu. Embed code jako modal z snippetem HTML/JSX (analogiczne do "Copy" w JSON preview w Engine).

---

### [BUG-6] NISKI: Radix `aria-describedby` warning w konsoli

**Gdzie:** Konsole przeglądarki przy otwieraniu dialogu Create New Form i Runtime Preview

**Co się dzieje:** `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}` — identyczny problem jak w Pages, Posts, Custom Screens. Pojawia się przy każdym otwarciu Radix Dialog bez jawnej deklaracji description.

**Kierunek naprawy UI:** Zbiorczy fix w centralnym wrapperze DialogContent dla całej aplikacji — dodać wymagany prop `description` lub `aria-describedby` na poziomie wrappera. Dotyczy wszystkich sekcji — rozwiązać raz w jednym miejscu, nie dodawać description per dialog osobno.

---

### [BUG-7] NISKI: "Advanced Fields" w Library nie rozwija się

**Gdzie:** Edytor formularza → Lewy panel → tab Library → sekcja "Advanced Fields"

**Co się dzieje:** Na końcu listy typów pól jest "Advanced Fields" — sugeruje collapsed section. Kliknięcie nie rozwija niczego, nie nawiguje, nie zmienia stanu. Albo feature niezaimplementowany, albo collapsible z brakującą logiką, albo tylko etykieta grupy (bez content).

**Kierunek naprawy UI:** Jeśli planowane advanced fields (file upload, signature, rating, tag, itp.) — wyświetlić je jako normalne pozycje listy lub jako collapsed accordion z widocznym chevron. Jeśli niezaimplementowane — ukryć element lub oznaczyć "Beta — coming soon" z widocznym badge. Nie zostawiać elementów interfejsu które sugerują interakcję ale nic nie robią.

---

## Problemy UX

### [UX-1] Lista forms — brak wyszukiwarki i filtrów

**Gdzie:** /admin/coderso/forms — główna lista

**Problem:** Lista formularzy nie ma search bar ani filtra Status (Draft/Active) ani filtra po dacie. Przy rosnącej liczbie formularzy zarządzanie listą będzie trudne. Nawet empty state nie pokazuje toolbar z filtrami — wszystko pojawia się dopiero gdy są wpisy (ale i wtedy brak search/filter).

**Kierunek naprawy UI:** Dodać search bar nad tabelą (filtrowanie po name/slug) + filtr Status + sortowanie po kliknięciu nagłówków kolumn. Wzorzec analogiczny do Pages/Posts/Entries — użyć tego samego komponentu DataTable toolbar, nie reimplementować. Filtr Status co najmniej 3 stany: All / Draft / Active.

---

### [UX-2] "Public forms use bot protection when enabled" — bez kontekstu

**Gdzie:** Form Settings → Submission Access → opis pod Access mode

**Problem:** Tekst informuje "Public forms use bot protection when enabled". "When enabled" — przez kogo, gdzie? Nie ma linku do ustawień bot protection ani informacji czy aktualnie jest włączone. Użytkownik nie wie czy publiczny form jest faktycznie chroniony czy nie.

**Kierunek naprawy UI:** Rozszerzyć tekst: "Ochrona przed botami (reCAPTCHA/hCaptcha) jest obecnie [włączona/wyłączona]." + link "Skonfiguruj ochronę" prowadzący do Settings → Security. Dodatkowo: widoczny status badge przy Access mode (zielona "Chroniony" / żółta "Bez ochrony") żeby użytkownik od razu widział. Spójne z zasadą: disabled-state lub związane pola zawsze mają link do skonfigurowania.

---

### [UX-3] Automation action types — brak ikon i opisów na liście

**Gdzie:** Automation tab → lista 5 typów akcji

**Problem:** Typy akcji (Send email, Call webhook, Sync entry, Redirect, Success message) wyświetlone jako płaskie przyciski tekstowe bez ikon i bez opisów. Użytkownik nie wie czy "Sync entry" to do zapisania zgłoszenia jako entry w content type, czy coś innego. Dopiero po dodaniu akcji pojawia się opis pod rozwiniętą konfiguracją.

**Kierunek naprawy UI:** Każdy typ akcji pokazywać z ikoną (mail/webhook/database/arrow-right/check) + jedna linijka opisu pod nazwą: "Send email — wyślij powiadomienie", "Call webhook — wyślij POST do zewnętrznego URL", "Sync entry — zapisz jako rekord w content type", "Redirect — przekieruj po sukcesie", "Success message — wyświetl komunikat inline". Wzorzec spójny z Widget Library gdzie każdy widget ma ikonę + tytuł + opis.

---

### [UX-4] Podwójny przycisk "Action logs" (u góry edytora + w Automation tab)

**Gdzie:** Edytor formularza — toolbar (Action logs | Runtime preview | Save form) + Automation tab (nagłówek "Automation" + "Action logs")

**Problem:** Dwa różne punkty wejścia do tego samego Action logs. Który jest właściwy? Oba otwierają tę samą stronę `/forms/{id}/action-runs`. Duplikowany UI element bez jasnej różnicy.

**Kierunek naprawy UI:** Zostawić tylko jeden punkt — "Action logs" w toolbarze (jako sibling Runtime Preview, Save form). Usunąć z Automation tab lub zmienić etykietę na kontekstową: "Zobacz logi ostatnich uruchomień" z ikoną history, aby nie powielać identycznego CTA. Zasada: jedno działanie = jeden punkt wejścia.

---

### [UX-5] Dwupoziomowy tablist w prawym panelu — warstwy kontekstu

**Gdzie:** Edytor formularza → prawy panel

**Problem:** Prawy panel ma dwa poziomy zakładek:
1. Gdy form jest zaznaczony: "Settings" / "Automation" (konfiguracja całego formularza)
2. Gdy field jest zaznaczony: "General" / "Logic" / "Style" (konfiguracja pola)
Przełączanie między kontekstem form ↔ field następuje przez klikanie w canvas. Użytkownik może się zgubić — "Jestem w Settings formularza czy w General polu?".

**Kierunek naprawy UI:** Dodać wyraźny nagłówek kontekstu na górze panelu: "Ustawienia formularza" (Contact Form) lub "Ustawienia pola" (Your Name) + ikona odpowiadająca kontekstowi + breadcrumb "Contact Form › Your Name" gdy field wybrany. Przycisk "← Wróć do ustawień formularza" gdy field zaznaczony. Wzorzec spójny z Block Inserter w Posts gdzie prawy panel ma przełącznik Post/Block.

---

### [UX-6] Field Details tab w lewym panelu — nie przetestowane / niejasny cel

**Gdzie:** Edytor → lewy panel (obserwowane "Fields" / "Library" w snapshot, mentioned "Fields Details" gdzieś w UI)

**Problem:** W tekście UI pojawia się zwrot "Fields Details" sugerujący dodatkowy tab obok Fields/Library, ale nie jest on widoczny jako osobny tab. Niejasne czy to osobny widok, część Fields tab, czy zmieniający się nagłówek.

**Kierunek naprawy UI:** Jeśli Details ma być osobnym widokiem dla pojedynczego pola — zaimplementować jako trzecią zakładkę z listą wszystkich fields wraz z ich statusem (required, validation, visibility). Jeśli nie — usunąć "Details" z nagłówka, bo obecnie wprowadza mylące sugestie o istnieniu dodatkowej zakładki.

---

### [UX-7] Empty state Library "Advanced Fields" sugeruje brakujące funkcje

**Gdzie:** Library tab → "Advanced Fields" bez content

**Problem:** Widząc "Advanced Fields" bez rozwinięcia użytkownik może pomyśleć że zaawansowanie typy pól (file upload, rating, captcha, itp.) istnieją, ale są ukryte. Brak jasnego sygnału czy to "beta feature" czy "enterprise only" czy "coming soon".

**Kierunek naprawy UI:** Trzy opcje do wyboru: (a) jeśli features istnieją — pokazać je normalnie, (b) jeśli są planowane — oznaczyć "Beta — w przygotowaniu" z disabled state i tooltipem "Dostępne wkrótce", (c) jeśli wymagają plugin/subscription — oznaczyć "Premium" z linkiem do Plugin Store. Nie zostawiać elementów sugerujących tajemnicę.

---

### [UX-8] Form Settings → Experience → "Preset: Custom / Keep your current custom structure"

**Gdzie:** Form Settings → sekcja Experience → pole Preset

**Problem:** Preset: "Custom" z opisem "Keep your current custom structure." Użytkownik nie wie jakie są inne presety ani co oznacza "current custom structure". Kombinacja bez kontekstu — sugeruje że są predefiniowane presety, ale nie wskazuje jakie ani czemu służą.

**Kierunek naprawy UI:** Jeśli istnieją inne presety (np. "Contact form", "Newsletter signup", "Job application") — wypełnić dropdown tymi opcjami i pokazać krótki opis każdego. Jeśli nie istnieją — usunąć pole Preset lub zmienić "Custom" na "Empty form" z opisem "Start from scratch". Obecny stan (jeden preset "Custom" opisujący "your current custom structure") to dead UI.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Dialog "Create New Form" — slug auto-generuje z nazwy | Spójne z Pages/Posts |
| Field Library — 6 podstawowych typów | Pokrywa większość use cases |
| Field Settings: General / Logic / Style tabs | Dobry podział — content / behavior / appearance |
| Required Field switch z opisem "Prevent empty submissions." | Pomocny kontekst |
| "Regex help" przycisk przy pole Regex | Pomoc kontekstowa — lepsze niż pozostawienie użytkownika samemu |
| Reorder field / Remove field / Duplicate Field — buttony z labelami | Accessibility — lepiej niż w Pages editor (BUG-4 tam) |
| Visibility rule w Logic tab | Zaawansowane ale dostępne |
| Style tab: Field width, Label position | Basic styling w MVP |
| Form Settings → Submission Access: Public vs Internal | Jasne rozróżnienie use case |
| Automation Reliability: Auto-retry + max attempts + backoff (base/max delay) | Enterprise-grade config |
| Automation actions: Send email / Webhook / Sync entry / Redirect / Success message | Kompletny zestaw dla typowego form |
| Każda akcja z Enabled + Continue on error + Run condition | Fine-grained control |
| "SMTP and default sender are loaded from Settings > Email." — hint | Wskazuje gdzie konfigurować upstream |
| Runtime Preview jako osobny dialog | Test submission bez opuszczania edytora |
| Action logs — dedykowana strona z Success/Failed/Skipped metrics | Professional diagnostic UX |
| Action logs empty state: "Use Runtime preview in the form editor to trigger a test submission." | Jasny CTA co zrobić żeby zobaczyć logi |
| Pokazywanie błędu submit w dialogu Runtime Preview | Błąd dociera do użytkownika (mimo że raw kod BUG-3) |

---

## Screenshoty

- `forms-empty.png` — lista forms: empty state "No forms yet"
- `create-form-dialog.png` — dialog Create New Form (name, slug, description, status)
- `form-editor.png` — edytor formularza po utworzeniu (3-panelowy layout)
- `field-library.png` — Library tab z 6 typami pól + Advanced Fields
- `field-added.png` — canvas po dodaniu Text Input, Field Settings rozwinięte
- `automation-tab.png` — Automation tab z 5 typami akcji
- `action-added.png` — "Send email" action dodana i rozwinięta
- `runtime-preview.png` — dialog Runtime Preview z formularzem
- `preview-submit-error.png` — błąd "Preview submit failed — form_payload_required"
- `action-logs.png` — strona Action logs z metrics (Success 0 / Failed 0 / Skipped 0)
- `forms-list.png` — lista forms z utworzonym Contact Form
- `form-row-menu.png` — menu wiersza: Edit / Delete (tylko)

---

## Błędy z konsoli (runtime)

```
POST http://localhost:5173/admin/api/forms/{uuid}/submissions → 500 Internal Server Error
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent} (2× per dialog open)
```
