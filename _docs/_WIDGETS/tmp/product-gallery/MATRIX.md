# Product Gallery Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Product source picker | Shopify Hydrogen, Medusa | Keep | Visual `Source` section selects product/catalog source; resolver stays backend-owned. |
| Grid/carousel media modes | Flowbite, daisyUI, Tailwind UI Plus | Keep | Add `media.mode`, thumbnails, arrows/dots, aspect ratio controls. |
| Variant-bound media | Shopify Hydrogen, Medusa | Adapt | Keep as runtime-aware option only if commerce resolver supplies variant media. |
| Quick view/add-to-cart action | HyperUI, Tailwind UI Plus | Adapt | Labels and visibility can be editor-owned; cart behavior remains commerce-owned. |
| Lightbox | Preline | Adapt | Future option; requires accessibility and focus-trap contract. |
| Client-side provider fetching | Shopify/Algolia examples | Reject | Coderso must keep provider credentials and commerce fetching backend-owned. |
