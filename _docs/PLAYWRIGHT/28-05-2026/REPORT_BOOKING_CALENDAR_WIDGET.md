# RAPORT: Booking Calendar Widget — pełny audyt domknięcia luk (29-05-2026)

> **Status:** Zakończony — wyczerpujący audyt wszystkich dyskretnych kontrolek edytora (Wizard / Visual / Advanced) + runtime frontu, z **domknięciem wcześniej niepokrytych kontrolek**
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-booking-calendar-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** `2fc615b9-5d62-4135-839f-3f10b119f0da`
> **Trasa publiczna:** `/test-booking-calendar-0516` (tytuł strony: `TEST-BOOKING-CALENDAR-0516`)
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Raporty pokrewne:** poprzednia wersja tego pliku (29-05, sesja `claude-29-05-booking-calendar`), `27-05-2026/REPORT_BOOKING_CALENDAR_WIDGET.md` (smoke), `23-05-2026-22-18/REPORT_BOOKING_CALENDAR_WIDGET.md` (historyczny)

---

## 0. Dlaczego ta wersja (kandydat luki: „kontrolki ćwiczone tylko częściowo")

Poprzednia wersja raportu była mocna, ale po zestawieniu z kodem edytora
(`BookingCalendarEditors.tsx`) i kontraktem (`bookingCalendarEditorContract`) ujawniła
**trzy dyskretne kontrolki zapisywalne, które były tylko zbiorczo wspomniane lub pominięte**,
a nie wysterowane indywidualnie z asercją na DOM:

1. **Copy → Description** (`description`, `<textarea>`) — nie było w tabeli „działa".
2. **Copy → Resource label** (`resourceLabel`) — zbiorczo schowane pod „Service/Date label".
3. **Status messages → Empty state** (`emptyStateMessage`) — z 6 pól komunikatów zmapowano
   tylko 5; szóste (stan „brak katalogu") nie miało dowodu renderu.

Ta wersja **realnie wysterowała te trzy kontrolki** (oraz indywidualnie wszystkie 5 kontrolek
Surface, w tym wcześniej zbiorczo opisaną „Selected slot border") i potwierdziła ich wpływ
na DOM. Pozostałe rodziny kontrolek przeszły re-audyt potwierdzający. Po tym domknięciu
**inwentarz dyskretnych kontrolek widgetu jest wyczerpany** — patrz macierz w sekcji 2.

---

## 1. Metoda i zakres

Audyt na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli` (sesja izolowana).
Weryfikacja przez realne interakcje z UI edytora oraz inspekcję DOM (`eval` / `run-code`)
zarówno na żywym podglądzie admin, jak i na **w pełni zhydratowanym** renderze trasy publicznej
(token wstrzyknięty przez serwer → realny runtime slotów end-to-end).

**Kontrolki sterowano dwiema drogami:**
- Pola tekstowe / textarea / select → `fill` lub natywny setter `value` + zdarzenia
  `input`/`change` (handler React reaguje).
- Kontrolki koloru Surface to natywne `<input type="color">` bez pola hex
  (`showValueInput={false}`) → sterowane **programowo** (natywny setter + `input`/`change`);
  realne kliknięcie pickera OS pozostaje nieautomatyzowalne, ale **efekt zmiany koloru
  potwierdzono** na DOM.

**Nie zapisywano** (`Save draft` / `Publish`) — aby nie zmutować współdzielonej fixtury.
Wszystkie edycje admin pozostały in-memory; potwierdzono na froncie, że **nie wyciekły**
(opis, etykieta zasobu, tryb pickera bez zmian na trasie publicznej).

**Screenshoty:** nie przechwytywano plików PNG. Weryfikacja przez asercje DOM / `eval` /
`fetch`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie **lokalnymi etykietami**,
ignorowanymi przez Git i niestanowiącymi evidence w repo.

**Pliki źródłowe:**
- `core/widgets/core/bookingCalendar.tsx` — renderer, model danych, normalizacja, schemat, kontrakt.
- `core/widgets/core/bookingRuntimeScript.ts` — klient runtime (binding, sloty, kaskada, week picker, formatowanie).
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/services/bookingCalendarPreview.ts` + `core/server/routes/bookingRoutes.ts` + `core/server/publicBookingApi.ts` — preview i runtime API.

**Stan fixtury w chwili testu (katalog runtime, 2 usługi + 2 zasoby):**
- „Oil Change Service" (30 min, PLN 50.00, opis „Standard oil change with filter replacement").
- „Runtime Service 56a6b722" (30 min, brak ceny).
- Zasoby: „Test Mechanic" (Europe/Warsaw), „Runtime Resource f53a8a53".
- Relacja usługa→zasób jest **1:1** (każda usługa ma dokładnie jeden dozwolony zasób) — dobrze pokazuje kaskadę.

---

## 2. Inwentarz dyskretnych kontrolek (z kodu) i stan pokrycia

| Tryb / sekcja | Kontrolka (ścieżka) | Wysterowano? |
|---|---|---|
| Wizard · Flow | Booking flow (`flowId`) | ✓ (1 opcja w fixturze — patrz N1) |
| Wizard · Availability | Slot interval (`intervalMinutes`, 5–180) | ✓ klamrowanie |
| Wizard · Availability | Default service (`defaultServiceId`) | ✓ + kaskada |
| Wizard · Availability | Default resource (`defaultResourceId`) | ✓ kaskada zasobu |
| Wizard · Date policy | Default / Min / Max date | ✓ + klamrowanie góra/dół |
| Visual · Variant | Layout variant (4) | ✓ wszystkie 4 |
| Visual · Copy | Title | ✓ |
| Visual · Copy | **Description** | ✓ **domknięte tym przebiegiem** |
| Visual · Copy | Service label | ✓ |
| Visual · Copy | **Resource label** | ✓ **domknięte tym przebiegiem** |
| Visual · Copy | Date label | ✓ |
| Visual · Copy | Refresh button | ✓ |
| Visual · Surface | Frame background | ✓ |
| Visual · Surface | Frame border | ✓ |
| Visual · Surface | Selected slot background | ✓ |
| Visual · Surface | **Selected slot border** | ✓ **indywidualnie domknięte** |
| Visual · Surface | Slot hover border | ✓ |
| Visual · Surface | Clear (per swatch) | ✓ (z defektem I3) |
| Visual · Status | Loading | ✓ |
| Visual · Status | No slots | ✓ |
| Visual · Status | Missing selection | ✓ |
| Visual · Status | Error | ✓ |
| Visual · Status | Selected slot placeholder | ✓ |
| Visual · Status | **Empty state** | ✓ **domknięte tym przebiegiem** |
| Visual · Service context | Show price / duration / description / timezone | ✓ wszystkie 4 |
| Visual · Service context | Date language (`summaryLocale`, 7 presetów) | ✓ (Polish reprezentatywnie) |
| Visual · Service context | Summary date style (3) | ✓ |
| Visual · Date picker | Date picker mode (native/week) | ✓ (admin) |
| Visual · Date picker | Slot interval mode (3) | ✓ (atrybut + density `fixed` na froncie) |
| Advanced · diagnostyka | 7 wierszy read-only | ✓ (brak pól zapisywalnych) |

**Poza kontraktem widgetu (wspólne kontrolki bloku):** edytor renderuje też ogólne
kontrolki ramy bloku, niezależne od booking-calendar: `layout.container`,
`layout.padding.top/bottom`, `layout.margin.top/bottom`,
`visibility.devices.desktop/tablet/mobile`. **Nie należą do kontraktu widgetu** (są wspólne
dla wszystkich bloków) i celowo nie są przedmiotem tego audytu — patrz N5.

Podział własności: **Wizard** = setup techniczny (flow/dostępność/daty), **Visual** = całość
treści i prezentacji, **Advanced** = wyłącznie podgląd diagnostyczny (`writablePaths: []`).

---

## 3. PRZETESTOWANE i DZIAŁA (zweryfikowane na żywo)

### 3.1 Domknięte kontrolki (nowe evidence w tym przebiegu)

| Kontrolka | Akcja | Wynik na DOM |
|---|---|---|
| **Copy → Description** | wpisano „AUDYT-OPIS: wybierz termin poniżej." | `<p>` pod `<h3>` w podglądzie zmienił tekst na wpisany. ✓ |
| **Copy → Resource label** | wpisano „Mechanik (audyt)" | `<span>` etykiety selecta zasobu (`[data-booking-resource]`) zmienił się na wpisany. ✓ |
| **Status → Empty state** | wpisano „AUDYT-PUSTY: rezerwacja chwilowo niedostępna.", przełączono do Wizarda | „Live preview" Wizarda (bez rozwiązanego katalogu) wyrenderował tę treść w boksie pustego stanu (`.border-dashed`). ✓ — potwierdza ścieżkę `!hasCatalog` z `bookingCalendar.tsx:913` |

### 3.2 Wizard

| Funkcja | Wynik |
|---|---|
| **Slot interval** (spinbutton, klamrowanie) | 200→180, 2→5, 30→30; pole pokazuje wartość docelową. ✓ |
| **Default service → kaskada zasobu** | przełączenie usługi przełącza listę „Default resource" zgodnie z `resourceIds`. ✓ |
| **Date policy — default / min / max** | natywny `<input type=date>` w podglądzie dostaje `min`/`max`; klamrowanie default w górę (do min) i w dół (do max) działa (`resolveInitialDateValue`). ✓ |
| **Przejścia trybu** | „Run setup again" → Wizard, „Finish setup and open Visual" → Visual; stan zachowany. ✓ |

### 3.3 Visual — Variant, Copy, Surface, Status, Service context, Date picker

| Funkcja | Wynik |
|---|---|
| **Variant Default** | `space-y-4 rounded-xl border p-5`. ✓ |
| **Variant Compact** | `space-y-3 rounded-lg border p-4`. ✓ |
| **Variant Inline** | `space-y-4 border-0 p-0` (bez ramki). ✓ |
| **Variant Horizontal** | grid `lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]` + pojawia się sidebar `[data-booking-selected-summary-sidebar]`. ✓ |
| **Copy — Title / Service / Date / Refresh** | mapują na `<h3>` / etykiety kontrolek / tekst przycisku (live). ✓ |
| **Surface — 5 kontrolek, indywidualnie** | ustawiono 5 różnych kolorów naraz: `frameBackground=#ff0000`→`background-color: rgb(255,0,0)`; `frameBorderColor=#00ff00`→`border-color: rgb(0,255,0)`; `selectedSlotBackground=#0000ff`→`--booking-slot-selected-bg:#0000ff`; **`selectedSlotBorderColor=#ffff00`→`--booking-slot-selected-border:#ffff00`**; `slotHoverBorderColor=#ff00ff`→`--booking-slot-hover-border:#ff00ff`. Po zdefiniowaniu `style` znikają klasy legacy. ✓ |
| **Status messages (6/6)** | wszystkie 6 mapują: „Loading"→`data-loading` (status), „No slots"→`data-empty`, „Missing selection"→`data-missing`, „Error"→`data-error` (na `[data-booking-slots]`), „Selected placeholder"→tekst+`data-empty` (summary), **„Empty state"→boks pustego stanu** (patrz 3.1). ✓ |
| **Service context — Show price/duration/description/timezone** | toggle price OFF usuwa cenę z meta; duration OFF usuwa meta; description ON dodaje opis; timezone OFF usuwa węzeł `[data-booking-resource-timezone]`. ✓ |
| **Service context — Date language / Summary date style** | „Polish"→`data-summary-locale="pl-PL"`; „Long"→`data-summary-date-style="long"`. ✓ |
| **Date picker — Week** | `data-date-picker-mode="week"`, pojawia się `[data-booking-week-picker]` (prev/next + grid dni), natywny input daty dostaje `sr-only`. ✓ (nawigacja week — patrz N2) |
| **Slot interval mode** | „Service duration"→`service-duration`, „Non-overlapping"→`non-overlapping`, „Fixed"→`fixed`. ✓ (atrybut; realna różnica gęstości — patrz N3) |

### 3.4 Advanced (read-only)

| Pole | Wartość |
|---|---|
| Slot loading route | „Default runtime route". ✓ |
| Booking flow | „Matches Choose appointment slot" (patrz I4). |
| Resolved catalog | „Services: 2 · Resources: 2" — zgodne z fixturą. ✓ |
| Default service / resource | „Auto-select first available…". ✓ |
| Slots token | „Not injected in editor" — zgodne (admin preview bez tokenu). ✓ |
| Runtime error | „No runtime warning". ✓ |
| Brak pól zapisywalnych | cały panel read-only (`writablePaths: []`). ✓ |

### 3.5 Admin preview — statyczna powłoka (architektura)

W podglądzie admin widget jest **statyczną powłoką**: `data-slots-token` pusty,
brak `data-booking-calendar-bound` (wstrzyknięty `<script>` nie wykonuje się w React).
→ w admin: brak ładowania slotów, brak auto-daty, brak kaskady runtime; renderują się tylko
kontrolki i kontekst usługi (SSR). **Interaktywność slotów testuje się wyłącznie na froncie.**

### 3.6 Frontend (trasa publiczna, runtime aktywny)

| Aspekt | Wynik |
|---|---|
| **Runtime binding** | `data-booking-calendar-bound="1"`. ✓ |
| **Slots token** | wstrzyknięty przez serwer, długość 82. ✓ |
| **Zapisana konfiguracja / brak wycieku** | `datePickerMode=native`, `slotIntervalMode=fixed`, etykieta zasobu „Resource", opis bez „AUDYT" — **edycje in-memory z admina NIE wyciekły**. ✓ |
| **Auto-data = dzisiaj** | input daty = `2026-05-29`, `min` = `2026-05-29` (ochrona przed datą przeszłą). ✓ |
| **Realne odpytanie API** | `/api/booking/slots` z tokenem → `200` dla wszystkich testowanych dat. **2026-06-01 (pon.) → 39 slotów; 2026-06-08 (pon.) → 39**; 06-02…06-05, 06-09 (wt.–pt./inne) → `0`. Format `{ items: [...] }`. ✓ (Uwaga: w tym przebiegu sloty wypadają **tylko w poniedziałki** — to inny rozkład niż w przebiegach 27/28-05; różnica danych fixtury, nie defekt.) |
| **Render slotów** | dla `2026-06-01`: status „39 available time slots.", 39 elementów, pierwszy „08:00 AM - 08:30 AM" (06:00 UTC → 08:00 Europe/Warsaw, format 12h). ✓ |
| **Gęstość `fixed` na froncie** | kolejne okna: 08:00–08:30, 08:15–08:45, 08:30–09:00 → **krok 15 min przy oknie 30 min** (okna nakładające się) = poprawne zachowanie trybu `fixed` (interval 15). ✓ (konkretne evidence dla density, wcześniej tylko atrybut) |
| **Wybór slotu** | klik → dokładnie 1 `aria-pressed="true"`, podsumowanie „Jun 01, 2026 • 08:00 AM - 08:30 AM • Europe/Warsaw", „Clear selection" aktywny, slot dostaje inline `background-color: var(--booking-slot-selected-bg); border-color: var(--booking-slot-selected-border)`. ✓ **Zmienne CSS z Surface są realnie konsumowane przez sloty.** |
| **Clear selection** | podsumowanie → „No slot selected yet.", przycisk → disabled, `aria-pressed` → 0. ✓ |
| **Konsola** | 0 błędów, 0 ostrzeżeń po wszystkich interakcjach. ✓ |

### 3.7 Dostępność (frontend)

| Element | Atrybut | Wynik |
|---|---|---|
| `<section>` root | `role="region"` + `aria-labelledby` (id istnieje) | ✓ |
| Lista slotów | `role="list"` + `aria-labelledby` (sr-only „Available time slots") | ✓ |
| Status slotów | `role="status"` + `aria-live="polite"` + `aria-atomic="true"` | ✓ |
| Wybrany slot | `aria-pressed` `true`/`false` | ✓ |

---

## 4. Spójność Admin ↔ Frontend

| Funkcjonalność | Admin Preview | Frontend | Zgodność |
|---|---|---|---|
| Render wariantu / layout | ✓ (ten sam renderer) | ✓ | ✓ |
| Kontekst usługi (SSR) | ✓ | ✓ | ✓ |
| Etykiety / komunikaty (zapisane) | domyślne | domyślne | ✓ (edycje in-memory nie wyciekły) |
| Slots token | **pusty** | **wstrzyknięty (82)** | ⚠ różnica oczekiwana |
| Runtime binding (sloty) | **brak** (statyczna powłoka) | **aktywny** | ⚠ różnica oczekiwana |
| Kaskada usługa→zasób | tylko w edytorze (Wizard) | runtime (`syncResourceOptions`) | ✓ obie ścieżki |
| A11y (region/list/status) | ✓ | ✓ | ✓ |

**Wniosek:** renderer SSR jest współdzielony (admin preview = front statycznie), ale
**interaktywność slotów istnieje tylko na froncie** (serwer wstrzykuje token i wykonuje
runtime). To architektura, nie błąd.

---

## 5. CO NIE DZIAŁA / WYMAGA UWAGI (defekty + nuty UX)

| # | Obserwacja | Klasyfikacja |
|---|---|---|
| **I3** | **„Clear" w Surface nie przywraca klas legacy.** Potwierdzone ponownie: po ustawieniu kilku kolorów i kliknięciu „Clear" na `frameBackground`, `background-color` znika (`""`), ale `style` pozostaje zdefiniowanym obiektem (inne kolory wciąż ustawione), więc klasy fallback `border-[var(--color-border)] bg-[var(--color-bg)]/95` **pozostają wygaszone** (`legacy:false`). Po wyczyszczeniu pojedynczego pola rama nie wraca w 100% do pierwotnego wyglądu. | Drobny defekt kosmetyczny rendererра |
| **I4** | **Advanced: „Booking flow — Matches Choose appointment slot".** Matchuje flow do kalendarza o tytule = własny tytuł widgetu (Wizard filtruje bieżący blok, Advanced nie), więc wygląda, jakby widget „matchował sam siebie". | Drobna nuta UX / niespójność |

Powyższe to **jedyne** pozycje „nie-OK" o charakterze defektu/niespójności. Nie stwierdzono
żadnego twardego buga blokującego ani błędu konsoli.

---

## 6. NUTY UX / ARCHITEKTURA (oczekiwane, nie-defekty)

| # | Obserwacja |
|---|---|
| **U1** | **Wizard „Live preview" pokazuje pusty stan** („Booking is currently unavailable…" lub — jak w tym teście — wpisany `emptyStateMessage`), bo nie wstrzykuje rozwiązanego katalogu, podczas gdy główny canvas pokazuje pełny picker. Mylące w trakcie setupu. (Ta ścieżka posłużyła do weryfikacji `emptyStateMessage`.) |
| **U2** | **Admin preview to statyczna powłoka** — brak tokenu i bindingu runtime; ładowania/wyboru slotu nie da się przetestować w samym adminie. Brak wizualnego sygnału „podgląd nieinteraktywny". |
| **U3** | **Surface bez pola hex** (`showValueInput={false}`) — jedyną drogą jest picker OS; brak wpisania/wklejenia koloru z klawiatury (sam efekt zmiany koloru działa). |
| **U4** | **Widget wymaga JS** — w stanie no-JS (raw SSR) input daty i lista slotów są puste; brak `<noscript>` fallbacku (oczekiwane dla widgetu sterowanego runtime). |

---

## 7. NIE-TESTOWALNE bez mutacji fixtury / poza zakresem

| # | Pozycja | Powód |
|---|---|---|
| **N1** | Pełna ścieżka matchowania **Flow** do innego kalendarza | w fixturze nie ma drugiego widgetu booking-calendar (lista `calendars` filtruje bieżący blok) → dropdown ma tylko „Default booking flow". |
| **N2** | **Nawigacja Week pickera na froncie** (prev/next, `refreshAvailability`) | zapisany `datePickerMode=native`, więc `[data-booking-week-picker]` **nie renderuje się na froncie** (potwierdzono: `weekPickerPresentOnFront:false`); w admin preview struktura jest, ale powłoka jest niezwiązana (brak runtime). Test wymagałby zapisu konfiguracji = mutacji współdzielonej fixtury. |
| **N3** | **Realna różnica gęstości** dla `service-duration` / `non-overlapping` na froncie | front ma zapisane `fixed`; mapowanie trybów (`resolveIntervalMinutes`) działa po stronie klienta z `data-slot-interval-mode`, którego nie zmienimy na froncie bez zapisu. Potwierdzono jedynie tryb `fixed` (krok 15 / okno 30) i zapis atrybutu dla pozostałych. |
| **N4** | **Formatowanie pod `pl-PL`** i style dat (`medium`/`long`) na froncie | zapisany locale domyślny (`08:00 AM`, en-default); zmiana wymaga zapisu. Atrybuty `data-summary-locale` / `data-summary-date-style` potwierdzono w adminie. |
| **N5** | **Wspólne kontrolki bloku** (`layout.*`, `visibility.devices.*`) | nie należą do kontraktu widgetu booking-calendar (są wspólne dla wszystkich bloków), więc poza zakresem audytu tego widgetu. |
| **N6** | **Para z Appointment Form** (zdarzenie `nextless:booking-slot-selected`, wspólny `flowId`) | brak widgetu Appointment Form w tej fixturze; binding formularza istnieje w runtime, ale nie ma czego sparować. |
| **N7** | **Zapis / Publikacja** (`Save draft` / `Publish`) | świadomie pominięte — ochrona współdzielonej fixtury. |

---

## 8. Podsumowanie pokrycia

**Po tym przebiegu inwentarz dyskretnych kontrolek widgetu jest wyczerpany** (sekcja 2):
każda kontrolka zapisywalna Wizarda i Visuala została wysterowana indywidualnie z asercją na
DOM, w tym trzy wcześniej tylko-zbiorczo-opisane (`description`, `resourceLabel`,
`emptyStateMessage`) oraz piąta kontrolka Surface (`selectedSlotBorderColor`). Panel Advanced
jest w całości read-only i potwierdzony. Runtime frontu (najważniejsza, sterowana JS ścieżka)
zadziałał end-to-end bez błędów konsoli: realny fetch, render, wybór, czyszczenie, konsumpcja
zmiennych CSS, kaskada usług, ochrona daty przeszłej, a11y i live region.

Pozycje „nie-OK" ograniczają się do **1 drobnego defektu kosmetycznego** (I3) i **1 drobnej
niespójności UX** (I4). Pozycje nie-testowalne (N1–N7) wynikają z ograniczeń fixtury,
zakresu widgetu lub świadomej ochrony danych (brak zapisu) — nie z defektów.

---

## 9. Statystyki

| Kategoria | Liczba |
|---|---|
| Dyskretne kontrolki widgetu wysterowane indywidualnie | wszystkie z kontraktu (Wizard + Visual + Advanced read-only) |
| Kontrolki domknięte w tym przebiegu | 4 (`description`, `resourceLabel`, `emptyStateMessage`, `selectedSlotBorderColor`) |
| Funkcje zweryfikowane jako działające | ~45 |
| Twarde bugi blokujące | 0 |
| Drobny defekt kosmetyczny (renderer) | 1 (I3) |
| Drobna niespójność UX | 1 (I4) |
| Nuty UX / architektura | 4 (U1–U4) |
| Pozycje nie-testowalne / poza zakresem | 7 (N1–N7) |
| Błędy / ostrzeżenia konsoli (frontend) | 0 |
