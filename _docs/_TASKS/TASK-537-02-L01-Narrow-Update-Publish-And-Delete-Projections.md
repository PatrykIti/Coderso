# TASK-537-02-L01: Narrow Update, Publish, and Delete Projections

# FileName: TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-02
**Priority:** High
**Category:** Entry Service / Transactions / Security
**Estimated Effort:** Large
**Dependencies:** TASK-537-01-L01, TASK-537-01-L02
**Status:** 🚧 In Progress
**Started:** 2026-07-12
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

Implement the single outer metadata transaction and explicit minimal projections in
entryService.ts. Despite the historical leaf title, atomic coordination and projections
must land together because this is the sole entryService writer.

## Source ownership

This leaf is the only TASK-537 writer of
`core/services/content/entryService.ts` and
`core/server/routes/contentEntryRoutes.ts`, and owns only the narrow executor-aware changes
required in `core/services/auth/roleService.ts`, `core/server/middleware/rbac.ts`, and the
permission-factory type in `core/server/routes/index.ts`. It must not add a
projection/preparation helper module: named projections, the internal dependency seam,
and orchestration stay in `entryService.ts` under YAGNI. It must not edit
`taxonomyService.ts` or `seoService.ts`. It owns compatibility/changed-behavior updates
required before its gate in `tests/unit/content/entryService.test.ts`,
`tests/integration/routes/contentEntriesRoutes.test.ts`, and
`tests/integration/runtime/detail-page-preview-cache.test.ts`, plus the executor regression
in `tests/unit/auth/rbac.test.ts`. It may update only the affected content-entry
registration fakes in `tests/integration/routes/contentTypes.test.ts`; it must not edit
other tests, docs, task indexes, or changelog files.

## Projection contract

Define auditable named projection objects for each query shape:

- mutation lookup: only id, typeId, slug, title, status, data, publishedAt, scheduledAt,
  visibility, tags, timestamps, and a SQL-derived hasPassword boolean. The first lookup
  in both metadata coordination and standalone publish is the same
  `SELECT ... FOR UPDATE`, so password state and revision sequencing cannot race;
- publish result/cache: id, typeId, slug, status, publishedAt, scheduledAt, updatedAt;
- delete consumer: id and title only;
- updateEntry: no returning clause when its result is unused.

No projection includes `contentEntries.accessPassword`. The SQL-derived
`hasPassword` expression may reference the column only as `IS NOT NULL`; the raw value
must never become a selected key or JavaScript value. Do not fetch a full row and strip
the secret afterward.

## Implementation Pseudocode

~~~ts
import {
  applyEntryTaxonomyMutation,
  prepareEntryTaxonomyMutation,
  type EntryTaxonomyPlan,
} from "./taxonomyService";
import {
  applyPreparedSeoMutationWithExecutor,
  prepareSeoMutationWithExecutor,
  type PreparedSeoMutation,
} from "../seo/seoService";

type EntryMutationAuthorization =
  | Readonly<{
      kind: "route";
      authorize: (
        tx: EntryTransaction,
        requirement: Readonly<{ publishTransition: boolean }>
      ) => Promise<void>;
    }>
  | Readonly<{ kind: "trusted-internal" }>;

type EntryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type EntryTransactionRunner = <T>(
  callback: (tx: EntryTransaction) => Promise<T>
) => Promise<T>;

type EntryCacheProjection = Readonly<{
  id: string;
  typeId: string;
  slug: string;
  status: EntryStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  updatedAt: Date;
}>;

type EntryStatusWritePlan = Readonly<{
  entryId: string;
  values: Readonly<{
    status: EntryStatus;
    publishedAt?: Date | null;
    scheduledAt: Date | null;
    updatedAt: Date;
  }>;
}>;

type EntryMetadataWritePlan = Readonly<{
  entryId: string;
  values: Readonly<{
    tags?: string[];
    visibility?: EntryVisibility;
    accessPassword?: string | null;
    scheduledAt?: Date | null;
    updatedAt: Date;
  }>;
}>;

async function writeEntryStatusTx(
  tx: EntryTransaction,
  plan: EntryStatusWritePlan
): Promise<EntryCacheProjection | null> {
  const [row] = await tx.update(contentEntries)
    .set(plan.values)
    .where(eq(contentEntries.id, plan.entryId))
    .returning(ENTRY_CACHE_FIELDS);
  return row ?? null;
}

async function writeEntryMetadataTx(
  tx: EntryTransaction,
  plan: EntryMetadataWritePlan
): Promise<void> {
  await tx.update(contentEntries)
    .set(plan.values)
    .where(eq(contentEntries.id, plan.entryId));
}

type EntryCacheFailureCode = "entry_cache_invalidation_failed";

function reportEntryCacheFailure(code: EntryCacheFailureCode): void {
  try {
    console.warn(code); // Stable code only; never include the caught cache error or input.
  } catch {
    // Reporting is best-effort and must never turn a durable commit into a failed request.
  }
}

export type EntryMutationDeps = {
  transaction: EntryTransactionRunner;
  hashPassword: typeof hashPassword;
  prepareTaxonomy: typeof prepareEntryTaxonomyMutation;
  applyTaxonomy: typeof applyEntryTaxonomyMutation;
  prepareSeo: typeof prepareSeoMutationWithExecutor;
  applySeo: typeof applyPreparedSeoMutationWithExecutor;
  createRevision: typeof createEntryRevisionTx;
  writeStatus: typeof writeEntryStatusTx;
  writeMetadata: typeof writeEntryMetadataTx;
  invalidateEntrySiteCache: typeof invalidateContentEntryCache;
  clearAllSiteCache: typeof clearSiteCache;
  reportCacheFailure: typeof reportEntryCacheFailure;
};

// Server-internal test seam exported only for direct Bun service tests; no second
// production module and no mutable global override. Public functions pass the immutable
// production dependency object.
const entryMutationDeps: EntryMutationDeps = Object.freeze({
  transaction: db.transaction.bind(db),
  ...
});

// Server-internal test factory: clones the real production functions, then replaces only
// named seams. It never mutates the production object and is not a runtime fallback.
export function createEntryMutationDepsForTest(
  overrides: Partial<EntryMutationDeps>
): EntryMutationDeps {
  return Object.freeze({ ...entryMutationDeps, ...overrides });
}

async function loadEntryMutationStateForUpdate(executor, entryId) {
  const [row] = await executor.select({
    ...ENTRY_MUTATION_FIELDS,
    hasPassword: sql<boolean>(access_password IS NOT NULL),
  }).from(contentEntries).where(id).limit(1).for("update");
  return row ?? null;
}

async function getContentTypeMutationContextWithExecutor(
  executor,
  typeId
): Promise<{ id: string; slug: string; schema: ContentSchema } | null> {
  const [row] = await executor
    .select(EXPLICIT_CONTENT_TYPE_CONTEXT_FIELDS) // id, slug, schema only
    .from(contentTypes).where(eq(contentTypes.id, typeId)).limit(1);
  return row ? map the exact context shape : null;
}

// roleService.ts: the authorization snapshot is one joined, minimally projected statement
// through the caller's structural executor. Never first select userRoles IDs and then roles.
export type RoleQueryExecutor = Pick<typeof db, "select">;
const ADMIN_PERMISSION_ROLE_FIELDS = {
  id: roles.id,
  name: roles.name,
  permissions: roles.permissions,
} as const;
export async function getUserRoles(userId, executor: RoleQueryExecutor = db) {
  return executor
    .select(ADMIN_PERMISSION_ROLE_FIELDS)
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
}
export async function getAdminPermissionSnapshot(
  userId,
  executor: RoleQueryExecutor = db
) {
  // Exactly one READ COMMITTED statement snapshot for assignment + role permissions.
  roleRows = await getUserRoles(userId, executor);
  return buildAdminPermissionSnapshotFromRoles(roleRows);
}
export async function getUserPermissions(userId, executor: RoleQueryExecutor = db) {
  return (await getAdminPermissionSnapshot(userId, executor)).permissions;
}

// rbac.ts: ordinary middleware remains one-argument compatible; a locked mutation passes
// its executor explicitly so the guard cannot acquire a second pooled connection.
export type PermissionRequirement = string | readonly string[];
export type PermissionHandler = (
  ctx: RbacContext,
  executor?: RoleQueryExecutor
) => Promise<void>;
export type PermissionGuardFactory = (
  permission: PermissionRequirement
) => PermissionHandler;
export const requirePermission: PermissionGuardFactory = (permission) => {
  // Preserve the legacy string factory contract while evaluating every array member.
  requiredPermissions = Object.freeze(
    typeof permission === "string" ? [permission] : [...permission]
  );
  return async (ctx, executor?: RoleQueryExecutor) => {
    require actor;
    if (requiredPermissions.length === 0): throw Error("forbidden");
    permissions = await getUserPermissions(ctx.user.id, executor);
    if !requiredPermissions.every(required => hasPermission(permissions, required)):
      throw Error("forbidden");
  };
};

// contentEntryRoutes.ts: router handlers remain one-argument. Only the injected RBAC
// handler accepts the optional executor.
type ContentEntryRouteDeps = {
  requirePermission: PermissionGuardFactory;
  validate: ...;
};
// routes/index.ts uses the exported factory type; route modules that request one string
// keep their current contract, while contentEntryRoutes may request an all-of array.
type RouteDeps = {
  requirePermission: PermissionGuardFactory;
  ...;
};

async function publishEntryTx(deps, tx, entry, contentSchema, actorId) {
  validate schema/relation/media through tx using explicit entry state and schema;
  await deps.createRevision(tx, entry.id, entry.data, actorId);
  return deps.writeStatus(tx, {
    entryId: entry.id,
    values: {
      status: "published",
      publishedAt: new Date(),
      scheduledAt: null,
      updatedAt: new Date(),
    },
  });
  // no transaction nesting and no cache invalidation
}

export async function coordinateEntryMetadataMutation(
  deps: EntryMutationDeps,
  entryId,
  input,
  actorId: string | undefined,
  mutationAuthorization: EntryMutationAuthorization
) {
  committed = await deps.transaction(async tx => {
    entry = await loadEntryMutationStateForUpdate(tx, entryId);
    require entry;

    nextStatus = input.status ?? entry.status;
    nextScheduledAt = input.status !== undefined && input.status !== "scheduled"
      ? null
      : input has own scheduledAt
        ? input.scheduledAt
        : entry.scheduledAt;
    validate date and require nextScheduledAt when nextStatus === "scheduled";

    transitionToPublished = input.status === "published" && entry.status !== "published";
    if mutationAuthorization.kind === "route":
      await mutationAuthorization.authorize(tx, { publishTransition: transitionToPublished });
    else if mutationAuthorization.kind !== "trusted-internal":
      throw Error("entry_publish_authorization_required");
    if transitionToPublished:
      require actorId;

    if input.visibility === "password" and no non-empty password and !entry.hasPassword:
      throw Error("entry_password_required");
    preparedHash = input.visibility === "password" && non-empty input.accessPassword
      ? await deps.hashPassword(input.accessPassword)
      : absent;
    // Omitted visibility preserves both visibility and hash and ignores accessPassword.
    taxonomyPlan: EntryTaxonomyPlan | null = input taxonomy
      ? await deps.prepareTaxonomy(tx, ...)
      : null;
    seoPlan: PreparedSeoMutation | null = input seo
      ? await deps.prepareSeo(tx, {
          targetType: "entry",
          targetId: entry.id,
          slug: normalizeSeoSlug(entry.slug),
          title: input.seo.title ?? undefined,
          description: input.seo.description ?? undefined,
          canonicalUrl: input.seo.canonicalUrl ?? undefined,
          robots: input.seo.robots ?? undefined,
        })
      : null;
    contentTypeContext = await getContentTypeMutationContextWithExecutor(tx, entry.typeId);
    require content type context before any write;
    if transitionToPublished:
      validate publish content/relation/media through tx using contentTypeContext.schema
        before first write;

    writePlan = freeze an explicit plan with:
      transitionToPublished;
      statusWrite = exact status/publishedAt/scheduledAt delta or null;
      taxonomyWrite = taxonomyPlan !== null;
      metadataWrite = exact tags/visibility/hash/schedule delta or null;
      seoWrite = seoPlan !== null;
      changed = any write seam above will execute;

    // only now begin writes
    if transitionToPublished:
      await publishEntryTx(deps, tx, entry, contentTypeContext.schema, actorId);
    else if writePlan.statusWrite:
      await deps.writeStatus(tx, writePlan.statusWrite);
    if taxonomyPlan: await deps.applyTaxonomy(tx, taxonomyPlan);
    derive tags from plan or normalized direct tags without global DB read;
    if writePlan.metadataWrite: await deps.writeMetadata(tx, writePlan.metadataWrite);
    if seoPlan: await deps.applySeo(tx, seoPlan);

    return {
      changed: writePlan.changed,
      seoChanged: seoPlan !== null,
      resultId: entry.id,
      cacheRef: {
        typeSlug: contentTypeContext.slug,
        entrySlug: entry.slug,
        entryId: entry.id,
      },
    };
  });

  // This phase is outside db.transaction. SEO historically clears the whole public
  // HTML cache; that one global clear subsumes the targeted entry invalidation.
  try {
    if committed.seoChanged:
      await deps.clearAllSiteCache(); // exactly once after commit
    else if committed.changed:
      await deps.invalidateEntrySiteCache(committed.cacheRef); // exactly once after commit
  } catch {
    // DB is already durable. Report only a stable, redacted code and still return the
    // committed result so the HTTP client reconciles and broadcasts its cache events.
    try {
      deps.reportCacheFailure("entry_cache_invalidation_failed");
    } catch {
      // Reporting is best-effort/no-throw; never convert durable success into HTTP failure.
    }
  }

  return getEntry(committed.resultId);
}

export async function updateEntryMetadataForRoute(
  entryId,
  input,
  actorId: string | undefined,
  authorizeMutation: (
    tx: EntryTransaction,
    requirement: Readonly<{ publishTransition: boolean }>
  ) => Promise<void>
) {
  return coordinateEntryMetadataMutation(entryMutationDeps, entryId, input, actorId, {
    kind: "route",
    authorize: authorizeMutation,
  });
}

export async function updateEntryMetadata(entryId, input, actorId?) {
  return coordinateEntryMetadataMutation(entryMutationDeps, entryId, input, actorId, {
    kind: "trusted-internal",
  });
}

updateEntry(...) {
  explicit lookup with no hash;
  validate;
  await update(...); // omit unused returning()
  preserve SEO behavior and final getEntry projection;
}

publishEntry(...) {
  transaction:
    entry = await loadEntryMutationStateForUpdate(tx, entryId);
    context = await getContentTypeMutationContextWithExecutor(tx, entry.typeId);
    validate everything through tx using context.schema, then publishEntryTx;
  targeted invalidate exactly once after transaction commit;
}

deleteEntry(...) {
  delete...returning({id, title});
}

// contentEntryRoutes.ts: preserve absence instead of manufacturing scheduledAt:null.
remove the pre-transaction `body.status/entry.status` content:publish permission branch;
metadataInput = { status, visibility, accessPassword, tags, taxonomy, seo };
if Object.hasOwn(body, "scheduledAt"):
  metadataInput.scheduledAt =
    body.scheduledAt === null
      ? null
      : new Date(body.scheduledAt);

authorizeMutation = async (tx, requirement) => {
  required = requirement.publishTransition
    ? ["content:write", "content:publish"]
    : ["content:write"];
  await requirePermission(required)(ctx, tx); // one permission snapshot
};
await updateEntryMetadataForRoute(
  entry.id,
  metadataInput,
  ctx.user?.id,
  authorizeMutation
);
// The callback runs after the row lock for every route mutation. It always rechecks
// content:write and adds content:publish only for a real transition.

mapEntryMetadataError:
  seo_canonical_invalid -> ApiError(..., 400);
  seo_robots_invalid -> ApiError(..., 400);
~~~

Use these exact named imports and relative module paths, merging them into the existing
taxonomy/SEO import declarations. Remove the superseded coordinator imports only after
all existing call sites are migrated; do not copy helper bodies or plan types into
`entryService.ts`.

All known rejectable values must be prepared before the first write. If hashing can
fail, it happens in that preparation phase and only when `input.visibility ===
"password"` with a non-empty supplied password. Omitted visibility leaves both
visibility/hash unchanged and ignores `accessPassword`; public/private clears the hash;
password with no new value keeps the row-locked existing hash or fails if none exists.
Reads inside the transaction do not violate the rule; no
status/revision/taxonomy write may precede authorization, taxonomy/SEO validation, or
publish content/relation/media validation. The locked state is the sole authority for
password keep/clear and publish-transition decisions.

The joined RBAC SELECT is the authorization linearization point under PostgreSQL READ
COMMITTED: a role assignment, removal, or permission edit committed before the statement
starts is eligible for that snapshot; one committed after the statement snapshot begins
does not retroactively allow or cancel the already-evaluated mutation and is observed by
the next guard. There is no first `user_roles` statement followed by a second `roles`
statement. `ADMIN_PERMISSION_ROLE_FIELDS` contains only role `id`, `name`, and
`permissions`; user-role link columns and unrelated role metadata are not materialized.

## Exact write-effect matrix

Build one frozen plan before writing. `changed` is true if and only if at least one of
these named DB write functions will execute; it is never inferred merely from keys being
present after the transaction:

- a metadata transition to `published` runs `createRevision` then the publish
  `writeStatus` (`status=published`, fresh `publishedAt`, `scheduledAt=null`, fresh
  `updatedAt`);
- a real transition to `draft` runs one `writeStatus` with `publishedAt=null`,
  `scheduledAt=null`, and fresh `updatedAt`;
- a real transition to `scheduled` writes that status plus the validated non-null
  `nextScheduledAt`; a real transition to `archived` writes that status and
  `scheduledAt=null`; both preserve the current `publishedAt` compatibility behavior;
- a same-status request executes no status write. An authored `scheduledAt` not consumed
  by a status transition joins `writeMetadata` only when its resulting value differs;
- a present taxonomy object runs taxonomy apply and the derived-tag metadata write even
  if the selected IDs happen to match; direct `tags` runs metadata only when taxonomy is
  absent;
- a present visibility key runs the exact visibility/hash write above; omitted visibility
  and access-password-only input run no password write;
- a present SEO object runs its prepared apply seam; no empty default SEO object is
  invented;
- `writeMetadata` executes at most once with the accumulated tags/schedule/visibility/hash
  delta and one fresh `updatedAt`. A request for already-published status with no other
  effective write is a true no-op: no `updatedAt`, revision, or cache effect.

`createRevision`, `writeStatus`, and `writeMetadata` are local executor-aware functions in
`entryService.ts` and members of the immutable production dependency object. They make
fault/deferred ordering testable without proxying the fluent Drizzle builder or adding a
new module/fallback. `createEntryMutationDepsForTest(overrides)` is the sole exported
server-internal factory: it clones the real frozen production functions and applies only
named overrides. It never exposes secrets, mutates global deps, or participates in a
production request path.

The write plan shapes and calls above are exact. Every status/metadata plan contains its
`entryId`; `writeStatus(tx, plan)` always uses `returning(ENTRY_CACHE_FIELDS)` and returns
`EntryCacheProjection | null`, including the publish path. `writeMetadata(tx, plan)` has
no returning clause and resolves `void`. No call passes a third projection argument, and
the hashed value may exist only in the narrow metadata plan/write call—not in a lookup,
return, cache reference, log, or error payload.

## Security Contract

- **Visibility and auth:** the metadata route remains internal and uses the existing Admin
  session-cookie authentication. This route has no API-key mode and this task adds none.
- **RBAC:** the route starts with `content:write` as an early rejection gate. After the row
  lock, one fresh permission snapshot from one minimal joined `user_roles` -> `roles`
  SELECT on the same transaction executor always rechecks `content:write` and additionally
  checks `content:publish` only for a real transition. A no-op `status:published` metadata
  edit remains `content:write`-only. Legacy string requirements normalize to one-element
  all-of lists; every member of a non-empty array is required, wildcard permissions satisfy
  non-empty requirements, and an empty array returns `forbidden` even for a wildcard actor.
  The single-statement snapshot prevents split-permission authorization, and the shared
  executor prevents a one-connection-pool self-deadlock or saturated-pool starvation.
- **CSRF and rate limit:** session writes retain shared CSRF enforcement and the
  `admin_write` bucket.
- **Validation:** the existing strict envelope stays reject-unknown. `scheduledAt` remains
  present-only; blank non-null input is a pre-handler `validation_error`, `null` is an
  explicit clear, and omission stays absent. `seo_canonical_invalid` and
  `seo_robots_invalid` map centrally to HTTP 400 without echoing input.
- **Anti-abuse:** nonce, signature/HMAC, reCAPTCHA, and other public-write controls do not
  apply because this is not a public endpoint; no weaker alternate path is added.

## Error, cache, and rollback contract

Preserve existing machine-readable entry/taxonomy/SEO errors, adding the two explicit
SEO-to-400 route mappings above. Any thrown authorization, validation, hashing, DB, or
injected prepare/apply seam error rolls back status, revision, assignments, tags,
visibility/hash, schedule, and SEO together. It emits no site-cache effect.

Cache effects are exact: a committed mutation containing SEO calls global
`clearSiteCache` once and does not also call targeted invalidation; any other committed
changed metadata/status mutation calls `invalidateContentEntryCache` once; a no-op calls
neither. Admin local-cache writes and `cacheBus` broadcasts remain client-owned and occur
only after a successful HTTP response; the entry service does not emit them. A
post-commit invalidator failure is caught outside the transaction, reports only the stable
redacted code `entry_cache_invalidation_failed` through a synchronous no-throw/best-effort
reporter, and still returns the committed result even if both invalidator and reporter
throw.
The route therefore remains successful, the admin client reconciles/broadcasts, and the
short public-cache TTL is the recovery path. Never expose the raw cache error or make the
user retry an already durable mutation.

## Compatibility

No endpoint, permission name, DDL, public response, or schema-version change. Existing
hasPassword remains the only exposed password-state signal. Delete keeps id/title for
assistant/action consumers. Standalone publish/update/delete callers retain stable return
shapes where those shapes are documented. Existing trusted callers keep the exact
`updateEntryMetadata(entryId, input, actorId?)` call shape. The route alone uses the new
required-callback `updateEntryMetadataForRoute`; neither helper is a new endpoint.

## Regression-test shape

This leaf updates its three named entry/route/cache suites before the source gate.
Required cases:

- draft plus requested publish plus invalid taxonomy leaves status/revisions unchanged;
- valid taxonomy plus invalid SEO leaves every domain table unchanged;
- injected DB failure after each write seam rolls back earlier writes;
- deferred taxonomy and SEO apply promises keep the transaction unresolved and emit no
  cache event until awaited completion; rejection before resolution rolls back all state;
- the internal dependency seam supplies deterministic prepare/apply/hash/cache failures
  and deferred promises by cloning the real deps factory without mutable module mocks,
  reimplemented production writes, or fallbacks;
- two concurrent password mutations serialize: clear-to-public cannot race a
  password/omit request into `visibility=password` with a null hash;
- two concurrent publishes serialize the locked revision `max + 1` sequence and create
  distinct ordered revision versions;
- every route mutation invokes the locked-state authorization callback after `FOR UPDATE`
  and before preparation/write; it receives `publishTransition:false` for an ordinary or
  already-published save and `true` only for a real publish transition. Invalid/missing
  authorization context and either permission denial fail closed before writes;
- a controlled lock-holder transaction and waiter use explicit deferred barriers. The
  guard remains uncalled until the lock-holder releases the owned entry row; a denied
  guard then leaves revisions and every mutation table unchanged with no cache effect;
- `tests/unit/auth/rbac.test.ts` creates unique owned user/role/user-role fixtures, then
  starts a fresh inline Bun subprocess with `DB_POOL_MAX=1` set before imports. The child
  exercises positive and denied production RBAC evaluation through the supplied
  transaction executor, calls `process.exit` explicitly, and completes before an internal
  deadline shorter than the suite timeout. Parent `finally` kills and awaits a hung child
  and deletes only its owned link/role/user rows in FK-safe order. No trigger, truncation,
  global fixture, or unbounded child is permitted;
- the RBAC suite records the executor query shape and proves the snapshot performs exactly
  one SELECT with the `user_roles` -> `roles` join and only role id/name/permissions. It
  commits one owned role/user-role change before the guard and proves it is observed. A
  second owned permission edit remains uncommitted while the joined SELECT evaluates the
  prior committed row; committing it afterward cannot alter that completed decision, and
  the next guard observes the edit. Direct guard cases cover legacy string allow and deny,
  non-empty all-of allow and missing-member deny, wildcard allow for both string and all-of
  requirements, and `requirePermission([])` returning `forbidden` without querying
  permissions even for a wildcard actor;
- route omission preserves `scheduledAt`; explicit null clears; blank and invalid nonblank
  fail the real strict validator; valid timestamp parses; a resulting scheduled state
  without a date rejects;
- a table over current public/private/password rows receiving `accessPassword` with
  omitted visibility proves the hash dependency is not called, visibility is unchanged,
  and the stored hash remains byte-identical or null as appropriate;
- invalid canonical/robots values map to the exact HTTP 400 codes before any write;
- successful SEO metadata commits every field then globally clears once with no targeted
  duplicate; non-SEO changed metadata targets once; no-op and rollback emit neither;
- post-commit invalidator failure (including a throwing reporter) still returns HTTP
  success, leaves committed DB state intact, and lets the client broadcast reconciliation;
- direct trusted-service SEO input with null fields preserves the current coordinator
  `?? undefined` omit semantics rather than clearing stored SEO values;
- named projection-key/static query guards prove `accessPassword` is absent from
  selected/returned JavaScript shapes while permitting only the boolean
  `IS NOT NULL` expression;
- update has no returning, delete returns id/title, publish returns cache fields;
- password visibility preserve/replace/clear behavior remains correct;
- TASK-517’s future narrow hash loader remains the only permitted internal secret read.

The taxonomy and SEO suites are read-only inputs to this leaf's gate because their
owners updated them in TASK-537-01. TASK-537-03-L01 owns only additive cross-domain DB
fault/rollback cases and final reruns; it cannot re-baseline these source-owner proofs.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/auth/rbac.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/routes/contentTypes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/integration/runtime/detail-page-runtime.test.ts \
  tests/integration/runtime/detail-page-composer-runtime.test.tsx
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/security/codersoSecurityGate.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/content/taxonomyService.ts core/services/seo/seoService.ts \
  core/services/content/entryService.ts core/server/routes/contentEntryRoutes.ts \
  core/server/routes/index.ts \
  core/services/auth/roleService.ts core/server/middleware/rbac.ts
~~~

Re-run a named failure alone before classifying it.

## Acceptance criteria

- updateEntryMetadata owns one transaction and one after-commit invalidation phase.
- Metadata and standalone publish take the same minimal row lock before decisions.
- Publish RBAC is decided from locked state before any write without widening no-op permissions.
- Publish RBAC performs no global-DB I/O while the locked transaction owns its connection.
- No audited query materializes accessPassword.
- Every known validation completes before the first write.
- Rollback restores all entry/taxonomy/SEO/revision state.
