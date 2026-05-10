# Product Compare Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Product ID selection | TASK-252-07-05 Coderso compare owner contract | Keep | This leaf creates the schema owner for selected product set and max count; Shopify Hydrogen/Medusa remain Adapt-only data-source references. |
| Attribute rows | TanStack Table | Keep | Schema should store normalized row keys/labels and visibility; Tailwind UI Plus comparison polish remains Adapt-only. |
| Sticky headers/pinned first column | CommerCN, TanStack Table | Adapt | Add only if responsive behavior remains accessible. |
| Highlighted product | TASK-252-07-05 Coderso compare owner contract | Keep | This leaf creates the schema owner for `highlightProductId` or `highlightIndex` with normalized fallback; Tailwind UI Plus remains Adapt-only visual reference. |
| Generic editable table | WordPress Table block | Reject | Compare must stay commerce-data-backed, not arbitrary table content. |
| Client-side commerce fetch | Shopify/Medusa examples | Reject | Provider access and price resolution stay backend-owned. |
