# Content List Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Query source and type selection | WordPress Query Loop | Keep | Visual `Source` section owns content type, status scope, sort, and limit; Contentful remains Adapt reference material. |
| Card/list/compact display modes | Current Coderso content-list variants | Keep | Preserve variants and add clear density/column controls without new widget types; HyperUI/daisyUI/Flowbite remain Adapt reference material. |
| Featured-first editorial layout | Tailwind UI Plus, Preline | Adapt | Optional `layout.featuredFirst` only if renderer can keep deterministic ordering. |
| Field visibility toggles | WordPress Latest Posts | Keep | Visual `Fields` section for image, excerpt, meta, CTA, taxonomy; Contentful remains Adapt reference material. |
| Pagination/infinite load | Medusa, Shopify Hydrogen | Adapt | Keep as future runtime option; clamp limits and avoid client-only source mutation. |
| Arbitrary template fragments | WordPress theme ecosystem | Reject | Would bypass schema-first widget contract and create unbounded editor complexity. |
