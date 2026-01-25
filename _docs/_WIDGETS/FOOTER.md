# Footer Widget (v1)

## Purpose

Stopka strony z linkami, danymi i social.

## Variants (v1)

- columns-2
- columns-3
- minimal

## Wizard flow (v1)

- Pytanie 1: Uklad (2 kolumny / 3 kolumny / minimal)
- Pytanie 2: Linki i sekcje
- Pytanie 3: Dane firmy i social

## Visual mode

- Podglad wariantow stopki z kolumnami.

## Advanced options (v1)

- columns: tytul, linki
- legal: copyright, privacy, terms
- social: list icons
- layout: spacing, alignment

## Data model (summary)

```json
{
  "variant": "columns-3",
  "columns": [
    { "title": "string", "links": [{ "label": "string", "href": "string" }] }
  ],
  "legal": { "copyright": "string" },
  "social": [{ "type": "string", "href": "string" }]
}
```
