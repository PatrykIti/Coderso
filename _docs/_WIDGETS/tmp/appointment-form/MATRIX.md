# Appointment Form Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Field visibility and validation copy | React Hook Form, Flowbite | Keep | Visual `Fields` and `Validation` sections own visible fields and user copy. |
| Multi-step/conditional intake | React Hook Form advanced, Cal.com | Adapt | Keep as future mode; requires schema-owned steps and deterministic validation. |
| Provider/embed mode | Typeform, Tally, Cal.com | Adapt | Store safe provider reference/display mode only; backend owns secrets. |
| Success/error/loading states | React Hook Form, Tailwind UI Plus | Keep | Schema owns copy; runtime maps known submission errors. |
| CAPTCHA/nonce editing | Public-write providers | Reject | Security remains backend-owned and not exposed as widget content fields. |
| Generic marketing signup API | Mailchimp | Reject | Not appointment-specific enough for this widget option list. |
