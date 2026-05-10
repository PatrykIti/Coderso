# Product Gallery Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Shared commerce source controls | Shopify Hydrogen | Keep | Visual `Source` section uses the current shared `CommerceWidgetSource`; product-id/catalog picker expansion requires shared commerce owner changes, while Medusa remains Adapt reference material. |
| Product media modes and thumbnails | Shopify Hydrogen | Keep | Add `media.mode`, thumbnails, and aspect ratio controls through the backend-owned product media contract; Flowbite/daisyUI/Tailwind UI Plus carousel polish stays Adapt-only. |
| Variant-bound media | Shopify Hydrogen, Medusa | Adapt | Keep as runtime-aware option only if commerce resolver supplies variant media. |
| Quick view/add-to-cart action | HyperUI, Tailwind UI Plus | Adapt | Labels and visibility can be editor-owned; cart behavior remains commerce-owned. |
| Lightbox | Preline | Adapt | Future option; requires accessibility and focus-trap contract. |
| Client-side provider fetching | Shopify/Algolia examples | Reject | Coderso must keep provider credentials and commerce fetching backend-owned. |
