# RAPORT: Newsletter Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Newsletter`
> **Admin page id:** `7ae9dc59-9ff7-4069-86fc-24615deb9206`
> **Public route:** `/audit-31-05-newsletter`
> **Playwright sessions:** `newsletter-31`, `newsletter-31b`, `newsletter-31c`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.
> **Remediation:** TASK-392 zamknal cztery znaleziska: admin preview field
> projection, legacy webhook diagnostics, public nonce gating i read-only
> variant cards.

## Metoda

Test byl prowadzony od UI na stronie audytowej z jednym blokiem `newsletter`.
Klikany pass objal Wizard, Visual i Advanced, a dla Forms runtime utworzono przez
admin API publiczny formularz `Audit 31-05 Newsletter Form` z polami
`first_name`, `email`, `consent`.

Po UI pass zrobiono audyt kodu oraz drugi przeglad subagentem, poniewaz lokalny
Claude CLI nadal zwraca `401 Invalid authentication credentials`.

Zmiany klikane w adminie nie byly publikowane jako finalny stan publiczny.
Public route pozostal baseline static/disconnected.

## Pokrycie UI

Przetestowane:

- Wizard: read-only starter summary i brak edytowalnych kontrolek,
- Visual: warianty `inline`, `stacked`, `minimal`, tytul/opis/placeholder,
  widoczna etykieta email, first name, consent required, double opt-in,
  loading/error/success copy, button label, preview state card, kolory,
  spacing/alignment/width,
- Submission runtime: static disconnected, przelaczenie na `Use a Coderso Form`,
  wybor publicznego formularza i mapping pol,
- Advanced: read-only static readiness/authoring boundaries,
- public SSR baseline,
- kodowe probes dla legacy `webhookId` i public Forms runtime bez nonce,
- targeted Vitest suites dla renderer/editor/public renderer.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Public baseline | `GET /audit-31-05-newsletter` | Nie dotyczy admin. | HTTP 200, 1 root, brak `<form>`, `data-newsletter-native-submit="blocked"`, diagnostics visible. | Dziala | Static/disconnected renderuje bezpieczny `div role=form`. | Brak. |
| Initial Visual | Otwarta strona i zaznaczony blok | `variant=inline`, `submissionMode=static`, `submitReady=false`, `submitInteractive=false`, button disabled. | Public baseline taki sam. | Dziala | Runtime nie wystawia native submit bez celu. | Brak. |
| Wizard | `Run setup again` | Sekcja `newsletter.wizard.starter-summary`, `writablePaths=[]`, brak input/select. | Nie dotyczy. | Dziala | Wizard jest read-only orientation. | Brak. |
| Variant: Minimal | Klik karta `Minimal` | Root `variant=minimal`; opis znika z preview; editor pokazuje notice, ze opis zostaje zapisany. | Nie publikowano. | Dziala | Renderer ukrywa description tylko dla `minimal`. | Brak. |
| Variant: Stacked | Klik karta `Stacked` | Root `variant=stacked`; opis wraca, form zostaje w pionowym flow. | Nie publikowano. | Dziala | Variant steruje `variantFormClassMap`. | Brak. |
| Title / description / placeholder | Wpisano `Audit newsletter`, `UI audit description`, `audit@example.com` | Heading, opis i placeholder email zmieniaja sie w preview. | Nie publikowano. | Dziala | Visual copy zapisuje `title`, `description`, `placeholder`. | Brak. |
| Email label visible | `Show visible email label` ON, label `Work email` | Label traci `sr-only`, email input nie ma juz `aria-label`, bo widoczna etykieta przejmuje nazwe. | Nie publikowano. | Dziala | `form.showEmailLabel` steruje klasa labela i `aria-label`. | Brak. |
| First name | Toggle ON, placeholder `Your given name`, required ON | Root `firstNameEnabled=true`; input `name=first_name`, `required=true`, placeholder dziala. | Nie publikowano. | Dziala | First name jest opcjonalna struktura pola w rendererze. | Brak. |
| Consent required | Toggle `Consent required` ON | Checkbox `name=consent`, `required=true`; submit nadal zablokowany w static mode. | Nie publikowano. | Dziala | Consent jest realnym checkboxem wewnatrz form shell. | Brak. |
| Double opt-in | Select `Double opt-in`, wpisano confirmation copy | Preview pokazuje `Please confirm from your inbox.` pod shellem. | Nie publikowano. | Dziala | `optIn.mode=double` renderuje `data-newsletter-double-opt-in`. | Brak. |
| State copy / button | Loading/error/success + `Join now` | Button label w preview zmienia sie na `Join now`; success/error copy zapisuje sie do ukrytych runtime statusow. | Nie publikowano. | Dziala | State copy jest gotowe dla runtime script, nawet gdy static shell jest blocked. | Brak. |
| Colors | Zmieniono swatche przez realny color input | Background `rgb(248,250,252)`, text `rgb(15,23,42)`, button bg `rgb(29,78,216)`; editor pokazuje `Selected color`. | Nie publikowano. | Dziala | `SharedColorControl` wymaga realnego input event; Playwright `fill` potwierdzil wiring. | Brak. |
| Spacing / alignment / width | `Extra spacious`, `Center`, `Wide` | Root `spacing=xl`, `alignment=center`, `width=wide`. | Nie publikowano. | Dziala | Style tokens ida do root data attrs/classes. | Brak. |
| Static disconnected submit | `Submission mode = Not connected yet` | Shell to `div role=form`, `aria-disabled=true`, button `type=button`, diagnostics: connect runtime/action URL. | Public baseline blocked. | Dziala | `submitReady=false` blokuje native submit. | Brak. |
| Forms runtime - form list | Utworzono publiczny Form i wybrano `Use a Coderso Form` | Editor laduje form, mapping rows przechodza na pola Form, connection status: `Coderso Form: Audit 31-05 Newsletter Form`. | Nie publikowano. | Dziala czesciowo | Dane formularza sa widoczne w editorze. | Patrz `NL-31-05-01` dla preview. |
| Forms runtime - preview | Wybrano bound form | Bound Form preview patch obcina adminowe `FormField` metadata do strict `resolved.fields[]`; preview zostaje renderowalny. | Nie publikowano. | Dziala po TASK-392 | `normalizeNewsletterResolvedFields()` kopiuje tylko pola akceptowane przez schema widgetu. | Zamkniete w `NL-31-05-01`. |
| Advanced static | Klik `Advanced` przy static mode | Sekcje `Signup readiness` i `Authoring boundaries`, `writablePaths=[]`, brak input/select/pre. | Nie dotyczy. | Dziala | Advanced jest read-only support summary. | Brak. |
| Legacy webhook | Kodowy probe z `integration.webhookId` | Visual/Advanced pokazuja `Legacy webhook saved` i inactive/disabled copy. | Renderer nadal nie wystawia `<form>` i blokuje submit. | Dziala po TASK-392 | Editor rozdziela supported action URL od legacy webhook metadata. | Zamkniete w `NL-31-05-02`. |
| Public Forms runtime bez nonce | Kodowy probe z compatible `resolved` bez `submissionNonce` | Nie dotyczy admin. | Widget renderuje disabled shell, bez `<form>`, `data-nextless-form-runtime`, runtime script i nonce input. | Dziala po TASK-392 | `canUseFormsRuntime` wymaga niepustego `resolved.submissionNonce`. | Zamkniete w `NL-31-05-03`. |
| Variant cards bez handlera | Kodowy audit `VariantCards` | Przy braku `onVariantChange` karty sa disabled/read-only i nie pokazuja `Pick`. | Nie dotyczy. | Dziala po TASK-392 | Karty maja `disabled`, `aria-disabled` i read-only/current badges. | Zamkniete w `NL-31-05-04`. |

## Znaleziska i zamkniecie TASK-392

### NL-31-05-01 - Bound Forms runtime psuje admin preview przez nieznormalizowane pola

**Status:** naprawione w TASK-392. Admin preview projektuje pola bound Form do
ksztaltu `NewsletterResolvedRuntimeData.fields[]` przed `dataPatch`.

**Objaw:** po wybraniu publicznego formularza `Audit 31-05 Newsletter Form`
editor poprawnie pokazuje:

- `Submission mode: Use a Coderso Form`,
- `Bound form: Audit 31-05 Newsletter Form`,
- mappingi `Email`, `First name`, `Consent`,
- `Signup destination: Coderso Form: Audit 31-05 Newsletter Form`.

Ale canvas preview przestaje renderowac Newsletter i pokazuje:

`Invalid widget data (widget_schema_invalid: data/resolved/fields/0 must NOT have additional properties)`.

Playwright potwierdzil wtedy:

- `blocks=1`,
- `newsletterBlocks=1`,
- `editors=1`,
- `roots=0`,
- screenshot: `.tmp/newsletter-state.png`.

**Dlaczego:**

- `useNewsletterAdminPreview` przekazuje do patcha `fields: detail.fields`:
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:223-235`.
- `detail.fields` z admin API ma ksztalt adminowy, m.in. `formId`,
  `createdAt`, `updatedAt`.
- Newsletter schema dla `data.resolved.fields[]` jest strict i dopuszcza tylko
  `id`, `type`, `label`, `name`, `required`, `orderIndex`, `settings`:
  `core/widgets/core/newsletter.tsx:350-363`.
- Public resolver uzywa juz znormalizowanego `toFieldRecord`, ktory obcina
  pola DB/admin:
  `core/services/forms/formsService.ts:239-248`.
- Obecny UI test mockuje `detail.fields` bez `formId/createdAt/updatedAt`,
  wiec nie lapie realnego admin API shape:
  `tests/vitest/ui/newsletter-editor-wave.test.tsx:878-899`.

**Zamkniecie TASK-392:**

1. Dodano `normalizeNewsletterResolvedFields()` w ownerze
   `core/widgets/core/newsletter.tsx`.
2. `useNewsletterAdminPreview` uzywa helpera zamiast przekazywac
   `detail.fields` bez projekcji.
3. UI regression dodaje `formId`, `createdAt`, `updatedAt` do mockowanego
   admin field shape i oczekuje, ze preview patch je obcina.
4. Targeted suite potwierdza, ze strict widget schema pozostaje zgodna z
   preview hydration.

### NL-31-05-02 - Legacy `webhookId` jest raportowany jako destination, ale runtime go blokuje

**Status:** naprawione w TASK-392. Legacy webhook jest zachowany, ale opisany
jako inactive/disabled do czasu migracji.

**Objaw:** subagent/code audit i render probe potwierdzily, ze legacy
`integration.webhookId` jest mylaco opisywany jako zapisany external signup
service. Renderer jednak nie ma dla webhooka submit path:

```json
{
  "webhook": {
    "hasForm": false,
    "nativeEnabled": false,
    "nativeBlocked": true,
    "submitReady": false
  }
}
```

**Dlaczego:**

- Editor helper uznaje `webhookId` za saved external connection:
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:627-630`.
- Visual/Advanced copy mowi odpowiednio `External signup service saved` i
  `Visitors are sent to the saved external signup service`:
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:643-666`,
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:1450-1457`.
- Renderer wlacza native submit tylko dla Forms runtime albo valid
  `action-url`; `webhook` nigdy nie spelnia `canUseNativeAction`:
  `core/widgets/core/newsletter.tsx:1003-1011`.

**Zamkniecie TASK-392:**

1. Editor rozdziela supported external action URL od legacy webhook metadata.
2. Visual/Advanced pokazuja, ze legacy webhook jest zapisany, ale visitor submit
   pozostaje disabled.
3. Nie dodano nowego publicznego webhook endpointu; legacy state zostaje
   non-destructive i inactive.
4. Dodano UI regression dla Visual i Advanced webhook summaries.

### NL-31-05-03 - Public Forms runtime moze byc interactive bez nonce na poziomie widgetu

**Status:** naprawione w TASK-392. Public Forms runtime wymaga niepustego
`resolved.submissionNonce`, zanim Newsletter wystawi native form/script markup.

**Objaw:** kodowy render probe z compatible public `resolved` bez
`submissionNonce` zwrocil:

```json
{
  "publicFormsRuntimeWithoutNonce": {
    "hasForm": true,
    "nativeEnabled": true,
    "nonceInput": false,
    "runtimeScript": true,
    "action": true
  }
}
```

To nie znaczy, ze aktualny public site path jest popsuty: `publicSite` hydratuje
nonce przez `resolveFormRuntimeData`, a resolver tworzy nonce dla publicznych
formularzy. Problem jest w samym widget-level guard.

**Dlaczego:**

- `canUseFormsRuntime` akceptuje kazdy public render, nawet bez nonce:
  `core/widgets/core/newsletter.tsx:1003-1004`.
- Hidden nonce input jest renderowany tylko warunkowo:
  `core/widgets/core/newsletter.tsx:1126-1128`.
- Public route hydratuje nonce w normalnej sciezce:
  `core/server/publicSite.tsx:433-449`,
  `core/services/forms/formRuntimeResolver.ts:90-104`.

**Zamkniecie TASK-392:**

1. `canUseFormsRuntime` wymaga compatible binding oraz niepustego
   `resolved.submissionNonce`.
2. Przy braku nonce renderer pokazuje disabled shell z diagnostyka security
   token, bez `<form>`, runtime markerow, nonce inputu i scriptu.
3. Dodano widget-level public renderer regression dla no-nonce state.
4. Public route hydration pozostaje przez `resolveFormRuntimeData`; dodatkowo
   rerunieto nonce resolver i security gate suites.

### NL-31-05-04 - Variant cards wygladaja aktywnie nawet bez `onVariantChange`

**Status:** naprawione w TASK-392. Variant cards sa read-only/disabled bez
handlera mutacji.

**Objaw:** `VariantCards` przyjmuje opcjonalny `onChange`, ale karty nadal sa
zwyklymi klikanymi buttonami z tekstem `Pick`.

**Dlaczego:**

- `onChange?: (next: string) => void` jest opcjonalny:
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:416-422`.
- Buttony nie ustawiaja `disabled`, `aria-disabled` ani read-only copy, tylko
  wolaja `onChange?.(option.id)`:
  `core/admin/ui/widgets/editors/NewsletterEditors.tsx:426-444`.
- TASK-276-04 wskazuje, ze brak handlera powinien byc disabled/read-only:
  `_docs/_TASKS/TASK-276-04_Newsletter_Editor_Mode_Ownership_and_Variant_Guidance.md:113`.

**Zamkniecie TASK-392:**

1. Bez `onVariantChange` karty ustawiaja `disabled`, `aria-disabled`,
   `data-newsletter-variant-card-state` i read-only/current badges.
2. Dodano test UI dla Visual editor bez `onVariantChange`.

## Public baseline

`GET http://localhost:3000/audit-31-05-newsletter` zwrocil:

- HTTP 200,
- `roots=1`,
- `nativeForms=0`,
- `runtimeMarkers=0`,
- `nonceInputs=0`,
- `blocked=true`,
- `diagnostics=true`,
- `formsRuntimeMode=false`.

To jest oczekiwany baseline dla static/disconnected page.

## Ograniczenia fixture

- Public route nie zawiera zmian z draft preview.
- Forms runtime public submit nie byl publikowany z UI; sprawdzono admin live
  preview, public baseline oraz renderer/integration-owned kodowe kontrakty.
- Utworzony lokalny formularz audytowy zostal w adminie jako test fixture.
- Kolory dzialaja przy realnym input event; programatyczne ustawienie samego
  `node.value` bez Playwright `fill` nie wywoluje React state update i nie bylo
  liczone jako defekt.

## Kod-owner

- `core/widgets/core/newsletter.tsx`
  - schema/defaults/contract: `272-369`,
  - transport/action URL normalization: `704-745`,
  - Forms runtime readiness and submit gating: `996-1012`,
  - renderer shell/nonce/script: `1102-1263`,
  - widget registration/capabilities: `1268-1303`.
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx`
  - preview hydration bug: `161-238`,
  - variant cards: `416-444`,
  - webhook diagnostics helpers: `627-679`,
  - Visual sections: `849-1607`,
  - Advanced summaries: `1611-1701`.
- `core/services/forms/formsService.ts`
  - safe runtime field projection: `239-248`.
- `core/server/publicSite.tsx`
  - public newsletter runtime hydration: `427-455`.

## Walidacja

- Playwright:
  - `.tmp/playwright-newsletter-inventory.js`
  - `.tmp/playwright-newsletter-inspect.js`
  - `.tmp/playwright-newsletter-full.js`
  - `.tmp/playwright-newsletter-state-after-runtime.js`
  - `.tmp/playwright-newsletter-read-root.js`
  - screenshot `.tmp/newsletter-state.png`
- Renderer probe:
  - `bun .tmp/newsletter-render-probe.tsx`
- Tests:
  - `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx`
  - Result: 4 files / 53 tests passed.
- TASK-392 closure:
  - `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx` - passed, 4 files / 56 tests.
  - `bun run test:vitest -- tests/vitest/forms/submissionNonce.test.ts tests/vitest/forms/formRuntimeResolver.test.ts` - passed, 2 files / 10 tests.
  - `bun test tests/security/codersoSecurityGate.test.ts` - passed, 4 tests.
  - `bun --cwd core lint` - passed.
  - `bun --cwd core lint:types` - passed.
  - `git diff --check` - passed.
