# Newsletter Research Cards

Public-write/security note: the current Coderso newsletter widget renders an
external/provider action URL and is not itself a Coderso-owned public-write
endpoint. If a future Coderso-owned signup endpoint is added, provider secrets,
CAPTCHA, nonce, HMAC/signature checks, and rate limits remain backend-owned and
must never be stored in widget data.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Mailchimp embedded forms | https://mailchimp.com/help/add-a-signup-form-to-your-website/ | docs-example | Mailchimp docs/terms; provider integration reference only. | Email field, audience action, consent, and success/failure messaging. | `integration.mode`, `emailPlaceholder`, `consent`, `submit.successMessage`. | Adapt | Summarize behavior; no copied embed code. |
| Mailchimp marketing API | https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/ | docs-example | API docs; terms apply. | Backend list subscription with status and merge fields. | `integration.provider`, `mergeFields`, `doubleOptIn`. | Adapt | Summarize only; secrets backend-owned. |
| React Hook Form examples | https://react-hook-form.com/get-started | open-source | MIT package; verify. | Lightweight validation, errors, and submit state. | `validation.emailRequired`, `errorCopy`, `submit.loadingLabel`. | Keep | Summarize behavior only. |
| Typeform embed | https://www.typeform.com/developers/embed/ | docs-example | Typeform terms; embed reference. | Embedded form/modal with provider-managed flow. | `integration.mode: embed`, `embedId`, `displayMode`. | Adapt | Summarize only; no copied embed code. |
| Tally embed | https://tally.so/help/how-to-embed-a-tally-form | docs-example | Tally terms; embed reference. | Inline/popup embed with hidden fields. | `integration.mode: embed`, `height`, `hiddenFields`. | Adapt | Summarize behavior; provider config backend-owned. |
| HyperUI newsletter | https://www.hyperui.dev/components/marketing/newsletter-sections | open-source | MIT library; verify. | Newsletter sections with inline/stacked input and supporting copy. | `variant`, `title`, `description`, `style.alignment`. | Keep | Summarize layout only. |
| Tailwind UI newsletter | https://tailwindcss.com/plus/ui-blocks/marketing/sections/newsletter-sections | premium-reference | Paid reference only. | Rich newsletter sections with background treatments and inline forms. | `variant`, `style.background`, `layout.width`. | Adapt | Reference UX only. |
| Flowbite newsletter form | https://flowbite.com/docs/forms/input-field/ | docs-example | MIT core; verify docs terms. | Input, helper text, validation, and button grouping. | `placeholder`, `helperText`, `inputSize`, `buttonStyle`. | Adapt | Summarize only. |
| daisyUI join/input | https://daisyui.com/components/join/ | open-source | MIT package; verify. | Joined input/button controls for compact signup. | `variant: inline`, `inputSize`, `buttonAttached`. | Adapt | Summarize only. |
| Preline newsletter examples | https://preline.co/examples/newsletter-signup.html | docs-example | Terms require verification. | Newsletter CTA with email field, consent note, and background section. | `consent.label`, `style.surface`, `copy.privacyNote`. | Keep | Summarize only. |
