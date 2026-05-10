# Product Compare Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Product ID selection | Coderso compare contract; Shopify Hydrogen and Medusa as Adapt data-source references | Keep | Visual `Source` section owns selected product set and max count; third-party product-data polish remains Adapt-only. |
| Attribute rows | TanStack Table | Keep | Schema should store normalized row keys/labels and visibility; Tailwind UI Plus comparison polish remains Adapt-only. |
| Sticky headers/pinned first column | CommerCN, TanStack Table | Adapt | Add only if responsive behavior remains accessible. |
| Highlighted product | Coderso compare contract; Tailwind UI Plus as Adapt visual reference | Keep | `highlightProductId` or `highlightIndex` with normalized fallback; premium layout polish remains Adapt-only. |
| Generic editable table | WordPress Table block | Reject | Compare must stay commerce-data-backed, not arbitrary table content. |
| Client-side commerce fetch | Shopify/Medusa examples | Reject | Provider access and price resolution stay backend-owned. |
