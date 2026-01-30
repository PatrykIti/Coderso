# TASK-081-02: SEO Service and Audit Runner
# FileName: TASK-081-02_SEO_Service_and_Audit.md

**Priority:** High  
**Category:** CMS/SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-081-01  
**Status:** To Do

---

## Overview

Implement SEO service methods and a lightweight audit scorer.

## Service API

Create `core/services/seo/seoService.ts`:
- `listSeoDocuments()`  
- `getSeoDocument(id)`  
- `getSeoDocumentByTarget(targetType, targetId)`  
- `upsertSeoDocument(input)`  
- `runSeoAudit(targetType?, targetId?)`

### Audit logic (v1)

Compute a simple score and issues array:
- Title length 30–60 → +40
- Description length 70–160 → +40
- Canonical URL present → +10
- Robots tag present → +10

Issues array example:
```json
[
  { "code": "title_missing", "severity": "error", "message": "Missing title." },
  { "code": "description_short", "severity": "warning", "message": "Description too short." }
]
```

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/seo/seoService.ts` | CRUD + audit scorer |
| `core/services/seo/seoTypes.ts` | Shared types (Issue, Status) |
| `tests/unit/seo/seoService.test.ts` | CRUD + audit scoring |

## Documentation Updates Required

- `_docs/CMS_API.md` (audit behavior summary).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-service.md`
