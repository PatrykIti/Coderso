# Product Gallery Research Cards

Public-write/security note: this widget is read-only. Product source, prices,
and inventory flags must be resolved server-side through commerce runtime
owners; provider secrets stay backend-owned.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Shopify Hydrogen product gallery | https://github.com/Shopify/hydrogen-demo-store | open-source | MIT repo; verify current license. | Product image gallery with thumbnails and product media selection. | `source.productId`, `media.mode`, `media.thumbnailPosition`. | Keep | Summarize only. |
| Shopify product media docs | https://shopify.dev/docs/storefronts/headless/hydrogen/cart | docs-example | Shopify docs terms; reference behavior. | Product pages coordinate media, variants, cart actions, and availability. | `showVariantMedia`, `actionLabel`, `availabilityState`. | Adapt | Summarize behavior only. |
| Medusa Next.js product page | https://github.com/medusajs/nextjs-starter-medusa | open-source | MIT repo; verify. | Gallery plus variant selector and add-to-cart area. | `source.productHandle`, `layout.mode`, `showPrice`, `showActions`. | Adapt | Summarize only. |
| CommerCN gallery | https://commercn.dev/ | unknown-license | License unknown; reference only. | Commerce gallery with thumbnails, badges, and product summary. | `media.aspectRatio`, `badge.mode`, `summary.enabled`. | Adapt | Reference UX only. |
| Tailwind UI ecommerce product overviews | https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-overviews | premium-reference | Paid Tailwind UI Plus terms; reference only. | Premium product overview layouts with image grids and purchase panel. | `layout.mode: grid|carousel`, `details.position`, `cta.style`. | Adapt | Reference UX only. |
| HyperUI product cards | https://www.hyperui.dev/components/ecommerce/product-cards | open-source | MIT library; verify. | Product cards with image hover state, sale badge, quick action. | `style.cardStyle`, `badges.sale`, `actions.quickView`. | Adapt | Summarize only. |
| Flowbite gallery | https://flowbite.com/docs/components/gallery/ | docs-example | MIT core; verify docs terms. | Responsive image gallery with grid and carousel patterns. | `media.mode`, `columns`, `gap`, `aspectRatio`. | Adapt | Summarize only. |
| daisyUI carousel | https://daisyui.com/components/carousel/ | open-source | MIT package; verify. | Carousel primitives with item snapping and image panels. | `media.mode: carousel`, `controls.showDots`, `controls.showArrows`. | Adapt | Summarize only. |
| Preline gallery | https://preline.co/docs/gallery.html | docs-example | Terms require verification. | Responsive gallery grid and lightbox-style affordances. | `media.mode: grid`, `lightbox.enabled`, `columns`. | Adapt | Summarize only. |
| Algolia ecommerce demo | https://www.algolia.com/doc/guides/building-search-ui/resources/demos/react/ | docs-example | Algolia docs/examples terms apply; verify before reuse. | Product cards combined with search and refinement state. | `source.searchContext`, `showPrice`, `showRating`, `emptyState`. | Adapt | Summarize behavior only. |
