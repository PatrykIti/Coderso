# 235-2026-02-18 - Coderso listing templates model and service

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-03

## Key Changes
- Core/DB: Added `listing_templates` table to schema and migration `0037_listing_templates.sql` (slug/layout/updatedAt indexes).
- Core/Content: Added `listingTemplatesService` with normalized config contract (`fields`, `itemActions`, `emptyState`, `style`) and CRUD helpers.
- Core/Security: Added config validation for field-path safety and action/URL constraints.
- Tests: Added unit coverage for template config normalization and DB-conditional CRUD flow.
