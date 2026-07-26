# TASK-547-07: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Workflow / Audit / Collision Safety
**Estimated Effort:** Medium
**Dependencies:** None; runs throughout TASK-547
**Status:** 🚧 In Progress
**Validation:** Workflow scripts remain implemented; current-tree audit evidence,
post-audits and final screenshot hashes are pending regeneration.

---

## Overview

Own the reproducible TASK-547 multi-agent orchestration, five-round contract
drift audit, sequential implementation dispatch, exact final validation,
three-session runtime-smoke verification, post-closure lenses and final drift
evidence. This child changes workflow/evidence files only and never edits
package, installer, generator, CLI, product UI/source or product test contracts.

**Single-writer ownership:** `_docs/_workflows/task-547-*.mjs`, private
`_docs/_workflows/lib/task-547-*.mjs` modules and distinct
`_docs/_workflows/_smoke/task-547/audit-evidence/*`. TASK-547-06 exclusively
writes screenshots and the scenario manifest; this child only verifies their
hashes read-only and writes separate audit evidence.

The three workflow entrypoints are exactly `task-547-author-audit.mjs`,
`task-547-implement.mjs` and `task-547-fix.mjs`. Cohesive reference-manifest,
ownership, operational-access, safe-file, repository-guard, bounded-audit,
sealed audit-packet, preimplementation-evidence, phase-scope,
private-result-transport, final-validation, full-PNG, typed public
smoke, Form Design smoke and Page Editor smoke helpers live under
`lib/task-547-*.mjs`. Each entrypoint and ownership helper derives the
repository root from its own module location; only the operator-owned temporary
host names the active worktree in its trusted import and launches the pinned
Claude executable.

## Reference Provenance

The trusted local orchestrator's only main-repository access for contract
audits is read-only access to these exact files under
`/home/coder/project/Coderso/_docs/projekty-domow-wow-site/`:
`README.md`, `index.html`, `oferta.html`, `projekty.html`, `proces.html`,
`cennik.html`, `o-nas.html`, `kontakt.html`, `projekt-aurora.html`,
`assets/app.js`, `assets/styles.css`, and `assets/favicon.svg`.

Their individual SHA-256 values are pinned in
`lib/task-547-reference-manifest.mjs`. Hashing the ordered `sha256sum` output
yields `d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`.
The orchestrator verifies all twelve direct regular files before and after every
agent dispatch and fails closed on absence, redirection or byte drift. It copies
their verified bytes into line-numbered virtual `reference/*` records inside a
bounded sealed packet. Before prompt assembly, the trusted source renderer
performs only line-preserving exact-value substitution for the DB source
command, active worktree root, main-repository root and forbidden TASK-540
root. Repository, pinned-reference and path-scoped diff bodies never receive
the generic absolute-path sanitizer. Arbitrary regex escapes, URL pathname
literals, template-relative suffixes and synthetic absolute-path fixtures
therefore remain byte-identical unless they contain one of those exact known
values; every known value still fails closed if it survives rendering.
Manifest records retain the verified raw byte count/SHA-256 and separately pin
rendered SHA-256 plus exact-value substitution counts. The child runs from a
private temporary directory and receives only this source-aware rendered view,
never a real worktree/reference root. Persisted evidence contains only the
logical label `projekty-domow-wow-site`, aggregate digest and host-owned packet
digest, never the absolute path or raw reference contents.

Implementation, fixer and smoke agents receive one additional operational rule
which auditors never receive: only for a DB-backed test or dev-server command,
they may execute exactly
`set -a && source /home/coder/project/Coderso/.env && set +a`. They must never
inspect/read the file directly, copy it, print/log its contents, hash it, persist
it, store it as evidence or pass its values outside the authorized DB/dev
process. `.env` is neither reference evidence nor a worktree input, and its path
or contents never join audit digests.

## Collision Guards

- Forbidden product paths: every file owned by TASK-547-01..06.
- Contract-audit dispatches forbid all other `/home/coder/project/Coderso` paths.
  Implementation/fix/smoke dispatches forbid them too except for the exact
  source-only `.env` operation above. Every dispatch forbids all
  `/home/coder/project/Coderso-task540*` paths; the active worktree root is
  derived from the workflow module location.
- The orchestrator does not scan the main repository or probe any TASK-540
  worktree. It reads only the twelve pinned reference files above. TASK-540 is
  enforced lexically in prompts/owned-path declarations and by the explicit
  exact known-root prompt scanner plus Claude's empty tool registry; the
  workflow makes no filesystem-observation claim about that forbidden sibling.
- Every reference, smoke-artifact and deterministic-evidence read/hash uses
  `lib/task-547-safe-files.mjs`: reject secret-like lexical names before any
  filesystem access; `lstat` every path component; reject final and parent
  symlinks/non-regular files; require canonical-root containment; open with
  `O_NOFOLLOW`; compare pre-open/opened/named identities; read through the file
  handle and reject mid-read drift. Reference and smoke validators return the
  bytes/hashes they verified, so later persistence never reopens a path.
  Its absence helper bounds the candidate lexically, validates the direct root
  and every existing parent twice, accepts only `ENOENT` for a missing
  parent/target, and rejects every surviving target type.
  `lib/task-547-git-guard.mjs` applies the same direct-descriptor,
  no-follow/identity checks to repository state while deliberately recording
  only metadata plus index identity for secret-like repository names.
- Deterministic evidence writes validate every parent as a direct in-root
  directory, use an exclusive `O_NOFOLLOW` task-owned temporary regular file,
  flush/close it and atomically rename it over only the exact evidence target.
  A pre-existing target symlink is rejected rather than followed.
- Changelog ownership is the single exact file
  `_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md`;
  broad `1260-*` matching is forbidden, and only TASK-547-06 edits
  task/changelog closeout.
- Each implementer receives an explicit owned-file list and reads current on-disk
  shared seams before editing.
- Every author, implementation, audit and fixer dispatch runs through the shared
  mandatory-after guard. It captures state before invocation and always captures
  and compares state after invocation, including when the host call, agent,
  structured-output schema or result validator throws. If invocation and guard
  both fail, both errors remain available in one aggregate error.
- The repository guard pins HEAD object and symbolic ref, the raw index plus
  stage and flag views, and the type, mode and content identity of every tracked,
  non-ignored untracked and explicitly scoped TASK-547 ignored path. It rejects
  staging, commits, ref switches, file/symlink/type swaps, executable-bit drift
  and byte drift outside the exact owned mutation. Returned `changedPaths` are
  unique strict repository-relative paths and must equal the observed delta;
  read-only calls return an empty array. Directory ownership, the exact
  changelog-1260 declaration and required-output checks remain enforced after
  that exact-delta comparison.
- The frozen `LEAF_LAND_ORDER` is exactly `547-01-L01`, `547-01-L02`,
  `547-02-L01`, `547-02-L02`, `547-02-L03`, `547-03-L01`, `547-03-L02`,
  `547-03-L03`, `547-04-L01`, `547-04-L02`, `547-04-L03`, `547-05-L01`,
  `547-06-L01`; this 13-leaf completion order remains unchanged.
  `IMPLEMENTATION_PHASE_ORDER` inserts the count-neutral
  `547-02-L03-preland` phase between corrective completion of `547-02-L01` and
  `547-02-L02`; final `547-02-L03` remains immediately after `547-02-L02`.
  The preland phase is not a leaf, path owner or terminal status. Its writable
  subset is exactly
  `core/services/kits/fullSiteInstall/compensation.ts` and
  `tests/unit/kits/fullSiteInstallService.test.ts`, both already owned by
  `547-02-L03`; all other L03 paths are forbidden during preland, and final L03
  may edit those two files again. It creates no production, test or task path,
  no mutable registration and no dummy/no-op bridge.
  `LEAVES` derives from the completion sequence, and the executable-leaf
  portion of `SINGLE_WRITER_PATH_MAP` contains the current source/test/closure
  paths declared by those 13 leaf contracts. The settings paths
  `core/services/settings/settingsService.ts`,
  `core/services/settings/siteLocale.ts` and
  `tests/unit/settings/settingsService.test.ts` belong to `547-02-L02`, making
  that leaf 42 declarations and `547-04-L03` 18 declarations without changing
  the 229-leaf/250-total counts. TASK-547-03-L03 explicitly owns
  `tests/integration/routes/formSupportingTextRoutes.test.ts`; TASK-547-06-L01
  explicitly owns the directory `_docs/_workflows/_smoke/task-547/.tmp`.
  The complete collision audit covers 229 executable-leaf declarations plus
  the 21-path TASK-547-07 process bucket, exactly 250 declarations, and checks
  every pair including directory/child
  overlap. Workflow scripts and self-tests derive that total from the canonical
  map and pin the current expected count so missing or extra declarations fail.
  `SINGLE_WRITER_SYMBOL_MAP` separately pins
  `scripts/projekty-domow/content/buildFormaDomContentResources.ts::buildFormaDomContentResources`
  to TASK-547-03-L03 and
  `scripts/projekty-domow/pages/index.ts::buildFormaDomPages` plus
  `scripts/projekty-domow/pages/shared.ts::*` to TASK-547-04-L01. Every other leaf
  receives these paths as forbidden/read-only. The symbol map documents seams;
  it never replaces or transfers path ownership.
  `core/services/pages/pageRuntimeBindingContract.ts` and
  `tests/vitest/pages/page-data-block-presentation.test.tsx` are likewise owned
  by TASK-547-04-L01; TASK-547-04-L03 consumes the binding contract read-only.
- The dispatcher captures the root-TypeScript baseline before sequential
  implementation. Immediately after `547-02-L03-preland` and before
  `547-02-L02`, it runs exactly
  `./node_modules/.bin/tsc -p tsconfig.json --noEmit` from the repository root.
  Diagnostics in preland or already-landed paths block, as do new unowned,
  unlocated or ambiguous diagnostics. Only strictly future-path diagnostics and
  exact baseline-equivalent unowned diagnostics may remain. A permitted nonzero
  result reports both ignored counts and never describes the global run as
  clean; negative self-tests cover each blocking class and both preland paths.
- The preland compatibility seam and L02 settings application must reconcile
  all setting rows as one generic atomic compatibility batch. Per-setting
  fallback is forbidden because automatic compensation runs before final L03.
  A mutable registration/no-op adapter is not an alternative. Any L02/L03 task
  contract that still specifies incompatible per-item versus atomic-batch
  semantics is a blocking cross-task audit finding, so implementation must not
  start until the contracts converge.
- The final touched-file line gate pins the full TASK-547 family base commit
  `ca78c77b7626b8d61ab9ce2706001e17a3f8e7f8` and verifies that it resolves to
  that exact commit and remains an ancestor of `HEAD`. Its production/test path
  union includes every per-commit delta in `base..HEAD`, the current tracked
  delta against `HEAD` and current non-ignored untracked files. A path changed
  and later reverted therefore remains in scope. Every touched path must have
  TASK-547 ownership before it is read; a deleted touched path still requires
  ownership and is recorded as deleted, while each present touched file must
  contain at most 1,000 physical lines.
- Missing agent output is a failed audit round, never a clean pass.
- Before an official contract run, the orchestrator reads the evidence
  directory and rejects any unexpected entry without deleting anything. It
  then removes only the expected subset of the exact 116 deterministic
  preimplementation files and proves the directory completely empty.
  Preflight builds and scans all 21 per-file prompts plus reconcile before any
  spawn. Packets use exact task/doc/reference allowlists, complete ordered owner
  declarations (`state:"absent"` for future files), line-numbered UTF-8 text,
  digest/byte-only binary records, path-scoped diff, 8 MiB input and 12 MiB
  rendered limits. Owner records have an exact state-dependent key set:
  text records require positive line counts, exact ordered non-overlapping
  ranges and a matching redaction map/total; binary records carry only their
  bounded byte/hash contract; absent files and declared directories carry no
  invented body. Pattern matches are typed, sorted and unique. Mutation tests
  reject missing/extra keys, invalid counts/ranges/redactions, unsorted or
  duplicated matches and state swaps. Official preimplementation packets pin
  the route suite and `.tmp` directory above as explicit `state:"absent"`
  records. The reusable packet self-test remains valid after route-suite land:
  that exact declaration may be absent or a schema-valid present text record,
  never binary, directory or malformed. `.tmp` remains absent at every packet
  validation checkpoint.
  The complete official 21+reconcile preflight additionally caps every rendered
  packet at 1.5 MiB.
  Owned source/tests and task contracts are never truncated; very large required
  handbook files use pinned original-line ranges plus the full-file byte count
  and digest. Both each file-section header and the sealed manifest pin
  `includedBytes` and `includedRanges`; omitted lines cannot be cited.
  `_docs/PAGE_MODEL.md` uses merged ranges `[1,1631]` and `[2180,2638]`, so the
  required `976-1506` contract is fully present.
  Every later packet must match its run-start digest. Findings may cite only a
  packet text path and an existing line. Run-start HEAD/index/reference and all
  non-evidence bytes remain identical through final reconcile.
- The pinned task graph contains exactly 21 nodes and 20 parent edges. Every
  audit target has an exact owner union and exact required-doc set; self-tests
  mutate every edge, owner declaration, required-doc membership, absent state
  and binary state to prove fail-closed rejection. Leaf and TASK-547-07 packets
  contain complete source/test owner bodies; very large owner handbooks use the
  same pinned required-doc ranges recorded in their coverage digest.
  Parent/root prompts are deliberately limited to hierarchy, decomposition,
  documentation, cross-contract state and digest review and explicitly do not
  claim aggregate owner bodies. A global 14-target body-coverage matrix proves
  descendant leaf packets cover those bodies before any spawn. Closure
  filtering excludes only `_docs/_TASKS/*`; the exact changelog file named
  above remains visible in the TASK-547-06-L01 audit packet.
- Preflight persists one canonical ordered packet matrix: each per-target
  packet digest/byte pair, the reconcile digest/byte pair and all 14 leaf-body
  coverage proofs. Every round record must match the exact digest mapped to its
  target. One run identity binds repository state, host source, Node runtime,
  Claude launcher, complete workflow-source digest and packet matrix.
  Mutations of ordering, target/digest pairing, reconcile digest, enforcement
  identity, workflow source or matrix digest are rejected.
- Every dispatch passes an explicit `read-only` or `workspace-write` intent;
  the host rejects a missing/unknown intent instead of inferring authority from
  a label. Audits, verification and start gates are read-only. Owned mutations
  and command-executing zero-delta regates are workspace-write; the full
  command-validation
  lane is explicitly workspace-write because build/test tools may need their
  own temporary or ignored artifacts, while its owned repository delta remains
  empty and guarded. The repository-owned, self-tested
  `task-547-result-transport.mjs` creates a fresh mode-`0700` private per-call
  CWD. After validating the in-memory Claude wrapper, the host writes only its
  schema-valid `structured_output` as a mode-`0600` direct result; transport
  rejects redirected, symlinked, multiply-linked or oversized results, opens
  with `O_NOFOLLOW`, verifies stable identity, bounds/redacts JSON and always
  removes the per-call directory. Untrusted result/finding and generic audit
  text use the shared universal sanitizer for ten absolute-path syntaxes:
  ordinary multi-segment POSIX, `file:` URI, network-style `//host`, UNC,
  rooted Windows and drive-absolute/drive-relative Windows forms. Each syntax
  is covered both bare and after all 27 accepted non-path punctuation
  delimiters. A source-semantic start boundary preserves the preceding
  punctuation but excludes preceding Unicode word/path characters; network,
  UNC, rooted, drive-relative and ordinary POSIX forms require genuine
  multi-segment separators, while POSIX first segments accept only path-safe
  starters. The exact five-string untrusted non-path corpus covers a compact
  comment, selected regex literal/escape syntax, a relative backslash path and
  a drive-like source expression; those samples plus repository-relative
  anchors, `./local` and TASK-547 token-relative slashes remain byte-identical
  in these untrusted lanes.
  Sealed repository/reference/diff bodies instead use only the trusted exact
  source renderer described above. Its self-tests preserve the complete
  13-string trusted source corpus, and the local owner-manifest test checks
  every present text owner entry has zero generic `absolutePath` substitutions
  and no generic absolute-path token. The exact DB command and known
  worktree/main/forbidden roots remain fail-closed.
  Result evidence replaces multi-segment absolute paths rooted below `/usr`,
  `/opt` and `/workspace` with the fixed token and has no context-free
  DB-command exception. The separate
  final-validation domain owns and validates its exact DB `argv`; no
  environment value can enter either evidence lane. Invalid UTF-8 failure bytes
  become one fixed token rather than replacement-character text. A separate
  mode-`0700` private run-level directory receives exclusive mode-`0600`
  sanitized diagnostic copies. The host-facing schema parser implements a
  positive recursive grammar, bounded to depth 16: `object` accepts only
  `type`, boolean `additionalProperties`, unique in-properties `required` and
  recursively validated `properties`; `array` accepts only `type` and required
  recursive `items`; `string`/`integer`/`boolean` accept only `type` and an
  optional nonempty, unique, correctly typed `enum`. Unsafe property names,
  unknown keywords, `$ref`, combinators and malformed recursive nodes fail
  before spawn. String/array bounds, patterns, uniqueness, exact lengths, ISO
  ranges and nonnegative counters remain mandatory in repository-owned
  post-read validators; the deliberately smaller transport grammar cannot
  silently weaken or replace those runtime checks.
  A failed child or wrapper outcome writes a bounded mode-`0600` diagnostic
  containing only a sanitized label, exit code, safe close-signal/spawn
  category, stdout/stderr byte counts, explicit bounded
  `timedOut`/`streamLimitExceeded` booleans, one strictly allowlisted
  event-violation value and one fixed failure
  category/summary. Bounded
  stdout/stderr tails exist only in host memory for fixed-category
  classification; raw streams, excerpts, secrets, absolute paths and user data
  are never persisted. The host error names that safe diagnostic file and its
  byte count, and the per-call directory is still removed in `finally`. A
  successful finding-free run removes the run-level directory automatically.
  A successful run that
  encountered any structured HIGH/MEDIUM/LOW finding retains it for review
  (including remediated earlier-round H/M and residual LOW), while failure
  retains it for the current remediation review; the operator removes it
  immediately after review or before the corrected fresh rerun.
- Contract auditors are tool-call-free because the pinned Claude CLI receives
  exactly one `--tools` followed by the literal empty string. The host spawns
  exact `/usr/bin/claude` with array argv and `shell:false` from the private
  per-call CWD:
  `-p --tools "" --permission-mode plan --effort xhigh --model
  claude-opus-4-8 --no-session-persistence --disable-slash-commands --safe-mode
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' --prompt-suggestions false
  --output-format json --json-schema <schema> --no-chrome`.
  An exact-argv assertion rejects every extra/reordered switch and explicitly
  denies allowed-tools, brief, agent(s), plugin/file/add-dir, IDE, remote,
  background, resume/continue/fork, worktree, fallback-model and
  dangerous/bypass modes. There is no fallback launcher or model. The child
  environment contains only current `HOME`, fixed `PATH=/usr/bin:/bin`,
  `LANG`, `LC_ALL` and `NO_COLOR`; it never spreads the host environment and
  cannot inherit `CLAUDE_*`, `ANTHROPIC_*`, proxy or XDG variables.
- Before dispatch the host verifies its direct single-link source, the direct
  Node runtime and the pinned `/usr/bin/claude` symlink/target identities and
  hashes. The Claude target must be the expected direct regular two-link file;
  version `2.1.220` and SHA-256
  `159e4a51d796f3bf14677577100f7efb845611b1ceaf0c30cbd8d4650d942185`,
  its bytes and hash join the frozen exact-key host identity. The launcher
  plus host-source/runtime identities are rechecked immediately before and
  after each call. This forward repin replaces the unavailable `2.1.218`
  launcher only after a current live no-tool canary proved the exact
  `2.1.220` wrapper and empty tool registry.
- Before any workflow dynamic import, the host hashes the exact 19 owned
  workflow `.mjs` sources and freezes `{fileCount,digest}` on
  `auditHostWorkflowIdentity`. It rehashes them after helper/author import and
  around each call; the author requires that host record, recomputes the same
  ordered aggregate and binds it into the audit run identity. This proves
  stable direct on-disk source bytes across those checks under the pinned,
  trusted Node runtime/module-loader boundary. It is not a cryptographic
  attestation of the private byte stream Node actually evaluated: a malicious
  source swap and restoration entirely inside a loader window is outside the
  claim.
- Success requires exit `0`, null signal, no timeout, spawn/stdin/stream error,
  a local stdin writable `finish`, empty stderr and no surviving member of the
  original detached process group. `finish` proves transport completion only,
  not that the child consumed or understood the prompt. For semantic
  acknowledgement the host appends a fresh random 32-byte hex nonce as the
  final stdin bytes, adds only a required string `task547_host_ack` field to the
  child schema without placing the nonce in argv, requires the exact returned
  value, removes the reserved field and revalidates the original domain object.
- Stdout framing is exactly canonical `JSON.stringify` bytes with either no
  terminator or one final LF. BOM, leading/trailing space, tab or CR, a second
  LF and concatenated/second JSON are rejected. The root must contain every
  required key `type`, `subtype`, `duration_ms`, `duration_api_ms`, `is_error`,
  `api_error_status`, `num_turns`, `result`, `stop_reason`, `total_cost_usd`,
  `usage`, `modelUsage`, `permission_denials`, `structured_output`,
  `terminal_reason`, `uuid` and `session_id`; only the pinned optional timing,
  telemetry/status keys `ttft_ms`, `ttft_stream_ms`, `time_to_request_ms`,
  `user_message_uuid`, `request_sent_wall_ms`,
  `time_to_request_from_spawn_ms`, `warm_spare_claimed`, `time_origin_ms`,
  `fast_mode_state`, `fast_mode_disabled_reason` and `origin` may additionally
  appear. Unknown keys and any `deferred_tool_use` fail. Terminal success is
  exactly `type:"result"`,
  `subtype:"success"`, `is_error:false`, `api_error_status:null`,
  `terminal_reason:"completed"` and `num_turns:2`, with nonnegative finite
  timing/cost counters, empty `permission_denials`, schema-valid acknowledged
  `structured_output` and exactly two `modelUsage` keys: one primary key from
  `claude-opus-4-8` or `claude-opus-4-8[1m]`, plus the exact auxiliary key
  `claude-haiku-4-5-20251001`; no other model identity is accepted.
  `usage` and every reported model value are plain objects; `uuid` and
  `session_id` are strings. When present, `user_message_uuid`,
  `fast_mode_state`, `fast_mode_disabled_reason` and `origin` are strings,
  `warm_spare_claimed` is boolean, and `request_sent_wall_ms` plus
  `time_origin_ms` are finite nonnegative numbers. The duplicate human
  `result` field is ignored after its required string shape is checked.
- Children run in detached process groups. Timeout, stream/stdin failure,
  sibling cancellation and SIGINT/SIGTERM use group `TERM`, bounded grace,
  group `KILL` and bounded drain. The assertion covers only processes that
  remain members of the original group identified by the spawned leader PID;
  a descendant that successfully calls `setsid()`/changes process group, or
  escapes into another supervision domain, is outside this non-cgroup
  boundary. Evidence therefore says “original process-group member”, never
  “every descendant”. The production timeout remains 45 minutes.
- A batch abort is latched in async-local batch state. Registration, every
  post-await host checkpoint and the supervisor's immediate pre-spawn callback
  reject a shutdown or sibling-aborted batch; a delayed sibling cannot launch
  after another sibling fails.
- Persistent SIGINT/SIGTERM listeners latch shutdown before further call
  registration. The barrier first awaits an initialization promise resolved on
  attestation failure or in the setup `finally`, so a signal during dynamic
  import/resource setup cannot race later supervisor/result-root creation. It
  then terminates active original groups,
  awaits every call finalizer, proves zero active calls/call roots/supervisor
  records, removes the private run root, and only then assigns natural exit
  code 130 or 143 without `process.exit()`. Repeated signals cannot bypass the
  in-flight barrier.
- `--self-test-host` is entirely synthetic and never invokes Claude: it proves
  exact argv/env and wrapper framing/root/status, wrong/missing prompt-tail
  acknowledgement (including a child that emits without reading stdin), invalid
  UTF-8, permission/model/structured-output failures, stdin `EPIPE`, original
  process-group timeout and the pre-spawn sibling-abort latch. It also launches
  real host subprocesses for pre-spawn SIGINT, active-child SIGTERM, post-close
  SIGINT and repeated SIGTERM, requiring complete barrier cleanup and
  130/143 exit status. The only live probe mode is
  `--probe-hostile-no-tools`; it deliberately asks for Bash/Read/Web/MCP/agent/
  plugin/IDE access and passes only when the empty registry exposes none. It
  never writes official round evidence and is not run during workflow
  remediation. Unknown, extra, combined or misspelled host-mode arguments fail
  before initialization and cannot fall through to the official audit. An
  attestation/setup failure is retained as a barrier error, resolves the
  initialization barrier, cleans any partial private result root, and exits
  fail-closed, so a concurrent shutdown cannot wait on an unreachable state.
- These guards prove repository mutations and the twelve pinned reference
  identities. They do not claim filesystem observation of TASK-540, arbitrary
  ignored paths outside the scoped TASK-547 trees or every external read;
  tokenized prompt policy and the empty Claude tool registry remain the controls
  for those residuals. Evidence must state that boundary rather than report
  broader enforcement.

## Audit Evidence Contract

TASK-547-07's local orchestrator process is the sole evidence writer. Child
JSON stdout is bounded and accepted only as the strict one-turn Claude wrapper;
it is never evidence or persisted. The trusted host validates the nested
`structured_output`, writes only that object to a direct regular file in a
private per-call directory, binds the consumed result to the canonical
target-specific packet/run identity, optionally retains a private sanitized
diagnostic copy for the current review, and agents cannot write
`_docs/_workflows/_smoke/task-547/audit-evidence/`.

Evidence filenames are deterministic and collision-free:

- `round-01` through `round-05`: `round-NN-per-file-<task-file-slug>.json`,
  `round-NN-reconcile.json` and `round-NN-fixes.json`;
- final contract pass: `final-reconcile.json`;
- implementation drift: `preclosure-drift.json` and `final-drift.json`;
- each complete ordered final-command pass:
  `final-validation-<phase-slug>.json`;
- five post-closure lenses:
  `post-closure-<lens-slug>-round-<n>.json`;
- final task-graph/closeout pass: `final-consistency.json`;
- all three screenshot/manifest verification sets:
  `smoke-manifest-hashes.json`.

`<task-file-slug>` and `<lens-slug>` are lowercase ASCII slugs from the frozen
input lists, not agent-provided filenames. The orchestrator schema-validates,
redacts secrets/absolute forbidden-root paths/submission data, canonicalizes key
order, and atomically writes each file. Re-running the same phase replaces only
its exact deterministic file; filenames use no timestamps or random suffixes,
and no raw agent output is written. An official start rejects an unexpected
baseline entry before removal, then removes only these 116 exact
preimplementation names and requires a wholly empty directory. An interrupted
run can leave only its fresh partial set, which the complete-set validator
rejects. Required final-command start/end timestamps remain structured JSON
fields.

Post-closure audits use five independent lenses after terminal task/changelog
closure and a complete final-manifest rerun: exact pinned-reference
fidelity; strict model/native/fail-closed behavior; ledger/saga/rollback and
cross-stream safety; present-only/byte identity/determinism; and test integrity/
visible runtime/security/cleanup. Reference-sensitive lenses compare public copy,
facts, prices, contact data, project taxonomy/order, form strings, SEO, design
tokens and declared residual IDs directly with the pinned source. Every lens
reports all HIGH/MEDIUM/LOW findings. Any finding reopens the scoped fixer,
complete final manifest, three-session smoke when invalidated and terminal
closeout, then restarts all five lenses from lens one. Zero LOW is required;
TASK-9999 deferral is not used by this workflow.

Every finding is bounded and sanitized before it can be forwarded to a fixer.
It must carry one or more repository-relative `file:line` anchors and may not
contain traversal, absolute paths, secret-like filenames, raw logs, credentials,
submission/user data or control characters. Summary/area/finding/evidence/
recommendation byte limits are schema- and runtime-enforced. The host supplies
each auditor with exact HEAD OID/ref plus dirty tracked/untracked/scoped-ignored
counts, digests and bounded redacted paths; auditors do not inspect `.git`.
Because the sealed contract-audit host has no mutation/tool lane, any
per-file/reconcile finding is persisted in the fresh partial evidence set and
fails fast. The orchestrator or collaboration agent performs the scoped fix
outside that host; the complete five rounds then restart from a newly emptied
116-name baseline. Clean rounds alone write a zero-fixer record.

The public smoke validator requires the exact TASK-547-06 root
`{reference,preflight,scenarios,consoleErrors,pageErrors,screenshots,failures,pass}`,
exact reference digest, port/restart/admin/front preflight and eight ordered
scenario objects. Typed semantic expectations own every assertion value,
including the ordered contact
`contact-reference-native-presentation` proof: exactly four nonblank Polish
stage options, first/default `Mam działkę`, no blank prompt, five textarea rows,
and visible pending label `Wysyłanie...`. The ordered `aurora-detail` contract
also pins `aurora-six-slug-eligibility` (Aurora 200 with exact metadata/body and
canonical resolved as `new URL("/projekty/aurora",
"http://127.0.0.1:3000").href`, plus five exact 404 objects with
`status:404`, `resolverOutcome:"detail_not_found_before_metadata"` and empty
`resolvedDetailDocumentKeys`, `renderedProjectDetailRootSelectors`,
`renderedProjectDetailBlockIds`, `installedProjectTitleMatches`,
`installedProjectDetailCorpusMatches`, `dynamicDetailSeoTitleMatches`,
`dynamicDetailSeoDescriptionMatches` and `canonicalHrefs`). Those closed scans
cover the complete renderer root registry, all seven project-detail block IDs,
all six installed titles, the full TASK-547-03-L01 project corpus,
TASK-547-03-L02 static detail/CTA corpus and every installed dynamic detail SEO
pair; neutral generic 404 copy remains allowed. The same assertion pins material
primary/secondary hero IDs with `8/12/12` and `4/12/12` spans, `xl` minimum
height, resolved theme backgrounds and nonzero rectangles, and exact CTA
`{label:"Chcę podobny dom",href:"/kontakt",
previousBlock:"project-statistics",nextBlock:"project-assumptions"}`. The
ordered `contact-form` contract pins the exact installed internal mount for a
coherent session with `forms:write`, valid CSRF, `admin_write` and accepted
outcome; an API key with `forms.submit`, non-applicable cookie CSRF,
`admin_write` and accepted outcome; and anonymous 401 with
`createdSubmissionIds:[]`. Separate strict manifests cover five
`wf547formdesign` flows and the current five `wf547pageeditor` flows from
TASK-547-04-L01. Before each run the orchestrator captures predecessor
identity/hash, removes only the exact 21 smoke result/PNG files plus the owned
`_docs/_workflows/_smoke/task-547/.tmp` directory, proves all 22 declarations
absent, then accepts only newly created artifacts whose identity and hash
differ from any predecessor. Every PNG is fully decoded with
signature/chunk order/length/CRC/IHDR/IDAT/IEND/scanline validation; all 18
screenshots are byte-distinct and their manifest hashes/dimensions match bytes.
The host calls the exact direct absence helper immediately after cleanup and
again after the three-session dispatch has completed its guaranteed `finally`,
before artifact validation or evidence persistence.

## Security Contract

No endpoint or permission changes. Audit prompts are sealed, read-only and
tool-call-free, never receive the `.env` operational rule or absolute
worktree/reference paths, and must exclude
secrets, credentials, private keys, raw sensitive logs, submission payloads and
unredacted user data. Implementation/fix/smoke prompts may source `.env` only
through the exact command above and must never expose or persist its contents.
Structured findings contain bounded repository-relative file/line evidence only.
Final command records contain exact pinned `argv`, ISO start/end, zero exit,
`pass:true` and redacted stdout/stderr byte counts, never raw diagnostics.
Public/Form Design/Page Editor smoke evidence contains only normalized URLs,
material live observations, hashes/dimensions and empty error arrays; live Page,
Form and submission IDs are redacted. Each of the three smoke submission
sets pre-registers every submission marker and immediately attaches every
returned ID in one outer cleanup ledger. One fresh temporary evidence directory
per session is atomically registered in the same ledger. Every entry is deleted
independently and idempotently in `finally`, and zero-row/zero-directory
receipts are verified before evidence is written.

## Implementation Pseudocode

```ts
rejectUnexpectedEvidenceBaselineBeforeDeletion();
clearOnlyExpected116PreimplementationEvidencePaths();
assertEvidenceDirectoryCompletelyEmpty();
const packetMatrix = await preflightAndScanAll21PromptsPlusReconcile();
const runStart = bindRepositoryHostRuntimeLauncherWorkflowAndPacketMatrix();
for (let round = 1; round <= 5; round += 1) {
  const perFile = await runParallelSealedNoToolAuditsWithMandatoryAfterGuard(
    TASK_547_TASK_FILES, runStart,
  );
  assertEveryAuditReturned(perFile);
  const reconcile = await runSealedNoToolReconcileWithMandatoryAfterGuard({
    pathOwnership: SINGLE_WRITER_PATH_MAP,
    symbolOwnership: SINGLE_WRITER_SYMBOL_MAP,
    sharedShapes: PACKAGE_RESOURCE_KINDS,
    completionOrder: LEAF_LAND_ORDER,
    implementationOrder: IMPLEMENTATION_PHASE_ORDER,
    preland: { owner: "547-02-L03", writable: PRELAND_PATHS },
    settingsCompensation: "one generic atomic compatibility batch",
    changelog: 1260,
  });
  const perFileFindings = collectAllHighMediumLow(perFile);
  const crossFindings = collectAllHighMediumLow([reconcile]);
  writeRedactedRoundEvidenceDeterministically(
    round, perFile, reconcile, perFileFindings, crossFindings, {
      runIdentityDigest: runStart.digest,
      exactTargetPacketDigests: packetMatrix,
    },
  );
  if (perFileFindings.length + crossFindings.length > 0) {
    throw new Error("Fix outside sealed host; restart all five fresh rounds");
  }
  writeZeroFixRecord(round);
}
const finalReconcile = await assertFinalFreshReconcilePass();
assertNoHighMediumLow(finalReconcile);
writeRedactedEvidence("final-reconcile.json", finalReconcile);
```

```ts
const familyBase =
  "ca78c77b7626b8d61ab9ce2706001e17a3f8e7f8";
assertExactCommitObjectAndAncestor(familyBase, "HEAD");
const touchedProductionAndTests = unionSorted(
  everyCommitPathDelta(`${familyBase}..HEAD`),
  currentTrackedDeltaAgainstHead(),
  currentNonIgnoredUntrackedPaths(),
);
for (const path of touchedProductionAndTests) {
  assertTask547Ownership(path);
  if (!(await pathExists(path))) {
    recordDeletedTouchedPath(path);
    continue;
  }
  assertPhysicalLineCountAtMost(path, 1_000);
}
```

```ts
const rootTypecheckBaseline = await captureRootTypecheckBeforeSequentialDispatch();
for (const phase of IMPLEMENTATION_PHASE_ORDER.slice(0, -1)) {
  if (phase === "547-02-L03-preland") {
    assertL02L03ContractsAgreeOnOneAtomicSettingsCompatibilityBatch();
    await implementExistingOwnedSubset("547-02-L03", PRELAND_PATHS);
    await runDependencyShapedPrelandGate();
    await assertRootTypecheckDependencyCheckpoint({
      command: "./node_modules/.bin/tsc -p tsconfig.json --noEmit",
      baseline: rootTypecheckBaseline,
      block: ["preland", "already-landed", "new-unowned", "unlocated", "ambiguous"],
      ignoreOnly: ["strictly-future", "exact-baseline-equivalent-unowned"],
      reportNonzeroCountsWithoutGlobalCleanClaim: true,
    });
    continue;
  }
  await implementExactlyOwnedLeaf(phase);
  await runDependencyShapedLeafGate(phase);
}
await prepareAcceptanceOnly(TASK_547_06_ACCEPTANCE_PATHS);
await remediateFreshPreclosureAuditToZeroFindings();
await runCompleteFinalManifestWorkspaceWrite("pre-smoke");
await runThreeSessionSmokeWithGuaranteedCleanup({
  public: "wf547smoke",
  formDesign: "wf547formdesign",
  pageEditor: "wf547pageeditor",
  registerEachSubmissionImmediately: true,
  registerEveryTemporaryDirectoryImmediately: true,
  freezeValidatedBytesBeforeCleanupAndWriteOnlyAfterEquality: true,
  proveAllRegisteredResourcesAbsentBeforeEvidence: true,
});
await prepareDraftCloseoutWithoutTerminalStatuses();
await runCompleteFinalManifestWorkspaceWrite("post-draft-closeout");
await remediateFreshFinalDrift({
  afterEveryMutation: [runCompleteFinalManifestWorkspaceWrite, rerunThreeSessionSmoke],
});
await terminalizeDescendantsThenParentsAndUpdateBoardLast();
await runCompleteFinalManifestWorkspaceWrite("terminal-closure");

for (let round = 1; round <= 4; round += 1) {
  const lenses = await runFiveFreshIndependentPostClosureLenses();
  if (collectAllHighMediumLow(lenses).length === 0) break;
  if (round === 4) throw new Error("post-closure drift did not converge");
  await runPhaseScopedFixersWithRealDeltas(lenses);
  await runCompleteFinalManifestWorkspaceWrite(`post-closure-${round}`);
  await rerunThreeSessionSmoke();
  await refreshTerminalCloseout();
  await runCompleteFinalManifestWorkspaceWrite(`closeout-${round}`);
}
await runAndPersistFinalTaskGraphConsistency();
await repeatReadOnlyConsistencyAgainstCompleteEvidenceTree();
```

```ts
async function runStandaloneFix(request: FixRequest) {
  const finding = sanitizeBoundedAnchoredFinding(request.finding);
  const origin = validateOriginatingAuditIdentity(request.originatingAudit);
  const before = await rerunSameLens(origin);
  assertExactFindingReproduced(before, finding);
  const scope = resolveOneCurrentPhaseScope(finding); // acceptance/docs; never smoke
  const delta = await fixOnlyOwnedPaths(scope, finding);
  assertNonEmptyExactDelta(delta);
  await runInvalidatedDependencyGates(request.invalidatedTests);
  await runCompleteFinalManifestWorkspaceWrite("standalone-fix");
  const after = await rerunSameLens(origin);
  assertOriginatingFindingAbsent(after, finding);
  return explicitRemainingFindingHandoffs(after);
}
```

**Data flow:** run-start HEAD/ref + bounded dirty summaries + current
line-numbered task/source/docs/tests/reference packet + owner-state manifest +
path-scoped diff → digest-bound structured no-tool audits → sanitized anchored
findings or clean zero-fix evidence → external single-writer/current-phase fixes
and five-round restart → exact observed delta → dependency gates → complete
ordered final manifest → three typed smoke
manifests and decoded PNGs → draft/final closeout → five clean post-closure
lenses → final task graph.

**Error handling:** false-clean, timeout, nonempty stderr, incomplete stdin
transport or wrong prompt-tail acknowledgement, spawn/stream failure, invalid
UTF-8, noncanonical/multiple/trailing JSON, wrapper/model/permission/schema
mismatch, original process-group member leak, packet/digest/line drift, missing
result or any post-invocation guard failure fails the round. Any contract-audit
finding stops the sealed host; scoped external repair forces a complete
five-round restart and never falls through to final reconcile. Do not implement
from stale audit evidence
after any contract change. A generic TASK-547-06 fixer never receives the
combined acceptance/smoke/closeout bucket: evidence resolves to exactly one
current phase; smoke findings invoke only the dedicated three-session refresh.
A standalone fix that makes no actual delta, does not reproduce the originating
finding or leaves that finding in the fresh same-lens audit fails. Any final-tree
mutation invalidates the complete final manifest; runtime-affecting or smoke
findings also invalidate all three smoke sets. HIGH/MEDIUM/LOW are all
unresolved until removed.

**Regression-test shape:** workflow smoke proves all-results guard, five
sequential rounds, reconcile invocation, findings in each round 1..5 force a
complete restart and never reach final reconcile, and the complete
250-declaration
collision map, strict/unique/exact `changedPaths`, forbidden-path enforcement,
mandatory post-call verification after a thrown invocation, result schema and
non-zero exit on false-clean. Synthetic Git tests use a temporary repository and
prove HEAD/ref, raw-index/stage/flag, byte, mode, type and scoped-ignored-path
detection. Synthetic safe-file tests use no real secret and
prove a direct-file happy path, secret-like rejection before filesystem access,
final/dangling/parent-directory symlink rejection, safe atomic evidence writes,
and strict absence for missing parents/targets versus regular files, empty and
populated directories, final symlinks and redirected/non-directory parents.
Smoke-contract tests repeat the absent/empty/populated/final-symlink `.tmp`
cases through the one canonical path constant. Private-result tests reject
redirects/symlinks/hard links and prove
bounded universal POSIX/file-URI/network/UNC/rooted/drive-path redaction with no
DB-source exception across the exact 10-syntax × bare-plus-27-punctuation
matrix in the direct helper, retained-result, audit finding and generic audit
text lanes. Trusted sealed source rendering separately preserves its 13-string
corpus and checks all present text owner entries for zero generic
`absolutePath` substitutions/token while exact known roots remain fail-closed.
Transport tests positively recurse through the exact supported
object/array/primitive schema grammar and reject every unknown or malformed
keyword/node before spawn. They also reject invalid bytes
without replacement-character decoding, and prove a synthetic nonzero/signal
exit creates only a private bounded fixed-category diagnostic with safe
stdout/stderr byte counts and signal category, without either raw sample.
Synthetic transport tests additionally prove explicit timeout and stream-limit
booleans/categories, the strict event-violation allowlist and no raw-sample
persistence. Audit tests reject missing anchors, traversal, absolute/
secret-like paths, out-of-packet paths, out-of-range lines and oversize text.
Packet tests build and scan all 21 prompts plus reconcile, pin the exact
21-node/20-edge graph, filenames/docs/owner unions, exact state-dependent owner
  record shapes, official absent route-suite/`.tmp`, reusable absent/present-text
  route states, rejection of binary/directory/malformed route mutations,
  PAGE_MODEL range coverage, source-aware rendered digests, byte budgets,
14 leaf-body coverage rows and run-start packet matrix. A no-reference local
owner-manifest self-test validates all 250 current declarations, including
canonical mixed-case leaf owner IDs and the sanitizer sources themselves.
Matrix/run-identity
mutation tests swap valid target digests and mutate ordering, reconcile, host,
runtime, launcher and pre-import workflow-source bindings. The offline host
suite proves exact Claude argv/env/framing/root/status, nonce acknowledgement,
strict model/schema and required/optional telemetry-value validation, EPIPE,
original-group timeout, sibling
pre-spawn cancellation and real signal-subprocess shutdown barriers; the separate hostile
no-tool live canary is operator-triggered and does not count as audit evidence.
Final-manifest tests reject missing, duplicate, reordered, weakened or
unexecuted commands and malformed timestamps/diagnostic records. The synthetic
family line-gate repository covers an oversized committed file, a
commit-changed then reverted path, dirty tracked and non-ignored untracked
paths, deleted-unowned rejection, a non-full/invalid base and a valid
non-ancestor commit. Phase-scope tests reject mixed acceptance/closeout
evidence and smoke writes through a generic fixer. Implementation-phase tests
pin the unchanged 13-leaf completion
order, 14-phase dispatch order, exact preland subset/reuse, transferred settings
owners and 42/18 leaf sizes. Root-typecheck checkpoint tests reject diagnostics
in either preland file, an already-landed file, new unowned paths, unlocated
output and ambiguous ownership while allowing only strictly future paths and
exact baseline-equivalent unowned diagnostics. Smoke-schema self-tests reject
generic/string/boolean proxy
observations, wrong/reordered per-scenario IDs, wrong SEO/content/filter/
lifecycle/CAPTCHA/native-presentation values, unsafe detail-slug eligibility,
late resolver outcome and each of the eight closed 404 arrays independently
made nonempty, shallow hero-art geometry, wrong Aurora CTA, weakened internal
session/API-key security or anonymous persistence,
stale/pseudo/corrupt/trailing-byte PNGs,
mismatched metadata, an incomplete zero-row/zero-directory cleanup receipt,
repeated screenshot bytes and any console/page error.
The public manifest pins eight flows, Form Design pins five, and Page Editor pins
the current five TASK-547-04-L01 flows. Each validator requires the exact
normalized URL/viewport/semantic assertion matrix owned by its helper.

## Sub-Tasks

- [x] Add `task-547-author-audit.mjs` with five sequential rounds.
- [x] Add exact `task-547-implement.mjs` and `task-547-fix.mjs` dispatch scripts
  with per-child gates and derived-root/forbidden-root assertions.
- [x] Add workflow smoke fixtures and all-results/collision assertions.
- [ ] Record fresh pre-implementation and final drift evidence.
- [ ] Preserve final Playwright screenshot manifest hashes from the new smoke run.

## Testing Requirements

- `node --check _docs/_workflows/task-547-author-audit.mjs`
- `node --check _docs/_workflows/task-547-implement.mjs`
- `node --check _docs/_workflows/task-547-fix.mjs`
- `for file in _docs/_workflows/lib/task-547-*.mjs; do node --check "$file"; done`
- `node _docs/_workflows/task-547-author-audit.mjs --self-test-dispatcher`
- `node _docs/_workflows/task-547-implement.mjs --self-test-local`
- `node _docs/_workflows/task-547-author-audit.mjs --self-test`
- `node _docs/_workflows/task-547-implement.mjs --self-test`
- `node _docs/_workflows/task-547-fix.mjs --self-test`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate-self-test`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`
- `node /tmp/task547-agent-host.mjs --self-test-host` (synthetic; no model call);
- operator-triggered hostile no-tool structured canary with the private CWD and
  exact empty Claude tool registry before an official audit run;
- synthetic repository/index/mandatory-after, safe-file/result-transport,
  audit-anchor/phase-scope, semantic public/Form Design/Page Editor,
  full-PNG/fresh-artifact and false-clean negative tests;
- task graph/H1/FileName/parent/status/changelog/statistics audit;
- baseline-to-final touched production/test physical-line counts and
  workflow-owned file counts, all at most 1,000.

The sole final manifest is
`lib/task-547-final-validation-contract.mjs`. Its current 21 ordered records
cover all TASK-547-01..05 targeted Vitest/Bun paths (including the derived
`tests/integration/routes/formSupportingTextRoutes.test.ts` Bun argv), bounded
pass/fail-only database reachability, the three explicit serial 360,000 ms DB acceptance
commands, core lint/types, `bun run lint:repo:types`, root tests, precommit,
Coderso gates, strict security scan, site build, canonical generator
byte/zero-diff, touched-file line counts, `git diff --check`, syntax and all
three workflow entrypoint self-tests. Each record returns the exact pinned
three-element `argv`, ISO start/end, zero exit, `pass:true` and redacted
diagnostic byte counts. Missing, duplicate, reordered, skipped, weakened or
non-zero records fail. The existing `workflow-syntax` record is the one
workflow self-test record that invokes `--line-gate-self-test`; this does not
add a final record, so the ordered command count remains exactly 21.

## Documentation Updates Required

Record audit summaries that materially changed the contract in TASK-547 and the
exact pinned changelog-1260 file at closure.
