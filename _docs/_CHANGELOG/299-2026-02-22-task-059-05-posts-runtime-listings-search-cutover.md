# 299 - TASK-059-05 Posts Runtime, Listings, and Search Source Cutover

- **Date:** 2026-02-22
- **Version:** 0.1.299
- **Tasks:** TASK-059, TASK-059-05

## Key Changes

### Listings Source Cutover (`posts`)
- `core/services/content/listingSources.ts` source `posts` czyta teraz dane bezposrednio z posts domain (`listPosts`) zamiast przez `entries + content type post`.
- Zachowany output row shape dla listing engine (`id/title/slug/status/tags/data/author/timestamps`).

### Runtime Route Meta and Widgets
- `core/services/content/contentListResolver.ts` usuwa dependency `posts -> content_types` przy budowie route meta dla listing queries.
- Dla `source=posts` runtime ustawia:
  - `sourceTypeId = "post"`,
  - `sourceTypeSlug` z `site.contentRoutes` (post/posts) lub fallback `post`.
- `content-list` / `entry-teaser` pozostają kompatybilne po stronie payloadu.

### Public Runtime Cutover
- `core/server/publicSite.tsx`:
  - content routes `post/posts` renderowane przez posts service (`getPostBySlug`, `listPosts`),
  - preview `type=content` rozpoznaje posts po `targetId` i renderuje post-native detail runtime,
  - brak wymaganej zaleznosci od `content_entries` dla post routes.
- `core/services/content/postsService.ts` rozszerzono o `getPostBySlug`.

### Public Search Cutover
- `core/services/search/searchIndexService.ts`:
  - oddzielne query dla `entries` i `posts`,
  - `entries` excludes post types,
  - `posts` indeksowane z dedykowanej tabeli (`title`, `slug`, `excerpt`, `data.title`).

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/content/listingSources.test.ts tests/unit/search/searchIndexService.test.ts tests/unit/widgets/contentList.test.tsx tests/integration/posts/posts-runtime-flow.test.ts tests/unit/content/postsService.test.ts tests/integration/posts/posts-revisions-flow.test.ts tests/integration/runtime/post-rendering-parity.test.tsx`
- `bun test tests/integration/routes/search.test.ts tests/unit/admin/listingsClient.test.ts`

## Result
- TASK-059-05 is closed: runtime/listings/search source `posts` is now powered by dedicated posts storage, with admin/runtime output compatibility preserved.
