# Gallery Mosaic Research Matrix

| Researched option | Source family | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Responsive image grid | HyperUI, Preline | Keep | Keep repeated media items with image, alt, existing variant mapping, `style.ratio`, and `style.gap`; do not add standalone column-count config. |
| Masonry/mosaic layout | Preline | Keep | Map mosaic choices to existing `GalleryMosaicVariantId` variants plus bounded `style.gap`, `style.ratio`, and `style.radius`; Uilib remains Adapt reference material. |
| Captions | Origin UI | Keep | Add optional caption and visibility controls; shadcn.io remains Adapt reference material. |
| Overlay text | shadcn.io, ReUI | Adapt | Support safe title/label overlay, not rich arbitrary content. |
| Lightbox/modal | Flowbite | Adapt | Defer if no existing shared modal path; schema can reserve `previewMode`. |
| Carousel mode | Flowbite React | Reject | Gallery Mosaic should not duplicate carousel unless separate task approves it. |
| Hover/parallax effects | Aceternity | Adapt | Named, reduced-motion-safe effects only. |
| Per-image manual span | Tailwind UI Plus style mosaics | Adapt | Prefer presets over low-level grid controls. |
| Missing image alt text | Multiple | Reject | Require alt labels for every image. |
| Unknown-license implementation details | Uilib | Reject | No copied markup/classes. |
