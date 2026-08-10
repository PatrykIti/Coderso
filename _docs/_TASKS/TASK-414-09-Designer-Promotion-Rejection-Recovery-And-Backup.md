# TASK-414-09: Designer Promotion, Rejection, Recovery, and Backup
# FileName: TASK-414-09-Designer-Promotion-Rejection-Recovery-And-Backup.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Designer / Promotion / Recovery / Backup
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-08 terminal; TASK-547-02-L01 through L03 terminal;
TASK-551-08-L02, TASK-551-08-L03, TASK-551-09-L02, and TASK-551-09-L03
terminal for L01/L03; complete TASK-547 and TASK-551 families terminal before
L05/L04; TASK-511 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Promote exactly one reviewed Designer revision into canonical CMS state with a
fresh live-site baseline, durable lease, actor/native RBAC, idempotency, one
product transaction, atomic promotion ledger, and TASK-551's exact post-commit
cache lifecycle. Also define safe rejection/expiry, private cleanup, encrypted
backup/restore, and crash reconciliation.

A successful promotion is all-or-nothing at the product visibility boundary.
Any TASK-547/native adapter that cannot apply through the encompassing
transaction handle and generation-aware read model is absent from Designer
promotion capability. A partial or mixed-generation canonical site is never an
acceptable fallback.

## Locked Approval Tuple

Approval and every retry bind all of:

```text
actor identity
workspace identity + singleton activation-generation identity
workspace version/state
revision identity/number
core-package + sidecar-set + whole-bundle + stage graph + install plan digests
validation receipt + preview digests
compiler/capability-manifest versions
native permission-union digest
fresh live-site baseline digest
approval-intent identity/expiry
idempotency key
```

Any mismatch returns a conflict before canonical writes. The server resolves
current permissions and recomputes the baseline; no client-supplied permission
or baseline fact is trusted.

## Atomic Promotion Boundary

External work may only prepare private, unreachable assets and generation-bound
search/cache/route artifacts before the transaction. The authoritative
transaction rechecks the lease, approval tuple, receipt, active generation, and
baseline; invokes only tx-aware native adapters; writes canonical resources,
complete generation membership/artifact receipts, promotion ledger, ownership
transfers, workspace state, audit/checkpoint facts, TASK-551 invalidation outbox,
and the active-generation pointer atomically. Public aliases/outbox observation
occur after commit. Old requests/caches may complete only against the complete
old generation; new requests resolve only the complete new generation.

```text
private prepare -> product transaction -> durable commit -> post-commit outbox/
cache observation -> complete
```

If any adapter needs correctness-critical external I/O during canonical apply,
starts its own transaction, uses the global DB client, publishes before commit,
or cannot compensate private preparation, its Designer promotion capability is
`unavailable`.

## Sub-Tasks

1. `TASK-414-09-L05` runs in the initial AUTHOR/audit phase, freezes the exact
   post-TASK-547/TASK-551 native read/mutation-owner inventory into L04, and
   returns a verified gate receipt before any TASK-414 product-source dispatch.
   Its canonical task status remains To Do until TASK-414-11-L01's family
   metadata closure; no mid-family board/changelog write is authorized.
2. `TASK-414-09-L01` owns approval intent, fresh baseline, lease/fence,
   tx-aware promotion orchestration, atomic ledger, permission recheck, and
   idempotency.
3. `TASK-414-09-L02` owns reject/expiry claims, Designer-only purge/private
   cleanup, TASK-511 encrypted archive extension, and restore normalization.
4. `TASK-414-09-L04` owns generation-aware normal read models, legacy bootstrap,
   private generation artifact preparation, and the atomic active-generation
   pointer cutover inside the product transaction.
5. `TASK-414-09-L03` owns crash reconciler, final facade composition, all
   family route/navigation/rate/permission mounts, aggregate cache
   invalidation, and the exact crash-smoke handoff consumed by TASK-414-11.

**Land order:** passed AUTHOR-gate receipt from `TASK-414-09-L05`, then implementation
`TASK-414-09-L01 -> TASK-414-09-L02 -> TASK-414-09-L04 ->
TASK-414-10-L01 -> TASK-414-10-L02 -> TASK-414-09-L03`.

TASK-414-09-L03 is the sole family integration writer. Earlier leaves and the
Figma child expose injected/static contributions and remain unmounted. The
closure leaf is the sole runtime-smoke suite/registry writer.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Approval, promotion, reject, restore review, and reconciliation are internal `/admin/api/designer/*`. Preview is an internal same-origin Admin read bound to the current Admin session; promotion and backup have no public endpoint. |
| Authentication | Valid Admin session and server-derived actor are mandatory. Workers use explicit bounded system identities plus durable lease fences, never a public/API/provider token. |
| RBAC | Read uses `designer:read`; reject/ordinary lifecycle uses `designer:write`; approval/promotion/reconciliation uses `designer:promote` plus the exact current native permission union. Backup/restore retains TASK-511's separate permissions and confirmation/maintenance contract. |
| CSRF | Every Admin approval, promotion, reject, reconciliation, backup, or restore mutation requires shared CSRF. Worker/outbox execution is internal lifecycle work, not an HTTP bypass. |
| Rate limits | Approval/promotion/reconciliation uses `designer-promotion` plus the singleton installation activation lock, one live lease per workspace, and bounded retries. Ordinary reject uses `admin_write`; backup/restore retains TASK-511 buckets. |
| Validation | Recursive reject-unknown bodies; exact state/version/revision/digest/receipt/baseline/intent/idempotency checks; strict adapter capability; bounded archive manifests/sections; and durable constraint checks all fail closed. |
| Anti-abuse | Internal writes use session + CSRF + RBAC + ownership + CAS + lease/fence + idempotency. No public write exists, so nonce/HMAC/reCAPTCHA do not apply. A preview-session ID or bind secret is never authorization and cannot authorize promotion. |

No response/log/archive/smoke evidence exposes provider credentials, raw
provider/tool bodies, live preview sessions/bind-secret state, lease tokens, private object keys, SQL,
or another user's workspace existence.

## Acceptance Criteria

- [ ] Approval fails before writes on actor, state/version, revision, bundle,
      receipt, preview, capability, native-permission, or live-baseline drift.
- [ ] The singleton installation activation lock plus durable workspace lease
      and fence serialize all promotion/expiry
      races and recover after bounded owner loss.
- [ ] Every supported native adapter joins one product transaction; unsupported
      adapters are visibly unavailable before approval.
- [ ] Canonical rows, ledger, ownership transfer, workspace promotion state,
      complete generation mapping/artifacts, audit/checkpoint, invalidation
      outbox, and active-generation pointer commit atomically.
- [ ] Normal Admin/public/search/cache readers capture one active generation;
      concurrent old/new requests see complete old or complete new state, never
      a mixed site.
- [ ] The uninterrupted caller invokes and awaits TASK-551
      `applyAfterCommit(plan)` after commit; recovery may replay the same stable
      event key at least once, while effects remain idempotent/effectively-once.
      No domain code calls epoch/fence/generation primitives directly.
- [ ] Idempotent replay returns the committed result; key reuse for another
      tuple conflicts; no resource is duplicated.
- [ ] Reject/expiry deletes only workspace-owned rows/private objects and never
      canonical or ownership-transferred resources.
- [ ] Backup includes recoverable Designer drafts/revisions/graphs/artifacts/
      decisions but excludes tokens, leases, quarantine, transient provider/
      tool bodies, and credentials.
- [ ] Restore never auto-resumes generation or promotion and resets ambiguous
      nonterminal state to explicit review/reconciliation.
- [ ] Fault injection proves deterministic resume-or-compensate at every
      checkpoint with no partially visible canonical site.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer
set -a && source .env && set +a && bun test tests/integration/designer tests/integration/routes/designer*.test.ts \
  tests/security/designer*.test.ts tests/unit/backups/designer*.test.ts
# TASK-414-11-L01 runs the closure-owned task-414 fast/certification smoke
# with the exact seven Designer scenarios handed off by TASK-414-09-L03.
git diff --check
```

## Documentation Updates Required

Provide final operator/user docs for approval conflicts, adapter availability,
lease/recovery diagnostics, reject/expiry retention, backup inclusion/exclusion,
restore review, and cache/outbox behavior to TASK-414's closure leaf. Do not
edit task indexes or changelog 1266 here.
