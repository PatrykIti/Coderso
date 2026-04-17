# 657. TASK-178 model capability structured output

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-07-02

## Key Changes

### Assistant/Core

- Added provider-agnostic response contracts to the assistant provider request.
- Added model capability resolution for provider/model-family structured output strategy.
- Added strict JSON Schema builder for CMS operation drafts.
- OpenRouter provider now maps generic JSON Schema contracts to `response_format`.

### Assistant/QA

- Live OpenRouter planner smoke now runs with the capability-driven structured output path.
- Added coverage for model capability selection and OpenRouter response contract payload mapping.

### Security

- Structured provider output still flows through strict local `CmsOperationDraft` validation, target resolution, and final action plan validation.
- Provider-specific structured output details stay inside provider adapters, not planner orchestration.
