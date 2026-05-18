# RAPORT: Booking Calendar Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Booking Calendar Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** `/test-booking-calendar-0516` (page ID: `7d092c9a-d552-4cf7-a82b-d99ddbe19297`)
> **Plik widgetu:** `core/widgets/core/bookingCalendar.tsx`
> **Edytor:** `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
> **Runtime script:** `core/widgets/core/bookingRuntimeScript.ts`

---

## 1. Przegląd widgetu

**Typ:** Interactive / Runtime  
**Moduł:** Forms  
**Warianty:** tylko `default`  
**Powiązane:** `appointment-form` widget (para booking flow)

Widget `booking-calendar` renderuje interaktywny wybór terminu: serwis, zasób, data, sloty czasowe. Runtime (client script) wykonuje fetch do `/api/booking/slots` i obsługuje komunikację z widgetem `appointment-form` przez `CustomEvent` i `flowId`.

Dane testowe użyte podczas sesji:
- **Zasób:** "Test Mechanic" (Staff, Europe/Warsaw)
- **Serwis:** "Oil Change Service" (30 min, 5000 PLN, dostęp Public)
- **Dostępność:** Poniedziałek 08:00–18:00 Europe/Warsaw

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Identyfikacja** | `flowId` (łączy z appointment-form) |
| **Treść** | `title`, `description` |
| **Etykiety** | `serviceLabel`, `resourceLabel`, `dateLabel`, `refreshLabel` |
| **Komunikaty** | `missingSelectionMessage`, `emptySlotsMessage`, `loadingMessage`, `errorMessage`, `selectedSlotEmptyMessage` |
| **Zachowanie** | `intervalMinutes` (5–180 min), `defaultServiceId`, `defaultResourceId` |
| **Endpoint** | `slotsEndpoint` (domyślnie `/api/booking/slots`) |
| **Style** | `style.frameBackground`, `style.frameBorderColor` |
| **Resolved** | `services[]`, `resources[]`, `slotsToken`, `error` |

### 2.2 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Flow key, Copy (title/description/etykiety), Surface (ramka), Slot interval |
| **Visual** | Wariant, Copy, Surface, Status messages (5 pól) |
| **Advanced** | Slots endpoint, Default IDs, Resolved runtime payload diagnostic, Layout, Visibility |

### 2.3 Runtime client script — zachowanie

- Bind przy DOMContentLoaded/immediate call (singleton guard)
- Sync resource options po zmianie serwisu (`data-resource-ids` na option)
- Auto-set daty na dzisiaj przy braku wartości
- Fetch na każdą zmianę: serwis / zasób / data / refresh button
- `CustomEvent` `nextless:booking-slot-selected` — koordynacja z appointment-form
- `window.__nextlessBookingRuntimeState` — pamięć wybranych slotów per flowId

---

## 3. Zidentyfikowane braki UX/UI (analiza kodu)

### 3.1 Brak wizualnego kalendarza (krytyczny)

Widget używa natywnego `<input type="date">` zamiast UI kalendarza. Wygląd i interakcja różni się drastycznie między przeglądarkami (Chrome vs Safari vs Firefox). Brak wizualnego zaznaczenia dni z dostępnymi slotami — użytkownik musi zgadywać, które daty mają dostępne terminy.

**Brakuje:**
- Komponentu kalendarza miesiąc/tydzień z oznaczonymi dniami
- Blokady dat przeszłych
- Wizualnego zaznaczenia dni z dostępnością
- Nawigacji strzałkami między tygodniami / miesiącami

### 3.2 Brak wyświetlania cen serwisów

`BookingCalendarResolvedService` zawiera `priceCents` i `currency`, ale żadne z tych pól nie jest wyświetlane w UI. Użytkownik nie widzi ceny serwisu przed rezerwacją.

### 3.3 Brak opisu i czasu trwania serwisu

Serwis ma `description`, `durationMinutes`, `bufferBeforeMinutes`, `bufferAfterMinutes` — żadne nie trafia do UI. Użytkownik nie wie, co wybiera ani ile trwa usługa.

### 3.4 Brak strefy czasowej przy slotach

Zasoby (`resources`) mają pole `timezone`, ale strefa czasowa nie jest wyświetlana przy slotach ani przy podsumowaniu wybranego slotu. Dla rezerwacji cross-timezone to poważny problem UX.

### 3.5 Brak stanu loading na przycisku Refresh

Przycisk "Refresh slots" nie zmienia stanu (disabled/loader) podczas ładowania. Użytkownik może kliknąć wielokrotnie i nie wie, czy ładowanie trwa.

### 3.6 Brak możliwości odznaczenia/usunięcia wyboru

Po wybraniu slotu nie ma opcji jego odznaczenia — trzeba wybrać inny lub przeładować stronę. Brak przycisku "Clear selection".

### 3.7 Tylko jeden wariant layoutu

Widget oferuje tylko wariant `default`. Brak:
- `compact` — dla sidebar / małych przestrzeni
- `inline` — bez ramki/karty
- `horizontal` — wybory obok siebie na desktop

### 3.8 Brak wskaźnika liczby dostępnych slotów per data

Przy nawigacji między datami brak wskazówki, czy wybrany dzień ma jakiekolwiek wolne sloty (przed załadowaniem). Użytkownik klikając kolejne daty nie wie, których unikać.

### 3.9 Brak `defaultDate` w konfiguracji

Można ustawić `defaultServiceId` i `defaultResourceId`, ale nie `defaultDate`. Widget zawsze ustawia dzisiaj przez `todayDateInputValue()` bez możliwości konfiguracji innej daty startowej.

### 3.10 Brak walidacji zakresu dat

Nie ma możliwości skonfigurowania `minDate` / `maxDate` — np. rezerwacje tylko z wyprzedzeniem min 24h lub max 30 dni.

### 3.11 Stan pusty widgetu (developer-facing, nie user-facing)

Gdy brak serwisów/zasobów, widoczny jest tekst: `"No active booking services/resources configured yet."` — to komunikat dla developerów, nie dla użytkowników końcowych. Powinien być konfigurowalny lub wskazywać kontakt.

### 3.12 Brak ARIA i dostępności

- `data-booking-slots-status` (paragraf z statusem loading) nie ma `aria-live="polite"` — screen readery nie odczytają zmian
- Grid slotów (`data-booking-slots`) brak `role="list"` i `aria-label`
- Przyciski slotów brak `aria-pressed` (aktualnie wybrany)
- Sekcja kalendarza brak `role="region"` i `aria-label`

### 3.13 Brak koloru/stanu wybranego slotu w edytorze

Edytor (Visual/Advanced) nie pozwala na konfigurację koloru podświetlenia wybranego slotu ani stanu hover. Hardcoded klasy Tailwind: `border-[var(--color-primary)]`, `bg-[var(--color-primary)]/10`.

### 3.14 Edytor: brak color pickerów dla style fields

`style.frameBackground` i `style.frameBorderColor` to pola tekstowe (CSS wartość). Brak color pickerów — wymagana znajomość CSS / design tokenów.

### 3.15 Edytor wizard: brak wyboru domyślnego serwisu/zasobu z listy

Pola `defaultServiceId` / `defaultResourceId` są dostępne tylko w zakładce Advanced jako pola tekstowe z ID. W Wizard/Visual brak dropdownu wyboru serwisu i zasobu z faktycznej listy — tylko raw string input.

### 3.16 Mobile: 4 kolumny sterowania stosują się pionowo

Layout `grid gap-3 md:grid-cols-4` — na mobile 4 pola stackują się, tworząc długi formularz przed slotami. Brak optymalizacji mobile: np. service+resource w jednym wierszu, data i refresh w drugim.

### 3.17 Brak loading skeleton dla slotów

Podczas ładowania widoczny jest tylko tekstowy komunikat "Loading slots...". Brak skeleton loader (animowany placeholder), co daje odczucie niespójności z resztą systemu.

### 3.18 Brak deduplication guard przy szybkim klikaniu

Kliknięcie "Refresh" wielokrotnie uruchamia równoległe fetche. Runtime script nie anuluje poprzedniego requestu (brak AbortController).

---

## 4. Testy Playwright — Admin UI Preview

### 4.1 Dodawanie widgetu do strony

| Test | Wynik |
|------|-------|
| Widget widoczny w panelu Widgets > Forms jako "Booking Calendar" | ✓ Działa |
| Kliknięcie przycisku "+" dodaje widget do canvas strony | ✓ Działa |
| Widget natychmiast aktywowany i edytor otwarty w prawym panelu | ✓ Działa |

### 4.2 Edytor Wizard

| Test | Wynik |
|------|-------|
| Widoczne sekcje: Flow, Copy, Surface, Availability behavior | ✓ Działa |
| Pole "Flow key" z placeholderem `booking-flow` | ✓ Działa |
| Pola Copy (Title, Description, Service/Resource/Date/Refresh labels) | ✓ Działa |
| Surface: Frame background i Frame border z przyciskiem Clear | ✓ Działa |
| Slot interval (spinbutton, domyślnie 15) | ✓ Działa |
| Przycisk "Continue to layout and styling" nawiguje do Visual | ✓ Działa |

### 4.3 Edytor Visual

| Test | Wynik |
|------|-------|
| Widoczne zakładki: Wizard / Visual / Advanced | ✓ Działa |
| Sekcja wariantów: tylko "Default" (brak innych) | ✓ (1 wariant) |
| Przycisk "Add variant preset" | ✓ Widoczny |
| Copy section: identyczna z Wizard | ✓ Działa |
| Surface section: Frame background/border z Clear | ✓ Działa |
| Status messages (5 pól): Loading, No slots, Missing selection, Error, Selected slot placeholder | ✓ Działa |
| Brak color pickerów — pola tekstowe dla wartości CSS | ⚠ Brak UI |

### 4.4 Edytor Advanced

| Test | Wynik |
|------|-------|
| Runtime endpoints: Slots endpoint (edytowalny) | ✓ Działa |
| Defaults: Default service ID / Default resource ID (raw text) | ✓ Działa, ale brak dropdown |
| Resolved runtime payload: "Services: 0 · Resources: 0" nawet po konfiguracji | ✗ Nie aktualizuje się |
| Runtime error flag (tekstowe) | ✓ Działa |
| Layout: Container, Padding top/bottom, Margin top/bottom | ✓ Działa |
| Visibility: Desktop/Tablet/Mobile switche | ✓ Działa |

### 4.5 Preview canvas — stan pusty

| Test | Wynik |
|------|-------|
| Widget bez serwisów/zasobów pokazuje "No active booking services/resources configured yet." | ✓ Potwierdzone |
| Po skonfigurowaniu serwisów/zasobów w Booking admin — preview NADAL pusty | ✗ Błąd/Brak synchronizacji |
| Admin preview nigdy nie pokazuje aktywnych serwisów/zasobów | ✗ Krytyczny brak |

**Przyczyna:** Admin preview używa uproszczonego renderowania bez wywoływania `resolveBookingRuntimeData()`. Dane `resolved.services` i `resolved.resources` są zawsze puste w kontekście edytora strony.

---

## 5. Testy Playwright — Frontend (localhost:3000)

### 5.1 Renderowanie widgetu z danymi

| Test | Wynik |
|------|-------|
| Widget renderuje z listą serwisów (dropdown) | ✓ Działa |
| Widget renderuje z listą zasobów (dropdown) | ✓ Działa |
| Dropdown Service: opcja "Oil Change Service" | ✓ Działa |
| Dropdown Resource: opcja "Test Mechanic" | ✓ Działa |
| Data domyślna ustawiona na dzisiaj (2026-05-16) | ✓ Działa |
| Auto-load slotów przy renderowaniu | ✓ Działa |

### 5.2 Ładowanie slotów

| Test | Wynik |
|------|-------|
| Zmiana daty na poniedziałek (dzień z dostępnością) → sloty ładują się automatycznie | ✓ Działa |
| API GET `/api/booking/slots` zwraca HTTP 200 | ✓ Działa |
| 39 slotów dla poniedziałku 08:00–18:00 (serwis 30 min, interwał 15 min) | ✓ Działa, ale zbyt wiele |
| Data bez dostępności (sobota, niedziela) → "No available slots for selected date." | ✓ Działa |
| Przycisk Refresh ładuje sloty ponownie | ✓ Działa |
| Przycisk Refresh: brak stanu disabled/loading podczas fetcha | ✗ Brakuje feedback |

### 5.3 Wybór slotu

| Test | Wynik |
|------|-------|
| Kliknięcie slotu "08:00 - 08:30" → slot wybrany | ✓ Działa |
| Wybrany slot: dodana klasa `border-[var(--color-primary)] bg-[var(--color-primary)]/10` | ✓ Działa |
| Podsumowanie wybranego slotu: "18 maj 2026 • 08:00 - 08:30" (format przeglądarki) | ✓ Działa, ale bez TZ |
| `window.__nextlessBookingRuntimeState` zaktualizowany z wybranym slotem | ✓ Działa |
| Podsumowanie w formacie locale (polski "maj") — nie konfigurowalny | ⚠ Hardcoded locale |
| Brak strefy czasowej w podsumowaniu wybranego slotu | ✗ Brakuje |

### 5.4 Walidacja dat

| Test | Wynik |
|------|-------|
| Data przeszła (2020-01-06 poniedziałek) → API zwraca sloty | ✗ Brak blokady dat przeszłych |
| API `/api/booking/slots` dla dat przeszłych → HTTP 200 + sloty | ✗ Brak walidacji po stronie API |
| Brak atrybutu `min` na `<input type="date">` | ✗ Brak ograniczenia |

### 5.5 Layout mobile (375×812)

| Test | Wynik |
|------|-------|
| Slot grid: 2 kolumny (162.5px) | ✓ OK |
| Controls grid: 1 kolumna — 4 pola stackują się pionowo | ⚠ Długa forma |
| Ogółem: widget używalny, ale form jest długi przed slotami | ⚠ Można poprawić |

### 5.6 Dostępność (ARIA)

| Test | Wynik |
|------|-------|
| `[data-booking-slots-status]` ma `aria-live` | ✗ Brak |
| `[data-booking-slots]` ma `role="list"` | ✗ Brak |
| `[data-booking-slots]` ma `aria-label` | ✗ Brak |
| Przyciski slotów mają `aria-pressed` | ✗ Brak |
| Sekcja kalendarza ma `role="region"` | ✗ Brak |
| Sekcja kalendarza ma `aria-label` | ✗ Brak |

### 5.7 Formatowanie slotów

| Test | Wynik |
|------|-------|
| Sloty wyświetlane jako "HH:MM - HH:MM" (24h format) | ✓ Działa |
| Brak oznaczenia strefy czasowej przy slotach | ✗ Brakuje |
| Brak oznaczenia AM/PM | ✓ OK (format 24h czytelny) |
| 39 slotów dla 10h okna (30 min serwis, 15 min interwał) — nakładające się sloty | ⚠ Zbyt wiele slotów |

---

## 6. Porównanie Admin vs Frontend

| Aspekt | Admin Preview | Frontend |
|--------|--------------|----------|
| Renderowanie serwisów/zasobów | ✗ Zawsze pusty — "No active..." | ✓ Działa poprawnie |
| Interakcja z slotami | ✗ Niemożliwa (brak danych) | ✓ Pełna funkcjonalność |
| Stylowanie widgetu | ✓ Działa (ramka, kolory) | ✓ Działa |
| Runtime script | ✗ Nie wywołany (no services) | ✓ Aktywny |

**Przyczyna rozbieżności:** Admin canvas nie wywołuje `resolveBookingRuntimeData()` (server resolver). W efekcie `data.resolved.services` i `data.resolved.resources` są zawsze pustą tablicą w admin preview, co powoduje wyświetlanie stanu pustego zamiast faktycznych danych. Na froncie resolver jest wywoływany przez server-side rendering i dane są prawidłowo hydratowane.

---

## 7. Nowe braki UX/UI zidentyfikowane podczas testów Playwright

### 7.1 Admin preview nigdy nie pokazuje serwisów/zasobów (krytyczny)

Admin preview pokazuje "No active booking services/resources configured yet." nawet gdy Booking admin ma skonfigurowane aktywne serwisy i zasoby. Edytorzy treści nie mogą zobaczyć, jak widget będzie wyglądać z danymi bez przejścia na frontend.

**Skutek:** Edytor nie może weryfikować konfiguracji widgetu, co utrudnia pracę i może prowadzić do błędów konfiguracyjnych niewidocznych w adminpanelu.

### 7.2 Zbyt wiele nakładających się slotów (UX problem)

Przy domyślnym `intervalMinutes=15` i serwisie 30-minutowym na 10-godzinne okno: **39 slotów** nakładających się (08:00–08:30, 08:15–08:45, etc.). Użytkownik widzi chaotyczną siatkę slotów, które się nakładają, co jest mylące.

**Oczekiwane zachowanie:** Interwał slotów powinien być powiązany z czasem trwania serwisu (slot co 30 min dla 30-minutowego serwisu) lub posiadać opcję `non-overlapping` mode.

### 7.3 Brak blokady dat przeszłych

API `/api/booking/slots` zwraca sloty dla dat przeszłych (200 OK). `<input type="date">` nie ma `min` atrybutu. Użytkownik może zarezerwować termin w 2020 roku.

### 7.4 Skonfigurowanie dostępności: UX flow Add row → Save (nieintuicyjny)

W Booking admin → Availability: formularz "Add row" wymaga kliknięcia "Add row" PRZED "Save schedules". Nie ma wizualnego rozróżnienia między "formularzem do dodania nowego wiersza" a "zapisanymi wierszami". Łatwo kliknąć "Save schedules" bez dodania wiersza (co nie zapisuje nic).

### 7.5 Pole "Default service ID" i "Default resource ID" w Advanced — raw UUID

Użytkownik musi znać ID serwisu/zasobu (UUID), żeby ustawić domyślne. Brak dropdownu z listą aktywnych serwisów/zasobów.

---

## 8. Rekomendacje priorytetowe

### WYSOKI PRIORYTET

| # | Rekomendacja | Opis |
|---|-------------|------|
| 1 | Podgląd admin z danymi | Wywołać `resolveBookingRuntimeData()` (preview mode) w kontekście admin canvas lub dodać placeholder z mock-data gdy widget jest skonfigurowany ale bez resolved data |
| 2 | Blokada dat przeszłych | Dodać `min={todayDateInputValue()}` do `<input type="date">` i walidację w API |
| 3 | Dostępność ARIA | Dodać `aria-live="polite"` do status node, `role="list"` + `aria-label` do slots grid, `aria-pressed` do slot buttons, `role="region"` + `aria-label` do sekcji |
| 4 | Strefa czasowa przy slotach | Wyświetlić timezone zasobu przy etykietach slotów i w podsumowaniu wybranego slotu |

### ŚREDNI PRIORYTET

| # | Rekomendacja | Opis |
|---|-------------|------|
| 5 | Wyświetlanie ceny i czasu trwania serwisu | Pokazać `priceCents` + `currency` i `durationMinutes` przy wyborze serwisu |
| 6 | Cena i opis serwisu | Dodać opis serwisu jako tooltip lub rozwinięty panel przy wyborze |
| 7 | Loading state na Refresh | Disabled + spinner na przycisku Refresh podczas fetcha |
| 8 | AbortController dla fetch | Anulować poprzedni request przy nowym fetchowaniu slotów |
| 9 | Dropdown dla defaultServiceId/defaultResourceId | W Advanced editor zastąpić raw text input dropdownem z listą aktywnych serwisów/zasobów |
| 10 | Konfigurowalny pusty stan | Dodać pole `emptyStateMessage` konfigurowane przez admina (zamiast developer-facing tekstu) |

### NISKI PRIORYTET

| # | Rekomendacja | Opis |
|---|-------------|------|
| 11 | Color picker dla style fields | Zastąpić text input dla `frameBackground`/`frameBorderColor` color pickerem |
| 12 | Warianty layoutu | Dodać `compact` i `inline` warianty |
| 13 | Pole `defaultDate` w konfiguracji | Umożliwić ustawienie domyślnej daty startowej |
| 14 | Mobile UX: 2×2 grid controls | Zmienić mobile layout z 1-kolumn na 2×2 (service+resource, date+refresh) |
| 15 | Skeleton loader | Zastąpić tekstowy "Loading slots..." animowanym skeleton placeholderem |
| 16 | `minDate`/`maxDate` config | Dodać opcję ograniczenia zakresu dostępnych dat |

---

## 9. Podsumowanie

Widget `booking-calendar` jest **funkcjonalny na froncie** — sloty ładują się poprawnie, wybór slotu działa, integracja z appointment-form przez `CustomEvent` jest gotowa. Kod jest solidnie zwalidowany i zabezpieczony (nonce, slots token).

**Główne problemy UX:**

1. **Admin preview jest bezużyteczny** — zawsze pokazuje stan pusty niezależnie od konfiguracji Booking w systemie. To poważna przeszkoda w pracy edytorów.
2. **Brak blokady dat przeszłych** — API i frontend akceptują daty historyczne.
3. **Brak dostępności ARIA** — wszystkie kluczowe elementy interaktywne pozbawione atrybutów ARIA.
4. **Brak kontekstu dla użytkownika** — cena serwisu, opis, czas trwania i strefa czasowa niewidoczne w widgecie.
5. **Nakładające się sloty** — domyślny interwał 15 min z serwisem 30 min generuje chaotyczną siatkę slotów.

Widget jest gotowy do **podstawowego użycia** na prostych wdrożeniach, ale wymaga ww. poprawek przed użyciem produkcyjnym w środowiskach wymagających wysokiej jakości UX lub dostępności.

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Booking Calendar is classification only.
  Widget-owned booking runtime and UX behavior continues through the `TASK-259`
  family.
- Shared rows that match existing TASK-256 mechanisms still route through
  `TASK-256-03` or `TASK-256-04`, but TASK-256 ships no Booking
  Calendar-specific code from this report. Final widget execution remains
  deferred to `TASK-259`.

---

## Status po TASK-259 (2026-05-18)

| Zakres | Status | Owner | Dowód |
|--------|--------|-------|------|
| 4.5, 6, 7.1 admin preview katalogu | Fixed | TASK-259-01 | `tests/vitest/admin/bookingCalendarPreview.test.ts`, `tests/vitest/ui/booking-calendar-admin-preview.test.tsx` |
| 3.9, 3.10, 5.4, 7.3 date policy i signed range | Fixed | TASK-259-02 | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, `tests/vitest/validation/bookingSchemas.test.ts`, route smoke w Bun |
| 3.2, 3.3, 3.4, 3.11, 5.3, 5.7 kontekst serwisu, TZ, summary locale | Fixed | TASK-259-03 | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`, runtime summary coverage |
| 3.5, 3.6, 3.17, 3.18, 5.2 loading, abort, clear selection | Fixed | TASK-259-04 | `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` |
| 3.1, 3.8, 7.2 week picker, availability signals, slot density | Fixed | TASK-259-05 | `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` |
| 3.7, 3.13, 3.16 warianty, mobile, selected/hover styles | Fixed | TASK-259-06 | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` |
| 3.15, 4.4, 7.5 default pickers i truthful diagnostics | Fixed | TASK-259-07 | `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`, `tests/vitest/ui/booking-calendar-admin-preview.test.tsx` |
| 3.12, 5.6 shared ARIA baseline | Excluded from TASK-259 | TASK-293 | osobny shared follow-up po TASK-256 |
| 3.14 shared frame color picker | Excluded from TASK-259 | TASK-294 | osobny shared follow-up po TASK-256 |
| 7.4 Booking admin `Add row -> Save schedules` UX | Excluded from TASK-259 | TASK-295 | osobny admin follow-up poza surface widgetu |

### Walidacja lokalna

- Zielone:
  - `git diff --check`
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/bookingCalendarPreview.test.ts tests/vitest/ui/booking-calendar-admin-preview.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/validation/bookingSchemas.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
- Środowiskowe blokery:
  - `bun run scan:security:strict` nadal wpada na lokalne trust anchors w `semgrep` i brak połączenia dla `bun audit`
  - DB-backed Booking Bun suites pozostają `skip` po `source .env`, bo `canConnect()` nie widzi osiągalnego DB w tej worktree
