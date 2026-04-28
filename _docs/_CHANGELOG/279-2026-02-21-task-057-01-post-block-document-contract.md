# 279 - TASK-057-01 Post Block Document Contract and Legacy Compatibility

- **Date:** 2026-02-21
- **Version:** 0.1.279
- **Tasks:** TASK-057-01

## Key Changes

### Post Block Document Contract
- Added versioned post block model:
  - `core/services/posts/editor/postBlockDocument.ts`
- Added strict/deterministic normalization:
  - `core/services/posts/editor/postBlockNormalizer.ts`

### Legacy Compatibility
- Added legacy adapter for old `post.data.content`/`excerpt` payloads:
  - `core/services/posts/editor/postBlockLegacyAdapter.ts`
- Read/write paths now coerce or validate document payloads with consistent fallback behavior.

### Posts Service and API Guardrails
- Updated posts service to persist block document and ensure reserved `post` schema includes `document`:
  - `core/services/content/postsService.ts`
- Added API error mapping for invalid document payloads:
  - `core/server/routes/postsRoutes.ts` (`post_document_invalid` -> 400)

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/posts/postBlockDocument.test.ts tests/unit/posts/postBlockLegacyAdapter.test.ts tests/unit/content/postsService.test.ts tests/integration/routes/postsRoutes.test.ts`

### Added/Updated Tests
- `tests/unit/posts/postBlockDocument.test.ts`
- `tests/unit/posts/postBlockLegacyAdapter.test.ts`
- `tests/unit/content/postsService.test.ts`
- `tests/integration/routes/postsRoutes.test.ts`
