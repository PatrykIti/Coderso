# TASK-555-03: Internal Starter API Security and Error Mapping
# FileName: TASK-555-03-Internal-Starter-API-Security-And-Error-Mapping.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Internal API / RBAC / CSRF / Validation
**Estimated Effort:** Large
**Dependencies:** landed TASK-555-02-L03, TASK-555-06-L01, and TASK-555-06-L02
receipts; terminal TASK-414-02-L01 pure capability schema/source-adapter contract and
terminal TASK-548 route/control/composition source handoff
**Status:** ⏳ To Do

---

## Overview

Expose the unified domain through orchestration-only route factories under the
existing Solution Kits and Setup namespaces. Preserve TASK-489 run routes and the
legacy deterministic `/solution-kits/plan`, register static routes before dynamic
starter IDs, strictly reject unknown fields, centralize safe error mapping, and emit
separate pure route, Admin-control, native, cache, and smoke descriptors plus one
source adapter for later TASK-414. Replace TASK-489's generic rollback route's direct
engine call with the same server-verified lineage composite used by curated aliases.
If terminal TASK-414 lacks a required source-contribution discriminator, descriptor
authoring and this child remain externally blocked on TASK-414; no local capability
schema or compatibility discriminator is allowed.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-03-L01 | list/detail/options route factories | ⏳ To Do |
| 2 | TASK-555-03-L02 | preview/apply route factories | ⏳ To Do |
| 3 | TASK-555-03-L03 | status/validate/rollback factories, error map, composition/registration tests | ⏳ To Do |

Each leaf owns separate route/schema modules. L03 alone edits the existing
`solutionKitsRoutes.ts` and `setupRoutes.ts` composers. Their stable exported
registration names remain mounted by `routes/index.ts`, which is read-only unless
fresh terminal evidence requires a separately audited amendment.

## Route Contract

Prefixless factories mount the exact parent API matrix. Both namespaces delegate to
the same domain/read-model functions; Setup is not a second installer. Existing
`/solution-kits/runs`, `/solution-kits/runs/:runId`, and `/solution-kits/plan` remain
available and register before `/:starterId`. Generic and curated rollback routes call
`rollbackServerVerifiedSolutionKitRun`; only a source with no curated evidence may
fall through to TASK-489's engine-only dispatcher. Curated older non-head sources fail
before engine work.

Every new descriptor consumes terminal TASK-414-03-L03 `router.register`, strict
pre-body policy, and `RouteResponseV1` response policy through TASK-489's landed
handoff. No leaf reconstructs auth/body ordering or uses legacy `router.get/post` for
new routes.

TASK-555-03-L03 also validates sibling descriptors with stable IDs for the exact
fourteen routes, twelve Admin controls, native owners, cache families, and nine smoke
scenarios. Its `core:solution-kits/curated-starter-lifecycle` source adapter emits the
exact terminal discriminated contribution rows joining those descriptors to one exact
`CmsFeatureCapabilityV1`; neither the feature nor a wrapper contains invented route/
control/cache/smoke fields. Runtime routes and RBAC do not
import capability output for authorization, and this family does not generate the
final CMS capability JSON.

## Security Contract

- **Visibility:** internal `/admin/api/*` only; no public route.
- **Auth:** authenticated Admin session only; no TASK-555 API-key mode.
- **RBAC:** GET list/options/detail/status require `solution-kits:read`; persisted
  preview and validate require `solution-kits:write`; apply/rollback require
  `solution-kits:write` plus `settings:write`.
- **CSRF/rate:** every new mutation POST uses CSRF + `admin_write`; GET uses
  `admin_read`. The unchanged legacy `POST /solution-kits/plan` retains its
  terminal shared transport behavior; this family does not reclassify or exempt it.
- **Validation:** strict params/query/body schemas; starter IDs come from the closed
  registry; no body accepts package/blueprint/provider/path/URL/release overrides.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA. Session/RBAC/CSRF/rate limit,
  preview expiry/fingerprints, body limits, and service idempotency apply.
- **Privacy:** error responses are stable codes with generic text. Preview remains
  same-actor and non-enumerating; status/validation/rollback source evidence is
  administrator-wide under RBAC and validated by exact starter/release provenance.

## Collision Guard

Wait for TASK-554's route/security writer to be terminal. Do not edit TASK-414/
489/545/547/548/551/554 tasks, foreign changelogs, board/changelog indexes, assistant routes,
or another leaf's route/schema/test modules. L03 rereads the live route registry and
preserves every concurrently landed route.

## Testing Requirements

- Bun route-registration, route-order, middleware/RBAC, strict-validation, CSRF
  pipeline, error-map, and zero-service-call negative tests.
- Tests invoke both Admin and Setup aliases and prove DTO equality.
- Generic TASK-489 and curated rollback routes share one composite. Direct DB route
  coverage proves `C -> B -> A -> null`, rejects older non-heads through both route
  families, preserves exact terminal counters versus recovery `summary:null` and
  HTTP 200/202 semantics, proves terminal failed zero-net settlement clears only the
  pending reservation and permits a fresh retry, proves recovery retains the same
  reservation/owner, and proves no second restore/audit or resource/history
  invalidation for either branch and no second dispatch for recovery.
- Pure tests validate route/control/native/cache/smoke descriptor parity and reject
  route/control payload added to `CmsFeatureCapabilityV1`.
- Negative route/client scans prove the retired Admin/Setup direct apply is absent,
  while the current internal Assistant `site-kit.install` service path remains
  untouched and explicitly deferred to terminal TASK-414.
- Core lint/types plus targeted routes/security, line counts, and diff check.

## Documentation Updates Required

TASK-555-07-L01 updates `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`,
`_docs/SECURITY_SPEC.md`, Guide relation sources, generated docs, and architecture
truth after implementation is validated. L03 is closure metadata only.
