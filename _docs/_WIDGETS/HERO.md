# Hero Widget (v1)

## Purpose

Top-of-page section with main value proposition, CTA, and optional media.

## Widget ID

`hero`

## Variants (v1)

- `centered`: single-column copy + CTA stack
- `split` (`media-right`): text left, media right
- `media-left`: media left, text right
- `media-center`: centered copy with inline showcase media below

## Slots

- `content`: additional blocks rendered below CTA area

## Mode Responsibilities

### Wizard

- Minimal onboarding for goal, layout, media type, and CTA mode.
- Fast defaults only.

### Visual

Primary day-to-day editing surface with section-based IA:
1. Variant and Presets
2. Badge and headline
3. CTA
4. Rich copy and social proof
5. Media
6. Typography
7. Appearance
8. Colors and Borders
9. Background

Variant presets are persisted per user in `user_settings` key:
`widgets.hero.presets`.

### Advanced

Technical controls only (no duplicated content/style editing):
- hero layout tokens: align, maxWidth, contentWidth, height, bleed
- internal spacing: paddingTop, paddingBottom
- background raw values
- responsive toggle: `hideMediaOnMobile`

## Media Behavior

- `centered + image`: selected media is rendered as hero background.
- `centered + video`: no inline video output; use `split`, `media-left`, or
  `media-center`.
- `split`, `media-left`, and `media-center`: media frame renders image/video
  inline.
- Visual mode keeps Media authoring available in `centered` so authors can
  still change or clear background media while hiding inline-frame-only border
  controls.
- Video media supports `posterSrc`, `title`, and `description` for both inline
  and background video output.
- Current image loading policy is deterministic and Hero-specific:
  `centered`, `split`, and `media-center` use eager/high-priority image hints;
  `media-left` stays lazy/auto. True `srcset`/`picture` variants remain deferred
  until a separate media-owner task exposes generated image variants.

## Rich Copy And Social Proof

- `richHeadline` and `richBody` accept bounded sanitized HTML through the shared
  widget rich-text sanitizer exported from `richTextSection`.
- Plain `headline` / `body` remain the fallback when rich-copy fields are empty.
- `socialProof` is optional and bounded: `rating`, `reviewCount`, `label`, and
  up to five avatar rows with `src` and optional `alt`.

## Appearance And Contrast

- Hero appearance tokens are bounded to fixed maps:
  `cardShadow`, `mediaShadow`, `buttonShadow`, `fontFamily`,
  `headlineWeight`, `bodyWeight`, and `motion`.
- Motion presets are reduced-motion safe and currently support `none`,
  `fade-in`, and `slide-up`.
- Contrast guidance reuses the shared editor advisory helper and only gives a
  concrete warning/pass result for solid color combinations. Gradient, image,
  transparent, and token-based surfaces intentionally fall back to `unknown`.

## Presets

- Presets are user-scoped (`widgets.hero.presets`) and capped at 24 entries.
- Visual mode supports create, apply, update, delete-with-confirmation,
  search, sort, JSON export, and JSON import.
- Import rejects malformed JSON, duplicate names, invalid variants, and
  over-limit payloads. When nested Hero data is normalized during import, the
  editor surfaces a visible warning instead of silently succeeding.

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
  "richHeadline": "string",
  "richBody": "string",
  "primaryCta": { "label": "string", "href": "string" },
  "secondaryCta": { "label": "string", "href": "string" },
  "media": {
    "type": "image",
    "source": "library",
    "assetId": "string",
    "src": "string",
    "alt": "string",
    "posterSource": "library",
    "posterAssetId": "string",
    "posterSrc": "string",
    "title": "string",
    "description": "string",
    "ratio": "16:9",
    "overlay": "rgba(0,0,0,0.2)"
  },
  "socialProof": {
    "enabled": true,
    "rating": "4.9/5",
    "reviewCount": "2,000+ reviews",
    "label": "Trusted by product teams.",
    "avatars": [{ "src": "/avatars/reviewer.jpg", "alt": "Reviewer avatar" }]
  },
  "layout": {
    "align": "center",
    "maxWidth": "xl",
    "contentWidth": "lg",
    "height": "auto",
    "bleed": "contained"
  },
  "spacing": { "paddingTop": "xl", "paddingBottom": "xl" },
  "style": {
    "headlineSize": "3xl",
    "subheadSize": "xl",
    "bodySize": "base",
    "textColor": "#111827",
    "borderColor": "#d1d5db",
    "borderWidth": "1",
    "borderRadius": "3xl",
    "cardShadow": "none",
    "primaryButtonBg": "#2563eb",
    "primaryButtonText": "#ffffff",
    "secondaryButtonBorder": "#d1d5db",
    "mediaShadow": "none",
    "buttonShadow": "none",
    "fontFamily": "inherit",
    "headlineWeight": "semibold",
    "bodyWeight": "normal",
    "motion": "none"
  },
  "background": {
    "color": "#f8fafc",
    "gradient": "linear-gradient(135deg, #eef2ff, #ffffff)",
    "image": "",
    "media": {
      "type": "video",
      "source": "external",
      "src": "https://cdn.example.com/hero.mp4",
      "posterSrc": "/hero-poster.jpg",
      "title": "Ambient background video",
      "description": "Decorative looping background video"
    }
  },
  "responsive": { "hideMediaOnMobile": false }
}
```
