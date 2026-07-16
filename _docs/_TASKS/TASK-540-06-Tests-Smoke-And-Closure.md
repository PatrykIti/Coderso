# TASK-540-06: Tests, Smoke, and Closure

# FileName: TASK-540-06-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Testing / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-540-01..05
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Fix Started:** 2026-07-15
**Implementation Complete:** 2026-07-16 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Changelog:** 1252 (pinned; closure only)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Scope

Create one cross-leaf aggregate regression suite for TASK-540, run every source-owner
suite read-only, update Custom Screen/cache/API documentation, execute seven real
browser flows, and close the family only after every descendant and required gate is
green. Exactly five fresh post-audit lenses, in their contract order, must cover schema/URL compatibility,
Tabs/accessibility, async/dirty/cache safety, per-user responsive behavior, and
test/docs/smoke-feasibility/task-graph integrity before runtime starts; the separate
smoke-evidence audit runs only after the live flows. The pre-smoke lenses run strictly
sequentially, and the first dispatch/transport/schema failure stops later lens launch with
no same-invocation retry; final closure-drift lenses use the same boundary. A missing lens
result is not a pass. Every verified HIGH, MEDIUM, or LOW finding blocks this task's
closure unless it is explicitly split into a non-blocking follow-up with rationale. This
subtask owns no production source and may not edit shared/source-owner test suites.
Flow 6 freezes the complete persisted reset draft at `rc-002`, then the complete
post-intentional-edit current draft at `rc-017`; `rc-032` derives relation before
values only from `rc-002`, exhaustively enumerates each current picker DOM option, and
compares all non-relation current paths to `rc-017`. It separately proves
`rc-002 -> rc-017` changed only the intended note-content and field-tone paths. The
dirty-save retry persists and cleans content only: server presentation remains at its
baseline while the local presentation bytes remain preserved and dirty; no
`persistedPresentationMatches:true` claim is valid.

## Leaf

| ID | Title | Ownership | Status |
|---|---|---|---|
| TASK-540-06-L01 | Seven builder-save-entry flows and closure | one new aggregate test, docs, smoke evidence, TASK-540 closure metadata | 🚧 In Progress |

TASK-540-06-L01 deliberately retains the historical physical filename
`TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md` from the original
six-flow contract. The row uses the current seven-flow title, and no rename is part of
TASK-540.

## Orchestrator-only smoke helpers

The root-local orchestrator, outside every closure-agent `allowedFiles` list, solely owns
`_docs/_workflows/task-540-smoke-contract.mjs` and
`_docs/_workflows/task-540-smoke-executor.mjs`, plus the repo-owned
`_docs/_workflows/task-540-smoke-host.mjs` and the root-local
`_docs/_workflows/task-540-local-orchestrator.mjs` Node host. They are task-workflow
infrastructure,
not production/source files and not closure-owned tests or docs. The contract helper
exports only `buildTask540SmokePlan({nonce})` and
`runTask540SmokeContractSelfTest()`; it is import-side-effect-free, uses no environment,
filesystem, database, network, or `process.env`, and owns the blueprint plus the strict
compiler/validation for exactly 490 action rows, 15 fixture subjects, exactly 17 public
capture names, 13 screenshots, and 55 visible assertions. The plan has one complete
`actionManifest` and no second setup collection: all 55 setup rows, 428 flow rows, and
7 terminal browser rows execute exactly once through one dense ordinal `1..490` loop.
Refs remain symbolic in the frozen plan and resolve lazily only for the current action,
after its dependencies and capture producers have completed. The executor exports only
`executeTask540SmokePlan({root,nonce,assertSafeEvidence,snapshotRepository})` and
`runTask540SmokeExecutorSelfTest()`, rejects unknown input keys, accepts no raw
environment/secrets, agent dispatcher, arbitrary shell command, or caller-supplied
receipt/hash, and keeps its real/fake capability boundary private.
The local-orchestrator host is the runner-compatibility boundary for Claude Code
Workflow `2.1.210`, whose sandbox exposes no Node APIs or module loading. It accepts
only `--self-test` or `--run`, injects only the implementation orchestrator's
`agent`/`phase` bindings, and sends prompts over stdin. Each agent child receives only
the explicit non-secret OS allowlist (`HOME`, `HOSTNAME`, locale, `NO_COLOR`, `PATH`,
`TERM`, `USER`) plus fixed `CI=true` and `GIT_OPTIONAL_LOCKS=0`; database/Postgres,
SSH/Git-helper, cloud/profile, Kubernetes, browser/MCP, provider-key, credential,
token, and connection-string handles are absent. Read-only agents have exactly
`Read,Grep,Glob` in `plan` mode; mutating agents have exactly
`Read,Grep,Glob,Edit,Write` in `acceptEdits` mode. Neither class has Bash, Workflow,
browser, ambient MCP, slash-command, or Chrome authority. Higher-precedence Read/Edit
deny rules cover Read/Grep/Glob and Edit/Write and block all home dotfiles (including
CLI auth/config), every sibling project discovered at startup, root and nested
repository `.env*`/`.git`, and system/runtime trees outside Coderso; mutation agents
also cannot edit repository `node_modules`. `HOME` therefore authenticates the CLI
without exposing its credential files to the agent. Each invocation instead detaches a fixed repo-owned Node launcher as
group/session leader; it self-stops before spawning Claude, then starts Claude in the
same group/session only after the host binds and revalidates the launcher's PID/start,
PGID, and session identity. The launcher relays stdio, mirrors normal exits, and maps a
signalled Claude exit deterministically to `128 + signalNumber` (`255` only for an
unknown signal). Any post-PID authority/resume failure must complete bounded owned-group
cleanup; a cleanup failure is aggregated with the sanitized authorization failure. The
host bounded-polls normal/aborted completion, uses group TERM then conditional KILL
without an unbounded close wait, and proves the complete owned group/session absent.
When no authority identity was observable, the still-stopped launcher cannot have
spawned Claude and is disposed only through its owned child handle with a bounded
close. The hermetic local-host self-test executes the real Node launcher only around a
local no-network Node probe, not `/usr/bin/claude`. It proves local Claude-argv
construction, synthetic structured-envelope parsing, the projected child environment,
launcher/process-ownership and cleanup invariants, and deterministic signal-code
mapping; it makes no live Claude CLI-compatibility claim. Compatibility with the
installed Claude CLI and its current flags, schema handling, and structured output is
proven only when an actual `--run` invocation successfully dispatches the read-only
Start gate. The bounded value-scanned HEAD patch is supplied
locally for drift review together with at most 256 complete untracked projections:
tracked text is bounded to 20 MiB, aggregate untracked UTF-8 text to 8 MiB, and each
untracked file to 32 MiB. Text supplies path/kind/size/hash/content, binary supplies
path/kind/size/hash, and symlinks supply only a scanned target projection. Sensitive
paths/content, `.env*`/`.git`, unsafe/unsupported entries, bound overflow, and
handle/path identity drift fail before dispatch; regular-file reads bind and recheck an
opened handle so path-to-symlink swaps cannot redirect bytes. The implementation
orchestrator independently verifies every result and repository snapshot. The adapter defines no gate, helper, DB operation,
browser command, or smoke capability itself. Those operations remain direct children
of the root-local implementation orchestrator and executor; no agent execution path is
introduced.
The host module exposes only its hermetic self-test and closed `--serve <canonical-root>`
CLI. Its direct-entry guard is compatible with the pinned Node 22.14 runtime and
hermetically tests absolute/relative matches plus mismatched/missing argv rejection; it
does not rely on the later `import.meta.main` API. It never reads/sources `.env`,
receives only the executor's exact null-prototype
allowlisted host environment, directly spawns the backend/Admin/site descriptors, and
while still alive owns only descendant cleanup: after identity revalidation it sends
graceful TERM and then conditional KILL to surviving same-identity descendants and
proves descendant/listener absence. It cannot signal its own negative PGID or prove its
own runner/group absence. The executor exclusively owns whole negative-PGID TERM/KILL
and final runner, process-group, descendant, and port absence; no installed helper is
legal.

Each action has one exact reject-unknown `executable` descriptor; deprecated
`templateId/sourceAuthority/transport/stdoutPolicy` execution authority is forbidden.
The mechanically recounted disjoint partition is exactly 76 runtime operations, 386
browser run-code sources, 14 browser-native operations, 13 screenshots, and one global
browser list. Runtime operation IDs and run-code source IDs are direct per-action
registry keys with bidirectional set equality, not generic `api`/`observation`/
`assertion`/`route` switches over literal refs. Refs use only the six helper-matching
discriminants `literal/path/selector/secret/capture/fixture`; secret refs contain only
the names `ADMIN_EMAIL` or `ADMIN_PASSWORD` and are legal solely in the seven exact
native credential fills. All ordinary goto/resize/click/non-secret fill/press/type/
focus operations are one-layer-JSON run-code. The executor self-test uses the real
executor loop with hermetic fakes and proves one capability dispatch for each of the
490 action rows before cleanup, plus the executor's lane-specific runtime/browser
receipts and deterministic cleanup. Independently, the contract self-test's model loop
mechanically proves 490 model dispatches, 490 model receipts, receipt ordinals
`1..490`, manifest-ID set equality, the exact disjoint `55/428/7` receipt partition,
and exactly one model dispatch plus receipt per action. Neither self-test starts a real
capability.

The editable content-type detail projection is not an eighteenth public capture. Only
the exact `set-017-editable-type-proof` four-key output `{id,slug,name,schema}` may bind
the executor-private single-assignment `WeakMap` authority
`editable-content-type-detail`; only `set-035-screen-create` and
`set-037-retry-screen-create` may consume it. The two blueprint list-view descriptors
name `materializerId` plus `privateProjectionAuthorityId`, never a capture key.
Producer and consumer registries are checked bidirectionally against actual accessors,
and the projection value/hash is forbidden from public captures, plan/evidence,
receipts, callbacks, errors, and logs.

The orchestrator integration replaces and removes the old agent-executed smoke and
cleanup path; the execution models may not coexist, even as fallback or recovery.
Only strict canonical evidence or the fixed sanitized failure may leave the executor;
raw bytes, cookies, CSRF values, and session material remain private. Each invocation
starts browser authority at most once and keeps deterministic route, browser, resource,
access-log, process, and port cleanup plus absence proof inside the executor; a failed
call cannot launch an outer recovery, replacement prefix/host runner, or second smoke attempt.
Once the modules land, their exact `node --check` and `--self-test` commands are
mandatory in the closure gate, the complete full gate, and every final mechanical gate.
They are absent only from a sealed source-owner repair gate that predates the three
modules. That is a phase/evidence rule, not a claim about any sibling's current repair
or completion status: every pre-1252 closure/full/final gate after the modules land,
and every post-1252 covered final gate, includes all eight commands below.

If a final-drift source repair changes the closure leaf's gate or completion metadata,
the workflow must invalidate every pre-repair durable Pending snapshot before it tries
to recapture the repaired graph. A recapture failure must establish and verify a fresh
Closure Pending projection from that current, already re-gated graph; it may never make
the outer failure handler restore the stale pre-repair projection. The workflow
self-test must execute that failure branch hermetically.

```bash
node --check _docs/_workflows/task-540-smoke-contract.mjs
node _docs/_workflows/task-540-smoke-contract.mjs --self-test
node --check _docs/_workflows/task-540-smoke-executor.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node --check _docs/_workflows/task-540-smoke-host.mjs
node _docs/_workflows/task-540-smoke-host.mjs --self-test
node --check _docs/_workflows/task-540-local-orchestrator.mjs
node _docs/_workflows/task-540-local-orchestrator.mjs --self-test
```

## Security Contract

No new route or widened visibility exists. Every Custom Screen, content-type, content-
entry, presentation-override, media, and user-settings operation used for fixture
state remains on the existing internal `/admin/api/*` surface. Authentication is the
existing Admin session cookie only; no API-key mode, bearer token, cross-user body
scope, or public mutation is added. The only non-domain HTTP calls are the existing
login/CSRF/bootstrap-auth reads needed to create that same session.

RBAC remains exact to the owning domain contracts: Custom Screen/content-type/content-
entry/presentation-override reads require `content:read`, their mutations require
`content:write`, media reads require `media:read`, and media upload/delete require
`media:write`. User-settings GET/PATCH has no separate widened RBAC permission: it is
strictly self-scoped by the authenticated session, and the optional expected-user ID
may only reject an identity change. Local A/B provisioning uses the exact service
adapter contract below and creates canonical Admin-role memberships only for the
isolated task users; it is not an Admin API or permission bypass claim.

Every unsafe internal HTTP method used here—POST, PATCH, and DELETE—must carry the
shared CSRF token under the private exact configured `security.csrf.headerName`;
hardcoding a logger/header spelling is forbidden. The shared classifier labels internal
GET/HEAD as `admin_read` and internal POST/PATCH/DELETE as `admin_write`, but current
`checkRateLimit()` behavior deliberately returns without consuming either counter for
an authenticated Admin request. The smoke therefore makes no Admin read/write counter
consumption claim. Only its exact enumerated `/auth/*` calls consume the `auth` bucket
and join the frozen auth-rate capacity plan/window barrier. No limiter state or security
setting is skipped, reset, replaced, relabelled, or mutated by the smoke.

All fixed request envelopes and nested Screen section/block/tab/binding objects,
content-type/entry payloads, presentation overrides, user-settings `{value}` payloads,
and media metadata fields retain strict reject-unknown validation before persistence.
Known domain validation codes remain mapped at the existing route boundary; raw values,
DB errors, paths, secrets, and unknown submitted fields never become response/evidence
details. Nonce, HMAC/signature, and reCAPTCHA are not applicable because TASK-540 adds
no public write or anonymous mutation. Tests must prove these existing auth/RBAC/CSRF,
rate-limit, self-scope, and reject-unknown contracts rather than inventing an exception.

Smoke uses uniquely scoped synthetic Screen/content/media/user fixtures, records
their server IDs plus redacted session/setting/override/storage identifiers for
exact cleanup; session resources use only exact non-secret database IDs, never
cookies or session tokens/hashes. The A/B preference baselines are the sole local
fixture exception: strict domain normalization followed by exact
`setUserSetting`/`getUserSetting` service operations, never an Admin API claim or
direct DB seed; cleanup may delete only the two captured composite setting rows.
Storage preflight privately requires exactly one non-empty persisted
`storage.local.dir` row byte-equal to `getStorageSettingsInternal().localDir`, exactly
one persisted `storage.driver` row equal to `"local"` and byte-equal to the resolved
driver, and absent `MEDIA_DIR` plus `MEDIA_STORAGE`; no default/environment fallback
may satisfy it.
As the first fail-closed sub-proof of `set-001-storage-preflight`, before the first
task-User-Agent request, the executor freezes both access-log UUID and audit-log UUID
baselines for the four exact nonce User-Agents, the complete task-session row baseline,
the proof-only complete `site.contentRoutes` row/absence, and the storage DB/root
baseline. The same private sub-proof requires persisted `setup.completed` exact
boolean `true`; no task content-type slug in `site.contentRoutes`; and exactly one
active canonical bootstrap Admin. Without calling `getUserByEmail`, it requires
`emailHash === hashEmail(normalizeEmail(ADMIN_EMAIL))`, `email === emailHash`, a valid
encrypted email that decrypts to the normalized value, and exactly one membership in
the canonical `admin` role with normalized permissions `["*"]`. Missing/incomplete
setup, a first-run wizard, identity/role/email drift, or duplicate row is an
infrastructure failure before host-runner/browser startup. Raw PII, password/encrypted
email, rows, and timestamps remain private.

Every bootstrap UI/API login has a private complete-row read before the request and an
unconditional read in `finally`; a timestamp pair changed before a failed response is
still the newest smoke-owned CAS value. Terminal restoration locks the exact row,
compares every unchanged column/role tuple plus both timestamps (nullable values use
`IS NOT DISTINCT FROM`), restores only `lastLoginAt`/`updatedAt`, and proves the
complete row/roles byte-identical before and after commit. Concurrent drift yields zero
affected rows and fails closed. The proof-only restore record has no delete authority.

One append-only resource-ledger builder owns immutable acquisition cores and dependency
edges. A response-lost adapter retains only its pending private attempt and frozen
pre-write baseline; it neither queries nor appends a core during action execution.
Phase 3 alone processes each pending attempt as an independent bounded branch. It
returns every safe validated `acquisitionChannel:"failure-discovery"` delta plus a
per-key failure/block projection instead of throwing away sibling results; it appends
all safe deltas through the same builder, records every failure in the one private
aggregate, and blocks the ambiguous resource's intended parents and their transitive
destructive ancestors without inventing delete authority. It then compiles and
single-assignment-freezes the persistent cleanup plan before the first phase-3 delete,
so an ambiguous pending create cannot prevent cleanup of a known independent resource.
Only after phase 4 has disposed/proved both API contexts and transitioned the same
authoritative `RunState.apiContexts` to its deep-frozen closed state, and exact-UA
audit/access/session polling is stable, may the builder append terminal cores/edges,
compile and single-assignment-freeze the terminal cleanup plan, and deep-freeze the
final ledger plus disjoint union. That phase-5 freeze also creates exactly one final
cleanup plan/dependency graph containing the cross-stage user-to-session/audit/access
edges. Phases 6 and 7 consume that exact final graph by identity while retaining their
already frozen terminal and persistent action plans; a clone, recompilation, or stale
phase-3 graph is rejected. Each persistent, terminal, and final-union expansion
separately requires duplicate-free exact Cartesian equality between
`(resourceKey,operationKind)` pairs and its cleanup-subject keys crossed with the exact
operation-kind set `{provenance,delete,absence}`, plus cardinality `subjectCount * 3`;
bare-key set equality is insufficient and no fixed fixture count substitutes for these
gates. Each frozen persistent or terminal plan is passed by identity unchanged to every
later phase consumer; it is never rebuilt, widened, or re-derived after its gate.
Every final record owns exact provenance, identifier tuple/arity, dense ledger-only
`acquisitionOrdinal`, nullable separate `sourceActionOrdinal`, owner-correlation,
`dependsOn`, separate provenance/cleanup/absence adapters, success/failure cleanup
phase/policy, authorities, and exact operation/schema-ID nullability selected from the
exhaustive `RESOURCE_KIND_CONTRACTS` map. Successful creates register only after strict
provenance reads. At phase 3, a recorded response failure triggers bounded exact
natural-key/composite discovery against its retained frozen pre-write baseline, so a
committed-before-response-failure
user/type/entry/Screen/media/setting/override remains acquired; ambiguity never becomes
delete authority. `P.dependsOn` lists exact child `C` only when deleting parent `P`
could hide `C`; a failed child blocks that parent and every transitive destructive
ancestor, while independent branches and process shutdown retain all errors privately.
Override cleanup is one exact DB delete per
`(screen_id,entry_id,block_id,prop_path)`—never PATCH `{overrides:[]}` and never a
cascade.

The single `media-row-key` record is the only storage deleter: it invokes the real
media DELETE once, proves exact DB row/file absence, and may remove only upload-created
baseline-absent empty `yyyy/mm` directories with unchanged non-symlink `(dev,ino)`;
pre-existing/changed/non-empty directories remain untouched. All 13 screenshot paths
must be absent at preflight. Each created PNG freezes `(dev,ino)`; success retains and
validates it, while failure unlinks only the same acquired identity and proves
`ENOENT`.

Cleanup is state-aware and exact-once. After successful manifest action `end-007`,
`RunState` already proves the named browser session absent, so phase 1 emits no further
browser CLI command or receipt and only identity-safely removes the already-absent
session's private root. After an earlier failure, phase 1 executes only the still-missing
release/unroute, native route-list, close, and global-list operations, records their exact receipts once, then
transitions that same `RunState` to browser-session-absent. Phase 3 alone consumes each
retained response-lost pending attempt/baseline through independent non-throwing branch
results, appends all safe failure-discovery deltas, records every per-key failure/block,
freezes/gates the persistent plan, and passes that exact frozen plan unchanged to
phase-3 entity cleanup while the bootstrap API context is usable. Phase 4 disposes and
independently proves both isolated API contexts closed, updates/deep-freezes the same
`RunState`, and phase 5 requires both that state and the independent proof before any
terminal poll. Only after all task HTTP stops does phase 5 stable-poll exact-UA
audit/access/session deltas, append terminal cores, freeze/gate the terminal plan and
the single final cross-stage plan/graph. Phase 6 receives the exact terminal action plan
plus the exact final graph; phase 7 receives the exact persistent action plan plus that
same final graph. A failed terminal session/log/access child therefore blocks its exact
synthetic-user parent and every transitive destructive ancestor before proving the
start baselines restored. The proof-only `site.contentRoutes` row/absence remains byte-identical
immediately before each type deletion and after cleanup; drift blocks deletion and is
never overwritten.

Hermetic executor tests cover both phase-1 branches, a mixed phase-3 case with one
ambiguous pending create plus one independently cleanable acquired resource, rejection
of terminal polling while `RunState.apiContexts` is not closed, and terminal-child
failure blocking the exact user. They also reject a cloned, recomputed, substituted, or
stale final graph and any second browser receipt after successful `end-007`.

The repo-owned `_docs/_workflows/task-540-smoke-host.mjs` runner executes as the
leader of the executor-created detached process group. While the host is alive, its
cleanup revalidates PID/PPID/PGID/start identities, sends graceful TERM and then
conditional KILL only to surviving same-identity descendants, and proves descendant
plus listener absence. It never signals its own negative PGID, never claims its own PID
or PGID absent, and cannot perform the terminal group proof. The executor alone owns
bounded whole-negative-PGID TERM/KILL and then proves the host runner, complete process
group, every descendant, and ports 3000/5173/5174 absent. Child
environments are built from empty maps and explicit OS/host/browser key allowlists;
neither full `process.env` nor the parsed `.env` is forwarded. The executor invokes the
sole repo-owned host CLI with one exact validated null-prototype host environment; the
runner never reads/sources `.env`, a shell profile, or a package script, and directly
spawns exactly the backend, Admin Vite, and site Vite descriptors from the leaf
contract. The installed/global `coderso-dev-core-host` and every alternate helper are
forbidden. Browser authority uses a task-owned `0700` temp root outside the repo for
cwd/HOME/TMP/XDG, daemon, config,
and output; its `0600` secrets file contains exactly `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
its executor-created `cwd/.playwright` is the unique private workspace/session
registry, its config pins only supported 0.1.17 keys (Chromium plus `--no-sandbox`,
`codegen:"none"`, and private `outputDir`; unsupported `outputMode` is forbidden), and
its environment pins exact private
`PLAYWRIGHT_MCP_CONFIG`, `PLAYWRIGHT_MCP_OUTPUT_DIR`,
`PLAYWRIGHT_MCP_SECRETS_FILE`, `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, `CI=1`, and
`NO_UPDATE_NOTIFIER=1`. The repo `.env` is never the browser secrets file. The
installed skill's unavoidable full snapshot links are strictly parsed,
identity-ledgered beneath private output, and removed with all daemon/profile/config/
secret/temp artifacts after session absence on success and failure. Per-action repository snapshots enforce each exact
`repositoryMutationPolicy`: all non-screenshot actions permit no path change, each
screenshot permits its one path, and HEAD/index/`.git` or undeclared changes fail.
The canonical implement workflow accepts an arbitrary initially empty or non-empty
staged baseline only after read-only capture of exact index-file bytes and complete
`git ls-files --stage -z` projection; both must remain byte-identical. Agents never
stage, unstage, reset, stash, or commit.

Native CLI 0.1.17 stdout is parsed by closed byte grammars: open is exactly the Browser
PID header, Page `about:blank` section, Snapshot link, and one terminal LF with no
`### Ran Playwright code` section or blank line; secret fill is exactly one LF byte, tab-new includes
one snapshot while select/close do not, route-list is `No active routes\n`, screenshot
is one exact full-page link, close has its exact two trailing LFs, and the unique
private-workspace global list is exactly `  (no browsers)\n`. Snapshot mode cannot be
disabled. Run-code returns a value directly and is decoded exactly once from canonical
JSON plus one LF; returning `JSON.stringify(...)`, empty/unit output, or a second JSON
layer fails.

Before canonicalization, value-aware
validation scans runtime subjects, fixture/cleanup identifiers and probes, every
browser command (including non-credential run-code), operation descriptor, and output
for raw secret values without rejecting benign prose that only names a security concept.
Linked browser receipts retain bounded sanitized assertion output and actual CLI stdout/stderr
hashes; runtime receipts hash real command/Node/DB/storage observation bytes rather
than sanitized prose. Credential fills retain the manifest's literal symbolic `$...`
references and a discarded-output marker, but the executor never expands a secret
value into browser argv. It sets the controlled browser child's
`PLAYWRIGHT_MCP_SECRETS_FILE` only to the task-owned `0600` two-key private file;
credential-fill argv contains only the allowlisted literal names `ADMIN_EMAIL` or
`ADMIN_PASSWORD`, while synthetic email fills contain their exact non-secret fixture
strings. Login credentials are read privately from the existing repo env into memory
and serialized only into that private file, never sourced by the public browser command
recipe, printed, placed in `/proc/*/cmdline`, or persisted in smoke evidence.
All non-empty classified secret-like environment values (including short values via
boundary-aware matching) join the private corpus. Raw smoke failure results, full-gate
summaries, findings, and every other structured agent result are scanned before reuse.
Accepted schema-valid audit findings retain their fixed lens ID and complete ordered
finding set in one parseable, sensitivity-rechecked intervention diagnostic whenever any
finding belongs to the orchestrator; mixed leaf findings remain visible and no fixer runs
before that stop. Rejected dispatch/schema output and any unsafe intervention projection
are discarded behind a generic label-only error. A still-non-clean second round also
stops with the complete ordered sensitivity-rechecked finding set, including a leaf-only
residual. The complete created changelog is scanned before its canonical block is
byte-verified.
The local non-Git validation runner accepts only the exact repo process-control names
`PATH`, `BUN_OPTIONS`, and `NODE_ENV`, then centralizes their value check in the fixed
projection: identical `HOST_FIXED_ENV` values pass and any different value fails. Every
other repo process-control key is rejected. Ambient `CI` may be absent, `1`, or `true`;
all three project to fixed `CI=true`, while any other inherited value fails. Commands use
fixed `PATH=/usr/local/bin:/usr/bin:/bin` plus `BUN_OPTIONS=--no-env-file`; the sole
full-test exception remains exactly the three
pinned explicit `.env` source operations in the existing `test`, `test:bun`, and
`test:vitest` scripts. Hermetic workflow self-tests use synthetic repo/environment
authority and never parse the real `.env`. Bun, Node, Git, and repo-local TypeScript
targets are absolute identity/hash-pinned and revalidated before launch; observational
Git—including validation `git diff --check` children—has its own minimal no-secret
environment and fixed external-diff/textconv-disabled argv. All executable identities
are revalidated before launch; the sole user-owned TypeScript target also rechecks its
SHA-256 at each boundary. Stable no-follow reads bind
bytes plus `dev/ino/mode/nlink/size/mtime/ctime` for the initial `.env` parse, index,
worktree, untracked set, every prompt-carried TASK-540 status file (including Git-clean
files), and all root `.env*` projection at every command,
agent, smoke, and terminal workflow boundary; `.env*` means every root name beginning
`.env`, with a 64-entry bound. The smoke executor is dynamically loaded
once only after exact canonical-file identity and SHA-256
`255f0eaa6f1ce5b20cb18ec3c040e2461c2192d13e2e7a9bc8870075bdafb74b` pass; the same
authority must match after import, after full validation, and immediately before the
one-shot call.
Before any closure status mutation, the evidence owner writes and byte-verifies one
strict canonical control anchor in the existing changelog index plus changelog 1252's
redacted smoke block. The anchor binds its evidence SHA-256, generation, board baseline,
the fixed safe changelog path above, and the SHA-256 of the closure-leaf gate value. It
remains independent authority if the changelog file is missing and may carry one exact
old-gate -> Repair Pending -> successor-gate authorization during closure-leaf repair.
The three active closure contracts then persist identical
Closure Pending, Closure Board Baseline, and Closure Changelog Path receipts. A restart
must compare their status-owner state against that independent control rather than
recapturing it. Sibling status authority is phase-derived, not inferred from current
repair prose. While changelog 1252 and its exact sealed 17-ID Tasks line are absent,
the pre-1252 authority requires all 17 physical contracts to remain In Progress; each
landed implementation leaf has exactly one matching targeted/revalidation gate receipt
and no `Completed` field. The evidence owner must create and byte-verify changelog 1252
and that exact Tasks line before one status transaction prepares ten leaves, then six
children, then root and atomically publishes all 17 Done/Completed transitions with the
board delta against the same evidence hash. After that atomic transition, the
post-1252 authority is the sealed changelog/control evidence and all 17 covered
contracts are Done/Completed. A restart first determines which of those two phases the
sealed evidence proves and validates only that phase's graph. A later mechanical or
final-validation failure reopens root/closure, and reopens a source-owner leaf/child
only when a classified finding names that exact owner; unaffected post-1252 siblings
remain Done under the same 1252 coverage, while unaffected pre-1252 siblings remain
gated In Progress.

```text
Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01
```

Every shared board/index mutation preserves an orchestrator-captured projection of all
unrelated rows and bytes after both success and dispatch failure. Only TASK-540's board
row/statistics, the exact 1252 row/reservation prose, and the exact TASK-540 control
anchor are mutable.
