# Newsletter Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Inline/stacked/minimal layouts | HyperUI | Keep | Preserve variants and expose layout width/alignment in Visual; Tailwind UI Plus/daisyUI remain Adapt reference material. |
| Consent and privacy note | Preline | Keep | Visual `Consent` section owns label/required/privacy copy; Mailchimp remains provider Adapt reference material. |
| Passive success/error/loading copy | React Hook Form | Keep | Schema owns submit/state copy as fallback rendered copy; Mailchimp provider errors remain Adapt scope. |
| Runtime provider-error mapping | Mailchimp, provider submission patterns | Adapt | Requires a backend-owned Coderso submission owner with route/security tests; do not infer it from widget-only action URLs. |
| Provider integration target | Mailchimp, Typeform, Tally | Adapt | Widget stores provider mode/reference only; secrets and tokens are backend-owned. |
| CAPTCHA/nonce controls in widget | Public-write patterns | Reject | Security controls are backend-owned, not editable as loose widget fields. |
| Raw embedded third-party form code | Mailchimp/Typeform/Tally | Reject | Store safe provider reference only; do not copy embed snippets into docs/widget data. |
