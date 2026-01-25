# Navigation Widget (v1)

## Purpose

Menu i nawigacja strony z linkami i logo.

## Widget ID

`navigation`

## Variants (v1)

- simple (logo + linki)
- with-cta (logo + linki + przycisk)
- split (logo, linki po bokach)

## Wizard flow (v1)

- Pytanie 1: Styl menu (simple / with-cta / split)
- Pytanie 2: Logo (obrazek / tekst)
- Pytanie 3: Linki (lista)
- Pytanie 4: CTA (opcjonalnie)

## Visual mode

- Podglad wariantow menu.

## Advanced options (v1)

- logo: type, src, text
- items: label, href, children
- behavior: sticky, transparent, collapseOnScroll
- layout: alignment, spacing

## Data model (summary)

```json
{
  "variant": "simple",
  "logo": { "type": "text", "value": "string" },
  "items": [{ "label": "string", "href": "string" }],
  "cta": { "label": "string", "href": "string" },
  "behavior": { "sticky": true }
}
```
