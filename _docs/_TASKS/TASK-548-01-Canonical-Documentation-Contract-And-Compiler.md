# TASK-548-01: Canonical Documentation Contract and Compiler
# FileName: TASK-548-01-Canonical-Documentation-Contract-And-Compiler.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Documentation Platform / Contracts / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-109, TASK-403
**Status:** ⏳ To Do

---

## Overview

Replace the current Markdown-only, path-identified assistant input with one
strict, versioned documentation contract and one deterministic compiler.
`docs/guide/` remains the sole authored end-user source and the sole corpus
eligible for assistant retrieval. The resulting bundle is the common input for
the embedded Admin Help surface, the existing DB-only assistant reindex, and the
end-user part of the static public documentation site.

The initial compiler excludes `docs/develop/`. A future explicit public-only
feed may reuse these contracts as a separate developer collection, but it must
never be merged into assistant retrieval.
This child creates no Designer/canvas implementation and no runtime dependency
on an AI provider.

**Single-writer ownership:** this child owns the shared documentation types,
schemas, normalizers, compiler, generated distribution bundle, assistant-ingest
v2 migration and their focused tests. TASK-548-02 owns capture scenarios,
screenshots and visual receipts; downstream Help/portal children only consume
the bundle. TASK-548-01-L02 is the exclusive whole-family writer of
`core/generated/docs/coderso-docs-v2.json`, including the orchestrated
post-pilot refresh after TASK-548-02-L02 and final regeneration handback after
TASK-548-06-L01 changes native sources and visuals. No other child redefines the
shared shapes or writes that generated final.

## Locked Contract

The canonical type names are `DocsCorpusManifestV2`, `DocsDocumentV2`,
`DocsSectionV2`, `DocsPermissionRequirementV1`, `DocsVisualV1`,
`DocsExampleV1` and `DocsDistributionBundleV2`. The root discriminator field is
exactly:

```ts
schema: "coderso.docs-corpus@v2";
```

`publicationTargets` is a non-empty, duplicate-free array whose values are
exactly `assistant | embedded-help | public-docs` and whose canonical output
order follows that enum order. Stable authored keys are `docId`, `sectionId`,
`visualId` and `exampleId`. Documents also carry a BCP-47 `locale`, SemVer
`productVersionRange`, stable `slug`, canonical nullable `adminPath`,
`permissionRequirement: DocsPermissionRequirementV1 | null`, bounded
`capabilityIds` and publication targets. `DocsPermissionRequirementV1` is
exactly `{ mode: "allOf" | "anyOf"; permissions: string[] }`; its permissions
are non-empty, unique, canonically sorted and validated against the live
catalog. `capabilityIds` is unique, canonically sorted and validated against the
code-owned documentation capability catalog. Consumer URLs are derived from
those fields; authors never enter embedded-help or public-site links.

Targets are enforced by each consumer, not treated as descriptive metadata.
Assistant persistence/retrieval includes only documents containing `assistant`;
embedded Help search/render includes only documents containing `embedded-help`;
the portal includes only documents containing `public-docs`. A record lacking a
consumer's target cannot leak into that consumer even when all other fields
match.

The authored layout is:

```text
docs/guide/
  corpus.manifest.json
  **/*.md
  examples/<docId>/<exampleId>.json
  assets/scenarios/<docId>/<visualId>.json
  assets/images/<docId>/<visualId>.png
  assets/receipts/<docId>/<visualId>.json
core/generated/docs/coderso-docs-v2.json
```

`core/generated/docs/coderso-docs-v2.json` is generated, deterministic and
reviewed through a regenerate-and-diff gate. It is not a second authored source.
The compiler fingerprints the root manifest, every included Markdown document,
example, scenario, promoted PNG and receipt. It rejects missing/orphan assets
instead of silently omitting them.

Markdown uses a closed safe subset: headings, paragraphs, emphasis, ordered and
unordered lists, safe links, inline code, fenced code blocks, bounded
non-nesting callouts and bounded pipe tables. TASK-548-01-L01 owns the exact
callout/table token shapes and parser rules; consumers may not widen them. Raw
HTML, Markdown images, dangerous URL schemes, traversal, remote image URLs,
duplicate IDs and unknown fields fail closed. Product screenshots are
referenced through strict visual records, never arbitrary Markdown URLs.

## Security Contract

- **Endpoint visibility:** no new endpoint. The compiler is local/build-time.
  Existing `POST /assistant/reindex` remains an internal admin endpoint.
- **Auth/RBAC:** reindex remains authenticated session +
  `settings:write`; compiled files do not weaken document-level
  `permissionRequirement`. `allOf` requires every listed permission; `anyOf`
  requires at least one. Null means no document-level restriction beyond the
  owning route.
- **CSRF/rate limit:** reindex remains CSRF-protected and in the `assistant`
  bucket. Compiler commands have no HTTP boundary.
- **Validation:** reject unknown fields recursively; validate BCP-47, SemVer,
  IDs, permissions, canonical paths, path confinement, hashes, media bounds and
  the safe Markdown subset before emitting bytes or starting a DB transaction.
- **Anti-abuse:** nonce/HMAC and CAPTCHA are not applicable because there is no
  public write. Apply byte/count/depth/string/diagnostic caps to source and
  bundle compilation.
- **Privacy/secrets:** reject credentials, tokens, PII fixture values,
  credential-bearing URLs and external image dependencies. Binary assets stay
  packaged files, never DB blobs.

## Implementation Shape

```ts
const result = await compileDocsCorpusV2({ root: "docs/guide" });
await assertDeterministicBundleBytes(result.bundleBytes);
await promoteDocsArtifactPair(result);
await assertGeneratedBundleBytesEqual(result.bundleBytes);
await ingestDocsDistributionBundleV2(result.bundleBytes, {
  actorId,
  expectedSourceHash: result.bundle.sourceHash,
});
```

Data flows from strict local sources through normalization, referential and
security validation, canonical sort and SHA-256 hashing into one compile result.
The exact same `result.bundleBytes` drive determinism comparison, pair promotion,
post-write byte verification and the v2 ingest API; no consumer reserializes the
normalized object. Local Help and public builds consume that byte contract.
Runtime assistant retrieval consumes only the atomically persisted DB snapshot;
it does not read Markdown or call an external documentation service per
question.

Machine-readable failures use the bounded `docs_corpus_*`/`docs_compile_*`
families plus exactly `assistant_docs_bundle_invalid`,
`assistant_docs_ingest_failed`, `assistant_docs_reindex_conflict`, and
`assistant_docs_db_unavailable`; diagnostics contain no source body, credential
or fixture-value echo.

## Sub-Tasks

| Task | Scope | Single writer | Depends on |
| --- | --- | --- | --- |
| TASK-548-01-L01 | Strict shared schemas, stable identity and safe Markdown policy | `core/services/documentation/docsCorpus*`, root manifest/template and focused contract tests | None |
| TASK-548-01-L02 | Deterministic compiler, legacy compatibility adapter, canonical migration report and generated bundle; no authored corpus edits | compiler modules, `scripts/docs/compile-corpus.ts`, generated bundle/report and compiler tests | TASK-548-01-L01 |
| TASK-548-01-L03 | Assistant DB schema/migration, atomic bundle ingest, v1 compatibility and centralized reindex error mapping | assistant schema/ingest/startup modules, the existing assistant route error mapper, migration artifacts and focused DB/runtime tests | TASK-548-01-L02 |

Land strictly in table order. TASK-548-02 starts only after TASK-548-01 is
green, then adds canonical visuals without changing these shared shapes. After
TASK-548-02-L02 writes the five pilot triples, that stream pauses for exactly
one same-owner TASK-548-01-L02 refresh/gate before 02-L03 or 03 starts. After
TASK-548-06-L01 edits final native sources/visuals, orchestration pauses 06 for
exactly one final same-owner TASK-548-01-L02 regeneration/gate of
`core/generated/docs/coderso-docs-v2.json` plus the canonical migration report.
TASK-548-06 resumes `docs:check` and coverage only after that handback passes;
TASK-548-06 never writes the generated final.

## Acceptance Criteria

- Every ingestible English file currently under `docs/guide/` compiles through
  v2 with a stable identity; locale support is ready for Polish without claiming
  the Admin UI or corpus is fully localized.
- Identical source bytes produce byte-identical bundle bytes and SHA-256 on
  repeated builds, independent of filesystem order, absolute path or wall clock.
- TASK-548-06's native-v2 rewrite must preserve normalized semantic records and
  stable IDs from L02's report. Because authored bytes change, `sourceHash` must
  change deterministically; cross-representation bundle byte equality is not an
  acceptance condition.
- `assistant`, `embedded-help` and `public-docs` consume the same normalized
  records; `docs/develop` never enters assistant retrieval.
- A failed compile or DB reindex leaves the previous complete assistant corpus
  available; no mixed v1/v2 partial snapshot is observable.
- There is no runtime filesystem fallback, per-question remote fetch, new docs
  API or DB storage of screenshots.
- All touched human-authored production/test files are at most 1,000 physical
  lines; legacy oversized files are split by responsibility before modification.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/assistantDocsIngestV2.test.ts tests/integration/routes/assistant-reindex-v2.test.ts` when `DATABASE_URL` is reachable
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- deterministic two-build byte/hash comparison and touched-file line counts

## Documentation Updates Required

Provide verified contract and migration deltas to TASK-548-07-L01, the sole
closeout-documentation writer, for
`_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`,
`_docs/SECURITY_SPEC.md`, `docs/develop/assistant.md` and
`docs/guide/README.md`. This child does not edit those shared closeout files.
