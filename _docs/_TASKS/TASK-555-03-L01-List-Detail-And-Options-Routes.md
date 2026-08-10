# TASK-555-03-L01: List Detail and Options Routes
# FileName: TASK-555-03-L01-List-Detail-And-Options-Routes.md

**Parent Subtask:** TASK-555-03
**Priority:** High
**Category:** Internal API / Read Models / RBAC
**Estimated Effort:** Medium
**Dependencies:** landed TASK-555-02-L03, TASK-555-06-L01, and TASK-555-06-L02 receipts
**Status:** ⏳ To Do

---

## Overview

Add prefixless orchestration-only read-route factories for the curated starter list,
compact options, and detail read model. Both the Solution Kits Admin and Setup Wizard
must receive projections from the same domain functions; Setup options are byte-
semantically equal to `/solution-kits/starters/options`, not a local list or second DTO.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/server/validation/curatedStarterReadSchemas.ts` (new);
- `core/server/routes/curatedStarterReadRoutes.ts` (new); and
- `tests/integration/routes/curatedStarterReadRoutes.test.ts` (new).

Existing `solutionKitsRoutes.ts`, `setupRoutes.ts`, and `routes/index.ts` remain
read-only until TASK-555-03-L03 composes all route factories.

## Dependencies and Land Order

First TASK-555-03 leaf. Land before L02/L03. It consumes the strict registry and DTO
owner; later route leaves import but do not modify these modules.

## Exact Routes

Factories register bare paths; the existing Admin router adds `/admin/api` once:

- `GET /solution-kits/starters` -> `{schemaVersion:1,items:CuratedStarterSummaryV1[]}`;
- `GET /solution-kits/starters/options` ->
  `{schemaVersion:1,items:CuratedStarterOptionV1[]}`;
- `GET /solution-kits/starters/:starterId` -> `CuratedStarterDetailV1`;
- `GET /setup/starter-content/options` -> the same options envelope.

List/options order is the registry order and capped by `CURATED_STARTER_LIMITS`.
Detail contains bounded resources/residuals/checklist only. All four reject normalized
query noise. GET-body handling remains the terminal shared transport contract and is
not falsely asserted from a `RouteContext` that does not expose consumed body bytes.

## Forbidden Paths

- all TASK-414/489/545/547/548/551/554 task files and foreign changelogs/indexes/workflows/
  smoke evidence;
- existing route composers/index, mutation/lifecycle routes/schemas, domain/client/UI,
  DB/schema/migrations, artifacts, and other leaf tests;
- owner dirty root/handoff files.

## Security Contract

- **Endpoint visibility:** internal under `/admin/api`; no public route.
- **Auth model:** authenticated Admin session only.
- **RBAC:** every route requires `solution-kits:read` before service work.
- **CSRF:** not required for GET.
- **Rate-limit bucket:** `admin_read` through the shared HTTP classifier.
- **Validation:** strict empty query/body where applicable; `starterId` is the closed
  registry enum; recursively strict normalized response.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA. Bounded static registry reads and
  response limits apply.
- **Secrets/privacy:** no package, resource blueprint/document, path/URL, snapshot,
  actor, provider secret, or raw settings value is returned/logged/cached.

## Implementation Pseudocode

```ts
export function registerCuratedStarterStaticReadRoutes(
  router: Router,
  deps: CuratedStarterReadRouteDeps,
): void {
  const readOptions = async (ctx: RouteContext) => {
    deps.validate(curatedStarterEmptyQuerySchema, ctx.query);
    return normalizeCuratedStarterOptionsEnvelope(
      deps.listCuratedStarterOptions(),
    );
  };

  router.register({
    method: "GET", path: "/solution-kits/starters",
    preBody: curatedStarterReadPreBodyPolicyV1,
    response: curatedStarterJsonNoStoreResponsePolicyV1,
    handlers: [async (ctx) => {
      curatedStarterEmptyQuerySchema.parse(ctx.query);
      return routeJson(normalizeCuratedStarterListEnvelope(deps.listCuratedStarters()));
    }],
  });
  registerReadDescriptor(router, "/solution-kits/starters/options", readOptions);
  registerReadDescriptor(router, "/setup/starter-content/options", readOptions);
}

export function registerCuratedStarterDynamicDetailRoute(router: Router, deps): void {
  registerReadDescriptor(router, "/solution-kits/starters/:starterId", async ctx => {
    const id = curatedStarterIdSchema.parse(ctx.params.starterId);
    curatedStarterEmptyQuerySchema.parse(ctx.query);
    return routeJson(normalizeCuratedStarterDetail(deps.getCuratedStarterDetail(id)));
  });
}
```

`curatedStarterReadPreBodyPolicyV1` uses terminal `router.register` with
`auth:"admin-session"`, permissions `['solution-kits:read']`, the terminal no-write
CSRF value, `admin_read`, and `body.mode:"none"`. Route code performs no provider/
artifact/DB business logic. The split factories are the exact names consumed by L03;
static reads mount before the legacy `/:id`, dynamic curated detail mounts last.

## Data Flow

Session/RBAC -> strict params/query -> registry/read-model service -> strict DTO
normalizer -> response. Setup/Admin options call the identical function.

## Error Handling

- Unknown ID is thrown as `curated_starter_not_found` and mapped by L03 to safe 404.
- Malformed params/query or unexpected response is 400/500 through centralized
  validation/error handling; route does not expose raw error text.
- Permission denial occurs before registry/detail work.

## Regression Tests

- Exact four method/path registrations, both exported factory names, terminal
  pre-body/response policy, and one permission snapshot per request.
- `/solution-kits/starters/options` and Setup options deep-equal for all seven entries,
  including `local-service-business` and `formadom-studio`.
- Detail projects FormaDom version/provider/resources/seven residuals without package.
- Unknown ID, unknown query key, missing session/permission, malformed service
  response, and oversized result fail with zero downstream work where applicable.
- Static `options` path is registered before `/:starterId` at final composition;
  L01's factory test exposes route order for L03 reconcile.

## Testing Requirements

```bash
bun test tests/integration/routes/curatedStarterReadRoutes.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` on all three human-authored files and fail above 1,000.

## Documentation Updates Required

None. TASK-555-07-L01 owns API docs before smoke; L03 is closure metadata only.
