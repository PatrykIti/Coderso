# Posts Feed Research Cards

Public-write/security note: this widget is read-only. Category/manual source
filters must be backend-normalized and query limits must remain clamped.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| WordPress Latest Posts | https://wordpress.org/documentation/article/latest-posts-block/ | docs-example | Documentation reference; summarize behavior only. | Latest posts with count, order, featured image, excerpt, and date toggles. | `source.mode: latest`, `limit`, `sort`, `fields.showDate`, `fields.showExcerpt`. | Keep | Summarize only. |
| WordPress Query Loop | https://wordpress.org/documentation/article/query-loop-block/ | docs-example | WordPress docs reference; no code copying. | Feed driven by category/tag/author query with template variants. | `source.categoryId`, `source.tagId`, `source.authorId`, `layout.mode`. | Keep | Summarize behavior. |
| Contentful blog starter | https://github.com/contentful/template-blog-webapp-nextjs | open-source | MIT repo; verify current license before reuse. | Blog index with CMS fields, author, hero image, and slug route. | `fields.image`, `fields.author`, `link.detailRoute`, `emptyState`. | Adapt | Summarize; copy only after verification. |
| HyperUI blog cards | https://www.hyperui.dev/components/marketing/blog-cards | open-source | MIT library; verify. | Blog card grid with metadata and author/avatar variants. | `variant: cards`, `style.columns`, `fields.showAuthor`. | Adapt | Summarize only. |
| Tailwind UI blog sections | https://tailwindcss.com/plus/ui-blocks/marketing/sections/blog-sections | premium-reference | Paid reference only. | Editorial feeds with featured/latest split and dense lists. | `layout.featuredPost`, `style.density`, `source.featuredOnly`. | Adapt | Reference UX only. |
| Preline blog article | https://preline.co/examples/blog-article.html | docs-example | Example terms require verification. | Blog surfaces with category, title, excerpt, and author/time metadata. | `fields.showCategory`, `fields.showReadingTime`, `style.cardStyle`. | Adapt | Summarize only. |
| Flowbite blog card | https://flowbite.com/docs/components/card/ | docs-example | Core library MIT; docs examples require verification. | Reusable card with image, heading, text, and CTA. | `fields.showImage`, `fields.showCta`, `style.radius`. | Adapt | Summarize component anatomy. |
| daisyUI card | https://daisyui.com/components/card/ | open-source | MIT package; verify docs terms. | Minimal card composition with actions and responsive image placement. | `style.cardStyle`, `style.imagePlacement`, `ctaLabel`. | Adapt | Summarize only. |
| shadcn blocks | https://www.shadcn.io/blocks | docs-example | Registry examples are reference material; verify licensing per block. | Section blocks combine cards, headings, and filters. | `section.heading`, `layout.columns`, `style.spacing`. | Adapt | Summarize; no code copy. |
| CommerCN listing patterns | https://commercn.dev/ | unknown-license | License/terms must be verified before any reuse. | Commerce/content grid conventions with dense cards and sorting. | `sort`, `style.density`, `emptyState`. | Adapt | Reference UX only until license is clear. |
