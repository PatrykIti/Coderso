# TASK-414: Guide, Agent, and Designer Product Completion
# FileName: TASK-414_Generic_CMS_Site_Assistant_Product_Completion.md

**Priority:** High
**Category:** Guide / Agent / Designer / CMS Capability Platform
**Estimated Effort:** Very Large
**Dependencies:** TASK-407 `✅ Done`
**Implementation Gates:** TASK-545, TASK-547, TASK-548, and complete TASK-551
must be terminal before the TASK-414 workflow bootstrap, activation-owner
AUTHOR freeze, or any product-source dispatch. TASK-551-03-L01, TASK-551-03-L02,
TASK-551-05-L01, TASK-551-06-L01, TASK-551-06-L02, TASK-551-08-L02,
TASK-551-08-L03, TASK-551-09-L02, and TASK-551-09-L03 must be terminal before
their named consumers. TASK-485-03 must be terminal before TASK-414-02-L03
runtime plugin activation. TASK-511 must be
terminal before Designer backup integration. TASK-554 must be terminal before
Agent Post actions. After TASK-414-03-L03 lands the shared route transport,
serialized TASK-489 and TASK-555 must both become terminal before
TASK-414-04 product dispatch resumes; their receipts must include current
TASK-548 generated docs bytes and complete pure capability contributions. TASK-556
remains blocked until TASK-414 and TASK-555 are terminal.
**Related Tasks:** TASK-403, TASK-404, TASK-405, TASK-406, TASK-407, TASK-410,
TASK-414-01, TASK-485, TASK-511, TASK-545, TASK-547, TASK-548, TASK-551,
TASK-489, TASK-554, TASK-555, TASK-556
**Status:** 🚧 In Progress
**Started:** 2026-06-07
**Contract Refreshed:** 2026-08-09
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

The 2026-06 contract described one broad “AI webmaster” and left nearly all
remaining work as candidate bullets. That model is obsolete. Coderso needs three
separate products with different trust, persistence, provider, and mutation
boundaries:

1. **Guide** — a provider-free, built-in documentation helper owned by TASK-548;
2. **Agent** — an optional provider/model-backed assistant for research and
   bounded work on existing CMS resources; and
3. **Designer** — a separate AI product that generates a complete staged site,
   exposes a navigable temporary preview, and promotes the reviewed graph only
   after explicit approval.

This family preserves the existing trusted mutation core:

`untrusted semantic draft -> backend schema/policy -> typed proposal -> dry-run
-> explicit review -> idempotent execute -> audit/validate`

Provider output never becomes an executable action, native CMS document, URL,
permission, target ID, or stored package without backend-owned normalization and
authorization. Guide does not use this mutation flow and never needs an AI
provider.

TASK-414-01 remains a valid historical completion receipt for generic Content
Type field refinement and long-prompt UX. Its old “LLM Guide” name is historical;
new contracts classify its mutation behavior as **Agent**, not Guide. Do not
rewrite or relabel the closed task.

## Verified 2026-08-08 Baseline

- TASK-548 already owns the packaged `/admin/help` surface, one `docs/guide`
  corpus, deterministic DB-backed Guide, reviewed screenshots/examples, and
  independent Guide/optional Agent tabs. TASK-414 must consume that terminal
  contract instead of creating a second Guide or assistant shell.
- Guide already supports authorized evidence and deep links, but TASK-548 does
  not yet make atomic-control versus composed-workflow coverage explicit. The
  minimal amendment stays in TASK-548; TASK-414-02 adds the cross-product CMS
  capability manifest and permanent contributor drift gate.
- Agent conversation state is currently one browser `localStorage` snapshot
  with a 30-minute TTL and no user-owned session identity. PostgreSQL has docs
  and action execution tables, but no Agent session/message/run/resource model.
- `modelCapabilities.ts` currently infers behavior from model-name substrings.
  Unknown models can degrade to prompt-only JSON. Agent/Designer may not use
  those assumptions as an authorization or safety boundary.
- Action planning currently expands configured token limits with provider
  maxima. New work must treat every configured/provider/context/tool limit as a
  ceiling and use the smallest applicable value.
- There is no controlled web-search tool or private assistant attachment
  quarantine/extraction pipeline.
- Posts have native draft, autosave, revision, preview, and publish services,
  but no Agent Post actions, canonical Agent deep-link handoff, or optimistic
  edit token. TASK-551 owns the shared concurrency-safe revision handoff;
  TASK-554 owns the immediate metadata-publish RBAC repair.
- TASK-547 defines the strict full-site package graph, references, plan,
  installer ledger, and rollback foundation. It does not define a Designer
  workspace, staging API, digest-bound preview, approve/reject state machine, or
  product-atomic promotion. Its terminal source commit
  `a13d186167a05901e644bf1a3a7aefee6f780471` landed through merge
  `963733cae23456622bea1eef1b734723aaab2350`; TASK-414 consumes those landed
  bytes read-only and does not reopen or widen the package contract.
- Saved Designer drafts, preview-session state, promotion leases, and restore
  normalization are absent from TASK-511 and must receive an explicit backup
  handoff.

All source anchors are hints to re-verify against the terminal dependency HEAD
before implementation. Known large TS/TSX files require `grep -an`/direct reads
when `rg` reports no matches.

## Product Boundary

| Product | Provider requirement | Durable state | Permitted effect | Explicitly forbidden |
|---|---|---|---|---|
| Guide | None | TASK-548 docs/index plus Guide-only UI state | Concise grounded answer, screenshots/examples, authorized internal full-doc/CMS links | Provider call, web research, file interpretation, action plan, CMS mutation |
| Agent | Explicit usable AI provider + exact model capabilities | User-owned server session, messages, runs, tool calls, citations, resource bindings | Research and reviewed bounded operations on supported resources | Docs-only/deterministic fallback presented as Agent, autonomous mutation, whole-site generation/apply |
| Designer | Prompt generation/revision requires an explicit usable AI provider + exact structured-generation capabilities; reopening needs none; a later Figma import uses its own exact grant/lease binding and no fake AI provider | Owner-scoped workspace, immutable revisions, staged core/sidecar graph/assets, validation receipts, preview/promotion/activation-generation records | Generate/revise/navigate a complete staged site; approve promotes the reviewed whole-bundle digest | Pre-approval canonical CMS rows, normal CMS visibility, direct provider/import writes, partial or mixed-generation visibility |

The server-owned intent router chooses among `guide | agent | designer |
needs_input`. A full-site, multi-resource site-graph request never compiles to
Agent `site-kit.*` actions. It returns an explicit sanitized Designer handoff.
An individual resource request remains Agent work only when the capability
manifest declares a bounded proposal/action contract and the caller holds the
native permissions.

## Guide Contract (TASK-548 Owner)

- `/admin/help` and Guide remain available to an authenticated Admin user when
  Agent/Designer are disabled, misconfigured, rate-limited, or offline.
- Every successful grounded Guide `answer` is concise and contains authorized
  evidence plus an authorized, non-null internal link to the complete documentation
  page/section. A zero-hit
  result is a typed non-answer without an invented link. Default
  `basic` output is at most 440 Unicode scalar values and either two prose
  sentences or three ordered steps. The full page may contain reviewed visuals,
  examples, atomic controls, and composed workflows.
- One capability taxonomy relates each composed workflow to an ordered set of
  atomic controls. Coverage rejects missing/orphan/duplicate/cross-locale or
  permission/target-ineligible mappings.
- Atomic/composed documentation describes shipped behavior. It does not grant
  Agent tools, authorize Designer generation, or create a second mutation path.
- TASK-414-02 consumes TASK-548's stable `capabilityIds` and section identities;
  it does not fork prose, screenshots, search, or Help routing.

## Agent Contract

### Availability and provider capabilities

- Agent is unavailable unless an enabled provider and selected model resolve to
  a fresh exact capability profile from the provider adapter/API. Unknown,
  expired, malformed, or unsupported capability facts are `false`, never
  inferred from a model-name substring.
- Capability facts cover input modalities, native file forwarding, vision,
  strict structured output, tool calling, context/output limits, and provider
  policy/provenance. Mutating proposals require strict structured output even
  though all output is revalidated.
- A provider/model failure returns a focused Agent unavailable/error state. It
  never returns Guide output or a local heuristic/deterministic plan under an
  Agent label.
- The web-research provider is a separate optional integration. Agent remains
  usable without web research when the selected AI model is usable.

### Sessions and resource continuity

- PostgreSQL is authoritative for user-owned Agent sessions, ordered messages,
  runs/tool calls, active-session pointer, citations, and resource bindings.
  Transcript/provider payloads are not persisted in browser storage.
- The user may explicitly create **New session**. Otherwise the selected session
  persists across tabs/windows and bound CMS resources. A deep link carries only
  opaque session and resource-binding identities; server ownership, binding,
  and current resource authorization are rechecked. It never trusts a target ID
  or arbitrary href from the URL.
- Lists are keyset-paginated and bounded. Append/update uses an optimistic
  session revision. Cross-tab notification is an optimization; focus/reconnect
  always revalidates the server snapshot.
- Archive/delete/retention removes only caller-owned data and private
  attachments according to a bounded resumable lifecycle. Audit evidence needed
  for executed CMS actions remains under its owning retention contract.

### Tools, research, and attachments

- A server-owned, permission-filtered tool registry rejects unknown tools before
  permission collection. Each run caps rounds, tool calls, actions, tokens,
  elapsed time, input/output bytes, fetched sources, attachments, and extracted
  material. External I/O never occurs inside a DB transaction.
- Initial search uses a provider-neutral `WebResearchProvider` with a Brave
  Search/LLM Context adapter. Playwright is not a search engine; it is an
  optional cookie-free sandbox renderer for an already selected JS-heavy URL.
- Raw Brave result/page bodies are transient. Durable session state stores the
  synthesized answer and bounded citation identity/provenance/digest required
  for review, subject to the current provider terms verified at implementation.
- PNG/JPEG/WebP, PDF, DOCX, XLSX, PPTX, text, and CSV enter a dedicated private
  quarantine, never the public Media library. Malware scan and isolated bounded
  extraction precede model access. Native forwarding happens only when the
  exact provider/model profile supports that file kind; otherwise Agent receives
  a bounded normalized projection.

### CMS mutation boundary and Posts reference flow

- Agent proposes bounded changes to supported CMS resources and executes only
  after dry-run/review. Underlying native read/write/publish permissions remain
  mandatory; `assistant:use` is not privilege escalation.
- `post.draft.create` and `post.draft.update` cannot publish. They return the
  canonical Post editor deep link bound to the same Agent session/resource. The
  bridge keeps that session visible beside the native editor across reload/new
  tab so follow-up requests revise the same bound draft.
- Edits use an expected version/`updatedAt` token and cannot overwrite dirty
  browser state. Conflict returns a typed 409 and a new proposal/diff path.
- `post.publish` is a separate immutable reviewed action requiring both
  `content:write` and `content:publish`, a fresh conflict token, and an
  approval/action/plan tuple bound by digest and idempotency key. The provider
  cannot construct or select the approval. Revision allocation, mutation, and
  publication are transactional; history reads are bounded.
- Existing-site refinement, nested/slot edits, prompt-specific copy, brand,
  theme, trusted licensed image/video/rich-gallery media, booking, commerce,
  reviewed checkout selection, and disabled-by-default webhook configuration
  is enabled only through explicit capability packs. Agent cannot execute a
  checkout/payment/order/refund, send a webhook/test delivery, accept a remote
  media URL, or substitute unrelated stock media. Unsupported work stays
  `needs_input`/`gated` with zero actions.

## Designer Contract

### Staging and state machine

- Designer workflow state wraps, but never widens, terminal TASK-547's
  `FullSitePackageV1`. `DesignerSiteBundleV1` owns that byte-identical core plus
  strict typed sidecars for supported resource families absent from the core.
  Workspace/revision/decision/lease fields enter neither core nor sidecars.
- Staged Pages, Posts, Menus, Forms, content entries, settings, media projections,
  and other supported resources live only in Designer-owned tables/private
  storage. Canonical list/search/cache/public queries cannot discover them.
- The exact persisted state enum is `draft | generating | ready |
  promotion_pending | promoted | failed | rejected | expired | restoring |
  reconciliation_required | deleting | deleted`; TASK-414-07-L01 owns its
  closed transition matrix and CAS rules. Each immutable revision binds
  canonical core, ordered sidecar set, whole-bundle bytes/digests, validation
  receipt, preview digest, creator, and timestamp.
- Saved drafts remain visible only in Designer. Reject/expiry deletes only
  workspace-owned staging/private assets and can never delete already promoted
  canonical resources.

### Generation, revisions, and preview

- Prompt and scanned attachment projections normalize into a strict bounded
  Designer brief. Provider output is an untrusted semantic draft; backend
  owners compile it into the terminal package core plus strict registered
  sidecars, resolve one symbolic graph, normalize native documents, and
  materialize the complete staging graph.
- Materialization uses one closed source union. `prompt_ai` binds all six exact
  provider/model/config/input-policy fields. A prepared private source such as
  Figma binds its own strict schema/digest and source-owned fence; it never
  receives a placeholder provider. Only code-owned static source contributions
  can recheck the binding before compiler entry and again under the staging
  transaction lock.
- Preview is generated from staged read models and bound byte-for-byte to one
  workspace version/package/validation digest. It is cache-ineligible,
  `no-store`, and `noindex`. V1 exposes it only inside the authenticated,
  same-origin Admin surface. A nonauthorizing preview-session ID identifies the
  server-owned row; a one-time body-only secret binds it to the current Admin
  session, actor, workspace, version, and digests before any render. Every read rechecks the current Admin session and
  workspace access. Revision/reject/expiry revokes the binding. No public,
  cross-host, token-mint, or front-runtime preview route exists.
- The user can navigate the generated site and request revisions in the same
  Designer workspace. A revision never mutates reviewed bytes in place; stable
  resource keys allow an explicit graph diff.

### Approval, promotion, rejection, and recovery

- Approval binds actor, workspace version, core/sidecar/whole-bundle digests,
  validation receipt, preview digest, fresh live-site baseline, native
  permission union, and an idempotency key. Any drift returns a conflict before
  canonical writes.
- Promotion serializes per installation/workspace with a durable bounded lease. Native
  adapters must participate in one encompassing transaction or an equivalent
  proven visibility-atomic prepare/promote barrier. External assets are prepared
  privately; publication/cache/outbox effects occur only after commit.
- An adapter that cannot provide product-atomic promotion remains unavailable in
  the Designer manifest. The product must not expose a partly generated site in
  canonical CMS sections.
- Canonical resources/artifacts are prepared under one inactive activation
  generation. One product transaction proves the complete plan, mappings,
  ledger, and cache/outbox facts, then compare-and-swaps the active-generation
  pointer. Each request captures one generation for its whole read, so an
  in-flight request sees the complete old site and the next request sees the
  complete new site, never a mixed graph.
- Durable item checkpoints and a restart reconciler define resume versus
  compensate after every injected crash point. The uninterrupted caller awaits
  post-commit invalidation through TASK-551's single lifecycle owner once;
  recovery may replay the same stable event key, so transport is at-least-once
  and the effect is idempotent/effectively-once.
- Backup includes saved draft graph/revisions/core/sidecar/bundle artifacts and durable
  decisions, but excludes live preview sessions/bind-secret state, leases, quarantined/transient tool
  bodies, and provider credentials. Restore never auto-resumes a promotion;
  nonterminal restored workspaces return to review/reconciliation.

## Extensibility Contract

Every new or changed CMS capability must update one code-owned
`CmsCapabilityManifestV1` record and its generated parity projections. The
record declares:

- stable capability/resource identities and native schema owner;
- Guide atomic-control and composed-workflow section references;
- Agent read/propose/execute support or a machine-readable unavailable reason,
  action families, bounds, and required permissions;
- Designer stage/preview/promotion adapter support or an unavailable reason;
- accepted input modalities and any provider/tool requirement; and
- focused unit/integration/runtime evidence.

Generated guards compare Admin route/control, widget/content, action-family,
TASK-547 package-kind, docs bundle, and product-adapter inventories. A changed
source inventory with a stale manifest/cookbook fails CI instead of silently
degrading Guide, Agent, or Designer. The developer cookbook specifies exactly
what to add, where, which product may intentionally remain unsupported, and how
to prove the negative contract.

Post-terminal built-in materialization sources extend these owners rather than
forking them: atomically replace the named generation source-shape constraint
while preserving prior truth tables, bind receipts to generation runs, add one
method/descriptor to the existing `DesignerApiFacade`/route factory, compose one
static source through `Task414RuntimeFacade`, regenerate the existing capability
artifact, and version the strict Designer backup section. TASK-556 is the first
reserved successor. Its Setup handoff may use only the workspace descriptor's
browser-only `setupAccess: "review"` metadata; all server authorization remains
unchanged.

## Security Contract

- **Visibility:** Guide uses TASK-548 internal Help/Assistant reads. Agent and
  all Designer management, staged-read, preview, decision, and recovery routes
  are same-origin internal `/admin/api/*` APIs. No public AI, public/cross-host
  Designer preview, token-mint, or package-write endpoint is allowed.
- **Auth:** authenticated Admin session. Server resolves current actor and
  never accepts owner, permission, role, provider capability, or trusted target
  identity from the body.
- **RBAC:** Guide follows document/destination filtering. Agent requires
  `assistant:use`; web research additionally requires `assistant:research`.
  Designer read/staging/promotion require `designer:read`, `designer:write`, and
  `designer:promote` respectively, plus the exact union of native resource
  permissions. Provider/settings management remains `settings:write`.
- **CSRF:** required on every internal POST/PUT/PATCH/DELETE mutation, including
  session selection, uploads, tool runs, decisions, rejection, and promotion.
- **Rate limits:** dedicated bounded `assistant`, `assistant-research`,
  `private-input-upload`, `designer-generation`, `designer-preview`, and
  `designer-promotion` policies plus disabled-by-default `designer-figma`, with
  stricter per-actor/workspace concurrency and daily provider/tool budgets.
- **Validation:** recursive reject-unknown schemas, strict multipart field
  allowlists, exact owner/version/digest/idempotency checks, bounded cursors and
  payloads, native normalizers after symbolic reference resolution, and typed
  domain errors mapped only at route boundaries.
- **Anti-abuse:** no nonce/HMAC/CAPTCHA applies to internal writes. Designer
  preview requires the authenticated Admin session plus a consumed one-time
  bind secret and short-lived server-side actor/session/workspace/version/digest
  binding; it is no-store/noindex, refuses redirects, and is revocable. The path
  ID never grants access by itself. Public forms generated by Designer retain their
  native nonce/CAPTCHA/rate policies.
- **Secrets/privacy:** provider/search keys remain encrypted backend-only.
  Never place keys, cookies, CSRF, private attachment URLs/bytes, raw provider or
  search bodies, preview bind secrets, leases, or privileged settings in browser
  storage, public payloads, caches, logs, screenshots, task evidence, or
  changelogs. Diagnostics use safe IDs/codes and bounded redacted metadata.

## Orchestrated Workflow Bootstrap

After terminal TASK-545 and before the first implementation leaf dispatch, the
orchestrator authors and validates this tracked control plane:

- `_docs/_workflows/task-414-author-audit.mjs`;
- `_docs/_workflows/task-414-implement.mjs`;
- `_docs/_workflows/task-414-fix.mjs`;
- `_docs/_workflows/lib/task-414-activation-owner-inventory.mjs`;
- `tests/unit/workflows/task414AuthorAudit.test.ts`; and
- `tests/unit/workflows/task414WorkflowContracts.test.ts`; plus focused
  activation-owner inventory fixtures in that workflow test lane.

These are family orchestration files, not a product leaf write set. They must
consume TASK-545's all-results, finding-driven audit, exact post-audit identity,
smoke-evidence, checkpoint, and metadata-closeout owners; use structured agent
results; preserve the sequential land order and one-writer file sets below;
pin changelog 1266 and explicit collision guards; and forbid agent commits,
dynamic changelog allocation, or a second smoke lifecycle. The owner reviews
and commits the workflow bootstrap before dispatch so the later TASK-545
checkpoint can prove that the executing `task-414-implement.mjs` is tracked,
regular, non-symlinked, HEAD-identical, and statically valid. Agents never
perform that commit.

`_docs/_workflows/` remains globally ignored after TASK-545 except for its
canonical evidence subtree, so merely creating these scripts in a local
worktree is not a bootstrap pass. The orchestrator authors only the three exact
top-level TASK-414 role entries, the one exact inventory library, and the two
exact workflow-test owners above, reports normalized paths plus SHA-256 values
as `owner_action_required`, and stops before any research/author/implementation
dispatch. It never stages files. After explicit owner review, force-add of the
three ignored role entries plus the ignored library, ordinary addition of the
two tests, and an owner commit, a fresh invocation must prove with
`git ls-files --error-unmatch` that the top-level `task-414-*.mjs` set is
exactly author-audit/implement/fix and that the one library path is tracked.
It rejects every extra top-level role or substituted inventory library,
verifies regular-file/no-symlink status, compares every worktree byte with
`git show HEAD:<path>`, and reruns both workflow suites plus TASK-545's
static/import gates. Missing, dirty, ignored-only, substituted, or extra entries
fail closed. Existing ignored lookalikes are non-authorizing and must be
rebuilt from the reviewed contract. The tests prove that an untracked local
lookalike can never become the author, implementation, fix, or
activation-inventory owner.

The author-audit workflow first imports and executes TASK-414-09-L05's
activation-owner inventory library and writes its verified matrix into
TASK-414-09-L04 before any product source dispatch. The inventory is a bounded
library phase, never a fourth top-level workflow role. The workflow then runs
one complete initial contract pass with all declared
per-file results plus one cross-file reconcile. A clean pass may finish
immediately; after a verified HIGH/MEDIUM correction it reruns only affected
scopes plus one fresh reconcile. The implementation workflow dispatches leaves
strictly in the declared order, applies each owning validation gate, and runs
the exact independent post-audit lenses. The fix workflow may change only the
finding's declared owner paths and reruns only invalidated gates/lenses.

At family closeout, only `task-414-implement.mjs` may invoke TASK-545 phase 1
for suite/profile/session `task-414`/`certification`/
`task-414-certification`, pause for owner review and staging, re-enter through
the returned checkpoint-bound argv, run frozen-runtime final drift, and perform
closure-only metadata writes. A metadata-recovery resume reruns neither drift
nor smoke. Changelog 1266 file+index are the first metadata writes through the
TASK-545 ordered durable writer; descendants, TASK-406, board/statistics and
TASK-414 closure statuses follow deterministically. Resume never redispatches
implementation, smoke, or source fixes.

## Sub-Tasks

| Order | ID | Scope | Status |
|---:|---|---|---|
| historical | TASK-414-01 | Generic Content Type refinement and long-prompt UX receipt | ✅ Done |
| 1 | TASK-414-02 | Unified capability manifest, Guide atom/workflow relation, generated drift gates, extension cookbook | ⏳ To Do |
| 2 | TASK-414-03 | Exact provider/model/tool capabilities, shared persistence migration, durable Agent sessions | ⏳ To Do |
| 3 | TASK-414-04 | Controlled web research and private multimodal attachments | ⏳ To Do |
| 4 | TASK-414-05 | Agent Post draft/revision/publish flow and bounded resource proposals | ⏳ To Do |
| 5 | TASK-414-06 | Existing CMS capability packs: structure/theme/media/booking/commerce/refinement | ⏳ To Do |
| 6 | TASK-414-07 | Designer staging workspace, graph, state machine, decisions, retention, shell | ⏳ To Do |
| 7 | TASK-414-08 | Designer brief/compiler, immutable validation receipt, digest-bound preview and revisions | ⏳ To Do |
| 8 | TASK-414-09 | Approval/promotion/reject/expiry/recovery/cache/backup integration | ⏳ To Do |
| 9 | TASK-414-10 | Later-phase, disabled-by-default Figma REST/OAuth import through bounded Design IR; required for family closure | ⏳ To Do |
| 10 | TASK-414-11 | Cross-product real-flow acceptance, docs, changelog, and closure | ⏳ To Do |

TASK-414 implementation is strictly sequential, with one explicit serialized
cross-family checkpoint after TASK-414-03. Changing this order requires an explicit
contract amendment and a fresh complete audit before dispatch. The binding land
order is:

`TASK-414-02-L01 -> TASK-414-03 -> TASK-489 -> TASK-555 ->
TASK-414-04 -> TASK-414-05-L05 ->
TASK-414-05-L04 ->
TASK-414-05-L01 -> TASK-414-05-L02 -> TASK-414-05-L03 ->
TASK-414-06-L01 -> TASK-414-06-L02 -> TASK-414-06-L04 ->
TASK-414-06-L05 -> TASK-414-06-L03 -> TASK-414-07 -> TASK-414-08 ->
TASK-414-09-L01 -> TASK-414-09-L02 -> TASK-414-09-L04 ->
TASK-414-10 -> TASK-414-09-L03 ->
TASK-414-02-L02 -> TASK-414-02-L03 -> TASK-414-11`.

TASK-414-09-L05 produces a passed, digest-bound initial AUTHOR/audit gate
receipt before product dispatch and is not a mid-implementation source or
task-metadata writer. Its task file remains canonically `⏳ To Do` until the L01
family closure writes statuses/changelog/board in one ordered metadata phase;
implementation readiness is authorized by the verified receipt, never by a
premature status transition. TASK-414-02-L01 first owns the manifest/permission product boundary;
TASK-414-02-L02 is the final generated documentation/capability reconciliation
after every Core contribution lands. TASK-414-02-L03 then owns signed runtime
plugin capability activation without mutating those generated bytes.
TASK-414-03-L02 is the sole schema/migration writer for new Agent, attachment,
and Designer workspace persistence. The separate post-static
TASK-414-02-L03 plugin/CMS-capability runtime overlay owns only its own complete
extension-release/Guide-projection migration and lands later through the live
journal; neither writer edits the other's table module or migration artifacts.
TASK-414-09-L03 is the sole family integration writer for shared route/
navigation/rate mounts and aggregate cache publication, and therefore lands
after Figma's pure contributions and terminal TASK-555 host anchors.
TASK-489 and TASK-555 consume TASK-414-03-L03's terminal transport read-only,
land in that order, contribute their own user-facing route/control/Guide facts
through TASK-414-02-L01's pure schema, and regenerate TASK-548 bytes through its
terminal commands. They do not compile the final CMS capability artifact;
TASK-414-02-L02 consumes their terminal descriptors and regenerated docs as
authoritative inputs. TASK-556 is the first post-TASK-414 successor and may only
use the extension seams reserved below. TASK-414-11-L01 owns tests/docs/task/changelog
closure only and does not reopen production contracts.

Before each child starts, re-read terminal dependency bytes, the live migration
journal, source line counts, active worktrees, and current diff. Pin exact file
ownership and forbidden paths in the child/leaf workflow. The frozen TASK-547
source named above is a read-only dependency. TASK-548-owned Assistant/Help
files remain forbidden until that family is terminal and handed off.

The current TASK-414 and TASK-489/555/556 contracts were authored in separate
dirty worktrees. No product implementation may start from either isolated tree.
First merge/reconcile one canonical contract tree containing this TASK-414/548
state, rewritten TASK-489, and complete TASK-555/556 physical families. One
fresh parent owner must reconcile board rows/statistics and changelog reservations
1266..1270 without choosing either worktree's index wholesale. Then rerun the
complete cross-family read-only graph/ownership audit against unchanged bytes.
Missing files, a stale legacy TASK-489 row, unresolved shared-writer order, or a
TASK-555/TASK-414 dependency cycle keeps dispatch closed.

The canonical merge audit must verify these external corrections rather than
assuming them from prose:

1. rewritten TASK-489 has terminal TASK-414-03-L03 as a parent-level start gate,
   owns one L01-compatible capability contribution, leaves current TASK-548
   generated Guide bytes, and uses the canonical TASK-545 evidence path;
2. TASK-555's Setup host owns a product-neutral `setupAccess` metadata shape and
   `SetupReviewContinuationV1` tested with an injected `review` descriptor, but
   does not depend on TASK-414-09-L03. TASK-555 also owns its pure capability/
   Guide contribution and terminal TASK-548 regeneration before closure;
3. TASK-556 keeps complete TASK-414/TASK-555 as external gates, encodes each
   physical predecessor leaf in `Dependencies` in addition to receipts, and
   remains the final capability/docs/smoke successor; and
4. the global shared-smoke writer sequence is TASK-548 -> TASK-489 -> TASK-555
   -> TASK-414 -> TASK-556, with every successor preserving all prior suites and
   using TASK-545's canonical evidence/checkpoint contract.

## Acceptance Criteria

- Guide works with no provider/model/network, defaults to `basic`, stays within
  440 Unicode scalar values and two prose sentences or three ordered steps, and
  opens the complete authorized internal document with visuals/examples for
  every successful grounded `answer`; `no_match` and `needs_input` remain
  explicitly link-free and never fabricate a destination.
- Generated coverage proves every in-scope atomic control and each composed
  workflow relation; feature additions fail the capability-sync gate when any
  Guide/Agent/Designer/cookbook declaration drifts.
- Agent is visibly unavailable without a valid provider/model and never emits a
  Guide/deterministic fallback under the Agent product.
- The same Agent session survives reload and multiple tabs/resources; explicit
  New session creates isolated context and does not mutate the previous session.
- Research produces reviewable citations through the configured provider;
  selected-page rendering is sandboxed. Unsupported web/file/model capability
  fails closed without partial tool execution.
- A scanned attachment can ground a bounded Agent/Designer run without entering
  public Media or leaking a private storage URL.
- Agent creates a Post draft, opens its canonical editor through the same
  session/resource binding with the same-session companion visible, proposes
  conflict-safe edits, and publishes only
  through a separate immutable approved action with both `content:write` and
  `content:publish`.
- Full-site intent produces a Designer handoff and zero Agent full-site actions.
- Designer draft resources are query-proven absent from normal CMS/public/cache
  read models while the complete staged site is navigable in preview.
- Previewed, approved, and promoted core/sidecar/bundle/validation digests are
  identical; stale approval/live baseline/version conflicts produce zero
  canonical writes.
- Reject/expiry fully cleans owned staging/private assets; approve moves one
  complete activation generation atomically. A held request sees the complete
  old generation and a new request sees the complete new generation; crash
  retries are idempotent and cannot leave mixed/partial visibility or duplicate
  resources.
- Backup/restore does not revive preview sessions/bind-secret state or leases and does
  not auto-resume promotion.
- The disabled-by-default Figma adapter is completed before family closure. When
  enabled it enters the same Design IR -> brief -> strict
  `DesignerSiteBundleV1` -> staging -> preview path and cannot write canonical
  CMS resources. Its pending generation claim stores the exact source-grant ID
  and normalized selection digest; L01 must CAS-bind current credential
  generation plus import lease/fence before external I/O, and materialization
  rechecks the same binding transactionally.
- Every touched production/test file is at most 1,000 physical lines and all
  required static, DB, security, runtime, dark/light, wide/narrow, and
  publish-to-front gates pass.

TASK-406's destructive cross-industry reset concept is absorbed into the
stronger owner-scoped TASK-414-11 runtime suite. TASK-406 remains a To Do
handoff while implementation is pending and is marked Superseded only during
TASK-414-11 closure after every implementation descendant through TASK-414-10
is terminal and replacement evidence plus frozen-runtime drift are green, but
before TASK-414-11-L01/TASK-414-11/TASK-414 receive their final statuses.

## Testing Requirements

Each leaf runs its exact owning lanes. Family closure additionally requires:

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- targeted Vitest for pure contracts/Admin UI
- targeted Bun tests for routes, DB, storage, actions, promotion, retention, and
  recovery
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- migration SQL/snapshot/journal parity and sanitized representative query-plan
  evidence for new bounded read models
- shared `scripts/runtime-smoke.ts` `task-414` fast/certification adapter with
  exactly the 25 ordered real flows declared by TASK-414-11-L01,
  visible-effect assertions, zero console/page errors, scoped cleanup, and
  reviewed screenshots
- terminal TASK-545 validation of the certification runner report, canonical
  manifest, exact screenshot inventory, owner-reviewed tracked evidence,
  closure checkpoint, and final metadata-only delta
- final touched production/test physical-line count from this task baseline

No live provider test may print keys, prompts containing secrets, raw
attachments, or full provider/search responses. Expensive/provider-specific
lanes require explicit opt-in credentials and deterministic non-live contract
coverage remains mandatory.

### Shared runtime-smoke architecture

TASK-414-11-L01 owns one thin, statically registered `task-414` adapter entered
only through:

```bash
bun scripts/runtime-smoke.ts run \
  --suite task-414 --profile fast --session task-414-fast
bun scripts/runtime-smoke.ts run \
  --suite task-414 --profile certification --session task-414-certification
```

It follows `docs/develop/runtime-smoke-cookbook.md` and composes the existing
shared runner, lifecycle/process/polling wrappers and helpers, persistent
profile worker/operation registry, pooled DB worker and set-based ownership
helpers, browser segments/transport, checkpoints, repository guard, redaction,
timing, screenshot, cleanup, and report primitives. No TASK-414 leaf may create
a task-local wrapper, helper/worker loop, server/Playwright lifecycle, DB
cleanup loop, checkpoint/report loop, or second suite. Earlier implementation
leaves provide strict product fixtures/operations and hand off scenario
contracts; L01 alone registers and executes the combined adapter.

Fast evidence is feedback-only and is removed through shared owner-scoped
cleanup before certification. Certification captures the shared runner's
canonical JSON stdout byte-for-byte as
`_docs/_workflows/_smoke/evidence/task-414/task-414-certification/report.json`.
The closure owner writes only the exact TASK-545 `manifest.json` projection and
reviewed scenario PNGs beside it; TASK-545 alone creates
`resume-checkpoint.json`. The suite itself does not skip sealed scenarios or
claim runtime scenario-resume support. The separate TASK-545 checkpoint resumes
only owner-reviewed evidence and terminal metadata closeout.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/DATA_MODEL.md`, `_docs/PREVIEW_SPEC.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/MEDIA_SPEC.md`, `_docs/SEARCH_SPEC.md`, and `_docs/AUDIT_SPEC.md` for
  the owned contracts
- `docs/develop/assistant.md` plus a Guide/Agent/Designer capability-extension,
  tool, attachment, Designer staging/promotion, recovery, and Figma cookbook;
  TASK-414-02-L02 is the sole writer for `docs/develop/assistant.md`, the
  TASK-414 `docs/guide/` corpus, and generated capability/docs artifacts
- `docs/guide/` user documentation for Guide, Agent sessions/research/files,
  Post handoff, Designer drafts/preview/approve/reject, and provider setup
- TASK-548's exact atomic/composed capability and concise-answer amendments
- TASK-511 backup matrix handoff and TASK-547/TASK-551 terminal interface notes
- `_docs/_TASKS/README.md`, this complete family, changelog 1266, and changelog
  index at closure
