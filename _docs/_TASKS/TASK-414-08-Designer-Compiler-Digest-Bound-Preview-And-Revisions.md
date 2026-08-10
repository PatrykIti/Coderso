# TASK-414-08: Designer Compiler, Digest-Bound Preview, and Revisions
# FileName: TASK-414-08-Designer-Compiler-Digest-Bound-Preview-And-Revisions.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Designer / Compiler / Preview
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-07 terminal; TASK-414-03 provider/model capability
leaves terminal; TASK-414-04 private attachment leaves terminal;
TASK-547-01-L01, TASK-547-01-L02, and TASK-547-02-L01 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Turn a bounded Designer brief and trusted private input projections into an
immutable staged site revision, strict validation receipt, and navigable
digest-bound preview. Prompt-model output and later registered prepared-private-
source projections are untrusted proposal material. The
backend recompiles it through the terminal TASK-547 package schema, pure
reference plan, canonical serialization/fingerprint seams, safe native
normalizers, and Designer capability policy before any staging row exists.

This family consumes only TASK-547 terminal source commit
`a13d186167a05901e644bf1a3a7aefee6f780471`, landed through merge
`963733cae23456622bea1eef1b734723aaab2350`. Any later change to an imported
export invalidates the freeze and requires a contract amendment plus fresh
reconcile before implementation; unmerged worktree bytes are never authority.

## Locked Trust Pipeline

```text
user brief + scanned private projections
  -> strict Designer brief normalizer
  -> one exact materialization-source branch:
       prompt_ai -> exact provider/model/config/input-policy binding
       prepared_private_source -> static adapter binding + source-owned fence
  -> shared untrusted strict semantic draft
  -> backend compiler/policy/native normalization
  -> strict DesignerSiteBundleV1 (terminal FullSitePackageV1 core + typed
     sidecars) + merged graph + plan
  -> Designer-only staged rows
  -> immutable validation receipt
  -> digest-bound no-store/noindex preview
```

No provider or import response may supply trusted IDs, permissions, URLs, route mounts,
storage keys, native document discriminators outside allowlists, approval
facts, validation results, or executable adapter instructions.

## Digest Binding

Every ready revision binds the same tuple:

```text
workspaceId
workspaceVersion
revisionId/revisionNumber
briefDigest
corePackageDigest + sidecarSetDigest + designerSiteBundleDigest
stageGraphDigest
installPlanDigest
validationReceiptDigest
previewDigest
compilerVersion
capabilityManifestDigest
```

Canonical bytes are domain-separated and versioned. Revisions never mutate;
any user-requested change creates a new revision and invalidates all prior
preview sessions before the new revision becomes active.

## Sub-Tasks

1. `TASK-414-08-L01` owns strict brief/provider-draft contracts, exact
   provider capability selection, multimodal projection selection, run claims,
   and transient provider invocation.
2. `TASK-414-08-L02` owns compilation to `DesignerSiteBundleV1` without
   widening terminal `FullSitePackageV1`, the strict sidecar registry, merged
   graph/plan validation, the closed materialization-source registry, immutable
   validation receipts, and transactional Designer-stage materialization.
3. `TASK-414-08-L03` owns revision orchestration, deterministic preview
   artifacts, and the same-origin Admin preview-session implementation behind
   TASK-414-07-L02's frozen facade/routes, plus revocation and preview/revision
   UI. It exports no second route factory.

No child writes canonical CMS rows or mounts shared routes/navigation. Final
composition and mounts remain TASK-414-09-L03 ownership.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Generation, revision, preview-session management, and staged preview reads are internal under `/admin/api/designer/*`; no public/cross-host preview route exists in v1. |
| Authentication | Every preview read requires the same-origin authenticated Admin session, server-derived actor, owner check, consumed one-time bind secret, server-side Admin-session binding, and exact workspace/revision/version/digests. The path `previewSessionId` is nonauthorizing. |
| RBAC | Reads/preview require `designer:read`; generation/revision requires `designer:write`; this family performs no promotion. Native validation computes the later required-permission union without granting it. |
| CSRF | Every internal generation, input, revision, preview-session creation, or one-time binding POST requires shared CSRF before body parsing. Preview GET/HEAD requests are side-effect free, carry no secret, and expose no public write. |
| Rate limits | Generation uses `designer-generation` plus per-actor/workspace concurrency and provider budgets. Preview session creation/read uses `designer-preview`. Ordinary metadata reads retain `admin_read`. |
| Validation | Recursive reject-unknown schemas, strict multipart projection references, bounded strings/graphs/resources/routes/provider output, TASK-547 normalizers, and exact digest/version comparisons apply before persistence/rendering. |
| Anti-abuse | No public write, so nonce/HMAC and reCAPTCHA do not apply. Same-origin preview uses Admin auth/RBAC, a constant-time one-time bind-secret hash check, short TTL, exact server-side Admin-session/digest binding, revocation, no redirects, no-store/noindex, CSP, and bounded route/asset reads. |

Provider keys, raw bodies, private input bytes, one-time preview bind secrets,
and transient tool material remain absent from URLs, logs, browser persistence,
screenshots, caches, validation receipts, and backup artifacts. The bind secret
exists in client memory only between the no-store creation response and immediate
CSRF binding POST, then is discarded.

## Acceptance Criteria

- [ ] Generation refuses unknown/stale model capabilities and lacks any
      prompt-only or model-name-inference fallback.
- [ ] Provider output is reparsed and rebuilt by backend owners; no untrusted
      validation claim or native identifier survives by assertion.
- [ ] Prompt AI compares all exact provider execution fields; a prepared
      private source has no fake provider and can materialize only through a
      statically registered pre-I/O plus transaction-lock verifier.
- [ ] Staged resources remain absent from canonical CMS tables, normal queries,
      search, cache, and public runtime.
- [ ] One transaction materializes a complete stage graph and ready revision or
      leaves no partial graph and records a bounded failed state.
- [ ] Validation receipt, package, plan, stage graph, and preview digest all bind
      the exact same workspace version/revision.
- [ ] Navigable preview resolves only staged routes/assets and emits
      `no-store` plus `noindex` on every response.
- [ ] A revision immediately revokes older preview access and leaves old
      revision bytes immutable for review/diff.
- [ ] The raw one-time bind secret never enters a URL, browser persistence, log,
      cache, task evidence, or screenshot; it is consumed once into the current
      Admin-session binding. Invalid/revoked bindings fail uniformly, the path ID
      grants nothing, and no public preview route exists.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer
set -a && source .env && set +a && bun test tests/integration/designer tests/integration/routes/designer-preview.test.ts \
  tests/security/designerPreview.security.test.ts
bun run check:admin-boundary
git diff --check
```

## Documentation Updates Required

Give the closure leaf the final brief/input limits, supported capability
matrix, compiler/receipt versions, preview security model, revision semantics,
and user-facing preview/revise flow. Do not edit changelog 1266, task indexes,
or public docs in this family.
