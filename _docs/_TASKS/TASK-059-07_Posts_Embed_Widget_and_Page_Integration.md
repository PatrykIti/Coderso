# TASK-059-07: Posts Embed Widget and Page Integration
# FileName: TASK-059-07_Posts_Embed_Widget_and_Page_Integration.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-05  
**Status:** To Do

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

## Files to Create / Change
- `core/services/widgets/registry.ts`
- `core/services/widgets/core/postsFeed/*` (new)
- `core/admin/ui/widgets/editors/*` (widget editor controls)
- `core/services/site/publicRenderer.tsx` (runtime mapping)
- `tests/unit/widgets/postsFeedWidget.test.ts`
- `tests/unit/site/publicRenderer.test.tsx` (posts-feed cases)

## Pseudocode
```ts
registerWidget({
  type: "posts-feed",
  schema: postsFeedSchema,
  render: ({ data, context }) => {
    const posts = resolvePostsFeed(data, context.preview);
    return renderPostsFeed(posts, data.layout);
  }
});
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

## Documentation Updates Required
- `_docs/_WIDGETS` (nowy kontrakt widgetu)
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
