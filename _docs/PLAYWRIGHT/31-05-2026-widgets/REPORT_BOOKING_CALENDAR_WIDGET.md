# RAPORT: Booking Calendar Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej; TASK-393 zamknal znaleziska BC-31-05-01..04.
> **Strona admin:** `Audit 31-05 Booking Calendar`
> **Admin page id:** `b2ac4453-e4dc-4795-b4a5-e72a0223ec1d`
> **Public route:** `/audit-31-05-booking-calendar`
> **Playwright sessions:** `booking-31`, `booking-31b`..`booking-31g`, `booking-public-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem
`booking-calendar`. Przed klikaniem utworzono przez admin API kontrolowany
katalog bookingowy:

- resource `Audit 31-05 Mechanic`, active, timezone `Europe/Warsaw`,
- service `Audit 31-05 Service`, active, duration 30 min, price `PLN 75.00`,
  `submissionAccess=public`,
- service-resource link,
- tygodniowy harmonogram 09:00-17:00.

Po UI pass zrobiono audyt kodu oraz drugi przeglad subagentem, poniewaz lokalny
Claude CLI nadal zwraca `401 Invalid authentication credentials`.

Zmiany klikane w adminie nie byly publikowane jako finalny stan publiczny.
Public route pozostal baseline, ale po dodaniu fixture public runtime dostal
token i realnie pobieral sloty.

## Pokrycie UI

Przetestowane:

- Wizard: flow, interval, default service/resource, default/min/max date,
- Visual: warianty `default`, `compact`, `inline`, `horizontal`, copy/status
  fields, service context toggles, locale/date style, native/week picker,
  interval mode, surface colors and clear,
- Advanced: read-only runtime route, resolved catalog, defaults, token/runtime
  diagnostics,
- public runtime: token, GET `/api/booking/slots`, slot rendering, click slot,
  clear selection,
- code audit runtime script, week picker edge cases and admin/public resolver
  parity,
- targeted Vitest suites dla renderer/editor/runtime/admin preview.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline po fixture | `GET /audit-31-05-booking-calendar` | Nie dotyczy admin. | HTTP 200, 1 root, service/resource controls, `data-slots-token` obecny. | Dziala | Public resolver hydratuje katalog i signed slots token. | Brak. |
| Public slot runtime | W public page ustawiono date `2026-06-02`, klik `Refresh slots` | Nie dotyczy admin. | 3 requesty do `/api/booking/slots`, status 200, lista 31 slotow `09:00 AM - 05:00 PM`, click slot wlacza clear, clear znowu blokuje przycisk. | Dziala | Runtime uzywa tokenu, service/resource/date query i renderuje buttony w `data-booking-slots`. | Brak. |
| Initial admin preview | Otwarta strona i zaznaczony blok | Katalog z fixture widoczny: 1 service, 1 resource; preview pokazuje service context `Audit 31-05 Service`, `30 min`, `PLN 75.00`. | Public baseline taki sam, ale z tokenem. | Dziala | `buildBookingCalendarPreviewResolved` daje catalog-only payload bez tokena. | Brak. |
| Wizard open | `Run setup again` | Wizard nie jest stala zakladka; pokazuje `Flow`, `Availability setup`, `Date policy`; writable paths: `flowId`, `intervalMinutes`, `defaultServiceId`, `defaultResourceId`, `defaultDate`, `minDate`, `maxDate`. | Nie dotyczy. | Dziala | UI zgodny z kontraktem editor sections. | Brak. |
| Flow | Pozostawiono `Default booking flow` | Flow id zostal `booking-flow`; self-match nie pojawia sie jako alternatywny peer. | Public baseline `flowId=booking-flow`. | Dziala | Flow picker filtruje biezacy block i pokazuje default flow. | Brak. |
| Slot interval | Wpisano `30` | Root `data-slot-interval=30`; public baseline nadal `15`, bo zmian nie publikowano. | Public baseline uzywa `intervalMinutes=15`. | Dziala | Wizard path to `intervalMinutes`; runtime query przenosi interval. | Brak. |
| Default service/resource | Wybrano `Audit 31-05 Service` i `Audit 31-05 Mechanic` | Selecty w preview ustawione na fixture service/resource; Advanced pokazuje te defaults. | Public baseline ma te same wartosci z opublikowanej strony i fixture. | Dziala | PreviewResolved katalog mapuje aktywny service/resource link. | Brak. |
| Date policy | Ustawiono default `2030-01-18`, min `2030-01-15`, max `2030-01-20` | Input date ma `value=2030-01-18`, `min=2030-01-15`, `max=2030-01-20`. | Nie publikowano. | Dziala | Renderer przenosi date policy do attrs/input. | Brak. |
| Variant: Compact | Visual -> `Compact` | Root class zmienia sie na `space-y-3 rounded-lg border p-4`. | Nie publikowano. | Dziala | Variant steruje klasami layoutu. | Brak. |
| Variant: Inline | Visual -> `Inline` | Root class zmienia sie na `space-y-4 border-0 p-0`. | Nie publikowano. | Dziala | Variant steruje klasami layoutu. | Brak. |
| Variant: Horizontal | Visual -> `Horizontal` | Root class dostaje `lg:grid lg:grid-cols...`; sidebar selection summary jest w DOM. | Nie publikowano. | Dziala | Renderer wlacza layout i sidebar dla horizontal. | Brak. |
| Copy fields | Wpisano title, description i status copy | Description w preview zmienia sie na `Pick an audited time slot.`; status fields sa zapisane w editorze. | Nie publikowano. | Dziala czesciowo | Static React copy dziala; runtime-only status nie odswieza sie w admin canvas. | Patrz `BC-31-05-03` dla runtime preview. |
| Service context toggles | Price/duration/description/timezone ON, locale `pl-PL`, date style `Long` | Service context pokazuje `Audit 31-05 Service`, `30 min`, `75,00 zl`, opis fixture; Advanced nadal bez bledow. | Public baseline pokazuje price/duration w `en-US`; timezone node istnieje w rendererze gdy `showTimezone=true`. | Dziala | `data-show-*`, locale i formatter dzialaja; admin test potwierdzil `pl-PL` money formatting. | Brak. |
| Date picker mode: Week | Select `Week picker` | Tokenless editor/admin canvas pokazuje explicit noninteractive boundary zamiast pustego week shell; public runtime z tokenem hydratuje realne dni. | Nie publikowano; public runtime dla baseline native dziala. | Dziala po TASK-393 | Admin preview pozostaje statyczny bez public slots tokena, ale stan jest jawny; runtime nadal uzupelnia dni po stronie public. | Zamkniete w `BC-31-05-03`. |
| Slot interval mode | Select `Non-overlapping` | Root `data-slot-interval-mode=non-overlapping`. | Nie publikowano. | Dziala dla danych | Attr zmienia sie poprawnie; public runtime query dla baseline wysyla `intervalMinutes=15`. | Dodac public/admin test dla `non-overlapping` po publikacji albo preview adapterze. |
| Surface colors | Color inputs: frame border, selected bg/border, hover border; potem `Clear` frame background | Editor pokazuje `Selected color` dla 4 wartosci; root style ma `border-color`, `--booking-slot-selected-bg`, `--booking-slot-selected-border`, `--booking-slot-hover-border`; clear background przywraca theme default. | Nie publikowano. | Dziala | `SharedColorControl` dziala przy realnym `input[type=color].fill`; clear usuwa tylko wskazane pole. | Brak. |
| Advanced runtime route | Klik `Advanced` | `Slot loading route: Default runtime route`, writable paths puste. | Nie dotyczy. | Dziala | Advanced jest read-only. | Brak. |
| Advanced resolved catalog | Klik `Advanced` po fixture | `Services: 1 · Resources: 1`, default service/resource nazwane, token `Not injected in editor`, runtime error `No runtime warning`. | Public route ma token. | Dziala | Admin preview celowo nie wstrzykuje public tokena. | Brak. |
| Runtime copy/catalog safety | Code/subagent audit plus DOM probe | Runtime service/status/week copy tworzy DOM nodes i przypisuje `textContent`; payload `<img onerror>` renderuje sie literalnie. | Public runtime zachowuje normalne dane i nie tworzy DOM markup z decoded copy. | Dziala po TASK-393 | `innerHTML` composition zostalo usuniete z Booking Calendar runtime script. | Zamkniete w `BC-31-05-01`. |
| Week range clamp | Code audit | Edge `maxDate=2030-01-20`, anchor `2030-01-18` renderuje unikalne `2030-01-18`, `2030-01-19`, `2030-01-20`. | Public week po zapisaniu nie duplikuje buttonow ani pierwszej batch availability requestow. | Dziala po TASK-393 | `buildBoundedWeekDates` zasila label, buttons i availability fetch. | Zamkniete w `BC-31-05-02`. |
| Admin/public preview parity | Code/subagent audit | Admin preview uzywa shared `buildBookingRuntimeCatalog`. | Public preview resolver uzywa tych samych active linked catalog rules. | Dziala po TASK-393 | Inactive resources/services i active services bez active resource link nie trafiaja do widocznego katalogu. | Zamkniete w `BC-31-05-04`. |

## Znaleziska do poprawy

## Zamkniecie TASK-393 (2026-06-02)

- `BC-31-05-01`: runtime `innerHTML` copy composition zostalo zastapione DOM node creation + `textContent` dla service context, empty/missing/error copy i week button labels.
- `BC-31-05-02`: week picker korzysta z `buildBoundedWeekDates`, a generated day buttons maja `data-booking-week-date`; bounded edge test potwierdza brak duplicate buttons i duplicate first-batch availability dates.
- `BC-31-05-03`: tokenless admin/page-builder week preview pokazuje `data-booking-week-runtime-boundary` z explicit noninteractive copy zamiast pustego runtime-only shell.
- `BC-31-05-04`: admin preview i public runtime resolver korzystaja ze wspolnego `buildBookingRuntimeCatalog`, ktory filtruje active resources, active services i active service-resource links.

### BC-31-05-01 - Runtime sklada author/catalog copy przez `innerHTML`

**Objaw:** zwykly UI pass z czystymi fixture danymi dziala, ale code/subagent
audit znalazl niebezpieczny wzorzec runtime. Service context, empty/missing/error
messages i czesc week markup sa skladane jako HTML string.

**Dlaczego:**

- `serviceContextNode.innerHTML` laczy `serviceOption.textContent` oraz
  `serviceOption.dataset.description`:
  `core/widgets/core/bookingRuntimeScript.ts:307-317`.
- Empty slots copy uzywa `slotsNode.innerHTML` z `slotsNode.dataset.empty`:
  `core/widgets/core/bookingRuntimeScript.ts:407-412`.
- Missing selection i error copy robia to samo:
  `core/widgets/core/bookingRuntimeScript.ts:576-580`,
  `core/widgets/core/bookingRuntimeScript.ts:633-636`.
- React escape przy SSR nie wystarcza, bo `textContent` i `dataset` zwracaja juz
  odkodowane stringi, a pozniejsze przypisanie do `innerHTML` moze zamienic je
  w markup.

**Jak naprawic:**

1. Zastapic stringowe `innerHTML` tworzeniem wezlow DOM i `textContent` dla
   service name, description oraz copy messages.
2. Jesli zostaje helper HTML, dodac maly `escapeHtml` i uzyc go we wszystkich
   runtime stringach.
3. Dodac happy-dom runtime test z payloadami w `emptySlotsMessage`,
   `missingSelectionMessage`, service name i service description typu
   `<img onerror=...>` i asercja, ze nie powstaje zaden `img`, a tekst renderuje
   sie literalnie.

### BC-31-05-02 - Week picker moze powielac daty przy min/max range

**Objaw:** edge case nie jest widoczny w podstawowym public baseline, ale kodowo
`Week picker` moze renderowac powielone daty i robic zdublowane availability
fetches przy krawedzi zakresu.

Przyklad: `maxDate=2030-01-20`, anchor `2030-01-18` daje po clampie
`2030-01-18`, `2030-01-19`, `2030-01-20`, `2030-01-20`,
`2030-01-20`, `2030-01-20`, `2030-01-20`.

**Dlaczego:**

- `renderWeekPicker` bierze 7 dni i dopiero potem kazdy dzien clampuje:
  `core/widgets/core/bookingRuntimeScript.ts:476-480`.
- `refreshAvailability` robi identyczne mapowanie dla requestow:
  `core/widgets/core/bookingRuntimeScript.ts:521-533`.
- Availability map kolapsuje zdublowane klucze, ale UI nadal iteruje po
  powielonej liscie dat.

**Jak naprawic:**

1. Zbudowac helper `buildBoundedWeekDates(anchor, policy, today)`, ktory zwraca
   unikalne daty w dopuszczalnym zakresie.
2. Week label liczyc z pierwszej i ostatniej unikalnej daty.
3. Availability fetch robic po tej samej unikalnej liscie.
4. Dodac runtime test: min/max blisko anchor, brak powielonych buttonow i brak
   zdublowanych requestow dla tej samej daty.

### BC-31-05-03 - Admin canvas pokazuje statyczny preview dla runtime-only opcji

**Objaw:** po ustawieniu `Date picker mode = Week picker` admin root ma:

```json
{
  "datePickerMode": "week",
  "weekLabel": "",
  "weekButtons": []
}
```

W tym samym admin pass `Clear selection` nie byl zainicjalizowany jak w public
runtime, a status/slot list byly puste. Public route po fixture dziala: ma
signed token, pobiera sloty z `/api/booking/slots` i renderuje 31 slotow.

**Dlaczego:**

- Renderer tworzy puste kontenery week picker:
  `core/widgets/core/bookingCalendar.tsx:748-773`.
- Runtime script dopiero po bootstrappingu uzupelnia label i day buttons:
  `core/widgets/core/bookingRuntimeScript.ts:473-513`.
- Admin preview celowo pokazuje `resolved.slotsToken: Not injected in editor`,
  a SPA canvas nie wykonuje/nie re-inicjalizuje runtime behavior po zmianach
  Visual.

**Jak naprawic:**

1. Zdecydowac produktowo: admin canvas ma byc statycznym preview czy
   interaktywnym runtime preview.
2. Jesli ma byc interaktywny, dodac admin-safe bootstrap/adapter dla booking
   runtime, ktory nie potrzebuje public write tokena, ale moze renderowac week
   dni, disable clear button i opcjonalnie robic read-only slot preview.
3. Jesli ma zostac statyczny, dodac jawny editor notice przy week/slot runtime:
   `Runtime interactions are available in public preview after saving`.
4. Dodac test admin preview: po `datePickerMode=week` albo widac 7 dni, albo
   widac jawny noninteractive placeholder; nie moze byc pusty week shell.

### BC-31-05-04 - Admin preview i public preview moga pokazac inny katalog

**Objaw:** zwykly aktywny fixture jest spojnny, ale code/subagent audit znalazl
rozjazd kontraktu przy inactive/unlinked rows.

**Dlaczego:**

- Admin preview filtruje tylko aktywne resources, aktywne services i services
  z aktywnym resource link:
  `core/admin/services/bookingCalendarPreview.ts:21-41`.
- Public runtime resolver w `preview: true` bierze wszystkie service/resource
  rows, a filtr `resourceIds.length > 0` jest wylaczony:
  `core/services/booking/bookingRuntimeResolver.ts:76-81`,
  `core/services/booking/bookingRuntimeResolver.ts:101-115`.
- Renderer nie filtruje statusow drugi raz, wiec preview mode moze pokazac cos,
  czego admin canvas nie pokazuje.

**Jak naprawic:**

1. Ujednolic reguly preview catalog: albo public preview ma dziedziczyc admin
   filtering, albo dokumentacja ma jasno mowic, ze draft preview pokazuje
   inactive/unlinked rows diagnostycznie.
2. Najbezpieczniej przeniesc wspolne filtrowanie do jednego helpera
   `buildBookingRuntimeCatalog`.
3. Dodac test z inactive service/resource i service bez aktywnego resource:
   PageEditor preview i public preview powinny miec ten sam widoczny katalog
   albo jawnie oczekiwany, udokumentowany rozjazd.

## Walidacja

Uruchomione po raporcie:

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/admin/bookingCalendarPreview.test.ts tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - Wynik: passed, 4 files / 25 tests.
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/booking-calendar-admin-preview.test.tsx`
  - Wynik: passed, 3 files / 33 tests.
- `bun test tests/security/codersoSecurityGate.test.ts`
  - Wynik: passed, 4 tests.
- `bun --cwd core lint`
  - Wynik: passed.
- `bun --cwd core lint:types`
  - Wynik: passed.
- `git diff --check`
  - Wynik: clean.
