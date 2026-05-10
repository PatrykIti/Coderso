# Product Compare Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Product ID selection | Shopify Hydrogen, Medusa | Keep | Visual `Source` section owns selected product set and max count. |
| Attribute rows | Tailwind UI Plus, TanStack Table | Keep | Schema should store normalized row keys/labels and visibility. |
| Sticky headers/pinned first column | CommerCN, TanStack Table | Adapt | Add only if responsive behavior remains accessible. |
| Highlighted product | Tailwind UI Plus | Keep | `highlightProductId` or `highlightIndex` with normalized fallback. |
| Generic editable table | WordPress Table block | Reject | Compare must stay commerce-data-backed, not arbitrary table content. |
| Client-side commerce fetch | Shopify/Medusa examples | Reject | Provider access and price resolution stay backend-owned. |
