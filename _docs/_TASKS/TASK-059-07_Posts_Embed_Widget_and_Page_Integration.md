# TASK-059-07: Posts Embed Widget and Page Integration
# FileName: TASK-059-07_Posts_Embed_Widget_and_Page_Integration.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-05  
**Status:** Done (2026-02-22)

---

## Overview
Dodac dedykowany widget do osadzania listy postow na stronach, z prostym UX dla nietechnicznych userow (bez koniecznosci budowania listing query od zera).

## Security Contract
- **Visibility:** widget runtime `public_read`
- **Auth path:** brak (frontend read)
- **Rate-limit bucket:** `public_read`
- **Write operations:** brak
- **Data exposure:** tylko pola publiczne opublikowanych postow poza preview mode

## Scope
1. Nowy widget np. `posts-feed`:
   - konfiguracja: source (`latest`, `featured`, `category`, `manual`),
   - `limit`, `sort`, opcjonalny `showExcerpt/showAuthor/showDate`.
2. UI edytora:
   - schema + prawa kolumna konfiguracji widgetu,
   - sensowne domyslne ustawienia.
3. Runtime renderer:
   - pobranie postow z nowego posts service,
   - stabilny output HTML + parity preview/published.
4. Integracja z page builder:
   - widget dostepny na liscie widgetow,
   - jasna etykieta/opis dla usera.

## Files Created / Changed
- `core/widgets/core/postsFeed.tsx` (new)
- `core/services/content/postsFeedResolver.ts` (new)
- `core/server/publicSite.tsx` (runtime hydration for `posts-feed`)
- `core/widgets/core/index.ts` (core widget registration + metadata)
- `core/widgets/runtime.tsx` (runtime registry wiring)
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (new)
- `core/admin/ui/widgets/editors/index.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/modulePackMatrix.ts` (listings pack includes `posts-feed`)
- `tests/unit/widgets/postsFeedWidget.test.tsx` (new)
- `tests/unit/site/publicRenderer.test.tsx` (added `posts-feed` case)

## Final Pseudocode
```ts
registerWidget({
  type: "posts-feed",
  schema: postsFeedSchema,
  render: PostsFeedBlock // mapped internally to ContentListBlock for deterministic UI parity
});

resolvePostsFeedRuntimeData(input, { preview, contentRoutes }) {
  posts = listPosts();
  visible = preview ? posts : posts.filter(status==="published");
  filtered = sourceModeFilter(visible, source.mode, source.category, source.manualPostIds);
  ordered = source.mode==="manual" ? keepManualOrder(filtered) : sort(filtered, source.sort);
  return mapToRuntimeItems(ordered.slice(0, source.limit));
}
```

## Acceptance Criteria
1. Uzytkownik moze osadzic posts na stronie przez dedykowany widget.
2. Widget dziala w preview i publish mode.
3. Domyslny flow jest prosty (latest posts bez dodatkowej konfiguracji).
4. Testy widget/runtime przechodza.

## Testing Requirements
- Unit:
  - schema normalization + resolver conditions.
- Integration:
  - page runtime render with embedded posts widget.

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/site/publicRenderer.test.tsx tests/unit/widgets/modulePackMatrix.test.ts tests/unit/widgets/contentList.test.tsx`

## Documentation Updates Required
- `_docs/_WIDGETS` (nowy kontrakt widgetu)
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

## Completion Notes
- Added user-friendly `posts-feed` widget with source modes:
  - `latest`, `featured`, `category`, `manual`.
- Runtime hydration is server-side via dedicated resolver (`postsFeedResolver`) and keeps preview/published parity.
- Rendering reuses `ContentListBlock` to keep deterministic output/state markers and avoid style regressions.
