# TASK-556-02: Static Package Staging Compiler and Receipt
# FileName: TASK-556-02-Static-Package-Staging-Compiler-And-Receipt.md

**Parent Task:** TASK-556
**Priority:** High
**Category:** Designer / Compiler / Staging / Receipt
**Estimated Effort:** Very Large
**Dependencies:** External gate from TASK-556; TASK-556-01 landed receipt green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Consume TASK-555's asynchronous verified immutable release accessor, compile the
unchanged TASK-547 package outside DB transactions through exactly one additional
terminal Designer validation pass, then atomically materialize a Designer-only
stage and timestamp-independent receipt.

## Sub-Tasks

| Order | ID | Scope | Status |
|---:|---|---|---|
| 1 | TASK-556-02-L01 | Async release contribution and static compiler branch | ⏳ To Do |
| 2 | TASK-556-02-L02 | Transaction B, receipt replay, ready CAS, failure terminalization | ⏳ To Do |

L01 consumes the complete TASK-556-01 receipt; L02 consumes L01's reviewed receipt.

## Locked Contract

- Await TASK-555 release loading outside transactions; verify `artifactSha256`,
  TASK-547 `packageFingerprint`, and TASK-555 `releaseDescriptorDigest` separately.
- Designer contribution/registry/compiler versions affect only `bindingDigest`
  and later receipt facts; no Designer fact changes an upstream identity.
- Consume TASK-555's literal `formadom-studio@1.0.0` accessor result without an
  invented `releaseId` projection. The accessor already performs one normalize/
  reference validation. Only Transaction A's dispatch owner passes its frozen
  package through exactly one additional terminal Designer compiler-side
  normalize/canonical-byte/fingerprint/reference-plan pass and proves the
  accessor object unchanged. No stage/receipt path performs a third pass; a
  unique-race loser performs only the upstream accessor pass.
- The immutable accessor snapshot contains upstream release/package facts only.
  Transaction A supplies the compiler with the stored normalized generation-run
  `static_brief`, brief digest, contribution/registry/compiler versions, and full binding identity for
  takeover/retry. Current registry/compiler facts are used only for new and
  promoted-fork dispatches.
- Carry the registry-owned canonical `designerBriefDigest` through binding,
  generation subtype, revision, compiler, and validation-receipt evidence without
  changing any TASK-555/TASK-547 identity.
- Existing TASK-414 bundle/graph/native-stage/preview/promotion seams are reused.
- The service resolves exact retained replay before release I/O. Transaction B
  validates immutable run identity first, then reads the run-bound receipt under
  lock. Exact ready receipt replay returns before live-fence/current-pointer/not-
  ready checks; those checks run only when the receipt is absent. Replay never
  reloads/rebuilds.
- Every success returns operation outcome and workspace projection from the same
  final locked snapshot; no unlocked post-transaction workspace reload exists.
- Deterministic compile failure terminalizes the run safely; crashes remain resumable.
- No canonical installer, direct-install, provider, Agent, or `site-kit.*` call.

## Security Contract

- **Visibility:** internal service only; staged rows private.
- **Auth/RBAC:** exact owner/fenced claim; route and promotion authorize separately.
- **CSRF/rate:** upstream POST owns CSRF and the shared `admin_write` policy.
- **Validation:** release/package/binding/claim/CAS/receipt equality and terminal native validators.
- **Anti-abuse/privacy:** no public write or external input; no sensitive bodies/paths in diagnostics.

## Testing Requirements

Run leaf-focused Vitest/Bun/PostgreSQL lanes, including
`tests/perf/designerStaticStarterStage.test.ts` without competing load, terminal
owner regression suites, source-import guards, strict scan, lint/types, diff
check, and line-count gate.

## Documentation Updates Required

Hand final compiler/receipt/protocol/isolation evidence to TASK-556-04-L02 only.
