# Contact Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Sekcja kontaktu z opcjonalnym formularzem, danymi firmy, linkami social i mapa
embed. Contact jest widgetem composite-first: ma dawac czytelny section header,
bezpieczne dane kontaktowe i uczciwe zachowanie formularza zarowno w trybie
static, jak i przy podpietym runtime Forms.

## Widget ID

`contact`

## Variants

- `form-left` - formularz po lewej, dane kontaktowe po prawej
- `form-right` - dane kontaktowe po lewej, formularz po prawej
- `minimal` - tylko dane kontaktowe + opcjonalna mapa; formularz nie renderuje

## Editor Modes

### Wizard

Wizard jest teraz read-only starter summary:

- current layout
- current visible fields
- current submit label

Wizard nie edytuje już layoutu, section header, business details ani form
setup. Tytul/opis sekcji, details panel title, telefon, email, adres, godziny,
visible fields, submit label, i runtime binding należą do Visual.

### Visual

Contact przejmuje wybor wariantu przez
`editorCapabilities.visualOwnsVariantSelection = true`.

Glowny tryb codziennej edycji obejmuje:

1. section header
2. form fields, required rules, field order, labels/placeholders/layout
3. submission runtime binding do istniejącego Forms record
4. contact details, labels, ikony, social links przez platform + profile name
5. map location + display controls; editor buduje `map.embedUrl`
6. palettes, text colors, submit button colors, card/button radius, borders,
   width, padding, spacing, columns

`minimal` ukrywa form-field controls i pokazuje user-facing copy, zamiast
pozostawiac mylace ustawienia formularza.

Visual nie prosi nietechnicznego uzytkownika o `iframe`, raw map URL, social
URL, ani developer-only path. Mapa przyjmuje publiczna lokalizacje/adres i
zapisuje kompatybilny `map.embedUrl`. Znane platformy social przyjmuja tylko
profile name/handle i zapisuja bezpieczne `social.href`; legacy custom links sa
pokazywane jako replace/clear state. Nowe social rows startuja od znanej
platformy, a nie od `custom`, zeby nie tworzyc martwego beginner flow.
Jesli uzytkownik wklei pelny link profilu dla znanej platformy, helper probuje
wydobyc profile name/handle; nieparsowalny link jest odrzucany zamiast
kodowany jako handle.

### Advanced

Advanced zostaje techniczny i Contact-local:

- read-only map/runtime diagnostics
- confirm-gated normalization support action
- runtime diagnostics summary z redakcja `resolved.submissionNonce`

## Data Model (summary)

```json
{
  "title": "Get in touch",
  "description": "Talk to the team behind the product.",
  "form": {
    "title": "Send a message",
    "fields": ["name", "email", "message"],
    "required": ["email", "message"],
    "submitLabel": "Send message",
    "fieldLayout": "one",
    "fieldSettings": {
      "name": {
        "label": "Name",
        "placeholder": "Your name",
        "autocomplete": "name",
        "span": "full"
      }
    },
    "submission": {
      "mode": "static",
      "staticMessage": "This contact form is not connected yet.",
      "formId": "",
      "fieldMap": {
        "name": "",
        "email": "",
        "phone": "",
        "message": ""
      },
      "successMessage": "Thanks for your message.",
      "errorMessage": "Unable to send your message. Please try again."
    }
  },
  "contact": {
    "title": "Contact details",
    "phone": "+1 555 123 456",
    "email": "hello@example.com",
    "address": "123 Market Street",
    "hours": "Mon-Fri 9-5",
    "details": {
      "phone": { "label": "Phone", "icon": "phone" }
    },
    "social": [
      {
        "id": "contact-social-1",
        "platform": "linkedin",
        "label": "LinkedIn",
        "href": "https://www.linkedin.com/company/example"
      }
    ]
  },
  "map": {
    "enabled": false,
    "embedUrl": "",
    "title": "",
    "description": "",
    "height": "md",
    "fallbackCopy": "Map is unavailable."
  },
  "style": {
    "spacing": "md",
    "background": "",
    "columns": "two",
    "surfaceColor": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "borderWidth": "1",
    "textColor": "",
    "mutedTextColor": "",
    "buttonBackgroundColor": "",
    "buttonTextColor": "",
    "buttonBorderColor": "",
    "maxWidth": "xl",
    "paddingX": "md",
    "panelRadius": "xl",
    "buttonRadius": "md"
  }
}
```

## Runtime Behavior

- Renderer respektuje wariant `form-left`, `form-right`, `minimal`.
- `minimal` nie renderuje formularza; pokazuje tylko dane kontaktowe i opcjonalna mape.
- Contact section moze miec `title`/`description`, a oba panele moga miec
  wlasne `form.title` i `contact.title`.
- Dane kontaktowe renderuja sie semantycznie jako `<address>` + `<dl>/<dt>/<dd>`.
- `phone` i `email` dostaja bezpieczne `tel:` / `mailto:` tylko dla poprawnych
  wartosci. Nieprawidlowe dane zostaja zwyklym tekstem.
- Social links przechodza przez Contact-local safe href normalization. Public
  runtime renderuje tylko znane platformy z bezpiecznym `https` hostem
  odpowiadajacym platformie. Legacy `custom`/arbitrary web href pozostaje
  stanem supportowym do zastapienia lub wyczyszczenia w edytorze i nie jest
  publikowany jako aktywny link.
- Visual authoring dla znanych platform social zapisuje `social.href` z
  nietechnicznego profile name/handle; custom `href` pozostaje legacy/support.
- Mapa renderuje sie tylko gdy:
  - `map.enabled = true`
  - `map.embedUrl` jest poprawnym `https` Google Maps embed URL
- Visual authoring zapisuje Google Maps embed URL z publicznej lokalizacji lub
  adresu, bez proszenia uzytkownika o kod osadzenia.
- Gdy mapa jest wlaczona, ale URL nie przechodzi walidacji runtime, widget
  pokazuje `map.fallbackCopy` zamiast pustego iframe.
- Iframe mapy dostaje `allowFullScreen` i tytul pochodzacy z `map.title` lub
  bezpiecznego fallbacku.

## Form Contract

### Static mode

- `form.submission.mode = "static"` jest legacy/default behavior.
- Static Contact nie robi native GET do aktualnego URL.
- Submit CTA ma `type="button"`, `data-form-submit="1"`, `aria-busy="false"`,
  a widget pokazuje user-facing `staticMessage`.

### Forms runtime mode

Contact moze aktywowac realny submit tylko przez istniejacy Forms runtime:

- `form.submission.mode = "forms-runtime"`
- `form.submission.formId` wskazuje istniejący Forms record
- `publicSite.tsx` hydratuje render-only `resolved`
- `resolved.submissionAccess === "public"`
- `resolved.submissionNonce` jest obecny dla public runtime
- kazde widoczne Contact field mapuje sie 1:1 do zgodnego typem Forms field:
  - `name -> text`
  - `email -> email`
  - `phone -> phone`
  - `message -> textarea`
- liczba widocznych Contact fields musi odpowiadac liczbie runtime fields
- Contact nie aktywuje runtime submit dla Forms field logic, extra step groups,
  internal-only forms, missing forms, unpublished public forms, missing nonce,
  ani dla form z dodatkowymi lub niekompatybilnymi polami

Gdy ktorykolwiek z warunkow nie jest spelniony, Contact wraca do static-safe
renderu zamiast udawac aktywna wysylke.

Public DOM rozdziela stan skonfigurowany od efektywnego:

- `data-contact-form-configured-mode` pokazuje zapisany tryb edytora
- `data-contact-form-mode` pokazuje efektywny tryb renderu
- `data-contact-runtime-boundary` wyjasnia fallback (`internal`,
  `nonce-missing`, `field-mismatch`, `runtime-data-missing`, itd.)

### Shared runtime boundary

- Contact reuzywa `POST /forms/:id/submissions`, `__nl_form_nonce`,
  `getFormRuntimeClientScript()`, `data-form-embed-success`, i
  `data-form-embed-error`.
- Contact emituje `data-form-submit-label`, `data-form-captcha-site-key`,
  `data-form-captcha-action`, i hidden `captchaToken` tylko dla aktywnego
  public Forms runtime z server-side projection.
- Contact nie wprowadza wlasnego public endpointu ani widget-owned nonce/CAPTCHA
  konfiguracji.
- Shared busy/live-region/CAPTCHA projection i idempotentny multi-instance
  binder sa domkniete w shared Forms runtime; Contact emituje tylko
  kompatybilne markery i nie definiuje wlasnego runtime/public-write kontraktu.

## Accessibility and Diagnostics

- Section i oba panele maja stabilne accessible names przez
  `aria-labelledby` lub deterministic fallback `aria-label`.
- Field controls maja stabilne `id`, `name`, explicit labels, placeholders,
  i `autocomplete`.
- Runtime diagnostics summary redaguje transient nonce values:
  `submissionNonce` nigdy nie powinien byc traktowany jako edytowalny payload.

## Clear Controls

- `style.background` i `style.surfaceColor` sa clearable i usuwaja wymuszone
  style tła.
- `style.borderColor`, `style.textColor`, `style.mutedTextColor`,
  `style.buttonBackgroundColor`, `style.buttonTextColor`, i
  `style.buttonBorderColor` sa clearable z disabled-state gdy Contact jest w
  stanie theme-default, zgodnie z hero-like daily authoring.
- Public inline colors przechodza przez bounded CSS color normalizer
  (`hex`, bounded `rgb/hsl`, `transparent/currentColor/inherit`, albo
  `var(--color-*)`). Unsafe fragments typu `url(...)`, `data:`,
  `javascript:`, `expression(...)`, braces i semicolons sa ignorowane przed
  renderem.

## Normalization Rules

- Dozwolone pola formularza: `name`, `email`, `phone`, `message`.
- Nieznane i zduplikowane pola sa usuwane.
- `required` jest zawsze przycinane do aktualnie wybranych `fields`.
- Puste `submitLabel`, `successMessage`, `errorMessage`, i `staticMessage`
  wracaja do bezpiecznych defaultow.
- `spacing`, `columns`, `borderWidth`, `fieldLayout`, `map.height`,
  `maxWidth`, i `paddingX` maja jawne defaulty:
  - `spacing = md`
  - `columns = two`
  - `borderWidth = 1`
  - `fieldLayout = one`
  - `map.height = md`
  - `maxWidth = xl`
  - `paddingX = md`

## TASK-336-18 Editor Contract

- Exports `contactEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns form
  details, field labels, business details, map, social links, and style;
  Advanced is read-only submission/map/runtime diagnostics.
- TASK-336-19 removes duplicate map editing from Advanced and replaces normal
  Visual map/social raw URL authoring with location/profile-name flows while
  preserving the existing string schema.
