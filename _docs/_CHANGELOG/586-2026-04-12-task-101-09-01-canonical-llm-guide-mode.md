# 586. TASK-101-09-01 canonical LLM Guide mode

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09, TASK-101-09-01, TASK-101-09-01-01

## Key Changes

### Mode Contract
- Switched canonical assistant mode transport/settings/client values to `llm-guide`.
- Kept `llm-rag` only as a legacy input alias that normalizes to `llm-guide`.
- New settings and user settings writes persist `llm-guide`.

### Runtime
- Assistant chat responses now report `llm-guide` for requested/effective LLM Guide mode.
- Legacy stored global/user assistant mode values are normalized and migrated on read.
- Docs-only remains read-only and separate from LLM Guide action planning.

### Validation
- Added/updated assistant service and settings tests for canonical mode plus legacy alias normalization.
- Revalidated assistant route, UI panel/client, quota, settings, and DB-backed settings suites.
