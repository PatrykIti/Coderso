# TASK-554: Post Metadata Publish RBAC Hardening
# FileName: TASK-554_Post_Metadata_Publish_RBAC_Hardening.md
**Priority:** Critical
**Category:** Posts / RBAC / Security
**Estimated Effort:** Medium
**Dependencies:** None
**Related Tasks:** TASK-414-05, TASK-545, TASK-551-06, TASK-551-09
**Status:** 🚧 In Progress
**Started:** 2026-08-11
**Discovered:** 2026-08-07 during TASK-414 contract audit
**Contract Refreshed:** 2026-08-11
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
transaction or public Post-cache invalidation. TASK-551-09-L02 owns the
atomic mutation/invalidation handoff and TASK-414-05 consumes it. TASK-554
keeps the existing browser-cache behavior after a successful Admin response,
but does not touch the already oversized `postsService.ts` and does not add a
Post mutation wrapper.
## Isolation and Collision Guard
- Execute on the owner-authorized `feat/implementations` feature branch.
  Changelog 1267 is reserved only for TASK-554. The pre-existing untracked
  `_TMP-task-dispatch-plan-2026-08-10.md` is external owner state: record and
  preserve it byte-for-byte; never stage, edit, or delete it.
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
  `docs/develop/runtime-smoke-cookbook.md` are serialized seams. Their central
  writer order is TASK-554 -> TASK-545 -> TASK-548-02-L02 -> TASK-414-11-L01.
  TASK-548-04-L03 and TASK-548-07-L01 contribute only their focused modules
  after the fixed TASK-548 rows exist; they never rewrite a central seam.
  The broader product-contribution order remains TASK-554 -> TASK-545 ->
  TASK-548-02-L02 -> TASK-548-04-L03 -> TASK-548-07-L01 -> TASK-414-11-L01.
  TASK-554 rereads every current shared file and preserves all existing suites;
  concurrent or reverse-order central-seam edits are forbidden.
- The owner-authorized final security-gate repair additionally owns only the
  root `package.json` / `bun.lock` vulnerability overrides for `js-yaml`
  `4.3.1` and `nanoid` `3.3.17`, plus TASK-540's fixed-loopback public
  bot-protection smoke preflight and its focused boundary test. It must not
  alter the production bot-protection route, suppress Semgrep/Trivy/Bun-audit,
  or widen TASK-540's smoke host. This narrow repair is validated by a fresh
  dependency/security audit, its focused harness test, package install,
  strict security scan, and the complete TASK-554 validation tail.
- Terminal TASK-551-03-L02 is the later serialized writer of bounded Post-list
  regions in `routes/index.ts`, `postsRoutes.ts`, `postSchemas.ts`, and
  `postsClient.ts`. Its canonical task dependency is TASK-554. It must preserve
  this task's `postMetadataContract` re-exports, present-only payload,
  conditional `content:publish` behavior, and `updatePostMetadata` factory
  injection in `routes/index.ts`, then rerun this task's exact
  route/schema/client/RBAC tests. It does not own this task's metadata regions.
- TASK-551-09-L02 remains the sole owner of
  `core/services/content/postsService.ts`,
  `core/services/content/postMutationService.ts`, and complete post-cache/front-parity invalidation.
  TASK-554 must not introduce a sidecar cache wrapper or make public-cache
  freshness claims; its successful Admin mutation retains only the existing
  browser cache update/broadcast behavior.
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
- `_docs/_workflows/task-554-closeout.mjs`;
- `tests/unit/workflows/task554AuthorAudit.test.ts`; and
- `tests/unit/workflows/task554WorkflowContracts.test.ts`.
The scripts pin task ID `TASK-554`, changelog `1267`, the source/test/docs/smoke
ownership in this contract, and the concurrent-stream forbidden paths above.
They reject caller-supplied task IDs, changelog numbers, file owners, workflow
entries, phase skipping/reordering, unknown arguments, an agent-authored `identity`
(schemas reject it and the workflow adds its expected immutable identity locally), missing structured results, stale audit receipts, dirty forbidden
paths, staging, commit, push, or TASK-414/TASK-547/changelog-1266 writes.
Author/audit runs one complete
fresh per-contract audit plus cross-file reconcile and repeats only verified
changed scopes. Implement dispatches each single-writer source/test slice
sequentially and gates it before the next. Fix may edit only owners derived from
evidence-backed findings and must return the exact affected owner/lens IDs.
The immutable phase order is:
0. owner-review bootstrap and committed tracked-byte verification for the four
   ignored-by-default workflow entries;
1. read-only research and complete contract author/audit convergence;
2. sequential workflow-contract-test, schema/route, client, UI, and
   smoke-adapter/worker implementation with a tracked before/after single-writer
   and forbidden-path gate after every owner;
3. product/security documentation and the cookbook, still before post-audit and
   smoke; no source, test, workflow, task-contract, or product-doc change is
   permitted after certification;
4. executable targeted behavioral lanes plus full static/security/precommit,
   baseline-through-final line-count, and both committed/uncommitted diff gates;
5. one independent post-audit with exact lenses `scope-fidelity`,
   `rbac-fail-closed`, `present-only-byte-identity`, `cross-stream-smoke`, and
   `test-integrity`; a non-clean result runs only the affected fix owner/lens
   gates and fresh affected-scope reconcile, then requires the explicit
   `--task-554-resume-after-fix` full-validation/post-audit/smoke continuation;
6. shared-runner fast, then certification smoke, each running all seven flows;
7. explicit owner review of certification report/screenshots plus exact cleanup
   and repository-restoration proof; the implementation script stops here;
8. owner-controlled metadata-only closeout: durable
   `1267-2026-08-11-task-554-post-metadata-publish-rbac-hardening.md`, its
   changelog index row, and only TASK-554’s board row/statistics while the task
   remains `🚧 In Progress`;
9. a fresh owner-dispatched read-only metadata-drift pass; and
10. TASK-554’s own `✅ Done` status/completion evidence as the sole terminal
    write, after the clean drift receipt.
Workflow/unit fixtures prove every phase edge, literal lens inventory,
single-writer and forbidden-path guards, all-result semantics, fix-loop
fingerprints, exact smoke commands/session identities, no runtime scenario
resume, owner-review handoff, and narrow manual-closeout validators. Because TASK-545 does not yet exist at
execution time, TASK-554 must not fabricate or copy its future manifest/
checkpoint/closure API. TASK-545 later inventories and migrates these four
tracked scripts under its canonical owner tests; it never retroactively converts
TASK-554's already accepted smoke evidence into a TASK-545 checkpoint.
Only after validated clean three-lens audit results plus reconcile, the
orchestrator records one deterministic ignored integrity receipt at
`_docs/_workflows/_smoke/task-554/author-audit-receipt.json`. It contains only
the task/baseline/HEAD, the ordered exact lens identities
`task-554:audit:security`, `task-554:audit:ui`, and
`task-554:audit:workflow`, reconcile identity, and the
SHA-256 of the whole-repository fingerprint *excluding that receipt itself*.
The implementation start gate accepts it only as a regular non-symlink file
whose exact fingerprint/HEAD still match. Before its first dispatch it also
rejects staging and every normal dirty path except the declared owner state
`_TMP-task-dispatch-plan-2026-08-10.md` and TASK-554's task file/board row.
Stable pre-existing ignored workflow artifacts are bound by the receipt
fingerprint rather than misclassified as new dirt. The receipt/fingerprint is
an implementation-integrity guardrail, never independent closure authority; the
truthfully recorded validation, smoke, and explicit owner review control closure.
A fix round similarly binds its fresh read-only audit fingerprint to
the immediately following repair and rejects staged or forbidden dirt before
audit, repair, and reconcile; a changed audit receipt fails rather than being
silently reused. A clean affected-scope reconcile is not closure authority: it
returns the explicit `resume_full_validation_post_audit_smoke` handoff. The
owner then invokes the mutually exclusive
`--task-554-resume-after-fix` mode, which permits only the declared
source/test/documentation paths plus the predeclared task/board owner state,
reruns full validation, fresh five-lens post-audit, and both shared-runner smoke
profiles before returning to owner review. The normal start mode never accepts
that landed product diff, so a fix cannot accidentally skip the required tail.
Every dispatch, gate, smoke, and fix first rejects global staging/forbidden dirt
and uses a `finally`-bound exact mutation fingerprint. Every fingerprint also
covers a bounded stable nofollow `.tmp` inventory (directory/file
device+inode+mode; SHA-256 bytes; regular files require one link; symlinks,
hard links, oversized entries, and ancestor replacement fail closed). A write
is a failed read-only gate, except literal `bun run gates:coderso`: its sole
report is restored in place only when its original identity survives, then the
full `.tmp` inventory must match; unexpected residue fails closed. Repairs
derive affected owner/lens from actual changed paths, not incoming claims; empty
repairs fail, clean reconcile succeeds, and a non-clean reconcile starts the
next bounded round. Fingerprints cover tracked/unignored paths and a bounded
nofollow `lstat` walk of `_docs/_workflows/` (type, mode, target/bytes). Smoke accepts only the
regular session entry, report, and manifest-derived seven PNG paths after stable nofollow
descriptor reads (pre/post `fstat` plus final `lstat`), exact-byte decoding,
and immediate semantic revalidation before final snapshot comparison; no
recursive exclusion is permitted. Any runner/manifest/decoder/evidence failure
fails closed, retaining the primary error over a restoration error.
The directory `_docs/_workflows/` is globally ignored at the refreshed HEAD, so
these scripts have an explicit bootstrap checkpoint before phase 1. Freeze
`TASK_554_BASELINE_SHA=f6705443e129c9e89c32763405800b72ba3a0680` before they
are authored. The orchestrator authors only the four exact scripts, reports
their normalized paths and SHA-256 values as `owner_action_required`, and
stops. It never stages them. After owner review and the explicitly authorized
force-add/commit, a fresh invocation must prove each named path through `git
ls-files --error-unmatch`, regular-file/no-symlink checks, and byte equality
with `git show HEAD:<path>`, confirms the frozen baseline is an ancestor of
`HEAD`, and rejects every extra *tracked* path in the TASK-554 workflow
namespace (including nested, lookalike, and non-`.mjs` entries). Ignored local
leftovers are non-authorizing and are not recursively inventoried. Missing,
dirty, ignored-only, substituted, non-byte-identical, or divergent-baseline
entries fail before every agent-dispatch phase in all three workflows. The
workflow tests simulate clean, dirty, absent, symlinked, non-byte-identical,
untracked-extra, and tracked-extra bootstrap cases.
A defect whose evidence requires changing one of these four pinned workflow
scripts is not an in-flight fix-owner action. The fix workflow returns the
structured `owner_review_rebootstrap` stop receipt before dispatch, with all
four script paths forbidden to repair agents. The owner must review the
specific script change, force-add and commit exactly the four canonical
entries, rerun bootstrap verification, and restart a fully fresh author/audit
round. A test-only workflow finding may use the normal test owner; it must not
modify a pinned script. The author/audit parser permits only normal run,
bootstrap self-test, or bootstrap verification. The implementation parser adds
only the mutually exclusive `--task-554-resume-after-fix` continuation; the
closeout module permits only its snapshot/self-test/two validation modes. The
author/audit, implementation post-audit/final-drift, and fix workflows
independently reject a result unless it has exactly the declared top-level and
finding keys, bounded non-empty summary/evidence fields, allowed severity,
boolean `pass`, and findings whose HIGH/MEDIUM contents agree with `pass`; an
agent schema declaration is not validation. Fix audits may surface a
`metadata-closure` or `terminal-status` owner only as the structured
`terminal_phase_receipt_required` stop; those terminal owners are never normal
repair dispatch targets.
## Verified Anchors and Single-Writer Ownership
- new pure `core/services/posts/postMetadataContract.ts`: sole owner of
  `PostMetadataMutationV1`, `POST_METADATA_REQUEST_MAX_BYTES = 64 * 1024`, the
  recursively strict schema, own-property projection, publication-field
  predicate, and present-only schedule normalization. It also owns
  `parseExactRfc3339DateTime`: a pure,
  Gregorian-calendar-aware parser for the existing uppercase RFC3339 wire
  shape. It returns `undefined` for invalid syntax, calendar days, clock
  values, offsets, or non-finite instants. It has no DB/server/settings or
  `ApiError` import and is safe to consume from server and Admin bundles;
- `core/server/validation/postSchemas.ts`: compatibility re-export of the one
  owned `postMetadataSchema`; do not duplicate the schema;
- `core/server/routes/postsRoutes.ts`: metadata route, one pre-created
  conditional `content:publish` middleware, exact projection, present-only
  service patch, and the owned widening of `PostsRouteDeps.requirePermission`
  to the canonical `PermissionRequirement` (`string | readonly string[]`)
  imported from `core/server/middleware/rbac.ts`, so both the string guard and
  the all-of array guard type-check through the same deps slot;
- `core/server/routes/index.ts`: supplies the explicit `updatePostMetadata`
  dependency to the route factory. This is the sole real-HTTP binding; the
  route-level test injects a recording updater/guards to prove selection and
  zero mutation calls without weakening the real-HTTP contract;
- `core/server/httpServer.ts`: the narrowly owned matched-route parser-error
  boundary. Its named `resolveMatchedRouteBodyOptions` returns exactly the pure
  64 KiB option only for `PATCH /posts/:id/metadata` and `undefined` for every
  other route (including `POST /media`); the parser consumes that selector
  before session attachment. It
  catches only that parser failure, charges the existing matched anonymous
  route bucket, normalizes an unknown non-`ApiError` to the redacted stable
  `invalid_request_body` / 400 envelope before the existing JSON error response,
  and records one anonymous access-log receipt, then returns. Known
  `invalid_json`, `invalid_form`, `payload_too_large`, and `rate_limited`
  envelopes remain unchanged. It does not move session, CSRF, or route middleware;
- `core/admin/services/postsClient.ts`: import/re-export the exact shared
  metadata DTO and retain existing CSRF/cache behavior. Focused private
  per-Post-detail generations capture every forced detail GET/detail mutator
  before dispatch, while a private Post-list publication epoch records each
  post row newer than an in-flight list GET. A successful non-delete mutation
  may advance generation, clear a tombstone, upsert, or broadcast only while
  its captured generation is current; a successful loser awaits a guarded
  forced detail read and emits the existing list/detail update events only when
  that fresh detail is still current and non-tombstoned. A list GET that began
  before a later mutation never overwrites that row: it merges the current
  detail/tombstone projection into its response, writes the reconciled list,
  and returns that same list to its caller. A successful delete always advances,
  tombstones, removes, records the list-row epoch, and invalidates. Every
  successful status-only publish/unpublish advances its current generation and
  awaits that full guarded read before any detail/list update or broadcast,
  regardless of a cached detail, so it cannot retain a cleared schedule. A
  stale GET returns current detail when present. If delete crossed its
  generation, its `null` tombstone wins over resolved or exact `ApiClientError`
  404 stale GETs without retry or cache repopulation. The existing
  `clearPostsCache` atomically resets every TASK-554 detail generation,
  tombstone, row-publication epoch, list epoch, and in-flight list bookkeeping
  structure with the existing caches. A private
  `publishPostMutationCacheEvents(id)` emits exactly one existing list `update`
  event followed by exactly one detail `update` event only after a current,
  non-tombstoned full detail is accepted; delete keeps its existing ordered
  list/detail `invalidate` events and never emits an update. This is not a new cache
  wrapper, generic cache redesign, or public-cache invalidation surface;
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` around the verified
  `handleSaveMetadata` call (baseline line 346), which currently sends `status`
  and `scheduledAt` on every metadata save. It reuses the existing unmodified
  `useEntrySnapshotAuthority` and `useEntryEditTracker` helpers for
  screen-local snapshot ordering and per-field submit ticks. The shell owns
  the identity-bound hydration gate, route epoch, metadata baseline/draft
  revision, opaque synchronous mutation lease, and stale-response protection
  for all Classic Post mutation continuations;
- new focused
  `core/admin/ui/posts/editor/postMetadataMutationPayload.ts`, which owns the
  baseline-versus-draft comparison and its discriminated result: `noop`,
  `schedule_required`, `invalid_schedule`, or a non-empty present-only DTO;
- `core/admin/ui/posts/PostEditorPage.tsx` is a read-only integration seam in
  this task. TASK-554 does not key, remount, or otherwise change that page;
  `PostClassicEditorShell`'s identity-bound route epoch is the authoritative
  A-to-B navigation guard and must remain correct when the page reuses the
  shell instance. The focused shell hydration test owns this proof, not a page
  behavior change;
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` around baseline line
  1581 is a read-only verified control: its `snapshot.metadataPayload` already
  contains only tags/taxonomy/SEO. Do not touch this 2,713-line legacy module in
  TASK-554; source/behavior tests must prove it remains publication-field-free;
- `tests/vitest/server/requestBody.test.ts`: task-specific controlled 64 KiB
  stream sentinel/cancellation proof; real HTTP owns only externally observable
  413/log/no-session-RBAC-service assertions.
- route/schema/client/UI tests for the touched contracts, including a focused
  modern-editor boundary test and real HTTP/session/CSRF RBAC coverage.
- `tests/unit/workflows/task554AuthorAudit.test.ts` and
  `tests/unit/workflows/task554WorkflowContracts.test.ts`: one
  `workflow-contract-tests` owner before product owners. They are the only
  writers of the tracked workflow-script behavioral-contract tests.
No other task may edit those exact regions while TASK-554 is in progress.
`core/services/content/postsService.ts`, the planned
`core/services/content/postMutationService.ts`, and the oversized
`usePostEditorState.ts` are forbidden. If implementation evidence
proves a service edit is unavoidable, stop and amend the task; first split the
1,010-line module by cohesive responsibility under the repository line gate.
## Security Contract
- **Visibility:** existing internal Admin routes only; no public endpoint.
- **Auth:** existing authenticated Admin session. After the shared parser has
  produced a metadata body at or below its matched-route 64 KiB cap, the
  handler rejects missing `ctx.user` as `auth_required` before body
  validation/classification, RBAC, Post reads, and mutation work. The parser
  necessarily processes syntactically malformed JSON before session attachment.
  TASK-554 selects the cap only for the exact metadata route; media/upload and
  every other route retain their current parser options. Before mapping a
  malformed or oversized body, it charges the existing route-selected anonymous
  bucket using only resolved IP/user-agent and `isAuthenticated: false`; it
  never derives an identifier from unparsed bytes. Within quota it maps to
  `invalid_json` / 400, `invalid_form` / 400, `payload_too_large` / 413, or an
  unknown parser failure to redacted `invalid_request_body` / 400 and records exactly one
  anonymous access log (`userId`/`sessionId` null). Declared over-limit input
  fails before a pull; missing or lying `Content-Length` is cancelled at 64 KiB
  + 1 bytes. Exhausted quota maps/logs the existing `rate_limited` / 429
  envelope. Successfully parsed anonymous input still reaches the handler and
  returns `auth_required` / 401. Actor permissions remain server-owned.
- **RBAC:** metadata performs exactly one permission lookup/snapshot. A request
  without publication-owned fields requires `content:write`; presence of own
  `status` or `scheduledAt` requires all-of
  `content:write + content:publish`, even when the submitted value equals the
  client's stale/current value. Do not chain two independently queried guards;
  a concurrent role change cannot satisfy the permissions across snapshots.
  Dedicated publish/unpublish routes retain `content:publish`.
- **CSRF:** required for every PATCH/POST mutation and unchanged by this task.
- **Rate limit:** existing Admin content mutation policy; no new bucket.
- **Validation:** recursive reject-unknown, root and nested `taxonomy`/`seo`
  `minProperties: 1`, plain validated JSON projection, and own-property checks
  only—never truthy checks. Structural schema validation is followed by pure
  semantic schedule validation: an own non-null `scheduledAt` is parsed with
  `parseExactRfc3339DateTime` after projection and before conditional RBAC or
  service work. February 30, April 31, hour 24, invalid leap days, and invalid
  clock/offset ranges return the existing `validation_error` / 400 envelope;
  omitted `scheduledAt` stays absent and `null` remains an intentional clear.
  Empty body, inherited-only properties, unknown keys, invalid status/date, and
  empty or malformed nested SEO/taxonomy fail before service invocation.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA not applicable. The exact
  metadata PATCH has the pre-auth 64 KiB streaming cap before RBAC, service, or
  JSON allocation; it reuses the existing 413 envelope and anonymous Admin
  write bucket without adding a route-specific bucket.
- **Secrets/privacy:** no body, Post data, permissions, session values, or driver
  error is logged or returned in an authorization error.
## Exact Mutation Contract
`PostMetadataMutationV1` keeps the existing allowed keys and value shapes:
`status`, `scheduledAt`, `tags`, `taxonomy`, and `seo`. The schema adds no new
field, owns `minProperties: 1` at root and for every nested `taxonomy`/`seo`
object, and remains recursively `additionalProperties: false`. Projection
copies an allowed key only when it is an own property; nested `taxonomy` and
`seo` use the same rule. An omitted field stays omitted—especially
`scheduledAt`—through the service call.
Publication ownership is syntactic and fail-closed: own `status` or own
`scheduledAt` requires `content:publish`, including `null`, a value equal to
the current DB value, or a pair that would otherwise be a no-op. The route does
not read the Post before making this decision. This avoids value-dependent
authorization and stale-client bypasses.
The Classic editor compares against an identity-bound metadata baseline
`{ postId, routeEpoch, detail }` from an accepted forced read or accepted own
metadata response. A cache-resident initial Post is a preview only and never a
baseline. A route identity change synchronously invalidates the baseline and
increments its epoch; a pending A response may install a baseline only when it
still matches the current B route identity and epoch. One
`canMutateCurrentPost={hasHydratedCurrentPostBaseline && !isPostMutationInFlight}`
predicate, where the baseline matches the current `postId` and route epoch,
gates every Classic mutation control and handler: both metadata Saves, Save
draft, Publish/Update, and their refresh continuations. Each handler repeats
the exact identity/epoch/latch check before validation or a request. Thus a
stale cached A preview cannot PATCH or update B.
The shell takes one existing `useEntrySnapshotAuthority` ticket before every
state-writing `getPostCached`, `updatePost`, `updatePostMetadata`, and
publish-refresh continuation. A successful mutation supersedes outstanding
snapshot tickets. It also acquires one opaque ref-backed lease
`{ postId, routeEpoch, operationId }` synchronously before dispatch. Any new
mutation or cache/read continuation that does not hold that exact lease defers;
the already-published **Update** branch and its publish-owned refresh reuse
their caller's lease, and only the outermost owner finally releases it. This
prevents both accidental re-entrant denial and a same-tab cache-bus callback
which fires synchronously before a mutation promise settles.
The shell reuses `useEntryEditTracker` without modifying it. Each Classic
content input records its exact content key and every status/schedule/SEO
setter records its metadata key. Each request captures `beginSubmit()` before
dispatch. For an accepted current lease, it first calls `settleSubmit` only for
the exact submitted keys whose ticks are not newer, then derives `editedKeys()`
for hydration. Snapshot hydration therefore never overwrites a newer local
title, slug, excerpt, body,
featured-image, featured flag, status, schedule, or SEO draft. The shell owns
a monotonic `metadataDraftRevision`; a response may advance a matching
baseline, but replaces visible metadata controls only when the submitted/read
revision is still current. Accepted metadata responses use a metadata-only
Post merger and never `applyPost`; accepted content responses merge only
non-newer content fields. Thus an update response delayed behind later typing
cannot clear that newer draft.
Background cache refresh during a local draft or another lease is deferred
through the existing remote-update indication; explicit refresh is the only
action that may discard a draft and it cannot start while a lease is held. The
client-side force-read generation barrier also prevents a response begun before
a successful mutation from overwriting that mutation in the browser cache. A
successful non-delete response that lost publication authority must await a
guarded post-generation forced read rather than leave the cache at an earlier
mutation, and it broadcasts the fresh accepted detail only after that guard.
Every successful status-only publish/unpublish likewise awaits that read before
any list/detail cache write or broadcast, even when a detail is already cached;
the resulting event must follow fresh `scheduledAt: null`. A list read started
before a detail mutation merges that newer detail or tombstone before it writes
or returns its list, including when the read was triggered by an existing
cache-bus event. This is deliberately narrow to the Post detail/list cache and
does not create a second lifecycle or cache API.
The focused behavior is:
- SEO-only change emits only `seo`;
- status or normalized *effective* schedule change emits both exact current
  `status` and its schedule (`scheduledAt` is ISO for `scheduled`, otherwise
  `null`). A stale date in a non-scheduled draft is canonicalized to `null`, so
  scheduled -> draft -> no-op does not create a publication-owned payload;
- no change returns `{ kind: "noop", settleKeys }`, where `settleKeys` contains
  exactly the metadata fields demonstrated baseline-equal by the builder. The
  shell tick-safely settles those keys with no request/cache broadcast, clearing
  false unsaved state while preserving edits made after the submit tick;
- before comparing or serializing an effective schedule, every non-empty
  Classic `scheduledAt` draft is passed unchanged to the browser-safe
  `parseExactRfc3339DateTime` owner. Invalid calendar/clock/offset input returns
  a local `invalid_schedule` result (never `new Date(...).toISOString()`), sets
  the existing field error, and performs no mutation request or cache event;
- a successful response becomes the next metadata baseline. It replaces the
  controls only when no newer metadata draft was made during the request;
  cache refreshes, prior force reads, draft-save responses, published-update
  continuations, and older metadata responses otherwise preserve the draft and
  all unrelated title/body/featured local edits; failure preserves both draft
  and baseline.
The modern `usePostEditorState` path stays read-only in this task; its existing
`snapshot.metadataPayload` must remain publication-field-free.
## Implementation Pseudocode
```ts
// core/services/posts/postMetadataContract.ts
export const POST_METADATA_REQUEST_MAX_BYTES = 64 * 1024;
// core/server/httpServer.ts -- inside the already matched-route loop
  // Parsing remains before session attachment. This catches only parser failure,
  // first charges the existing anonymous route bucket, logs exactly once without
  // an actor, and never reaches the later route catch.
export function resolveMatchedRouteBodyOptions(
  route: Pick<RouteDefinition, "method" | "path">
): ParseRequestBodyOptions | undefined {
  return route.method === "PATCH" && route.path === "/posts/:id/metadata"
    ? Object.freeze({ maxBytes: POST_METADATA_REQUEST_MAX_BYTES })
    : undefined; // preserves every pre-existing route, including media uploads
}
const bodyOptions = resolveMatchedRouteBodyOptions(route);
let body: unknown;
try {
  body = await parseRequestBody(req, bodyOptions);
} catch (parseError) {
  try {
    checkRateLimit(
      resolveRateLimitBucket(req.method, pathname),
      { ip: resolveIp(req), userAgent: req.headers.get("user-agent") ?? undefined },
      security.rateLimit,
      { isAuthenticated: false }
    );
  } catch (rateLimitError) {
    return anonymousParserErrorResponse(rateLimitError); // exactly one 429 log
  }
  return anonymousParserErrorResponse(parseError); // exactly one invalid_json log
}
function anonymousParserErrorResponse(error: unknown) {
  const known = error instanceof ApiError && new Set([
    "invalid_json", "invalid_form", "payload_too_large", "rate_limited",
  ]).has(error.code);
  const safeError = known
    ? error
    : new ApiError("invalid_request_body", "Invalid request body.", 400);
  const response = errorResponse(safeError); // never serializes a raw stream/parser error
  responseHeaders.forEach((value, key) => response.headers.append(key, value));
  void recordAccessLog({
    method: req.method,
    path: url.pathname,
    status: response.status,
    ip: resolveIp(req) ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    userId: null,
    durationMs: Date.now() - requestStart,
  });
  return response;
}
const ctx: RouteContext = { /* existing fields */, body };
await attachUserFromSession(ctx);
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
export function parseExactRfc3339DateTime(value: string): Date | undefined {
  const parts = parseUppercaseRfc3339Parts(value);
  if (!parts || !isValidGregorianDate(parts) || !isValidClockAndOffset(parts)) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}
// core/server/routes/postsRoutes.ts
const invalidScheduledAt = () =>
  new ApiError("validation_error", "Invalid payload", 400, [
    { path: "scheduledAt", message: 'must match format "date-time"', keyword: "format" },
  ]);
export function toPostMetadataServicePatch(
  value: PostMetadataMutationV1
): UpdatePostMetadataInput {
  const patch = {
    ...(Object.hasOwn(value, "status") ? { status: value.status } : {}),
    ...(Object.hasOwn(value, "tags") ? { tags: value.tags } : {}),
    ...(Object.hasOwn(value, "taxonomy") ? { taxonomy: value.taxonomy } : {}),
    ...(Object.hasOwn(value, "seo") ? { seo: value.seo } : {}),
  };
  if (!Object.hasOwn(value, "scheduledAt")) return patch;
  if (value.scheduledAt === null) return { ...patch, scheduledAt: null };
  const scheduledAt = parseExactRfc3339DateTime(value.scheduledAt);
  if (!scheduledAt) throw invalidScheduledAt();
  return { ...patch, scheduledAt };
}
const requirePostMetadataWrite = requirePermission("content:write");
const requirePostMetadataWriteAndPublish = requirePermission([
  "content:write",
  "content:publish",
]);
router.patch(
  "/posts/:id/metadata",
  async (ctx) => {
    if (!ctx.user?.id) throw new Error("auth_required");
    const rawBody = ctx.body ?? {};
    validate(postMetadataSchema, rawBody); // minProperties: 1 + reject unknown
    const body = projectPostMetadataMutation(asValidatedRecord(rawBody));
    const patch = toPostMetadataServicePatch(body); // exact calendar before RBAC
    await (requestsPostPublicationMutation(body)
      ? requirePostMetadataWriteAndPublish
      : requirePostMetadataWrite)(ctx); // exactly one DB permission snapshot
    return withPostErrors(async () => {
      const updated = await updatePostMetadata(
        ctx.params.id,
        patch,
        ctx.user.id
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
export type PostMetadataPayloadBuildResult =
  | { kind: "noop"; settleKeys: readonly PostMetadataDraftKey[] }
  | { kind: "schedule_required" }
  | { kind: "invalid_schedule" }
  | { kind: "payload"; payload: PostMetadataMutationV1 };
export function buildPostMetadataMutationPayload(
  baseline: PostDetail,
  draft: PostMetadataDraft
): PostMetadataPayloadBuildResult {
  const scheduleText = draft.scheduledAt.trim();
  const parsedSchedule = scheduleText === ""
    ? null
    : parseExactRfc3339DateTime(draft.scheduledAt);
  if (draft.status === "scheduled" && scheduleText === "") {
    return { kind: "schedule_required" };
  }
  if (scheduleText !== "" && !parsedSchedule) {
    return { kind: "invalid_schedule" };
  }
  const publicationChanged = !sameEffectivePublicationPair(
    toEffectivePublicationPair(baseline.status, baseline.scheduledAt),
    toEffectivePublicationPair(draft.status, parsedSchedule?.toISOString() ?? null)
  );
  const seoChanged = draft.seoDescription !== (baseline.seo?.description ?? "");
  const payload = {
    ...(seoChanged ? { seo: { description: draft.seoDescription } } : {}),
    ...(publicationChanged
      ? exactStatusAndSchedule(draft.status, parsedSchedule)
      : {}),
  };
  return Object.keys(payload).length === 0
    ? { kind: "noop", settleKeys: metadataKeysEqualToBaseline(baseline, draft) }
    : { kind: "payload", payload };
}
function exactStatusAndSchedule(status: PostStatus, parsedSchedule: Date | null) {
  return {
    status,
    scheduledAt: status === "scheduled" ? parsedSchedule!.toISOString() : null,
  } satisfies Pick<PostMetadataMutationV1, "status" | "scheduledAt">;
}
// core/admin/services/postsClient.ts -- private, per exact Post id/list cache
const observedGeneration = postDetailGeneration(id);
try {
  const result = await getPost(id);
  if (postDetailGeneration(id) !== observedGeneration) {
    if (hasPostDetailDeletionTombstone(id)) return null;
    const current = getCachedPostDetail(id);
    return current ?? getPostCached(id, { force: true });
  }
  upsertCachedPost(result);
  return result;
} catch (error) {
  if (postDetailGeneration(id) !== observedGeneration &&
      hasPostDetailDeletionTombstone(id) &&
      isApiClientError(error) && error.status === 404) return null;
  throw error;
}
const dispatchGeneration = postDetailGeneration(id); // before detail-mutator dispatch
const listReadEpoch = postListPublicationEpoch(); // before every list GET
const mergeStaleListRead = (received: PostSummary[], capturedEpoch: number) => {
  if (capturedEpoch === postListPublicationEpoch()) return received;
  // For each row published after capturedEpoch, use current detail or remove its tombstone.
  // Then prime and return this reconciled list; never overwrite a newer row with GET bytes.
  return reconcilePostListRows(received, capturedEpoch);
};
const clearPostsCache = () => {
  cachedPostsPromise = null;
  cachedPostDetails.clear(); cachedPostRevisions.clear(); postsListCache.clear();
  detailGenerations.clear(); detailTombstones.clear();
  rowPublicationEpochs.clear(); resetPostListPublicationEpoch();
  clearInFlightPostListBookkeeping();
};
const publishPostMutationCacheEvents = (id: string) => {
  // Call only after the current non-tombstoned full detail is cached.
  broadcastCacheEvent({ key: cacheKeys.postsList, action: "update" });
  broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "update" });
};
const reconcileLostDetailMutation = async (id: string) => {
  if (hasPostDetailDeletionTombstone(id)) return null;
  const observed = postDetailGeneration(id);
  const fresh = await getPostCached(id, { force: true });
  if (fresh && postDetailGeneration(id) === observed && !hasPostDetailDeletionTombstone(id)) {
    publishPostMutationCacheEvents(id); // emits only the accepted fresh server projection
  }
  return fresh;
};
const invalidateFailedCurrentReconciliation = (id: string, readTicket: DetailReadTicket) => {
  // Only the still-current failed reconciliation may invalidate. A later
  // accepted detail/read or delete has already changed the ticket/tombstone.
  if (!isCurrentDetailReadAuthority(readTicket) || hasPostDetailDeletionTombstone(id)) return;
  removeCachedPost(id, { invalidateListRow: true });
  broadcastCacheEvent({ key: cacheKeys.postsList, action: "invalidate" });
  broadcastCacheEvent({ key: cacheKeys.postDetail(id), action: "invalidate" });
};
const publishDetailMutation = async (id: string, dispatchGeneration: number, detail: PostDetail) => {
  if (postDetailGeneration(id) !== dispatchGeneration || hasPostDetailDeletionTombstone(id)) {
    const reconciliation = await reconcileLostDetailMutation(id);
    if (reconciliation.status === "failed") {
      invalidateFailedCurrentReconciliation(id, reconciliation.readTicket);
    }
    return reconciliation.status === "accepted";
  }
  advancePostDetailGeneration(id); clearPostDetailDeletionTombstone(id);
  upsertCachedPost(detail); publishPostMutationCacheEvents(id); return true;
};
const publishStatusMutation = async (id: string, dispatchGeneration: number) => {
  if (postDetailGeneration(id) === dispatchGeneration && !hasPostDetailDeletionTombstone(id)) {
    advancePostDetailGeneration(id); clearPostDetailDeletionTombstone(id);
  }
  await reconcileLostDetailMutation(id); // never status-patch a cached scheduled Post
};
// updatePost/metadata/autosave/restore await publishDetailMutation after success;
// status-only publish/unpublish await publishStatusMutation; delete advances/tombstones/removes,
// records its row epoch, and emits only the existing ordered invalidates.
// PostClassicEditorShell.tsx -- existing helpers, no new generic hook
const lease = acquirePostMutationLease({ postId, routeEpoch });
if (!lease) return; // a competing user action/cache continuation defers
const submittedTick = edits.beginSubmit();
try {
  const built = buildPostMetadataMutationPayload(baseline.detail, metadataDraft);
  if (built.kind === "schedule_required") {
    setError("Schedule date is required for scheduled entries.");
    return; // no request, cache upsert, or cacheBus broadcast
  }
  if (built.kind === "invalid_schedule") {
    setError("Schedule date must be a valid ISO timestamp.");
    return; // no request, cache upsert, or cacheBus broadcast
  }
  if (built.kind === "noop") {
    edits.settleSubmit(built.settleKeys, submittedTick); return;
  }
  const updated = await updatePostMetadata(postId, built.payload);
  if (ownsCurrentLease(lease) && updated) {
    edits.settleSubmit(["status", "scheduledAt", "seoDescription"], submittedTick);
    applyMetadataSnapshotPreservingEditedKeys(updated, edits.editedKeys());
  }
} finally {
  releasePostMutationLease(lease); // only the outer owner releases it
}
```
**Data flow:** the exact matched metadata route selects the pure 64 KiB parser
cap (all other routes preserve their existing parser behavior, including media
uploads) -> the shared parser charges its existing anonymous route bucket before
mapping raw malformed JSON or a bounded overflow through the existing error
response/access log (`invalid_json` / 400 or `payload_too_large` / 413 within
quota, `rate_limited` / 429 after quota, no attached actor) -> successfully parsed authenticated Admin session (missing actor ->
401) -> strict non-empty structural schema -> individually copied own-property
DTO -> exact present-only RFC3339 calendar parse
(`validation_error` / 400) -> publication classification -> exactly one all-of
server RBAC snapshot -> present-only service patch -> existing
`updatePostMetadata` -> successful Admin response updates the existing browser
cache. Public cache invalidation and front freshness are intentionally deferred
to TASK-551-09-L02. The browser's permission/UI state is defense in depth only
and cannot authorize the route.
**Error handling:** the route-level missing-actor check, structural validation,
pure parser result mapping, and one conditional permission guard remain outside
the service-only `withPostErrors` boundary. Thus well-formed anonymous input
stays 401, semantic/structural authenticated input stays 400, and `forbidden`
stays the centralized safe 403. The pure parser never imports a server error;
the route maps its invalid result to `ApiError("validation_error", "Invalid
payload", 400, format-details)` before RBAC/service work. Raw syntactically
malformed JSON remains the shared parser's `invalid_json` / 400 and an over-cap
metadata body remains `payload_too_large` / 413 before the handler only while
its existing anonymous bucket has quota; once exhausted the
same pre-session boundary maps/logs a single `rate_limited` / 429 instead. CSRF
middleware rejects a session-bound invalid/missing token before
this handler. All route outcomes occur before any Post mutation/read, revision,
or Post browser-cache mutation/broadcast. Known service errors retain their
mappings; every unknown service error maps to redacted
`post_metadata_update_failed` 500 without driver message or stack.
**Regression-test shape:** use two complementary proofs. The real HTTP Bun
test owns a DB-scoped user/session/CSRF/role/Post fixture and proves anonymous
well-formed valid and schema-invalid requests are 401, while raw syntactically
malformed JSON is the shared-parser `invalid_json` / 400 with exactly one
anonymous access-log row while in quota. It also proves declared over-limit and
chunked/missing-length 64 KiB+1 metadata bodies return `payload_too_large` / 413
before session attachment, RBAC, Post read, or mutation. The controlled
`requestBody` Vitest owns the internal 64 KiB+1 sentinel pull/cancellation
proof, while the named selector test pins metadata-only options and `undefined`
for `PATCH /posts/:id` and `POST /media`. A bounded reset-and-saturate fixture
uses one IP/user-agent identity and the configured `admin_write` maximum to
prove the next malformed request is exactly one anonymous `rate_limited` / 429
log rather than a parser-rate-limit bypass; session-bound
invalid/missing CSRF is 403 before RBAC/service work; malformed authenticated
bodies are 400; writer tags/taxonomy/SEO succeeds without clearing a persisted
schedule; all own publication fields are 403 for a writer; publisher succeeds;
and `content:publish` alone cannot write metadata. The route-level factory test
injects recording guards/updater to prove exactly one selected guard invocation
and zero updater call after validation/RBAC denial. It asserts February 30,
April 31, hour 24, and an invalid leap day return `validation_error` / 400
before either guard or updater; the real HTTP writer fixture pins 400 rather
than 403 for the same invalid publication-field dates. The pure contract lane
accepts a real leap day and rejects every rollover without returning a
normalized Date; the schema lane pins strict/re-export shape only and does not
widen the global AJV date-time format. The existing RBAC unit lane pins the
real all-of one-query snapshot. A type-level regression pins
`PostsRouteDeps.requirePermission` as the canonical `PermissionRequirement`.
Client/editor tests prove ordinary saves omit status/schedule, intentional
transitions include exact fields, no-op saves make no request or cache event,
and a blank schedule for a `scheduled` draft preserves the existing required
field error with no request/cache broadcast. Classic February 30, April 31,
hour 24, invalid leap-day, and invalid-offset input each likewise sets a local
error with no request/cache broadcast. A valid offset timestamp serializes its
exact normalized UTC instant, and an already equal effective instant is a
byte-identical no-op,
and a force GET begun at A cannot overwrite either the browser cache or current
editor state after metadata mutation B. Two deferred non-delete A/B mutations
settling in both orders must finish with a guarded fresh read whose detail/list
cache and exactly-one ordered list/detail cache-bus events match the server, not whichever
response won locally. A cached scheduled Post followed by publish and unpublish
must likewise end with `scheduledAt: null` in both cache projections and emit
its update only after that fresh read. A deferred list GET started before each
metadata/status/delete mutation, including one initiated by a list cache-bus
event, must return and cache a list that retains the newer detail or tombstone.
If a stale successful non-delete mutation loses authority and its guarded
reconciliation read fails, the still-current exact detail/list projection is
removed with list-row protection and exactly one ordered list/detail
`invalidate` pair; it must never leave an older accepted projection
authoritative. A subsequent accepted read/mutation or delete wins this fallback
and suppresses its invalidation.
Delete -> `clearPostsCache` -> a fresh detail/list read must prove that no prior
tombstone, generation, row epoch, or in-flight list authority leaks across the
existing reset boundary.
An accepted deferred metadata response must replace unchanged submitted controls
with server-normalized values while preserving a post-dispatch edit as dirty. A
baseline-equal SEO and scheduled -> draft -> no-op each make zero requests/events,
clear only their stale metadata dirty keys, and allow a subsequent cache event to
hydrate. After delete B, a deferred exact-id 404 returns the documented tombstone/null without
a retry or cache repopulation; the same barrier covers deferred autosave B (and
restore) before it can upsert its full detail. A deferred
update/metadata/autosave/restore A that settles after successful delete B
likewise returns its API result but cannot clear B's tombstone, repopulate
detail/list cache, or broadcast update. Deferred A→B
navigation leaves metadata Save, Save draft, and
Publish/Update disabled/no-op until B hydrates; A's late result cannot hydrate
or mutate B. A synchronous local cache event during mutation is deferred;
newer metadata drafts and edits made after a deferred `updatePost` dispatch to
title/body/featured fields survive metadata, draft-save, published Update,
publish-refresh, and older force responses. The test also proves a published
Update and a publish-owned refresh share one lease rather than being rejected
as competing mutations. Unexpected service
errors exercise the real HTTP mapper and reveal neither message nor stack.
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

For the browser-visible scenarios, the `writer` actor has
`content:read + content:write` and explicitly lacks `content:publish`; the
additional read permission is required only to hydrate the Admin editor through
the existing `GET /posts/:id` boundary. The `publisher` actor has
`content:read + content:write + content:publish`. This smoke-fixture access
does not change the route contract: the authorization proof remains that a
writer lacking `content:publish` cannot mutate either publication-owned field.

| # | Scenario ID | Visible and persisted proof |
| ---: | --- | --- |
| 1 | `writer-metadata-save-preserves-schedule` | `content:read + content:write` actor without `content:publish` edits only the visible Classic SEO description on a scheduled Post; visible success and cache refresh occur, while persisted status and exact schedule remain unchanged |
| 2 | `writer-status-publish-denied` | writer submits own `status: published`; safe permission denial is visible and there is zero Post mutation/revision/Post browser-cache broadcast; the standard permission-denial notification/permission refresh remains allowed |
| 3 | `writer-schedule-denied` | writer submits own schedule fields, including the UI's status/date pair; safe denial is visible and the prior draft/schedule bytes remain unchanged |
| 4 | `publisher-schedule` | actor holding all three browser-flow permissions schedules a Post; normalized time and scheduled state are visibly and persistently exact |
| 5 | `publisher-publish` | actor holding all three browser-flow permissions publishes; Admin state and bounded persisted read model agree |
| 6 | `publisher-unpublish` | actor holding all three browser-flow permissions intentionally returns the Post to draft; Admin state and bounded persisted read model agree |
| 7 | `publisher-archive` | actor holding all three browser-flow permissions archives; Admin state and bounded persisted read model agree |

Tags/taxonomy remain exercised by the real HTTP route lane, not this browser
suite: the unmodified Classic shell intentionally exposes only its SEO and
publication controls. Every smoke row is an immutable descriptor in
`browser-actions.ts` containing its exact owned baseline, actor, editor mode,
metadata DTO, expected DOM/ARIA/geometry proof, bounded persisted projection,
variant matrix, and canonical screenshot variant. All seven rows use
`?editor=classic`, the metadata panel's status/date/SEO controls, and **Save
metadata**. The browser listener records one safe request receipt for the
expected `PATCH /admin/api/posts/:id/metadata` own-property key set. Every
publication row requires the exact `{ status, scheduledAt }` pair, and no row
may issue `/publish` or `/unpublish`; the top-bar Publish/Update control is
not part of this smoke. This makes the visible flows prove the repaired
conditional all-of metadata guard rather than the independent publish routes.

The adapter creates equivalent, separate owned Post fixtures per required
variant rather than replaying a mutation or attempting to reset an uncertain
one. Fast maps its seven rows across all four `light|dark × 1440x900|390x844`
combinations. Certification executes each row from four equivalent owned
baselines, once for every combination, and captures the canonical
`light-1440x900` variant as that row's sole manifest PNG; the other three
variants still return and validate their complete visible/persistence receipts.

The worker `install` operation receives bounded, per-run synthetic actor
credential specifications from the adapter and returns only opaque fixture IDs,
markers, and bounded read-model identities — never a password, session token,
cookie, or raw actor data. The adapter uses the shared admin-auth helper to
write private `0600` storage states for those known synthetic credentials, and
never includes them in browser frames or reports. Its `RunFixtureLedger` owns
the synthetic Posts and Post children, access logs, login audit rows, sessions,
user-role joins, users, and roles. Registered worker cleanup uses FK-safe
waves and the shared set-based transactional batch helpers: first it proves and
removes the exact Post/log/session/join observability rows by fixture identity
and run marker, then removes Posts and finally identities/roles. Its terminal
bounded proof verifies every owned row is absent **before** the identity rows
are deleted, so `ON DELETE SET NULL` cannot erase ownership evidence.

Before fixture installation, task-owned `routing-settings-lease.ts` atomically
captures raw JSON and timestamps for exactly `site.adminPath`,
`site.adminBaseUrl`, and `site.publicBaseUrl`, then applies the temporary target
`/admin`, `null`, and `null`. The persistent worker retains its private PostgreSQL
`xmin` ownership version, never placing settings values, timestamps, or that
version in a worker output, browser frame, or report. Cleanup must use that
ownership CAS to restore the exact JSON/timestamp records, or delete only rows
that were absent in the baseline; any current-record or ownership drift fails
closed without overwriting it. Each committed apply/restore uses the canonical
settings cache invalidation path, and terminal cleanup proof is true only after
the exact restore/delete proof succeeds.

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
`output-manifest.ts` owns `buildExactTask554ScreenshotManifest(input)`, accepting
only the exact `SmokeInput` `{ command: "run", suite: "task-554", profile:
"fast" | "certification", session: "task-554-fast" | "task-554-certification" }`
and otherwise throwing `SmokeError("smoke_argument_invalid", ...)`. It returns
an immutable `{ entries, paths }`, where `entries` is the strict ordered seven-row
`{ scenarioId, path }` map and `paths` is its same-order projection. Every path is
the canonical PNG filename under the matching session; the paired adapter tests
pin both exports and the exact seven IDs. The map binds each scenario ID
to one canonical PNG filename under
`_docs/_workflows/_smoke/task-554/<session>/`. The adapter validates the exact
scenario order, one unique regular non-symlink PNG per row, bounded decoded PNG
dimensions/bytes, complete `89504e470d0a1a0a` signature, full chunk/CRC/decode
validity, and SHA-256. It exports `decodeTask554Png(bytes)` returning exactly
`{ width, height }`; the workflow invokes that same bounded decoder through
`bun --eval` for every evidence PNG, then returns the same seven paths/hashes in the
shared report's global `screenshots` array in matching order. Missing, extra,
duplicate, reordered, symlinked, malformed, or hash-mismatched evidence fails as
`smoke_output_invalid`. Focused tests pin all seven IDs, filenames, ordering,
profile/session path binding, the scenario-index-to-screenshot-index bijection,
and truncated-IHDR, invalid-CRC, and malformed-chunk decoder rejection without
adding a second reporter or shared scenario field.

The task adapter records `pageErrors: 0` and `repositorySnapshots: 2` in its
existing `suiteCleanup` record (which already permits numeric receipts); it
does not widen a shared report type. The workflow rejects a report unless both
receipts agree with `schemaVersion: 1` and top-level `snapshots: 2`,
`cleanup.pass`, zero `consoleErrors`, the exact ordered scenarios, and the
exact validated screenshot path/hash rows agree. Distinct canonical PNG paths
are required, but equal SHA-256 values across different valid PNG paths are
allowed; only each row's path-to-file digest equality is authoritative. This
makes the required zero page-error and repository-restoration evidence explicit
without adding a task-local reporter.

Evidence is only below `_docs/_workflows/_smoke/task-554/<session>/`. The
canonical smoke-only workflow mode rejects a pre-existing session, creates
exactly one new directory, and securely opens private `report.json` before it
invokes the shared wrapper. It validates saved report/PNG bytes through
`O_NOFOLLOW` descriptors, passes those same PNG bytes (never paths) to the task
decoder via `bun --eval` stdin, and compares the retained report/PNG bytes at
revalidation; a renamed valid-but-different report or image therefore fails.
It runs `fast`, removes and proves its evidence absent, and only then runs
`certification`; it dispatches no agents. The guard permits only the exact flat
report/PNG set after semantic revalidation, including in `finally`; it rejects
extra output and keeps the primary error. Before every create/read/collect/
cleanup it `lstat`s each ancestor through `_docs/_workflows/_smoke/task-554`,
rejects symlinks/non-directories, and creates one level at a time. No TASK-545
checkpoint exists.

The exact canonical command is:
```bash
node _docs/_workflows/task-554-implement.mjs --task-554-smoke
```
It delegates to the shared wrapper and its existing `runTask554SmokeProfile`
capture. Do not pre-create evidence directories or redirect wrapper output from
a shell; that bypasses the capture's ordered report-creation and validation
contract.
The implementation workflow builds the manifest evaluation with the literal,
JSON-injected immutable input `{ command: "run", suite: "task-554", profile,
session }`; it never relies on an ambient `TASK_554_SMOKE_*` environment value.
Its smoke self-test proves fast and certification inputs bind to their own
directories (`fast` only with `task-554-fast`; `certification` only with
`task-554-certification`), accepts deliberately equal mock PNG hashes on distinct paths, and
rejects mismatched top-level/suite-cleanup snapshot receipts, ignored workflow
side effects, a failed-smoke residue, and an invalid session exclusion.
## Testing Requirements
Run these exact owning lanes:
```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/validation/postSchemas.test.ts \
  tests/vitest/server/postMetadataContract.test.ts \
  tests/vitest/server/requestBody.test.ts \
  tests/vitest/admin/postsClient.test.ts \
  tests/vitest/ui/post-metadata-mutation-payload.test.ts \
  tests/vitest/ui/post-classic-editor-shell-wave.test.tsx \
  tests/vitest/ui/post-classic-metadata-hydration.test.tsx \
  tests/vitest/ui/post-editor-state-metadata-boundary.test.ts
bun test \
  tests/integration/routes/postsRoutes.test.ts \
  tests/integration/routes/postMetadataRbac.test.ts \
  tests/unit/auth/rbac.test.ts
bun test \
  tests/unit/runtime-smoke/cli-registry.test.ts \
  tests/unit/runtime-smoke/task-554-adapter.test.ts \
  tests/unit/runtime-smoke/task-554-worker.test.ts
bun test \
  tests/unit/workflows/task554AuthorAudit.test.ts \
  tests/unit/workflows/task554WorkflowContracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run scan:security:strict
bun run gates:coderso
bun run precommit:check
node --check _docs/_workflows/task-554-author-audit.mjs
node --check _docs/_workflows/task-554-implement.mjs
node --check _docs/_workflows/task-554-fix.mjs
node --check _docs/_workflows/task-554-closeout.mjs
node _docs/_workflows/task-554-implement.mjs --task-554-smoke
git diff --check "$TASK_554_BASELINE_SHA"...HEAD
git diff --check
```
The route lane includes real session/CSRF writer-versus-publisher fixtures,
`{}`/prototype/unknown/empty-nested cases, service-call counters, one-snapshot
proof, and schedule-preservation proof. Run only additional shared
lifecycle/worker/DB/browser/report tests whose primitives actually changed.
Both smoke profiles require the exact seven passing scenarios, reviewed
screenshots, zero console/page errors, and complete cleanup. The adapter test
pins the exact seven-row output manifest and global report-array bijection; the
workflow test pins byte-identical stdout capture as `report.json`, manifest-only
session output, and rejection of parsed/reserialized or missing output.

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
The implementation workflow executes this exact baseline-aware counter and
literal commands; prompts/text-only tests are not substitutes. Tests cover
tracked/untracked candidates, generated-artifact exclusion, unterminated lines,
locally wrapped identities,
scope and gate mutation rejection, actual owner/lens receipts, rebootstrap,
manifest binding, equal hashes, ignored `.tmp` audit/gate/fix side effects,
release-report in-place restoration plus hard-link, root/nested-directory, and
report-identity replacement rejection, byte-identical snapshot evidence and
renamed-file rejection, ignored workflow side effects, strict malformed audit
payloads, and exact canonical changelog bytes.
## Pinned Closure Delta
`task-554-closeout.mjs` is the fourth pinned, import-safe workflow module. Its
`--task-554-closeout-snapshot` mode reads the real changelog index, changelog
1267 entry, task board, and TASK-554 file through regular nofollow reads and
writes only a JSON snapshot to stdout. The owner stores that stdout outside the
repository. Its `--task-554-closeout-metadata-validate <snapshot>` mode rereads
those real files and validates the changelog/index + board delta while requiring
the task file to remain byte-identical. After the fresh metadata-drift pass, a
new snapshot feeds `--task-554-closeout-terminal-validate <snapshot>`, which
requires the changelog/board bytes unchanged and validates only the terminal
task-status delta. Both validation modes emit a structured pass receipt and
never mutate the repository. The closure guard therefore reads all shared
metadata files immediately before and after the closure writer. It permits only
these deterministic changes:

- create the previously absent
  `_docs/_CHANGELOG/1267-2026-08-11-task-554-post-metadata-publish-rbac-hardening.md`
  with exactly these UTF-8 bytes, including its final newline:

  ```text
  # 1267 - TASK-554 Post Metadata Publish RBAC Hardening

  **Date:** 2026-08-11
  **Version:** Unreleased
  **Tasks:** TASK-554

  ## Key Changes
  - Required `content:publish` together with `content:write` for Post metadata publication fields while preserving present-only writer metadata updates.
  - Added exact RFC3339 calendar validation, one-snapshot RBAC coverage, and race-safe Admin cache/editor hydration.
  - Registered the shared `task-554` smoke suite with seven verified publication flows.
  ```
- replace exactly this reservation block in `_docs/_CHANGELOG/README.md`:

  ```text
  Changelogs 1266 and 1267 are reserved for TASK-414 Guide/Agent/Designer
  completion and the critical TASK-554 Post metadata publish-RBAC hardening
  (surviving variant; the root Repair variant is superseded by it), respectively.
  ```

  with exactly this block, and add exactly this index row:

  ```text
  | 1267 | 2026-08-11 | TASK-554 Post Metadata Publish RBAC Hardening — conditional all-of publish authorization, present-only metadata, exact calendar validation, race-safe Admin cache/editor hydration, and seven-flow shared smoke | Posts/RBAC/Security/Admin UI/Caching/Testing/Docs/Task Board |
  ```

  ```text
  Changelog 1266 remains reserved for TASK-414 Guide/Agent/Designer completion.
  Changelog 1267 is consumed by completed TASK-554 Post Metadata Publish RBAC
  Hardening (surviving variant; the root Repair variant is superseded by it).
  ```

- move the sole existing TASK-554 board row from **In Progress** to **Done**;
  replace only its note prefix `In progress 2026-08-11.` with
  `✅ Done (2026-08-11):`, preserve the remainder byte-for-byte, leave **To
  Do** unchanged, decrement **In Progress** by one, increment **Done** by one,
  and preserve the total; and
- after a clean metadata-drift receipt, change only TASK-554's canonical
  `**Status:**` line from `🚧 In Progress` to `✅ Done` and insert exactly one
  `**Completed:** 2026-08-11` line. No other task-contract byte may change.

The semantic guard rejects an unrelated changelog/index/board/task line even
when its file belongs to the closure owner. Synthetic workflow fixtures prove
both accepted deltas and rejection of another task row or task-contract edit.
## Acceptance Criteria
- A `content:write`-only actor cannot change any Post publication state through
  metadata, direct HTTP, stale UI payload, or omitted/truthy-field trick.
- The same actor can still edit non-publication metadata without receiving an
  unnecessary publish requirement, and a writer-only edit cannot clear an
  omitted schedule.
- An actor holding both `content:write` and `content:publish` can use the
  intended publish/schedule/unpublish flows; `content:publish` alone does not
  imply metadata-write access and current Admin browser-cache semantics remain
  intact. Public Post-cache invalidation/front freshness remains TASK-551-09-L02
  work.
- No service call or cache event occurs after RBAC denial.
- The exact metadata route rejects declared and streamed over-cap bodies before
  session/RBAC/service work, while non-metadata and media routes keep their
  existing parser options.
- Detail/list cache and cache-bus converge through guarded fresh reads after
  competing successful mutations and cached scheduled status-only transitions.
- `{}`, unknown keys, inherited-only fields, empty nested `seo`/`taxonomy`, and
  a client no-op produce no service mutation; the malformed bodies fail
  validation and the client no-op skips the request.
- `task-554` is statically registered through the shared cookbook architecture;
  both profiles pass all seven visible flows without a task-local wrapper,
  helper, worker/lifecycle, Playwright, DB cleanup, or reporting loop.
- TASK-414-05 lists TASK-554 terminal as a hard dependency before Agent Post
  actions.
- TASK-551-03-L02 lists TASK-554 terminal as a hard dependency, limits its
  shared Post-file edits to list contracts, preserves the metadata and local
  browser-cache race contract (generation/tombstone reset, row epoch,
  stale-list merge/write/return, and ordered paired events), and reruns this
  task's unchanged route/schema/client/RBAC tests.
## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/RBAC_SPEC.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for the bounded Post
  detail generation barrier, delete tombstone, cache-bus, and hydration behavior
- `docs/develop/runtime-smoke-cookbook.md` with the exact `task-554`
  registration, task-specific adapter/operation/selector/manifest contribution,
  shared-wrapper/helper/worker reuse, profile, and command recipe
- `docs/develop/assistant.md` only for the TASK-414 Post-action dependency
- `tests/README.md` for the registered `task-554` suite, both profiles, and its
  seven-flow evidence boundary
- `_docs/_TASKS/README.md`
- changelog 1267 and changelog index

Closure order is implementation plus product/security docs and cookbook ->
targeted/full gates -> independent five-lens post-audit and affected fix loop ->
fast then certification shared-runner smoke -> owner evidence review plus exact
cleanup/repository-restoration proof -> owner-controlled changelog 1267/index ->
task board row/statistics as the explicitly pinned pre-terminal metadata move
while TASK-554 remains `🚧 In Progress` -> fresh read-only metadata drift -> this
task `✅ Done` and `**Completed:** 2026-08-11` as the final terminal write. These
recorded validations, smoke, and explicit owner review—not a generated receipt
or terminal envelope—are closure authority. If task-local automation cannot
perform its guard, the owner may complete this narrow manual closeout after the
same evidence review. No docs/source/test/workflow change is allowed after
certification; any such need invalidates the smoke and returns to the affected
gate/post-audit/smoke phases.
Do not edit any
TASK-414/TASK-547 task state or changelog 1266 during TASK-554 closure.
