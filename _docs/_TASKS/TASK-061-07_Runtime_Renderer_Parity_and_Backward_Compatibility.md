# TASK-061-07: Runtime Renderer Parity and Backward Compatibility
# FileName: TASK-061-07_Runtime_Renderer_Parity_and_Backward_Compatibility.md

**Priority:** High  
**Category:** Runtime/Compatibility  
**Estimated Effort:** Medium  
**Dependencies:** TASK-061-02, TASK-061-05, TASK-061-06  
**Status:** To Do

---

## Overview
Zapewnic pelna parity preview/public dla writing canvas i bezpieczny fallback dla starszych dokumentow post blocks.

## Scope
1. Renderer writing canvas w runtime mapperze i rendererze.
2. Backward adapter:
   - legacy blocks -> writing model (read path),
   - bez destrukcyjnej migracji na starcie.
3. Preview/public parity na jednym pipeline.
4. Instrumentacja warningow dla unsupported legacy edge cases.

## Security Contract
- **Visibility:** public read (runtime pages/posts) + internal preview.
- **Auth path:** public post read bez auth; preview przez token/session wg obecnego kontraktu.
- **Rate-limit bucket:** public read buckets (bez zmian kontraktu).
- **Nonce/HMAC:** n/a (read path).
- **reCAPTCHA:** n/a.
- **Internal mode:** n/a.

## Files to Create / Change
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/services/posts/editor/postBlockLegacyAdapter.ts`
- `tests/integration/runtime/post-rendering-parity.test.tsx` (extend)
- `tests/unit/posts/post-legacy-adapter-writing-canvas.test.ts` (new)

## Pseudocode
```ts
mapPostDocumentToRuntime(doc):
  if hasWritingCanvas(doc):
    return renderWritingCanvas(doc)
  return renderLegacyBlocksWithAdapter(doc)

legacyAdapter(blocks):
  convert paragraph/heading/list/image -> writing nodes
  preserve safe attrs only
```

## Acceptance Criteria
1. Preview/public renderuja writing canvas identycznie.
2. Legacy dokumenty nie przestaja sie wyswietlac.
3. Brak regresji SEO/metadata/reading-time.

## Testing Requirements
- Runtime parity tests + legacy fixtures.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
