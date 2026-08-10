# TASK-555-07: Acceptance Smoke Documentation and Closure
# FileName: TASK-555-07-Acceptance-Smoke-Documentation-And-Closure.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** QA / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** landed TASK-555-06-L03 receipt; TASK-554 terminal shared-writer
handoff; terminal TASK-545 tracked evidence authority; terminal TASK-548
source/generator handoff; tracked HEAD-identical TASK-555 workflow bootstrap
**Status:** ⏳ To Do

---

## Overview

Run dependency-shaped package/domain/API/security acceptance, finish every
source-of-truth, cache, developer, Guide, and generated-documentation byte, then
exercise exactly nine real-flow shared runtime-smoke scenarios in both profiles.
The fast profile is ordinary non-closure runtime evidence. Only the final
certification profile enters terminal TASK-545's two-phase immutable checkpoint
lifecycle. After that checkpoint, closure is metadata-only: pinned changelog 1269,
the TASK-555 family/status board, and the terminal provider-free fixed-starter
accessor/host-anchor handoff consumed later by TASK-556.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-07-L01 | aggregate acceptance plus all product/developer/Guide/generated documentation and owning gates | ⏳ To Do |
| 2 | TASK-555-07-L02 | UI/Setup integration, final gates, and both shared `task-555` smoke profiles | ⏳ To Do |
| 3 | TASK-555-07-L03 | frozen-receipt validation and metadata-only changelog/board/status closure | ⏳ To Do |

## Acceptance Order

1. L01 finishes all aggregate tests and every product/security/cache/developer/Guide
   source update, including all three Guide capability relation files. It runs the
   exact unchanged terminal TASK-548 recovery/write/check transaction and all owning
   documentation/security/regression gates before handing off.
2. L02 lands only the shared smoke adapter/tests, then runs targeted and final broad
   gates plus independent post-audit lenses on the complete candidate. Fixes rerun
   every affected gate/lens before either retained profile receipt is accepted.
3. Run `task-555` fast as normal non-closure runtime evidence. Never invoke TASK-545
   phase 1 for `wf555fast`, never stage it, and never create an immutable fast
   checkpoint. Its own presence-aware baseline and cleanup must pass before the fast
   receipt is retained.
4. After fast cleanup parity, and with no intervening source, test, workflow,
   configuration, runtime-doc, Guide, or generated-doc mutation, snapshot the fresh
   certification baseline: presence/value bytes for `setup.completed` and the complete
   Setup plus FormaDom global/shell setting write set, and all seven curated lineage
   heads with no pending reservation. Then run certification once as `wf555final` with
   the same exact nine scenarios.
5. Certification cleanup rolls back every smoke-created head in reverse creation order
   to the exact baseline heads, restores each snapshotted setting's prior presence and
   value exactly, deletes only recorded owned fixture/submission rows, and proves
   byte/state parity plus zero pending reservations. Only after that proof may
   `wf555final` invoke terminal TASK-545 phase 1 under the tracked HEAD-identical
   workflow, create the sole immutable checkpoint, and stop with
   `owner_action_required`.
6. After owner review/staging of that exact final session, L03 invokes the emitted
   checkpoint-bound phase-2 resume, requires tracked parity, and validates the frozen
   receipts. It does not replay implementation, gates, docs generation, or smoke.
7. L03 writes only TASK-545-allowlisted closure metadata: ordered durable changelog
   1269 and its index, all 29 TASK-555 status/closeout files, and the task board/index.

## Security Contract

- **Visibility:** validates only internal starter routes plus the already-existing
  public FormaDom pages and public contact Form submission.
- **Auth/RBAC:** internal read/write matrix is exact; public contact retains its own
  published-form access evaluator.
- **CSRF/rate limits:** internal POST = CSRF + `admin_write`, GET = `admin_read`;
  public Form submit remains `public_write` with its existing nonce/CAPTCHA policy.
- **Validation:** strict unknown-field, server-ID, preview/fingerprint/idempotency,
  source-run, and package integrity negatives are mandatory.
- **Anti-abuse:** no public starter write; no starter nonce/HMAC/reCAPTCHA. Contact
  Form keeps existing public anti-abuse unchanged.
- **Data hygiene:** synthetic actor-owned fixtures, reverse-order exact source rollback
  for every smoke-created lineage head, presence-aware exact setting restoration,
  bounded owned fixture/submission cleanup, no truncation or broad delete, no pending
  reservation, and no raw package/setting/snapshot/form data in evidence.

## Collision Guard

Shared docs, smoke registry, evidence, and index files are serialized. L01 waits for
the terminal TASK-548 and active shared-document handoffs and is the final pre-smoke
documentation writer. L02 waits for every active shared smoke owner, preserves all
suites, and never overlaps another registry writer. L03 alone writes 1269 and closure
indexes after fresh reads. TASK-414/489/547/551/554 files and changelogs
1260/1263/1266/1267/1268 are forbidden.
TASK-545/TASK-548 task/source owners are terminal read-only inputs. The only evidence
root with closure authority is the final
`_docs/_workflows/_smoke/evidence/task-555/wf555final/` session; old ignored
`_docs/_workflows/_smoke/task-555/` output and `wf555fast` operational output have no
closure authority.

## Testing Requirements

- All parent commands and exact targeted suites from every implementation leaf.
- Shared suite registration tests and both `fast`/`certification` profiles with the
  same nine scenario descriptors/assertions.
- Terminal rollback `failed` keeps the head/counters, clears every pending reservation
  field, and permits explicit retry; `recovery_required` keeps the head plus reservation
  for authoritative resume and cannot be treated as cleanup success.
- `wf555fast` produces no immutable checkpoint and enters no owner-review/staging
  lifecycle; its independent baseline/cleanup parity is operational evidence only.
- Only `wf555final` carries strict `manifest.json`, `report.json`, immutable
  `resume-checkpoint.json`, exact hashes/file set, two-phase owner-review resume, and
  HEAD-identical workflow checks, and phase 1 is unreachable until final cleanup proves
  setting bytes/presence, all seven baseline lineage heads, owned-row cleanup, and no
  pending reservation.
- Docker/image proof when available and truthful CI-only note otherwise.
- Every added or modified human-authored production module and test file is at most
  1,000 physical lines, plus `git diff --check`. Documentation and generated artifacts
  are outside the repository line-count gate; generated bytes retain their own
  hash/parity checks.

## Documentation Updates Required

L01 owns the complete product/security/cache/developer/Guide documentation list, all
three terminal-schema Guide relation files, and every generated documentation byte
emitted by terminal TASK-548's exact unchanged transaction. It never writes the final
CMS capability JSON. L03 owns only changelog 1269 using the actual closure date, both
closure indexes, all 29 TASK-555 statuses/closeout notes, and the explicit
post-terminal TASK-556 accessor/handoff reservation. It does not edit TASK-414.
