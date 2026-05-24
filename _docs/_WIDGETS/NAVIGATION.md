# Navigation Widget (v1)

## Purpose

Kompozytowy pasek nawigacji strony z logo, linkami, opcjonalnym CTA i prawym
slotem na dodatkowe akcje.

## Widget ID

`navigation`

## Variants

- `simple` - logo + linki
- `with-cta` - logo + linki + primary CTA
- `split` - logo po lewej, linki na srodku, akcje/CTA po prawej

Primary CTA jest renderowane tylko dla:

- `with-cta`
- `split`

## Editor Modes

### Wizard

- onboarding dla wariantu, source mode, szybkich linkow, typu logo i CTA
- pokazuje pierwsze 3 quick links oraz overflow summary, gdy linkow jest wiecej
- ma widoczne etykiety dla logo link i quick-link URL fields
- przy `linksSource = menu` pokazuje read-only synced preview zamiast edytowalnych rows

### Visual

- glowny owner edycji Navigation (`visualOwnsVariantSelection: true`)
- sekcje:
  1. Variant and Structure
  2. Brand and Logo
  3. Navigation Links
  4. CTA and Right Actions
  5. Mobile Behavior
  6. Colors, Borders, Typography
  7. Surface and Runtime Behavior
- owns metadata/target controls, reorder UX, menu previews, active-link mode,
  mobile copy, and bounded style/brand controls

### Advanced

- tylko techniczne layout/runtime toggles
- layout: `alignment`, `maxWidth`, `paddingY`, `itemGap`
- runtime: `sticky`, `collapseOnScroll`
- bez duplikowania content/style editing z Visual

## Supported Fields

- `logo`
  - `type`: `text | image`
  - `value`
  - `href`
  - `alt`
  - `source`: `external | library`
  - `assetId`
- `items[]`
  - `label`
  - `href`
  - `target`: `self | blank`
  - `meta`
    - `visibility`: `all | logged_in | logged_out`
    - `badge`: `{ label, tone } | null`
    - `description`
    - `icon`
  - `children[]`
    - ten sam shape co item nadrzedny
- `cta`
  - `label`
  - `href`
- `linksSource`
  - `manual | menu | pages`
- `menuKey`
- `behavior`
  - `sticky`
  - `transparent`
  - `collapseOnScroll`
  - `mobileMode`: `expanded | drawer | minimal`
  - `hideCtaOnMobile`
  - `activeLinkMode`: `none | pathname | exact`
- `layout`
  - `alignment`
  - `maxWidth`
  - `paddingY`
  - `itemGap`
- `style`
  - colors: `textColor`, `logoColor`, `linkColor`, `linkHoverColor`,
    `linkActiveColor`, `surfaceColor`, `borderColor`, `ctaTextColor`,
    `ctaBackgroundColor`, `ctaBorderColor`
  - structure: `borderWidth`, `logoHeight`, `ctaBorderRadius`, `ctaSeparator`
  - typography: `fontSize`, `fontWeight`, `textTransform`, `letterSpacing`,
    `linkUnderline`
  - polish: `shadow`, `backdropBlur`, `dropdownDirection`, `motion`

## Slots

- `right`
  - secondary actions belong here
  - do not add a second persisted CTA field for Navigation

## Runtime Behavior Notes

### Safe links

- logo, item, child, and CTA destinations use the shared safe-href normalization
- hash links like `#overview` are valid for Navigation
- unsafe destinations fall back safely instead of rendering `javascript:` or
  protocol-relative URLs

### Logo

- logo renders as a keyboard-focusable `<a>`
- image logos keep `alt`; link accessible name prefers the image `alt` instead
  of the asset URL

### Link metadata

- `meta.icon`, `meta.badge`, and `meta.description` render as plain text only
- `meta.visibility` remains preserved in data/model and menu resolution, but
  this widget does not turn it into an auth gate by itself

### Dropdown semantics

- root navigation renders a labelled `<nav aria-label="Primary navigation">`
- submenus use normal site-navigation semantics with links + disclosure buttons;
  Navigation does not adopt ARIA application-menu roles
- submenu toggles expose `aria-expanded`, `aria-controls`, and runtime-managed
  `aria-hidden`
- click/touch/keyboard open/close logic is root-scoped and closes siblings and
  outside clicks safely

### Mobile modes

- `expanded`
  - primary links stay visible on mobile
  - no drawer toggle or mobile panel
- `drawer`
  - mobile toggle renders hamburger/close icons plus explicit open/close label
  - opening moves focus into the panel, loops focus while open, and returns
    focus to the trigger on close
  - mobile CTA renders once inside the drawer panel unless hidden
- `minimal`
  - no drawer toggle and no mobile link panel
  - only brand and right-side actions remain on mobile

### Active links and targets

- `activeLinkMode`
  - `none`: no active state
  - `pathname`: marks current path and nested descendants active
  - `exact`: only exact path matches become active
- SSR output starts inactive; client runtime marks links after `window.location`
  is available
- manual links can open in the same tab or a new tab
- `target = blank` always emits `rel="noopener noreferrer"`
- menu/pages source items remain `self` until their upstream owners define
  target metadata

### Collapse and sticky

- `sticky` still only enables sticky positioning on the Navigation root
- `collapseOnScroll` is now a real root-scoped runtime behavior:
  `data-navigation-collapsed` and a local collapsed class toggle while scrolling
- shared Section sticky containment is no longer blocked by the old
  `SectionBlock` overflow wrapper after `TASK-318`; any future page-shell-only
  sticky blockers should be routed separately instead of back into Navigation

## Authoring Limits

- max `8` top-level links
- max `6` sub-links per parent
- Visual mode exposes disabled-state helper copy instead of silently blocking
  add actions

## Clear Controls

- `style.surfaceColor`, `style.ctaBackgroundColor`, `style.ctaTextColor`, and
  `style.ctaBorderColor` are clearable
- `behavior.transparent` remains a separate runtime behavior, not a clear-value
  sentinel

## Data Model (summary)

```json
{
  "variant": "with-cta",
  "logo": {
    "type": "text",
    "value": "Coderso",
    "href": "/",
    "alt": "optional image alt",
    "source": "external",
    "assetId": "optional-media-id"
  },
  "linksSource": "manual",
  "menuKey": "menu-id",
  "items": [
    {
      "label": "Docs",
      "href": "/docs",
      "target": "blank",
      "meta": {
        "visibility": "all",
        "badge": { "label": "New", "tone": "accent" },
        "description": "Latest writing",
        "icon": "spark"
      },
      "children": [
        {
          "label": "API",
          "href": "/docs/api",
          "target": "self"
        }
      ]
    }
  ],
  "cta": { "label": "Get started", "href": "/start" },
  "behavior": {
    "sticky": false,
    "transparent": false,
    "collapseOnScroll": false,
    "mobileMode": "drawer",
    "hideCtaOnMobile": false,
    "activeLinkMode": "pathname"
  },
  "layout": {
    "alignment": "right",
    "maxWidth": "6xl",
    "paddingY": "4",
    "itemGap": "4"
  },
  "style": {
    "surfaceColor": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "borderWidth": "1",
    "textColor": "var(--color-text)",
    "logoColor": "var(--color-text)",
    "linkColor": "var(--color-text)",
    "linkHoverColor": "var(--color-text)",
    "linkActiveColor": "var(--color-text)",
    "linkUnderline": "none",
    "fontSize": "sm",
    "fontWeight": "medium",
    "textTransform": "none",
    "letterSpacing": "none",
    "shadow": "none",
    "backdropBlur": "none",
    "dropdownDirection": "bottom",
    "motion": "subtle",
    "logoHeight": "md",
    "ctaBackgroundColor": "var(--color-primary)",
    "ctaTextColor": "var(--color-bg)",
    "ctaBorderColor": "transparent",
    "ctaBorderRadius": "md",
    "ctaSeparator": "none"
  },
  "slots": {
    "right": []
  }
}
```

## TASK-336-18 Editor Contract

- Exports `navigationEditorContract` with `version: 2`.
- Contract target: Wizard seeds brand/menu source/links/CTA; Visual owns brand,
  links, CTA, mobile behavior, layout, and style; Advanced is read-only runtime
  diagnostics.
- Raw source keys, slot copy, and writable Advanced layout behavior are routed
  to `TASK-336-19`.
