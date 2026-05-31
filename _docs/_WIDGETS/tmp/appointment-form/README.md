# Appointment Form Research Cards

Public-write/security note: appointment submissions are public writes. CAPTCHA,
nonce, HMAC/signature checks, provider credentials, and rate limits are
backend-owned.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| React Hook Form | https://react-hook-form.com/get-started | open-source | MIT package; verify. | Structured form validation with errors, disabled submit, and default values. | `fields`, `validation`, `errorCopy`, `submit.loadingLabel`. | Keep | Summarize behavior only. |
| React Hook Form advanced | https://react-hook-form.com/advanced-usage | open-source | MIT package; verify. | Multi-step and controlled-field form flows. | `layout.mode`, `steps`, `conditionalFields`. | Adapt | Summarize only. |
| Cal.com routing form | https://cal.com/docs/platform/atoms/routing-form | docs-example | Cal.com docs/terms; verify. | Intake questions route to event types/booking flows. | `routing.enabled`, `questions`, `eventTypeId`. | Adapt | Summarize only. |
| Typeform embed | https://www.typeform.com/developers/embed/ | docs-example | Typeform terms; embed reference. | Conversational appointment/intake form in popup or inline embed. | `displayMode`, `embedId`, `completionCopy`. | Adapt | Summarize only. |
| Tally embed | https://tally.so/help/how-to-embed-a-tally-form | docs-example | Tally terms; embed reference. | Simple embeddable appointment request form. | `embedId`, `height`, `hiddenFields`. | Adapt | Summarize only. |
| Flowbite form layouts | https://flowbite.com/docs/forms/input-field/ | docs-example | MIT core; verify docs terms. | Labeled inputs, helper/error text, sizes. | `fields.showLabels`, `inputSize`, `helperText`. | Adapt | Summarize only. |
| daisyUI form controls | https://daisyui.com/components/input/ | open-source | MIT package; verify. | Simple controls with sizes, validation states, and labels. | `inputSize`, `style.variant`, `requiredIndicator`. | Adapt | Summarize only. |
| Preline form layouts | https://preline.co/docs/input.html | docs-example | Terms require verification. | Dense field layouts and validation state affordances. | `layout.columns`, `validationStyle`, `spacing`. | Adapt | Summarize only. |
| Tailwind UI contact forms | https://tailwindcss.com/plus/ui-blocks/marketing/sections/contact-sections | premium-reference | Paid reference only. | Appointment/contact form sections with copy and field groups. | `title`, `description`, `layout.mode`, `fieldGroups`. | Adapt | Reference UX only. |
| Mailchimp profile/update forms | https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/ | docs-example | API docs/terms apply. | Backend-owned contact/profile submission pattern. | `integration.mode`, `mergeFields`, `successCopy`. | Reject | Summarize only; not appointment-specific. |
