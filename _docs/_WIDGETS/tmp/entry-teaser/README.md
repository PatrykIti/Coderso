# Entry Teaser Research Cards

Public-write/security note: this widget is read-only. Entry selection must not
surface unpublished data outside preview/admin contracts.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Contentful entry page teaser | https://github.com/contentful/template-blog-webapp-nextjs | open-source | MIT repo; verify current license. | Single featured entry card with title, excerpt, image, author, and link. | `source.entryId`, `fallback`, `fields.showImage`, `fields.showExcerpt`. | Keep | Summarize only. |
| WordPress Post Excerpt | https://wordpress.org/documentation/article/post-excerpt-block/ | docs-example | Documentation reference; summarize behavior. | Excerpt block trims a selected post summary with optional link. | `fields.excerptLength`, `cta.enabled`, `cta.label`. | Adapt | Summarize only. |
| WordPress Featured Image | https://wordpress.org/documentation/article/featured-image-block/ | docs-example | Documentation reference. | Featured media is independently toggleable and linkable. | `fields.showImage`, `image.aspectRatio`, `link.image`. | Keep | Summarize behavior. |
| HyperUI article card | https://www.hyperui.dev/components/marketing/blog-cards | open-source | MIT library; verify. | Standalone card teaser with image, badge, excerpt, and CTA. | `variant: card`, `fields.showBadge`, `style.cardStyle`. | Adapt | Summarize anatomy only. |
| Tailwind UI feature sections | https://tailwindcss.com/plus/ui-blocks/marketing/sections/feature-sections | premium-reference | Paid Tailwind UI Plus terms; reference only. | Media/text split teaser with CTA emphasis. | `variant: split`, `media.position`, `cta.style`. | Adapt | Reference UX only. |
| Flowbite card | https://flowbite.com/docs/components/card/ | docs-example | MIT core; verify docs terms. | Card supports link wrapping, image, body, and action link. | `variant: card`, `cta.label`, `style.radius`. | Adapt | Summarize only. |
| daisyUI card | https://daisyui.com/components/card/ | open-source | MIT package; verify. | Compact card variants with side image or full image. | `media.position`, `style.compact`, `cta.enabled`. | Adapt | Summarize only. |
| Preline card | https://preline.co/docs/card.html | docs-example | Terms require verification. | Horizontal and vertical cards for teaser surfaces. | `variant: horizontal`, `style.shadow`, `image.aspectRatio`. | Adapt | Summarize only. |
| shadcn blocks | https://www.shadcn.io/blocks | docs-example | Verify block license before reuse. | Landing sections use feature cards and CTA slots. | `section.heading`, `cta.secondary`, `style.spacing`. | Adapt | Summarize only. |
| Shopify article teaser | https://github.com/Shopify/hydrogen-demo-store | open-source | MIT repo; verify current license. | Storefront article teasers with image and route-backed link. | `source.entryId`, `link.detailRoute`, `emptyState`. | Adapt | Summarize behavior only. |
