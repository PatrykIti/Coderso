# TASK-046-04: SSR Cache & Revalidation
# FileName: TASK-046-04_SSR_Cache_Revalidation.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-046-02  
**Status:** ✅ Done — 2026-02-03

---

## Overview

Dodaj cache HTML dla publicznych stron, aby przyspieszyć rendering.

### Wymagania
- Memory cache (LRU)
- TTL konfigurowalne (np. 30s default)
- Revalidate po publish/unpublish (invalidate entry/page)

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Cache | `core/site/cache/siteCache.ts` | LRU + TTL |
| Router | `core/server/publicSite.tsx` | cache lookup/store |
| Events | `core/services/pages/pageService.ts` | invalidate on publish |
| Settings | `site.cacheTtlSeconds` | config |
| Tests | `tests/unit/site/cache.test.ts` | TTL + invalidate |

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
