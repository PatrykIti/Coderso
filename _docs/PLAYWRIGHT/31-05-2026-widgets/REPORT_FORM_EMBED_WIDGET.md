# RAPORT: Form Embed Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Form Embed`
> **Admin page id:** `ad8cc532-0b0b-40cb-941a-664e3280c3a9`
> **Public route:** `/audit-31-05-form-embed`
> **Dodatkowe runtime routes:** `/audit-31-05-form-embed-double`, `/audit-31-05-form-embed-internal`
> **Playwright sessions:** `formembed-31`, `formembed-public-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem. Dodatkowy przeglad zrobiono subagentem Codex.
> **Remediation 2026-06-02:** TASK-395 zamknal FE-31-05-01..09 w kodzie,
> testach i dokumentacji. Raport zachowuje pierwotne obserwacje jako baseline
> oraz ponizej notuje zamkniecie findings.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `form-embed`.
Przed runtime pass utworzono przez admin API kontrolowany formularz:

- `Audit 31-05 Form Embed Intake`, `status=published`,
  `submissionAccess=public`,
- `layoutMode=multi_step`, `saveProgress=true`,
- pola: text, email, select, radio, hidden, textarea z logika warunkowa,
  number, time, rating, checkbox,
- strona single `/audit-31-05-form-embed`,
- strona double `/audit-31-05-form-embed-double` z dwoma widgetami Form Embed,
- dodatkowy formularz internal-only i strona
  `/audit-31-05-form-embed-internal`.

Admin UI pass objal Wizard / Visual / Advanced, statyczny canvas oraz zmiany
copy, layoutu, kolorow, nawigacji multi-step i submit behavior. Public runtime
sprawdzono na opublikowanych stronach przez realny DOM, klik Next/Submit,
localStorage save-progress oraz intercepted `fetch`.

Po Playwright wykonano audyt kodu oraz drugi przeglad subagentem, poniewaz
lokalny Claude CLI nadal zwraca `401 Invalid authentication credentials`.

## Pokrycie UI

Przetestowane:

- Wizard: wybor zapisanego formularza i setup diagnostics,
- Visual: copy, width, alignment, spacing, button alignment, side/vertical
  padding, field gap, label visibility, required marks, colors, border/radius,
  input size, title size/weight, heading level, navigation labels, progress
  toggle, saved-progress TTL, loading label, success behavior,
- Advanced: read-only runtime diagnostics, submission security, authoring
  summary i contract summary,
- public runtime: nonce projection, multi-step progress, conditional logic,
  hidden fields, default values, Next/Submit visibility, save-progress restore,
  duplicate widget binding, internal-only form rendering,
- route/code audit dla public submit, checkbox payload, redirect policy,
  persisted runtime payload shape i field model drift.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta strona i zaznaczony blok | Canvas pokazuje tytul/opis/surface, ale `formPresent=false`; editor diagnostics widzi saved form, 10 pol, multi-step i save progress. | Public route renderuje realny `<form>`, nonce, kroki i pola. | Dziala public, ograniczone w admin canvas | Admin editor pobiera detale formularza dla diagnostyki, ale canvas nie hydratuje runtime fields. | Patrz `FE-31-05-09` dla admin-preview gap. |
| Wizard form selection | `Run setup again` | Wizard ma writable path `formId`; pokazuje `Audit 31-05 Form Embed Intake`, `Published`, `Multi-step`, `Save progress`, field count/type list. | Public form uzywa wybranego `formId`. | Dziala | Wizard ogranicza setup do wyboru saved form. | Brak. |
| Visual copy | Wpisano custom title, description, submit label, success message | Editor pokazuje custom copy; canvas aktualizuje tytul/opis. | Public DOM baseline ma `submitText=Send audit request` i `successMessageAttr=Widget custom success.` | Naprawione | Public submit route jest zamontowany, a runtime preferuje widget success copy przed form/runtime copy. | FE-31-05-01, FE-31-05-07 zamkniete 2026-06-02. |
| Layout | Center, Extra large, Spacious, End button, wide side padding, extra-spacious vertical padding, spacious field gap | Root zmienia `width=xl`, `spacing=lg`, `px-8 py-12`; editor summary pokazuje Extra large / Center / Spacious. | Public baseline fixture zostal w stanie startowym, bez tych admin zmian. | Dziala w admin | Visual controls zapisuje layout paths. | Dodac publish/e2e po naprawie public submit. |
| Field labels | Toggle show labels / required marks | Editor i diagnostics zachowuja toggle; po powrocie ON field labels sa widoczne w config. | Public baseline pokazuje label + `*` dla required. | Dziala | Renderer uzywa `fields.showLabels` i `fields.showRequiredIndicator`. | Brak. |
| Style controls | Background, border color, border width, radius, input size, label/helper/submit colors | Canvas zmienia background, border `rgb(37,99,235)`, border-2, rounded-xl, input small; Advanced mowi `5 saved color overrides`. | Public baseline ma theme/default fixture styles. | Dziala z drobnym UX gap | `Clear surface` w probe zwrocil `false`, bo surface zostal theme default; nie znaleziono twardego runtime bledu. | Ewentualnie doprecyzowac clear-state UX dla theme defaults. |
| Heading level | H3 | Canvas `headingTag=h3`; Visual summary `Heading level H3`. | Nie publikowano w tym stanie. | Dziala | `layout.headingLevel` steruje tagiem. | Brak. |
| Navigation progress | Show progress OFF/ON, TTL `0` potem `14` | Editor przyjal toggle i TTL; canvas bez realnych krokow nie pokazal progress. | Public baseline ma `Step 1 of 2`, `50%`; po Next `Step 2 of 2`, `100%`; `ttl=7`. | Dziala public, admin canvas nie weryfikuje | Public runtime bindowal progress; admin canvas nie ma hydrated form fields. | Patrz `FE-31-05-09`. |
| Submit behavior | Loading label, success behavior `Keep form` | Advanced summary `After submit Keep form`; canvas bez form nie pokazal runtime state. | Public submit route dziala przez public handler; runtime nadal stosuje configured success behavior. | Naprawione | Public handler `handlePublicFormsApi` deleguje do wspolnego Forms submit contractu. | FE-31-05-01 zamkniete 2026-06-02. |
| Advanced diagnostics | Klik Advanced | `writablePaths=[]`; raw nonce nie jest widoczny; `Nonce policy: Waiting for runtime projection`; bot protection not configured. | Public DOM ma hidden `__nl_form_nonce`, Advanced go nie ujawnia. | Naprawione | Advanced jest read-only, a persisted widget schema odrzuca `resolved.submissionNonce`. | FE-31-05-08 zamkniete 2026-06-02. |
| Public field render | `GET /audit-31-05-form-embed` | Nie dotyczy admin. | Renderuje text/email/select/radio/hidden/textarea/number/time/rating/checkbox; checkbox value/runtime payload jest backend-compatible boolean. | Naprawione | Renderer ustawia checkbox `value="true"`, a runtime serializuje checkbox jako boolean. | FE-31-05-04 zamkniete 2026-06-02. |
| Public multi-step | Wypelniono step 1 i kliknieto Next | Nie dotyczy admin. | Step 1 chowa sie, step 2 pokazuje sie, submit staje sie widoczny, progress `100%`. | Dziala | `validateCurrentStep` i `refreshStepUi` dzialaja dla normalnego Next flow. | Brak dla normalnego flow; restore gap w `FE-31-05-05`. |
| Conditional logic | Topic `Support` | Nie dotyczy admin. | Pole `details` ma `data-logic-operator=equals`, `data-logic-field=topic`, `data-logic-visible=1`. | Dziala | Runtime refreshuje field logic po input/change. | Brak. |
| Public submit | Klik submit po wypelnieniu wszystkich pol | Nie dotyczy admin. | Public handler przyjmuje signed nonce JSON submit, mapuje known Forms errors i zwraca runtime success/redirect. | Naprawione | `core/server/publicFormsApi.ts` montowany jest przed public page fallback. | FE-31-05-01 zamkniete 2026-06-02. |
| Duplicate Form Embed | Public page z dwoma Form Embed | Nie dotyczy admin. | Kolejny inline/runtime script wywoluje shared binder; oba formularze binduja sie niezaleznie. | Naprawione | Runtime exposes `window.__nextlessFormRuntimeBind` and rebinds on repeat script/microtask/DOMContentLoaded. | FE-31-05-02 zamkniete 2026-06-02. |
| Internal-only form | Public page z `submissionAccess=internal` | Advanced pokazuje internal access i ostrzezenie. | Public resolver nie projektuje fields; renderer fail-closed do noninteractive boundary bez `<form>`/runtime script. | Naprawione | `resolveFormRuntimeData` zwraca `public_submission_disabled`, a renderer blokuje explicit internal data. | FE-31-05-03 zamkniete 2026-06-02. |
| Checkbox | Zaznaczono `send_updates` | Nie dotyczy admin. | Runtime payload wysyla `send_updates: true`; optional unchecked checkbox nie wysyla browser `on`. | Naprawione | Renderer/runtime serializuja boolean, backend parser pozostaje strict. | FE-31-05-04 zamkniete 2026-06-02. |
| Save progress restore | W localStorage ustawiono `currentStep=2` z samym `details` | Nie dotyczy admin. | Runtime clampuje restore do pierwszego incomplete previous step i submit waliduje wszystkie widoczne kroki do current. | Naprawione | `clampRestoredStep` + `validateStepsThroughCurrent`. | FE-31-05-05 zamkniete 2026-06-02. |
| Number/time step | Field `team_size` ma default `4` i `settings.step=2` dla multi-step | Nie dotyczy admin. | Form step i input increment sa rozdzielone: `formStep` grupuje kroki, `inputStep` emituje HTML/backend increment. Legacy `step` mapuje tylko do form step. | Naprawione | Domain/admin/renderer/preview uzywaja nowych helperow i ustawien. | FE-31-05-06 zamkniete 2026-06-02. |
| Success copy / redirect | Code audit po submit blockerze | Editor pozwala ustawic widget success copy i Advanced pokazuje source/redirect policy. | Runtime preferuje widget copy, wykonuje tylko same-origin relative redirect, a form service odrzuca unsafe successRedirectUrl przed zapisem. | Naprawione | Runtime guard + `normalizeFormSuccessRedirectUrl`. | FE-31-05-07 zamkniete 2026-06-02. |

## Znaleziska do poprawy

### FE-31-05-01 - Public Form Embed submit trafia w 404

**Status 2026-06-02:** Naprawione. `core/server/publicFormsApi.ts` montuje
`POST /forms/:id/submissions` w public request handlerze i deleguje do
wspolnego `handleFormSubmissionRoute`, zachowujac strict schema validation,
signed nonce/HMAC, Forms access evaluator, `public_write` rate limit i
machine-readable Forms error mapping.

**Objaw:** na `/audit-31-05-form-embed` public DOM byl poprawnie zbindowany:

```json
{
  "action": "/forms/6856a770-69ec-4541-9b9b-2e9805780320/submissions",
  "bound": "1",
  "hiddenNonceNames": ["__nl_form_nonce", "segment"],
  "progressText": "Step 1 of 2"
}
```

Po wypelnieniu formularza i kliknieciu submit runtime wykonal:

```json
{
  "url": "http://localhost:3000/forms/6856a770-69ec-4541-9b9b-2e9805780320/submissions",
  "ok": false,
  "status": 404,
  "body": "Not Found"
}
```

To samo wystapilo dla checked i unchecked checkbox flow oraz internal-only page.

**Dlaczego:**

- Widget buduje public action jako `/forms/{id}/submissions`:
  `core/widgets/core/formEmbed.tsx:574-575`.
- Runtime fetchuje `form.action`:
  `core/widgets/core/formRuntimeScript.ts:487-495`.
- Forms route istnieje w routerze:
  `core/server/routes/formsRoutes.ts:213-296`.
- Public request handler obsluguje booking API i `/api/search`, ale nie
  przekazuje `POST /forms/:id/submissions` do Forms route:
  `core/server/publicSite.tsx:1154-1176`.

**Jak naprawic:**

1. Dodac publiczny handler Forms submission w `publicSite`, analogiczny do
   `handlePublicBookingApi`, albo jawnie zamontowac tylko
   `POST /forms/:id/submissions` przed page fallback.
2. Zachowac security contract: public write bucket, nonce/HMAC,
   opcjonalna reCAPTCHA, strict reject-unknown validation, no secrets in
   cache/debug payloads.
3. Nie montowac adminowych `GET /forms`, `GET submissions` ani write admin
   endpoints na public host.
4. Dodac Bun route-boundary tests na realny public handler:
   valid nonce -> 200, missing nonce/captcha -> 400/403, unknown field -> 400,
   internal form -> 401/403 lub fail-closed render bez form.
5. Dodac public Playwright happy path, ktory oczekuje success state zamiast
   generic error.

### FE-31-05-02 - Drugi Form Embed na tej samej stronie nie binduje runtime

**Status 2026-06-02:** Naprawione. Runtime exposes
`window.__nextlessFormRuntimeBind`; kolejne inline scripts wywoluja binder
zamiast wychodzic z one-shot guard, a binder odpala sie tez w microtask i na
`DOMContentLoaded`.

**Objaw:** na `/audit-31-05-form-embed-double` public DOM mial dwa formularze.
Pierwszy byl zbindowany, drugi nie:

```json
[
  { "bound": "1", "currentStep": "1", "logicVisible": "1" },
  { "bound": null, "currentStep": null, "logicVisible": null }
]
```

**Dlaczego:**

- Runtime ustawia globalny guard i przy drugim inline script wychodzi od razu:
  `core/widgets/core/formRuntimeScript.ts:1-4`.
- `bindForms()` wykonuje sie tylko raz:
  `core/widgets/core/formRuntimeScript.ts:564-570`.
- Jesli drugi widget jest parsowany po pierwszym skrypcie, nie dostaje
  event listenerow, step state, save-progress ani logic visibility refresh.

**Jak naprawic:**

1. Wystawiac runtime script raz na koncu public body przez shared runtime
   registry, zamiast inline per widget.
2. Albo zmienic guard tak, aby kolejne wywolanie bylo idempotentnym rebindem:
   `window.__nextlessFormRuntimeClient = { bindForms }`.
3. Dodac `DOMContentLoaded` / microtask rebind i opcjonalny MutationObserver dla
   pozniej dodanych blokow.
4. Test: render dwa `form-embed` na jednej stronie, wykonaj scripts w kolejnosci
   parsera, oba formularze musza miec `data-form-runtime-bound=1`.

### FE-31-05-03 - Internal-only form renderuje sie publicznie jako interaktywny formularz

**Status 2026-06-02:** Naprawione. Public resolver nie projektuje fields dla
published internal forms (`public_submission_disabled`), a renderer dodatkowo
fail-closed dla explicit `submissionAccess="internal"` bez `<form>` i runtime
script.

**Objaw:** fixture z `submissionAccess=internal` opublikowana na
`/audit-31-05-form-embed-internal` renderuje:

```json
{
  "formPresent": true,
  "action": "/forms/2bf78213-08ab-4bb7-af0e-388f79bea7b5/submissions",
  "bound": "1",
  "hiddenNonceNames": [],
  "fields": [{ "name": "internal_note", "required": true }]
}
```

Uzytkownik widzi normalny formularz, mimo ze public write nie powinien byc
dostepny dla internal form.

**Dlaczego:**

- Runtime resolver dla opublikowanego formularza zawsze zwraca pola:
  `core/services/forms/formRuntimeResolver.ts:89-104`.
- Dla internal access nonce jest `null`, ale fields nadal ida do renderu:
  `core/services/forms/formRuntimeResolver.ts:101-104`.
- Renderer renderuje `<form>` tylko na podstawie `fields.length > 0`:
  `core/widgets/core/formEmbed.tsx:1091-1117`.
- Gdy public route zostanie naprawiony, backend i tak zatrzyma internal access:
  `core/server/routes/formsRoutes.ts:229-245`.

**Jak naprawic:**

1. W public renderze fail-closed dla `resolved.submissionAccess !== "public"`.
2. Pokazac bezpieczny komunikat typu `This form is not available publicly`,
   bez action, bez inputs, bez runtime script.
3. Admin preview moze nadal pokazac diagnostics i field count, ale nie powinien
   udawac public interaktywnego submitu.
4. Testy: internal form public resolver + widget render nie zawiera `<form>` ani
   `data-nextless-form-runtime`.

### FE-31-05-04 - Checkbox wysyla `on`, a backend akceptuje tylko boolean/true/1/false/0

**Status 2026-06-02:** Naprawione. Renderer ustawia checkbox `value="true"`,
a runtime payload builder serializuje zaznaczone checkboxy jako boolean `true`
zamiast korzystac z browser-default `on`.

**Objaw:** public DOM pokazal:

```json
{
  "sendUpdates": {
    "type": "checkbox",
    "name": "send_updates",
    "value": "on",
    "checked": true
  }
}
```

Direct validator probe:

```bash
bun --eval '... validateSubmissionPayload({send_updates:"on"}, fields) ...'
```

zwrocil `form_payload_invalid`.

**Dlaczego:**

- Checkbox renderer nie ustawia `value`:
  `core/widgets/core/formEmbed.tsx:773-786`.
- Runtime buduje payload z `new FormData(form)` i stringuje wartosc:
  `core/widgets/core/formRuntimeScript.ts:338-355`.
- Backend `parseBoolean` nie akceptuje browser-default `on`:
  `core/services/forms/validation.ts:225-233`.

**Jak naprawic:**

1. Najprosciej: renderowac checkbox z `value="true"` i nie dodawac pola, gdy
   checkbox nie jest zaznaczony.
2. Alternatywnie runtime serializuje checkboxy jako boolean `true/false`.
3. Zgrac server parser z browser contract tylko jesli produktowo `on` ma byc
   legacy-kompatybilne.
4. Test: public runtime z zaznaczonym checkboxem musi utworzyc submission; bez
   zaznaczenia optional checkbox nie moze wyslac `on`.

### FE-31-05-05 - Saved progress moze pominac wymagane pola z poprzednich krokow

**Status 2026-06-02:** Naprawione. Runtime clampuje restored step do pierwszego
niekompletnego poprzedniego kroku i submit waliduje wszystkie widoczne kroki do
aktualnego kroku.

**Objaw:** po zapisaniu w localStorage:

```json
{
  "values": { "details": "Stored details without step one" },
  "currentStep": 2
}
```

public route od razu startuje na step 2:

```json
{
  "currentStep": "2",
  "progressText": "Step 2 of 2",
  "submitHidden": false,
  "fields": {
    "name": { "value": "", "required": true },
    "email": { "value": "", "required": true }
  }
}
```

Wymagane pola step 1 sa puste i ukryte, a submit jest widoczny.

**Dlaczego:**

- Hydration ufa `payload.currentStep`:
  `core/widgets/core/formRuntimeScript.ts:244-247`.
- Submit waliduje tylko aktualny step:
  `core/widgets/core/formRuntimeScript.ts:466-470`.
- `validateCurrentStep` sprawdza tylko aktywny panel:
  `core/widgets/core/formRuntimeScript.ts:262-292`.

**Jak naprawic:**

1. Przy restore obliczyc pierwszy niekompletny widoczny step i clampowac
   `currentStep` do niego.
2. Przy submit walidowac wszystkie poprzednie widoczne kroki, nie tylko current
   step.
3. Nie przywracac `currentStep` powyzej ostatniego kroku ani powyzej pierwszego
   kroku z required invalid controls.
4. Test: localStorage currentStep=2 bez step1 required values startuje na step 1
   albo submit zatrzymuje uzytkownika na brakujacym step 1.

### FE-31-05-06 - `settings.step` ma dwa sprzeczne znaczenia

**Status 2026-06-02:** Naprawione. Domain/admin/renderer rozdzielaja
`formStep` (multi-step placement) i `inputStep` (number/range/time increment).
Legacy `settings.step` zostaje niedestrukcyjnym adapterem form-step i nie
trafia do HTML/backend input increment.

**Objaw:** fixture ustawil pole `team_size` jako krok 2 formularza. Public DOM
pokazal jednoczesnie:

```json
{
  "teamSize": {
    "type": "number",
    "value": "4",
    "min": "1",
    "max": "20",
    "step": "2"
  }
}
```

Dla numeric validation z `min=1` i `step=2` poprawne sa 1, 3, 5..., wiec
domyslne `4` jest niezgodne z wlasnym input contractem. Time input tez dostal
`step="2"`, mimo ze intencja byla "krok formularza nr 2".

**Dlaczego:**

- `FormFieldSettings` ma jedno pole `step?: number`:
  `core/services/forms/validation.ts:26-35`.
- Normalizer zapisuje je jako form field setting:
  `core/services/forms/validation.ts:167-169`.
- Form Embed grupuje kroki multi-step po `field.settings.step`:
  `core/widgets/core/formEmbed.tsx:623-638`.
- Ten sam `field.settings.step` trafia do atrybutu HTML input `step`:
  `core/widgets/core/formEmbed.tsx:968-970`.
- Backend numeric/range validation tez uzywa `field.settings.step` jako input
  increment:
  `core/services/forms/validation.ts:350-359`.

**Jak naprawic:**

1. Rozdzielic model: np. `settings.layoutStep` / `settings.formStep` dla
   multi-step i `settings.inputStep` dla number/range/time.
2. Dodac legacy adapter: stare `settings.step` w multi-step formularzach mapowac
   niedestrukcyjnie do `layoutStep`, a input step ustawic tylko dla typow, gdzie
   redaktor jawnie go skonfigurowal.
3. Zaktualizowac editor i API docs, zeby rozdzielic "step in form" od "input
   increment".
4. Test: number field in step 2 z default 4 nie dostaje HTML `step=2`, dopoki
   input step nie jest jawnie ustawiony.

### FE-31-05-07 - Success message i redirect sa kontrolowane przez form-level API response

**Status 2026-06-02:** Naprawione. Runtime preferuje widget success copy przed
API/runtime copy, ignoruje unsafe redirect, a Forms service odrzuca form-level
`successRedirectUrl` inny niz same-origin relative path przed persistence.
Advanced pokazuje read-only success source i redirect policy.

**Objaw:** public submit jest obecnie blokowany przez 404, ale code path po
naprawie route ma dwa ryzyka:

- widget-level `data-form-success-message` moze zostac nadpisany przez
  `result.runtime.successMessage`,
- `runtime.redirectUrl` jest wykonywany bez same-origin/safe path guard.

**Dlaczego:**

- Runtime preferuje API success message nad widget copy:
  `core/widgets/core/formRuntimeScript.ts:509-519`.
- Runtime wykonuje redirect przez `window.location.assign(redirectUrl)`:
  `core/widgets/core/formRuntimeScript.ts:524-526`.
- Forms route zwraca `resolvedForm.successMessage` i
  `resolvedForm.successRedirectUrl`:
  `core/server/routes/formsRoutes.ts:289-294`.
- Forms service przyjmuje dowolny niepusty string jako redirect:
  `core/services/forms/formsService.ts:58-63`.

**Jak naprawic:**

1. Ustalic priorytet copy: widget override powinien wygrywac nad form default,
   chyba ze automatyzacja jawnie zwraca runtime override i produktowo ma
   priorytet.
2. Normalizowac `successRedirectUrl` do safe relative path albo explicit
   allowlist; odrzucac `javascript:`, protocol-relative i nieautoryzowane
   external origins.
3. Runtime powinien ignorowac unsafe redirect nawet jesli backend go zwroci.
4. Testy: custom widget success + form-level success; safe relative redirect;
   unsafe external/javascript redirect rejected przed persistence i przed
   runtime assign.

### FE-31-05-08 - `resolved.submissionNonce` miesci sie w schema widget data

**Status 2026-06-02:** Naprawione. Persisted Form Embed schema ma strict
`resolved` projection bez `submissionNonce`; runtime renderer nadal akceptuje
request-scoped nonce z server-side resolvera bez zapisu w widget data.

**Objaw:** Advanced UI redaguje nonce i pokazuje `Waiting for runtime
projection`, ale schema `form-embed` dopuszcza dowolny `resolved` payload.

**Dlaczego:**

- `formEmbedSchema.properties.resolved.additionalProperties = true`:
  `core/widgets/core/formEmbed.tsx:436-439`.
- Public resolver poprawnie traktuje nonce jako runtime projection:
  `core/services/forms/formRuntimeResolver.ts:92-104`.
- Jesli admin preview/save/export przypadkiem przeniesie `resolved` z runtime,
  schema go nie odrzuci.

**Jak naprawic:**

1. Nie persistowac `resolved` w saved widget data albo jawnie stripowac
   `submissionNonce`, `botProtection.siteKey` i inne runtime-only fields przed
   save/export/cache.
2. Zastapic loose `resolved` schema strict public-safe projection, jezeli
   `resolved` musi zostac w data modelu.
3. Dodac test save payload/admin preview patch: raw nonce nie moze znalezc sie
   w page-builder data ani debug payloadach.

### FE-31-05-09 - Admin canvas nie renderuje realnego formularza mimo poprawnych diagnostics

**Status 2026-06-02:** Naprawione przez explicit boundary contract. Canvas
without hydrated `resolved.fields` renders `data-form-embed-runtime-boundary`
instead of an ambiguous shell; runtime-hydrated public/preview blocks render the
real mapped form, while internal/error/empty states fail closed.

**Objaw:** na stronie admin canvas po wyborze zapisanej formy mial:

```json
{
  "formPresent": false,
  "hiddenNonceNames": [],
  "progress": { "exists": false },
  "fields": { "name": null, "email": null, "topic": null }
}
```

Jednoczesnie Wizard/Visual/Advanced diagnostics poprawnie pokazywaly:
`Published`, `Multi-step`, `Save progress`, `Field count: 10`, field types list.

**Dlaczego:**

- Editor korzysta z form detail do diagnostyki, ale page-builder canvas nie
  dostaje hydrated `resolved.fields`.
- Renderer bez resolved fields renderuje tylko wrapper/copy albo empty-state,
  wiec autor nie moze w admin canvas sprawdzic realnego ukladu pol, progressu
  ani submit behavior.

**Jak naprawic:**

1. Dodac admin preview hydration analogiczna do public resolvera, ale bez raw
   nonce/secrets.
2. Canvas moze renderowac disabled preview formularza z fields/settings i
   `data-form-runtime-bound` off, aby nie wysylac public POST w adminie.
3. Advanced nadal powinien pokazywac raw nonce jako niedostepny.
4. Test UI: po wyborze published form admin canvas pokazuje field labels,
   multi-step progress i submit shell bez raw nonce.

## Walidacja

Uruchomione po remediacji TASK-395:

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/forms/validation.test.ts tests/vitest/forms/formRuntimeResolver.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - Wynik: passed, 6 files / 75 tests.
- `set -a && source .env && set +a && bun test tests/unit/server/publicFormsApi.test.ts tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts`
  - Wynik: passed, 18 tests.
- `bun run test:vitest -- tests/vitest/ui/form-canvas.test.tsx tests/vitest/ui/form-canvas-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx`
  - Wynik: passed, 6 files / 31 tests.
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/admin/formsClient.test.ts`
  - Wynik: passed, 3 files / 56 tests.

Final lint/typecheck/security validation is tracked in TASK-395 closure notes.
