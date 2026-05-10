# Search Box Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Label/placeholder/button controls | WordPress, Algolia SearchBox | Keep | Visual `Copy` section owns accessible label, placeholder, submit/reset labels. |
| Compact/full search modes | HyperUI, Flowbite | Keep | Add `variant` and size controls. |
| Result route/query binding | Shopify, Medusa | Keep | Advanced owns target route/query param diagnostics; normalized by runtime owner. |
| Suggestions/autocomplete | Algolia Autocomplete | Adapt | Optional future `suggestions` with backend-owned provider config and rate limit. |
| Overlay command palette | Tailwind UI Plus | Reject | Application navigation pattern, not page widget v1. |
| Provider key/index in widget data | Algolia examples | Reject | Secrets and index config must stay backend-owned. |
