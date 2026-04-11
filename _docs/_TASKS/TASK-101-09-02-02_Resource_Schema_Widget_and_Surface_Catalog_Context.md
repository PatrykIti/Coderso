# TASK-101-09-02-02: Resource Schema, Widget, and Surface Catalog Context
# FileName: TASK-101-09-02-02_Resource_Schema_Widget_and_Surface_Catalog_Context.md

**Priority:** High  
**Category:** Core/Assistant + Coderso  
**Estimated Effort:** Large
**Dependencies:** TASK-101-09-02-01, TASK-054-22, TASK-054-16, TASK-055, TASK-059  
**Status:** To Do

---

## Overview

`LLM Guide` ma widziec nie tylko route/module, ale tez kompaktowy katalog aktualnych surface contracts, z ktorych moze bezpiecznie planowac typed actions.

Ten task nie dodaje nowego flow wykonania. Kontekst ma byc wykorzystywany przez obecny jeden flow:

```txt
/assistant/actions/plan
  -> route/module/admin snapshot
  -> resource/schema/widget/form/listing catalogs
  -> typed plan
  -> dry-run
  -> execute
```

Zakres katalogu:
- content types i najwazniejsze field/schema metadata,
- custom screens, bindings i sidebar exposure,
- listing queries i listing templates,
- forms i form fields,
- widget definitions, variants, slots, surfaces, module, complexity, audience,
- widget templates jako osobna `source: "template"` powierzchnia tylko z bezpiecznym summary.

## Current Repo Context

Istniejace minimum:
- `core/services/assistant/adminContextService.ts` buduje route/locale/area/codersoModule.
- `core/services/assistant/actionPlannerService.ts` korzysta z tego kontekstu przy refinement routing.
- `/assistant/actions/plan` przyjmuje `context.page`, `context.locale` i `context.siteKit`.

Istniejace serwisy do reuse:
- `core/services/content/typeService.ts` (`listContentTypes`)
- `core/services/customScreens/customScreenService.ts` (`listCustomScreens`)
- `core/services/content/listingQueriesService.ts` (`listListingQueries`)
- `core/services/content/listingTemplatesService.ts` (`listListingTemplates`)
- `core/services/forms/formsService.ts` (`listForms`, `listFormFields`)
- `core/services/widgets/widgetCatalogService.ts` (`buildWidgetCatalog`, `listWidgetCatalog`)
- `core/widgets/registry.ts` (`listWidgets`, `listWidgetsForSurface`)

Important implementation constraint:
- DB/runtime-backed services must not be imported by Bun-free planner/normalizer modules at import time.
- Prefer dependency injection plus lazy default deps for runtime/default catalog loading.
- Pure catalog normalization/clamping must stay Vitest-owned.

## Target Contract

Add a compact assistant resource catalog snapshot with stable schema version:

```ts
type AssistantResourceCatalogSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  budget: {
    maxItemsPerGroup: number;
    maxFieldsPerResource: number;
    truncated: boolean;
  };
  contentTypes: AssistantContentTypeSummary[];
  customScreens: AssistantCustomScreenSummary[];
  listings: {
    queries: AssistantListingQuerySummary[];
    templates: AssistantListingTemplateSummary[];
  };
  forms: AssistantFormSummary[];
  widgets: AssistantWidgetSummary[];
};
```

Summary requirements:
- stable ids/slugs/types only, no random labels,
- machine-readable field kinds and required flags where available,
- widget `type`, `category`, `module`, `complexity`, `audience`, `variants`, `slots`, `surfaces`,
- custom screen `contentTypeId`, `status`, `showInSidebar`, `sidebarLabel`, writable binding fields when already available,
- listing query source type/id, fields, sort, limit, includeDrafts summary only,
- form fields with `name`, `type`, `required`, `orderIndex`; no submissions, values, action secrets, API keys, tokens, webhook URLs, credentials, or provider configs.

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/plan`, `/assistant/actions/dry-run`, `/assistant/actions/execute`.
- New public endpoints: none.
- Auth: existing admin session.
- RBAC:
  - baseline `/assistant/actions/plan`: `settings:read` + `content:read`,
  - catalog enrichment must not expose resources beyond the actor permission envelope once TASK-101-09-02-01 permission summary is available,
  - until full permission envelope exists, only include safe structural metadata and avoid values/submissions/content entries.
- CSRF: existing POST `/assistant/actions/*` CSRF requirements remain.
- Rate limit: existing `assistant` bucket.
- Reject-unknown validation: any new request context flag, for example `context.resourceCatalog`, must be added schema-first in `assistantActionSchemas.ts` with `additionalProperties: false`.
- Anti-abuse: nonce/HMAC/reCAPTCHA are not applicable because there is no public write surface.
- Secret handling:
  - never include integration/provider API keys,
  - never include form submissions or entry content values,
  - never include webhook secrets, session data, API key plaintext/hash, or auth recovery data,
  - redact unknown config keys matching `token`, `secret`, `password`, `apiKey`, `credential`, `webhook`.
- Budget:
  - clamp item counts per group,
  - clamp field counts per resource,
  - include `truncated=true` when anything is dropped,
  - keep deterministic ordering so repeated prompts produce stable context.

## Files to Change

- `core/services/assistant/adminContextTypes.ts` (new/update, pure types)
- `core/services/assistant/adminContextCatalogNormalizer.ts` (new, pure Bun-free normalization + redaction + clamping)
- `core/services/assistant/adminContextCatalogs.ts` (new, async catalog builder with injected deps and lazy default deps)
- `core/services/assistant/adminContextService.ts` (update, attach optional resource catalog to admin context)
- `core/services/assistant/actionPlanTypes.ts` (update, context/snapshot types)
- `core/services/assistant/actionPlannerService.ts` (update, accept enriched context without direct DB imports)
- `core/server/validation/assistantActionSchemas.ts` (update if request context gains a catalog flag)
- `_docs/ARCHITECTURE.md` (update)
- `_docs/CMS_API.md` (update only if request/response context contract changes)
- `_docs/SECURITY_SPEC.md` (update)

## Pseudocode

```ts
export async function buildAssistantResourceCatalogSnapshot(
  input: AssistantResourceCatalogInput,
  deps: AssistantResourceCatalogDeps
) {
  const raw = {
    contentTypes: await deps.listContentTypes(),
    customScreens: await deps.listCustomScreens(),
    listingQueries: await deps.listListingQueries(),
    listingTemplates: await deps.listListingTemplates(),
    forms: await deps.listFormsWithFields(),
    widgets: await deps.listWidgetCatalog(),
  };

  return normalizeAssistantResourceCatalog(raw, {
    maxItemsPerGroup: input.maxItemsPerGroup ?? 50,
    maxFieldsPerResource: input.maxFieldsPerResource ?? 24,
  });
}

export async function buildAssistantResourceCatalogSnapshotWithDefaultDeps(input) {
  const [
    typeService,
    customScreenService,
    listingQueryService,
    listingTemplateService,
    formsService,
    widgetCatalogService,
  ] = await Promise.all([
    import("../content/typeService"),
    import("../customScreens/customScreenService"),
    import("../content/listingQueriesService"),
    import("../content/listingTemplatesService"),
    import("../forms/formsService"),
    import("../widgets/widgetCatalogService"),
  ]);

  return buildAssistantResourceCatalogSnapshot(input, {
    listContentTypes: typeService.listContentTypes,
    listCustomScreens: customScreenService.listCustomScreens,
    listListingQueries: listingQueryService.listListingQueries,
    listListingTemplates: listingTemplateService.listListingTemplates,
    listFormsWithFields: async () => {
      const forms = await formsService.listForms();
      return Promise.all(
        forms.map(async (form) => ({
          form,
          fields: await formsService.listFormFields(form.id),
        }))
      );
    },
    listWidgetCatalog: widgetCatalogService.listWidgetCatalog,
  });
}
```

## Sub-Tasks

- `TASK-101-09-02-02-01_Resource_Catalog_Types_and_Pure_Normalizers.md`
- `TASK-101-09-02-02-02_Resource_Catalog_Builder_and_Lazy_Default_Deps.md`
- `TASK-101-09-02-02-03_Action_Plan_Context_Enrichment_and_Route_Contract.md`
- `TASK-101-09-02-02-04_Resource_Catalog_Test_Docs_and_Closure.md`

## Test Matrix

### 1. Pure Catalog Normalizer Tests

Runner: `Vitest`

Files:
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`

Must cover:
- content type summary preserves `id`, `slug`, `name`, field names/types/required flags,
- custom screen summary preserves `id`, `name`, `contentTypeId`, `status`, sidebar flags, binding field names,
- listing query/template summaries preserve source type/id, fields, sort, limit, layout, slug,
- form summary includes field `name`, `type`, `required`, `orderIndex` and excludes submissions/action configs,
- widget summary includes type/category/module/complexity/audience/variants/slots/surfaces and omits React render/editor components,
- redaction removes secret-like keys from config snippets,
- deterministic sorting and clamp metadata work for over-budget inputs.

### 2. Catalog Builder Tests

Runner:
- `Vitest` if `adminContextCatalogs.ts` stays Bun-free through dependency injection and lazy default deps.
- `Bun` if the default deps import DB/runtime services at module load or if the test intentionally exercises runtime widget registration / DB-backed services.

Files:
- `tests/vitest/assistant/admin-context-catalogs.test.ts`
- optional `tests/unit/assistant/adminContextCatalogs.test.ts` for Bun-backed default deps smoke.

Must cover:
- builder calls injected deps once per group,
- forms are joined with their fields without leaking values,
- widget catalog is normalized through existing widget catalog service output,
- partial dependency failures produce a machine-readable warning or omitted group, not a malformed context object.

### 3. Planner/Route Integration Tests

Runner:
- `Vitest` for planner behavior when provided an already-built catalog context.
- `Bun` for `/assistant/actions/plan` route schema/permission behavior when request context contract changes.

Files:
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/integration/routes/assistant.test.ts` if route validation changes.

Must cover:
- planner accepts enriched resource catalog context without changing existing catalog/site-kit behavior,
- docs-only prompts do not trigger catalog enrichment side effects,
- unknown context fields are rejected by route validation,
- LLM Guide/site-kit guard remains intact.

### 4. Documentation/Security Validation

Runner: no runtime runner unless docs tooling exists.

Must cover manually in review:
- `_docs/ARCHITECTURE.md` documents the context snapshot boundary,
- `_docs/CMS_API.md` documents new context request/response contract if changed,
- `_docs/SECURITY_SPEC.md` documents redaction, no-secret/no-entry-values behavior, and route visibility.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts tests/vitest/assistant/actionPlannerService.test.ts --config vitest.config.ts`
- `bun test tests/integration/routes/assistant.test.ts` if `assistantActionSchemas.ts` or route enrichment changes.
- Bun-backed catalog smoke only if default deps are exercised and `DATABASE_URL` is reachable; otherwise document the DB-dependent gap.

## Acceptance Criteria

- LLM Guide receives compact structured admin resource catalogs through the existing `/assistant/actions/plan` path.
- No new public endpoint and no second assistant mutation flow is introduced.
- Planner remains import-safe for Vitest when only pure context objects are provided.
- Catalog payload is deterministic, bounded, redacted, and schema-versioned.
- Existing house-projects, generic catalog, and site-kit action tests still pass.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if the action plan context payload changes
- `_docs/SECURITY_SPEC.md`
