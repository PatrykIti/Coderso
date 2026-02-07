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

## Mode responsibilities (final)

### Wizard

- minimal onboarding:
  - variant
  - links source (`manual` / `menu`)
  - logo type + basic logo value
  - CTA on/off
- safe defaults for non-technical users.

### Visual

- primary editing mode (widget owns variant selection via `visualOwnsVariantSelection`).
- section-based IA:
  1. Variant and Structure
  2. Brand and Logo
  3. Navigation Links
  4. CTA and Right Actions
  5. Mobile Behavior
  6. Colors, Borders, Typography
  7. Surface and Runtime Behavior
- full practical content + style editing.

### Advanced

- technical-only controls:
  - layout tokens (`alignment`, `maxWidth`, `paddingY`, `itemGap`)
  - runtime behavior toggles (`sticky`, `collapseOnScroll`)
- no duplicate content/style editing from Visual.

## Supported fields (summary)

- `logo`: `type`, `value`, `href`, `alt`, `source`, `assetId`
- `items`: `label`, `href`, optional `children[]`
- `cta`: `label`, `href`
- `linksSource`: `manual | menu`
- `menuKey`: string
- `behavior`: `sticky`, `transparent`, `collapseOnScroll`, `mobileMode`, `hideCtaOnMobile`
- `layout`: `alignment`, `maxWidth`, `paddingY`, `itemGap`
- `style`: surface/text/link/logo/CTA colors, border width/color, typography tokens

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
- `behavior.mobileMode`:
  - `expanded`: linki widoczne na mobile
  - `drawer` / `minimal`: linki ukryte na mobile + kompaktowy trigger
- `behavior.hideCtaOnMobile = true` -> CTA ukryte na mobile.

## Data model (summary)

```json
{
  "variant": "simple",
  "logo": {
    "type": "text",
    "value": "string",
    "href": "/",
    "alt": "string",
    "source": "external",
    "assetId": "optional-media-id"
  },
  "linksSource": "manual",
  "menuKey": "main",
  "items": [
    {
      "label": "string",
      "href": "string",
      "children": [{ "label": "string", "href": "string" }]
    }
  ],
  "cta": { "label": "string", "href": "string" },
  "behavior": {
    "sticky": true,
    "transparent": false,
    "collapseOnScroll": false,
    "mobileMode": "expanded",
    "hideCtaOnMobile": false
  },
  "layout": {
    "alignment": "left",
    "maxWidth": "6xl",
    "paddingY": "4",
    "itemGap": "4"
  },
  "style": {
    "surfaceColor": "#ffffff",
    "borderColor": "#e2e8f0",
    "borderWidth": "1",
    "textColor": "#0f172a",
    "linkColor": "#334155",
    "logoColor": "#0f172a",
    "ctaBackgroundColor": "#1d4ed8",
    "ctaTextColor": "#ffffff",
    "ctaBorderColor": "transparent",
    "fontSize": "sm",
    "fontWeight": "medium",
    "textTransform": "none"
  },
  "slots": {
    "right": []
  }
}
```
