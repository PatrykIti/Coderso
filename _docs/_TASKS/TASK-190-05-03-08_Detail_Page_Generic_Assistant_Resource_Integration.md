# TASK-190-05-03-08: Detail Page Generic Assistant Resource Integration
# FileName: TASK-190-05-03-08_Detail_Page_Generic_Assistant_Resource_Integration.md

**Priority:** High
**Category:** Assistant/Core + Policy + Resource Context
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-05, TASK-190-05-03-07, TASK-190-06-03-03, TASK-190-07-02
**Status:** Done (2026-05-10)

---

## Overview

Promote `detail-page` into the generic assistant resource layer only after the
base detail-page document contract, reviewed assistant action, admin API, and
bounded catalog/context seams already exist.

This leaf is intentionally separate from the first `detail-page.upsert`
promotion. The base composer/runtime/admin flow should be able to ship without
pretending that `detail-page` is already a generic CMS resource family in
policy, provider guidance, follow-up context, and target resolver flows.

Completion note (2026-05-10):
- `detail-page` is now part of the strict generic CMS operation draft vocabulary
  and assistant operation policy.
- Provider guidance can describe `detail-page` as a resource family, but generic
  `detail-page` mutations stay gated and cannot bypass local action assembly.
- Bounded server-derived `detailPages` summaries are packaged in provider
  planning context without narrowing existing pages/posts/entries/media/commerce
  / solution-kit groups.
- Target resolution accepts trusted detail-page ids, stable `contentTypeId`,
  exact route/content-type linkage, or active detail-page surface context only;
  prompt-only free-text names do not become mutation targets.
- Request validation still rejects client-supplied `context.resourceCatalog`;
  `includeResourceCatalog=true` remains the server-owned enrichment flag.

## Sub-Tasks

No child task files.

## Scope

This leaf owns the later generic assistant integration for `detail-page`:

- add `detail-page` to the generic assistant resource vocabulary,
- expose bounded `detail-page` summaries through the resource catalog package,
- allow trusted `detail-page` lookup through policy + target resolver,
- extend provider guidance/package metadata so providers can describe
  `detail-page` as a resource family,
- keep execution on the existing `detail-page.upsert` action path.
- preserve current generic resource breadth while adding `detail-page`: pages,
  posts, entries, media, commerce, solution kits, content types, custom screens,
  listings, forms, menus, SEO documents, and widgets must not be accidentally
  narrowed or dropped from the resource catalog/provider package.

This leaf does **not**:

- create the detail-page runtime,
- create the detail-page admin CRUD/revision API,
- create the initial reviewed `detail-page.upsert` action,
- invent fuzzy prompt-only lookup or a second detail-page executor path.

## Files to Change

- Update `core/services/assistant/cmsOperationDraftSchema.ts`
- Update `core/services/assistant/operationPolicy/cmsResourcePolicies.ts`
- Update `core/services/assistant/operationPolicy/resolverPolicy.ts`
- Update `core/services/assistant/cmsTargetResolver.ts`
- Update `core/services/assistant/providerPlanningContext.ts`
- Update `core/services/assistant/actionPlanTypes.ts` only if generic assistant
  metadata needs a detail-page label/helper seam
- Update `tests/vitest/assistant/cms-target-resolver.test.ts`
- Update `tests/vitest/assistant/operation-policy-resolver.test.ts`
- Update `tests/vitest/assistant/provider-planning-context.test.ts`
- Add/extend policy coverage tests for `detail-page`
- Update `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`

Reuse rule:

- consume bounded detail-page summaries from `TASK-190-07-02`,
- consume active-surface `detail-page` context from `TASK-190-06-03-03`,
- keep `detail-page.upsert` as the only executable action path,
- keep active-surface to generic resource-kind inference in
  `operationPolicy/resolverPolicy.ts`; `cmsTargetResolver.ts` consumes that seam
  and must not add a second divergent `detail-page` inference branch,
- do not add one-off service lookups when catalog/policy seams can answer the
  same question deterministically.
- keep media integration on the existing generic media seams. This leaf does not
  introduce media uploads or media deletion; it only ensures detail-page resource
  promotion coexists with existing media summaries and media target resolution.

## Contract Direction

Expected additions:

```ts
type CmsResourceKind =
  | "page"
  | "custom-screen"
  | "detail-page"
  | "...";
```

```ts
type AssistantDetailPageSummary = {
  id: string;
  name: string;
  status: "draft" | "published";
  contentTypeId: string;
  contentTypeSlug: string;
  linkedRouteType: string | null;
  updatedAt: string | null;
  blockCount: number;
  bindingCount: number;
};
```

Rules:

- `detail-page` target resolution must come from trusted catalog ids, active
  surface identity, or exact bounded route/content-type linkage.
- bounded catalog/provider/resource joins for `detail-page` must use
  `contentTypeId` as the stable owner key; `contentTypeSlug` and
  `linkedRouteType` remain route-facing labels and compatibility data.
- generic provider planning may mention `detail-page`, but provider output
  remains operation-draft-only and cannot bypass local action assembly.
- generic assistant flows must not guess detail page ids from free-text names
  alone.
- provider/resource catalog packaging remains server-derived and redacted; adding
  `detail-page` must not make client-authored `resourceCatalog` trusted.

## Pseudocode

```ts
export const resolveDetailPageTarget = ({ activeSurface, resourceCatalog, request }) => {
  if (activeSurface?.kind === "detail-page") return byId(resourceCatalog.detailPages, activeSurface.id);
  if (request.detailPageId) return byId(resourceCatalog.detailPages, request.detailPageId);
  return null;
};

export const extendProviderPlanningContext = (context) => ({
  ...context,
  detailPages: context.resourceCatalog?.detailPages ?? [],
});
```

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing assistant admin session flow.
- RBAC: follows existing read/write permissions for content-oriented resources.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: `detail-page` resource metadata is strict.
- Anti-abuse: no prompt-only fuzzy ids, no provider-owned executor payloads, no
  second lookup path outside trusted catalog/context.
- Secret handling: catalog/package metadata stays bounded and redacted.

## Testing Requirements

- `detail-page` resource kind normalizes in the generic CMS operation draft
  contract.
- policy/provider guidance can describe `detail-page` without introducing
  executable provider actions.
- target resolver accepts trusted `detail-page` matches from bounded catalog or
  active surface context only.
- operation-policy resolver coverage keeps active `detail-page` inference on the
  existing `resolverPolicy.ts` seam instead of adding one-off target-resolver
  heuristics.
- trusted detail-page matches prefer `contentTypeId` / exact ids over mutable
  slug labels when both are available in bounded catalog data.
- missing/ambiguous detail-page lookup returns `needs_input` or no match, not a
  fuzzy mutation target.
- catalog/provider package tests prove adding `detail-page` does not remove
  existing posts, entries, media, commerce, or solution-kit groups from the
  bounded context.
- request validation still rejects client-supplied `context.resourceCatalog`.
- existing `detail-page.upsert` execution path remains unchanged.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
