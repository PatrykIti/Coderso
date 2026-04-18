# TASK-184-12: Store, Themes, Dashboard, and Analytics Live Matrix
# FileName: TASK-184-12_Store_Themes_Dashboard_and_Analytics_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Store/Visual/Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter coverage for Admin UI navigation surfaces:

- Dashboard
- Plugin Store
- Admin UI Theme
- Analytics

These surfaces are not all mutable CMS resources, so the live matrix must distinguish read-only guidance, safe recommendations, and typed operations.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Dashboard:
  - ask for current health/summary widgets,
  - verify assistant returns read-only guidance or inspection without execute controls.
- Plugin Store:
  - search plugin catalog by name/category/tag,
  - inspect plugin details and compatibility,
  - install/update/remove only if existing plugin store typed action contracts support it; otherwise gated.
- Admin UI Theme:
  - search theme profiles/templates,
  - update theme profile/template only through existing admin theme contracts,
  - verify tokens/routes changes are bounded and no unrelated profiles change.
- Analytics:
  - ask for traffic/content summaries by date/source,
  - verify read-only analytics responses do not expose mutation controls.

## Files to Change

- New live test file for store/themes/dashboard/analytics.
- Shared live fixture helper.
- Resource catalog/context builders if these surfaces are not currently exposed.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: plugin/theme/settings permissions remain authoritative.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: plugin/theme actions must be strict or gated.
- Anti-abuse: plugin install/remove must not run without explicit typed action and review.
- Secret handling: no plugin credentials, analytics PII, provider keys, or privileged settings in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - dashboard/analytics are read-only unless explicit typed action exists,
  - plugin/theme prompts do not invent unsupported mutations,
  - theme edits preserve unrelated profiles/routes.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md` if plugin contracts are documented
- `_docs/ADMIN_CACHE.md` if theme/plugin cache events are added
- `_docs/_TASKS/README.md`
- changelog on completion
