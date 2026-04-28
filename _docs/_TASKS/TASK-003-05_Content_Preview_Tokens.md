# TASK-003-05: Content Preview Tokens
# FileName: TASK-003-05_Content_Preview_Tokens.md

**Priority:** Medium  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-003-03, TASK-002-03  
**Status:** Done (2026-01-28)  

---

## Overview

Enable preview links for content entries, reusing the existing preview token system. Preview tokens allow viewing draft entries without publishing.

**Base URL note:** Preview URL uses `PUBLIC_BASE_URL` (ENV) as fallback.
Docelowo ma korzystac z `site.baseUrl` w settings (TASK-100).

## Sub-Tasks

1. Reuse `preview_tokens` table and `previewService` for entries.
2. Add entry preview endpoint to generate token and preview URL.
3. Ensure token validation checks entry type + slug.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/content/entryService.ts` | integrate `createPreviewToken` | include entry context |
| `core/server/routes/contentEntryRoutes.ts` | `POST /content/:type/entries/:id/preview` | return `previewUrl` |
| `core/services/pages/previewService.ts` | ensure generic token helpers | shared with entries |
| `core/admin/ui/entries/` | add preview action hook | wire in TASK-003-06 |

## Response Example

```json
{
  "token": "<raw-token>",
  "previewUrl": "/admin/preview?type=content&entry=<id>&token=<raw-token>",
  "expiresAt": "2025-01-01T12:00:00Z"
}
```

## Testing Requirements

- Extend `tests/unit/pages/previewService.test.ts` or add `tests/unit/content/previewTokens.test.ts`.
- Validate token generation + expiry for entries.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
