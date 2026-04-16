# TASK-178-02: CMS Resource Registry and Target Resolver
# FileName: TASK-178-02_CMS_Resource_Registry_and_Target_Resolver.md

**Priority:** High
**Category:** Assistant/Core + CMS Resource Contracts
**Estimated Effort:** Large
**Dependencies:** TASK-178-01, TASK-101-09-02-02, TASK-174-02
**Status:** To Do

---

## Overview

Create a generic CMS resource registry used by the planner to resolve user language into resource families and safe target candidates.

The registry must cover the whole admin CMS surface instead of hardcoding custom screens, pages, forms, etc. Each resource family declares aliases, fields, identity keys, safe read summaries, supported operations, required permissions, and typed action mapping hooks.

## Sub-Tasks

No child task files.

## Architecture

Introduce a `CmsResourceRegistry` concept with entries such as:

- `page`,
- `entry`,
- `content-type`,
- `custom-screen`,
- `widget-template`,
- `listing-query`,
- `listing-template`,
- `form`,
- `menu-item`,
- `seo-document`,
- `media`,
- `settings-surface`,
- `solution-kit`.

Each registry entry should own:

- natural-language aliases in English and Polish,
- catalog source and detail hydrator,
- stable identity fields (`id`, `name`, `slug`, route),
- target matching rules (`exact`, `prefix`, `contains`, active route),
- ambiguity policy,
- supported operations,
- permission model,
- redaction rules.

Target resolution must return one of:

- exact target,
- candidate list,
- no match,
- ambiguous match,
- unsupported resource/operation.

## Integration with Current Code

- Build the registry on top of existing server-side catalog builders:
  - `core/services/assistant/adminContextCatalogs.ts`
  - `core/services/assistant/adminContextCatalogNormalizer.ts`
  - `core/services/assistant/adminContextTypes.ts`
- Reuse current active context hydration:
  - `core/services/assistant/activeSurfaceHydration.ts`
  - `core/services/assistant/adminContextService.ts`
- Do not add resource-specific API routes for assistant lookup unless an existing domain service cannot provide a bounded summary.
- Registry permissions must align with `core/services/assistant/actionFamilyContracts.ts`.
- Target resolver output feeds the generic action mapper from `TASK-178-05`; it must not build executable actions directly except through that mapper.

## Files to Change

- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/activeSurfaceHydration.ts`
- `core/services/assistant/cmsResourceRegistry.ts` (new)
- `core/services/assistant/cmsTargetResolver.ts` (new)
- `core/services/assistant/actionFamilyContracts.ts`
- `tests/vitest/assistant/cms-resource-registry.test.ts` (new)
- `tests/vitest/assistant/cms-target-resolver.test.ts` (new)
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Acceptance Criteria

1. Registry covers at least pages, entries, content types, custom screens, widget templates, listing queries/templates, forms, menus, SEO documents, media, and settings surfaces.
2. Resource aliases work in Polish and English without hardcoding each prompt phrase in `actionPlannerService.ts`.
3. Target resolver returns exact, candidates, no-match, ambiguous, or unsupported outcomes.
4. Destructive ambiguous matches never auto-select.
5. Server-side resource summaries stay bounded and redacted.

## Security Contract

- Visibility: internal-only through assistant action planning.
- Auth model: existing admin session.
- RBAC:
  - each registry family declares required read permissions,
  - route layer applies read permissions before catalog/detail hydration,
  - client context never authorizes target resolution by itself.
- CSRF: existing action plan endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: registry target queries reject unknown fields.
- Anti-abuse:
  - provider-supplied ids are re-resolved against server-side catalog/details,
  - ambiguous destructive operations never auto-select,
  - broad targets require explicit count or user confirmation.
- Secret handling: resource summaries must exclude submissions, credentials, secret settings, tokens, cookies, signed URLs, and private provider config.

## Testing Requirements

- Vitest tests for registry alias matching and target ranking.
- Vitest tests for ambiguity and no-match outcomes.
- Bun route tests for permission enforcement when resource catalogs/details are requested.
- Redaction tests for resource summaries.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- task/changelog entries on completion
