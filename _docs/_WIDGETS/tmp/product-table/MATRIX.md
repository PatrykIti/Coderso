# Product Table Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Column visibility and labels | TanStack Table | Keep | Schema owns stable product column keys and labels; reject unknown columns; Flowbite table polish remains Adapt reference material. |
| Sort/filter controls | TanStack Table and current shared commerce source | Keep | Visual controls configure allowed sort/filter fields; resolver clamps values; Algolia/Shopify search polish remains Adapt reference material. |
| Product image/action columns | Tailwind UI Plus, Flowbite | Adapt | Add visibility toggles and labels; action behavior remains commerce-owned. |
| Pagination | TanStack Table and current shared commerce source | Keep | Reuse shared `source.limit` with backend clamp; defer separate pagination display mode unless commerce source/query owners add it; Algolia pagination polish remains Adapt reference material. |
| Bulk selection | Preline data UI | Reject | Operational admin pattern, not public product table v1. |
| Client-side provider queries | Algolia/commerce demos | Reject | Public widget must not store provider secrets or unbounded query config. |
