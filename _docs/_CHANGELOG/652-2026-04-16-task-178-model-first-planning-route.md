# 652. TASK-178 model-first planning route

Date: 2026-04-16
Version: unreleased
Tasks: TASK-178-03-01, TASK-178-03-02

## Key Changes

### Assistant/UI

- `LLM Guide` mode now routes prompts through `/assistant/actions/plan` by default.
- `docs-only` mode remains on the assistant chat route.
- Removed the browser-side keyword gate as the primary LLM Guide router.

### Assistant/Core

- Provider planning packages now include CMS registry capabilities and bounded page summaries.
- Provider JSON is first validated as a strict CMS operation draft and resolved locally before producing inspection/action/needs-input plans.
- Existing provider action-plan draft compatibility remains as fallback.

### Validation

- Added interaction coverage for CMS inspection prompts routing through action planning.
- Added provider fixture coverage for CMS operation draft output.
