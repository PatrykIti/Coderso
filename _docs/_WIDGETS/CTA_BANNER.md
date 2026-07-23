# CTA Banner Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Compact conversion strip between sections with clear CTA actions.

## Widget ID

`cta-banner`

## Variants

- `centered`: centered copy and CTA actions
- `split`: copy on the left and actions on the right
- `with-badge`: framed badge treatment above the title

## Editor Modes (current after TASK-263)

### Wizard

- Read-only current layout summary
- Read-only headline summary

### Visual

Sections:

1. Variant and layout structure
2. Content copy
3. Actions
4. Colors and Borders
5. Background and motion

Notes:

- CTA Banner owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Shared block full-width stays in the block Layout panel (`WidgetBlock.layout.container`).
  CTA Banner no longer hardcodes an inner `max-w-6xl`.
- Generic Visual variant selector is suppressed.
- Background images are selected through Media Library. Legacy external
  background URLs stay as read-only replace/clear state and are not editable as
  raw URL text in Visual.
- CTA destinations are selected through the shared published-page destination
  picker in Wizard/Visual. Legacy custom/hash/external `href` values stay
  backward-compatible as read-only replace/clear state instead of raw URL text
  inputs.
- Colors now follow the same practical Hero model: palette presets, swatch-only
  field editing, theme-default states, bounded radius controls, transparent
  affordances where relevant, and a contrast guidance block.
- With Badge shows explicit Visual guidance and now renders through a distinct
  framed `badge-panel` presentation instead of sharing Centered output.
- Action fields show inline guidance when an enabled CTA has a label but no
  destination, because that CTA renders as disabled until a safe destination is
  selected or the label is cleared.

### Advanced

- Read-only style diagnostics for resolved color/border state.
- Background gradient diagnostics use `Configured` / `Not configured` state
  labels instead of exposing the raw CSS gradient string; Visual owns gradient
  editing and runtime rendering uses the normalized widget background contract.
- Confirm-gated `Normalize now` and `Reset to defaults` support actions.
- Human runtime summary for variant, configured actions, background media, and motion.
- Advanced does not expose raw CTA JSON or editable color-token text fields.
- `Normalize now` and `Reset to defaults` are confirm-gated and show inline
  completion feedback after they run.

## Runtime Behavior Notes

- Invalid or unknown variants fall back to `centered`.
- `with-badge` resolves to a distinct `badge-panel` presentation with
  deterministic `data-cta-banner-presentation` and
  `data-cta-banner-badge-state` markers.
- The renderer uses `blockId` for `aria-labelledby` and falls back to
  `aria-label="Call to action"` when no title is present.
- Badge markup renders only when trimmed badge copy is non-empty.
- Description visibility is controlled by `content.showDescription`; the support
  line follows the configured `style.text` path with reduced emphasis.
- Primary, secondary, and tertiary CTA links render only when:
  - `enabled !== false`
  - label text is non-empty
  - the destination resolves through the safe CTA href allowlist
- If an enabled CTA has a label but no safe destination, the renderer outputs a
  disabled CTA hint with `data-cta-button-state="missing-destination"` instead
  of silently dropping the action. Valid actions keep
  `data-cta-button-state="active"`.
- `openInNewTab` derives safe `target="_blank"` and `rel="noopener noreferrer"`
  through the shared widget safe-link helper.
- Button radius and size are CTA-owned controls; when not configured, existing
  saved pages keep the legacy `rounded-md` / `text-sm` behavior.
- Background color, gradient, Media Library image, and motion are optional and
  bounded.
- The renderer emits deterministic markers:
  - `data-cta-banner-variant`
  - `data-cta-banner-padding`
  - `data-cta-banner-border-width`
  - `data-cta-banner-motion`
  - `data-cta-button`

## Clear Controls

- `style.text`, `style.badgeBackground`, `style.badgeText`,
  `style.primaryButtonBg`, `style.primaryButtonText`,
  `style.secondaryButtonBg`, and `style.secondaryButtonText` are clearable.
- `background.color` and `background.gradient` are clearable.
- Clear removes the configured raw override and does not introduce
  `transparent` or an empty string as a new off-state sentinel. Normalized/runtime
  data still resolves through CTA Banner's historical style/background/button
  defaults when an override is absent.
- The eleven direct `style` colors (`background`, `text`, `border`,
  `badgeBackground`, `badgeText`, and both primary/secondary button
  background/text/border triples) plus `background.color` use the shared
  `inherited-render` profile. Canonical `currentColor` and `inherit` are valid;
  invalid input is omitted rather than passed through raw.
- `background.gradient` remains a separate CTA-owned compatibility grammar with
  a 96-code-unit original-input cap. It accepts exact lowercase
  `linear-gradient` and `deg`, one optional-minus signed integer or decimal
  angle, exactly two `#`-prefixed 3-through-8-digit hex stops, and ASCII U+0020
  at whitespace positions. Only outer ASCII spaces are trimmed; accepted inner
  spacing, angle spelling, hex width (including legacy 5/7), and hex case remain
  byte-identical. Tabs, newlines, non-ASCII whitespace, extra layers/stops,
  unsafe functions, and malformed input reject without raw fallback.
- CTA's structural schema pattern reuses that local grammar but is not semantic
  authority. TASK-541 adds no defaults: raw optional overrides stay sparse, while
  existing normalized fallback values remain byte-compatible.

## Data Model (summary)

```json
{
  "content": {
    "badge": "Limited offer",
    "title": "Ready to launch your next campaign?",
    "description": "Use reusable sections and publish faster with consistent design.",
    "showDescription": true
  },
  "actions": {
    "primaryCta": {
      "label": "Get started",
      "href": "#",
      "enabled": true,
      "openInNewTab": false,
      "icon": "none"
    },
    "secondaryCta": {
      "label": "Contact sales",
      "href": "#",
      "enabled": true,
      "openInNewTab": false,
      "icon": "none"
    },
    "tertiaryCta": {
      "label": "",
      "href": "",
      "enabled": false,
      "openInNewTab": false,
      "icon": "none"
    }
  },
  "style": {
    "background": "var(--color-surface)",
    "text": "var(--color-text)",
    "border": "var(--color-border)",
    "borderWidth": "1",
    "radius": "xl",
    "padding": "md",
    "badgeBackground": "var(--color-primary)",
    "badgeText": "var(--color-bg)",
    "primaryButtonBg": "var(--color-primary)",
    "primaryButtonText": "var(--color-bg)",
    "primaryButtonBorder": "transparent",
    "secondaryButtonBg": "transparent",
    "secondaryButtonText": "var(--color-text)",
    "secondaryButtonBorder": "var(--color-border)",
    "primaryButtonSize": "md",
    "secondaryButtonSize": "md"
  },
  "background": {
    "color": "var(--color-surface)",
    "gradient": "linear-gradient(135deg, #0f172a, #475569)",
    "media": {
      "type": "image",
      "source": "external",
      "assetId": "asset-1",
      "src": "/hero.png",
      "fit": "cover",
      "position": "center"
    }
  },
  "motion": {
    "preset": "none"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `ctaBannerEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns
  badge/body/actions/background/motion/style; Advanced is read-only runtime
  diagnostics.
- TASK-336-19 follow-up removed raw style-token Advanced controls. Advanced
  now shows read-only style diagnostics plus confirmed normalization/reset
  support actions.
- Visual color authoring uses swatch-only controls and clear actions instead of
  raw CSS token text inputs. Existing theme tokens, transparent values, and
  custom color strings remain compatible as saved custom color state that can
  be replaced or cleared without typing CSS.
