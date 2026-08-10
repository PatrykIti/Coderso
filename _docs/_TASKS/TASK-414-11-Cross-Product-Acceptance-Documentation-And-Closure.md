# TASK-414-11: Cross-Product Acceptance, Documentation, and Closure
# FileName: TASK-414-11-Cross-Product-Acceptance-Documentation-And-Closure.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Guide / Agent / Designer / Acceptance / Security / Closure
**Estimated Effort:** Very Large
**Dependencies:** current validated completion receipts for every implementation
leaf under TASK-414-02 through TASK-414-10; the digest-bound TASK-414-09-L05
readiness receipt while L05 remains `⏳ To Do`; TASK-545, TASK-547, TASK-548,
and TASK-551 terminal; TASK-511 and TASK-554 terminal for their TASK-414
handoffs
**Related Tasks:** TASK-406 (superseded only after this child passes)
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Close TASK-414 only after one dependency-shaped acceptance program proves the
three product boundaries and the complete Designer lifecycle against a real
Coderso host and browser:

- Guide remains provider-free, concise, grounded, and linked to complete
  internal documentation with atomic-control and composed-workflow coverage;
- Agent is explicitly provider-bound, durable across tabs/resources, isolated
  across explicit sessions, citation/attachment capable only when supported,
  and limited to reviewed bounded CMS actions; and
- Designer owns whole-site generation/import, private staged revisions,
  navigable digest-bound preview, revision/reject/approve/recovery semantics,
  and atomic public parity.

This child owns tests, reusable smoke tooling, assigned non-corpus
documentation, task state, board, and changelog only. TASK-414-02-L02 owns the
Guide corpus and generated capability/docs bytes. This child may not modify
product source, schemas, migrations, routes, services, Admin UI, cache, provider adapters, or native CMS owners. A
product failure returns to its owning TASK-414 leaf; closure does not repair or
weaken the behavior under test.

TASK-406's destructive broad-site reset proposal is replaced by owner-scoped
Designer fixtures and exact cleanup in the stronger suite below. TASK-406 is
marked `⏭️ Superseded` only after all replacement scenarios, full gates, docs,
and final drift checks pass. No TASK-406-local reset, DB lifecycle, Playwright,
or cleanup harness may be created.

## One Shared Runtime-Smoke Suite

Register one static suite ID, `task-414`, through the existing entry point:

```bash
bun scripts/runtime-smoke.ts run \
  --suite task-414 \
  --profile fast \
  --session task-414-fast

bun scripts/runtime-smoke.ts run \
  --suite task-414 \
  --profile certification \
  --session task-414-certification
```

The adapter is thin and follows `docs/develop/runtime-smoke-cookbook.md`. It
must compose the already shared wrappers/helpers for lifecycle, bounded process
supervision, condition polling, persistent profile-scoped Bun workers, strict
worker operation registry, transactional DB batches, fixture ledger, browser
segments/transport, repository guard, screenshots, redaction, timing, report,
and cleanup proof. It must not create a task-local CLI, shell wrapper/helper,
server loop, worker lifecycle, database pool, one-process-per-query path, fixed
sleeps, Playwright lifecycle, report format, or duplicate checkpoint logic.

Fast is a feedback run and leaves no durable repository evidence after its
shared cleanup. Certification captures the shared runner's canonical JSON
stdout byte-for-byte and is the sole durable TASK-545 evidence source. The
owning `task-414-implement.mjs` then validates the exact report/manifest/
screenshot inventory through TASK-545, creates the shared closure checkpoint,
and pauses for owner review/staging. This is not runtime scenario resume: a
fresh certification run always executes all 25 scenarios.

Both profiles run the same 25 product scenarios below. `fast` may use shorter
supported polling windows and one declared viewport/theme variant per scenario,
while collectively covering light, dark, wide, and narrow. `certification` runs
every Admin-visible scenario in both light/dark and wide/narrow variants and
both public-front viewports. A variant is not an additional scenario ID. No
profile may silently skip a scenario or fall back to another profile.

## Exact 25 Real-Flow Scenarios

The report must contain exactly these 25 ordered IDs. Infrastructure readiness,
cleanup, restoration, and repository checks are report fields, not extra product
scenarios.

### 1. `guide-concise-full-doc-atomic-composed`

With all AI/search/Figma providers unavailable, open Guide in default `basic`
mode, ask one provider-free question that yields a successful grounded
`answer`, and visibly prove it is at most
440 Unicode scalar values and either two prose sentences or three ordered
steps. Follow its non-null authorized internal full-document section link and
prove the complete document renders.
Join the same section/capability evidence to one atomic control and one composed
workflow whose ordered atomic relation includes it. No provider/network/tool or
Agent/Designer state may be created. Also exercise `no_match` and `needs_input`
and prove both remain explicitly link-free.

### 2. `agent-unavailable-guide-healthy`

With Agent provider/model capability resolution unavailable or stale, visibly
prove a focused Agent unavailable state while Guide still answers and deep-links
normally. Agent must not return a Guide answer, deterministic/local plan, fake
session success, or CMS action under the Agent label.

### 3. `agent-session-tabs-resource-deep-link`

Create one authenticated Agent session, send a bounded message, open the same
session in a second tab, and follow a canonical CMS resource deep link carrying
only opaque session and resource-binding identities. Prove both tabs and the
resource surface read the same server-authoritative session/revision/resource
binding after ownership and RBAC revalidation, with no trusted target ID/href
in the URL and no transcript in persistent browser storage. Keep a different
route-pinned session open and prove cross-tab invalidation never navigates or
merges it. Type into a dirty composer, deliver a stale ETag revalidation, and
prove the pending text/focus plus newer server state are preserved.

### 4. `agent-new-session-isolation`

Use the explicit New session control. Prove the new session has a distinct
identity and empty independent context, while reopening the prior session shows
its unchanged ordered transcript and resource binding. New work must not mutate,
archive, or implicitly summarize the previous session. Commit one queued run,
restart the worker before dispatch/claim completion, and prove durable recovery.
Cancel it and retry with the same idempotency key; the result must contain one
run/message intent and no duplicated turn or effect.

### 5. `agent-research-citations-attachments`

Through controlled provider test adapters, run one bounded research request with
reviewable citations and one supported quarantined attachment projection. Prove
source/title/digest provenance, safe citation navigation, scan/extraction status,
and model-capability gating. The attachment remains absent from public Media and
no raw search/page/provider body, private URL, or attachment bytes enter the
transcript/evidence.

### 6. `agent-research-egress-ssrf-redirect-fail-closed`

Use synthetic Brave/DNS/HTTP transports to return loopback, private, link-local,
metadata, DNS-rebinding, credential-bearing, and redirect-chain targets. Prove a
visible safe denial, peer-address revalidation, zero private-network connection,
zero credential/cookie forwarding across origins, and zero egress after private
evidence enters synthesis. The network-attempt ledger must contain only declared
safe origins and bounded redacted facts.

### 7. `agent-attachment-malware-type-confusion-native-projection`

Exercise EICAR, extension/MIME/magic confusion, malformed Office/PDF structure,
and clean files under exact native-versus-projection model capabilities. Prove
visible quarantine/scan/rejection/delivery states and that infected, confused,
unscanned, or capability-incompatible bytes never reach Tika, the AI provider,
public Media, or durable evidence. Clean native and projection branches each
prove the exact capability decision.

### 8. `agent-unsupported-modality-fail-closed`

Select a file/modality or provider capability that the exact model profile does
not support. Prove a machine-readable unavailable/unsupported state, zero model
or tool dispatch beyond permitted preflight, zero partial extraction/action,
zero public Media row, and no fallback that pretends the modality was consumed.

### 9. `agent-post-draft-revise-publish-conflict`

From Agent, create a Post draft through reviewed execution, follow the canonical
Post editor deep link and visibly retain the same Agent session companion across
new tab/reload without overwriting dirty editor state, propose a revision, and prove a
stale expected-version conflict preserves newer editor state. Re-plan against
the fresh version; expire and separately forbid the resource binding and prove
non-enumerating denial. Rebind legitimately, then revoke publish RBAC and prove
zero publication. Restore authorization, approve a separate immutable publish action, prove fresh
`content:write` plus `content:publish` checks at approval and execution, and
replay the same approval after an uncertain response to recover the one
committed result. Prove exactly one published Post/revision with front visibility. Draft/update must never
publish; conflict/retry must never overwrite or duplicate.

### 10. `agent-refine-existing-page`

Load one owner-authorized existing Page through a resource binding, propose a
bounded reviewed patch, and force a stale version/digest conflict that preserves
the newer native edit. Re-plan and apply only the intended fields/blocks, keeping
unrelated content byte-identical and proving Admin/front parity through native
revision, cache, and route contracts.

### 11. `agent-refine-existing-content-type`

Propose one backward-compatible optional field and one existing-entry refinement
through native content-type/document normalizers. Prove impact review, exact
`content:read/write`, conflict handling, bounded search/cache updates, and zero
field/data loss or destructive schema shortcut.

### 12. `agent-refine-existing-menu`

Propose a bounded menu reorder/label/target refinement through symbolic resource
bindings and native menu validation. A concurrent native edit must conflict;
the refreshed reviewed plan updates visible Admin/front navigation without an
invalid route, arbitrary href, or unrelated menu change.

### 13. `agent-refine-existing-form`

Refine existing Form fields and copy while preserving native action policy,
nonce/CAPTCHA/rate limits, validation, and accessibility. Prove the Agent cannot
insert executable code or weaken public anti-abuse, and that preview/public
behavior remains visibly correct after reviewed execution.

### 14. `agent-refine-existing-theme-media-video-gallery`

Use trusted existing Media/provenance to review and refine theme tokens plus an
image/video/gallery composition. Prove light/dark and wide/narrow effects,
accessible playback/gallery semantics, native Media references, and zero remote
or model-supplied URL. Restore exact shell/Page/Media-reference baseline.

### 15. `agent-booking-capability-proposal`

Review and execute a bounded booking service/resource/schedule refinement with
exact `booking:read/write`, optimistic versions, and visible availability effect.
No reservation, customer, private submission, payment, or automation data may
be read or written; cleanup restores rows in native FK order.

### 16. `agent-commerce-reviewed-payment-configuration`

Review a product/catalog refinement and separately approve a ready checkout
selection plus disabled webhook destination profile with exact
`commerce:read/write` and `settings:read/write`. Prove no charge, payment intent,
order, refund, webhook/test delivery, enabled webhook, raw destination, or
credential exposure; synthetic encrypted settings are removed on cleanup.

### 17. `agent-designer-full-site-handoff`

Ask Agent for a complete multi-resource site. Prove the intent router returns a
sanitized explicit Designer handoff and exactly zero Agent site-kit, page, post,
menu, form, settings, media, package, or publication actions. Accepting the
handoff opens/creates the correct Designer workspace without copying provider
output or granting permissions.

### 18. `designer-staging-invisible-navigable-preview`

Create, save, reload, and reopen a complete Designer draft. Prove its exact
workspace/revision/digest survives reload while the staged graph is absent from normal
CMS lists, searches, caches, Agent resources, Guide, and public runtime while its
digest-bound preview is navigable across at least home, one secondary route, and
one generated detail/form route. Assert visible content/layout/navigation, not
only route/control presence or emitted CSS.

### 19. `designer-revision-digest-rotation`

Request a revision in the same workspace. Prove a new immutable revision and
workspace version, changed core/sidecar/bundle/stage/validation/preview
digests, revocation of the prior preview-session binding, and an explicit graph
diff. Historical bytes remain unchanged; the new preview is navigable and
still absent from canonical CMS reads.

### 20. `designer-reject-owned-cleanup`

Reject one ready nonpromoted workspace and independently advance a separate
eligible workspace through expiry. Prove terminal rejected/expired states,
revocation of preview sessions/bind-secret state, and exact deletion/absence of only each workspace's
staging rows, private inputs, temporary/import assets, and leases. Unrelated
fixtures and all canonical resources remain byte-identical.

### 21. `designer-approve-front-parity`

First remove one required native permission and separately mutate the live
baseline; each attempt must deny before any promotion write. Restore current
authorization/baseline, then approve the exact reviewed revision/core/sidecar/bundle/validation/preview/
fresh-baseline tuple with the complete native permission union. Prove one
visibility-atomic activation-generation cutover: canonical Pages, Posts, Menus,
Forms, entries, settings/media projections, routes, search/cache effects, and
public front become visible together. Preview and public front must match the
approved bundle and critical visible geometry/content/navigation in wide and
narrow viewports. Hold one
old-generation request across cutover and prove it finishes against the complete
old graph while the first new request sees only the complete new graph. After
promotion, execute ordinary canonical create, update, and delete paths; each
must advance the active content epoch/mapping atomically, and no stale old-
generation cache, outbox, or mapping may resurrect deleted/previous data.

### 22. `designer-crash-retry-idempotency`

Run three independent faults: crash before product commit; database commit with
lost/ambiguous client response; and crash after commit but before postcommit
cache/search/publication work. Reconcile durable state before every retry;
never blind-replay a mutation. Prove the legal pre-state or post-state branch,
then retry with the same idempotency key and show no partial
visibility, duplicate canonical resources, duplicate outbox/cache publication,
stale lease, or second promotion. A mismatched payload with the same key returns
the typed conflict.

### 23. `designer-cross-industry-matched-media`

Generate a non-service-business site for an industry/role with exact trusted
licensed image/video/gallery candidates. Prove semantic match to approved
facts, visible attribution, accessible playback/gallery behavior, complete
staging invisibility, navigable preview, atomic approve/front parity, and exact
owner cleanup. A merely available but unrelated asset fails the scenario.

### 24. `designer-cross-industry-unsupported-media-empty`

Generate a distinct industry/role for which the trusted catalog has no match.
Prove an honest visible empty/needs-input result, valid responsive layout, zero
unrelated stock fallback, zero model/remote URL, zero native Media write, and a
clean reject that leaves no canonical content or Media residue.

### 25. `figma-official-contract-gated-designer-import`

At the current 2026-08-08 baseline, set the optional feature flag and prove the
official-contract gate still renders a visible typed unavailable state with
zero OAuth/token/REST/raster/import calls and zero credential/object/workspace
residue. Figma's live OAuth instructions and changelog disagree on refresh, so
the scenario must not guess or probe either endpoint.

Only if a fresh audited amendment lands before implementation may this same
scenario switch to a deterministic synthetic official-wire flow with exact
`file_content:read` and prove `DesignIRV1 -> DesignerBriefV1 ->
DesignerSiteBundleV1 -> staging -> revision -> preview`, with no raw HTML/CSS/
JS/SVG, provider JSON/URL, direct bundle/native document, public Media row, or
canonical write. Opt-in live OAuth may supplement an amended contract but never
replaces deterministic proof or enters evidence.

## Visible-Effect and Evidence Contract

- Install `console` and `pageerror` listeners before first navigation and require
  zero errors for every observed Admin/front lifetime. Expected HTTP/domain
  conflicts must be handled UI states, not console errors.
- Assert computed style, geometry/bounding boxes, rendered text/state,
  navigation target, `aria-*`/data state, and actual Admin/front parity. Control
  presence, response status alone, or a CSS/transition string is insufficient.
- Cover light/dark Admin rendering, wide/narrow viewports, keyboard/focus,
  reduced motion where relevant, and no horizontal overflow.
- Save certification's bounded reviewed PNGs only under
  `_docs/_workflows/_smoke/evidence/task-414/task-414-certification/`, validate
  signature/size, and report repository-relative path + SHA-256. Use only
  synthetic task-owned data. The exact directory also contains canonical
  `report.json`, strict TASK-545 `manifest.json`, and the TASK-545-owned
  `resume-checkpoint.json`; unreferenced, alternate-session, or extra files fail.
- Reports contain safe scalar counts, exact scenario IDs, timings, relative
  evidence paths/digests, zero-error array, fixture cleanup, settings restore,
  repository restore, process/worker/browser counters, and failures. No cookie,
  token, header, SQL/bind, prompt with secrets, raw DOM/response/log, PII,
  attachment, staged body, or provider output is permitted.
- Register every process, browser, worker, temporary workspace, setting/provider
  override, asset handle, fixture namespace, and port immediately with the
  shared lifecycle and prove absence/restoration on success and failure.

## Security Contract

- **Endpoint visibility:** the suite calls only the existing internal Guide,
  Agent, Designer, Post/native Admin APIs and the Designer read-only preview
  surface. No new product endpoint is added. Preview remains same-origin,
  internal, current-Admin-session-bound, read-only, and digest/version/TTL
  checked; all Figma/Agent/Designer writes remain internal.
- **Auth model:** real Admin session and server-derived actor identity.
  Agent session, resource, Designer workspace, preview, fixture, and cleanup
  ownership are revalidated; test identities never come from request bodies.
- **RBAC:** exercise and deny the exact `assistant:use`,
  `assistant:research`, `designer:read`, `designer:write`,
  `designer:promote`, `settings:read`, `settings:write`, `content:read`,
  `content:write`, `content:publish`, and staged-plan native permission unions
  required by each flow. No test-only wildcard hides a missing permission.
- **CSRF:** every internal POST/PUT/PATCH/DELETE uses a fresh valid Admin CSRF token;
  negative tests prove missing/invalid CSRF blocks dispatch. Read-only GET and
  session-bound preview reads remain side-effect free.
- **Rate-limit buckets:** assert the route-owned `assistant`,
  `assistant-research`, `private-input-upload`, `designer-generation`,
  `designer-preview`, `designer-promotion`, `designer-figma`, `admin_read`, and
  `admin_write` buckets and provider/user quotas. A missing/wrong bucket fails
  the suite; retries honor bounded metadata without loops.
- **Reject unknown:** all route params/query/body/multipart/provider fixtures,
  worker frames, DB operation inputs/outputs, browser proofs, cleanup receipts,
  screenshots, and final reports use strict schemas, exact IDs, and bounded
  counts/bytes. Unknown-key negatives must fail before service/provider dispatch.
- **Anti-abuse:** no new public write exists, so this child adds no nonce,
  signature/HMAC, or reCAPTCHA path. Existing public Form writes in the promoted
  site retain native nonce/signature/CAPTCHA policy, validation, and rate limit.
  Bound same-origin preview is read-only/no-store/noindex, short-lived, Admin-
  session/workspace/version/digest-bound, redirect-safe, and revoked on revision,
  reject, expiry, or promotion.
- **Secrets/privacy:** synthetic fixtures only. Provider/search/Figma keys,
  OAuth code/state/verifier/token, cookies, CSRF/session values, private URLs,
  raw prompts/attachments/search pages/provider bodies, customer data, storage
  keys, SQL/binds, and unredacted logs never enter screenshots or reports.
- **Cleanup safety:** no truncate, broad installation reset, broad owner
  predicate, or unordered FK cleanup. Mutations use exact task-owned ledgers,
  transaction handles, set-based bounded waves, content/asset provenance,
  post-commit absence, and uncertain-result reconciliation before retry.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
| --- | --- | --- |
| TASK-414-11-L01 | Test-only cross-product contract suites; one cookbook-registered shared runtime-smoke adapter; all 25 real flows; complete gates/security; user/developer/internal docs; TASK-406 supersession; TASK-414 family/board/changelog 1266 closure | ⏳ To Do |

TASK-414-11-L01 is the only writer of closure tests/smoke adapter, final docs,
TASK-414 family statuses, TASK-406 disposition, `_docs/_TASKS/README.md`,
changelog 1266, and `_docs/_CHANGELOG/README.md`. It cannot edit product source.
If any preceding contract is incomplete or fails, return the finding to that
owner and rerun only invalidated gates/lenses after the owner fix.

## Acceptance Criteria

- The report contains exactly the 25 ordered scenario IDs above, all passing,
  with server readiness, zero console/page errors, reviewed visible-effect
  evidence, exact cleanup, restored settings/providers, and repository guards.
- Guide works provider-free and Agent does not impersonate/fallback to Guide.
- Agent session continuity, explicit isolation, research/citations/attachments,
  unsupported-modality failure, and conflict-safe Post publication are proven.
- Whole-site Agent intent creates zero Agent site actions and hands off to the
  separate Designer workspace.
- Designer staging invisibility, navigable preview, immutable revision/digest
  rotation, reject cleanup, atomic approve/front parity, and crash/retry
  idempotency are proven.
- The Figma path uses the same Designer bundle pipeline when enabled and cannot
  create direct code, core/sidecar/bundle/native documents, public Media, or
  canonical writes.
- Matched cross-industry media is semantically relevant/licensed, while an
  unsupported profile remains visibly empty with zero unrelated fallback.
- Fast and certification pass through the static shared adapter; light/dark,
  wide/narrow, zero-error, security negative, and cleanup evidence are complete.
- Full static/test/security/release gates pass, touched production/test files
  satisfy the 1,000-line gate, docs describe shipped behavior, and final drift
  audit has no unresolved finding.
- TASK-545 validates the exact certification suite/profile/session, report,
  scenario variants, screenshots, revision, tracked parity, checkpoint-bound
  resume, and metadata-only closure delta.
- TASK-406 is superseded only at terminal closure, no duplicate/destructive reset
  harness exists, and changelog 1266 is the sole family closure entry.

## Testing Requirements

TASK-414-11-L01 must run its focused commands, then the family gates:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
bun scripts/runtime-smoke.ts run \
  --suite task-414 --profile fast --session task-414-fast
bun scripts/runtime-smoke.ts run \
  --suite task-414 --profile certification --session task-414-certification
git diff --check
```

Also validate SQL/snapshot/journal parity, sanitized representative query-plan
evidence, stable pagination/query-count budgets, security/adversarial fixtures,
Admin build/boundary/bundle gates when closure-touched tests require them, and
the physical line count of every production/test file changed from the verified
TASK-414 family baseline, including intermediate commits.

## Documentation Updates Required

Reconcile shipped behavior in `_docs/ASSISTANT_SITE_BUILDER.md`, architecture,
CMS/API/data/preview/security/media/search/audit contracts and runtime-smoke
documentation when registration changes require it. Add the exact `task-414`
registration/profile/scenario recipe to
`docs/develop/runtime-smoke-cookbook.md`, explicitly showing composition of the
shared runner, thin adapter, lifecycle/process/polling helpers, persistent
profile worker, DB batch/fixture cleanup helpers, browser segments, redaction,
checkpoint/reporting primitives, and harness-defect ownership. The cookbook
must forbid copying those wrappers/helpers/workers into a task-local harness.
TASK-414-02-L02 is the
sole writer of `docs/develop/assistant.md`, user Guide/Agent/Designer/Figma
pages under `docs/guide/`, and generated TASK-548/CMS capability bytes; closure
validates those outputs read-only. Include provider-free Guide, provider-bound Agent, sessions,
research/citations/files, Post handoff, trusted video/gallery and external-
configuration boundaries, Designer staging/preview/revision/approve/reject/
recovery, matched/unsupported media, Figma connection/import/limits, exact permissions,
rate buckets, error/retry semantics, privacy, retention, backup, and extension
cookbooks.

Only after docs, all gates, both smoke profiles, and certification evidence are
green may L01, in this exact order:

1. write only canonical `report.json`, TASK-545 `manifest.json`, and the exact
   reviewed certification screenshots; invoke TASK-545 phase 1 from tracked
   `_docs/_workflows/task-414-implement.mjs`, then terminate immediately with
   `owner_action_required` and no metadata write, staging, or commit;
2. after the owner reviews and stages only that evidence directory, re-enter
   through the returned task/run/hash-bound argv, require tracked parity, and
   run a fresh final read-only drift pass against the frozen runtime before any
   terminal metadata write; a substantive finding retires the invalid evidence
   through an explicit owner action and requires a fresh certification run;
3. read task/changelog indexes fresh and derive the actual UTC closure date;
   use TASK-545's ordered durable writer to create exactly changelog 1266
   no-replace and then CAS-update/fsync its index row;
4. mark every implementation descendant terminal before its physical parent in
   dependency order, while leaving TASK-414-11-L01, TASK-414-11, and the board
   parent open;
5. mark TASK-406 `⏭️ Superseded` by TASK-414-11-L01 only after citing both
   cross-industry matched-media and unsupported-empty replacement evidence;
6. synchronize TASK-406/TASK-414 board rows, descendant counts, Statistics, and
   changelog references from the freshly read indexes;
7. mark TASK-414-11-L01, then TASK-414-11, then TASK-414 `✅ Done` last with
   actual completion dates and receipts; and
8. run TASK-545's final metadata-only delta validation. No source, tests,
   configuration, runtime/product docs, workflow, evidence, HEAD, other task,
   or other changelog byte may differ from the checkpoint-frozen runtime.
