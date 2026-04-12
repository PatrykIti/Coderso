# TASK-101-09-04-03: Existing Service Adapters and Installer Extraction
# FileName: TASK-101-09-04-03_Existing_Service_Adapters_and_Installer_Extraction.md

**Priority:** High
**Category:** Core/Assistant + Domain Services
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-04-02, TASK-101-09-01-03
**Status:** Done (2026-04-12)

---

## Overview

Ten leaf nie dotyczy juz laczenia site-builder flow. To zostalo zrobione w TASK-101-09-01-03:
- `site-kit.*` dziala przez `/assistant/actions/*`,
- `/assistant/site-builder/*` route/client surface jest retired,
- `siteBuilderPlanAdapter.ts` i `siteBuilderExecutor.ts` sa internal adapterami.

Pozostaly zakres to realne helper/adapter extraction gaps:
- resource-shaping logic inside assistant executor that could belong to domain services,
- page/listing/form composition helpers shared with kit installer if duplication appears,
- keeping assistant executor from growing into a third mutation layer.

## Current Code

Already done:
- assistant actions reuse domain services for content types, custom screens, listings, pages, forms, settings, audit,
- site-kit action execution delegates to `executeGuidedSiteBuilder`,
- no assistant-only direct DB writes were added for shipped actions.

Potential remaining extraction candidates:
- `buildCatalogPageData` in `actionExecutorService.ts`,
- page content-list/form-embed source resolution helpers,
- repeated listing/form/page shaping that might fit page/listing/form service helper modules,
- kit installer page/template helper reuse only if identical composition logic is needed by both sides.

## Security Contract

- Visibility: internal service helper extraction only.
- No new public endpoint.
- Auth/RBAC/CSRF/rate-limit: inherited from callers; helpers must not bypass route/domain checks.
- Secret handling: helper inputs/outputs must not include submissions, entry values beyond planned resource payloads, credentials, provider keys, sessions, or token data.
- DB: if helper extraction moves DB writes, it must remain in owning domain service and preserve existing validation/error contracts.

## Files to Change

- `core/services/assistant/actionExecutorService.ts` (shrink only where helper extraction is justified)
- possible owner modules:
  - `core/services/pages/pageService.ts` or a page composition helper,
  - `core/services/content/listingQueriesService.ts`,
  - `core/services/content/listingTemplatesService.ts`,
  - `core/services/forms/formsService.ts`,
  - `core/services/kits/kitInstaller.ts` only if shared installer helper is actually needed.
- tests:
  - Vitest for pure helper extraction,
  - Bun for DB/domain-coupled helper behavior.

## Sub-Tasks

1. Audit remaining assistant executor resource-shaping helpers after registry work.
2. Extract only helpers that have clear shared ownership or reduce executor duplication.
3. Keep helper ownership in domain/service module, not assistant-only direct DB logic.
4. Prove assistant and kit installer/site-kit paths still use equivalent resource behavior where they overlap.

## Testing Requirements

- Vitest for pure helper extraction only.
- Bun for default deps/domain-service behavior.
- Existing suites to rerun:
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - `bun test tests/unit/assistant/siteBuilderExecutor.test.ts`
  - DB-backed assistant executor tests when `DATABASE_URL` is reachable.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` only if helper ownership changes the site-kit/internal executor contract.

## Audit Notes (2026-04-12)

- Site-kit convergence is done and should not be reimplemented here.
- After registry refactor, no safe cross-domain helper extraction was identified for this slice.
- Remaining page/listing/form composition helpers are assistant-specific and should stay local until another owner needs them.
- No extra helper extraction landed to avoid a cosmetic refactor without shared ownership.
