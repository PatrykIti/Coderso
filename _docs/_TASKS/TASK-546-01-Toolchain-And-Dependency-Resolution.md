# TASK-546-01: Toolchain and Dependency Resolution

# FileName: TASK-546-01-Toolchain-And-Dependency-Resolution.md

**Parent Task:** TASK-546
**Priority:** High
**Category:** Toolchain / Dependencies / Supply Chain
**Estimated Effort:** Medium
**Dependencies:** TASK-546 contract audit PASS
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope

Resolve the repository against Node.js `26.5.0`, Bun `1.3.14`, and the latest
mutually compatible stable dependency graph. Update active root/core/SDK/store
contracts and the tracked standalone `_docs/_PROTOTYPE` package, pin immutable
CI actions and scanner tooling, align both Docker stages, and regenerate every
owned Bun lockfile reproducibly.

This subtask does not repair production compatibility regressions or close the
task family. Its executable leaf updates hardcoded version-contract tests and
version-pin documentation together with the pins they assert.

## Leaf

| ID | Title | Status |
|---|---|---|
| TASK-546-01-L01 | Upgrade Manifests, CI, Docker, and Lockfile | ✅ Done |

## Ownership

TASK-546-01-L01 is the sole TASK-546 writer for dependency manifests and locks,
Node/Bun package metadata, Docker and CI dependency pins, version-pin tests, and
the version-specific release/testing/gate documentation enumerated in the leaf.
TASK-546-02 may consume the landed graph but must not re-resolve or downgrade it.

The tracked `_docs/_PROTOTYPE` is not a root workspace member, but it is in the
user-requested full-repository upgrade scope and therefore has an independently
regenerated and frozen-verified lockfile.

## Security Contract

- **Endpoint visibility:** no endpoint or route registration changes.
- **Auth/RBAC/CSRF:** current session, API-key, permission, CSRF, and public-write
  controls remain unchanged.
- **Rate limits/anti-abuse:** no bucket, nonce, signature/HMAC, captcha, or
  abuse-control behavior changes.
- **Validation:** schemas and reject-unknown behavior remain unchanged.
- **Supply chain:** CI actions use verified full commit SHAs; no floating action
  refs, scanner exceptions, credential output, or lockfile hand-edit is allowed.
- The resolved root graph must contain `fast-uri@3.1.4` or newer within Ajv's
  admitted 3.x range and must contain no `fast-uri@3.1.2` occurrence.

## Validation and acceptance

The leaf must prove registry selection, peer/engine compatibility, both frozen
installs, updated pin tests/docs, static Docker consistency, and absence of the
two reported `fast-uri` HIGH findings. Compatibility repair and broad gates land
only after this subtask is complete.
