# TASK-555-01: Runtime Curated Artifact and Release Registry
# FileName: TASK-555-01-Runtime-Curated-Artifact-And-Release-Registry.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Release Artifacts / Solution Kits / Docker
**Estimated Effort:** Large
**Dependencies:** terminal TASK-548 source/generator handoff; terminal rewritten
TASK-489; terminal TASK-547; terminal TASK-545 plus the tracked HEAD-identical
TASK-555 workflow bootstrap required by the parent
**Status:** ⏳ To Do

---

## Overview

Move FormaDom from a development-only `_docs/_DEMO` artifact to an immutable,
runtime-shipped release while keeping byte-stable regeneration and CLI compatibility.
Define the one strict server registry that models legacy catalog kits and full-site
packages as different provider variants, then prove production runtime can load only
literal registered artifacts with release/core/digest integrity.

This subtask owns no Admin/API behavior and never calls a provider. The current
FormaDom `1.0.0` bytes remain exactly 288,066 with SHA-256
`307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870`.
That artifact hash is distinct from terminal TASK-547 package fingerprint
`418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470`,
reference-source digest
`d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`,
and the domain-separated release descriptor/catalog-definition digests owned by L02.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-01-L01 | pure generator, runtime artifact, byte-stable regeneration | ⏳ To Do |
| 2 | TASK-555-01-L02 | strict release manifest, version/core range/digest, provider registry | ⏳ To Do |
| 3 | TASK-555-01-L03 | runtime loader, Docker inclusion/integrity, no arbitrary source | ⏳ To Do |

Land strictly `L01 -> L02 -> L03`. L01 owns artifact bytes; L02 owns release metadata
and registry identity; L03 consumes both without rewriting them.

## Architecture Invariants

- FormaDom is stored as `FullSitePackageV1`, never as `SolutionKitDefinition`.
- The registry provider union is closed to `solution-kit` and
  `full-site-package`; no generic callback/module/path provider exists.
- Runtime artifact location is literal module data selected only after registry-ID
  validation. Environment/request values cannot select a path or URL.
- Runtime verifies core range, exact bytes, SHA-256, strict manifest, strict package,
  package key, and fingerprint before DB access.
- L03 exports the sole production-safe async immutable release accessor reserved for
  post-terminal TASK-556 and verifies all registered runtime artifacts before
  migrations or any DB work.
- `_docs/_DEMO/projekty-domow.site.json` may remain only as a byte-identical
  compatibility mirror for the terminal TASK-547 CLI/docs. Runtime never reads it.
- A change to immutable `1.0.0` bytes is rejected. Product changes allocate a new
  release directory/version and update the registry explicitly.

## Security Contract

- **Endpoint visibility:** none.
- **Auth/RBAC/CSRF/rate limit:** not applicable; this is build/runtime artifact
  infrastructure below the internal routes.
- **Validation:** strict manifest and full-site package normalizers reject unknown
  fields; digest/core compatibility fail closed.
- **Anti-abuse:** no public input, nonce, HMAC, or CAPTCHA. The only source selector
  is a server registry ID.
- **Secrets:** artifacts/manifests contain no credentials, URLs used as import
  sources, raw media, or provider data.

## Collision Guard

No leaf may edit TASK-414/489/545/547/548/551/554 task files, changelogs 1260/1263/
1266/1267/1268, board/changelog indexes, assistant/provider code, or another leaf's
owned source/tests. The already-tracked TASK-555 workflow bootstrap is read-only to
all product leaves. TASK-547 files are historical read-only evidence. L03 waits for
any active Docker/release writer and rereads `Dockerfile` before editing.

## Testing Requirements

- Vitest for pure generator/manifest/registry contracts.
- Bun for filesystem/runtime loader and production-path behavior.
- Docker build/image boot when available; otherwise retain the CI-only limitation.
- Core/repo lint and typecheck, focused tests, line counts, and `git diff --check` per
  leaf.

## Documentation Updates Required

TASK-555-07-L01 documents release/runtime ownership in `_docs/SOLUTION_KITS.md`,
`_docs/RELEASE_PROCESS.md`, and `docs/develop/full-site-packages.md` before runtime
smoke. TASK-555-07-L03 remains closure metadata only. This subtask does not edit
closure docs or indexes.
