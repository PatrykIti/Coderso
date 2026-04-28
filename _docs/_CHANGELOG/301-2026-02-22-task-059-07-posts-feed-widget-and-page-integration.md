# 301 - TASK-059-07 Posts Feed Widget and Page Integration

- **Date:** 2026-02-22
- **Version:** 0.1.301
- **Tasks:** TASK-059, TASK-059-07

## Key Changes

### New Core Widget: `posts-feed`
- Added `core/widgets/core/postsFeed.tsx` with dedicated schema/defaults/normalization.
- Source modes:
  - `latest`
  - `featured`
  - `category`
  - `manual`
- Keeps beginner-first UX: no listing query builder required.

### Runtime Resolver and SSR Hydration
- Added `core/services/content/postsFeedResolver.ts`.
- Runtime resolver reads dedicated posts storage (`listPosts`) and maps deterministic runtime items.
- `core/server/publicSite.tsx` now hydrates `posts-feed` blocks server-side before render.
- Public runtime rule: outside preview only `published` posts are exposed.

### Admin Builder Integration
- Added editor controls: `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`.
- Registered widget in admin registry and runtime registry:
  - `core/admin/ui/widgets/registry.ts`
  - `core/widgets/runtime.tsx`
  - `core/widgets/core/index.ts`
- Listings module pack matrix now includes `posts-feed` composite.

### Tests
- Added `tests/unit/widgets/postsFeedWidget.test.tsx`.
- Extended `tests/unit/site/publicRenderer.test.tsx` with posts-feed render case.
- Verified listings module matrix and content-list regression compatibility.

## Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/site/publicRenderer.test.tsx tests/unit/widgets/modulePackMatrix.test.ts tests/unit/widgets/contentList.test.tsx`

## Result
- TASK-059-07 is closed: posts can now be embedded on pages via a dedicated, non-technical widget flow with SSR runtime parity.
