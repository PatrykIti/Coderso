# TASK-556: FormaDom Code-Owned Static Starter to Designer Handoff
# FileName: TASK-556_FormaDom_Code_Owned_Static_Starter_To_Designer_Handoff.md

**Priority:** High
**Category:** Designer / Solution Kits / Static Starter Handoff
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 must be exactly `✅ Done` with its tracked workflow/evidence contract landed and no superseded-successor exception; TASK-414, TASK-489, TASK-547, and TASK-555 must each be `✅ Done`, except that any of those four may be replaced only when its task file names a terminal successor and that successor is `✅ Done`
**Status:** ⏳ To Do
**Changelog:** 1270 pinned
**Implementation Gate:** Closed on the current tree; TASK-414, TASK-489, TASK-545, and TASK-555 are not terminal

---

## Overview

Add a provider-free bridge from TASK-555's immutable FormaDom release into the
terminal TASK-414 Designer. `Customize in Designer` creates or reopens one
owner-scoped private workspace, stages the exact verified release, opens normal
Designer preview, and later uses normal reviewed promotion. TASK-555 direct
preview/apply/rollback remains unchanged and independently available.

This family consumes landed implementation receipts, not sibling task status as
an implementation dependency. Each leaf starts only after the preceding leaf's
reviewed diff and listed validation commands pass. Before the first source edit,
record the terminal exports, host regions, tests, migration journal, line counts,
shared `DesignerSmokeFixtureLedgerV1`/`DesignerSmokeObservationV1`, HEAD, status,
and diff for all five external dependencies. If a named seam did
not land, correct this family and rerun a fresh read-only audit; do not invent a
parallel Designer, release, package, installer, host, or capability stack.
TASK-555 counts as terminal evidence only after its own final audit resolves every
physical predecessor and shared runtime-smoke registration owner; status text
alone never satisfies this gate.

## Product Boundary

- `code_owned_static` is a Designer source, never an Agent, provider, import,
  prepared-private, `site-kit.*`, or public upload source.
- TASK-555 owns direct install and exposes the exact asynchronous server-only
  `getCuratedFullSiteRelease(releaseKey)` accessor plus the `review`, `lifecycle`,
  and `starterContentReview` host regions. TASK-556 consumes those receipts only
  and records their terminal JSX/component anchors before editing either host.
- TASK-547 owns `FullSitePackageV1`, normalization, reference planning, and
  `packageFingerprint`; TASK-556 neither widens nor independently serializes
  that contract. TASK-555's accessor already performs one normalize/reference
  validation. After a replay miss and only for Transaction A's dispatch owner,
  TASK-556 performs exactly one additional terminal Designer compiler-side
  normalize/canonical-byte/fingerprint/reference-plan pass. Those are the exact
  two end-to-end validations; no third package pass exists.
- Seed/reopen/preview/promotion work with all providers offline. Only a later
  explicit AI revision uses terminal TASK-414 provider policy.
- Before promotion, canonical CMS tables, lists, search, caches, public runtime,
  Solution Kit runs, and Agent state have no static-seed effects.
- The browser sends only source ID, `expectedReleaseDescriptorDigest`, and an
  idempotency key. It never sends package bytes/path/fingerprint, artifact hash,
  permissions, provider facts, workspace IDs, or trusted release metadata.

## Identity Contract

The following identities are separate and never substituted:

| Identity | Owner | Meaning |
|---|---|---|
| `artifactSha256` | TASK-555 | SHA-256 of exact shipped artifact bytes |
| `packageFingerprint` | TASK-547 | fingerprint of normalized `FullSitePackageV1` |
| `releaseDescriptorDigest` | TASK-555 | digest of immutable release descriptor, including artifact/package identities |
| `releaseKey` / `releaseVersion` | TASK-555 | literal registry key and manifest version; neither is an invented Designer release ID |
| `designerBriefDigest` | terminal Designer brief contract / TASK-556-01-L02 literal; generation run persists it | canonical digest of the one normalized literal `DesignerBriefV1` |
| `bindingDigest` | Designer | digest binding source/release facts to Designer's static binding schema |
| `seedRequestDigest` | Designer | digest of `{sourceId, expectedReleaseDescriptorDigest}` only |

The first three digest rows are upstream identities; `designerBriefDigest`,
`bindingDigest`, and `seedRequestDigest` are three separate Designer digest
domains. `designerBriefDigest` joins the static binding input. Designer
contribution/registry/compiler versions are included in `bindingDigest`, not in TASK-555's
`releaseDescriptorDigest`; changing a Designer registry version must not alter
any upstream TASK-555 or TASK-547 identity. Receipt digest includes all six
digest identities and material compiler/stage facts but excludes timestamps.

## Crash-Safe Protocol

1. A bounded owner/key preflight resolves an exact retained ready/failed replay
   without release I/O. Same key/different request conflicts. A matching live
   claim returns `designer_static_seed_in_progress` and dispatches nothing; it is
   never treated as permission for a second worker.
2. Only when work may be claimed, outside every transaction call TASK-555's
   asynchronous server-only accessor once, compare the literal manifest fields
   and all three upstream identities without recomputing package identity, and
   freeze its already normalized/reference-validated package. This step performs
   no TASK-556 package pass and does not select current Designer registry, brief,
   contribution, registry-version, or compiler-version facts.
3. Transaction A rechecks key/release under lock, then atomically inserts or CAS
   updates one owner/source/release binding pointer, workspace, revision,
   generation run, bound claim/lease, exact static binding/request/brief subtype
   columns, start event, and bounded idempotency alias. For `new` and
   `fork_promoted` only, it selects the current frozen contribution/registry/
   compiler facts. For `takeover` and `retry_failed`, it returns the persisted
   normalized `static_brief`, brief digest, contribution/registry/compiler
   versions, and complete binding identity from the locked generation run; current
   registry facts are neither substituted nor compared. Only the request that
   creates or rotates the live fence receives `dispatch` and a durable dispatch
   alias. Same-key live replay and every fresh-key live collision receive no
   fence, insert no alias, and perform no compiler/stage dispatch. A contender that
   observed the live claim during preflight performs no accessor read; a contender
   that raced between preflight and Transaction A may have completed its one
   bounded verified accessor read but still receives no fence and performs no
   TASK-556 compiler validation. A named unique race rolls back the complete
   savepoint, then re-reads the owner/key alias and classifies its immutable run
   first; it consults the binding only when that alias is absent. The initial
   dispatch and every successful expired-lease takeover count under the locked
   run toward `MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN = 8`; collision losers do not.
   A ninth dispatch attempt returns `designer_reconciliation_required` without
   inserting an alias, rotating a fence, or dispatching work.
4. Outside every transaction, only the dispatch owner passes the frozen snapshot
   plus the exact persisted-or-current compilation facts returned by Transaction A
   through one terminal Designer compiler-side
   `normalizeFullSitePackageForWrite` + canonical-byte + fingerprint +
   `buildReferencePlan` validation and then builds deterministic stage/receipt
   input. Together with TASK-555's accessor validation this is exactly two
   end-to-end passes. No DB lock spans artifact I/O or compilation.
5. Transaction B locks binding -> workspace -> current static revision -> current
   static generation run -> claim in terminal order. It first validates immutable
   owner/run/static identities, including the bounded normalized `static_brief`,
   then reads the run-bound receipt. An exact already-`ready` receipt returns
   before live-fence/current-pointer/not-ready checks; those mutable checks apply
   only when no receipt exists. The write path then uses the terminal stage/preview
   owner, CAS-completes `ready`, and sets all still-null alias `purgeAfter` values
   from the referenced run's same terminal timestamp atomically. Changed or
   partial evidence conflicts. Every successful path returns its operation outcome
   and authoritative workspace ID/active revision/version/state from one final
   locked snapshot; no unlocked post-transaction reload may race later Designer
   work.
6. Release load/verification failure before Transaction A returns a safe error
   with no root/claim. Deterministic compile failure after a dispatch fence
   terminalizes only that fence and its alias lifecycle in a short transaction.
   Process interruption
   leaves a resumable lease; the same key remains a conflict after expiry, while
   only a fresh key may atomically insert the takeover alias and rotate the fence.
   No failure writes canonical state.

Static subtype columns live additively on the terminal generation-run and claim
rows. The TASK-556 migration atomically replaces TASK-414's named source
enum/CHECK while preserving every prompt-AI/Figma truth-table case byte-for-byte;
both CHECKs remain row-local. Named composite FKs plus named run/claim and alias/
run constraint-trigger pairs enforce one born-`bound` static claim with matching
binding/brief/request digests and null provider/import/source-lease fields, plus
the null-live/non-null-terminal alias lifecycle.
Aliases use a named composite FK to the exact owner + binding + generation run +
`seedRequestDigest` target, so cross-owner and mismatched-run aliases fail in the
database. A live-fence dispatch alias has nullable `purgeAfter`; it becomes
eligible only when its referenced run terminalizes. Fresh live-collision losers
never consume alias capacity. Terminal reopen aliases use their separate bounded
cap. Expired rows are selected globally by `(purge_after, id)` through the exact
partial index; retention never scans a generation-run-only index. Every non-null
alias `purgeAfter` is exactly the referenced run terminal timestamp plus the
terminal 30-day tombstone interval, including aliases inserted after
terminalization or restored from backup. Alias insertion, replay, refresh, and
database wall-clock time never extend that deadline.

The generation-run row owns `static_brief` as strict JSONB only for
`code_owned_static`: terminal `DesignerBriefV1` normalization, canonical UTF-8
size at most 512 KiB, all-other-source nullability, and post-dispatch immutability
are enforced by migration/service/backup tests. A takeover reads that run field;
the sole retry copies it from the locked failed run. Neither path reconstructs a
brief from the current registry.

One `assistant_designer_static_source_bindings` row is concurrency authority for
the current owner/source/release root, while historical promoted runs remain
immutable. The complete L02 matrix is exhaustive over all terminal Designer
states: a successful seed may open only `generating | ready |
promotion_pending | failed`; exact historical success replay may also navigate
`promoted`; a fresh key on `promoted` forks one new private root. Live original
static claims return in-progress, expired original static claims may rotate only
with a fresh key, and one fresh-key retry may follow an original deterministic
static failure. `rejected | expired | restoring | reconciliation_required |
deleting | deleted` and inconsistent evidence delegate to terminal Designer
state/terminal/reconciliation errors. Later provider runs are never classified
as the original static seed claim. Fully pruned bindings may be recreated; a
partially retained root is never adopted or duplicated. Static rows follow the
terminal TASK-414 retention owner. TASK-556-01-L01 owns the reserved
`DesignerBackupSectionV2` successor contract while retaining strict V1 reads.
Retained historical static runs keep their binding until every referencing alias,
claim, stage, receipt, revision, and run is terminal-pruned in the established
order.

## Sub-Tasks

| Order | ID | Scope | Status |
|---:|---|---|---|
| 1 | TASK-556-01 | Enforceable static persistence, registry, identities, and claim protocol | ⏳ To Do |
| 2 | TASK-556-02 | TASK-555 release contribution, pure compiler, stage, receipt, and isolation | ⏳ To Do |
| 3 | TASK-556-03 | Strict internal API/client and shared Solution Kits/Setup CTA | ⏳ To Do |
| 4 | TASK-556-04 | Capability regeneration, five real smokes, docs, and closure | ⏳ To Do |

Leaf order is exactly `01-L01 -> 01-L02 -> 02-L01 -> 02-L02 -> 03-L01 ->
03-L02 -> 04-L01 -> 04-L02`. Every leaf after L01 names its physical predecessor
in `Dependencies` and also requires that predecessor's landed implementation
receipt: reviewed file list, green targeted commands, line-count gate, and
`git diff --check`. Status text alone never satisfies either gate.

Only after all external dependencies above are terminal may the bounded canonical
TASK-556 workflow bootstrap create `_docs/_workflows/task-556-author-audit.mjs`,
`_docs/_workflows/task-556-implement.mjs`, and
`_docs/_workflows/task-556-fix.mjs`. Before any authoring audit or product edit,
the owner reviews and commits only that bootstrap; a new invocation must prove
each entry is tracked, regular/non-symlink, byte-identical to `git show HEAD`,
clean in index/worktree, task-bound to TASK-556, and green under terminal
TASK-545 static/canonical-import gates. Ignored or merely local workflow bytes
never authorize work. The workflows fail closed on a missing result, dependency,
or audited-byte change, implement the eight leaves strictly in order, and never
stage or commit. A fresh post-bootstrap read-only audit against unchanged bytes
must pass before implementation; focused gates run after each leaf.

The committed bootstrap pins closure identity before phase 1 is reachable:
`task-556-implement.mjs` alone declares task `TASK-556`, workflow role
`implement`, changelog number `1270`, and slug
`task-556-formadom-code-owned-static-starter-designer-handoff`. Author-audit and
fix entries have no TASK-545 checkpoint/resume branch. Static workflow tests fail
on a different/missing/dynamic role, number, slug, task binding, or caller-supplied
override; no later closure leaf patches these committed workflow bytes.

The fast profile is operational non-checkpoint evidence only: it is never copied
into the canonical closure inventory, never staged, and never invokes TASK-545
phase 1. Complete every product/test/workflow/configuration/non-metadata doc and
generated write, every gate, and every post-audit before the final certification
run. Only session `task-556-certification` writes canonical evidence under
`_docs/_workflows/_smoke/evidence/task-556/task-556-certification/` and only the
tracked HEAD-identical `_docs/_workflows/task-556-implement.mjs` with workflow role
`implement`, changelog number `1270`, and literal changelog slug
`task-556-formadom-code-owned-static-starter-designer-handoff` may invoke TASK-545
phase 1. Phase 1 creates exactly one `resume-checkpoint.json` and pauses. The owner
reviews and stages only that certification directory, then invokes the exact
checkpoint-bound owning-workflow resume. After checkpoint creation, the resume may
write only TASK-545-allowlisted TASK-556/changelog/board closure metadata; it never
reruns or changes implementation, tests, workflows, gates, smoke, runtime docs,
Guide sources, or generated bytes. Final closure-delta permits only that bounded
metadata and no file changes after its pass.

## Security Contract

- **Visibility:** one internal same-origin POST under `/admin/api/designer`; no
  public source/package/seed endpoint.
- **Auth/RBAC:** terminal order is host/IP/global request context -> exact route
  match -> wire `Content-Length` syntax/cap -> session -> static require-all RBAC
  for `solution-kits:read`, `designer:read`, and `designer:write` ->
  `admin_write` rate -> CSRF -> owner admission -> content type/JSON parse;
  preview/promotion retain terminal TASK-414 authorization.
- **CSRF/rate/body:** use only terminal pre-body transport fields. The JSON policy
  records `parseErrorCode: "invalid_json"`; the terminal transport owns the cap
  response code, currently `payload_too_large`, without an invented per-route field.
  Record the exact terminal keys/code before implementation; strict
  request-schema failures map separately to `designer_static_seed_invalid`.
  Apply `Cache-Control: private, no-store, max-age=0` to success and errors. No
  second transport or security-settings bucket is introduced.
- **Validation:** recursive reject-unknown, literal source, exact SHA-256 grammar,
  owner scope, unique/CHECK constraints, CAS/fence/idempotency, strict response.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply.
- **Privacy:** no package body/path, token, permission set, provider payload,
  preview secret, SQL/driver text, or private staged document in logs/cache/evidence.

## Acceptance Criteria

- [ ] Exact static row shape is database-enforceable with local named constraints.
- [ ] All three upstream and three Designer digest domains remain distinct; Designer versions do not alter upstream digests.
- [ ] Transaction A/outside-transaction compile/Transaction B protocol is crash-safe and replay-first.
- [ ] Same-key and different-key concurrency produces one live fence and one dispatch.
- [ ] Live collision losers insert no aliases; fresh-key expiry takeover remains available after a race-to-cap attempt, while terminal reopen aliases retain their separate cap.
- [ ] Unique-race loss rechecks owner/key alias before binding; a winner completed before re-read returns exact replay without an extra alias.
- [ ] Initial dispatch plus takeovers are capped at eight per run under lock; the ninth returns reconciliation with no alias/fence/dispatch.
- [ ] Retry/takeover compiles from the persisted run `static_brief`/binding/version facts; only new/promoted-fork uses current registry facts.
- [ ] Transaction B validates immutable identity before receipt lookup, exact ready receipt replay bypasses mutable fence/not-ready checks, and every response uses one final locked outcome/workspace snapshot.
- [ ] Alias retention always derives from the referenced run terminal timestamp; insert/replay/restore never refreshes it.
- [ ] TASK-555's exact async accessor and landed host regions are consumed without editing direct install.
- [ ] Static lifecycle is provider-free, Agent-free, canonical-isolated, and promotable through Designer.
- [ ] Setup opens only the descriptor-approved Designer review route while preserving in-memory wizard state.
- [ ] Designer backup V2 round-trips static binding/evidence and never resumes a live claim.
- [ ] The terminal CMS capability compiler regenerates the static feature projection through one exact additive source-inventory row; only `core:designer/workspace-preview` and `core:designer/workspace-promotion` gain the reciprocal workflow ID and every unrelated byte remains unchanged. These two feature IDs are start-gate-recorded here: no TASK-414 contract commits them yet, so the external gate re-checks them against the terminal Designer capability inventory before implementation, and a different landed ID fails the gate and amends this contract first.
- [ ] Focused DB performance files and additive functional/UX/performance/security/reliability release-gate commands are registered without replacing existing commands.
- [ ] Route ordering, alias/FK/purge indexes, scoped Designer cache invalidation, and light/dark smoke-theme assignments recorded in the terminal TASK-414/TASK-555 guards at the start gate remain unchanged and covered.
- [ ] Exactly five ordered real smoke flows pass with visible effects and complete cleanup.
- [ ] Fast remains non-checkpoint operational evidence; one final certification directory passes TASK-545 owner review, unchanged-revision resume, and metadata-only closure delta through workflow role `implement` with pinned changelog 1270/slug.
- [ ] Changelog 1270 enumerates all 13 TASK-556 family IDs.
- [ ] Every touched human-authored production/test file is at most 1,000 physical lines.

## Testing Requirements

```bash
set -a && source .env && set +a
bun --cwd core lint:types
bun --cwd core lint
bun run lint:repo:types
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
bun test --parallel=1 --timeout 360000 tests/perf/designerStaticStarterPersistence.test.ts
bun test --parallel=1 --timeout 360000 tests/perf/designerStaticStarterStage.test.ts
bun test tests/unit/release/task556ReleaseGateConfig.test.ts
node --check _docs/_workflows/task-556-author-audit.mjs
node --check _docs/_workflows/task-556-implement.mjs
node --check _docs/_workflows/task-556-fix.mjs
git diff --check
# Complete migration/Admin/docs/generated checks, post-audits, and line counts here.
bun scripts/runtime-smoke.ts run --suite task-556 --profile fast --session task-556-fast
# Fast is operational only and must produce no TASK-545 checkpoint/closure inventory.
bun scripts/runtime-smoke.ts run --suite task-556 --profile certification --session task-556-certification
# Only task-556-implement.mjs now enters TASK-545 phase 1; after its checkpoint,
# run only the emitted metadata-closure resume.
```

DB/settings commands load `.env` without disclosure and first verify DB reachability.
Closure also runs migration parity/upgrade, Admin build/boundary/bundle checks,
touched-file line counts, and fresh post-implementation audits before final
certification.

## Documentation Updates Required

TASK-556-04-L01 owns all final Guide/capability source bytes and terminal generated
outputs. TASK-556-04-L02 read-checks those immutable bytes and owns relevant
non-corpus architecture, API, data model, preview, security, audit, Solution Kits,
Setup, Designer, cache-map, `tests/README.md`, release gates, smoke, changelog
1270, board, and family-status updates. Every non-metadata doc/release-gate byte
lands before certification; after its checkpoint only changelog/index, TASK-556
task statuses, and board/statistics may change through TASK-545. No earlier leaf
edits shared closure metadata.
