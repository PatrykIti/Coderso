# TASK-404-01: Full Service Site Contract and Acceptance Matrix
# FileName: TASK-404-01_Full_Service_Site_Contract_and_Acceptance_Matrix.md

**Priority:** High
**Category:** Assistant + Product Contract + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-404, TASK-403
**Status:** In Progress (2026-06-04)

---

## Overview

Define the exact contract for a launch-shaped `LLM Guide` full-service site.
This leaf prevents future implementation work from treating HTTP 200 responses,
empty catalogs, or a three-page scaffold as full-site completion.

The contract must define:

- required site map,
- required public content density,
- required navigation/footer and contact conversion path,
- required SEO/OG policy,
- media gates,
- launch readiness metadata,
- failure states that must return `needs_input` or `gated`.

## Sub-Tasks

- Freeze the supported full-service site map.
- Define required generated resources and typed action families.
- Define listing/detail-route ownership for portfolio and services:
  `listing-query.upsert`, `listing-template.upsert`,
  `setting.content-route.upsert`, and `detail-page.upsert` where the current
  catalog-family owner seam is used.
- Define launch readiness metadata shape for planner/dry-run/execute review.
- Update source-of-truth docs and acceptance matrix.
- Record known gates for media upload/generation, booking, checkout, webhook
  automation, and unsupported nested widget edits.

## Files To Change

| File | Required change |
|---|---|
| `_docs/ASSISTANT_SITE_BUILDER.md` | Replace scaffold limitation note with the new target contract and still document any remaining gates. |
| `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` | Add full-service-site capability, action coverage, negative contracts, and owning test lanes. |
| `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` | Add live-provider prompts and expected readiness evidence. |
| `docs/develop/assistant.md` | Explain the full-service-site flow and trust model for contributors. |
| `core/services/assistant/blueprints/blueprintCapabilityTypes.ts` | Add metadata types only if launch readiness metadata needs typed compiler ownership. |
| `tests/vitest/assistant/*` | Add contract tests if metadata normalization or policy helpers change. |

## Implementation Pseudocode

```ts
type FullServiceSiteReadiness = {
  requiredPages: Array<"/" | "/uslugi" | "/portfolio" | "/o-nas" | "/proces" | "/referencje" | "/kontakt">;
  requiredCatalogs: Array<"portfolio-projects" | "services-directory">;
  minimumPublishedEntries: {
    "portfolio-projects": 3;
    "services-directory": 3;
  };
  requiredActionFamilies: Array<
    | "page.upsert"
    | "content-type.upsert"
    | "listing-query.upsert"
    | "listing-template.upsert"
    | "setting.content-route.upsert"
    | "detail-page.upsert"
    | "entry.sample.create"
    | "menu.item.upsert"
    | "seo.document.upsert"
    | "form.upsert"
  >;
  gates: Array<"media_upload_gated" | "booking_gated" | "checkout_gated">;
};

function normalizeFullServiceSiteReadiness(value: unknown): FullServiceSiteReadiness {
  const input = assertRecord(value);
  assertKeys(input, allowedReadinessKeys);
  return {
    requiredPages: readRequiredPages(input.requiredPages),
    requiredCatalogs: readRequiredCatalogs(input.requiredCatalogs),
    minimumPublishedEntries: readMinimums(input.minimumPublishedEntries),
    requiredActionFamilies: readActionFamilies(input.requiredActionFamilies),
    gates: readGates(input.gates),
  };
}
```

Data flow:

- Product contract lives in docs and, where needed, a pure helper/type module.
- Planner/composer leaves consume the same contract instead of duplicating
  page/action requirements.
- Acceptance matrix maps every contract requirement to a test lane.
- Portfolio/services listing and detail routing must reuse or extend the current
  catalog-family action path instead of relying on `page.upsert` alone.
- `entry.sample.create` is now a publish-capable reviewed typed action. Public
  sample content can satisfy launch readiness only when dry-run has no blocking
  conflicts and execute returns successful published sample results.

Error handling:

- Unknown readiness keys fail strict normalization.
- Unsupported required capability is documented as a gate, not silently omitted.
- Any plan missing a required launch item must be `needs_input` or visibly
  incomplete, not `ready`.

## Security Contract

- Endpoint visibility: no new endpoint in this leaf.
- Auth model: unchanged.
- RBAC: unchanged until implementation leaves add or promote actions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: readiness metadata, if added, must reject unknown
  fields.
- Anti-abuse: no public write endpoint; no nonce/signature/HMAC; no reCAPTCHA
  because this leaf is docs/contract only.
- Secret handling: docs and fixtures must not include provider keys, cookies,
  CSRF tokens, auth headers, or live prompt payloads.

## Testing Requirements

- `git diff --check`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts`
  if action family contracts or known gates change.
- Add/update focused Vitest normalization tests if a readiness helper is added.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- Docs define full-service site completion in concrete, testable terms.
- Acceptance matrix states that `/portfolio` + `/uslugi` + `/kontakt` with
  empty catalogs is not a full-service-site pass.
- Required pages, sample content minimums, nav/footer, SEO/OG, media gates, and
  E2E lanes are explicit.
- Portfolio/services listing query, listing template, content-route, and
  detail-page ownership are explicit so detail routes cannot be deferred until
  final E2E.
- Published sample-entry semantics are executable TASK-404 scope and are backed
  by schema/executor/cache tests.
- Later TASK-404 leaves can implement from this contract without rediscovering
  product scope.
