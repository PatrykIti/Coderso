# Search Box Research Cards

Public-write/security note: public search is query-only. Query strings, limits,
indexes, and provider keys must be backend-owned, rate-limited, and clamped.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Algolia SearchBox | https://www.algolia.com/doc/api-reference/widgets/search-box/react/ | docs-example | Algolia docs/examples terms apply. | Search input with submit, reset, loading state, and query hook. | `placeholder`, `submitLabel`, `resetLabel`, `searchAsYouType`. | Keep | Summarize behavior only. |
| Algolia Autocomplete | https://www.algolia.com/doc/ui-libraries/autocomplete/introduction/what-is-autocomplete/ | docs-example | Algolia docs/examples terms apply. | Predictive suggestions and recent/query suggestions. | `suggestions.enabled`, `suggestions.limit`, `resultsMode`. | Adapt | Summarize behavior only. |
| WordPress Search block | https://wordpress.org/documentation/article/search-block/ | docs-example | Documentation reference; summarize. | Search form with label, placeholder, button text/icon, and width options. | `label`, `placeholder`, `buttonMode`, `width`. | Keep | Summarize only. |
| Flowbite search input | https://flowbite.com/docs/forms/search-input/ | docs-example | MIT core; verify docs terms. | Search field with icon, button, helper states. | `icon`, `buttonVisible`, `size`, `helperText`. | Adapt | Summarize only. |
| daisyUI input | https://daisyui.com/components/input/ | open-source | MIT package; verify. | Compact input sizes and bordered/ghost states. | `size`, `variant`, `clearable`. | Adapt | Summarize only. |
| Preline input group | https://preline.co/docs/input-group.html | docs-example | Terms require verification. | Input group with icon/button addons. | `buttonMode`, `iconPosition`, `size`. | Adapt | Summarize only. |
| Tailwind UI command palettes | https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes | premium-reference | Paid reference only. | Overlay search with keyboard navigation and result groups. | `mode: overlay`, `resultGroups`, `shortcutHint`. | Reject | Reference only; too broad for simple search-box v1. |
| Shopify search | https://shopify.dev/docs/storefronts/themes/navigation-search/search | docs-example | Shopify docs terms; reference behavior. | Storefront search form routes to results page. | `targetRoute`, `queryParam`, `submitMode`. | Keep | Summarize behavior. |
| Medusa search/listing | https://github.com/medusajs/nextjs-starter-medusa | open-source | MIT repo; verify. | Search input drives product collection/listing state. | `targetResource`, `queryBinding`, `emptyState`. | Adapt | Summarize only. |
| HyperUI search form | https://www.hyperui.dev/components/application-ui/search-forms | open-source | MIT library; verify. | Application search form with compact and full-width variants. | `variant: compact|full`, `submitButton`, `style.surface`. | Adapt | Summarize only. |
