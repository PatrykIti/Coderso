# Form Embed Research Cards

Public-write/security note: embedded CMS/provider forms submit through their
owner contract. CAPTCHA, nonce, signatures, rate limits, and provider secrets are
backend-owned.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Typeform embed | https://www.typeform.com/developers/embed/ | docs-example | Typeform terms; embed reference. | Inline, popup, side-tab, and modal embed modes. | `provider`, `formId`, `displayMode`, `height`. | Adapt | Summarize only; no embed code copy. |
| Tally embed | https://tally.so/help/how-to-embed-a-tally-form | docs-example | Tally terms; embed reference. | Inline/popup embeds with hidden field support. | `provider`, `formId`, `hiddenFields`, `height`. | Adapt | Summarize only. |
| React Hook Form | https://react-hook-form.com/get-started | open-source | MIT package; verify. | Local form validation and submit state for native forms. | `fields.showLabels`, `validation`, `submitCopy`. | Keep | Summarize behavior only. |
| Mailchimp signup embed | https://mailchimp.com/help/add-a-signup-form-to-your-website/ | docs-example | Mailchimp terms; provider reference. | External form action with consent and success messaging. | `integration.mode`, `actionUrl`, `consent`. | Adapt | Summarize only; no copied snippet. |
| Flowbite forms | https://flowbite.com/docs/forms/input-field/ | docs-example | MIT core; verify docs terms. | Input styling, helper text, validation messages. | `inputSize`, `showLabels`, `helperText`, `style.radius`. | Adapt | Summarize only. |
| daisyUI form controls | https://daisyui.com/components/input/ | open-source | MIT package; verify. | Compact form controls and joined inputs. | `inputSize`, `style.variant`, `fieldSpacing`. | Adapt | Summarize only. |
| Preline forms | https://preline.co/docs/input.html | docs-example | Terms require verification. | Dense form surfaces, validation states, and layout helpers. | `layout.width`, `style.surface`, `validationStyle`. | Adapt | Summarize only. |
| Tailwind UI contact forms | https://tailwindcss.com/plus/ui-blocks/marketing/sections/contact-sections | premium-reference | Paid reference only. | Framed form sections with supporting copy and background treatment. | `variant: card`, `title`, `description`, `style.background`. | Adapt | Reference UX only. |
| WordPress Form block ecosystem | https://wordpress.org/plugins/tags/contact-form/ | unknown-license | Plugin licenses vary; verify individually. | Embedded form blocks vary from simple to multi-step. | `formId`, `variant`, `successCopy`, `accessWarning`. | Adapt | Summarize product patterns only. |
| Cal.com embed form handoff | https://cal.com/docs/platform/embed/embed-calendar | docs-example | Cal.com docs/terms. | Embed can hand off from form-like intake into booking. | `displayMode`, `provider`, `height`, `sourceWarning`. | Adapt | Summarize only. |
