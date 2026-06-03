# TASK-349-02: SEO Audit Scope and Scoring Recalculation Contract
# FileName: TASK-349-02_SEO_Audit_Scope_and_Scoring_Recalculation_Contract.md

**Priority:** High
**Category:** SEO + API + Service + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-349-01
**Status:** Done (2026-06-01)

---

## Overview

Make SEO audit and save scoring deterministic. The report shows two contract
gaps:

- Saving title/description returns stale score/issues.
- Audit checkboxes are visual only and are not included in the audit request.

## Sub-Tasks

- Extract score/status/issue calculation into a reusable pure helper.
- Recompute score/status/issues when `updateSeoDocumentById` changes fields, or
  run a scoped audit after save and return the audited row.
- Define a strict `SeoAuditCheckId` enum for dialog checks.
- Track selected checks in `SeoAuditDialog` state.
- Send selected checks through `seoClient.runSeoAudit`.
- Extend `seoAuditSchema` and `runSeoAudit` only if scoped checks are product
  supported; otherwise remove/disable the checkboxes with truthful copy.

## Files To Change

| File | Required change |
|---|---|
| `core/services/seo/seoService.ts` | Extract reusable scoring helper and reuse it on save/audit. |
| `core/services/seo/seoTypes.ts` | Add audit check ID types if persisted/service-owned. |
| `core/server/validation/seoSchemas.ts` | Strictly validate selected audit checks and reject unknown fields. |
| `core/server/routes/seoRoutes.ts` | Pass selected checks to `runSeoAudit` and map known SEO errors. |
| `core/admin/services/seoClient.ts` | Type the audit payload and serialize selected checks. |
| `core/admin/ui/seo/SeoAuditDialog.tsx` | Convert checkboxes to controlled state and pass selected IDs. |
| `core/admin/ui/seo/SeoManagerPage.tsx` | Forward selected checks and refresh from audited results. |
| `tests/unit/seo/seoService.test.ts` | Cover save recalculation and scoped audit helper behavior. |
| `tests/unit/seo/seoSchema.test.ts` | Cover strict check ID validation. |
| `tests/vitest/ui/seo-manager.test.tsx` | Assert toggled checks appear in the outgoing payload. |

## Implementation Pseudocode

```ts
const seoAuditCheckIds = ["meta", "og", "links", "performance"] as const;
type SeoAuditCheckId = (typeof seoAuditCheckIds)[number];

function scoreSeoDocument(input: SeoScoreInput, checks: SeoAuditCheckId[] = ["meta"]) {
  const issues: SeoIssue[] = [];
  let score = 0;
  if (checks.includes("meta")) {
    score += titleScore(input.title, issues);
    score += descriptionScore(input.description, issues);
  }
  if (checks.includes("links")) score += canonicalScore(input.canonicalUrl, issues);
  // Unsupported checks must be explicit: either no-op with warning or not selectable.
  return { score, status: deriveStatus(issues), issues };
}

async function updateSeoDocumentById(id, input) {
  const next = mergeExisting(input);
  const analysis = scoreSeoDocument(next, defaultSaveChecks);
  return update row with next fields and analysis;
}
```

Data flow:

- Dialog selected checks -> client payload -> route validation -> service audit.
- Save path computes the same issue/status vocabulary as audit path.
- Admin table/drawer refresh from the returned/current row after save.

Error handling:

- If no audit checks are selected, return `seo_audit_checks_required` or keep at
  least one required check selected in the UI.
- If an unsupported check remains in the UI, the route must reject it before the
  service runs.
- Known service errors must map to user-safe `ApiError` codes at the route
  boundary.

Regression-test shape:

- Toggle off `performance`, run audit, assert payload excludes it.
- Save a valid title/description and assert score/status/issues change in the
  returned row.
- Submit an unknown audit check and assert a 400 validation error.

## Security Contract

- Endpoint visibility: internal admin `/admin/api/seo/audit` and
  `/admin/api/seo/:id`.
- Auth model: session cookie.
- RBAC: `content:read` for audit, `content:write` for save.
- CSRF: required for POST/PATCH.
- Rate-limit bucket: `admin_write` for POST/PATCH.
- Reject-unknown validation: `additionalProperties: false`; selected checks are
  an enum array with bounded length.
- Anti-abuse: no public write.
- Secret handling: audit diagnostics must not expose backend-only settings or
  secrets in issues.

## Testing Requirements

- `bun test tests/unit/seo/seoService.test.ts tests/unit/seo/seoSchema.test.ts`
- `bun test tests/integration/routes/seo.test.ts`
- `bun run test:vitest -- tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update SEO report with scoring and audit-scope resolution.
- Update `_docs/CMS_API.md` because `/seo/audit` is already a documented admin
  endpoint and the payload/response semantics change.

## Acceptance Criteria

- SEO save does not return stale score/issues.
- Audit checkboxes are controlled and affect the request, or are removed/marked
  unavailable with disabled semantics.
- Unknown audit checks are rejected.
- Route registration and `mapSeoError` / validation-error coverage prove
  machine-readable failures at the API boundary.
- Service error codes stay machine-readable and route-mapped.

## Closure Notes

Done (2026-06-01): scoring is shared by save and audit paths, partial PATCH
preserves omitted canonical/robots fields, audit checks are strict
`meta | links | robots`, and route validation/error tests cover unknown checks
and scoped-target failures.
