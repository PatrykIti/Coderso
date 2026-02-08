# Newsletter Widget (v1)

## Purpose

Lead capture via a newsletter signup form.

## Widget ID

`newsletter`

## Variants (v1)

- `inline`: input + button on one row when width allows
- `stacked`: input above button
- `minimal`: compact heading + form, description hidden

## Editor Modes (current after TASK-050-10-02)

### Wizard (minimal onboarding)
- Newsletter style (`inline` / `stacked` / `minimal`)
- Title + description
- Button label
- Consent baseline (enabled + label)

### Visual (primary editing mode)
Sections:
1. Variant and form structure
2. Content and copy
3. Consent and submit behavior
4. Integration target
5. Colors and emphasis
6. Spacing and alignment

Notes:
- Newsletter owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Integration fields are conditional by selected integration mode.

### Advanced (technical-only)
- Layout tokens (spacing + alignment)
- Raw integration metadata (mode + raw action/webhook fields)
- Normalization and fallback diagnostics/actions

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `inline`.
- `minimal` variant hides description text.
- Consent checkbox renders only when `consent.enabled = true` and label exists.
- Integration mode is normalized:
  - `webhook` when webhook ID exists and URL is empty,
  - otherwise `action-url`.
- Renderer emits deterministic data markers:
  - `data-newsletter-variant`
  - `data-newsletter-alignment`
  - `data-newsletter-spacing`
  - `data-newsletter-integration-mode`
  - `data-newsletter-consent-required`

## Data Model (summary)

```json
{
  "variant": "inline",
  "title": "Join our newsletter",
  "description": "Get the latest updates straight to your inbox.",
  "placeholder": "you@example.com",
  "consent": {
    "enabled": true,
    "label": "I agree to receive updates.",
    "required": false
  },
  "submit": {
    "label": "Subscribe",
    "successMessage": "Thanks for joining!"
  },
  "integration": {
    "mode": "action-url",
    "actionUrl": "",
    "webhookId": ""
  },
  "style": {
    "spacing": "md",
    "alignment": "start",
    "background": "transparent"
  }
}
```
