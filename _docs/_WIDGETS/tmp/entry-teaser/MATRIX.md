# Entry Teaser Decision Matrix

| Researched option | Sources | Decision | Coderso editor/schema implication |
|---|---|---|---|
| Selected entry source | Contentful | Keep | Visual `Source` section owns entry picker, fallback title, and empty behavior; Shopify Hydrogen remains Adapt reference material. |
| Card and split teaser variants | Current Coderso entry-teaser variants | Keep | Preserve existing horizontal/vertical/minimal variants and only add card/split modes if renderer preserves defaults; HyperUI/Tailwind UI Plus/Preline remain Adapt reference material. |
| Image/excerpt/meta toggles | WordPress, Contentful | Keep | Visual `Fields` section exposes media, excerpt, meta, taxonomy, CTA. |
| Link wrapping | Flowbite, WordPress Featured Image | Adapt | Prefer explicit CTA and optional whole-card link with accessibility labeling. |
| Arbitrary remote entry payload mapping | CMS starters | Reject | Must use schema-owned field mapping and strict fallback behavior. |
| Multiple entries | Blog/card grids | Reject | That belongs to Content List or Posts Feed. |
