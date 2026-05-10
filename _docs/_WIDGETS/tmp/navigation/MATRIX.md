# Navigation Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Source menu/manual links | WordPress, Shopify | Keep | Visual `Source` section selects existing menu or safe manual links. |
| Logo, links, CTA grouping | Flowbite React, HyperUI | Keep | Visual `Structure` section groups brand, primary links, CTA. |
| Mobile collapse/offcanvas | Flowbite, Preline, Tailwind UI Plus | Keep | `mobileMode` with accessible toggle labels and deterministic defaults. |
| Dropdown/mega groups | shadcn, Flowbite | Adapt | Allow nested links, but avoid arbitrary rich menu blocks in this slice. |
| Sticky/transparent header | Tailwind UI Plus, Preline | Adapt | Style option with clear background behavior and scroll-safe constraints. |
| Animation-heavy hover previews | Aceternity | Reject | Too fragile for beginner-friendly nav and reduced-motion requirements. |
