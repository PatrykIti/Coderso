# TASK-057-07: Post Block Runtime Renderer and Public Parity
# FileName: TASK-057-07_Post_Block_Runtime_Renderer_and_Public_Parity.md

**Priority:** High  
**Category:** Runtime + Frontend Rendering  
**Estimated Effort:** Medium  
**Dependencies:** TASK-057-06  
**Status:** Done (2026-02-21)

---

## Goal
Zapewnic parity miedzy edytorem postow a publicznym renderingiem tresci posta.

## Scope
1. Dodac renderer blokow posta dla runtime/public site.
2. Zapewnic fallback dla legacy posts (bez nowego `document`).
3. Ujednolicic rendering preview vs published.
4. Zapewnic bezpieczny rendering linkow/embeds (sanitization).

## Security Contract
- **Visibility:** public read only (runtime render)
- **Auth:** brak dla published; preview token dla draft/preview
- **Rate-limit:** obecny `public_read` policy
- **Write routes:** brak
- **Sanitization:** required before HTML output

## Files to Create / Change
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx` (new)
- `core/services/posts/runtime/postBlockRuntimeMapper.ts` (new)
- `core/server/publicSite.tsx`
- `core/services/content/contentListResolver.ts` (excerpt/summary consistency)
- `tests/unit/posts/post-block-runtime-renderer.test.tsx` (new)
- `tests/integration/runtime/post-rendering-parity.test.tsx` (new)

## Pseudocode
```ts
renderPostBody(post):
  doc = normalizePostDocument(post.data.document ?? post.data)
  return doc.blocks.map((block) => renderBlock(block))

renderBlock(block):
  switch block.type:
    paragraph -> <p>...</p>
    heading -> <h2..h6>...</h2..h6>
    list -> <ul/ol>...</ul/ol>
    quote -> <blockquote>...</blockquote>
    code -> <pre><code>...</code></pre>
    image -> <img ... />
    ...
```

## Acceptance Criteria
1. Frontend pokazuje post tak, jak redaktor widzi go w edytorze (w granicach runtime stylow).
2. Legacy posty dalej dzialaja.
3. Preview route renderuje ten sam pipeline co published route.
4. Testy runtime przechodza.
