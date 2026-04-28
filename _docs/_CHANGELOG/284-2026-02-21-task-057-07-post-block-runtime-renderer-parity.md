# 284 - TASK-057-07 Post Block Runtime Renderer and Public Parity

- **Date:** 2026-02-21
- **Version:** 0.1.284
- **Tasks:** TASK-057-07

## Key Changes

### Post Runtime Mapper + Renderer
- Added runtime mapping and sanitization layer for post block documents:
  - `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- Added public runtime React renderer for mapped post blocks:
  - `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- Implemented secure rendering rules for:
  - rich text HTML sanitization,
  - button/link href sanitization,
  - embed provider URL normalization (`youtube`, `vimeo`, `loom`, `custom`),
  - media ID -> URL resolution for image blocks.

### Public Detail Rendering Parity
- Updated content detail rendering pipeline to provide runtime post document data for post entries:
  - `core/site/renderPublicEntry.tsx`
  - `core/templates/content-detail.tsx`
- Published and preview detail routes now use the same post block rendering pipeline with legacy fallback.

### Excerpt and Meta Description Consistency
- Updated list resolver excerpt generation to reuse post runtime excerpt extraction:
  - `core/services/content/contentListResolver.ts`
- Added post runtime meta description fallback for entry detail rendering:
  - `core/server/publicSite.tsx`

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/post-block-runtime-renderer.test.tsx tests/integration/runtime/post-rendering-parity.test.tsx tests/unit/content/contentListResolver.test.ts tests/integration/routes/postsRoutes.test.ts tests/unit/admin/postsClient.test.ts tests/unit/ui/post-block-editor-shell.test.tsx tests/integration/ui/post-autosave-flow.test.tsx`

## Added/Updated Tests
- Added: `tests/unit/posts/post-block-runtime-renderer.test.tsx`
- Added: `tests/integration/runtime/post-rendering-parity.test.tsx`
- Added: `tests/unit/content/contentListResolver.test.ts`
