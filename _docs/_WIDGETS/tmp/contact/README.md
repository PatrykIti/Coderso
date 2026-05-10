# Contact Research Cards

Public-write/security note: the current Coderso contact widget rendering is
presentational and is not itself a Coderso-owned public-write endpoint. If a
future backend submission route is added, CAPTCHA, nonce, HMAC/signature checks,
provider keys, email routing, and rate limits remain backend-owned.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Tailwind UI contact sections | https://tailwindcss.com/plus/ui-blocks/marketing/sections/contact-sections | premium-reference | Paid reference only. | Contact form paired with address, email, phone, and social info. | `layout.mode`, `fields`, `contactInfo`, `socialLinks`. | Adapt | Reference UX only. |
| HyperUI contact sections | https://www.hyperui.dev/components/marketing/contact-sections | open-source | MIT library; verify. | Contact form with map/info side panel and simple fields. | `variant`, `showMap`, `fields`, `contactInfo`. | Adapt | Summarize layout only. |
| React Hook Form | https://react-hook-form.com/get-started | open-source | MIT package; verify. | Form validation with errors and submit state. | `validation`, `errorCopy`, `submit.loadingLabel`. | Keep | Summarize behavior only. |
| Flowbite contact form | https://flowbite.com/docs/forms/input-field/ | docs-example | MIT core; verify docs terms. | Labeled inputs, textarea, helper/error text. | `inputSize`, `showLabels`, `requiredIndicator`. | Adapt | Summarize only. |
| daisyUI textarea/input | https://daisyui.com/components/textarea/ | open-source | MIT package; verify. | Form controls with compact styling and validation states. | `style.variant`, `fieldSpacing`, `textareaRows`. | Adapt | Summarize only. |
| Preline contact form | https://preline.co/examples/contact-us.html | docs-example | Terms require verification. | Contact page section with form and company details. | `layout.mode`, `style.surface`, `contactInfo`. | Adapt | Summarize only. |
| Typeform contact form | https://www.typeform.com/developers/embed/ | docs-example | Typeform terms. | Conversational contact form embed. | `integration.mode: embed`, `embedId`, `displayMode`. | Adapt | Summarize only. |
| Tally contact form | https://tally.so/help/how-to-embed-a-tally-form | docs-example | Tally terms. | Lightweight embed with hidden fields and redirect/success states. | `embedId`, `hiddenFields`, `successCopy`. | Adapt | Summarize only. |
| WordPress Contact Form plugins | https://wordpress.org/plugins/tags/contact-form/ | unknown-license | Plugin licenses vary; verify individually. | Contact forms commonly combine fields, spam protection, and mail routing. | `fields`, `antiSpamNotice`, `recipientProfile`. | Adapt | Summarize product behavior only. |
| Mailchimp audience/contact profile | https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/ | docs-example | API docs/terms. | Contact/profile capture can map fields to backend list member data. | `integration.provider`, `mergeFields`, `consent`. | Reject | Summarize only; not primary contact widget behavior. |
