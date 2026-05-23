# Contact Widget (v2)

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

Wizard prowadzi szybki setup bez technicznych pol runtime:

- variant cards (`form-left`, `form-right`, `minimal`)
- section title + description
- form fields (`name`, `email`, `phone`, `message`) i submit label
- static status note dla formularza presentational
- contact details (`phone`, `email`, `address`, `hours`)

### Visual

Contact przejmuje wybor wariantu przez
`editorCapabilities.visualOwnsVariantSelection = true`.

Glowny tryb codziennej edycji obejmuje:

1. section header
2. form fields, required rules, field order, labels/placeholders/layout
3. submission runtime binding do istniejącego Forms record
4. contact details, labels, ikony, social links
5. map source + validation + display controls
6. colors, borders, width, padding, spacing, columns

`minimal` ukrywa form-field controls i pokazuje user-facing copy, zamiast
pozostawiac mylace ustawienia formularza.

### Advanced

Advanced zostaje techniczny i Contact-local:

- map/runtime diagnostics
- normalization and fallback controls
- runtime diagnostics snapshot z redakcja `resolved.submissionNonce`

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
    "background": "transparent",
    "columns": "two",
    "surfaceColor": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "borderWidth": "1",
    "maxWidth": "xl",
    "paddingX": "md"
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
- Social links przechodza przez Contact-local safe href normalization i
  wpuszczaja tylko absolutne linki webowe (`http/https`).
- Mapa renderuje sie tylko gdy:
  - `map.enabled = true`
  - `map.embedUrl` jest poprawnym `http/https` URL
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
- kazde widoczne Contact field mapuje sie 1:1 do zgodnego typem Forms field:
  - `name -> text`
  - `email -> email`
  - `phone -> phone`
  - `message -> textarea`
- liczba widocznych Contact fields musi odpowiadac liczbie runtime fields
- Contact nie aktywuje runtime submit dla Forms field logic, extra step groups,
  internal-only forms, missing forms, unpublished public forms, ani dla form
  z dodatkowymi lub niekompatybilnymi polami

Gdy ktorykolwiek z warunkow nie jest spelniony, Contact wraca do static-safe
renderu zamiast udawac aktywna wysylke.

### Shared runtime boundary

- Contact reuzywa `POST /forms/:id/submissions`, `__nl_form_nonce`,
  `getFormRuntimeClientScript()`, `data-form-embed-success`, i
  `data-form-embed-error`.
- Contact nie wprowadza wlasnego public endpointu ani widget-owned nonce/CAPTCHA
  konfiguracji.
- Shared busy/live-region/CAPTCHA projection jest juz domknieta w shared
  Forms runtime; Contact emituje tylko kompatybilne markery i nie definiuje
  własnego runtime/public-write kontraktu.

## Accessibility and Diagnostics

- Section i oba panele maja stabilne accessible names przez
  `aria-labelledby` lub deterministic fallback `aria-label`.
- Field controls maja stabilne `id`, `name`, explicit labels, placeholders,
  i `autocomplete`.
- Runtime diagnostics snapshot redaguje transient nonce values:
  `submissionNonce` nigdy nie powinien byc traktowany jako edytowalny payload.

## Clear Controls

- `style.background` i `style.surfaceColor` sa clearable i usuwaja wymuszone
  style tła.
- `borderColor` clear pozostaje shared owner scope z TASK-256-02; Contact tylko
  konsumuje wynikowy shared contract.

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
