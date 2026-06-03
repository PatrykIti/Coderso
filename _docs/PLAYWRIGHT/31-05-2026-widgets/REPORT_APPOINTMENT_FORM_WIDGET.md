# RAPORT: Appointment Form Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Appointment Form`
> **Admin page id:** `734e0404-31b9-420d-8408-369d12a81719`
> **Public route:** `/audit-31-05-appointment-form`
> **Dodatkowy runtime route:** `/audit-31-05-appointment-form-single`
> **Playwright sessions:** `appointment-31`, `appointment-public-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem. Dodatkowy przeglad zrobiono subagentem Codex.

> **Status po TASK-394:** zamkniete 2026-06-02. Runtime binduje pary
> calendar/form niezaleznie od kolejnosci DOM, public reservation API wymaga
> exact match z server-generated slot, mixed public/internal CAPTCHA scope jest
> wybor-serwisu-based, widget success copy ma priorytet nad API default, a
> client-side field bounds sa wspolne ze schema public API.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `appointment-form`.
Przed runtime pass utworzono przez admin API kontrolowany katalog bookingowy:

- resource `Audit 31-05 Mechanic`, active, timezone `Europe/Warsaw`,
- service `Audit 31-05 Service`, active, duration 30 min, price `PLN 75.00`,
  `submissionAccess=public`,
- service-resource link,
- tygodniowy harmonogram 09:00-17:00.

Admin UI pass objal Wizard / Visual / Advanced i statyczny canvas. Public runtime
sprawdzono na dwoch opublikowanych stronach:

- `/audit-31-05-appointment-form` - `booking-calendar` przed
  `appointment-form`, aby sprawdzic realne parowanie,
- `/audit-31-05-appointment-form-single` - sam formularz, aby sprawdzic submit
  przez `/api/booking/reservations` bez wplywu bledu parowania.

Po Playwright wykonano audyt kodu oraz drugi przeglad subagentem, poniewaz
lokalny Claude CLI nadal zwraca `401 Invalid authentication credentials`.

## Pokrycie UI

Przetestowane:

- Wizard: pairing przez `flowId` i flow picker,
- Visual: warianty `default`, `compact`, `inline`, `sidebar`,
  `card-summary`, locale, redirect page picker, copy, slot summary, service /
  resource summary toggles, split name, required email/phone, phone validation,
  notes length, custom fields, consent, privacy/terms page pickers, surface
  colors and clear,
- Advanced: read-only route, flow, nonce/captcha/runtime diagnostics,
- public runtime: nonce hidden inputs, selection summary, disabled submit,
  split-name payload, custom-field metadata, consent metadata, POST success,
  reset/clear selection, success copy,
- public abuse probe: direct POST with valid nonce but out-of-schedule and
  wrong-duration slot,
- targeted Vitest suites and Bun public API unit suite.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta strona i zaznaczony blok | Form action `/api/booking/reservations`, flow `booking-flow`, submit disabled, fields name/email/phone/notes widoczne. | Single public route ma hidden nonce `formNonce` i `__nl_booking_nonce`, action i endpoint poprawne. | Dziala | Renderer wystawia atrybuty runtime i nonce jest hydratuowany przez public resolver. | Brak. |
| Wizard flow | `Run setup again` | Wizard pokazuje `Flow`; writable path `flowId`; brak recznego wpisywania endpointu. | Public form uzywa `data-flow-id=booking-flow`. | Dziala | Wizard ogranicza wybor do flow z booking context. | Brak. |
| Variants | Visual -> `Compact`, `Inline`, `Sidebar`, `Card summary` | Root classes zmieniaja layout/padding/grid/shadow; preview aktualizuje sie po kliknieciu. | Opublikowany runtime route ma `card-summary`. | Dziala | `variant` steruje klasami w rendererze. | Brak. |
| Locale | Select `Polish` | Root `data-locale=pl-PL`. | Selection summary pokazal `16 cze 2026`, `10:00 - 10:30`. | Dziala | Runtime formatter bierze `form.dataset.locale`. | Brak. |
| After submit destination | Wybrano page `Audit 31-05 Booking Calendar` w admin UI | Picker pokazywal `Links to selected site page`; preview root dostal `data-success-redirect=/audit-31-05-booking-calendar`. | Dla runtime submit uzyto strony bez redirectu, aby odczytac success copy. | Dziala w admin | Page-first picker poprawnie zapisuje safe relative path. | Dodac osobny public e2e dla redirectu po naprawie success copy/parowania. |
| Copy fields | Wpisano title, description, submit, loading, success | Preview pokazal `Audit appointment`, `Confirm your audited reservation.`, `Reserve audit slot`, `Audited reservation confirmed.` jako attr. | Po TASK-394 runtime preferuje widget `data-success-message`; API runtime copy jest fallbackiem. | Dziala po TASK-394 | `bookingRuntimeScript.ts` pokazuje widget success copy przed API default; regresja pokrywa custom widget copy + default API response. | Brak. |
| Slot summary copy | Zmieniono label/empty/no-selection | Empty summary pokazuje `Pick an audited slot first.`; no-selection error jest dostepny. | Single route po selection pokazuje service + date/time; po submit resetuje summary do empty. | Dziala | Form slucha selection event i `setSelection` czysci stan po sukcesie. | Brak. |
| Include service/resource | Service ON, resource OFF | Root `data-show-service-in-summary=true`, `data-show-resource-in-summary=false`. | Summary zawiera `Audit 31-05 Service`, nie zawiera `Audit 31-05 Mechanic`. | Dziala | Runtime sklada summary z toggli. | Brak. |
| Name mode | `First and last name` | `customerName` znika; `customerFirstName` i `customerLastName` sa required. | Payload public API ma `customerName: "Jane Audit"`. | Dziala | `buildCustomerName` laczy split-name inputs. | Brak. |
| Email / phone required | Email i phone ON + required | Inputs maja `required=true`; phone ma pattern po wyborze preset. | Po TASK-394 name/email/phone maja `maxLength` zgodne z API; browser pozwolil wyslac poprawne wartosci. | Dziala po TASK-394 | HTML required/pattern/maxLength sa renderowane. | Brak. |
| Phone validation: No extra | Wybrano `No extra validation` | Phone input po tej opcji ma `pattern=null`, `title=null`. | Nie publikowano w tym stanie. | Dziala | `validationText` zachowuje jawnie puste pattern/message po TASK-343. | Brak. |
| Phone validation: Digits and spaces | Wybrano `Digits and spaces` + custom help | Phone input ma `pattern=^[0-9\\s]{7,20}$`, title `Use digits and spaces for audit.` | Submit z `48600700800` przeszedl. | Dziala | Preset zapisuje pattern i message. | Brak. |
| Notes max length | Ustawiono `750` | Textarea ma `maxLength=750`; counter jest obslugiwany przez runtime. | Public route pokazal `notesMaxLength=750`, payload zawieral note. | Dziala | Renderer ustawia `maxLength` dla notes. | Brak. |
| Custom field: select | Dodano pole, label `Company`, type `Select`, required, options `Email`, `Phone` | Preview renderuje select `customField:custom-field-1`, required, options. | Payload metadata ma `customFields[0] = { id, type: "select", label: "Company", value: "Email" }`; po TASK-394 custom labels/options/values sa bounded. | Dziala po TASK-394 | Runtime zbiera `[data-appointment-custom-field]`; owner normalizer/API schema korzystaja ze wspolnych custom field limitow. | Brak. |
| Consent | Show consent ON, required ON, privacy/terms page pickers | Consent checkbox required; privacy/terms linki renderuja `/audit-31-05-booking-calendar`. | Payload metadata ma `consent.accepted=true` i label. | Dziala | Renderer linkuje safe relative URLs, runtime zbiera consent metadata. | Brak. |
| Surface colors | Ustawiono frame border, summary bg/border, submit bg; clear frame background | Preview ma `border-color: rgb(37, 99, 235)` i submit bg `rgb(15, 118, 110)`; clear frame background wraca do theme default. | Public route ma te style po publikacji fixture. | Dziala | `SharedColorControl` zapisuje/usuwa konkretne pola. | Brak. |
| Advanced route/flow | Klik `Advanced` | Writable paths puste; route i flow sa read-only. | Nie dotyczy. | Dziala | Advanced nie pozwala edytowac endpointu/secrets. | Brak. |
| Advanced security diagnostics | Klik `Advanced` | `Submission nonce: Not injected in editor`, `Captcha: Not configured`, `Runtime error: No runtime warning`; raw nonce nie jest widoczny. | Public form ma hidden nonce, ale wartosc nie jest w admin UI. | Dziala | Admin canvas nie pokazuje secret/runtime-only wartosci. | Brak. |
| Pairing calendar -> form | Public page z `booking-calendar` przed `appointment-form` | Nie dotyczy admin. | Po TASK-394 ponowne inline script wywoluje shared rebinder; calendar i form binduja sie w obu kolejnosciach DOM. | Dziala po TASK-394 | Runtime przechowuje `window.__nextlessBookingRuntimeBind` i idempotentnie odpala `bindCalendars()` / `bindForms()` przy kolejnych skryptach oraz microtask/DOMContentLoaded. | Brak. |
| Public submit happy path | Single public route, ustawiono selection state, wypelniono split-name/email/phone/notes/custom/consent, klik submit | Nie dotyczy admin. | POST 200; reservation utworzona; payload zawiera nonce-protected metadata; form resetuje sie, submit wraca disabled, a widget success copy pozostaje widoczna. | Dziala po TASK-394 | Runtime success precedence zostal odwrocony na widget-first. | Brak. |
| Public slot trust | Direct POST z valid nonce na 03:00-03:05 UTC dla resource `Europe/Warsaw` | Nie dotyczy admin. | Po TASK-394 valid nonce + wrong-duration slot zwraca `409 booking_slot_unavailable` przed persistence. | Dziala po TASK-394 / security | Public route regeneruje server availability dla service/resource/date/timezone i wymaga exact `startsAt`/`endsAt` match. | Brak. |
| Client-side field bounds | Public DOM probe | Name/email/phone oraz text-like custom fields maja `maxLength`; notes nadal respektuje author limit do 2000. | API i client korzystaja ze wspolnych boundow 200/320/64/2000 oraz custom id/label/value 120/240/2000. | Dziala po TASK-394 | `appointmentFormContract.ts` jest wspolnym ownerem limitow dla widget schema/render/runtime i public API validation. | Brak. |
| Mixed public/internal captcha | Code/subagent audit | Nie dotyczy zwyklego single public fixture. | Po TASK-394 service options maja `data-submission-access`; internal selection pomija captcha i nonce material, public selection nadal uzywa captcha/nonce. | Dziala po TASK-394 | Selection event niesie `submissionAccess`, a Appointment Form decyduje captcha/nonce per selected service. | Brak. |

## Znaleziska do poprawy

### AF-31-05-01 - Paired calendar/form nie zawsze binduja sie w public runtime

**Status po TASK-394:** zamkniete. Booking runtime zachowuje shared rebinder w
`window.__nextlessBookingRuntimeBind`; kolejne inline skrypty oraz microtask /
DOMContentLoaded wywoluja idempotentne `bindCalendars()` i `bindForms()`.
Regresja pokrywa kolejnosc calendar -> form oraz form -> calendar.

**Objaw:** na `/audit-31-05-appointment-form`, gdzie `booking-calendar` stoi
przed `appointment-form`, public DOM po zaladowaniu mial:

```json
{
  "calendarBound": "1",
  "formBound": null,
  "submitDisabled": true
}
```

Po wyslaniu selection event summary zostal pusty (`Pick an audited slot first.`)
i submit dalej byl disabled.

**Dlaczego:**

- Runtime ustawia globalny guard `window.__nextlessBookingRuntimeClient` i przy
  kolejnym inline script wychodzi od razu:
  `core/widgets/core/bookingRuntimeScript.ts:1-4`.
- Calendar i form wstrzykuja ten sam script osobno:
  `core/widgets/core/bookingCalendar.tsx:936`,
  `core/widgets/core/appointmentForm.tsx:1078`.
- Pierwszy script odpala, gdy drugi widget nie musi jeszcze istniec w DOM.
  Potem `bindCalendars()` / `bindForms()` wykonuja sie tylko raz:
  `core/widgets/core/bookingRuntimeScript.ts:985-996`.

**Jak naprawic:**

1. Emitowac booking runtime raz na koncu body przez wspolny registry public
   rendererow, zamiast inline po kazdym widgetcie.
2. Albo zmienic guard tak, aby przy kolejnym wywolaniu nadal odpalal
   `bindCalendars()` i `bindForms()` idempotentnie.
3. Dodac fallback `DOMContentLoaded` / microtask bind dla pozniej sparsowanych
   wezlow.
4. Dodac test: render `booking-calendar` -> `appointment-form`, wykonaj skrypty
   w kolejnosci parsera i asercja, ze oba wezly maja `data-booking-*-bound=1`;
   powtorzyc dla odwrotnej kolejnosc.

### AF-31-05-02 - Public reservation API ufa client-side slot context

**Status po TASK-394:** zamkniete. Public reservation route po access/nonce/
captcha check regeneruje availability przez `previewBookingSlots` i wymaga
exact server-generated `startsAt` + `endsAt` match przed persistence.

**Objaw:** public probe wyslal direct POST z valid nonce na slot
`2026-06-17T03:00:00.000Z` - `03:05:00.000Z` dla resource
`Europe/Warsaw`, mimo ze fixture schedule to 09:00-17:00 i service duration to
30 min. API zwrocilo `200` i utworzylo reservation.

**Dlaczego:**

- Runtime wysyla `startsAt` i `endsAt` prosto z client selection:
  `core/widgets/core/bookingRuntimeScript.ts:911-916`.
- Public route przekazuje je prosto do `createBookingReservation`:
  `core/server/publicBookingApi.ts:340-350`.
- Slot preview ma osobna walidacje availability/date policy, ale reservation
  submit nie wymaga exact match z server-generated slots.

**Jak naprawic:**

1. W public reservation route po nonce/access check wyliczyc lokalna date,
   timezone i wymagany slot policy.
2. Wywolac server-side slot generation dla service/resource/date i wymagac
   exact match `startsAt` + `endsAt`.
3. Odrzucac out-of-schedule, wrong duration, past slot, poza date policy i sloty
   bez public slot token claims.
4. Zostawic ewentualny luz tylko dla jawnie internal/admin route.
5. Dodac Bun public API tests: valid nonce + out-of-hours slot, wrong `endsAt`,
   past slot, no public slot match.

### AF-31-05-03 - Mixed public/internal catalog moze wymusic captcha na internal flow

**Status po TASK-394:** zamkniete. Booking Calendar projektuje
`submissionAccess` na service options i selection events, a Appointment Form
wykonuje CAPTCHA/nonce tylko dla wybranego public service.

**Objaw:** nie wystapil w prostym public-only fixture, ale code/subagent audit
pokazuje kontraktowy problem dla mieszanych katalogow.

**Dlaczego:**

- Runtime resolver tworzy nonce/captcha, gdy jakikolwiek service jest public:
  `core/services/booking/bookingRuntimeResolver.ts:137-143`.
- Public site wstrzykuje te wartosci do kazdego appointment form:
  `core/server/publicSite.tsx:503-510`.
- Selection event z kalendarza nie niesie `submissionAccess`:
  `core/widgets/core/bookingRuntimeScript.ts:447-455`.
- Form probuje captcha przed POST, jesli ma `data-captcha-site-key`:
  `core/widgets/core/bookingRuntimeScript.ts:910`.

**Jak naprawic:**

1. Wyrenderowac `submissionAccess` do service options w Booking Calendar.
2. Przeniesc access mode do selection detail.
3. Appointment Form powinien wykonywac captcha/nonce wymagania na podstawie
   wybranego service, a nie globalnej obecnosci public service w katalogu.
4. Dodac test mixed catalog: internal service + niedostepny captcha client nie
   blokuje internal submit; public service nadal wymaga nonce/captcha.

### AF-31-05-04 - Custom success copy jest nadpisywana przez API default

**Status po TASK-394:** zamkniete. Runtime pokazuje widget
`data-success-message` przed API runtime copy.

**Objaw:** formularz mial `data-success-message="Audited reservation confirmed."`.
Po realnym public submit sukces w UI pokazal `Appointment booked successfully.`.

**Dlaczego:**

- Runtime preferuje `result.runtime.successMessage` nad `form.dataset.successMessage`:
  `core/widgets/core/bookingRuntimeScript.ts:950-958`.
- Public API zawsze zwraca runtime default:
  `core/server/publicBookingApi.ts:357-361`.
- Visual editor poprawnie zapisuje custom copy; problem jest w priorytecie
  runtime/API.

**Jak naprawic:**

1. Najprosciej: client-side preferuje `data-success-message`, a API runtime copy
   jest fallbackiem tylko gdy widget nie ma custom copy.
2. Alternatywnie usunac generic runtime success message z default API response.
3. Dodac runtime test: custom widget `successMessage` + successful default API
   response ma pokazac custom copy.

### AF-31-05-05 - Client-side field bounds nie zgadzaja sie z public API schema

**Status po TASK-394:** zamkniete. `appointmentFormContract.ts` definiuje
wspolne limity; renderer, normalizer/runtime payload shaping i public API
schema korzystaja z tych samych boundow.

**Objaw:** public DOM probe pokazal:

```json
{
  "customerFirstMaxLength": -1,
  "customerEmailMaxLength": -1,
  "customerPhoneMaxLength": -1,
  "notesMaxLength": 750
}
```

API ma limity `customerName=200`, `customerEmail=320`, `customerPhone=64`,
`notes=2000`, custom field label `240`, custom field value `2000`.

**Dlaczego:**

- Name/email/phone inputs nie maja `maxLength`:
  `core/widgets/core/appointmentForm.tsx:917-956`,
  `core/widgets/core/appointmentForm.tsx:963-972`.
- Text/custom fields nie dostaja limitow:
  `core/widgets/core/appointmentForm.tsx:652-713`.
- API schema limituje payload:
  `core/server/validation/bookingSchemas.ts:190-200`,
  `core/server/validation/bookingSchemas.ts:218-235`.

**Jak naprawic:**

1. Dodac stale kontraktowe limity w module widget/service contract.
2. Renderer: `maxLength` dla full/split name, email, phone i tekstowych custom
   fields.
3. Normalizer/editor: clamp custom field label/options/placeholder do tych
   limitow.
4. Testy: renderer maxLength, normalizer clamp, runtime happy path dla wartosci
   max-valid oraz browser-side stop/blad przed fetchem dla over-limit.

## Walidacja

Uruchomione po TASK-394:

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - Wynik: passed, 4 files / 44 tests.
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/editorContract.test.ts`
  - Wynik: passed, 3 files / 36 tests.
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/server/publicBookingApi.test.ts`
  - Wynik: passed, 14 tests.
- `bun test tests/security/codersoSecurityGate.test.ts`
  - Wynik: passed, 4 tests.
- `bun --cwd core lint`
  - Wynik: passed.
- `bun --cwd core lint:types`
  - Wynik: passed.
- `bun run scan:semgrep`
  - Wynik: passed, 0 findings.
- `bun run scan:gitleaks:worktree`
  - Wynik: passed, no leaks found.
- `bun run scan:trivy:secret`
  - Wynik: passed, no secret findings reported.
- `git diff --check`
  - Wynik: passed.
