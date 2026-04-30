# CTA Banner Widget (v1)

## Purpose

Compact conversion strip between sections with clear CTA actions.

## Widget ID

`cta-banner`

## Variants (v1)

- `centered`: centered copy and CTA actions
- `split`: copy on left, actions on right
- `with-badge`: highlighted badge above title

## Editor Modes (current after TASK-050-12-05)

### Wizard (minimal onboarding)
- Banner layout variant
- Headline
- Primary CTA label

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Content copy
3. Actions
4. Colors and button styles
5. Border and spacing

Notes:
- CTA Banner owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Technical style tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `centered`.
- Renderer outputs deterministic markers:
  - `data-cta-banner-variant`
  - `data-cta-banner-padding`
  - `data-cta-banner-border-width`
- Buttons render only when both label and href are non-empty.

## Clear Controls

- `style.background`, `style.badgeBackground`, `style.primaryButtonBg`, and
  `style.secondaryButtonBg` are clearable. Clear removes the configured style key
  and does not save `transparent` as an off-state sentinel.
- Border/text fields and CTA link behavior remain independent of surface clear.

## Data Model (summary)

```json
{
  "content": {
    "badge": "Limited offer",
    "title": "Ready to launch your next campaign?",
    "description": "Use reusable sections and publish faster with consistent design."
  },
  "actions": {
    "primaryCta": { "label": "Get started", "href": "#" },
    "secondaryCta": { "label": "Contact sales", "href": "#" }
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
    "secondaryButtonBg": "var(--color-bg)",
    "secondaryButtonText": "var(--color-text)",
    "secondaryButtonBorder": "var(--color-border)"
  }
}
```
