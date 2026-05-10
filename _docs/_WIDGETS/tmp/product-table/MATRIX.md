# Product Table Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Column visibility and labels | TanStack Table, Flowbite | Keep | Schema owns stable product column keys and labels; reject unknown columns. |
| Sort/filter controls | TanStack, Algolia, Shopify | Keep | Visual controls configure allowed sort/filter fields; resolver clamps values. |
| Product image/action columns | Tailwind UI Plus, Flowbite | Adapt | Add visibility toggles and labels; action behavior remains commerce-owned. |
| Pagination | TanStack, Algolia | Keep | Reuse shared `source.limit` with backend clamp; defer separate pagination display mode unless commerce source/query owners add it. |
| Bulk selection | Preline data UI | Reject | Operational admin pattern, not public product table v1. |
| Client-side provider queries | Algolia/commerce demos | Reject | Public widget must not store provider secrets or unbounded query config. |
