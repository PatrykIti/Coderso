# Newsletter Widget (v1)

## Purpose

Lead capture via a simple newsletter signup form.

## Widget ID

`newsletter`

## Variants (v1)

- `inline`: input + button on one row when space allows
- `stacked`: input above button
- `minimal`: compact title + input + button, no description

## Editor Modes (current after TASK-050-10-01)

### Wizard
- Newsletter style (`inline` / `stacked` / `minimal`)
- Title + description
- Button label
- Consent checkbox baseline (enabled + label)

### Visual (baseline parity in 10-01)
- Placeholder
- Success message
- Consent controls (enabled, label, required)
- Style baseline (spacing, alignment, background)

### Advanced (broad in 10-01)
- Integration mode (`action-url` / `webhook`)
- Action URL + webhook ID fields
- Consent required toggle
- Style fallback controls

Note:
- Section-based Visual IA and technical-only Advanced boundaries are planned
  for `TASK-050-10-02`.

## Runtime Behavior Notes

- Invalid or unknown variant falls back to `inline`.
- `minimal` variant hides description text.
- Consent checkbox renders only when `consent.enabled = true` and label is set.
- Integration mode is normalized:
  - `webhook` when webhook ID is present and URL is empty,
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
