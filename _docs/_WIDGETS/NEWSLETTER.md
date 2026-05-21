# Newsletter Widget (v2)

## Purpose

Lead capture through a bounded newsletter signup surface that can either:

- stay static until an external safe target is configured, or
- bind to the shared Coderso Forms runtime for public-write handling.

## Widget ID

`newsletter`

## Variants

- `inline`: input and CTA share a row when width allows; mobile still stacks.
- `stacked`: input sits above the CTA on every viewport.
- `minimal`: compact signup; description remains saved but is not rendered.

## Editor Modes

### Wizard

- Read-only layout summary with a handoff to Visual for variant selection.
- Title, description, button label, and baseline consent copy.
- Minimal warning when description is hidden by the selected variant.

### Visual

Sections:

1. Variant and form structure
2. Content and copy
3. Form semantics and consent
4. Submission runtime
5. Integration target
6. Colors and emphasis
7. Spacing and alignment

Notes:

- Newsletter owns variant selection in Visual
  (`visualOwnsVariantSelection = true`).
- Mobile behavior is documented directly on the variant cards.
- Success preview is local UI state only and does not persist a fake submitted
  state into widget JSON.

### Advanced

- Transport diagnostics
- Raw integration metadata
- Normalization action

## Runtime Contract

- Unknown variants normalize to `inline`.
- `resolveNewsletterSpacing()` explicitly accepts `none | sm | md | lg | xl`.
- The form always renders a stable email `name`, `id`, label contract, and
  `autocomplete="email"`.
- Email, first-name, and consent field names are normalized to unique bounded
  names before runtime rendering so shared submit serialization cannot
  overwrite earlier field values.
- Consent renders inside the `<form>` and submits a bounded checkbox field only
  when consent is enabled and labeled.
- Static mode never silently submits to the current page.
- Valid Forms-runtime bindings reuse `POST /forms/:id/submissions`, shared nonce
  handling, shared CAPTCHA/runtime script markers, loading state, success state,
  error state, and redirect behavior returned by the bound Form owner.
- Invalid or incomplete bindings degrade to a non-submitting fallback with
  explicit diagnostics in admin preview and a user-facing disconnected message
  on the public site.
- Page-builder preview can hydrate the bound Form contract without persisting
  runtime secrets into widget JSON; submit stays preview-only there until the
  public runtime injects nonce/CAPTCHA markers.
- A native static `action-url` must be a safe external HTTPS target. Coderso
  `/forms/:id/submissions` routes are runtime-owned and require
  `submission.mode = "forms-runtime"`.
- Webhook mode stores only a safe identifier in widget data. It does not invent
  a widget-local delivery framework.
- When `submission.analyticsEvent` is configured and the shared Forms runtime
  confirms success, Newsletter dispatches a bounded browser `CustomEvent`
  with that allowlisted name instead of executing arbitrary tracking scripts.

## Bounded Field Model

- Base email field is always present and required.
- Optional `firstName` can be enabled with bounded label, placeholder, field
  name, and `required` state.
- Bound Forms-runtime compatibility requires matching field names/types for:
  - email
  - first name, when enabled
  - consent, when enabled
- If the bound Form marks a rendered field as required, Newsletter must also
  require it before the binding is treated as ready.

## Style Contract

- `style.spacing`: `none | sm | md | lg | xl`
- `style.alignment`: `start | center | end`
- `style.width`: `narrow | default | wide | full`
- `style.background`: bounded clearable color
- `style.textColor`: bounded clearable color
- `style.buttonBackground`: bounded clearable color
- `style.buttonTextColor`: bounded clearable color

Contrast guidance is advisory only. It highlights obvious low-contrast
combinations for hex/rgb values and reports `unknown` for theme tokens or
transparent/inherited surfaces.

## Double Opt-In Boundary

- Newsletter supports bounded double opt-in copy through `optIn.mode` and
  `optIn.confirmationCopy`.
- In this wave, enforcement remains provider-owned only.
- No Coderso-owned Newsletter confirmation flow, provider secrets, or backend
  opt-in automation are stored in widget JSON.

## Deterministic Markers

The renderer emits bounded data markers including:

- `data-newsletter-variant`
- `data-newsletter-alignment`
- `data-newsletter-spacing`
- `data-newsletter-width`
- `data-newsletter-integration-mode`
- `data-newsletter-action-status`
- `data-newsletter-submit-ready`
- `data-newsletter-submission-mode`
- `data-newsletter-consent-required`
- `data-newsletter-opt-in`
- `data-newsletter-first-name-enabled`
- `data-newsletter-analytics-event` when configured

## Data Model (summary)

```json
{
  "variant": "inline",
  "title": "Join our newsletter",
  "description": "Get the latest updates straight to your inbox.",
  "placeholder": "you@example.com",
  "form": {
    "emailFieldName": "email",
    "emailLabel": "Email address",
    "showEmailLabel": false,
    "consentFieldName": "consent",
    "firstName": {
      "enabled": false,
      "label": "First name",
      "placeholder": "Your first name",
      "fieldName": "first_name",
      "required": false
    }
  },
  "consent": {
    "enabled": true,
    "label": "I agree to receive updates.",
    "required": false
  },
  "submit": {
    "label": "Subscribe",
    "successMessage": "Thanks for joining!"
  },
  "stateCopy": {
    "loadingMessage": "Sending...",
    "successMessage": "Thanks for joining!",
    "errorMessage": "Unable to submit the form. Please try again."
  },
  "integration": {
    "mode": "action-url",
    "method": "post",
    "actionUrl": "",
    "webhookId": ""
  },
  "submission": {
    "mode": "static",
    "formId": "",
    "analyticsEvent": "",
    "successBehavior": "show-message-hide-form"
  },
  "optIn": {
    "mode": "single",
    "confirmationCopy": "Please check your inbox to confirm your subscription.",
    "enforcement": "provider-owned"
  },
  "style": {
    "spacing": "md",
    "alignment": "start",
    "width": "default",
    "background": "transparent",
    "textColor": "",
    "buttonBackground": "",
    "buttonTextColor": ""
  }
}
```

## Responsive Variant Decision

- `TASK-319` closed `BF-15` as current-state sufficient instead of adding a new
  breakpoint-owned variant field.
- `inline` and `minimal` already render as stacked mobile layouts and only
  switch to a row from the `sm` breakpoint upward; `stacked` remains vertical on
  every viewport.
- Newsletter therefore keeps a scalar `variant` contract. No
  `mobileVariant`/per-breakpoint override field is part of the schema.
