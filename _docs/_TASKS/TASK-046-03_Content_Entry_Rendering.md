# TASK-046-03: Content Entry Rendering Templates
# FileName: TASK-046-03_Content_Entry_Rendering.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-046-02  
**Status:** 🟡 To Do

---

## Overview

Dodaj **user‑friendly** sposób renderowania content entries (blog/news/produkty) bez kodu:

1. **List Template** (dla listy wpisów)
2. **Detail Template** (pojedynczy wpis)

Szablony wybierane z UI jako **Page Builder pages** (re-użycie istniejących widgetów).

---

## Data Mapping

Do renderu detail page przekazujemy `entry` do widgetów jako kontekst:
```ts
{
  entry: { title, slug, data, publishedAt, author, tags }
}
```

W Page Builder wprowadzamy możliwość użycia **dynamicznych field placeholders**:
- `{{entry.title}}`
- `{{entry.data.body}}`

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Renderer | `core/site/entryRenderer.tsx` | render detail + list |
| Widgets | `core/widgets/renderers/widgetRenderer.tsx` | support `context` |
| Builder | `core/admin/ui/pages/builder` | placeholder support |
| Services | `core/services/content/entryService.ts` | listPublishedEntries |
| Tests | `tests/unit/site/entryRenderer.test.tsx` | render sample |

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/WIDGETS.md` (dynamic placeholders)
- `_docs/_CHANGELOG/<new>.md`
