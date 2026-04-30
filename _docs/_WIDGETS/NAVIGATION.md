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
  - links source (`manual` / `menu` / `pages`)
  - logo type + basic logo value
  - CTA on/off
- visible labels for each quick-link label and URL pair
- helper copy for the links source selector
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
- `items`: `label`, `href`, optional `meta`, optional `children[]`
  - `meta.visibility`: `all | logged_in | logged_out`
  - `meta.badge`: `{ label, tone } | null`
  - `meta.description`: `string | null`
  - `meta.icon`: `string | null`
- `cta`: `label`, `href`
- `linksSource`: `manual | menu | pages`
- `menuKey`: string (menu id)
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

### Runtime link sources

- `linksSource = "manual"`: renderuje `items` z konfiguracji widgetu (gdy brak poprawnych linkow, fallback do default items).
- `linksSource = "menu"`:
  - gdy `menuKey` jest ustawione: runtime pobiera menu po ID i mapuje je do linkow.
  - gdy `menuKey` brak: fallback do menu o `location = "primary"`.
  - gdy wynik ma 0 linkow: fallback do manual `items`.
  - runtime mapuje rowniez metadata z menu item settings do `items[].meta`
    (deterministyczny shape: `visibility`, `badge`, `description`, `icon`).
- `linksSource = "pages"`:
  - runtime buduje linki z opublikowanych stron (`status = published`) z `page.data.settings.showInNav = true` (brak pola traktujemy jako `true`).
  - gdy wynik ma 0 linkow: fallback do manual `items`.

## Clear Controls

- `style.surfaceColor`, `style.ctaBackgroundColor`, `style.ctaTextColor`, and
  `style.ctaBorderColor` are clearable; clear removes the configured style key
  and does not replace it with `transparent`.
- `behavior.transparent` remains a separate product behavior mode for
  transparent navigation and is not the editor clear sentinel.

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
  "menuKey": "menu-id",
  "items": [
    {
      "label": "string",
      "href": "string",
      "meta": {
        "visibility": "all",
        "badge": { "label": "string", "tone": "default" },
        "description": "string",
        "icon": "string"
      },
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
