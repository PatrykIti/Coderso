# 199-2026-02-09 - Assistant API doc navigator runtime

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-03, TASK-101

## Summary
- Added Assistant docs-only runtime API with status/chat/reindex endpoints and deterministic response flow.

## Key Changes
- Core/Assistant: Added `assistantService` with input sanitization, mode fallback (`llm-rag` -> `docs-only`), docs index orchestration, and reindex result contract.
- Core/API: Added `/assistant/status`, `/assistant/chat`, `/assistant/reindex` routes with RBAC and requestId-aware error mapping.
- Core/API: Registered assistant routes in the global route registry.
- Core/Startup: Added optional boot-time docs reindex initialization via `assistant.docs.reindexOnBoot`.
- Validation: Added assistant JSON schemas for chat and reindex payloads.
- Tests: Added unit tests for assistant service and integration route tests for endpoint wiring, payload flow, and error mapping.
- Docs: Updated `_docs/CMS_API.md` and `_docs/SECURITY_SPEC.md` with real runtime contracts.
