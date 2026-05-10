# Navigation Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Source menu/manual links | WordPress | Keep | Visual `Source` section selects existing menu or safe manual links; Shopify storefront menu references remain Adapt material. |
| Logo, links, CTA grouping | Flowbite React | Keep | Visual `Structure` section groups brand, primary links, CTA; HyperUI marketing header polish remains Adapt material. |
| Mobile collapse | Flowbite React | Keep | `mobileMode` with accessible toggle labels and deterministic defaults; Preline/Tailwind offcanvas polish remains Adapt reference material. |
| Dropdown/mega groups | shadcn, Flowbite | Adapt | Allow nested links, but avoid arbitrary rich menu blocks in this slice. |
| Expanded sticky/transparent variants | Tailwind UI Plus, Preline | Adapt | Preserve existing `behavior.sticky`, `behavior.transparent`, and `behavior.collapseOnScroll`; only new visual/scroll variants are conditional. |
| Animation-heavy hover previews | Aceternity | Reject | Too fragile for beginner-friendly nav and reduced-motion requirements. |
