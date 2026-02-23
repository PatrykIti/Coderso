# TASK-063-05-01: Document Stats Selectors
# FileName: TASK-063-05-01_Document_Stats_Selectors.md

**Priority:** High  
**Category:** Authoring UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-05  
**Status:** To Do

---

## Overview
Dodac selektory statystyk dokumentu (words/chars/read-time/headings/paragraphs/blocks).

---

## Scope
1. Utworzyc utility `postDocumentStats`.
2. Uwzglednic heading nodes w writing-canvas i zwykle bloki.
3. Dopisac read-time based on words per minute.

---

## Files to Create / Change
- `core/services/posts/editor/postDocumentStats.ts`
- `tests/unit/posts/post-document-stats.test.ts`

---

## Pseudocode
```ts
text = collectPlainText(document)
words = countWords(text)
readTime = ceil(words / WPM)
return stats object
```

---

## Acceptance Criteria
1. Statystyki sa deterministyczne.
2. Read-time nie zwraca blednych wartosci dla pustych dokumentow.

---

## Testing Requirements
- Unit: counters edge cases.

---

## Documentation Updates Required
- `_docs/CMS_API.md`
