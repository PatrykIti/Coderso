# Contact Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Form plus contact info layout | Current Coderso contact/form contract | Keep | Visual `Layout` and `Contact info` sections own position and visible data; Tailwind UI Plus/HyperUI/Preline remain Adapt reference material. |
| Field visibility/validation copy | React Hook Form | Keep | Schema owns visible fields, required labels, success/error/loading copy; Flowbite input polish remains Adapt reference material. |
| Map/social links | HyperUI, Tailwind UI Plus | Adapt | Optional display fields only; no third-party map secrets in widget data. |
| Provider embed mode | Typeform, Tally | Adapt | Safe provider reference only; submissions/security remain backend-owned. |
| CAPTCHA/nonce/email routing controls | WordPress plugin patterns | Reject | Security and routing belong to backend contact service. |
| Mailchimp audience submission | Mailchimp | Reject | Newsletter/CRM integration, not contact widget core. |
