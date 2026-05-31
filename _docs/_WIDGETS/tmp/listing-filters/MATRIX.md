# Listing Filters Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Facet groups with counts | Algolia RefinementList | Keep | `facets[]` keeps label, field, and allowlisted type/operator configuration while counts are runtime-resolved display data; count-visibility and per-facet limit controls remain Adapt-only until schema/runtime owners are added. |
| Range filters | Current Coderso listing facet contract | Keep | Preserve schema-owned `range` and `date-range` facet kinds with min/max active values, backend clamps, and editor coverage; Algolia/Medusa range UI remains Adapt reference material. |
| Reset/apply behavior | Algolia ClearRefinements | Keep | Visual `Behavior` section owns instant/apply mode and labels; Tailwind UI Plus responsive filter polish remains Adapt reference material. |
| Sidebar/chips/mobile drawer layouts | Flowbite, daisyUI, Tailwind UI Plus | Adapt | Add layout modes without changing query binding. |
| Arbitrary operators | TanStack Table | Reject | Only allowlist safe operators per listing source. |
| Client-owned search index config | Algolia examples | Reject | Index credentials and unsafe query config stay backend-owned. |
