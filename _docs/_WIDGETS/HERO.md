# Hero Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

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

- One-time setup only: goal preset action plus read-only headline / primary CTA
  summary.
- Wizard intentionally does not own subhead/body, secondary CTA, media,
  background, style, layout spacing, or responsive behavior. Those are Visual
  edits.

### Visual

Primary day-to-day editing surface with section-based IA:
1. Variant and Presets
2. Badge and headline
3. CTA
4. Rich copy and social proof
5. Media
6. Layout and spacing
7. Typography
8. Appearance
9. Colors and Borders
10. Background

Visual owns all public-facing and presentation fields: copy, badges, CTA copy
and button sizes, media, background media/overlay, typography, appearance,
colors, borders, alignment, width, height, bleed, spacing, and mobile media
visibility.

CTA and badge destinations are authored through the shared page-first
destination picker. Saved custom/hash/external destinations remain
replace-or-clear compatible instead of editable raw URL text.

Switching CTA layout to Single still stores a true single-CTA Hero by removing
`secondaryCta` from the saved value. During the same Visual editing session,
switching back to Dual restores the last useful secondary CTA, or the default
secondary CTA when no authored secondary action exists, so Dual mode always
returns with a renderable second action.

Variant presets are persisted per user in `user_settings` key:
`widgets.hero.presets`.
The Visual preset UI supports local create/apply/update/delete plus search and
sort. It does not expose JSON import/export in the normal editor surface.

### Advanced

Read-only diagnostics only:
- resolved layout, spacing, responsive, and variant summaries
- resolved typography, color, button, border, and shadow token summaries
- media/background media diagnostics
- safe-link and accessibility diagnostics
- human runtime summary without raw JSON snapshots
- editor contract summary

Advanced must not duplicate Visual as a second design panel.

## Media Behavior

- `centered + image`: selected media is rendered as hero background.
- `centered + video`: no inline video output; use `split`, `media-left`, or
  `media-center`.
- `split`, `media-left`, and `media-center`: media frame renders image/video
  inline.
- Explicit background image overlays render as valid layered
  `linear-gradient(color, color), ... , url(...)` background-image output, so
  overlays do not invalidate or remove the image on fresh public render.
- Visual mode keeps Media authoring available in `centered` so authors can
  still change or clear background media while hiding inline-frame-only border
  controls.
- Video media supports `posterSrc`, `title`, and `description` for both inline
  and background video output.
- Visual media and poster authoring now uses Media Library pickers only.
  Existing external media/poster URLs remain runtime-compatible and appear in
  Visual as replace-or-clear saved external state instead of editable URL text.
- Current image loading policy is deterministic and Hero-specific:
  `centered`, `split`, and `media-center` use eager/high-priority image hints;
  `media-left` stays lazy/auto. True `srcset`/`picture` variants remain deferred
  until a separate media-owner task exposes generated image variants.

## Rich Copy And Social Proof

- `richHeadline` and `richBody` store bounded sanitized rich-text HTML, but
  Visual authoring uses the shared rich-text toolbar instead of raw HTML text.
- Hero rich copy keeps inline emphasis, safe links, lists, line breaks, and
  H2-H4 headings; unsupported pasted formatting is removed before publishing.
- Plain `headline` / `body` remain the fallback when rich-copy fields are empty.
- `socialProof` is optional and bounded: `rating`, `reviewCount`, `label`, and
  up to five avatar rows with `source`, `assetId`, `src`, and optional `alt`.
- Social proof avatar authoring uses Media Library pickers. Existing external
  avatar URLs remain runtime-compatible and appear in Visual as
  replace-or-clear saved external state instead of editable URL text.

## Appearance And Contrast

- Hero appearance tokens are bounded to fixed maps:
  `cardShadow`, `mediaShadow`, `buttonShadow`, `fontFamily`,
  `headlineWeight`, `bodyWeight`, and `motion`.
- Per-field Visual color authoring uses swatch pickers, transparent actions,
  and clear actions. Section-level palette presets can bulk-apply safe explicit
  colors. Existing theme token or rgba values remain compatible as saved custom
  color state that can be replaced or cleared without typing CSS.
- Media and background overlay opacity controls preserve the saved overlay hue
  from RGBA values when only strength changes.
- Motion presets are reduced-motion safe and currently support `none`,
  `fade-in`, and `slide-up`.
- Contrast guidance reuses the shared editor advisory helper and only gives a
  concrete warning/pass result for solid color combinations. Gradient, image,
  transparent, and token-based surfaces intentionally fall back to `unknown`.

### TASK-541 retained color boundary

- Direct color properties use the canonical `inherited-render` profile:
  `style.textColor`, `style.subheadColor`, `style.bodyColor`,
  `style.borderColor`, `style.mediaBorderColor`, both primary/secondary button
  background/text/border triples, and `background.color`. Canonical
  `currentColor` and `inherit` are valid in those direct CSS properties.
- `media.overlay` and `background.media.overlay` are nested gradient stops.
  They use `inherited-render` with `allowInheritKeyword=false`, so
  `currentColor` is valid while `inherit` fails closed at
  schema/normalize/control/render boundaries.
- `background.gradient` has one Hero-owned parser capped at 320 original UTF-16
  code units. It requires an ASCII-case-insensitive `linear-gradient`, an
  unsigned integer angle in `0..360`, and exactly two shared inherited-profile
  color stops. It rejects `inherit`, extra stops/layers, malformed nesting, and
  unsafe functions, then emits canonical
  `linear-gradient(<angle>deg, <stop>, <stop>)` bytes.
- Schema patterns are structural prefilters only. Optional direct, overlay, and
  gradient values remain present-only and are never emitted raw after
  rejection.

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
- Media overlay authoring uses color and strength controls rather than raw
  `rgba(...)` text.
- Saved non-empty Hero blocks preserve an absent `secondaryCta` through widget
  default normalization. A single-CTA Hero therefore stays single after save,
  reload, and server-side validation instead of restoring the default secondary
  action.
- Visual's CTA layout selector keeps that persisted single-CTA contract while
  still restoring a useful secondary CTA when an author switches Single back to
  Dual in the editor.
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
    "avatars": [
      {
        "source": "library",
        "assetId": "media-1",
        "src": "/avatars/reviewer.jpg",
        "alt": "Reviewer avatar"
      }
    ]
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
