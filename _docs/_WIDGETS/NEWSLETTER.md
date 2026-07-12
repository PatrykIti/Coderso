# Newsletter Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

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

- One-time read-only starter summary with a handoff to Visual for edits.
- Current title, description, button label, consent, and layout are summarized
  only; Wizard does not duplicate Visual controls after setup.
- Minimal warning when description is hidden by the selected variant.

### Visual

Sections:

1. Variant and form structure
2. Content and copy
3. Form semantics and consent
4. Submission runtime
5. Connection status
6. Colors and emphasis
7. Spacing and alignment

Notes:

- Newsletter owns variant selection in Visual
  (`visualOwnsVariantSelection = true`).
- Variant cards render disabled/read-only when the editor context does not
  provide `onVariantChange`.
- Mobile behavior is documented directly on the variant cards.
- Visual does not ask authors to type persisted field-name keys, action URLs,
  methods, webhook IDs, or analytics event names. Static mode uses safe default
  field mapping; Forms-runtime mode maps fields through the selected Form's
  field picker; older external signup service metadata is summarized read-only.
- Visual color fields are swatch-only with clear/saved-custom-color summaries;
  authors are not asked to type CSS variables, tokens, or raw color strings.
- Success preview is local UI state only and does not persist a fake submitted
  state into widget JSON.

### Advanced

- Signup readiness
- Authoring boundaries

Advanced is read-only. It reports where visitor signups go, whether an older
external connection is saved or needs support review, where authors should make
changes, and whether saved data is still compatible. It does not expose or edit
raw action URLs, webhook IDs, HTTP methods, JSON payloads, or normalization
actions.

Legacy `integration.webhookId` metadata is preserved but reported as inactive
until migrated to a Coderso Form or supported external action URL.

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
- Disconnected or otherwise non-interactive states render a non-submitting
  `div role="form"` shell with disabled controls instead of a native `<form>`,
  so browser implicit Enter submission cannot leak field values into the
  current URL.
- Valid Forms-runtime bindings reuse `POST /forms/:id/submissions`, shared nonce
  handling, shared CAPTCHA/runtime script markers, loading state, success state,
  error state, and redirect behavior returned by the bound Form owner.
- Public Forms-runtime rendering requires a non-empty projected
  `resolved.submissionNonce` before emitting native form/script markup; a
  compatible binding without the nonce remains a disabled shell.
- Invalid or incomplete bindings degrade to a non-submitting fallback with
  explicit diagnostics in admin preview and a user-facing disconnected message
  on the public site.
- Page-builder preview can hydrate the bound Form contract without persisting
  runtime secrets into widget JSON; submit stays preview-only there until the
  public runtime injects nonce/CAPTCHA markers.
- Page-builder preview projects bound Form fields through the strict Newsletter
  resolved-field schema before patching preview data.
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
  mapping, and `required` state.
- Visual field mapping is picker/read-only based: authors choose from the bound
  Coderso Form fields when Forms runtime is active; static mode uses default
  mapping unless legacy custom data already exists.
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

These four ordinary stored overrides use the shared `authoring` profile at
normalization and render boundaries. Supported literals and `var(--color-*)`
tokens canonicalize through the semantic parser; `currentColor`, `inherit`,
invalid numeric ranges, unknown functions, and unsafe fragments are rejected
without raw fallback. Schema patterns are structural guards only. TASK-541 adds
no defaults: Newsletter retains its historical normalized `transparent`
background and `""` text/button sentinels when those values are absent or
cleared, instead of rewriting old records into a new sparse representation.

Contrast guidance is advisory only. It highlights obvious low-contrast
combinations for hex/rgb values and reports `unknown` for theme tokens or
transparent/inherited surfaces.

## Double Opt-In Boundary

- Newsletter supports bounded double opt-in copy through `optIn.mode` and
  `optIn.confirmationCopy`.
- In this wave, enforcement remains provider-owned only.
- No Coderso-owned Newsletter confirmation flow, provider secrets, or backend
  opt-in automation are stored in widget JSON.

## Submit Shell Semantics

- Disconnected and otherwise non-interactive renders use a
  `div role="form" aria-disabled="true"` shell with
  `data-newsletter-native-submit="blocked"`, so browser implicit Enter submit
  has no native form target.
- Only interactive safe external `action-url` submissions and public
  Forms-runtime renders emit a native `<form>`.
- Editor preview can show a bound Forms contract with
  `data-newsletter-submit-ready="true"` while
  `data-newsletter-submit-interactive="false"` and native submit remains
  blocked; public runtime injects the nonce and bot-protection data needed to
  submit.

## Deterministic Markers

The renderer emits bounded data markers including:

- `data-newsletter-variant`
- `data-newsletter-alignment`
- `data-newsletter-spacing`
- `data-newsletter-width`
- `data-newsletter-integration-mode`
- `data-newsletter-action-status`
- `data-newsletter-submit-ready`
- `data-newsletter-submit-interactive`
- `data-newsletter-native-submit`
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

## TASK-336-18 Editor Contract

- Exports `newsletterEditorContract` with `version: 2`.
- Contract target: Wizard is one-time/read-only after setup; Visual owns
  variant, copy, field labels/mapping, consent, state copy, submission
  behavior, opt-in, and style; Advanced owns read-only signup readiness and
  authoring-boundary summaries.
- TASK-336-19 removes expired Wizard/Visual duplicate writable allowances,
  removes the Advanced normalization support action, and converts Advanced raw
  transport diagnostics into human support summaries.
- TASK-336-19 follow-up removes remaining Visual raw integration, field-key,
  analytics, and color-token authoring: field names are mapped through selected
  Form fields or shown as safe read-only defaults, analytics event names are no
  longer edited in Visual, older external signup service metadata is summarized
  without exposing editable raw values, and colors use swatches plus
  clear/saved-custom summaries.
