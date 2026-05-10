# Listing Filters Research Cards

Public-write/security note: filters create public query state but must not write
data. Facets, operators, and limits must be allowlisted and backend-normalized.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Algolia RefinementList | https://www.algolia.com/doc/api-reference/widgets/refinement-list/react/ | docs-example | Algolia docs/examples terms apply. | Facet checkbox list with counts, search, and show more. | `facets[]`, `showCounts`, `searchWithinFacet`, `limit`. | Keep | Summarize behavior only. |
| Algolia RangeSlider | https://www.algolia.com/doc/api-reference/widgets/range-slider/react/ | docs-example | Algolia docs/examples terms apply. | Numeric range filter with bounded min/max. | `facet.type: range`, `min`, `max`, `step`. | Adapt | Summarize only. |
| Algolia ClearRefinements | https://www.algolia.com/doc/api-reference/widgets/clear-refinements/react/ | docs-example | Algolia docs/examples terms apply. | Reset button clears active filters. | `actions.showReset`, `resetLabel`. | Keep | Summarize only. |
| Shopify storefront filters | https://shopify.dev/docs/storefronts/themes/navigation-search/filtering | docs-example | Shopify docs terms; reference behavior. | Storefront collection filters with availability, price, product options. | `source.collection`, `filterGroups`, `applyMode`. | Adapt | Summarize behavior only. |
| Medusa filters | https://github.com/medusajs/nextjs-starter-medusa | open-source | MIT repo; verify. | Category/price/filter controls coupled to product list routes. | `queryBinding`, `priceRange`, `categoryFacet`. | Adapt | Summarize only. |
| TanStack Table filters | https://tanstack.com/table/latest/docs/guide/column-filtering | open-source | MIT package; verify. | Column-level faceted filters and filter state. | `filterFields`, `operators`, `stateBinding`. | Adapt | Summarize behavior. |
| Flowbite sidebar filters | https://flowbite.com/docs/components/sidebar/ | docs-example | MIT core; verify docs terms. | Sidebar accordion groups for filter categories. | `layout.mode: sidebar`, `groups.collapsible`, `density`. | Adapt | Summarize only. |
| daisyUI filter controls | https://daisyui.com/components/filter/ | open-source | MIT package; verify. | Filter buttons/chips for mutually exclusive or additive choices. | `layout.mode: chips`, `selection.mode`, `activeStyle`. | Keep | Summarize only. |
| Tailwind UI filters | https://tailwindcss.com/plus/ui-blocks/ecommerce/components/category-filters | premium-reference | Paid reference only. | Responsive desktop sidebar and mobile drawer filters. | `responsive.mobileMode`, `groups.collapsible`, `applyLabel`. | Adapt | Reference UX only. |
| Preline accordion | https://preline.co/docs/accordion.html | docs-example | Terms require verification. | Accordion groups for dense controls. | `groups.collapsible`, `defaultOpen`, `spacing`. | Adapt | Summarize only. |
