# 666. TASK-179 surface hints inspection closure

Date: 2026-04-17
Version: unreleased
Tasks: TASK-179, TASK-179-06

## Key Changes

### Assistant/Core

- Closed the `LLM Guide` surface hints, filters, and inspection UX wave.
- Natural UI/surface language is represented as `surfaceHint` and allowlisted filters instead of being treated as resource target names.
- Provider guidance, resolver behavior, UI copy, live prompt matrix, cache refresh, and conversation persistence are aligned.

### Docs/QA

- Synchronized task board and changelog closure.
- Source-of-truth docs describe surface hints, filters, read-only inspection, assistant cache invalidation, and browser-local conversation persistence.
- Final targeted checks and OpenAI/OpenRouter live smokes passed during the implementation leaves.
