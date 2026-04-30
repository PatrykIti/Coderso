# Hero Widget (v1)

## Purpose

Top-of-page section with main value proposition, CTA, and optional media.

## Widget ID

`hero`

## Variants (v1)

- `centered`: single-column copy + CTA stack
- `split` (`media-right`): text left, media right
- `media-left`: media left, text right

## Slots

- `content`: additional blocks rendered below CTA area

## Mode Responsibilities

### Wizard

- Minimal onboarding for goal, layout, media type, and CTA mode.
- Fast defaults only.

### Visual

Primary day-to-day editing surface with section-based IA:
1. Variant and Presets
2. Content
3. CTA
4. Media
5. Typography
6. Colors and Borders
7. Background

Variant presets are persisted per user in `user_settings` key:
`widgets.hero.presets`.

### Advanced

Technical controls only (no duplicated content/style editing):
- hero layout tokens: align, maxWidth, contentWidth
- internal spacing: paddingTop, paddingBottom
- background raw values
- responsive toggle: `hideMediaOnMobile`

## Media Behavior

- `centered + image`: selected media is rendered as hero background.
- `centered + video`: no inline video output; use `split` or `media-left`.
- `split/media-left`: media frame renders image/video inline.

## Clear Controls

- `background.color`, `background.gradient`, and media `overlay` can be cleared
  from the editor; clear removes the nested key instead of saving
  `transparent` or an empty string.
- `style.primaryButtonBg`, `style.secondaryButtonBg`, and related CTA color
  fields are clearable without changing CTA labels or links.
- A deliberate user-entered `transparent` value remains valid authored data and
  is not treated as the clear state.

## Data Model (summary)

```json
{
  "variant": "centered",
  "headline": "string",
  "subhead": "string",
  "body": "string",
  "primaryCta": { "label": "string", "href": "string" },
  "secondaryCta": { "label": "string", "href": "string" },
  "media": {
    "type": "image",
    "source": "library",
    "assetId": "string",
    "src": "string",
    "alt": "string",
    "ratio": "16:9",
    "overlay": "rgba(0,0,0,0.2)"
  },
  "layout": { "align": "center", "maxWidth": "xl", "contentWidth": "lg" },
  "spacing": { "paddingTop": "xl", "paddingBottom": "xl" },
  "style": {
    "headlineSize": "3xl",
    "subheadSize": "xl",
    "bodySize": "base",
    "textColor": "#111827",
    "borderColor": "#d1d5db",
    "borderWidth": "1",
    "borderRadius": "3xl",
    "primaryButtonBg": "#2563eb",
    "primaryButtonText": "#ffffff",
    "secondaryButtonBorder": "#d1d5db"
  },
  "background": { "color": "#f8fafc", "gradient": "linear-gradient(135deg, #eef2ff, #ffffff)", "image": "" },
  "responsive": { "hideMediaOnMobile": false }
}
```
