# TASK-545-03-L01: Define and Validate Smoke Evidence Manifests

# FileName: TASK-545-03-L01-Define-And-Validate-Smoke-Evidence-Manifests.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Schema / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L02, TASK-545-02-L02
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1257 (pinned; closure only)
**Split:** 2026-08-13 — scope A retained here; checkpoint/resume → TASK-545-03-L03, closure metadata/delta + `closure-delta` CLI → TASK-545-03-L04, TASK-548 bootstrap gate → TASK-545-03-L05

---

## Overview

Define and validate the strict runtime-smoke evidence manifest and
visible-evidence result extension while consuming the shared smoke runner.
This leaf owns ONLY the manifest schema, validator, report-side
visible-evidence contract, and evidence-directory revision digest surface
(scope A below). The checkpoint/resume, closure metadata/delta, and TASK-548
bootstrap machinery originally in this file were split out on
2026-08-13 after a fresh-context GLM audit found this leaf had no
implementation for them and the shared `smoke-evidence.mjs` module could not
absorb them within the 1,000-line gate. Those scopes now live in
TASK-545-03-L03 (checkpoint/resume), TASK-545-03-L04 (closure metadata/delta),
and TASK-545-03-L05 (TASK-548 bootstrap gate); this leaf keeps only the
manifest/validator/visible-evidence surface and its tests.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `_docs/_workflows/smoke-evidence.schema.json`
- new `_docs/_workflows/lib/smoke-evidence.mjs`
- new `_docs/_workflows/lib/smoke-evidence.d.mts`
- existing `scripts/runtime-smoke/adapters/types.ts`, only for the generic
  backward-compatible visible-evidence result extension below
- new `scripts/runtime-smoke/visible-evidence.ts`
- new `tests/unit/workflows/smokeEvidence.test.ts`
- new `tests/unit/runtime-smoke/visible-evidence.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/`

Because the schema, runtime, and declaration live below the globally
ignored workflow tree, all three are explicit owner-review/force-track artifacts.
The checkpoint schema JSON and the module's checkpoint/resume exports
(`SMOKE_CHECKPOINT_SCHEMA_VERSION`, `requireCheckpoint`) are forward-boundary
artifacts consumed by TASK-545-03-L03; L01 ships the module with those exports
only as a shared foundation, and L03 owns their contract, tests, and any
further checkpoint-specific schema/CLI surface.
The implementing agent returns their exact normalized paths and SHA-256 values
and stops; a fresh invocation proves tracked regular-file, no-symlink, clean
worktree, and `git show HEAD:<path>` byte parity before any workflow imports
them. A pre-existing ignored lookalike is rebuilt and cannot authorize itself.
This leaf is the sole owner of these artifacts; TASK-545-03-L02 owns `.gitignore`
and evidence-guidance only.

## Manifest contract

Each UI task writes
`_docs/_workflows/_smoke/evidence/task-###/<session>/manifest.json` from the
strict shared-runner report, with exact top/nested
keys and:

```json
{
  "schemaVersion": 1,
  "taskId": "TASK-540",
  "suiteId": "task-540",
  "profile": "certification",
  "session": "task-540-certification",
  "report": { "path": "report.json", "sha256": "64-lowercase-hex" },
  "revision": {
    "gitHead": "40-lowercase-hex",
    "workingTreeDirty": true,
    "workingTreeSha256": "64-lowercase-hex"
  },
  "generatedAt": "ISO-8601 UTC",
  "serverUp": true,
  "scenarios": [
    {
      "id": "stable-kebab-id",
      "title": "human title",
      "variants": [
        {
          "id": "dark-narrow",
          "surface": "admin",
          "theme": "dark",
          "viewport": { "width": 390, "height": 844 },
          "assertions": [
            {
              "kind": "computed-style",
              "target": "safe selector/description",
              "property": "display",
              "expected": "none",
              "actual": "none",
              "pass": true
            }
          ],
          "consoleErrors": []
        }
      ],
      "screenshots": [
        { "path": "stable-kebab-id.png", "sha256": "64-lowercase-hex" }
      ]
    }
  ]
}
```

At least five distinct scenario IDs are required. Every scenario has a non-empty
strict `variants[]`; variant IDs are unique within the scenario. Every variant
has non-empty visible assertions, zero console errors, an explicit
`admin|public` surface, and a valid viewport/theme. Every scenario has at least
one bounded screenshot/hash for human review; additional variant screenshots
are allowed but not required when machine-visible proof distinguishes them. If
any Admin surface is present, the manifest's variants must
collectively contain both Admin light and Admin dark. Profile-specific contracts
may require the same scenario in multiple theme/viewport variants without
inventing extra scenario IDs.
Assertion kinds are an enum:
`computed-style|geometry|dom-state|aria`. Mere control/rule/string presence is
not a valid visible assertion.

The shared runner report, not a task workflow or handwritten manifest, is the
sole authority for scenario pass state, title, variants, visible assertions,
variant console errors, and screenshot path/hash assignment. The generic
`SmokeScenarioResult` gains optional strict `title`, `variants`, and
`screenshots` fields so existing non-manifest adapters remain source-compatible.
Any suite entering this manifest lifecycle must provide all three, and every new
or substantially changed UI adapter must do so. `scripts/runtime-smoke/
visible-evidence.ts` owns their bounded recursive normalizer/builders; task-local
copies or report postprocessors are forbidden.

For a manifest-bearing report, the report's global `screenshots` array is
byte-equivalent, after canonical ordering, to the unique union of scenario-owned
screenshots. A screenshot belongs to exactly one scenario. Manifest generation
is a pure projection that drops only runtime-only elapsed/timing/cleanup fields;
it cannot add, rename, reinterpret, or mark passing a scenario, variant,
assertion, console result, or screenshot. `requireManifestEqualsRunnerReport`
requires exact ordered scenario IDs, every report `pass === true`, exact titles,
deep byte-equivalent variants/assertions/console arrays, exact scenario
screenshots, and exact global screenshot union. Missing report evidence,
manifest-only evidence, duplicate ownership, or any difference fails before
filesystem screenshot hashing.

`revision` is mandatory. `workingTreeSha256` is SHA-256 over a canonical stream made
from `gitHead`, sorted `git status --porcelain=v1 -z --untracked-files=all` records, and
for each changed/untracked path its status, normalized repository-relative path, mode,
and content hash (or deletion marker). The implementation derives the one exclusion from
the real Git repository root, `expectedTask`, and strict report-bound
`expectedSession` as
`_docs/_workflows/_smoke/evidence/task-###/<session>/`; callers cannot supply an evidence root.
Do not exclude source, tests, configuration, task contracts, runtime documentation, or
other dirty files.

Phase 1 additionally wrote a strict `resume-checkpoint.json` control file
beside the manifest in the pre-split contract; that surface moved to
[TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md)
(forward boundary, not owned here). This leaf's validator remains read-only
and never writes a checkpoint. The owning-entry derivation rules that guarded
the checkpoint (module `import.meta.url`, exact built-ins, canonical future
entry rule, `task-554-closeout.mjs` closeout-role guard, caller path override
rejection) are owned by L03; L01 only documents that they exist there.

The TASK-548 bootstrap exception uses the declaration-owned exact six-path
constant and receipt now owned by TASK-545-03-L05; this leaf only documents the
forward boundary. Its normalizer recursively rejects unknowns,
requires path-sorted constant membership, lowercase 40-hex `priorHead`/`head`
and lowercase 64-hex file/aggregate hashes, and recomputes the aggregate over
the checkpoint-compatible canonical JSON `{ priorHead, files }` with displayed
key order and one final LF. The authorization gate additionally proves
current HEAD equals `head`, is the single direct child of `priorHead`, its exact
diff is those six regular non-symlink paths, each tracked HEAD byte hash matches,
the worktree/index are clean for them, and the exact workflow static/import gates
pass. The receipt carries no root, timestamp, body, command output or override.

## Implementation Pseudocode

The named types below are real exports from the companion
`_docs/_workflows/lib/smoke-evidence.d.mts` declaration contract for
`smoke-evidence.mjs`; the declaration also types every runtime export used below.
This keeps the runtime file valid JavaScript while allowing consumers to import
the exact owner types from `./lib/smoke-evidence.mjs` without local substitutes.
Checkpoint/resume, closure metadata/delta, and TASK-548 bootstrap exports were
split out on 2026-08-13; see the pointer block after this code block.

```ts
// scripts/runtime-smoke/adapters/types.ts; optional only for legacy compatibility
export interface SmokeVisibleAssertionResult {
  readonly kind: "computed-style" | "geometry" | "dom-state" | "aria";
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: boolean;
}
export interface SmokeScenarioVariantResult {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly assertions: readonly SmokeVisibleAssertionResult[];
  readonly consoleErrors: readonly string[];
}
export interface SmokeScenarioResult {
  readonly id: string;
  readonly pass: boolean;
  readonly elapsedMs: number;
  readonly title?: string;
  readonly variants?: readonly SmokeScenarioVariantResult[];
  readonly screenshots?: readonly SmokeScreenshotResult[];
}
export function requireManifestableScenarioResults(
  scenarios: readonly SmokeScenarioResult[],
  globalScreenshots: readonly SmokeScreenshotResult[],
): readonly ManifestableSmokeScenarioResult[] {
  const normalized = scenarios.map(normalizeStrictManifestableScenario);
  assertExactUniqueScreenshotUnion(normalized, globalScreenshots);
  return Object.freeze(normalized);
}
export async function resolveCanonicalEvidenceDirectory(
  repoRoot,
  expectedTask,
  expectedSession
) {
  requireRepoTaskId(expectedTask); // TASK-[0-9]{3}, plus sole TASK-9999 sentinel
  requireRuntimeSmokeSessionName(expectedSession);
  const realRepoRoot = await requireRealGitTopLevel(repoRoot);
  const expected = join(
    realRepoRoot,
    "_docs/_workflows/_smoke/evidence",
    expectedTask.toLowerCase(),
    expectedSession
  );
  await rejectSymlinkedExistingComponents(realRepoRoot, expected);
  return expected;
}
export async function computeWorkingTreeRevision(
  repoRoot,
  expectedTask,
  expectedSession
) {
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(
    repoRoot,
    expectedTask,
    expectedSession
  );
  const gitHead = await readExactGitHead(repoRoot);
  const records = await readPorcelainRecords(repoRoot, { includeUntracked: true });
  const outsideEvidence = canonicalStatusRecords(records, {
    excludeStrictDescendant: evidenceRoot,
  });
  const canonical = canonicalRevisionStream(gitHead, records, {
    excludeStrictDescendant: evidenceRoot,
  });
  return {
    gitHead,
    workingTreeDirty: outsideEvidence.length > 0,
    workingTreeSha256: sha256(canonical),
    records: outsideEvidence,
  };
}
export async function validateSmokeEvidence(options) {
  requireExactExpectedRevisionAndRunnerOptions(options); // repo root, task, suite/profile/session, report, revision
  const root = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  const manifestPath = join(root, "manifest.json");
  await requireExactRealPath(dirname(manifestPath), root);
  if ((await stat(manifestPath)).size > MAX_MANIFEST_BYTES) fail("smoke_manifest_too_large");
  const raw = JSON.parse(await readFile(manifestPath, "utf8"));
  validateExactSchema(raw, smokeEvidenceSchema);
  if (raw.scenarios.length < 5) fail("smoke_scenarios_insufficient");
  if (!raw.serverUp) fail("smoke_server_down");
  if (raw.taskId !== options.expectedTask) fail("smoke_task_manifest_mismatch");
  requireRegisteredRuntimeSmokeIdentity({
    suiteId: raw.suiteId,
    profile: raw.profile,
    session: raw.session,
    expectedSuite: options.expectedSuite,
    expectedProfile: options.expectedProfile,
    expectedSession: options.expectedSession,
  });
  const report = await readHashAndNormalizeSharedRuntimeSmokeReport(root, raw.report);
  requireManifestEqualsRunnerReport(raw, report);
  if (!revisionEquals(raw.revision, options.expectedRevision)) fail("smoke_revision_mismatch");
  const ids = new Set();
  const adminThemes = new Set();
  const referencedFiles = ["manifest.json", "report.json"];
  for (const scenario of raw.scenarios) {
    if (ids.has(scenario.id)) fail("smoke_scenario_duplicate");
    ids.add(scenario.id);
    const variantIds = new Set();
    for (const variant of requireNonEmpty(scenario.variants)) {
      if (variantIds.has(variant.id)) fail("smoke_variant_duplicate");
      variantIds.add(variant.id);
      if (variant.consoleErrors.length !== 0) fail("smoke_console_errors");
      if (variant.surface === "admin") adminThemes.add(variant.theme);
      if (!variant.assertions.every((a) => a.pass === true)) fail("smoke_assertion_failed");
    }
    for (const shot of requireNonEmpty(scenario.screenshots)) {
      const resolved = resolve(root, shot.path);
      if (!isStrictDescendant(root, resolved) || isSymlinkEscape(resolved)) fail(...);
      const actual = sha256(await readFile(resolved));
      if (!timingSafeEqualHex(actual, shot.sha256)) fail("smoke_hash_mismatch");
      referencedFiles.push(shot.path);
    }
  }
  if (adminThemes.size > 0 &&
      !(adminThemes.has("light") && adminThemes.has("dark"))) {
    fail("smoke_admin_theme_coverage_missing");
  }
  return {
    pass: true,
    taskId: raw.taskId,
    suiteId: raw.suiteId,
    profile: raw.profile,
    session: raw.session,
    revision: raw.revision,
    scenarios: raw.scenarios.length,
    referencedFiles: referencedFiles.sort(),
  };
}
function requireManifestEqualsRunnerReport(manifest, report) {
  const scenarios = requireManifestableScenarioResults(
    report.scenarios,
    report.screenshots,
  );
  requireEveryScenarioPassed(scenarios);
  requireExactOrderedIds(manifest.scenarios, scenarios);
  requireCanonicalByteEquality(
    manifest.scenarios,
    scenarios.map(projectManifestScenarioWithoutElapsedMs),
    "smoke_manifest_report_evidence_mismatch",
  );
  requireCanonicalByteEquality(
    uniqueScenarioScreenshotUnion(manifest.scenarios),
    report.screenshots,
    "smoke_manifest_report_screenshot_mismatch",
  );
}
export async function auditSmokeEvidenceDirectory(options) {
  const taskDir = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  const result = await validateSmokeEvidence(options);
  const referenced = result.referencedFiles;
  const present = await enumerateRegularFilesNoSymlinks(taskDir);
  const expectedPresent = options.requireCheckpoint
    ? [...referenced, "resume-checkpoint.json"].sort()
    : referenced;
  if (!sameSortedPaths(expectedPresent, present)) fail("smoke_evidence_file_set_mismatch");
  if (options.requireTracked) {
    const tracked = (await gitLsFiles(taskDir)).map((path) => relative(taskDir, path));
    if (!sameSortedPaths(expectedPresent, tracked)) fail("smoke_evidence_untracked");
  }
  return result;
}
```

**Split pointer (2026-08-13):** the scope-B/C/D exports removed from this pseudocode
moved to [TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md)
(`createResumeCheckpoint`, `resumeTrackedEvidence`, `openWorkflowClosureResume` plus the
checkpoint/closure types), [TASK-545-03-L04](./TASK-545-03-L04-Closure-Metadata-Delta-And-Closure-Delta-CLI.md)
(`writeOrResumeOrderedDurableChangelogFileThenIndexV1`, `validateMetadataOnlyClosureDelta`,
`buildClosureMetadataMutationPlanV1`, and the `closure-delta` CLI), and
[TASK-545-03-L05](./TASK-545-03-L05-Task548-Committed-Bootstrap-Gate.md) (the TASK-548
committed-bootstrap types plus `normalizeTask548CommittedSixPathBootstrapReceiptV1` and
`requireTask548CommittedSixPathBootstrapAuthorizationV1`).

## Two-phase evidence lifecycle

Scope A validation is read-only and derives everything from the real repository
root, the expected task ID, and the report-bound validated session. The validator
never rewrites a manifest, never auto-updates a hash, and never stages or
commits evidence. It re-hashes the exact referenced screenshot bytes, enforces
the manifest/report byte-equality projection, and returns the sorted referenced
file set for the directory-audit pass.

The revision digest is computed from HEAD plus sorted porcelain records
(including untracked files), excluding only the canonical evidence directory
itself. Validation binds to the exact expected task/revision so a stale, dirty,
or mismatched working tree fails closed.

Reject absolute paths, `..`, symlinks escaping the task directory, unknown keys,
duplicate scenario/variant IDs, empty variants, unregistered or mismatched
suite/profile/session/report identity, invalid surface/theme/dimensions/timestamps/hash grammar,
missing light-or-dark admin coverage, empty
assertions/screenshots, false assertions, and any console error. Cap manifest bytes
before JSON parsing, then cap string/array counts and each screenshot byte size before
hashing to prevent pathological evidence ingestion.

Do not inspect image pixels as proof of assertions; manifest assertions remain
machine-verifiable run output, while screenshots are integrity-bound artifacts
for human review.

The two-phase owner review flow is not scope A. Phase 1 never claims durability;
tracked resume is the only tracked-evidence pass. That checkpoint/resume,
closure metadata/delta, and recovery/ordered-pair protocol moved to
[TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md) (checkpoint/resume)
and [TASK-545-03-L04](./TASK-545-03-L04-Closure-Metadata-Delta-And-Closure-Delta-CLI.md)
(closure metadata/delta plus the `closure-delta` CLI); see the split pointer above.

## Error/compatibility flow

Validator is read-only and returns machine-readable codes without manifest raw
content. Existing loose `_smoke/*.png` is ignored, not grandfathered as evidence.
No manifest is rewritten or hash auto-updated during validation; byte/hash caps
reject pathological evidence before parsing or hashing.

- Phase 1 never claims durability; tracked resume is the only tracked-evidence
  pass. That owner-review contract is forward-owned by
  [TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md); scope A only
  produces the manifest/validator/revision surface those leaves consume.
- The agent never stages or commits evidence here. Checkpoint conflict,
  closure-delta, and ordered-pair recovery rules moved to
  [TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md) and
  [TASK-545-03-L04](./TASK-545-03-L04-Closure-Metadata-Delta-And-Closure-Delta-CLI.md).

## Regression-test shape owned by this leaf

`tests/unit/workflows/smokeEvidence.test.ts` owns a temporary Git-repository corpus:
valid five-flow evidence with admin light+dark; deterministic clean/dirty/untracked/
deleted-file revision digests; evidence-directory self-exclusion derived only from
the real repository root/task; rejection of an alternate same-basename root, external
root, symlinked component, traversal and prefix lookalike; mandatory
task/path/HEAD/dirty/digest matching; changed byte/hash; missing/untracked/
unreferenced file; oversized manifest/screenshot; console error; failed assertion;
duplicate ID; and unknown key. The oversized-screenshot case must assert rejection
above `MAX_SCREENSHOT_BYTES`; the prefix-lookalike case must use a sibling
directory whose name is a proper prefix of the canonical evidence directory (e.g.
`task-540-evidence-extra`) and assert it is never treated as the owned evidence root.

`tests/unit/runtime-smoke/visible-evidence.test.ts` owns the generic report-side
contract: legacy scenario results without optional evidence remain valid for
non-manifest suites; manifestable scenarios require exact title/nonempty unique
variants/visible assertions/scenario screenshots; all scalar/array/dimension/
byte caps and unknowns fail closed; global screenshots equal the unique scenario
union. Cross-suite fixtures prove TASK-548 and TASK-414 manifests are generated
only from their runner-returned variants/assertions/screenshots, and mutate each
report/manifest ID, pass bit, title, variant, assertion expected/actual/pass,
console error, screenshot path/hash/order/ownership to require mismatch failure.

Checkpoint/resume, closure metadata/delta, ordered-durable marker, TASK-548
committed-bootstrap, and kill/recovery fixture shapes were split out with their
owners: [TASK-545-03-L03](./TASK-545-03-L03-Checkpoint-And-Owner-Resume.md)
(checkpoint/resume), [TASK-545-03-L04](./TASK-545-03-L04-Closure-Metadata-Delta-And-Closure-Delta-CLI.md)
(closure delta), and [TASK-545-03-L05](./TASK-545-03-L05-Task548-Committed-Bootstrap-Gate.md)
(TASK-548 bootstrap gate). L02 does not reopen this test file; it
runs the suite after changing `.gitignore` and separately asserts ignore behavior
with shell exit codes.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node _docs/_workflows/lib/smoke-evidence.mjs --help
bun test tests/unit/workflows/smokeEvidence.test.ts
bun test tests/unit/runtime-smoke/visible-evidence.test.ts
bun run lint:repo:types
git diff --check
wc -l scripts/runtime-smoke/adapters/types.ts \
  scripts/runtime-smoke/visible-evidence.ts \
  tests/unit/runtime-smoke/visible-evidence.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts
```

## Documentation Updates Required

- No guidance file is edited here; TASK-545-03-L02 owns the evidence guide and
  the serialized generic cookbook recipe for this visible-evidence extension.
- TASK-545-04-L03 owns board and changelog 1257 closure evidence.
- This contract split (L01 keeps scope A; L03/L04/L05 take checkpoint/resume,
  closure metadata/delta, and TASK-548 bootstrap) is recorded in the changelog
  1257 closeout owned by TASK-545-04-L03.
