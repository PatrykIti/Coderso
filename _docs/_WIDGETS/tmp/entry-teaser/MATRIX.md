# Entry Teaser Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Selected entry source | Contentful, Shopify Hydrogen | Keep | Visual `Source` section owns entry picker, fallback title, and empty behavior. |
| Card and split teaser variants | HyperUI, Tailwind UI Plus, Preline | Keep | Add `card`/`split` display modes if renderer preserves existing defaults. |
| Image/excerpt/meta toggles | WordPress, Contentful | Keep | Visual `Fields` section exposes media, excerpt, meta, taxonomy, CTA. |
| Link wrapping | Flowbite, WordPress Featured Image | Adapt | Prefer explicit CTA and optional whole-card link with accessibility labeling. |
| Arbitrary remote entry payload mapping | CMS starters | Reject | Must use schema-owned field mapping and strict fallback behavior. |
| Multiple entries | Blog/card grids | Reject | That belongs to Content List or Posts Feed. |
