# TASK-554: Post Metadata Publish RBAC Hardening
# FileName: TASK-554_Post_Metadata_Publish_RBAC_Hardening.md

**Priority:** Critical
**Category:** Posts / RBAC / Security
**Estimated Effort:** Medium
**Dependencies:** None
**Related Tasks:** TASK-414-05, TASK-545, TASK-551-06, TASK-551-09
**Status:** ⏳ To Do
**Discovered:** 2026-08-07 during TASK-414 contract audit
**Contract Refreshed:** 2026-08-08
**Changelog:** 1267 (pinned)

---

## Overview

`PATCH /admin/api/posts/:id/metadata` requires only `content:write`, while its
strict schema accepts `status: "published" | "scheduled" | "archived" |
"draft"` and `scheduledAt`. The route forwards those fields to
`updatePostMetadata`, which performs publication-state transitions. A role with
`content:write` but without `content:publish` can therefore publish, schedule,
archive, or unpublish a Post through the metadata route and bypass the dedicated
publish/unpublish RBAC boundary.

The current route also maps an omitted `scheduledAt` to `null` before calling
the service. A writer-only SEO/tag request can therefore clear an existing
schedule even if the eventual conditional permission check classifies only the
original request. The repair must preserve own-property absence all the way
from validated JSON to the service patch and must reject `{}` before any
permission-dependent service work.

Repair this immediately and independently of the larger Agent/Post work. A
request that contains either publication-owned field (`status` or
`scheduledAt`) must pass `content:publish` in addition to `content:write` before
the service is called. Ordinary taxonomy/tag/SEO metadata editing remains
available to a content writer. Admin clients must omit publication-owned fields
unless the user intentionally submits a publication transition; they must not
send the current status on every unrelated metadata save.

This task does not implement the concurrency-safe Post revision/publish
transaction. TASK-551 owns that handoff and TASK-414-05 consumes it. It also
does not touch the already oversized `postsService.ts`.

## Isolation and Collision Guard

- Implement in a dedicated branch/worktree. Changelog 1267 is reserved only
  for TASK-554.
- Forbidden concurrent-stream paths are `_docs/_TASKS/TASK-414*.md`,
  `_docs/_TASKS/TASK-547*.md`, `_docs/_CHANGELOG/1266-*`,
  `core/services/kits/fullSitePackage/**`, and
  `core/services/kits/fullSiteInstall/**`. Do not edit, revert, stage, or
  reformat them.
- TASK-554 owns only the files and exact regions listed below plus changelog
  1267, its board row/statistics delta, and its registered cookbook section.
  TASK-414 depends on TASK-554 terminal and therefore adds its own cookbook
  section later from a fresh file read; the two closures must not run in
  parallel.
- The shared runtime-smoke registry/CLI/contracts test and
  `docs/develop/runtime-smoke-cookbook.md` are serialized seams. The mandatory
  writer order is TASK-554 -> TASK-545 -> TASK-548-02-L02 ->
  TASK-548-04-L03 -> TASK-548-07-L01 -> TASK-414-11-L01. TASK-554 lands first,
  rereads every current shared file, and preserves all existing suites;
  concurrent or reverse-order edits to those seams are forbidden.
- Terminal TASK-551-03-L02 is the later serialized writer of bounded Post-list
  regions in `postsRoutes.ts`, `postSchemas.ts`, and `postsClient.ts`. It must
  preserve this task's `postMetadataContract` re-exports, present-only payload,
  and conditional `content:publish` behavior and rerun this task's exact
  route/schema/client/RBAC tests. It does not own this task's metadata regions.
- Before implementation, run the repository's fresh read-only contract audit
  against current HEAD/diff, then use the canonical author/audit/implement/
  post-audit/smoke/closure workflow. A changed contract invalidates the prior
  audit.

## Deterministic Multi-Agent Workflow Ownership

TASK-554 is the security-first hard predecessor of TASK-545. It therefore owns
and lands these pre-TASK-545 workflow files and no others:

- `_docs/_workflows/task-554-author-audit.mjs`;
- `_docs/_workflows/task-554-implement.mjs`;
- `_docs/_workflows/task-554-fix.mjs`;
- `tests/unit/workflows/task554AuthorAudit.test.ts`; and
- `tests/unit/workflows/task554WorkflowContracts.test.ts`.

The scripts pin task ID `TASK-554`, changelog `1267`, the source/test/docs/smoke
ownership in this contract, and the concurrent-stream forbidden paths above.
They reject caller-supplied task IDs, changelog numbers, file owners, workflow
entries, phase skipping/reordering, unknown arguments, agent-authored result
identity, missing structured results, dirty forbidden paths, staging, commit,
push, or TASK-414/TASK-547/changelog-1266 writes. Author/audit runs one complete
fresh per-contract audit plus cross-file reconcile and repeats only verified
changed scopes. Implement dispatches each single-writer source/test slice
sequentially and gates it before the next. Fix may edit only owners derived from
evidence-backed findings and must return the exact affected owner/lens IDs.

The immutable phase order is:

0. owner-review bootstrap and committed tracked-byte verification for the three
   ignored-by-default workflow entries;
1. read-only research and complete contract author/audit convergence;
2. sequential schema/route/client/UI implementation with per-owner targeted
   static and behavior gates;
3. smoke adapter/worker/tests and product/security documentation plus cookbook;
4. full lint/type/test/security/precommit/line-count/diff gates;
5. one independent post-audit with exact lenses `scope-fidelity`,
   `rbac-fail-closed`, `present-only-byte-identity`, `cross-stream-smoke`, and
   `test-integrity`; fixes rerun only affected lenses and targeted gates;
6. shared-runner fast, then certification smoke, each running all seven flows;
7. owner review of certification report/screenshots plus exact cleanup and
   repository-restoration proof; and
8. metadata-only closeout: durable changelog 1267 file, changelog index, task
   row/statistics, then TASK-554 status last.

Workflow/unit fixtures prove every phase edge, literal lens inventory,
single-writer and forbidden-path guards, all-result semantics, fix-loop
fingerprints, exact smoke commands/session identities, no runtime scenario
resume, and terminal metadata ordering. Because TASK-545 does not yet exist at
execution time, TASK-554 must not fabricate or copy its future manifest/
checkpoint/closure API. TASK-545 later inventories and migrates these three
tracked scripts under its canonical owner tests; it never retroactively converts
TASK-554's already accepted smoke evidence into a TASK-545 checkpoint.

The directory `_docs/_workflows/` is globally ignored at the refreshed HEAD, so
these scripts have an explicit bootstrap checkpoint before phase 1. The
orchestrator authors only the three exact scripts, reports their normalized
paths and SHA-256 values as `owner_action_required`, and stops. It never stages
them. After owner review and an explicit force-add/commit, a fresh invocation
must prove each path through `git ls-files --error-unmatch`, regular-file/no-
symlink checks, and byte equality with `git show HEAD:<path>`. Missing, dirty,
ignored-only, substituted, or extra TASK-554 workflow entries fail before any
agent dispatch. The workflow tests simulate this bootstrap and prove an
untracked local file can never count as the canonical implementation entry.

## Verified Anchors and Single-Writer Ownership

- new pure `core/services/posts/postMetadataContract.ts`: sole owner of
  `PostMetadataMutationV1`, the recursively strict schema, own-property
  projection, publication-field predicate, and present-only schedule
  normalization. It has no DB/server/settings imports and is safe to consume
  from server and Admin bundles;
- new focused `core/services/posts/postMetadataMutationService.ts`: sole wrapper
  around the existing `updatePostMetadata` call for this route. It performs the
  authoritative mutation first, then synchronously clears the public site cache
  after a successful publication-state change. A deny, validation failure,
  throw, null/no-op, or rollback emits no public-cache effect; committed cache
  failure is sanitized/reconciled without converting the committed mutation
  into a retryable apparent failure;
- `core/server/validation/postSchemas.ts`: compatibility re-export of the one
  owned `postMetadataSchema`; do not duplicate the schema;
- `core/server/routes/postsRoutes.ts`: metadata route, one pre-created
  conditional `content:publish` middleware, exact projection, present-only
  service patch, and the owned widening of `PostsRouteDeps.requirePermission`
  to the canonical `PermissionRequirement` (`string | readonly string[]`)
  imported from `core/server/middleware/rbac.ts`, so both the string guard and
  the all-of array guard type-check through the same deps slot;
- `core/admin/services/postsClient.ts`: import/re-export the exact shared
  metadata DTO and retain existing CSRF/cache behavior;
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` around the verified
  `handleSaveMetadata` call (baseline line 346), which currently sends `status`
  and `scheduledAt` on every metadata save;
- new focused
  `core/admin/ui/posts/editor/postMetadataMutationPayload.ts`, which owns the
  baseline-versus-draft comparison and returns either a non-empty present-only
  DTO or `null` for a no-op;
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` around baseline line
  1581 is a read-only verified control: its `snapshot.metadataPayload` already
  contains only tags/taxonomy/SEO. Do not touch this 2,713-line legacy module in
  TASK-554; source/behavior tests must prove it remains publication-field-free;
- route/schema/client/UI tests for the touched contracts.

No other task may edit those exact regions while TASK-554 is in progress.
`core/services/content/postsService.ts` and the oversized
`usePostEditorState.ts` are forbidden. If implementation evidence
proves a service edit is unavoidable, stop and amend the task; first split the
1,010-line module by cohesive responsibility under the repository line gate.

## Security Contract

- **Visibility:** existing internal Admin routes only; no public endpoint.
- **Auth:** existing authenticated Admin session; actor/permissions come only
  from server middleware.
- **RBAC:** metadata performs exactly one permission lookup/snapshot. A request
  without publication-owned fields requires `content:write`; presence of own
  `status` or `scheduledAt` requires all-of
  `content:write + content:publish`, even when the submitted value equals the
  client's stale/current value. Do not chain two independently queried guards;
  a concurrent role change cannot satisfy the permissions across snapshots.
  Dedicated publish/unpublish routes retain `content:publish`.
- **CSRF:** required for every PATCH/POST mutation and unchanged by this task.
- **Rate limit:** existing Admin content mutation policy; no new bucket.
- **Validation:** recursive reject-unknown, root `minProperties: 1`, plain
  validated JSON projection, and own-property checks only—never truthy checks.
  Empty body, inherited-only properties, unknown keys, invalid status/date, and
  malformed nested SEO/taxonomy fail before service invocation.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA not applicable.
- **Secrets/privacy:** no body, Post data, permissions, session values, or driver
  error is logged or returned in an authorization error.

## Exact Mutation Contract

`PostMetadataMutationV1` keeps the existing allowed keys and value shapes:
`status`, `scheduledAt`, `tags`, `taxonomy`, and `seo`. The schema adds no new
field, owns `minProperties: 1`, and remains recursively
`additionalProperties: false`. Projection copies an allowed key only when it
is an own property; nested `taxonomy` and `seo` use the same rule. An omitted
field stays omitted—especially `scheduledAt`—through the service call.

Publication ownership is syntactic and fail-closed: own `status` or own
`scheduledAt` requires `content:publish`, including `null`, a value equal to
the current DB value, or a pair that would otherwise be a no-op. The route does
not read the Post before making this decision. This avoids value-dependent
authorization and stale-client bypasses.

The Classic editor compares against the last successfully applied `PostDetail`:

- SEO-only change emits only `seo`;
- status or normalized schedule change emits both exact current `status` and
  its schedule (`scheduledAt` is ISO for `scheduled`, otherwise `null`);
- no change returns `null` and performs no request/cache broadcast;
- a successful response becomes the next baseline through existing
  `applyPost`; failure preserves the draft and baseline.

The modern `usePostEditorState` path stays read-only in this task; its existing
`snapshot.metadataPayload` must remain publication-field-free.

## Implementation Pseudocode

```ts
// core/services/posts/postMetadataContract.ts
export function projectPostMetadataMutation(
  validated: Record<string, unknown>
): PostMetadataMutationV1 {
  return copyAllowedOwnPostMetadataFieldsRecursively(validated);
}

export function requestsPostPublicationMutation(
  value: PostMetadataMutationV1
): boolean {
  return Object.hasOwn(value, "status") || Object.hasOwn(value, "scheduledAt");
}

// core/server/routes/postsRoutes.ts
export function toPostMetadataServicePatch(
  value: PostMetadataMutationV1
): UpdatePostMetadataInput {
  return {
    ...(Object.hasOwn(value, "status") ? { status: value.status } : {}),
    ...(Object.hasOwn(value, "scheduledAt")
      ? {
          scheduledAt:
            value.scheduledAt === null ? null : new Date(value.scheduledAt),
        }
      : {}),
    ...(Object.hasOwn(value, "tags") ? { tags: value.tags } : {}),
    ...(Object.hasOwn(value, "taxonomy") ? { taxonomy: value.taxonomy } : {}),
    ...(Object.hasOwn(value, "seo") ? { seo: value.seo } : {}),
  };
}

const requirePostMetadataWrite = requirePermission("content:write");
const requirePostMetadataWriteAndPublish = requirePermission([
  "content:write",
  "content:publish",
]);
router.patch(
  "/posts/:id/metadata",
  async (ctx) => {
    const rawBody = ctx.body ?? {};
    validate(postMetadataSchema, rawBody); // minProperties: 1 + reject unknown
    const body = projectPostMetadataMutation(asValidatedRecord(rawBody));
    await (requestsPostPublicationMutation(body)
      ? requirePostMetadataWriteAndPublish
      : requirePostMetadataWrite)(ctx); // exactly one DB permission snapshot
    return withPostErrors(async () => {
      const updated = await mutatePostMetadataAndFencePublicCache(
        ctx.params.id,
        toPostMetadataServicePatch(body),
        ctx.user?.id
      );
      if (!updated) throw new Error("post_not_found");
      return updated;
    }, {
      code: "post_metadata_update_failed",
      message: "Failed to update post metadata.",
    });
  }
);

// core/admin/ui/posts/editor/postMetadataMutationPayload.ts
export function buildPostMetadataMutationPayload(
  baseline: PostDetail,
  draft: PostMetadataDraft
): PostMetadataMutationV1 | null {
  const publicationChanged =
    draft.status !== baseline.status ||
    normalizeSchedule(draft.scheduledAt) !==
      normalizeSchedule(baseline.scheduledAt);
  const seoChanged = draft.seoDescription !== (baseline.seo?.description ?? "");
  const payload = {
    ...(seoChanged ? { seo: { description: draft.seoDescription } } : {}),
    ...(publicationChanged
      ? exactStatusAndSchedule(draft.status, draft.scheduledAt)
      : {}),
  };
  return Object.keys(payload).length === 0 ? null : payload;
}
```

**Data flow:** unknown body -> strict non-empty schema -> individually copied
own-property DTO -> publication classification -> exactly one all-of server
RBAC snapshot -> present-only Date conversion/service patch -> focused mutation
wrapper -> successful publication-state change clears the public site cache
before response. The browser's
permission/UI state is defense in depth only and cannot authorize the route.

**Error handling:** validation and the one conditional permission guard remain
outside the service-only `withPostErrors` boundary, so invalid input stays 400
and `forbidden` stays the centralized safe 403. Both occur before any Post
mutation/read, Post browser-cache mutation/broadcast, revision, or public-cache
effect. Known service errors retain their mappings; every unknown service/cache
error maps to redacted `post_metadata_update_failed` 500 without driver message
or stack. A committed mutation is never reported failed solely because cache
delivery needs durable reconciliation.

**Regression-test shape:** invoke the real registered route with a writer
lacking `content:publish`; tags/taxonomy/SEO without publication fields
succeeds and an existing scheduled value remains byte-for-byte unchanged,
while every own `status` enum member and `scheduledAt` (including `null` and an
unchanged-looking value) fails before the mocked service records a call. `{}`
and inherited-only/unknown fields fail validation with zero service calls. A
publisher succeeds. A publisher fixture must hold both `content:write` and
`content:publish`; `content:publish` alone remains unable to reach the route
handler. A type-level regression pins `PostsRouteDeps.requirePermission` as
the canonical `PermissionRequirement` from `core/server/middleware/rbac.ts`:
both `requirePermission("content:write")` and
`requirePermission(["content:write", "content:publish"])` type-check through
the same deps slot, and the route regression proves the all-of array middleware
denies a writer and admits a publisher with exactly one permission snapshot.
Client/editor tests prove ordinary saves omit status/schedule,
intentional transitions include exact fields, no-op saves make no request or
cache event, and successful calls retain existing browser-cache behavior. A
positive-TTL prewarmed public Post fixture becomes unavailable immediately after
metadata draft/archive transition, and role-swap concurrency cannot satisfy
write/publish across two snapshots. Unexpected service errors exercise the real
HTTP mapper and reveal neither message nor stack.

## Sub-Tasks

None. This board task is the execution-ready unit.

## Shared Runtime Smoke Contract

TASK-554 registers exactly one new suite, `task-554`, through the existing
platform and the recipes in `docs/develop/runtime-smoke-cookbook.md`. The
implementation changes all four static registration points:

- literal `task-554` in `scripts/runtime-smoke/contracts.ts`;
- `fast` and `certification` in `scripts/runtime-smoke/cli.ts`;
- fixed `scripts/runtime-smoke/adapters/task-554.ts` path and descriptor in
  `scripts/runtime-smoke/registry.ts`; and
- exact ID/path/profile expectations in
  `tests/unit/runtime-smoke/cli-registry.test.ts`.

The product-specific surface is limited to a thin adapter plus focused
registrations/handlers:

- `scripts/runtime-smoke/adapters/task-554.ts`;
- `scripts/runtime-smoke/adapters/task-554/browser-actions.ts`;
- `scripts/runtime-smoke/adapters/task-554/output-manifest.ts`;
- `scripts/runtime-smoke/adapters/task-554/worker-entry.ts`;
- `scripts/runtime-smoke/adapters/task-554/worker-operations.ts`; and
- `scripts/runtime-smoke/adapters/task-554/production-handlers.ts`.

These files compose the already-owned shared lifecycle, process supervisor,
condition polling, `WorkerPool` protocol/operation registry, one lazy pooled DB
worker with `DB_POOL_MAX=1`, `RunFixtureLedger` and set-based transactional
batch helpers, browser segment compiler/`BrowserTransport`, repository guard,
redaction, timing, screenshots, cleanup, and final report. They may
define strict task-specific operations, selectors, bounded queries, and visible
assertions; they must not copy a wrapper, lifecycle, worker framing/pool,
one-process-per-query loop, Playwright launcher, DB cleanup loop, polling loop,
checkpoint store, redactor, or reporter. A defect in a shared primitive is
fixed once in its shared owner with focused harness tests before this suite is
rerun.

The adapter rejects every suite/profile mismatch with `SmokeError`, uses exact
least-privilege child environments, starts listeners before navigation,
restarts and probes the real Admin/front host, registers every resource
immediately, and cleans only synthetic actor-owned fixtures through exact
ownership ledgers. No table truncation, broad installation delete, fixed sleep,
mutation replay after an uncertain response, live credential, raw customer
data, or task-local browser/DB lifecycle is allowed.

Both profiles report exactly these seven distinct scenarios in order:

| # | Scenario ID | Visible and persisted proof |
| ---: | --- | --- |
| 1 | `writer-metadata-save-preserves-schedule` | `content:write`-only actor edits SEO/tags on a scheduled Post; visible success and cache refresh occur, while persisted status and exact schedule remain unchanged |
| 2 | `writer-status-publish-denied` | writer submits own `status: published`; safe permission denial is visible and there is zero Post mutation/revision/Post browser-cache broadcast/public-cache/front mutation; the standard permission-denial notification/permission refresh remains allowed |
| 3 | `writer-schedule-denied` | writer submits own schedule fields, including the UI's status/date pair; safe denial is visible and the prior draft/schedule bytes remain unchanged |
| 4 | `publisher-schedule` | actor holding both permissions schedules a Post; normalized time and scheduled state are visibly and persistently exact |
| 5 | `publisher-publish` | actor holding both permissions publishes; Admin state and front-visible Post agree |
| 6 | `publisher-unpublish` | actor holding both permissions intentionally returns the Post to draft; Admin shows draft and front no longer exposes it |
| 7 | `publisher-archive` | actor holding both permissions archives; Admin shows archived and front remains absent |

Each scenario starts from a deterministic owned baseline, asserts computed
visibility/DOM/ARIA plus the bounded DB/read-model state, captures a reviewed
PNG, proves zero `console`/`pageerror` events, restores all rows/cache/settings,
and returns one independent report result only after cleanup and absence proofs.
All seven scenarios run on every invocation; there is no runtime scenario seal,
checkpoint, resume, or selective replay. Fast
runs all seven and covers light/dark plus 1440x900/390x844 across the matrix;
certification repeats every Admin-visible scenario in both themes and both
viewports.

The terminal shared `SmokeScenarioResult` intentionally contains only
`id/pass/elapsedMs`; TASK-554 does not widen it. Instead,
`output-manifest.ts` owns a strict ordered seven-row map from each scenario ID
to one canonical PNG filename under
`_docs/_workflows/_smoke/task-554/<session>/`. The adapter validates the exact
scenario order, one unique regular non-symlink PNG per row, bounded decoded PNG
dimensions/bytes, and SHA-256, then returns the same seven paths/hashes in the
shared report's global `screenshots` array in matching order. Missing, extra,
duplicate, reordered, symlinked, malformed, or hash-mismatched evidence fails as
`smoke_output_invalid`. Focused tests pin all seven IDs, filenames, ordering,
profile/session path binding, and the scenario-index-to-screenshot-index
bijection without adding a second reporter or shared scenario field.

Evidence is written only below
`_docs/_workflows/_smoke/task-554/<session>/`. The owning workflow creates the
exact session directory before invocation and redirects the runner's canonical
stdout bytes directly to `report.json`; it never parses, reserializes, or
constructs a report. A focused workflow test proves the saved bytes equal the
runner stdout exactly and the JSON report's global screenshot array equals the
validated output manifest. Fast evidence is candidate-only and removed/proven
absent before certification. Certification evidence is owner-reviewed under the
workflow guard. No TASK-545 manifest or checkpoint exists for this predecessor
task.

The exact commands are:

```bash
mkdir -p _docs/_workflows/_smoke/task-554/task-554-fast
bun scripts/runtime-smoke.ts run \
  --suite task-554 --profile fast --session task-554-fast \
  > _docs/_workflows/_smoke/task-554/task-554-fast/report.json
mkdir -p _docs/_workflows/_smoke/task-554/task-554-certification
bun scripts/runtime-smoke.ts run \
  --suite task-554 --profile certification --session task-554-certification \
  > _docs/_workflows/_smoke/task-554/task-554-certification/report.json
```

## Testing Requirements

Run these exact owning lanes:

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/validation/postSchemas.test.ts \
  tests/vitest/server/postMetadataContract.test.ts \
  tests/vitest/admin/postsClient.test.ts \
  tests/vitest/ui/post-metadata-mutation-payload.test.ts \
  tests/vitest/ui/post-classic-editor-shell-wave.test.tsx
bun test \
  tests/integration/routes/postsRoutes.test.ts \
  tests/integration/routes/postMetadataRbac.test.ts
bun test \
  tests/unit/runtime-smoke/cli-registry.test.ts \
  tests/unit/runtime-smoke/task-554-adapter.test.ts \
  tests/unit/runtime-smoke/task-554-worker.test.ts
bun test \
  tests/unit/workflows/task554AuthorAudit.test.ts \
  tests/unit/workflows/task554WorkflowContracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
bun run precommit:check
mkdir -p _docs/_workflows/_smoke/task-554/task-554-fast
bun scripts/runtime-smoke.ts run \
  --suite task-554 --profile fast --session task-554-fast \
  > _docs/_workflows/_smoke/task-554/task-554-fast/report.json
mkdir -p _docs/_workflows/_smoke/task-554/task-554-certification
bun scripts/runtime-smoke.ts run \
  --suite task-554 --profile certification --session task-554-certification \
  > _docs/_workflows/_smoke/task-554/task-554-certification/report.json
git diff --check
```

The route lane includes explicit writer-versus-publisher fixtures, `{}`/
prototype/unknown cases, service-call counters, and schedule-preservation proof.
Run only additional shared lifecycle/worker/DB/browser/report tests
whose primitives actually changed. Both smoke profiles require the exact seven
passing scenarios, reviewed screenshots, zero console/page errors, and complete
cleanup. The adapter test pins the exact seven-row output manifest and global
report-array bijection; the workflow test pins byte-identical stdout capture as
`report.json` and rejects parsed/reserialized or missing output.

The workflow freezes `TASK_554_BASELINE_SHA` in its verified pre-task receipt.
This baseline-through-final command includes committed intermediate work and
untracked files, counts physical lines with the canonical NUL-safe counter
`awk 'END { print NR }'` (a final line without a trailing newline still counts
as one physical line, unlike a newline-only count), covers
`.ts/.tsx/.js/.jsx/.mjs/.cjs/.mts/.cts`, and exits nonzero for every touched
human-authored production or test module above 1,000 physical lines. The
`task554WorkflowContracts.test.ts` suite pins this counter against an
unterminated-final-line fixture and proves the counted result equals the
physical line count:

```bash
test -n "${TASK_554_BASELINE_SHA:-}"
git cat-file -e "${TASK_554_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_554_BASELINE_SHA}" >&2; exit 1; }
task554_line_failure=0
while IFS= read -r -d '' task554_path; do
  task554_lines=$(awk 'END { print NR }' "$task554_path")
  if test "$task554_lines" -gt 1000; then
    echo "$task554_path:$task554_lines" >&2
    task554_line_failure=1
  fi
done < <(
  {
    git diff --name-only -z --diff-filter=ACMRT "$TASK_554_BASELINE_SHA" -- core packages scripts tests _docs/_workflows
    git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows
  } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|js|mjs|mts|cts)$' | sort -zu
)
test "$task554_line_failure" -eq 0
```

## Acceptance Criteria

- A `content:write`-only actor cannot change any Post publication state through
  metadata, direct HTTP, stale UI payload, or omitted/truthy-field trick.
- The same actor can still edit non-publication metadata without receiving an
  unnecessary publish requirement, and a writer-only edit cannot clear an
  omitted schedule.
- An actor holding both `content:write` and `content:publish` can use the
  intended publish/schedule/unpublish flows; `content:publish` alone does not
  imply metadata-write access and current UX/cache semantics remain intact.
- No service call or cache event occurs after RBAC denial.
- `{}`, unknown keys, inherited-only fields, and a client no-op produce no
  service mutation; the first three fail validation and the client no-op skips
  the request.
- `task-554` is statically registered through the shared cookbook architecture;
  both profiles pass all seven visible flows without a task-local wrapper,
  helper, worker/lifecycle, Playwright, DB cleanup, or reporting loop.
- TASK-414-05 lists TASK-554 terminal as a hard dependency before Agent Post
  actions.
- TASK-551-03-L02 lists TASK-554 terminal as a hard dependency, limits its
  shared Post-file edits to list contracts, preserves the metadata contract,
  and reruns this task's unchanged route/schema/client/RBAC tests.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/RBAC_SPEC.md`
- `_docs/SECURITY_SPEC.md`
- `docs/develop/runtime-smoke-cookbook.md` with the exact `task-554` registration,
  scenario, shared-wrapper/helper/worker, profile, and command recipe
- `docs/develop/assistant.md` only for the TASK-414 Post-action dependency
- `_docs/_TASKS/README.md`
- changelog 1267 and changelog index

Closure order is implementation plus product/security docs and cookbook ->
targeted/full gates -> independent five-lens post-audit and affected fix loop ->
fast then certification shared-runner smoke -> owner evidence review plus exact
cleanup/repository-restoration proof -> changelog 1267/index -> task board row/
statistics -> this task `✅ Done`. No docs/source/test/workflow change is allowed
after certification; any such need invalidates the smoke and returns to the
affected gate/post-audit/smoke phases. Do not edit any
TASK-414/TASK-547 task state or changelog 1266 during TASK-554 closure.
