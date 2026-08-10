# TASK-555-03-L02: Preview and Apply Routes
# FileName: TASK-555-03-L02-Preview-And-Apply-Routes.md

**Parent Subtask:** TASK-555-03
**Priority:** High
**Category:** Internal API / Mutations / CSRF / Idempotency
**Estimated Effort:** Medium
**Dependencies:** TASK-555-03-L01
**Status:** ⏳ To Do

---

## Overview

Add strict preview/apply route factories for both Admin and Setup. The route path or
body supplies only a closed registry starter ID; apply additionally supplies a
preview UUID, idempotency key, and explicit settings-takeover boolean. Remove the old
`dryRun`, `continueOnError`, `plan`, `kitId`, `blueprintKey`, and arbitrary blueprint
request contract from fixed starter installation.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/server/validation/curatedStarterMutationSchemas.ts` (new);
- `core/server/routes/curatedStarterMutationRoutes.ts` (new); and
- `tests/integration/routes/curatedStarterMutationRoutes.test.ts` (new).

L03 alone composes these routes into existing files and owns centralized error maps.

## Dependencies and Land Order

Second TASK-555-03 leaf. Consume L01 read schemas/routes and TASK-555-02 services.
Land before L03. No existing route file has two writers.

## Exact Routes and Bodies

- `POST /solution-kits/starters/:starterId/preview` body exactly `{}`;
- `POST /solution-kits/starters/:starterId/apply` body exactly
  `{previewId:string,idempotencyKey:string,confirmSettingsTakeover:boolean}`;
- `POST /setup/starter-content/preview` body exactly
  `{starterId:CuratedStarterId}`;
- `POST /setup/starter-content/apply` body exactly
  `{starterId,previewId,idempotencyKey,confirmSettingsTakeover}`.

All four require an actual `application/json` body. Missing bodies and unsupported
content types reject rather than being normalized to `{}`.

Preview returns `CuratedStarterPreviewV1`; apply returns
`CuratedStarterApplyResultV1`. Setup and Admin call the same services and return the
same DTO shape.

## Forbidden Paths

- TASK-414/489/545/547/548/551/554 tasks, foreign changelogs/indexes/workflows/smoke;
- existing route composers/index, L01/L03 route/schema/tests, domain/client/UI,
  DB/schema/migrations, artifacts, and unrelated dirty files.

## Security Contract

- **Endpoint visibility:** internal `/admin/api/*` only.
- **Auth model:** authenticated Admin session; actor ID comes from `ctx.user`, never
  request data.
- **RBAC:** preview requires `solution-kits:write` because it persists dry-run
  ledger/items/audit. Apply requires all of `solution-kits:write` and
  `settings:write` before service work.
- **CSRF:** required for all four POSTs through the shared session pipeline.
- **Rate-limit bucket:** `admin_write`.
- **Validation:** recursively reject unknown; exact starter enum; UUID preview;
  idempotency key ASCII length `16..128`; takeover is required boolean. Empty Admin
  preview means truly zero body keys.
- **Anti-abuse:** no public nonce/HMAC/reCAPTCHA. Actor-bound preview, idempotency,
  body limits, RBAC/CSRF/rate limits, and server-only provider selection apply.
- **Secrets/privacy:** route never logs/echoes bodies, raw idempotency key, actor,
  package, snapshots, settings payload, or driver error.

## Implementation Pseudocode

```ts
export function registerCuratedStarterMutationRoutes(
  router: Router,
  deps: CuratedStarterMutationRouteDeps,
): void {
  const preview = async (ctx: RouteContext, starterId: unknown) => {
    deps.validate(curatedStarterIdSchema, starterId);
    return normalizeCuratedStarterPreview(
      await deps.previewCuratedStarter({
        starterId: starterId as CuratedStarterId,
        actorId: requireActorId(ctx),
      }),
    );
  };

  router.register({
    method: "POST", path: "/solution-kits/starters/:starterId/preview",
    preBody: curatedPreviewPreBodyPolicyV1,
    response: curatedStarterJsonNoStoreResponsePolicyV1,
    handlers: [async (ctx) => {
    deps.validate(curatedStarterAdminPreviewSchema, ctx.body);
    return routeJson(await preview(ctx, ctx.params.starterId));
    }],
  });

  // Register Setup preview through the same descriptor/body guard and register
  // both apply routes with one permissions array containing both write IDs.
  // The helper copies only validated own fields into the domain input.
}
```

Both preview descriptors declare one `solution-kits:write` permission; both apply
descriptors declare one permissions array
`["solution-kits:write","settings:write"]`. Terminal transport executes exact route
match -> wire `Content-Length` syntax/cap -> session -> one permission snapshot ->
`admin_write` -> CSRF -> exact JSON type/body mode -> bounded parse.
`CURATED_STARTER_MUTATION_BODY_MAX_BYTES` is 1,024 for all four routes. Setup preview
cannot bypass the exact JSON/content-type/body guard. Every mutation body policy
sets terminal `parseErrorCode: "invalid_json"`; the shared transport owns its global
cap-error response and handlers never read or repair malformed JSON. Route handlers
project own fields; they do not cast an untrusted body wholesale into a domain type.

## Data Flow

Route match -> wire `Content-Length` syntax/cap -> session -> one permission snapshot
-> admin_write -> CSRF -> exact JSON type/body mode -> bounded JSON parse -> strict
params/body ->
own-field projection + server actor -> shared preview/apply domain -> strict response.

## Error Handling

- Validation errors remain safe 400 with zero service work.
- Permission/CSRF/rate errors are centralized 403/429 before service work.
- Domain codes pass to L03 `mapCuratedStarterError`; the route never catches and
  rewrites them to raw messages.
- Apply success with post-commit warnings remains HTTP 200 and is not mapped to an
  error.

## Regression Tests

- Exact four `router.register` descriptors, two permission matrices, one permission
  lookup per request, 1,024-byte body caps, and terminal middleware/service ordering.
- Admin/Setup preview and apply produce equal domain inputs/DTOs for the same starter.
- Missing/extra/both legacy selectors, `dryRun`, `continueOnError`, `plan`, package,
  provider, path, URL, release/digest, actor, unknown nested key, bad UUID/key/takeover
  all fail before service.
- Missing/non-JSON bodies fail before service; `{}` is valid only for the Admin
  preview route and is sent explicitly by its client. Malformed JSON returns terminal
  `invalid_json` before schema/domain work.
- `settings:write` alone and `solution-kits:write` alone cannot apply; read-only cannot
  preview; valid dual permission can.
- Missing/mismatched CSRF is rejected by a real shared-pipeline case; tests do not
  falsely claim CSRF is route-handler middleware.
- Apply forwards the raw idempotency key only in process to the domain and no test
  log/error/response contains it.

## Testing Requirements

```bash
bun test tests/integration/routes/curatedStarterMutationRoutes.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` on all three human-authored files and fail above 1,000.

## Documentation Updates Required

None. TASK-555-07-L01 owns final endpoint/security docs before smoke; L03 is closure
metadata only.
