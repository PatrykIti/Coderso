# Hero Widget (v1)

## Purpose

Pierwszy ekran strony z glownym przekazem, CTA i opcjonalnym media.

## Variants (v1)

- centered (tytul + opis + CTA, wszystko na srodku)
- split (tekst po lewej, media po prawej)
- media-left (media po lewej, tekst po prawej)

## Wizard flow (v1)

- Pytanie 1: Cel sekcji (lead, sprzedaz, informacja)
- Pytanie 2: Uklad (centered / split / media-left)
- Pytanie 3: Media (brak / obraz / video)
- Pytanie 4: CTA (jedno / dwa przyciski)

Wizard mapuje odpowiedzi na `variant` i ustawia defaulty.

## Visual mode

- Karty z miniaturami wariantow.
- Po wyborze wariantu pokazywane sa tylko pola tego wariantu.

## Advanced options (v1)

- content: headline, subhead, body
- cta: primary, secondary
- media: typ, src, alt, ratio, overlay
- layout: maxWidth, align, contentWidth
- spacing: paddingTop, paddingBottom
- background: color, gradient, image
- responsive: hideMediaOnMobile

## Data model (summary)

```json
{
  "variant": "centered",
  "headline": "string",
  "subhead": "string",
  "body": "string",
  "primaryCta": { "label": "string", "href": "string" },
  "secondaryCta": { "label": "string", "href": "string" },
  "media": { "type": "image", "src": "string", "alt": "string" },
  "layout": { "align": "center", "maxWidth": "xl" },
  "style": { "paddingTop": "xl", "paddingBottom": "xl" }
}
```
