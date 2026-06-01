# RAPORT: Newsletter Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Newsletter`
> **Admin page id:** `7ae9dc59-9ff7-4069-86fc-24615deb9206`
> **Public route:** `/audit-31-05-newsletter`
> **Playwright sessions:** `newsletter-31`, `newsletter-31b`, `newsletter-31c`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

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
| Forms runtime - preview | Wybrano bound form | Live preview znika i pokazuje placeholder: `Invalid widget data (widget_schema_invalid: data/resolved/fields/0 must NOT have additional properties)`. | Nie publikowano. | Nie dziala | Admin preview przekazuje pelne adminowe `FormField` do `resolved.fields`, a schema widgetu jest strict. | Patrz `NL-31-05-01`. |
| Advanced static | Klik `Advanced` przy static mode | Sekcje `Signup readiness` i `Authoring boundaries`, `writablePaths=[]`, brak input/select/pre. | Nie dotyczy. | Dziala | Advanced jest read-only support summary. | Brak. |
| Legacy webhook | Kodowy probe z `integration.webhookId` | Advanced/Visual code opisuje zapisany webhook jako external signup service. | Renderer nie wystawia `<form>` i blokuje submit. | Nie dziala jako truthfulness | Editor uznaje `webhookId` za dzialajacy destination, runtime nie. | Patrz `NL-31-05-02`. |
| Public Forms runtime bez nonce | Kodowy probe z compatible `resolved` bez `submissionNonce` | Nie dotyczy admin. | Widget renderuje interactive `<form>` bez `__nl_form_nonce`. | Ryzyko kontraktu | Public site zwykle hydratuje nonce, ale widget-level guard jest zbyt luzny. | Patrz `NL-31-05-03`. |
| Variant cards bez handlera | Kodowy audit `VariantCards` | Przy braku `onVariantChange` karty wygladaja jak klikane, mimo ze `onChange` jest opcjonalny. | Nie dotyczy. | UX robustness gap | Buttony nie sa disabled/read-only bez handlera. | Patrz `NL-31-05-04`. |

## Znaleziska do poprawy

### NL-31-05-01 - Bound Forms runtime psuje admin preview przez nieznormalizowane pola

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

**Jak naprawic:**

1. W admin preview dodac lokalny helper, np. `toNewsletterResolvedField(field)`,
   ktory mapuje `detail.fields` do ksztaltu schema:
   `id/type/label/name/required/orderIndex/settings`.
2. Uzyc helpera w `useNewsletterAdminPreview` zamiast `fields: detail.fields`.
3. Rozszerzyc test `Newsletter visual editor publishes page-builder preview
   hydration for forms-runtime` o pola w realnym adminowym ksztalcie
   (`formId`, `createdAt`, `updatedAt`) i oczekiwac, ze patch je obcina.
4. Dodac Playwright/regression smoke: wybranie publicznego Form nie moze
   renderowac `Invalid widget data`, a preview musi zostac w bezpiecznym
   editor-preview stanie.

### NL-31-05-02 - Legacy `webhookId` jest raportowany jako destination, ale runtime go blokuje

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

**Jak naprawic:**

1. Rozdzielic w editorze `saved legacy webhook exists` od `visitor submit path
   is active`.
2. Dla `webhookId` bez valid action URL pokazac support copy typu
   `Legacy webhook saved; visitor submit remains disabled until migrated to a
   Coderso Form`.
3. Jesli produktowo webhook ma dzialac, dodac realny internal/public-safe
   endpoint z tym samym nonce/captcha/rate-limit kontraktem co public writes.
4. Dodac test Advanced + renderer: webhook legacy nie moze mowic, ze visitors
   are sent, jesli `NewsletterBlock` renderuje `native-submit=blocked`.

### NL-31-05-03 - Public Forms runtime moze byc interactive bez nonce na poziomie widgetu

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

**Jak naprawic:**

1. Dla Forms runtime wymagac `resolved.submissionNonce` rowniez w public
   rendererze, chyba ze istnieje inny jawny, udokumentowany anti-abuse token.
2. Przy braku nonce renderowac blocked shell z diagnostyka zamiast native form.
3. Dodac widget-level test: public Forms runtime bez nonce nie moze renderowac
   `<form>` ani `data-nextless-form-runtime="1"`.
4. Zachowac publicSite/integration test, ktory potwierdza, ze normalna sciezka
   nadal dostarcza nonce i renderuje form.

### NL-31-05-04 - Variant cards wygladaja aktywnie nawet bez `onVariantChange`

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

**Jak naprawic:**

1. Jesli `onVariantChange` nie istnieje, renderowac karty jako disabled albo
   read-only summary.
2. Dodac test UI dla Visual editor bez `onVariantChange`: variant buttons nie
   moga wygladac jak aktywna mutacja.

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
