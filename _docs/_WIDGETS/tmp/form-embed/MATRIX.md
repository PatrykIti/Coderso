# Form Embed Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| CMS form picker | React Hook Form/local form patterns | Keep | Visual `Source` section selects form and shows access warning. |
| Inline/card/modal provider embeds | Typeform, Tally, Tailwind UI Plus | Adapt | Store safe provider references and display mode; no raw embed snippets. |
| Labels/required indicators/input size | Current Coderso form display contract | Keep | Visual `Fields` and `Style` sections own display-only controls; Flowbite/daisyUI/Preline styling remains Adapt reference material. |
| Success/error copy | React Hook Form | Keep | Schema owns copy; runtime maps known submission failures; Mailchimp provider copy remains Adapt reference material. |
| Provider secret fields | Mailchimp, Typeform, Tally | Reject | Secrets/tokens remain backend-owned. |
| Arbitrary third-party script HTML | Embed providers | Reject | Violates schema-first and security contract. |
