# Contact Widget (v1)

## Purpose

Sekcja kontaktu z formularzem, danymi firmy i opcjonalna mapa embed.

## Widget ID

`contact`

## Variants (v1)

- `form-left` - formularz po lewej, dane kontaktowe po prawej
- `form-right` - dane kontaktowe po lewej, formularz po prawej
- `minimal` - tylko dane kontaktowe (bez formularza), opcjonalna mapa

## Wizard flow (TASK-050-11-01)

1. Layout (`form-left` / `form-right` / `minimal`)
2. Form fields (`name`, `email`, `phone`, `message`)
3. Submit label
4. Contact details (`phone`, `email`, `address`)

Wizard ma dawac bezpieczny quick setup bez pol technicznych.

## Visual mode (TASK-050-11-01)

Zakres bazowy (przed pelna przebudowa IA w `TASK-050-11-02`):

- Form controls:
  - fields on/off
  - required fields
  - field order (move up/down)
  - submit label
- Contact details:
  - phone, email, address, hours
- Map settings:
  - `map.enabled`
  - `map.embedUrl`
- Style:
  - `style.spacing`
  - `style.columns`
  - `style.background`

## Advanced mode (TASK-050-11-01)

Tryb techniczny nadal szeroki (cleanup w `TASK-050-11-02`):

- field order + required matrix
- map source (`enabled`, `embedUrl`)
- layout tokens (`spacing`, `columns`, `background`)

## Runtime rendering rules (TASK-050-11-01)

- Renderer respektuje wariant (`form-left` / `form-right` / `minimal`).
- `minimal` nie renderuje formularza.
- Mapa renderuje sie tylko gdy:
  - `map.enabled = true`
  - `map.embedUrl` jest prawidlowym URL `http/https`.
- Styl sekcji respektuje:
  - `style.spacing`
  - `style.columns`
  - `style.background`.

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
    "background": "transparent",
    "columns": "two"
  }
}
```

## Normalization rules (TASK-050-11-01)

- Dozwolone pola formularza: `name`, `email`, `phone`, `message`.
- Nieznane i zduplikowane pola sa usuwane.
- `required` jest zawsze przycinane do aktualnie wybranych `fields`.
- Puste `submitLabel` wraca do defaultu.
- Nieprawidlowe tokeny stylu wracaja do defaultow (`spacing=md`, `columns=two`).
