# TASK-171-01-01: Docs and Runtime Context Budgeting
# FileName: TASK-171-01-01_Docs_and_Runtime_Context_Budgeting.md

**Priority:** High  
**Category:** Core/Assistant + Context Budgeting  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171-01  
**Status:** Done (2026-04-12)

---

## Overview

Define deterministic context budgets for provider planning so docs evidence, runtime snapshot, and resource catalog summaries remain useful but bounded.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const contextBudget = {
  docs: takeTopSections(evidence, { maxDocs: 5, maxCharsPerDoc: 1200 }),
  resources: clampResourceCatalog(catalog, { maxItemsPerGroup: 20 }),
  runtime: pickRuntimeFields(snapshot, ["route", "area", "selectedResource"]),
};

return stableSerializeForProvider(contextBudget);
```

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/adminContextTypes.ts`
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`
- new `tests/vitest/assistant/provider-planning-context.test.ts` if helper is extracted

## Security Contract

- Visibility: internal planning only.
- Auth model: admin session.
- RBAC: uses already-authorized plan context.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: only normalized context fields can enter the package.
- Anti-abuse: bounded prompt size protects provider usage.
- Idempotency: not applicable.
- Secret handling: runtime snapshot remains advisory and excludes user PII/raw permissions/session data.

## Testing Requirements

- Vitest:
  - deterministic ordering,
  - truncation flags,
  - context fields limited to allowed summary fields.
- Bun:
  - not required unless route-owned enrichment is changed.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Provider context has explicit docs/resource/runtime budgets.
2. Serialization is stable across test runs.
3. Over-budget context is truncated rather than rejected late.

## Completion Notes (2026-04-12)

- Added deterministic budgets for docs evidence and resource catalog groups.
- Runtime context packaging includes route, area/module, selected resource, and visible action hints only.
- Added Vitest coverage for truncation warnings and stable bounded output.
