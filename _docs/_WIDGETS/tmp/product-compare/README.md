# Product Compare Research Cards

Public-write/security note: compare data is read-only. Product IDs, attribute
sets, prices, and availability must be resolved through backend commerce owners.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Tailwind UI comparison tables | https://tailwindcss.com/plus/ui-blocks/marketing/sections/comparison-sections | premium-reference | Paid reference only. | Feature comparison rows with highlighted recommended column. | `columns.products`, `rows.attributes`, `highlightProductId`, `style.density`. | Adapt | Reference UX only. |
| Shopify Hydrogen products | https://github.com/Shopify/hydrogen-demo-store | open-source | MIT repo; verify. | Product option and feature data rendered from storefront API. | `source.productIds`, `fields.showPrice`, `fields.showOptions`. | Adapt | Summarize only. |
| Medusa product data | https://github.com/medusajs/nextjs-starter-medusa | open-source | MIT repo; verify. | Product attributes, variant options, and price regions. | `source.productIds`, `attributeSource`, `priceRegion`. | Adapt | Summarize only. |
| CommerCN compare patterns | https://commercn.dev/ | unknown-license | License unknown; reference only. | Commerce comparison rows with sticky product headers. | `layout.stickyHeader`, `rows`, `actions.showCta`. | Adapt | Reference UX only. |
| TanStack Table examples | https://tanstack.com/table/latest/docs/framework/react/examples | open-source | MIT package; verify. | Column/row data model with visibility, pinning, sorting, and responsive behavior. | `table.columns`, `table.pinnedColumns`, `fieldVisibility`. | Keep | Summarize data-table behavior. |
| Flowbite table | https://flowbite.com/docs/components/tables/ | docs-example | MIT core; verify docs terms. | Responsive tables with row emphasis and action columns. | `style.striped`, `style.compact`, `actions.column`. | Adapt | Summarize only. |
| daisyUI table | https://daisyui.com/components/table/ | open-source | MIT package; verify. | Compact, zebra, and pinned visual table styles. | `style.variant`, `style.density`, `highlightRows`. | Adapt | Summarize only. |
| Preline table | https://preline.co/docs/table.html | docs-example | Terms require verification. | Responsive table wrappers and rich cell content. | `responsive.mode`, `cellContent`, `emptyState`. | Adapt | Summarize only. |
| WordPress Table block | https://wordpress.org/documentation/article/table-block/ | docs-example | Documentation reference; summarize behavior. | Manual table with header/footer and fixed/auto sizing. | `layout.fixed`, `showHeader`, `showFooter`. | Reject | Summarize only. |
| Algolia product comparison UX | https://www.algolia.com/doc/guides/building-search-ui/resources/demos/react/ | docs-example | Algolia docs/examples terms apply. | Search-driven products can be selected before comparison. | `selectionSource`, `emptyState`, `filterContext`. | Adapt | Summarize behavior only. |
