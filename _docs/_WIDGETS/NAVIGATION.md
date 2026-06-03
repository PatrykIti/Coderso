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

- read-only current layout summary
- read-only current logo type / logo text-or-image summary
- pokazuje read-only current source plus first 3 quick/fallback/synced links
  z overflow summary, gdy linkow jest wiecej
- obraz logo wybierany jest przez Media Library; istniejace zewnetrzne obrazy
  pozostaja jako read-only replace/clear state
- source switching, menu sync, quick-link labels/destinations, CTA destination,
  i logo destination sa juz tylko w Visual

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
  mobile copy, Media Library logo replacement, bounded style/brand controls,
  layout width/spacing, sticky behavior, and collapse-on-scroll behavior
- all Visual controls that mutate Navigation data expose stable
  `data-widget-control-path` metadata matching the widget editor contract;
  reorder/add/remove buttons remain action controls around the owned `items`
  path
- daily color authoring is swatch-first like `hero`; theme tokens, transparent
  values, and saved custom values remain replace-or-clear compatible without
  visible raw color text inputs
- pristine Navigation theme-token defaults are labelled as `Theme default`
  instead of saved custom colors; the swatch is a fallback preview, while
  public pages resolve tokens such as `var(--color-bg)` from the active theme
- manual link, child link, logo and CTA destinations use the shared
  published-page destination picker. Existing custom/hash/external `href`
  values remain read-only replace/clear state in Visual.
- clearing a manual link or child destination keeps the draft in the editor and
  shows inline feedback that runtime hides it until a public-safe destination is
  selected

### Advanced

- read-only source/runtime summary
- read-only layout token summary
- read-only runtime behavior summary covering `sticky`, `transparent`,
  `collapseOnScroll`, `mobileMode`, `hideCtaOnMobile`, `activeLinkMode`, and the
  admin-preview/runtime-script boundary
- `Advanced` sections use stable widget-owned ids matching the rendered UI:
  `navigation.advanced.runtime-summary`,
  `navigation.advanced.layout-token-summary`,
  `navigation.advanced.runtime-behavior-summary`
- bez duplikowania content/style/layout/behavior editing z Visual

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
- bare `#` is treated as a missing destination so unsafe resolver placeholders
  cannot become clickable fake links
- unsafe destinations are hidden instead of rendering `javascript:`,
  protocol-relative URLs, or clickable placeholder links

### Logo

- logo renders as a keyboard-focusable `<a>`
- image logos keep `alt`; link accessible name prefers the image `alt` instead
  of the asset URL
- clearing an image logo keeps image mode but removes the image `src`; runtime
  renders a safe text fallback from `alt` or `Logo` instead of falling back to a
  broken `Coderso` image source
- image logo `value` must be an `http(s)` URL or root-relative path; unsupported
  or unsafe values are dropped during normalization and use the same text
  fallback

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
- admin preview renders static Navigation markup; drawer, submenu,
  collapse-on-scroll, and active-link updates are activated by the public
  runtime script

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
- duplicate responsive clones for the best active match, including drawer
  clones, receive truthful `aria-current="page"` alongside
  `data-navigation-active="true"`
- manual links can open in the same tab or a new tab
- `target = blank` always emits `rel="noopener noreferrer"`
- menu/pages source items remain `self` until their upstream owners define
  target metadata

### Public DOM and menu identifiers

- public Navigation markup exposes `data-menu-configured="true"` for menu-backed
  diagnostics
- raw `menuKey` values stay out of public DOM; Advanced may summarize whether a
  menu is configured without exposing the identifier

### Style color bounds

- persisted/imported Navigation color fields are schema-bounded and normalized
  before render
- accepted color values are safe hex colors, `var(--color-*)` theme tokens,
  bounded `rgb(a)`/`hsl(a)` values, and safe keywords such as `transparent`
- unsafe CSS fragments such as `url(...)`, `javascript:`, `data:`, braces, and
  semicolon injection are rejected by schema validation or dropped by the
  normalizer before inline styles are emitted

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

- all Navigation color fields are clearable:
  `style.surfaceColor`, `style.borderColor`, `style.textColor`,
  `style.logoColor`, `style.linkColor`, `style.linkHoverColor`,
  `style.linkActiveColor`, `style.ctaBackgroundColor`, `style.ctaTextColor`,
  and `style.ctaBorderColor`
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
- Contract target: Wizard is a read-only setup summary; Visual owns brand,
  links, CTA, source selection, mobile behavior, layout, and style; Advanced is
  read-only runtime diagnostics.
- TASK-336-19 converts writable Advanced layout/runtime behavior into read-only
  summaries, moves the friendly controls to Visual, redacts raw menu keys in
  Advanced summaries, and removes nonexistent `cta.target`/`cta.enabled`
  contract paths.
