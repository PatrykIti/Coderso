# Contact Widget (v1)

## Purpose

Sekcja kontaktu z formularzem, danymi firmy i opcjonalna mapa embed.

## Widget ID

`contact`

## Variants (v1)

- `form-left` - formularz po lewej, dane kontaktowe po prawej
- `form-right` - dane kontaktowe po lewej, formularz po prawej
- `minimal` - tylko dane kontaktowe (bez formularza), opcjonalna mapa

## Wizard flow (TASK-050-11-02)

1. Layout (`form-left` / `form-right` / `minimal`)
2. Form fields (`name`, `email`, `phone`, `message`)
3. Submit label
4. Contact details (`phone`, `email`, `address`)

Wizard ma dawac bezpieczny quick setup bez pol technicznych.

## Visual mode (TASK-050-11-02)

Contact przejmuje selektor wariantu w Visual przez:
`editorCapabilities.visualOwnsVariantSelection = true`

Docelowe sekcje Visual:

1. Variant and layout structure
2. Form fields and required rules
3. Contact details and business info
4. Map source and display behavior
5. Colors, borders, and surface styling
6. Spacing and columns

Visual jest glownym trybem codziennej edycji content + stylu.

## Advanced mode (TASK-050-11-02)

Advanced jest techniczny i nie duplikuje codziennej edycji content/style z Visual.

Sekcje Advanced:

- Map source and runtime metadata
- Normalization and fallback controls
- Runtime diagnostics snapshot

## Runtime rendering rules

- Renderer respektuje wariant (`form-left` / `form-right` / `minimal`).
- `minimal` nie renderuje formularza.
- Mapa renderuje sie tylko gdy:
  - `map.enabled = true`
  - `map.embedUrl` jest prawidlowym URL `http/https`.
- Styl sekcji respektuje:
  - `style.spacing`
  - `style.columns`
  - `style.background`
- Styl kart/form paneli respektuje:
  - `style.surfaceColor`
  - `style.borderColor`
  - `style.borderWidth`

## Clear Controls

- `style.background` and `style.surfaceColor` are clearable; clear removes the
  configured section/card surface key and the renderer omits the forced
  background style.
- Border width/color, form field rules, and map rendering rules are unchanged by
  surface clear.

## Data model (summary)

```json
{
  "variant": "form-left",
  "form": {
    "fields": ["name", "email", "message"],
    "required": ["email", "message"],
    "submitLabel": "Send message"
  },
  "contact": {
    "phone": "+1 555 123 456",
    "email": "hello@example.com",
    "address": "123 Market Street",
    "hours": "Mon-Fri 9-5"
  },
  "map": {
    "enabled": false,
    "embedUrl": ""
  },
  "style": {
    "spacing": "md",
    "background": "#f8fafc",
    "columns": "two",
    "surfaceColor": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "borderWidth": "1"
  }
}
```

## Normalization rules

- Dozwolone pola formularza: `name`, `email`, `phone`, `message`.
- Nieznane i zduplikowane pola sa usuwane.
- `required` jest zawsze przycinane do aktualnie wybranych `fields`.
- Puste `submitLabel` wraca do defaultu.
- Nieprawidlowe tokeny stylu wracaja do defaultow:
  - `spacing=md`
  - `columns=two`
  - `borderWidth=1`
