# RAPORT: Contact Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Contact`
> **Admin page id:** `e796abed-ca2c-49fe-9d5e-821c5fe003a0`
> **Public route:** `/audit-31-05-contact`
> **Dodatkowe runtime routes:** `/audit-31-05-contact-static`, `/audit-31-05-contact-minimal`, `/audit-31-05-contact-internal`, `/audit-31-05-contact-double`
> **Playwright sessions:** `contact-31`, `contact-public-31`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem. Dodatkowy przeglad zrobiono subagentem Codex.

## Metoda

Test byl prowadzony od UI na stronie audytowej z blokiem `contact`.
Przed runtime pass utworzono przez admin API kontrolowane formularze Forms:

- `Audit 31-05 Contact Runtime`, `status=published`,
  `submissionAccess=public`,
- `Audit 31-05 Contact Internal`, `status=published`,
  `submissionAccess=internal`,
- pola w obu: `full_name` text, `reply_email` email, `phone_number` phone,
  `message_body` textarea.

Utworzono i opublikowano strony:

- `/audit-31-05-contact` - Contact w `forms-runtime` z mapowaniem pol,
- `/audit-31-05-contact-static` - static-safe Contact,
- `/audit-31-05-contact-minimal` - wariant minimal i fallback mapy,
- `/audit-31-05-contact-internal` - binding do internal Form,
- `/audit-31-05-contact-double` - dwa aktywne Contact runtime na jednej stronie.

Admin UI pass objal Wizard / Visual / Advanced, canvas, Forms picker/mapping
diagnostics, map/social/style sections i read-only diagnostics. Public runtime
sprawdzono realnym DOM-em i intercepted `fetch`.

Po Playwright wykonano audyt kodu oraz drugi przeglad subagentem, poniewaz
lokalny Claude CLI nadal zwraca `401 Invalid authentication credentials`.

## Pokrycie UI

Przetestowane:

- Wizard read-only starter summary,
- Visual: warianty widoczne w UI, section header, form fields/required/order,
  field copy/layout, Forms runtime binding, field mapping, contact details,
  social profile flow, map location/display, colors, border/radius, layout,
- Advanced: map runtime metadata, normalization action copy, runtime diagnostics
  and nonce redaction,
- public runtime: active Forms mapping, static/no-GET fallback, minimal no-form,
  internal fallback, semantic tel/mailto/social links, iframe map, duplicate
  widget runtime binding, failed submit state.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta strona i zaznaczony blok | Canvas pokazuje `variant=form-right`, map true, contact details, tel/mailto/social, iframe; ale przy Forms runtime renderuje static fields `name/email/phone/message`, nie mapped fields. | Public route renderuje aktywny `<form>`, mapped names `full_name/reply_email/phone_number/message_body`, nonce i shared runtime. | Dziala public, admin preview mylacy | Public hydration dodaje `resolved`; admin canvas go nie dostaje. | Patrz `CT-31-05-05`. |
| Wizard | `Run setup again` | `writablePaths=[]`; pokazuje Current layout, Visible fields, Submit label; brak edycji w Wizard. | Nie dotyczy. | Dziala | Wizard jest read-only starter summary zgodnie z docs. | Brak. |
| Visual sections | Otwarcie Visual | Sekcje: variant/header, fields/required, field copy/layout, submission runtime, details/social, map, surface styling, layout/spacing. | Public route odzwierciedla fixture data. | Dziala funkcjonalnie | Editor ma kompletna sekcje IA. | Metadata paths sa niepelne, patrz `CT-31-05-08`. |
| Forms runtime binding | Bound form `Audit 31-05 Contact Runtime` | Editor pokazuje form `published`, field mapping: Name -> `full_name`, Email -> `reply_email`, Phone -> `phone_number`, Message -> `message_body`. | Public render ma action `/forms/{id}/submissions`, hidden `__nl_form_nonce`, mapped names, submit type `submit`. | Dziala do submitu | Public renderer hydratuje `resolved` i `canSubmit` przechodzi. | Public route blocker w `CT-31-05-01`. |
| Public submit | Wypelniono mapped fields i kliknieto submit | Nie dotyczy admin. | `fetch` do `/forms/{id}/submissions` zwrocil `404 Not Found`; UI pokazal generic error. | Nie dziala | Public server nie dispatchuje Forms route. | Patrz `CT-31-05-01`. |
| Failed submit state | Ten sam failed submit | Nie dotyczy admin. | Po 404 przycisk zostal tekstowo `Sending...`, mimo `aria-busy=false`. | Nie dziala | Contact nie ustawia `data-form-submit-label`, shared runtime restore bierze juz zmieniony tekst. | Patrz `CT-31-05-02`. |
| Duplicate active Contact | `/audit-31-05-contact-double` | Nie dotyczy admin. | Pierwszy form `bound=1`, drugi `bound=null`; oba maja `<form>`, ale drugi bez listeners. | Nie dziala | Shared Forms runtime ma globalny one-shot bind. | Patrz `CT-31-05-03`. |
| CAPTCHA/bot protection | Code/subagent audit | Advanced redaguje nonce, ale nie pokazuje captcha runtime. | Contact hydration nie przenosi `botProtection`; form nie ma captcha attrs/input. | Ryzyko security/runtime | Forms route moze wymagac captcha dla public anonymous submit. | Patrz `CT-31-05-04`. |
| Static mode | `/audit-31-05-contact-static` | Nie dotyczy admin. | Brak `<form>` runtime, button `type=button`, static note `Static audit contact is intentionally disconnected.`, brak native GET. | Dziala | Static fallback renderuje non-submit controls. | Brak. |
| Internal binding | `/audit-31-05-contact-internal` | Visual ostrzega, ze internal requires admin session/API key. | Public route pokazuje static-safe button i note; brak action, brak nonce, brak runtime form. | Dziala funkcjonalnie | `resolved.submissionAccess === "public"` blokuje `canSubmit`. | DOM metadata mylacy, patrz `CT-31-05-06`. |
| Minimal variant | `/audit-31-05-contact-minimal` | Visual minimal card istnieje; form sections powinny byc ukryte. | Public minimal nie renderuje form panelu ani inputs; pokazuje details/social i map fallback. | Dziala public | `variant=minimal` ustawia `showForm=false`. | Brak twardego public defectu. |
| Contact links | Public runtime | Canvas i public render tel/mailto/social. | Phone `tel:+48600700800`, email `mailto:hello@example.com`, LinkedIn external target `_blank`, rel `noopener noreferrer`. | Dziala | Link helpers normalizuja phone/email i social href. | Legacy-permissive policy w `CT-31-05-07`. |
| Map | Public runtime | Canvas i public render iframe dla Google Maps, Advanced `Valid map URL`. | Iframe `https://www.google.com/maps?...&output=embed`, title `Audit map`, `allowFullScreen=true`; invalid minimal URL pokazuje fallback. | Dziala | Map validator dopuszcza http/https i Google helper. | Legacy arbitrary iframe policy w `CT-31-05-07`. |
| Advanced diagnostics | Klik Advanced | `writablePaths=[]`; map source/status read-only; runtime security: `Submission nonce redacted; public payload not shown in editor.` | Public nonce jest hidden input, ale Advanced go nie ujawnia. | Dziala | Diagnostics snapshot redaguje transient nonce. | Brak. |
| Style metadata | Visual surface styling | Color/border/radius rows maja writable paths. | Public styles widoczne w fixture (`borderWidth=2`, `maxWidth=2xl`, colors). | Dziala dla kolorow | TASK-342-02-04 domknal color path metadata. | Inne Visual rows bez paths, patrz `CT-31-05-08`. |

## Znaleziska do poprawy

### CT-31-05-01 - Public Contact Forms runtime submit trafia w 404

**Objaw:** public route `/audit-31-05-contact` renderuje aktywny Forms runtime:

```json
{
  "hasRuntimeForm": true,
  "action": "/forms/631b8e1b-9a9d-400e-b7fa-66d5896d0b9e/submissions",
  "bound": "1",
  "hiddenNonceNames": ["__nl_form_nonce"]
}
```

Po submit:

```json
{
  "url": "http://localhost:3000/forms/631b8e1b-9a9d-400e-b7fa-66d5896d0b9e/submissions",
  "ok": false,
  "status": 404,
  "body": "Not Found"
}
```

**Dlaczego:**

- Contact renderuje action `/forms/:id/submissions`:
  `core/widgets/core/contact.tsx:1536-1541`.
- `httpServer` wysyla do `handleApi` tylko sciezki pod admin API prefixem:
  `core/server/httpServer.ts:501-503`.
- Root `/forms/...` przechodzi do `handlePublicRequest`:
  `core/server/httpServer.ts:510`.
- `handlePublicRequest` obsluguje booking API i search, ale nie Forms
  submission:
  `core/server/publicSite.tsx:1154-1176`.
- Forms route istnieje w routerze:
  `core/server/routes/formsRoutes.ts:213-296`, ale nie jest publicznie
  zamontowana na root host.

**Jak naprawic:**

1. Dodac public Forms submission bridge w `handlePublicRequest` dla
   `POST /forms/:id/submissions`, albo przeniesc action do realnie
   zamontowanego public endpointu.
2. Zachowac public write contract: nonce/HMAC, opcjonalna reCAPTCHA,
   public-write rate limit, strict reject-unknown validation.
3. Nie montowac adminowych Forms list/detail/submissions GET na public host.
4. Dodac Bun test na realny public handler, nie tylko router registration:
   valid public nonce -> 200, missing/invalid nonce -> 400/403, unknown field ->
   400, internal binding -> 401/403/static-safe.
5. Po fixie powtorzyc Contact, Form Embed i Newsletter public submit smoke,
   bo wszystkie reuzywaja `/forms/:id/submissions`.

### CT-31-05-02 - Po bledzie submit przycisk zostaje jako `Sending...`

**Objaw:** po 404 public Contact pokazal:

```json
{
  "submitText": "Sending...",
  "submitBusy": "false",
  "errorText": "Unable to submit the form. Please try again.",
  "errorHidden": false
}
```

**Dlaczego:**

- Shared runtime restore label bierze:
  `form.dataset.formSubmitLabel || submitButton?.textContent`:
  `core/widgets/core/formRuntimeScript.ts:381-391`.
- Contact runtime form nie ustawia `data-form-submit-label`:
  `core/widgets/core/contact.tsx:1536-1544`.
- Po `setSubmitting(true)` tekst buttona jest juz `Sending...`; `finally`
  ustawia label z aktualnego tekstu:
  `core/widgets/core/formRuntimeScript.ts:558-560`.

**Jak naprawic:**

1. Contact powinien ustawic `data-form-submit-label={form.submitLabel}`.
2. Dodac `data-form-loading-label`, jesli Contact ma miec edytowalny loading
   copy; w przeciwnym razie shared default `Sending...` jest ok.
3. W shared runtime zapisac oryginalny label przed pierwsza mutacja, np.
   `form.dataset.originalSubmitLabel`.
4. Test: failed fetch w Contact przywraca oryginalny submit label i
   `aria-busy=false`.

### CT-31-05-03 - Drugi Contact runtime na stronie nie binduje sie

**Objaw:** na `/audit-31-05-contact-double`:

```json
[
  { "hasRuntimeForm": true, "bound": "1" },
  { "hasRuntimeForm": true, "bound": null }
]
```

**Dlaczego:**

- Shared Forms runtime ustawia globalny guard:
  `core/widgets/core/formRuntimeScript.ts:1-4`.
- `bindForms()` wykonuje sie tylko raz:
  `core/widgets/core/formRuntimeScript.ts:564-570`.
- Contact wstrzykuje script po kazdym aktywnym runtime form:
  `core/widgets/core/contact.tsx:1645-1647`.
- Pierwszy script odpala zanim drugi Contact form zostanie sparsowany, a drugi
  script wychodzi przez guard.

**Jak naprawic:**

1. Emitowac Forms runtime script raz na koncu body przez wspolny registry.
2. Albo zmienic guard tak, aby kolejne wywolanie nadal odpalalo idempotentny
   `bindForms()`.
3. Dodac `DOMContentLoaded` / microtask rebind dla pozniej sparsowanych form.
4. Test shared: dwa Contact runtime i/lub Contact + Form Embed na jednej stronie
   musza miec `data-form-runtime-bound=1`.

### CT-31-05-04 - Contact gubi `botProtection` z Forms runtime projection

**Objaw:** nie wystapil w fixture bez captcha, ale code/subagent audit pokazuje
blokujacy runtime/security gap dla sites z bot protection.

**Dlaczego:**

- Forms public anonymous submissions moga wymagac nonce + bot protection:
  `core/server/routes/formsRoutes.ts:251-259`.
- Shared runtime wykonuje reCAPTCHA tylko z form dataset i `captchaToken` input:
  `core/widgets/core/formRuntimeScript.ts:477-485`.
- `resolveFormRuntimeData` zwraca `botProtection`:
  `core/services/forms/formRuntimeResolver.ts:92-104`.
- Newsletter zachowuje `botProtection` w public hydration:
  `core/server/publicSite.tsx:438-449`.
- Contact hydration pomija `botProtection`:
  `core/server/publicSite.tsx:405-417`.
- Contact renderuje tylko nonce:
  `core/widgets/core/contact.tsx:1569-1571`, bez
  `data-form-captcha-site-key`, `data-form-captcha-action` i `captchaToken`.

**Jak naprawic:**

1. Rozszerzyc Contact `resolved` schema/type o public-safe `botProtection`.
2. W `publicSite` przeniesc `resolvedData.botProtection` do Contact hydrated
   data tak jak Newsletter.
3. Contact form powinien renderowac te same captcha attrs/hidden token bridge co
   Form Embed/Newsletter.
4. Test: przy enabled bot protection Contact przed fetchem probuje reCAPTCHA i
   wysyla `captchaToken`; bez projection Contact nie renderuje working-looking
   public submit.

### CT-31-05-05 - Admin canvas pokazuje static fallback zamiast mapped Forms runtime

**Objaw:** admin canvas przy `form.submission.mode=forms-runtime` pokazal:

```json
{
  "formMode": "forms-runtime",
  "hasRuntimeForm": false,
  "submitType": "button",
  "inputs": [
    { "name": "name" },
    { "name": "email" },
    { "name": "phone" },
    { "name": "message" }
  ]
}
```

Jednoczesnie Visual editor poprawnie pokazal bound form i field mapping:
`full_name`, `reply_email`, `phone_number`, `message_body`.

**Dlaczego:**

- Contact `canSubmit` wymaga `resolved !== undefined`:
  `core/widgets/core/contact.tsx:1360-1371`.
- Public runtime hydratuje `resolved` w `publicSite`:
  `core/server/publicSite.tsx:396-425`.
- Admin editor pobiera form detail tylko lokalnie do controls:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:931-936`,
  `core/admin/ui/widgets/editors/ContactEditors.tsx:1098-1142`.
- Ten detail nie trafia do canvas data, wiec renderer wpada w static branch:
  `core/widgets/core/contact.tsx:1597-1644`.

**Jak naprawic:**

1. Dodac admin canvas hydration dla Contact, bez raw nonce/secrets.
2. Canvas moze renderowac disabled mapped preview albo runtime-like preview z
   `data-nextless-form-runtime` off.
3. Visual editor powinien dalej byc zrodlem mapping controls, ale preview musi
   pokazywac te same field names/required flags co public renderer.
4. Test UI: bound public Form w admin canvas pokazuje mapped field names i nie
   pokazuje raw nonce.

### CT-31-05-06 - Static/internal fallback ma mylace `data-contact-form-mode=forms-runtime`

**Objaw:** `/audit-31-05-contact-internal` poprawnie nie renderuje working form:

```json
{
  "hasRuntimeForm": false,
  "submitType": "button",
  "staticMessage": "This audited contact form is static."
}
```

Ale root panel nadal ma:

```json
{ "formMode": "forms-runtime" }
```

**Dlaczego:**

- Panel zawsze wystawia configured mode:
  `core/widgets/core/contact.tsx:1524`.
- Actual submit branch zalezy od `canSubmit`:
  `core/widgets/core/contact.tsx:1360-1371`.
- Internal binding jest celowo blokowany przez
  `resolved.submissionAccess === "public"`:
  `core/widgets/core/contact.tsx:1366`, ale DOM nie komunikuje effective mode.

**Jak naprawic:**

1. Rozdzielic `data-contact-configured-form-mode` i
   `data-contact-effective-form-mode`.
2. Przy fallbacku ustawic effective mode `static` albo `blocked`.
3. Editor/Advanced moze pokazac "configured Forms runtime, effective static
   because internal/incompatible".
4. Testy smoke powinny asercjami patrzec na effective mode, nie sam configured
   mode.

### CT-31-05-07 - Map/social safety nadal dopuszcza legacy arbitrary web URLs

**Objaw:** fixture Google Maps i LinkedIn dzialaja poprawnie. Code audit
pokazuje jednak, ze legacy payload moze nadal renderowac arbitrary http/https
iframe/social URLs.

**Dlaczego:**

- Map URL state akceptuje `http:` i `https:`:
  `core/widgets/core/contact.tsx:401-434`.
- Renderer iframuje `mapUrlState.safeUrl`:
  `core/widgets/core/contact.tsx:1740-1747`.
- Social runtime uzywa `resolveWidgetLinkAttrs` z `allowHttp: true`:
  `core/widgets/core/contact.tsx:539-543`.
- Editor dla znanych platform buduje bezpieczne profile, ale legacy custom href
  zostaje supportowym stanem:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:1205-1270`.

**Jak naprawic:**

1. Jesli produkt wymaga tylko Google Maps embed, runtime powinien allowlistowac
   provider/host, a legacy arbitrary hosts pokazywac fallback.
2. Jesli arbitrary https iframe zostaje wspierany, Advanced musi jasno raportowac
   provider/origin risk i docs powinny to nazwac legacy/support behavior.
3. Rozwazyc wymuszenie `https` dla public iframe/social, chyba ze istnieje
   swiadoma legacy compatibility decyzja.
4. Testy: non-Google map URL, `http` map URL i custom social http/https maja
   jednoznaczny expected behavior.

### CT-31-05-08 - Visual path metadata jest kompletne tylko dla style rows

**Objaw:** Visual mial 71 controls, ale `writablePaths` z DOM zawieraly glownie:

```json
[
  "style.background",
  "style.surfaceColor",
  "style.borderColor",
  "style.textColor",
  "style.mutedTextColor",
  "style.buttonBackgroundColor",
  "style.buttonTextColor",
  "style.buttonBorderColor",
  "style.borderWidth",
  "style.panelRadius",
  "style.buttonRadius",
  "layout.container",
  "layout.padding.top",
  "layout.padding.bottom",
  "layout.margin.top",
  "layout.margin.bottom",
  "visibility.devices.desktop",
  "visibility.devices.tablet",
  "visibility.devices.mobile"
]
```

Brakuje persisted paths dla wielu contract-owned controls: section title,
description, visible/required fields, field labels/placeholders, submission
runtime mode, bound form, field mapping, details, social, map location i layout
selects.

**Dlaczego:**

- TASK-342-02-04 naprawil surface styling controls.
- Inne Contact editor controls nadal sa lokalnymi blokami bez
  `WidgetControlRow path`/`data-widget-control-path`.
- Przyklady z kodu: runtime mode:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:975-995`, bound form:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:1012-1049`, field mapping:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:1106-1142`, map location:
  `core/admin/ui/widgets/editors/ContactEditors.tsx:1171-1184`.

**Jak naprawic:**

1. Przejsc przez wszystkie Visual controls i opakowac je path-aware rowami.
2. Dodac paths dla `title`, `description`, `form.fields`, `form.required`,
   `form.fieldSettings.*`, `form.submission.*`, `contact.*`, `map.*`,
   `style.*`.
3. Rozszerzyc smoke/test: Contact Visual metadata nie moze ograniczac sie do
   style rows.
4. Dla controls, ktore zmieniaja kilka pol naraz, podac nadrzedny path lub
   explicit multi-path metadata zgodnie z lokalnym contractem.

## Walidacja

Uruchomione dla raportu:

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx`
  - Wynik: passed, 4 files / 37 tests.
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/integration/runtime/pages-runtime.test.ts tests/integration/routes/forms.test.ts`
  - Wynik: passed, 13 tests.
- `bun --cwd core lint`
  - Wynik: passed.
- `bun --cwd core lint:types`
  - Wynik: passed.

Uwaga: `pages-runtime.test.ts` potwierdza hydration Contact bindings, a
`forms.test.ts` rejestracje route. Nie pokrywa jednak realnego public dispatchu
`POST /forms/:id/submissions` przez `handlePublicRequest`; ten brak pokazal
Playwright jako 404.
