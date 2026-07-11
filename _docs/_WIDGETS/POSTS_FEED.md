# Posts Feed Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Render a ready-to-use feed of posts without building a custom listing query.

## Widget ID

`posts-feed`

## Variants

- `cards`
- `list`
- `compact`

## Source Modes

- `latest`: newest visible posts, sorted by the selected sort mode.
- `featured`: featured posts only (`featured` tag or `data.featured === true`).
- `category`: single keyword match against normalized post tags.
- `manual`: explicit ordered list from `source.manualPostIds`; Sort stays
  visible only as a read-only hint because order comes from the selection.

## Source Filters and Pagination

- `source.authorId`: optional author filter derived from post summary data.
- `source.dateRange.from` / `to`: optional ISO `YYYY-MM-DD` bounds; invalid
  legacy values normalize to empty filters and the editor warns that they were
  cleared.
- `source.featuredFirst`: optional featured-first ordering for non-manual modes.
- Advanced source-filter diagnostics report only runtime-active filters for the
  selected source mode. Saved `source.category` values are preserved as dormant
  state outside `category` mode, but they are not presented as active filters in
  `latest`, `featured`, or `manual`.
- `pagination.mode`: shared Content List pagination contract:
  - `none`
  - `paged`
  - `load-more`
  - `view-all`
- `pagination.pageSize`, `viewAllHref`, `viewAllLabel`, and `loadMoreLabel`
  reuse the shared `ContentListData.pagination` model. In Visual mode,
  `viewAllHref` is authored through the shared page-first destination picker;
  older custom/external values stay compatible as replace-or-clear state.
- `paged` uses the block-scoped runtime key `cl.<blockId>.page`.
- `load-more` uses the same key but grows cumulatively across page hops.
- `view-all` always renders the first bounded slice and ignores stale
  `cl.<blockId>.page` params.

## Runtime Behavior

- Resolver entry point: `core/services/content/postsFeedResolver.ts`.
- Shared pure runtime mapping: `core/services/content/postsFeedRuntime.ts`.
- Public output (`preview=false`) includes published posts only.
- Preview/admin output (`preview=true`) can use all statuses from the admin post
  catalog.
- Detail links and `resolved.listPath` come only from enabled
  `site.contentRoutes` for `post` / `posts`.
  - If no enabled post detail route exists, item CTA hrefs are omitted instead
    of falling back to `/post/:slug`; cards render an explicit non-link note
    instead of silently losing navigation.
  - `view-all` falls back to `resolved.listPath` when `pagination.viewAllHref`
    is empty.
  - If neither a selected `viewAllHref` nor a resolved `listPath` exists,
    `view-all` renders a disabled explanatory state instead of disappearing.
  - Visual mode surfaces the same route state before publish, including the
    all-items-visible case where the View all action may be redundant.
- Media ids resolve through the shared media lookup seam:
  `core/services/content/contentMediaResolver.ts`.
- Runtime hydration writes the resolved payload to `data.resolved` before public
  render.
- Admin preview uses transient `WidgetPreviewState.dataPatch.resolved` and does
  not persist preview-only resolved data into canonical page blocks.

## Editor Modes

### Wizard

- source setup only: source mode, category/tag filter, manual post order,
  author/date filters, featured-first ordering, initial item count, and sort.
- the content type is fixed to Posts and is shown as read-only setup context.
- lifecycle: after setup is completed, the shared editor shell keeps everyday
  editing in Visual/Advanced and exposes Wizard through `Run setup again`.

### Visual

- daily presentation: field visibility, section title/description, variant,
  columns, gap, card style, image aspect, CTA label, swatch-only color
  controls, and motion.
- pagination presentation: mode, page size, view-all page destination/label,
  and load-more label.
- empty-state copy.
- Visual keeps the transient preview bridge active without owning source
  controls.

### Advanced

- read-only resolved query summary, route/list-path capability, runtime
  pagination/freshness status, human runtime summary, and contract summary.
- Advanced does not expose a raw resolved-query JSON snapshot.
- Advanced has no writable Posts Feed controls.
- Advanced route capability reports whether cards/CTAs can link or whether
  they render as non-links because no posts list/detail route is resolved.

## Smoke Fixture

- The widget contract smoke harness bootstraps a deterministic Posts Feed
  fixture through authenticated admin APIs before browser proof:
  - creates or updates three prefixed fixture posts under `fixture-posts-*`,
  - prepends an enabled `posts` content route for `/fixture-posts/:slug` while
    preserving existing route entries,
  - publishes the posts through the existing admin publish endpoint,
  - patches `/posts-feed-test-page` with a populated Posts Feed block containing
    image, tags, author/date, CTA hrefs, motion, and load-more runtime data,
  - publishes the fixture page so public smoke can prove cards, links, tags,
    images, and view-all pagination.

## Manual Selection UX

- Search over the fetched post catalog.
- Keyboard-accessible up/down ordering controls for selected posts.
- `aria-live` loading/error feedback.
- Local retry and re-auth copy for `401` / `403` post-catalog failures.

## Clear Controls

- `style.backgroundColor`, `style.borderColor`, and `style.textColor` are
  clearable and authored through swatch-only Visual controls.
- Clear removes the owning posts-feed style key before mapping into the shared
  Content List renderer.
- Existing `var(...)`, `rgba(...)`, and other legacy custom color strings stay
  render-compatible as saved custom color state; editors can replace them with
  a swatch or clear them without typing CSS.
- Fresh Posts Feed widgets leave color values unset so the shared renderer
  inherits theme defaults instead of showing a false saved-custom state.
- Shared undo/toast behavior for destructive Clear actions is still routed to
  TASK-321 rather than reimplemented locally here.

## Data Model (summary)

```json
{
  "source": {
    "mode": "latest",
    "category": "",
    "manualPostIds": [],
    "authorId": "",
    "featuredFirst": false,
    "dateRange": {
      "from": "",
      "to": ""
    },
    "limit": 6,
    "sort": "published-desc"
  },
  "title": "",
  "description": "",
  "pagination": {
    "mode": "none",
    "pageSize": 6,
    "viewAllHref": "",
    "viewAllLabel": "View all posts",
    "loadMoreLabel": "Load more"
  },
  "fields": {
    "showImage": false,
    "showExcerpt": true,
    "showAuthor": true,
    "showDate": true,
    "showCta": true
  },
  "emptyState": {
    "title": "No posts found",
    "description": "Publish posts or adjust source settings to populate this feed."
  },
  "style": {
    "columns": "3",
    "gap": "md",
    "cardStyle": "outlined",
    "imageAspect": "standard",
    "ctaLabel": "Read more",
    "motion": "none"
  },
  "resolved": {
    "items": [],
    "total": 0,
    "sourceMode": "latest",
    "listPath": "",
    "resolvedAt": "",
    "runtime": {
      "page": 1,
      "pageSize": 6,
      "totalPages": 1
    }
  }
}
```
