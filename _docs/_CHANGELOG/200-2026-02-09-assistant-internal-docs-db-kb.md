# 200-2026-02-09 - Assistant internal docs DB knowledge base

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-08, TASK-101

## Summary
- Added DB-backed Assistant knowledge base ingest/retrieval with filesystem fallback.

## Key Changes
- Core/DB: Added Assistant KB schema in migration `0033_assistant_docs_kb.sql`:
  - `assistant_docs`
  - `assistant_doc_chunks`
  - `assistant_doc_ingest_runs`
- Core/Assistant: Added `docsIngestService` to parse `_docs/_internal` markdown with frontmatter contract, validate sections, chunk content, upsert docs/chunks, and persist ingest run logs.
- Core/Assistant: Added `docsDbRetriever` with deterministic BM25-like ranking and snippet generation compatible with existing answer composer contract.
- Core/Assistant: Updated `assistantService` to:
  - select backend by `assistant.docs.backend` (`filesystem` or `db`)
  - run DB reindex via ingest pipeline (`assistant.docs.sourceRoot`)
  - use DB retrieval first and fallback to filesystem when DB is empty/unavailable
  - expose runtime status/reindex metrics across both backends
- Core/Startup: Boot reindex now supports both backends when `assistant.docs.reindexOnBoot=true`.
- Tests: Added unit coverage for ingest parser/validator/chunking, DB retriever ranking, and DB backend behavior in assistant runtime service.
- Docs: Updated architecture/settings/API/security docs to reflect DB knowledge base flow and new assistant settings keys.
