# 658. TASK-178 evaluation fixture matrix

Date: 2026-04-17
Version: unreleased
Tasks: TASK-178-07

## Key Changes

### Assistant/QA

- Added CMS operation fixture matrix for generic `LLM Guide` planning.
- Covered pages, entries, content types, custom screens, forms, listings, widget templates, menu items, SEO documents, media unsupported gaps, and unsafe provider drafts.
- Fixture runner uses the same local/provider planner functions used by `/assistant/actions/plan`.

### Validation

- Revalidated targeted assistant Vitest suites, Bun route/executor smoke tests, and opt-in OpenRouter/OpenAI live planner smokes.
- Documented media attach/update as an unsupported generic mutation gap that returns `needs_input`.
