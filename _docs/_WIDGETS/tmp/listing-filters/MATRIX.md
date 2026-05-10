# Listing Filters Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Facet groups with counts | Algolia RefinementList, Shopify | Keep | `facets[]` includes label, field, type, count visibility, and limit. |
| Range filters | Algolia RangeSlider, Medusa | Keep | Allowlisted range facet with min/max/step and backend clamp. |
| Reset/apply behavior | Algolia ClearRefinements, Tailwind UI Plus | Keep | Visual `Behavior` section owns instant/apply mode and labels. |
| Sidebar/chips/mobile drawer layouts | Flowbite, daisyUI, Tailwind UI Plus | Adapt | Add layout modes without changing query binding. |
| Arbitrary operators | TanStack Table | Reject | Only allowlist safe operators per listing source. |
| Client-owned search index config | Algolia examples | Reject | Index credentials and unsafe query config stay backend-owned. |
