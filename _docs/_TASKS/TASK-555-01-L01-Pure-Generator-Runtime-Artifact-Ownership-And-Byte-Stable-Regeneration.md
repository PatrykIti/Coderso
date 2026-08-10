# TASK-555-01-L01: Pure Generator Runtime Artifact Ownership and Byte-Stable Regeneration
# FileName: TASK-555-01-L01-Pure-Generator-Runtime-Artifact-Ownership-And-Byte-Stable-Regeneration.md

**Parent Subtask:** TASK-555-01
**Priority:** High
**Category:** Release Artifact / Generator / Determinism
**Estimated Effort:** Medium
**Dependencies:** terminal TASK-547; parent start receipt proving terminal TASK-545,
terminal TASK-548, and tracked HEAD-identical `_docs/_workflows/task-555-implement.mjs`
**Status:** ⏳ To Do

---

## Overview

Make a byte-identical copy of the terminal TASK-547 FormaDom package available
under `core`, which the production image already ships, and make that path the
immutable release artifact for `formadom-studio@1.0.0`. Preserve the existing
`_docs/_DEMO` file only as a generated compatibility mirror for the trusted local
TASK-547 CLI/docs. One pure generator invocation must reproduce both files exactly.

The initial runtime artifact is not a content rewrite. It is exactly 288,066 bytes
with SHA-256
`307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870`.
Changing any package byte requires a new release directory/version and a contract
amendment; implementation must not silently regenerate different `1.0.0` bytes.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `scripts/projekty-domow/package.ts`;
- `scripts/demo-projekty-domow.tsx`;
- `core/assets/curated-starters/formadom-studio/1.0.0/site-package.json` (new,
  generated artifact);
- `_docs/_DEMO/projekty-domow.site.json` (generated compatibility mirror only);
- `tests/vitest/kits/projekty-domow-package.test.ts`; and
- `tests/vitest/kits/formadom-runtime-artifact-generation.test.ts` (new).

The generated JSON files are exempt from the 1,000-line human-authored file gate.
No other `scripts/projekty-domow/**` source is edited; its terminal content builders
remain the package inputs.

## Dependencies and Land Order

First implementation leaf for TASK-555. After it passes, hand the immutable artifact
path/bytes to TASK-555-01-L02. L02/L03 may read but never rewrite these package bytes.

## Forbidden Paths

- `_docs/_TASKS/TASK-414*`, `TASK-489*`, `TASK-545*`, `TASK-547*`, `TASK-548*`,
  `TASK-551*`, `TASK-554*`;
- `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/**`, and all workflow/smoke files,
  including the read-only tracked TASK-555 bootstrap;
- `Dockerfile`, runtime loaders, route/UI/client source, and every other TASK-555
  leaf's ownership;
- owner dirty `.gitignore`, `AGENTS.md`, and unrelated `_TMP-*` files.

## Security Contract

- **Endpoint visibility:** none.
- **Auth/RBAC/CSRF/rate limit:** not applicable.
- **Validation:** generation ends in `normalizeFullSitePackageForWrite` and
  `buildReferencePlan`; output must be strict JSON and byte-equal to the pinned
  release.
- **Anti-abuse:** no public input, nonce, HMAC, or CAPTCHA. Generator input is only
  checked-in source modules.
- **Secrets:** generated content must keep TASK-547 secret/binary/remote-media
  rejection; no environment data enters output.

## Implementation Pseudocode

```ts
export const FORMA_DOM_RUNTIME_ARTIFACT_URL = new URL(
  "../../core/assets/curated-starters/formadom-studio/1.0.0/site-package.json",
  import.meta.url,
);
export const FORMA_DOM_COMPATIBILITY_MIRROR_URL = new URL(
  "../../_docs/_DEMO/projekty-domow.site.json",
  import.meta.url,
);

export async function serializeFormaDomPackage(): Promise<string> {
  const normalized = buildFormaDomPackage();
  buildReferencePlan(normalized);
  return formatCanonicalJson(normalized, FORMA_DOM_RUNTIME_ARTIFACT_URL);
}

async function writeFormaDomArtifacts(): Promise<void> {
  const bytes = new TextEncoder().encode(await serializeFormaDomPackage());
  assertExactRelease(bytes, {
    byteLength: 288066,
    sha256: "307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870",
  });
  await atomicReplace(FORMA_DOM_RUNTIME_ARTIFACT_URL, bytes);
  await atomicReplace(FORMA_DOM_COMPATIBILITY_MIRROR_URL, bytes);
  await assertPairByteIdentity();
}
```

`formatCanonicalJson` may continue using development-only Prettier; runtime never
imports it. Each `atomicReplace` writes a sibling task-scoped temporary regular file,
fsyncs/closes it, renames it, and removes leftovers on failure. The command writes
the runtime artifact first and mirror second. The pair is not atomic across paths;
`assertPairByteIdentity` prevents a half-updated tree from passing review.

## Data Flow

Checked-in pure FormaDom builders -> strict package normalization -> reference graph
validation -> canonical serialization -> pinned byte/digest assertion -> atomic
runtime artifact + compatibility mirror -> byte-equality tests.

## Error Handling

- Package/schema/reference drift retains TASK-547 machine codes where available.
- Any byte-count/digest difference throws `formadom_release_bytes_changed` and writes
  neither accepted release update nor task metadata.
- File open/write/fsync/rename failure returns nonzero, redacts absolute paths in
  user-facing output, and leaves no accepted partial result.
- A mirror mismatch fails tests; it never changes runtime fallback behavior because
  runtime does not read the mirror.

## Regression Tests

- Generated string, runtime artifact, and compatibility mirror are byte-identical.
- Exact bytes/digest/count are pinned.
- Parsed artifact normalizes idempotently and builds the same reference plan.
- Package key, `metadata.name`, locale, eight scenario IDs, resource counts, shell
  settings, and exact seven residual IDs remain unchanged.
- Reordered keys/alternate formatting, trailing newline drift, one-byte mutation,
  truncation, and changed generator content fail the immutable-release assertion.
- Generator imports no DB, server, provider, assistant, browser, or network module.

## Testing Requirements

```bash
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/projekty-domow-package.test.ts \
  tests/vitest/kits/formadom-runtime-artifact-generation.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
sha256sum core/assets/curated-starters/formadom-studio/1.0.0/site-package.json \
  _docs/_DEMO/projekty-domow.site.json
wc -c core/assets/curated-starters/formadom-studio/1.0.0/site-package.json \
  _docs/_DEMO/projekty-domow.site.json
git diff --check
```

Before handoff, every modified human-authored source/test file above must be at most
1,000 physical lines via `wc -l`; generated JSON is exempt.

## Documentation Updates Required

None in this leaf. TASK-555-07-L01 documents the runtime artifact and compatibility
mirror before runtime smoke. TASK-555-07-L03 remains closure metadata only.
