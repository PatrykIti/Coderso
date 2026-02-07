# Navigation Widget (v1)

## Purpose

Menu i nawigacja strony z linkami i logo.

## Widget ID

`navigation`

## Variants (v1)

- simple (logo + linki)
- with-cta (logo + linki + przycisk)
- split (logo, linki po bokach)

CTA jest renderowane dla wariantow:
- `with-cta`
- `split`

## Wizard flow (v1)

- Pytanie 1: Styl menu (simple / with-cta / split)
- Pytanie 2: Logo (obrazek / tekst)
- Pytanie 3: Linki (lista)
- Pytanie 4: CTA (opcjonalnie)

## Visual mode

- Widget przejmuje selektor wariantu (`visualOwnsVariantSelection = true`),
  wiec nie pokazujemy generycznej listy wariantow z panelu Visual.
- Visual sluzy do szybkiej korekty wygladu runtime:
  - wariant
  - alignment
  - sticky / transparent
- Edycja tresci (logo, linki, CTA) pozostaje w Wizard.

## Advanced options (v1)

- logo: type, src, text
- items: label, href (pelna lista)
- items.children: obslugiwane w modelu i rendererze (submenu level 1)
- behavior: sticky, transparent, collapseOnScroll
- layout: alignment, spacing

## Slots

- `right` (Right Actions)
  - Renderowany po prawej stronie paska nawigacji.
  - Moze zawierac dodatkowe akcje (np. login / language switcher / custom CTA).

## Runtime behavior

- `behavior.sticky = true` -> nav jest przypiety (`sticky`, `top-0`, `z-40`).
- `behavior.transparent = true` -> przezroczyste tlo i border.
- `behavior.collapseOnScroll`:
  - zapisywany i przekazywany jako atrybut `data-collapse-on-scroll="true"`,
    bez wymuszania JS-owego collapsu w v1.

## Data model (summary)

```json
{
  "variant": "simple",
  "logo": { "type": "text", "value": "string", "href": "/", "alt": "string" },
  "items": [
    {
      "label": "string",
      "href": "string",
      "children": [{ "label": "string", "href": "string" }]
    }
  ],
  "cta": { "label": "string", "href": "string" },
  "behavior": { "sticky": true, "transparent": false, "collapseOnScroll": false },
  "layout": { "alignment": "left" },
  "slots": {
    "right": []
  }
}
```
