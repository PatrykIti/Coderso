# Search Box Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Label/placeholder/button controls | WordPress, Algolia SearchBox | Keep | Visual `Copy` section owns accessible label, placeholder, submit/reset labels. |
| Compact/full search modes | TASK-252 search-box product requirement | Keep | Add bounded `variant` and size controls in this leaf; HyperUI/Flowbite remain Adapt reference material. |
| Result route/query binding | Shopify | Keep | Advanced owns target route/query param diagnostics; normalized by runtime owner; Medusa search/listing remains Adapt reference material. |
| Suggestions/autocomplete | Algolia Autocomplete | Adapt | Optional future `suggestions` with backend-owned provider config and rate limit. |
| Overlay command palette | Tailwind UI Plus | Reject | Application navigation pattern, not page widget v1. |
| Provider key/index in widget data | Algolia examples | Reject | Secrets and index config must stay backend-owned. |
