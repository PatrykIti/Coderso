# TASK-062-02: Stable Heading Anchor IDs and Linking
# FileName: TASK-062-02_Stable_Heading_Anchor_IDs_and_Linking.md

**Priority:** High  
**Category:** Core/Editor + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-062-01  
**Status:** Done (2026-02-23)

---

## Overview
Zapewnic stabilne i deterministyczne `anchorId` dla naglowkow, aby linki TOC byly stale i przewidywalne.

---

## Sub-Tasks
1. Dodac `anchorId` do heading contract (block heading + writing-canvas heading).
2. Wprowadzic generator `anchorId`:
   - slugify tekstu naglowka,
   - deduplikacja (`intro`, `intro-2`, `intro-3`),
   - fallback do node/block id.
3. Zaimplementowac reconcile przy edycji:
   - zmiana tekstu naglowka aktualizuje anchor deterministycznie,
   - reczny custom anchor (jezeli ustawiony) nie jest nadpisywany.
4. Dodac rendering `id` na headingach runtime.
5. Dodac opcjonalne pole `Anchor ID` w details panel dla naglowka.

---

## Files to Create / Change
- `core/services/posts/editor/postBlockDocument.ts`
- `core/services/posts/editor/postBlockNormalizer.ts`
- `core/services/posts/editor/postHeadingAnchors.ts` (new)
- `core/services/posts/runtime/postBlockRuntimeMapper.ts`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `tests/unit/posts/post-block-normalizer-writing-canvas.test.ts`
- `tests/unit/posts/post-block-runtime-renderer.test.tsx`
- `tests/unit/posts/post-heading-anchors.test.ts` (new)

---

## Pseudocode
```ts
function buildAnchorId(rawText: string, used: Set<string>, fallbackId: string): string {
  const base = slugify(stripHtml(rawText)) || slugify(fallbackId) || "section";
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function reconcileHeadingAnchors(document) {
  const used = new Set<string>();
  forEachHeading(document, (heading) => {
    if (heading.anchorId && isValidAnchor(heading.anchorId)) {
      heading.anchorId = dedupeAnchor(heading.anchorId, used);
    } else {
      heading.anchorId = buildAnchorId(heading.text, used, heading.id);
    }
  });
}
```

---

## Acceptance Criteria
1. Kazdy heading ma stabilny `anchorId` po normalizacji.
2. Runtime naglowki maja `id="<anchorId>"`.
3. Duplicate heading texts nie tworza konfliktu anchorow.
4. TOC linki zawsze trafiaja w istniejacy target.

---

## Testing Requirements
- Unit: anchor generator i dedupe rules.
- Unit: runtime heading render with `id`.
- Integration: edit heading text -> anchor remains deterministic.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (heading schema with `anchorId`)
- `_docs/ARCHITECTURE.md` (anchor reconciliation flow)
