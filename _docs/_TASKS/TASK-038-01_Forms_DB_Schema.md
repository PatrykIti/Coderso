# TASK-038-01: Forms DB Schema
# FileName: TASK-038-01_Forms_DB_Schema.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-31)

---

## Overview

Add DB tables for forms, fields, and submissions.

## Schema Design

Create tables:
- `forms` (id, name, slug, status, description, created_at, updated_at)
- `form_fields` (id, form_id, type, label, name, required, settings_json, order)
- `form_submissions` (id, form_id, payload_json, created_at, ip, user_agent, status)

Constraints:
- `forms.slug` unique
- `form_fields.form_id` FK → `forms.id` (cascade)
- `form_submissions.form_id` FK → `forms.id` (restrict)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | tables + indexes |
| `core/db/migrations/*` | drizzle migration |
| `tests/unit/forms/schema.test.ts` | basic insert + FK constraints |

## Notes

- `settings_json` holds field-specific config (min/max, options list).
- `payload_json` stores submission data (strictly validated in service).

## Documentation Updates Required

- `_docs/CMS_API.md` form schema reference.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-schema.md`
