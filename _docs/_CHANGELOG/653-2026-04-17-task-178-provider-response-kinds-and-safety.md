# 653. TASK-178 provider response kinds and safety

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-03, TASK-178-03-03, TASK-178-03-04, TASK-178-03-05

## Key Changes

### Assistant/Core

- Added strict planner `responseKind` metadata for docs guidance, inspection, action plans, needs-input, and gated responses.
- `LLM Guide` docs-style prompts can now return a planner docs response without opening an action review.
- Provider operation drafts continue through strict local validation, target resolution, and final action plan schema before any dry-run or execute path.

### Admin/UI

- `AssistantPanel` renders `responseKind=docs` planner responses as normal assistant messages.
- Inspection plans still render candidate matches without execution controls.

### Validation

- Added schema and planner coverage for docs response kinds.
- Added provider safety fixtures for malformed JSON, invented targets, broad destructive prompts, and unsafe action drafts.
- Revalidated assistant plan route smoke coverage.
