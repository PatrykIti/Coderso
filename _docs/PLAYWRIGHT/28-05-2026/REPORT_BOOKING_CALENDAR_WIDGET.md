# RAPORT: Booking Calendar Widget — audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend (z realnym runtime'em slotów)
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-booking-calendar` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** `2fc615b9-5d62-4135-839f-3f10b119f0da`
> **Trasa publiczna:** `/test-booking-calendar-0516` (tytuł strony: `TEST-BOOKING-CALENDAR-0516`)
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Raporty pokrewne:** `27-05-2026/REPORT_BOOKING_CALENDAR_WIDGET.md` (smoke), `23-05-2026-22-18/REPORT_BOOKING_CALENDAR_WIDGET.md` (historyczny)

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI
edytora oraz inspekcji DOM (`eval` / `run-code`) zarówno na żywym podglądzie admin,
jak i na **w pełni zhydratowanym** renderze trasy publicznej. W odróżnieniu od
raportów smoke z 27-05, ten przebieg **realnie uruchomił runtime slotów** na froncie
(token wstrzyknięty przez serwer) i przetestował end-to-end ładowanie oraz wybór slotu.

**Co faktycznie przetestowano (z asercjami DOM / sieci):**

- Logowanie do admina, otwarcie fixtury (katalog: 2 usługi, 2 zasoby).
- Tryb **Wizard**: flow, slot interval (klamrowanie 5–180), default service →
  kaskada zasobów, polityka dat (default/min/max + klamrowanie w górę i w dół),
  przejścia trybu („Run setup again" / „Finish setup and open Visual").
- Tryb **Visual**: 4 warianty layoutu, copy (title/labels/refresh), Surface
  (5 kontrolek koloru — programowo wysterowane), status messages (6 pól → atrybuty
  runtime), service context (4 toggle + locale + summary date style), date picker
  (native/week, 3 tryby gęstości slotów).
- Tryb **Advanced**: diagnostyka read-only (runtime route, resolved catalog,
  default service/resource, slots token, runtime error).
- **Frontend**: runtime binding, kaskada usługa→zasób, auto-data (dzisiaj = min),
  realne odpytanie `/api/booking/slots` z tokenem (7 dat), render slotów, wybór
  slotu (aria-pressed + podsumowanie + CSS vars), „Clear selection", a11y,
  responsywność 375px, konsola, raw SSR (stan no-JS).

**Czego NIE testowano (świadomie) — patrz też sekcja 7:**

- **Nie zapisywano** zmian (`Save draft` / `Publish`) — aby nie zmutować współdzielonej
  fixtury. Wszystkie eksperymenty w admin pozostały w pamięci edytora; trasa publiczna
  odzwierciedla wyłącznie wcześniej zapisaną konfigurację (potwierdzone — moje edycje
  in-memory NIE wyciekły na front).
- **Powiązania z widgetem Appointment Form** (zdarzenie `nextless:booking-slot-selected`,
  współdzielony `flowId`) — nie testowano pary kalendarz ↔ formularz.
- **Nawigacji Week pickera na froncie** (prev/next tygodnia) — zweryfikowano tylko
  obecność struktury w admin; nie wysterowano nawigacji na froncie.
- **Realnej różnicy gęstości slotów** dla trybów `service-duration` / `non-overlapping`
  na froncie — zweryfikowano tylko zapis atrybutu `data-slot-interval-mode`.
- **Formatowania dat/godzin pod inny locale** na froncie (obserwowano tylko domyślny
  format `08:00 AM`, en-default; nie zapisano `pl-PL`, więc front pozostał na domyślnym).
- **Matchowania flow do innych kalendarzy** — w fixturze nie ma innych widgetów
  booking-calendar, więc dropdown Flow ma tylko „Default booking flow".

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez asercje
DOM / `eval` / `fetch`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi
etykietami, ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**

- `core/widgets/core/bookingCalendar.tsx` — renderer, model danych, normalizacja, schemat, kontrakt edytora.
- `core/widgets/core/bookingRuntimeScript.ts` — klient runtime (binding, ładowanie slotów, kaskada, formatowanie).
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/services/bookingCalendarPreview.ts` + `core/server/routes/bookingRoutes.ts` + `core/server/publicBookingApi.ts` — preview i runtime API.

---

## 1. Przegląd widgetu

**Typ:** `booking-calendar` (kategoria: forms)
**Warianty:** `default` (domyślny), `compact`, `inline`, `horizontal`
**Tryby edytora:** Wizard (jednorazowy setup: flow + dostępność + polityka dat),
Visual (codzienna edycja: wariant, copy, surface, komunikaty, kontekst, picker),
Advanced (diagnostyka read-only)
**Zakres slot interval:** 5–180 min (klamrowane)

Widget to interaktywny picker slotów rezerwacji. Użytkownik wybiera usługę, zasób
i datę, a runtime po stronie klienta odpytuje serwerowy endpoint
(`/api/booking/slots`) o dostępne terminy i renderuje je jako klikalne przyciski.
Po wyborze slotu generuje podsumowanie i emituje zdarzenie, którego może nasłuchiwać
sparowany widget Appointment Form (przez wspólny `flowId`). Konfigurowalne są:
etykiety/komunikaty, kontekst usługi (cena/czas trwania/opis/strefa czasowa),
tryb pickera dat (natywny/tygodniowy), tryb gęstości slotów, kolory powierzchni.

**Stan fixtury w chwili testu:** katalog runtime z **2 usługami** i **2 zasobami**:
- „Oil Change Service" (30 min, PLN 50.00, opis „Standard oil change with filter
  replacement") → dozwolony zasób: „Test Mechanic" (Europe/Warsaw).
- „Runtime Service 56a6b722" (30 min, brak ceny) → dozwolony zasób:
  „Runtime Resource f53a8a53".

Każda usługa ma dokładnie **jeden** dozwolony zasób — relacja usługa→zasób jest
1:1, co dobrze pokazuje działanie kaskady (`resourceIds`).

---

## 2. Model danych i kontrakt edytora (z kodu)

| Sekcja / pola | Tryb (writable) |
|---------------|-----------------|
| `flowId` | Wizard (Flow) |
| `intervalMinutes` (5–180), `defaultServiceId`, `defaultResourceId` | Wizard (Availability) |
| `defaultDate`, `minDate`, `maxDate` (format `YYYY-MM-DD`) | Wizard (Date policy) |
| `variant` (`default`/`compact`/`inline`/`horizontal`) | Visual (`visualOwnsVariantSelection: true`) |
| `title`, `description`, `serviceLabel`, `resourceLabel`, `dateLabel`, `refreshLabel` | Visual (Copy) |
| `loadingMessage`, `emptySlotsMessage`, `missingSelectionMessage`, `errorMessage`, `selectedSlotEmptyMessage`, `emptyStateMessage` | Visual (Status messages) |
| `showServicePrice`, `showServiceDuration`, `showServiceDescription`, `showTimezone`, `summaryLocale`, `summaryDateStyle` | Visual (Service context) |
| `datePickerMode` (`native`/`week`), `slotIntervalMode` (`fixed`/`service-duration`/`non-overlapping`) | Visual (Date picker) |
| `style.frameBackground/frameBorderColor/selectedSlotBackground/selectedSlotBorderColor/slotHoverBorderColor` | Visual (Surface) |
| `slotsEndpoint` | Advanced (read-only) |
| `flowId`, `defaultServiceId`, `defaultResourceId`, `resolved.services/resources/slotsToken/error` | Advanced (read-only diagnostyka) |

Podział własności jest świadomy: **Wizard** to setup techniczny (flow/dostępność/daty),
**Visual** to całość treści i prezentacji, **Advanced** to wyłącznie podgląd
diagnostyczny (brak pól zapisywalnych).

---

## 3. Co DZIAŁA (zweryfikowane na żywo)

### 3.1 Wizard

| Funkcja | Wynik testu |
|---------|-------------|
| **Slot interval** (spinbutton) | Klamrowanie działa i jest **widoczne w polu**: 200 → 180 (max), 2 → 5 (min), 30 → 30. Po klamrowaniu input pokazuje wartość docelową, nie wpisaną. ✓ |
| **Default service → kaskada zasobu** | Zmiana „Auto" → „Runtime Service 56a6b722" przełącza opcje „Default resource" z [Test Mechanic] na [Runtime Resource f53a8a53]. ✓ Filtr `resourceIds` działa w edytorze. |
| **Date policy — default** | `data-default-date` przyjmuje wartość po walidacji formatu. ✓ |
| **Date policy — klamrowanie (w górę)** | default `2026-05-15` przy min `2026-06-01` → natywny input daty w podglądzie pokazuje `2026-06-01`. ✓ (`resolveInitialDateValue`) |
| **Date policy — klamrowanie (w dół)** | default `2026-12-25` przy max `2026-06-30` → input daty pokazuje `2026-06-30`. ✓ |
| **Date policy — min/max na input** | Natywny `<input type=date>` w podglądzie dostaje `min`/`max` zgodne z polityką. ✓ |
| **Przejścia trybu** | „Run setup again" wchodzi w Wizard, „Finish setup and open Visual" wraca do Visual, stan zachowany. ✓ |

### 3.2 Visual

| Funkcja | Wynik testu |
|---------|-------------|
| **Wariant Default** | rootClass `space-y-4 rounded-xl border p-5`. ✓ |
| **Wariant Compact** | rootClass `space-y-3 rounded-lg border p-4` (gęstszy). ✓ |
| **Wariant Inline** | rootClass `space-y-4 border-0 p-0` (bez ramki). ✓ |
| **Wariant Horizontal** | rootClass z gridem `lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]` + **pojawia się sidebar** „Selection summary" (`data-booking-selected-summary-sidebar`). ✓ |
| **Copy — Title** | → `<h3>` w podglądzie (live). ✓ |
| **Copy — Service/Date label, Refresh** | → etykiety kontrolek i tekst przycisku odświeżania (live). ✓ |
| **Status messages (6 pól)** | Wszystkie mapują na atrybuty runtime: „No slots" → `data-empty`, „Missing selection" → `data-missing`, „Error" → `data-error` (na `[data-booking-slots]`), „Selected placeholder" → tekst + `data-empty` (na summary), „Loading" → `data-loading` (na status). ✓ |
| **Service context — Show price OFF** | meta usługi „30 min · PLN 50.00" → „30 min" (cena znika). ✓ |
| **Service context — Show duration OFF** | meta usługi znika całkowicie (zostaje sama nazwa). ✓ |
| **Service context — Show description ON** | dochodzi opis „Standard oil change with filter replacement". ✓ |
| **Service context — Show timezone OFF** | węzeł `[data-booking-resource-timezone]` znika całkowicie. ✓ |
| **Service context — Date language** | „Polish" → `data-summary-locale="pl-PL"`. ✓ |
| **Service context — Summary date style** | „Long" → `data-summary-date-style="long"`. ✓ |
| **Date picker — Week** | `data-date-picker-mode="week"`, pojawia się `[data-booking-week-picker]` (prev/next + grid dni), a natywny input daty dostaje klasę `sr-only`. ✓ |
| **Slot interval mode** | „Service duration" → `service-duration`, „Non-overlapping" → `non-overlapping`, „Fixed interval" → `fixed`. ✓ |
| **Surface — Frame background** | ustawienie `#ff0000` → `style="background-color: rgb(255,0,0)"` na ramce + usunięcie klas legacy + włączenie „Clear". ✓ |
| **Surface — Frame border** | `#123456` → `border-color: rgb(18,52,86)`. ✓ |
| **Surface — Selected slot bg / hover border** | → zmienne CSS `--booking-slot-selected-bg` / `--booking-slot-hover-border` na ramce. ✓ (konsumowane przez sloty na froncie — patrz 3.5) |
| **Surface — Clear** | przywraca stan „Theme default", wyłącza przycisk, swatch wraca do fallbacku. ✓ (z zastrzeżeniem I3 — patrz sekcja 6) |

> **Uwaga narzędziowa:** kontrolki Surface to natywne `<input type="color">`
> (picker OS) bez pola tekstowego hex (`showValueInput={false}`). Wysterowano je
> **programowo** (natywny setter + zdarzenia `input`/`change`) i — w odróżnieniu
> od obserwacji przy widgecie product-compare — **handler React zadziałał, kolor
> realnie zastosował się do podglądu**. Realne kliknięcie pickera OS pozostaje
> nieautomatyzowalne, ale efekt zmiany koloru został potwierdzony.

### 3.3 Advanced (read-only)

| Pole | Wartość |
|------|---------|
| **Slot loading route** | „Default runtime route" (+ help: custom routes są wstecznie kompatybilne). ✓ |
| **Booking flow** | „Matches Choose appointment slot" (patrz nuta I4). |
| **Resolved catalog** | „Services: 2 · Resources: 2" — zgodne z fixturą. ✓ |
| **Default service / resource** | „Auto-select first available service/resource". ✓ |
| **Slots token** | „Not injected in editor" — **zgodne z faktem**, że admin preview nie dostaje tokenu (patrz 3.4). ✓ |
| **Runtime error** | „No runtime warning". ✓ |
| **Brak pól zapisywalnych** | Cały panel to wiersze read-only — zgodne z kontraktem (`writablePaths: []`). ✓ |

### 3.4 Admin preview — statyczna powłoka (ważna obserwacja)

W podglądzie admin widget jest **statyczną powłoką**:
- `data-slots-token` = **pusty**, `data-booking-calendar-bound` = **brak** (runtime
  nie wiąże się w admin — wstrzyknięty `<script dangerouslySetInnerHTML>` nie wykonuje
  się w React).
- W konsekwencji w admin: **brak ładowania slotów**, brak auto-ustawienia daty na
  dzisiaj, brak kaskady zasobów po stronie klienta. Renderują się tylko kontrolki
  i kontekst usługi (SSR). To oczekiwane dla widgetu sterowanego runtime'em, ale
  oznacza, że **interaktywność slotów testuje się wyłącznie na froncie**.

### 3.5 Frontend (trasa publiczna, runtime aktywny)

| Aspekt | Wynik |
|--------|-------|
| **Runtime binding** | `data-booking-calendar-bound="1"` — klient runtime aktywny. ✓ |
| **Slots token** | Wstrzyknięty przez serwer, długość 82 znaki (potwierdzone też w raw SSR). ✓ |
| **Zapisana konfiguracja** | `datePickerMode=native`, `slotIntervalMode=fixed`, domyślne etykiety — **moje edycje in-memory z admina NIE wyciekły**. ✓ |
| **Kaskada usługa→zasób** | Dla „Oil Change Service" zasób „Runtime Resource f53a8a53" jest `hidden+disabled`, „Test Mechanic" widoczny. Po przełączeniu na „Runtime Service 56a6b722" — odwrotnie, a zasób auto-przełącza się na dozwolony. ✓ (`syncResourceOptions`) |
| **Auto-data = dzisiaj** | Input daty ustawiony na `2026-05-29` (dziś), `min` = `2026-05-29` — **ochrona przed datą przeszłą** (brak polityki → dziś jako dolna granica). ✓ |
| **Realne odpytanie API** | `/api/booking/slots` z tokenem zwraca `200` dla 7 testowanych dat. Format: `{ slots: { items: [...] } }`. **2026-06-01 (pon.) → 38–39 slotów**; dziś i weekendy → `items: []`. ✓ |
| **Render slotów** | Po ustawieniu daty `2026-06-01`: status „39 available time slots.", 39 elementów slotów, pierwszy „08:00 AM - 08:30 AM" (12h, czas Europe/Warsaw, 06:00 UTC → 08:00 CEST). ✓ |
| **Wybór slotu** | Klik slotu → `aria-pressed="true"` (dokładnie 1), podsumowanie „Jun 01, 2026 • 08:00 AM - 08:30 AM • Europe/Warsaw", „Clear selection" aktywny, slot dostaje inline `background-color: var(--booking-slot-selected-bg); border-color: var(--booking-slot-selected-border)`. ✓ **Zmienne CSS z sekcji Surface są realnie konsumowane przez sloty.** |
| **Clear selection** | Resetuje: podsumowanie → „No slot selected yet.", przycisk → disabled, `aria-pressed` → 0. ✓ |
| **Service context (runtime)** | Po przełączeniu na „Runtime Service 56a6b722" kontekst pokazuje „Runtime Service … 30 min" **bez ceny** (usługa bez `priceCents`) — runtime poprawnie pomija cenę. ✓ |
| **Konsola** | 0 błędów, 0 ostrzeżeń (po wszystkich interakcjach). ✓ |
| **Liczba instancji** | 1 widget, `<script>` runtime obecny. ✓ |

### 3.6 Dostępność (frontend)

| Element | Atrybut | Wynik |
|---------|---------|-------|
| `<section>` (root) | `role="region"` + `aria-labelledby="booking-flow-booking-calendar-title"` (id istnieje) | ✓ |
| Lista slotów | `role="list"` + `aria-labelledby="…-slots-label"` (sr-only etykieta „Available time slots") | ✓ |
| Status slotów | `role="status"` + `aria-live="polite"` + `aria-atomic="true"` | ✓ |
| Wybrany slot | `aria-pressed="true"/"false"` | ✓ |

### 3.7 Responsywność (frontend, 375px)

- `document.body.scrollWidth == window.innerWidth == 375` → **brak poziomego overflow strony**. ✓
- `widget.scrollWidth == widget.clientWidth == 373` → widget mieści się, brak wewnętrznego overflow. ✓
- Grid kontrolek (usługa/zasób/data/refresh): na mobile `2 kolumny` (`160.5px 160.5px`), na desktop `lg:grid-cols-4`. ✓

---

## 4. Spójność Admin ↔ Frontend

| Funkcjonalność | Admin Preview | Frontend | Zgodność |
|----------------|---------------|----------|----------|
| Render wariantu / layout | ✓ (ten sam renderer) | ✓ | ✓ |
| Kontekst usługi (SSR) | ✓ Oil Change / 30 min · PLN 50.00 / TZ | ✓ identycznie | ✓ |
| Etykiety / komunikaty (zapisane) | domyślne | domyślne | ✓ (edycje in-memory nie wyciekły) |
| Slots token | **pusty** | **wstrzyknięty (82)** | ⚠ różnica oczekiwana |
| Runtime binding (sloty) | **brak** (statyczna powłoka) | **aktywny** | ⚠ różnica oczekiwana |
| Kaskada usługa→zasób | tylko w edytorze (Wizard) | runtime (`syncResourceOptions`) | ✓ obie ścieżki działają |
| A11y (region/list/status) | ✓ | ✓ | ✓ |

**Wniosek:** renderer SSR jest współdzielony (admin preview = front statycznie), ale
**interaktywność slotów istnieje tylko na froncie**, gdzie serwer wstrzykuje token
i wykonuje się skrypt runtime. To nie błąd, lecz architektura — należy o tym pamiętać
przy ocenie „czy widget działa" wyłącznie z poziomu admina (tam wygląda na pasywny).

---

## 5. Szczegółowe obserwacje per tryb

### 5.1 Wizard — „Live preview" pokazuje empty state (nuta)
W trybie Wizard istnieją **dwa** renderowane podglądy: główny canvas (środek strony,
z rozwiązanym katalogiem → pełny picker) oraz osobny „Live preview" wewnątrz panelu
Wizarda. Ten drugi **nie dostaje rozwiązanego katalogu** (`resolved.services/resources`
puste), więc renderuje empty state „Booking is currently unavailable. Please try
another service or contact us." — mimo że katalog rozwiązuje się poprawnie w głównym
canvasie. Podpis panelu głosi „Reflects the current Wizard state through the shared
widget renderer", co bywa mylące: użytkownik w trakcie setupu widzi komunikat
o niedostępności rezerwacji. Patrz I1.

### 5.2 Wizard — Flow dropdown
W tej fixturze dropdown „Booking flow" ma tylko jedną opcję „Default booking flow",
bo nie ma innych widgetów booking-calendar do sparowania (lista `calendars` filtruje
bieżący blok). Pełnej ścieżki matchowania flow nie dało się przetestować — to
ograniczenie fixtury, nie defekt.

### 5.3 Visual — Surface i klasy legacy
Dopóki `style` jest `undefined` (nietknięte), ramka dostaje klasy legacy
`border-[var(--color-border)] bg-[var(--color-bg)]/95`. Po ustawieniu dowolnego
koloru klasy te znikają (bo `style` staje się zdefiniowane), a kolor wchodzi jako
inline-style. Działa zgodnie z projektem — z jednym haczykiem opisanym w I3.

### 5.4 Advanced — uczciwie read-only
Panel jasno komunikuje brak edycji i podaje trafne podsumowania (katalog, token,
błędy). Wartości zgodne ze stanem fixtury. Jedyna nuta to „Matches Choose appointment
slot" (I4).

### 5.5 Frontend — runtime end-to-end
Najmocniejsza część: realny fetch slotów, render, wybór, podsumowanie, czyszczenie,
kaskada usług, ochrona daty przeszłej, konsumpcja zmiennych CSS, a11y i live region —
wszystko zadziałało bez błędów konsoli.

---

## 6. Co NIE działa / wymaga uwagi

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| I1 | **Wizard „Live preview" pokazuje empty state** „Booking is currently unavailable", bo nie wstrzykuje rozwiązanego katalogu — podczas gdy główny canvas pokazuje pełny picker. Mylące w trakcie setupu (sugeruje, że rezerwacja nie działa). | Nuta UX / luka preview |
| I2 | **Admin preview jest statyczną powłoką** — brak tokenu i bindingu runtime, więc w samym adminie nie da się przetestować ładowania ani wyboru slotu. To architektura, ale brak jakiegokolwiek wizualnego sygnału „podgląd nieinteraktywny" może wprowadzać w błąd. | Nuta UX (oczekiwane) |
| I3 | **„Clear" w Surface nie przywraca klas legacy** — po ustawieniu i wyczyszczeniu koloru `style` zostaje pustym obiektem `{}` (zdefiniowanym), co **trwale wygasza** fallbackowe klasy `border-[var(--color-border)] bg-[var(--color-bg)]/95`. Wizualnie po „Clear" ramka nie wraca w 100% do pierwotnego wyglądu (subtelna różnica koloru obramowania / tła). | Drobny defekt rendererra / nuta UX |
| I4 | **Advanced: „Booking flow — Matches Choose appointment slot"** — matchuje flow do kalendarza o tytule = własny tytuł widgetu (Wizard filtruje bieżący blok, Advanced nie). Wygląda, jakby widget „matchował sam siebie". | Drobna nuta UX / niespójność |
| I5 | **Surface bez pola hex** (`showValueInput={false}`) — jedyną klawiaturową/wklejaną drogą jest picker OS; brak wpisania koloru z klawiatury. (Sam efekt zmiany koloru działa — patrz 3.2.) | Nuta UX / dostępność |
| I6 | **Widget wymaga JS** — w stanie no-JS (raw SSR) input daty jest pusty, lista slotów pusta; bez JavaScriptu picker jest niefunkcjonalny (brak `<noscript>` fallbacku). | Nuta (oczekiwane dla runtime widget) |

> Uwaga: **nie stwierdzono żadnego twardego buga blokującego** ani błędu konsoli.
> Wszystkie przetestowane kontrolki edytora aktualizowały podgląd/atrybuty, a runtime
> frontu działał end-to-end. Pozycje I1–I6 to nuty UX i jeden subtelny defekt
> kosmetyczny (I3), nie awarie funkcjonalne.

---

## 7. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie (z asercją DOM/sieci):** logowanie, otwarcie fixtury,
3 tryby edytora, klamrowanie interwału, kaskada usługa→zasób (edytor + runtime),
polityka dat z klamrowaniem, 4 warianty layoutu, copy, 6 komunikatów→atrybuty,
4 toggle kontekstu + locale + date style, native/week picker, 3 tryby gęstości,
5 kontrolek Surface (z realnym zastosowaniem koloru), diagnostyka Advanced, realny
fetch slotów (7 dat), render + wybór + czyszczenie slotu, a11y, responsywność 375px,
raw SSR, konsola.

**Nie przetestowano (świadomie):** zapis/publikacja (ochrona fixtury), powiązanie
z Appointment Form (zdarzenie/`flowId`), nawigacja Week pickera na froncie, realna
różnica gęstości dla `service-duration`/`non-overlapping`, formatowanie pod `pl-PL`
na froncie, matchowanie flow do innych kalendarzy (brak ich w fixturze).

**Jeśli chodzi o to, co faktycznie udało się przetestować — wszystko, co miało dane
do działania, działało poprawnie.** Runtime frontu (najważniejsza, sterowana JS-em
ścieżka) zadziałał end-to-end bez błędów. Jedyne pozycje „nie-OK" to nuty UX (I1, I2,
I4, I5, I6) i jeden subtelny defekt kosmetyczny przy „Clear" w Surface (I3).

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Funkcje zweryfikowane jako działające | ~40 |
| Twarde bugi blokujące | 0 |
| Drobny defekt kosmetyczny (renderer) | 1 (I3) |
| Nuty UX / architektura / fixtura | 5 (I1, I2, I4, I5, I6) |
| Błędy/ostrzeżenia konsoli (frontend) | 0 |
