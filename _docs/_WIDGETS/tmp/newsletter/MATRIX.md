# Newsletter Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Inline/stacked/minimal layouts | HyperUI, Tailwind UI Plus, daisyUI | Keep | Preserve variants and expose layout width/alignment in Visual. |
| Consent and privacy note | Mailchimp, Preline | Keep | Visual `Consent` section owns label/required/privacy copy. |
| Success/error/loading copy | React Hook Form, Mailchimp | Keep | Schema owns submit copy; runtime maps provider errors. |
| Provider integration target | Mailchimp, Typeform, Tally | Adapt | Widget stores provider mode/reference only; secrets and tokens are backend-owned. |
| CAPTCHA/nonce controls in widget | Public-write patterns | Reject | Security controls are backend-owned, not editable as loose widget fields. |
| Raw embedded third-party form code | Mailchimp/Typeform/Tally | Reject | Store safe provider reference only; do not copy embed snippets into docs/widget data. |
