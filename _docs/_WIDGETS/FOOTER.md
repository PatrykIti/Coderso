# Footer Widget (v1)

## Purpose

Site footer with structured columns, optional brand block, legal links, and
icon-based social actions.

## Widget ID

`footer`

## Variants (v1)

- `columns-2`
  Two visible footer columns plus an optional lower legal/actions strip.
- `columns-3`
  Three visible footer columns plus an optional lower legal/actions strip.
- `minimal`
  Compact footer row that reuses the first column links inline, keeps brand /
  legal / social content visible when enabled, and preserves hidden columns in
  data without rendering them as a fake one-column grid.

## Slots

- `column-1` (`Column 1`)  
  Renders inside the first visible footer column. In `minimal`, this slot is
  rendered below the compact row.
- `column-2` (`Column 2`)  
  Renders inside the second visible footer column.
- `column-3` (`Column 3`)  
  Renders inside the third visible footer column (for `columns-3`).
- `bottom` (`Bottom Strip`)  
  Renders in the lower legal/actions strip for column variants, or below the
  compact row in `minimal`.

## Editor Modes

### Wizard
- Layout variant selection.
- Quick setup for visible columns: title plus the first link per visible column,
  with explicit disclosure that additional links stay in Visual mode.
- Brand basics: brand name, tagline, Media Library logo picking, and logo alt
  text.
- Legal basics: visibility toggle, copyright, localized Privacy/Terms labels,
  and page-first destination pickers.
- Social basics: visibility toggle, platform choices with profile
  names/handles, custom destination page picking, custom platform label support,
  and up to 8 quick social entries.

### Visual
- Primary editing mode (Footer owns variant selection in Visual).
- Sections:
  - Variant and structure
  - Columns and links
  - Brand and legal
  - Utility strip
  - Social links and icon style
  - Colors and borders
  - Typography and link styling
  - Slots overview and insertion hints
- Visual owns content, legal, social, and user-facing link/style controls.
- Visual destination authoring uses page-first pickers for column and legal
  links, Media Library picking for the brand logo, and platform/profile fields
  for social links. Legacy custom destinations stay replace-or-clear
  compatible instead of editable raw URL fields.
- Link reordering is supported.
- Column reordering is supported only through the live footer block patch path,
  where the visible column data and matching `column-1/2/3` slot payloads move
  together as one atomic contract. Static previews keep those controls
  read-only.
- Newsletter remains composition-only: use an existing Newsletter widget in a
  footer slot instead of storing submission config in Footer JSON.
- The Utility strip owns bounded read-only `address` / `phone` / `email`
  presentation and an optional anchor-only back-to-top action.

### Advanced
- Technical-only scope.
- Layout tokens:
  - columns alignment
  - legal row alignment
  - max width
  - column gap
  - horizontal padding
  - column breakpoint
  - section vertical padding
- Content/style editing is intentionally excluded from Advanced.
- Footer keeps one labeled control per line in Advanced.

## Runtime behavior notes

- Column count is normalized by variant:
  - `columns-2` -> 2 columns
  - `columns-3` -> 3 columns
  - `minimal` -> the first column remains the data source for inline links, but
    runtime renders a dedicated compact row instead of a one-column grid.
- Footer uses deterministic fallback columns when payload is incomplete.
- Slot content is rendered in column regions and bottom strip with nested widget
  support.
- Footer contact fields are read-only only:
  - `address` renders as plain text,
  - `phone` renders only when it can be normalized to a safe `tel:` href,
  - `email` renders only when it can be normalized to a safe `mailto:` href.
- Back-to-top renders only when enabled, uses `href="#top"`, and does not add
  JavaScript-only scroll behavior.
- Footer landmark naming:
  - uses `aria-labelledby` when visible brand text exists,
  - otherwise falls back to `aria-label="Site footer"`.
- Column titles render as headings.
- Social links render icon buttons with accessible names and safe external-link
  attributes.
- Privacy/Terms labels are configurable and fallback to the current defaults
  when the user leaves labels empty.
- `legal.enabled` and `socialEnabled` hide runtime output without deleting the
  stored data.
- Empty legal/social wrappers are omitted from public output.
- Footer column/legal links support bounded target controls (`_self` / `_blank`)
  with `noopener noreferrer` when appropriate.
- Runtime style/layout fields are additive and backward-compatible:
  - `layout.align`, `layout.legalAlign`, `layout.maxWidth`,
    `layout.columnGap`, `layout.columnBreakpoint`, `layout.paddingX`,
    `layout.sectionPaddingY`
  - `style.surfaceColor`, `style.borderColor`, `style.borderTopWidth`,
    `style.textColor`, `style.headingColor`, `style.linkColor`,
    `style.legalTextColor`, `style.socialColor`, `style.fontSize`,
    `style.headingTransform`, `style.linkHoverColor`,
    `style.linkActiveColor`, `style.linkUnderline`,
    `style.linkFontWeight`, `style.linkLetterSpacing`

## Social Platforms

- Known icon-backed types:
  `linkedin`, `twitter`, `x`, `github`, `youtube`, `facebook`, `instagram`,
  `tiktok`, `discord`, `pinterest`, `mastodon`, `twitch`, `snapchat`
- `custom`
  Uses a plain-text accessible label and a safe generic icon fallback.

## Clear Controls

- Footer color fields now use the landed shared clear/reset + color-picker
  implementation.
- Clearing `style.surfaceColor` removes the forced footer background color from
  runtime output.

## Data model (summary)

```json
{
  "variant": "columns-3",
  "columns": [
    {
      "title": "Company",
      "links": [
        { "label": "About", "href": "/about", "target": "_self" }
      ]
    }
  ],
  "brand": {
    "logoText": "Coderso",
    "tagline": "Build confidently with modular content.",
    "logoUrl": "/media/footer-logo.svg",
    "logoAlt": "Coderso logo"
  },
  "legal": {
    "enabled": true,
    "copyright": "© 2026 Coderso",
    "privacy": "/privacy",
    "privacyLabel": "Privacy",
    "privacyTarget": "_blank",
    "terms": "/terms",
    "termsLabel": "Terms",
    "termsTarget": "_self"
  },
  "contact": {
    "address": "123 Market Street",
    "phone": "+1 415 555 0100",
    "email": "hello@example.com"
  },
  "backToTop": {
    "enabled": true,
    "label": "Back to top"
  },
  "socialEnabled": true,
  "social": [
    { "type": "linkedin", "href": "https://linkedin.com/company/coderso" },
    { "type": "custom", "href": "/community", "label": "Community" }
  ],
  "layout": {
    "align": "left",
    "legalAlign": "right",
    "maxWidth": "6xl",
    "columnGap": "6",
    "columnBreakpoint": "md",
    "paddingX": "6",
    "sectionPaddingY": "10"
  },
  "style": {
    "surfaceColor": "#ffffff",
    "borderColor": "#e2e8f0",
    "borderTopWidth": "1",
    "textColor": "#0f172a",
    "headingColor": "#0f172a",
    "linkColor": "#334155",
    "legalTextColor": "#334155",
    "socialColor": "#0f172a",
    "fontSize": "sm",
    "headingTransform": "uppercase",
    "linkHoverColor": "#2563eb",
    "linkActiveColor": "var(--color-primary)",
    "linkUnderline": "hover",
    "linkFontWeight": "medium",
    "linkLetterSpacing": "normal"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `footerEditorContract` with `version: 2`.
- Contract target: Wizard seeds footer columns, brand, legal, and social basics;
  Visual owns all daily link/contact/social/content and presentation controls;
  Advanced is read-only runtime diagnostics.
- Slot ID copy and writable Advanced layout controls are routed to
  `TASK-336-19`.
