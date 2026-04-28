# 083 - SEO manager core and UI

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-027, TASK-027-01, TASK-027-02, TASK-027-03, TASK-027-04

## Key Changes

### CMS/SEO
- Added `seo_documents` table with audit score, status, and issues.
- Implemented SEO service (upsert, list, audit scoring).
- Added `/seo` and `/seo/audit` endpoints with validation.

### Admin/UI
- Wired SEO Manager UI to live API data (list, edit, audit).
- Added loading/error states for SEO screens.

### Tests
- Added SEO service and schema tests (DB-backed when available).
- Added SEO routes and admin client tests.

### Docs
- Updated `_docs/CMS_API.md` and `_docs/ARCHITECTURE.md` with SEO manager details.
