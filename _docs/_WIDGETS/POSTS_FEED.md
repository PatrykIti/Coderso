# Posts Feed Widget (v1)

## Purpose

Render a ready-to-use list of posts without building a custom listing query.

## Widget ID

`posts-feed`

## Variants

- `cards`
- `list`
- `compact`

## Source Modes

- `latest`: newest posts
- `featured`: only featured posts (`featured` tag or `data.featured=true`)
- `category`: keyword match against post tags
- `manual`: explicit list of post IDs selected in editor

## Runtime Behavior

- Resolver: `core/services/content/postsFeedResolver.ts`
- Public output (`preview=false`): only `published` posts.
- Preview output (`preview=true`): all statuses.
- Links use `site.contentRoutes` for `post/posts` (fallback `/post/:slug`).
- Runtime hydration writes payload to `data.resolved` before render.

## Editor Modes

### Wizard
- source setup
- display toggles

### Visual
- source setup
- display toggles
- layout/style
- empty state

### Advanced
- visual sections + runtime payload snapshot

## Data Model (summary)

```json
{
  "source": {
    "mode": "latest",
    "category": "",
    "manualPostIds": [],
    "limit": 6,
    "sort": "published-desc"
  },
  "fields": {
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
    "ctaLabel": "Read more"
  },
  "resolved": {
    "items": [],
    "total": 0,
    "sourceMode": "latest",
    "resolvedAt": ""
  }
}
```
