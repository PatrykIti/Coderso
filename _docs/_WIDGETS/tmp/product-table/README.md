# Product Table Research Cards

Public-write/security note: this widget is read-only. Search/filter query
limits, product fields, price, and provider credentials must stay backend-owned.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| TanStack Table React | https://tanstack.com/table/latest/docs/framework/react/overview | open-source | MIT package; verify current license. | Headless table state for columns, sorting, pagination, and filters. | `fields`, `labels`, `source.limit`, `source.sortField`, `source.sortDir`, `source.status`, `source.collectionIds`. | Keep | Summarize behavior; no copied code. |
| TanStack column visibility | https://tanstack.com/table/latest/docs/guide/column-visibility | open-source | MIT package; verify. | User/editor-selectable columns with stable keys. | `fields.*` visibility and `labels.*` display names. | Keep | Summarize only. |
| Shopify collection grid/list | https://github.com/Shopify/hydrogen-demo-store | open-source | MIT repo; verify. | Collection products with sort/filter and route-backed cards. | `source.collectionId`, `sort`, `showPrice`, `actions`. | Adapt | Summarize only. |
| Medusa category page | https://github.com/medusajs/nextjs-starter-medusa | open-source | MIT repo; verify. | Product listing with region-aware price and category filters. | `source.categoryId`, `priceRegion`, `availability`. | Adapt | Summarize only. |
| CommerCN product list | https://commercn.dev/ | unknown-license | Unknown; reference only. | Commerce tables/cards with quick actions and badges. | `display.mode`, `badgeFields`, `actions.quickAdd`. | Adapt | Reference UX only. |
| Flowbite table | https://flowbite.com/docs/components/tables/ | docs-example | MIT core; verify docs terms. | Responsive table with images, checkboxes, badges, and action cells. | `style.striped`, `rowImage`, `actions.column`. | Adapt | Summarize only. |
| daisyUI table | https://daisyui.com/components/table/ | open-source | MIT package; verify. | Compact/zebra table styles and row hover. | table style tokens and row hover behavior. | Adapt | Summarize only. |
| Preline advanced table | https://preline.co/docs/advanced-select.html | docs-example | Terms require verification. | Rich data UI patterns for filters and selection controls. | source-observed filter UI and responsive behavior only; shared commerce source owns fields. | Adapt | Summarize only. |
| Algolia ecommerce search | https://www.algolia.com/doc/guides/building-search-ui/resources/demos/react/ | docs-example | Algolia docs/examples terms apply. | Product results with facets, sort, pagination, and empty state. | source-observed search/facet/pagination UX only; shared commerce source owns fields. | Adapt | Summarize behavior only. |
| Tailwind UI ecommerce lists | https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-lists | premium-reference | Paid reference only. | Product rows/cards with image, title, price, color, size, and action affordances. | `columns`, `fields.showImage`, `fields.showVariants`, `actions.label`. | Adapt | Reference UX only. |
