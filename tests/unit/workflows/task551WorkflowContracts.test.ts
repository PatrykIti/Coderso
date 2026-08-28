import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  TASK551_CANONICAL_EVIDENCE_ROOT,
  TASK551_CHILD_FAILURE_CODES,
  TASK551_CHILD_DIAGNOSTIC_MAX_BYTES,
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_L10_RESULT_FIELDS,
  TASK551_CONSUMER_FIELDS,
  TASK551_L01_MATERIALIZATION_COMMIT_PHASES,
  TASK551_LOGICAL_COMMANDS,
  TASK551_PARENT_IMPL_FILE,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  TASK551_PHASE_DISCOVERY_ALLOWLIST,
  TASK551_PHASE_IMPORT_CLOSURE,
  TASK551_PHASE_LINE_COUNT_PATHS,
  TASK551_PHASE_PROVENANCE,
  TASK551_PHASE_RUNTIME_OUTPUTS,
  TASK551_PHASE_VALIDATION_PATHS,
  TASK551_PROFILE_VALUES,
  TASK551_QUARANTINE_REASONS,
  TASK551_TERMINAL_HANDOFF_PATHS,
  buildTask551L10EvidenceProjection,
  classifyTask551RecoveryState,
  deriveTask551ClosedCommitSet,
  deriveTask551L01MaterializationClosedSet,
  getTask55105L02LineCountPaths,
  getTask55105L02Provenance,
  getTask55105L02ValidationPaths,
  listTask551CommandIds,
  materializeTask551Command,
  normalizeTask551RepoPath,
  recoverTask551EvidenceRoot,
  requireExactClosedPaths,
  requireExactDiscoveredPaths,
  requireNoUnexpectedDirtyOrUntrackedRequiredPath,
  requireTask551ContractIntegrity,
  requireTask551LiteralUniquePaths,
  requireTask551PhaseProvenanceImmediatelyBeforeSpawn,
  requireTrackedRegularNonSymlinkFilesAtHead,
  sha256Task551Bytes,
  task551DependenciesThrough,
  validateTask551EvidenceBytes,
  validateTask551EvidenceValue,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import type { Task551RecoveryFlags } from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import { runTask551BoundedArgvChild } from "../../../_docs/_workflows/task-551-fix.mjs";
import {
  buildTask551SubtaskGates,
  deriveTask551ImplementLandOrder,
  evaluateTask551GateOutcome,
  runTask551ImplementWorkflow,
  runTask551ImplementWorkflowForTests,
} from "../../../_docs/_workflows/task-551-implement.mjs";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const makeTempDir = (label: string) => mkdtemp(path.join(tmpdir(), `task551-contracts-${label}-`));
async function makeRecoveryRoots(label: string) {
  return {
    repo: await makeTempDir(`${label}-repo`),
    tempRoot: await makeTempDir(`${label}-temp`),
  };
}
function evidenceValue(
  row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const key of row.keys) {
    base[key] =
      key === "schema" || key === "schemaVersion"
        ? row.schema
        : key === "taskId"
          ? "TASK-551-11"
          : key === "phase"
            ? row.phase
            : key === "profile"
              ? row.profile
              : key === "pass" || key === "noLeak"
                ? true
                : key === "sourceProfile"
                  ? null
                  : `redacted-${key}`;
  }
  return { ...base, ...overrides };
}
describe("canonical provenance and projections", () => {
  test("contract integrity passes and phases are unique", () => {
    expect(requireTask551ContractIntegrity()).toBe(true);
    const phases = TASK551_PHASE_PROVENANCE.map((phase) => phase.phase);
    expect(phases).toEqual(["sidecar", "l01", "l03", "l02", "05-l02"]);
    expect(new Set(phases).size).toBe(5);
  });
  test("import closure equals sorted union of owned + read-only imports", () => {
    for (const phase of TASK551_PHASE_PROVENANCE) {
      expect(TASK551_PHASE_IMPORT_CLOSURE.get(phase.phase)).toEqual(
        [...phase.ownedFiles, ...phase.ownedTests, ...phase.readOnlyImports].sort()
      );
      expect(TASK551_PHASE_DISCOVERY_ALLOWLIST.get(phase.phase)).toEqual(
        TASK551_PHASE_IMPORT_CLOSURE.get(phase.phase)
      );
      expect(TASK551_PHASE_CLOSED_ALLOWLIST.get(phase.phase)).toEqual(
        [...phase.ownedFiles, ...phase.ownedTests].sort()
      );
      expect(TASK551_PHASE_VALIDATION_PATHS.get(phase.phase)).toEqual(
        TASK551_PHASE_IMPORT_CLOSURE.get(phase.phase)
      );
      expect(TASK551_PHASE_LINE_COUNT_PATHS.get(phase.phase)).toEqual(
        TASK551_PHASE_CLOSED_ALLOWLIST.get(phase.phase)
      );
    }
  });
  test("runtime outputs are excluded from every tracked set", () => {
    expect(TASK551_PHASE_RUNTIME_OUTPUTS.get("l01")).toEqual(["tests/bun-lane-manifest.json"]);
    expect(TASK551_PHASE_RUNTIME_OUTPUTS.get("05-l02")).toEqual([
      ".tmp/task-551/task489-predecessor-v1.json",
    ]);
    const tracked = new Set([...TASK551_PHASE_IMPORT_CLOSURE.values()].flat());
    for (const outputs of TASK551_PHASE_RUNTIME_OUTPUTS.values()) {
      for (const output of outputs) expect(tracked.has(output)).toBe(false);
    }
  });
  test("closed commit set derivation includes runtime outputs without duplicates", () => {
    const set = deriveTask551L01MaterializationClosedSet();
    const expected = deriveTask551ClosedCommitSet(TASK551_L01_MATERIALIZATION_COMMIT_PHASES);
    expect(set).toEqual(expected);
    expect(new Set(set).size).toBe(set.length);
    expect(set).toContain("tests/bun-lane-manifest.json");
    expect(set).toEqual([...set].sort());
    const ownedOnly = [
      ...TASK551_PHASE_CLOSED_ALLOWLIST.get("l01")!,
      ...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!,
      ...TASK551_PHASE_CLOSED_ALLOWLIST.get("l02")!,
    ];
    for (const path of ownedOnly) expect(set).toContain(path);
  });
  test("05-L02 projections are derived reads, not handwritten copies", () => {
    expect(getTask55105L02Provenance()).toBe(
      TASK551_PHASE_PROVENANCE.find((phase) => phase.phase === "05-l02")
    );
    expect(getTask55105L02ValidationPaths()).toBe(TASK551_PHASE_VALIDATION_PATHS.get("05-l02"));
    expect(getTask55105L02LineCountPaths()).toBe(TASK551_PHASE_LINE_COUNT_PATHS.get("05-l02"));
    const closure = getTask55105L02ValidationPaths();
    for (const helper of [
      "scripts/task551DatabaseBaseline/digestContract.ts",
      "scripts/task551DatabaseBaseline/fixtureTarget.ts",
      "scripts/task551DatabaseBaseline/receiptContract.ts",
      "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
      "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
    ]) {
      expect(closure).toContain(helper);
    }
    expect(closure).toHaveLength(2 + 3 + 5); // files + tests + read-only imports
  });
  test("path normalization rejects traversal, duplicates, and non-literal input", () => {
    expect(normalizeTask551RepoPath("a/b/c.txt")).toBe("a/b/c.txt");
    expect(() => normalizeTask551RepoPath("../escape")).toThrow(/traversal/);
    expect(() => normalizeTask551RepoPath("a/../b")).toThrow(/traversal/);
    expect(() => normalizeTask551RepoPath("/absolute")).toThrow();
    expect(() => normalizeTask551RepoPath("a//b")).toThrow();
    expect(() => normalizeTask551RepoPath("a\\b")).toThrow();
    expect(() => requireTask551LiteralUniquePaths(["a", "a"], "dup")).toThrow(/duplicate/);
  });
});
describe("pre-spawn provenance fencing", () => {
  const head = {
    head: "a".repeat(40),
    trackedRegularFiles: [...TASK551_PHASE_IMPORT_CLOSURE.values()].flat(),
    dirtyPaths: [],
    untrackedPaths: [],
  };
  test("fence passes on a clean verified HEAD", () => {
    expect(requireTask551PhaseProvenanceImmediatelyBeforeSpawn("l03", head)).toBe(true);
    expect(requireTask551PhaseProvenanceImmediatelyBeforeSpawn("l02", head)).toBe(true);
    expect(requireTask551PhaseProvenanceImmediatelyBeforeSpawn("05-l02", head)).toBe(true);
  });
  test("dependency chains follow the frozen land order", () => {
    expect(task551DependenciesThrough("05-l02")).toEqual(["sidecar", "l01", "l03", "l02"]);
    expect(task551DependenciesThrough("unknown")).toEqual(["sidecar"]);
  });
  test("untracked or dirty required paths fail closed before spawn", () => {
    const dirtyHead = {
      ...head,
      dirtyPaths: ["scripts/task-551-fixture-target-bootstrap.ts"],
    };
    expect(() => requireTask551PhaseProvenanceImmediatelyBeforeSpawn("l03", dirtyHead)).toThrow(
      /dirty/
    );
    const untrackedHead = { ...head, untrackedPaths: ["tests/bun-lane-manifest.json"] };
    expect(() => requireNoUnexpectedDirtyOrUntrackedRequiredPath(untrackedHead)).not.toThrow();
  });
  test("missing tracked path at HEAD fails", () => {
    const partialHead = {
      head: "b".repeat(40),
      trackedRegularFiles: ["some/other/file.ts"],
    };
    expect(() =>
      requireTrackedRegularNonSymlinkFilesAtHead(
        TASK551_PHASE_IMPORT_CLOSURE.get("sidecar")!,
        partialHead
      )
    ).toThrow(/not_tracked_regular_at_head/);
    expect(() =>
      requireTrackedRegularNonSymlinkFilesAtHead(TASK551_PHASE_IMPORT_CLOSURE.get("sidecar")!, {
        head: "",
        trackedRegularFiles: [],
      })
    ).toThrow(/head_snapshot_missing/);
  });
  test("discovered/materialized path sets must equal the exact allowlists", () => {
    expect(() => requireExactDiscoveredPaths([], TASK551_PHASE_DISCOVERY_ALLOWLIST, "l03")).toThrow(
      /allowlist_mismatch/
    );
    const extra = [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!, "extra/unexpected.ts"];
    expect(() => requireExactClosedPaths(extra, TASK551_PHASE_CLOSED_ALLOWLIST, "l03")).toThrow(
      /allowlist_mismatch/
    );
    expect(() => requireTask551PhaseProvenanceImmediatelyBeforeSpawn("sidecar", head)).toThrow(
      /pre_spawn_phase_unknown/
    );
  });
});
describe("command materialization", () => {
  test("seven canonical L03/L02 forms materialize exact argv", () => {
    expect(materializeTask551Command("l03-focused-test")).toEqual([
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
    ]);
    expect(materializeTask551Command("l03-initialize")).toEqual([
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-fixture-target-bootstrap.ts",
      "--initialize",
    ]);
    expect(materializeTask551Command("l02-static-baseline")).toEqual([
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/database-query-baseline.test.ts",
    ]);
    expect(materializeTask551Command("l02-freeze", { profile: "small" })).toEqual([
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--freeze",
      "--profile",
      "small",
      "--all",
    ]);
    expect(materializeTask551Command("l02-check", { profile: "large" })).toEqual([
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-database-baseline.ts",
      "--check",
      "--profile",
      "large",
      "--all",
    ]);
  });
  test("05-L02 command sequence matches the doc exactly", () => {
    expect(materializeTask551Command("05-l02-explain-plans-test")).toEqual([
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/database-explain-plans.test.ts",
    ]);
    expect(materializeTask551Command("05-l02-explain-large")).toEqual([
      "bun",
      "--env-file=/dev/null",
      "scripts/task-551-explain-plans.ts",
      "--scale",
      "large",
      "--check",
    ]);
  });
  test("profile misuse, unknown IDs, and missing profiles fail before spawn", () => {
    expect(() => materializeTask551Command("nonexistent")).toThrow(/command_id_unknown/);
    expect(() => materializeTask551Command("l02-freeze")).toThrow(/profile_missing/);
    expect(() => materializeTask551Command("l02-freeze", { profile: "huge" })).toThrow(
      /profile_missing/
    );
    expect(() => materializeTask551Command("l03-check", { profile: "small" })).toThrow(
      /profile_not_allowed/
    );
    expect(TASK551_PROFILE_VALUES).toEqual(["small", "large"]);
    expect(listTask551CommandIds()).toEqual(Object.keys(TASK551_LOGICAL_COMMANDS).sort());
  });
  test("every argv begins with the literal bun token and env-file guard", () => {
    for (const [id, argv] of Object.entries(TASK551_LOGICAL_COMMANDS)) {
      expect(argv[0]).toBe("bun");
      if (id !== "l01-classifier") {
        expect(argv[1]).toBe("--env-file=/dev/null");
      }
      expect(argv.every((token) => typeof token === "string" && token.length > 0)).toBe(true);
    }
  });
});
describe("durable evidence manifest and redacted projections", () => {
  test("exactly eleven unique rows with one schema each", () => {
    expect(TASK551_DURABLE_EVIDENCE_MANIFEST).toHaveLength(11);
    const paths = TASK551_DURABLE_EVIDENCE_MANIFEST.map((row) => row.path);
    expect(new Set(paths).size).toBe(11);
    for (const row of TASK551_DURABLE_EVIDENCE_MANIFEST) {
      expect(row.path.startsWith(`${TASK551_CANONICAL_EVIDENCE_ROOT}/`)).toBe(true);
      expect(row.schema).toMatch(/^coderso\.task551\..+@v1$/);
    }
  });
  test("rows 1..10 require literal noLeak:true; promotion row rejects the alias", () => {
    const rows = TASK551_DURABLE_EVIDENCE_MANIFEST;
    for (const row of rows.slice(0, 10)) {
      expect(row.keys).toContain("noLeak");
    }
    const promotion = rows[10];
    expect(promotion.keys).not.toContain("noLeak");
    expect(validateTask551EvidenceBytes(promotion, Buffer.from("{}"))).toMatch(
      /keys_reject_unknown|lf_terminated/
    );
  });
  test("promotion consumer shape has exactly the sixteen canonical fields", () => {
    expect(TASK551_CONSUMER_FIELDS.task489Promotion).toHaveLength(16);
    expect(TASK551_CONSUMER_FIELDS.task489Promotion).toEqual(
      TASK551_DURABLE_EVIDENCE_MANIFEST[10].keys
    );
    expect(TASK551_CONSUMER_FIELDS.task489Predecessor).toEqual(
      TASK551_DURABLE_EVIDENCE_MANIFEST[9].keys
    );
  });
  test("L10 envelope carries exactly the per-phase result fields", () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST.find(
      (entry) => entry.phase === "l02-static" && entry.profile === "small"
    )!;
    const envelope = buildTask551L10EvidenceProjection({
      manifestRow: row,
      taskId: "TASK-551-11",
      sourceHead: "c".repeat(40),
      sourceDigest: sha("bytes"),
      timestamp: "2026-08-26T00:00:00.000Z",
      status: "accepted",
      result: { pass: true, noLeak: true, focusedTests: [], manifestSha256: sha("m") },
    });
    expect(Object.keys(envelope).sort()).toEqual([
      "consumer",
      "phase",
      "profile",
      "result",
      "scenario",
      "schema",
      "sourceDigest",
      "sourceHead",
      "status",
      "taskId",
      "timestamp",
    ]);
    expect(envelope.consumer).toBe("TASK-551-10-L01");
    expect(envelope.profile).toBe("small");
    expect(Object.keys(envelope.result).sort()).toEqual(
      [...TASK551_L10_RESULT_FIELDS["l02-static"]].sort()
    );
    const l03Row = TASK551_DURABLE_EVIDENCE_MANIFEST[0];
    const l03Envelope = buildTask551L10EvidenceProjection({
      manifestRow: l03Row,
      taskId: "TASK-551-11",
      sourceHead: "d".repeat(40),
      sourceDigest: sha("x"),
      timestamp: "2026-08-26T00:00:00.000Z",
      result: { pass: true, noLeak: true, commandReceipt: {} },
    });
    expect(l03Envelope.profile).toBeNull();
    expect(() =>
      buildTask551L10EvidenceProjection({
        manifestRow: row!,
        taskId: "TASK-551-11",
        sourceHead: "e".repeat(40),
        sourceDigest: sha("y"),
        timestamp: "2026-08-26T00:00:00.000Z",
        result: { pass: true, noLeak: true, focusedTests: [], extraField: 1 },
      })
    ).toThrow(/keys_mismatch/);
  });
  test("terminal handoff paths are exactly the two predecessor artifacts", () => {
    expect(TASK551_TERMINAL_HANDOFF_PATHS).toEqual([
      TASK551_DURABLE_EVIDENCE_MANIFEST[9].path,
      TASK551_DURABLE_EVIDENCE_MANIFEST[10].path,
    ]);
  });
  test("strict reject-unknown byte/value validation", () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0];
    const good = Buffer.from(`${JSON.stringify(evidenceValue(row))}\n`);
    expect(validateTask551EvidenceBytes(row, good)).toBeNull();
    expect(
      validateTask551EvidenceBytes(row, Buffer.from(JSON.stringify(evidenceValue(row))))
    ).toMatch(/lf_terminated/);
    const withExtra = evidenceValue(row, { rogue: 1 });
    expect(validateTask551EvidenceValue(row, withExtra)).toMatch(/keys_reject_unknown/);
    const falseNoLeak = evidenceValue(row, { noLeak: false });
    expect(validateTask551EvidenceValue(row, falseNoLeak)).toMatch(/noleak_false/);
    const wrongSchema = evidenceValue(row, { schema: "coderso.other@v1" });
    expect(validateTask551EvidenceValue(row, wrongSchema)).toMatch(/schema_mismatch/);
    const wrongProfileRow = TASK551_DURABLE_EVIDENCE_MANIFEST[3]; // large static
    expect(
      validateTask551EvidenceValue(wrongProfileRow, evidenceValue(wrongProfileRow))
    ).toBeNull();
    expect(
      validateTask551EvidenceValue(
        wrongProfileRow,
        evidenceValue(wrongProfileRow, { profile: "small" })
      )
    ).toMatch(/profile_mismatch/);
    const passRow = evidenceValue(row, { pass: false });
    expect(validateTask551EvidenceValue(row, passRow)).toMatch(/pass_not_true/);
  });
});
describe("recovery table classification (every row)", () => {
  const cases: Array<[Task551RecoveryFlags, string, string, boolean, string]> = [
    [{}, "no-temp/no-dest", "empty", true, "recovery_empty"],
    [{ tempExists: true }, "temp-only/valid", "discarded_retryable", true, "temp_valid_discarded"],
    [
      { tempExists: true, tempValid: false },
      "temp-only/invalid",
      "blocked_invalid_temp",
      false,
      "temp_invalid",
    ],
    [{ destExists: true }, "dest-only/valid", "committed", true, "destination_valid"],
    [
      { destExists: true, destValid: false },
      "dest-only/invalid",
      "blocked_invalid_destination",
      false,
      "destination_invalid",
    ],
    [
      { tempExists: true, destExists: true, bytesEqual: true },
      "temp+dest/equal",
      "committed",
      true,
      "published_equal",
    ],
    [
      { tempExists: true, destExists: true },
      "temp+dest/different",
      "blocked_conflict",
      false,
      "byte_conflict",
    ],
    [
      { tempExists: true, destExists: true, bytesEqual: true, dirFsyncPending: true },
      "link-published-before-dir-fsync",
      "committed",
      true,
      "published_unsynced",
    ],
    [
      { dirFsyncFailed: true },
      "dir-fsync-failed",
      "blocked_dir_sync",
      true,
      "directory_fsync_failed",
    ],
    [
      { quarantineExists: true, quarantineEqual: true },
      "quarantine-exists",
      "quarantined",
      true,
      "quarantine_existing",
    ],
    [
      { quarantineExists: true },
      "quarantine-exists",
      "blocked_quarantine_conflict",
      false,
      "quarantine_existing",
    ],
    [
      { quarantineCollides: true },
      "quarantine-collides",
      "quarantine-collision",
      true,
      "quarantine_collision",
    ],
    [
      { eexistRace: true, bytesEqual: true },
      "EEXIST-race",
      "committed",
      true,
      "destination_eexist_race",
    ],
    [{ eexistRace: true }, "EEXIST-race", "blocked_conflict", false, "destination_eexist_race"],
    [{ tempFsyncFailed: true }, "temp-fsync-failed", "write_failed", true, "temp_fsync_failed"],
    [
      { tempExists: true, destExists: true, bytesEqual: true, unlinkFailed: true },
      "unlink-failed",
      "committed-but-cleanup-warning",
      true,
      "cleanup_warning",
    ],
    [
      { tempExists: true, destExists: true, bytesEqual: true, priorCleanupWarning: true },
      "committed-but-cleanup-warning",
      "committed",
      true,
      "cleanup_retry",
    ],
    [
      { tempExists: true, destExists: true, priorCleanupWarning: true },
      "committed-but-cleanup-warning",
      "committed-but-cleanup-warning",
      true,
      "cleanup_retry",
    ],
  ];
  for (const [flags, state, terminalResult, retrySafe, telemetry] of cases) {
    test(`${state} -> ${terminalResult} (${telemetry})`, () => {
      const row = classifyTask551RecoveryState(flags);
      expect(row.state).toBe(state);
      expect(row.action.length).toBeGreaterThan(0);
      expect(row.terminalResult).toBe(terminalResult);
      expect(row.retrySafe).toBe(retrySafe);
      expect(row.telemetry).toBe(telemetry);
    });
  }
});
describe("no-replace durable writer and evidence-root recovery (tmp dirs only)", () => {
  test("writer commits atomically, never overwrites, rejects invalid values pre-fs", async () => {
    const root = await makeTempDir("writer");
    try {
      const evidenceDir = path.join(root, "audit-evidence");
      const tempDir = path.join(root, "tmp");
      await mkdir(evidenceDir);
      await mkdir(tempDir);
      const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0];
      const value = evidenceValue(row);
      const receipt = await writeTask551EvidenceFileIfAbsent({
        manifestRow: row,
        value,
        evidenceDir,
        tempDir,
      });
      expect(receipt.action).toBe("committed_no_replace");
      const destination = path.join(evidenceDir, "l03-initialize.json");
      const bytes = await readFile(destination);
      expect(bytes.toString("utf8").endsWith("\n")).toBe(true);
      expect(receipt.digest).toBe(`sha256:${sha256Task551Bytes(bytes)}`);
      const mutated = evidenceValue(row, { commandReceipt: { changed: true } });
      await expect(
        writeTask551EvidenceFileIfAbsent({ manifestRow: row, value: mutated, evidenceDir, tempDir })
      ).rejects.toThrow(/destination_exists_no_replace/);
      expect(await readFile(destination)).toEqual(bytes);
      const equalReceipt = await writeTask551EvidenceFileIfAbsent({
        manifestRow: row,
        value,
        evidenceDir,
        tempDir,
      });
      expect(equalReceipt.action).toBe("destination_eexist_race_committed");
      const badRow = TASK551_DURABLE_EVIDENCE_MANIFEST[6];
      await expect(
        writeTask551EvidenceFileIfAbsent({
          manifestRow: badRow,
          value: evidenceValue(badRow, { noLeakAlias: true }),
          evidenceDir,
          tempDir,
        })
      ).rejects.toThrow(/keys_reject_unknown/);
      const leftovers = await readdir(tempDir);
      expect(leftovers.filter((name) => name.endsWith(".tmp"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test("recovery quarantines unexpected entries and classifies manifest rows", async () => {
    const { repo: root, tempRoot } = await makeRecoveryRoots("recovery");
    try {
      const evidenceDir = path.join(root, TASK551_CANONICAL_EVIDENCE_ROOT);
      await mkdir(evidenceDir, { recursive: true });
      const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0];
      const validBytes = Buffer.from(`${JSON.stringify(evidenceValue(row))}\n`);
      await writeFile(path.join(evidenceDir, "l03-initialize.json"), validBytes);
      await writeFile(path.join(evidenceDir, "faza0-contract-audit.json"), "{}\n");
      await writeFile(path.join(root, TASK551_PARENT_IMPL_FILE), "{}\n");
      await mkdir(path.join(evidenceDir, "stray-dir"));
      const runId = "run-1";
      const summary = await recoverTask551EvidenceRoot({ repoRoot: root, tempRoot, runId });
      expect(summary.runId).toBe(runId);
      const byTelemetry = Object.fromEntries(summary.rows.map((r) => [r.path, r.telemetry]));
      expect(byTelemetry[row.path]).toBe("destination_valid");
      expect(summary.rows.filter((r) => r.telemetry === "recovery_empty")).toHaveLength(10);
      const quarantinedNames = summary.quarantines.map((q) => q.name).sort();
      expect(quarantinedNames).toEqual([
        "faza0-contract-audit.json",
        "impl-01-l02.json",
        "stray-dir",
      ]);
      const parentQuarantine = summary.quarantines.find((q) => q.name === "impl-01-l02.json")!;
      expect(parentQuarantine.reason).toBe(TASK551_QUARANTINE_REASONS.obsoleteParentFile);
      expect(parentQuarantine.destinationRoot.endsWith("/parent")).toBe(true);
      const canonicalQuarantines = summary.quarantines.filter((q) => q.name !== "impl-01-l02.json");
      for (const entry of canonicalQuarantines) {
        expect(entry.destinationRoot.endsWith("/canonical")).toBe(true);
        expect(entry.sourceRoot).toBe(TASK551_CANONICAL_EVIDENCE_ROOT);
      }
      const remaining = (await readdir(evidenceDir)).sort();
      expect(remaining).toEqual(["l03-initialize.json"]);
      const second = await recoverTask551EvidenceRoot({ repoRoot: root, tempRoot, runId });
      expect(second.quarantines).toHaveLength(0);
      await rm(path.join(evidenceDir, "l03-initialize.json"));
      await writeFile(path.join(evidenceDir, "l03-initialize.json"), "{ not json");
      const third = await recoverTask551EvidenceRoot({ repoRoot: root, tempRoot, runId: "run-2" });
      const invalidRow = third.rows.find((r) => r.path === row.path)!;
      expect(invalidRow.telemetry).toBe("destination_invalid");
      expect(await readdir(evidenceDir)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test("recovery refuses overlapping roots and empty run ids", async () => {
    const { repo: root, tempRoot } = await makeRecoveryRoots("guards");
    try {
      await expect(
        recoverTask551EvidenceRoot({ repoRoot: root, tempRoot: `${root}/inside`, runId: "r" })
      ).rejects.toThrow(); // temp inside repo is rejected by construction
      await expect(
        recoverTask551EvidenceRoot({
          repoRoot: `${tempRoot}/repo-copy`,
          tempRoot: `${tempRoot}/repo-copy/x`,
          runId: "r",
        })
      ).rejects.toThrow(/roots_overlap/);
      await expect(
        recoverTask551EvidenceRoot({ repoRoot: root, tempRoot: "/tmp/z", runId: "" })
      ).rejects.toThrow(/runid_missing/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
type FakeArgvProc = {
  pid: number;
  stdout: AsyncIterable<Uint8Array>;
  stderr: AsyncIterable<Uint8Array>;
  exited: Promise<number>;
  signalCode?: string | null;
};
type ArgvSpawnCall = { argv: string[]; opts: Record<string, unknown> };
/** A stream that never yields nor ends: exercises the hard-timeout branch. */
function hangingArgvStream(): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => new Promise<IteratorResult<Uint8Array>>(() => undefined),
    }),
  };
}
type DiagnosticCarrier = Error & { task551Diagnostic?: Record<string, unknown> };
function patchProcessKill(impl: (pid: number, signal?: string) => boolean): () => void {
  const original = process.kill;
  (process as unknown as { kill: typeof impl }).kill = impl;
  return () => ((process as unknown as { kill: unknown }).kill = original);
}
function fakeArgvStream(chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield* chunks;
    },
  };
}
describe("implementation workflow phase contracts", () => {
  const phaseHead = {
    head: "f".repeat(40),
    trackedRegularFiles: [...TASK551_PHASE_IMPORT_CLOSURE.values()].flat(),
    dirtyPaths: [],
    untrackedPaths: [],
  };
  // prettier-ignore
  const expected = {
    sidecar: { ownedFiles: ["_docs/_workflows/lib/task-551-contract.mjs", "_docs/_workflows/task-551-author-audit.mjs", "_docs/_workflows/task-551-implement.mjs", "_docs/_workflows/task-551-fix.mjs"], ownedTests: ["tests/unit/workflows/task551AuthorAudit.test.ts", "tests/unit/workflows/task551WorkflowContracts.test.ts"], readOnlyImports: [] },
    l01: { ownedFiles: ["scripts/task-551-query-inventory.ts", "scripts/task551QueryInventory/bunLane.ts", "scripts/task551QueryInventory/canonical.ts", "scripts/task551QueryInventory/check.ts", "scripts/task551QueryInventory/clientExpressions.ts", "scripts/task551QueryInventory/clientNamespaceAssignments.ts", "scripts/task551QueryInventory/contracts.ts", "scripts/task551QueryInventory/dynamicCapabilityAliases.ts", "scripts/task551QueryInventory/dynamicImportOrigins.ts", "scripts/task551QueryInventory/dynamicImportProvenance.ts", "scripts/task551QueryInventory/fileDiscovery.ts", "scripts/task551QueryInventory/literalDynamicClientImports.ts", "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts", "scripts/task551QueryInventory/nonliteralDynamicImports.ts", "scripts/task551QueryInventory/productionScan.ts", "scripts/task551QueryInventory/scan.ts", "tests/perf/fixtures/task551QueryInventory.ts"], ownedTests: ["tests/perf/database-query-inventory.test.ts", "tests/integration/server/task551BunLaneMembership.test.ts"], readOnlyImports: ["scripts/bun-lane-classify.ts", "tests/unit/toolchain/bunLaneManifest.test.ts"] },
    l03: { ownedFiles: ["scripts/task-551-fixture-target-bootstrap.ts"], ownedTests: ["tests/perf/task551FixtureTargetBootstrap.test.ts"], readOnlyImports: [] },
    l02: { ownedFiles: ["scripts/task-551-database-baseline.ts", "scripts/task551DatabaseBaseline/catalog.ts", "scripts/task551DatabaseBaseline/digestContract.ts", "scripts/task551DatabaseBaseline/fixtureTarget.ts", "scripts/task551DatabaseBaseline/fixtureValidation.ts", "scripts/task551DatabaseBaseline/metrics.ts", "scripts/task551DatabaseBaseline/postgresTransport.ts", "scripts/task551DatabaseBaseline/receiptContract.ts", "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts", "scripts/task551DatabaseBaseline/runner.ts", "scripts/task551DatabaseBaseline/runtimeProvenance.ts", "tests/perf/fixtures/task551DatabaseScale.ts", "tests/perf/fixtures/task551DatabaseBudgets.ts", "tests/perf/fixtures/task551AdminReadStatementShapes.ts", "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts", "tests/perf/task551DatabaseBaseline/contractTestHelpers.ts", "tests/perf/task551DatabaseBaseline/freezeReceipts.ts"], ownedTests: ["tests/perf/database-query-baseline.test.ts", "tests/perf/task551DatabaseBaseline/digestContract.test.ts", "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts", "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts", "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"], readOnlyImports: ["tests/perf/fixtures/task551QueryInventory.ts", "tests/integration/server/task551BunLaneMembership.test.ts", "tests/unit/toolchain/bunLaneManifest.test.ts"] },
    "05-l02": { ownedFiles: ["scripts/task-551-explain-plans.ts", "tests/perf/fixtures/task551QueryPlanContracts.ts"], ownedTests: ["tests/perf/database-explain-plans.test.ts", "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts", "tests/integration/server/task551ConcurrencyConstraints.test.ts"], readOnlyImports: ["scripts/task551DatabaseBaseline/digestContract.ts", "scripts/task551DatabaseBaseline/fixtureTarget.ts", "scripts/task551DatabaseBaseline/receiptContract.ts", "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts", "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts"] },
  } satisfies Record<string, { ownedFiles: string[]; ownedTests: string[]; readOnlyImports: string[] }>;

  test("phase membership matrix is literal and independent of derived allowlists", () => {
    for (const [phase, categories] of Object.entries(expected)) {
      const provenance = TASK551_PHASE_PROVENANCE.find((entry) => entry.phase === phase)!;
      expect([...provenance.ownedFiles].sort()).toEqual([...categories.ownedFiles].sort());
      expect([...provenance.ownedTests].sort()).toEqual([...categories.ownedTests].sort());
      expect([...provenance.readOnlyImports].sort()).toEqual(
        [...categories.readOnlyImports].sort()
      );
      const combined = [
        ...categories.ownedFiles,
        ...categories.ownedTests,
        ...categories.readOnlyImports,
      ];
      expect([...TASK551_PHASE_IMPORT_CLOSURE.get(phase)!].sort()).toEqual([...combined].sort());
      expect([...TASK551_PHASE_CLOSED_ALLOWLIST.get(phase)!].sort()).toEqual(
        [...categories.ownedFiles, ...categories.ownedTests].sort()
      );
      expect(new Set(combined).size).toBe(combined.length);
    }
  });
  test("L03 uses exact focused-test, initialize, check argv and order", () => {
    const gates = buildTask551SubtaskGates("l03");
    expect(buildTask551SubtaskGates("05-l02").map((gate) => gate.operation)).toContain(
      "05-l02-explain-large"
    );
    expect(gates.map((gate) => gate.gateId)).toEqual([
      "l03-focused-test",
      "l03-initialize",
      "l03-check",
    ]);
    expect(gates.map((gate) => gate.argv)).toEqual([
      ["bun", "--env-file=/dev/null", "test", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
      [
        "bun",
        "--env-file=/dev/null",
        "scripts/task-551-fixture-target-bootstrap.ts",
        "--initialize",
      ],
      ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--check"],
    ]);
    expect(gates[0]!.requiresSource).toBe(false);
    expect(gates.slice(1).every((gate) => gate.requiresSource)).toBe(true);
    expect(gates[2]!.evidencePhase).toBe("l03-check");
  });
  test("L03 negative ordering assertion rejects check before initialize", () => {
    const ids = buildTask551SubtaskGates("l03").map((gate) => gate.gateId);
    expect(ids.indexOf("l03-check")).toBeGreaterThan(ids.indexOf("l03-initialize"));
    expect(ids.indexOf("l03-initialize")).toBeGreaterThan(ids.indexOf("l03-focused-test"));
    expect(ids).not.toEqual(["l03-focused-test", "l03-check", "l03-initialize"]);
  });
  test("CLI gate requires null discovery and focused tests require positive discovery", () => {
    const cli = buildTask551SubtaskGates("l03")[1]!;
    const focused = buildTask551SubtaskGates("l03")[0]!;
    expect(
      evaluateTask551GateOutcome(cli, {
        exitCode: 0,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: null,
      }).pass
    ).toBe(true);
    expect(
      evaluateTask551GateOutcome(focused, {
        exitCode: 0,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: 1,
      }).pass
    ).toBe(true);
    expect(
      evaluateTask551GateOutcome(focused, {
        exitCode: 0,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: null,
      }).pass
    ).toBe(false);
  });
  test("workflow binds source/map/disposal independently per L03 source operation", async () => {
    const events: string[] = [];
    const sourceIds: object[] = [];
    const mapIds: object[] = [];
    const headSnapshotProvider = async () => phaseHead;
    const leafDispatcher = async () => ({
      changedPaths: [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!],
    });
    const sourceProvider = async ({ operation }: { operation: string }) => {
      events.push(`source:${operation}`);
      const source = { operation };
      sourceIds.push(source);
      return source;
    };
    const mapBuilder = async ({ operation, source }: { operation: string; source: object }) => {
      events.push(`map:${operation}`);
      const map = { operation, source };
      mapIds.push(map);
      return map;
    };
    const disposer = async ({
      operation,
      source,
      sourceMap,
    }: {
      operation: string;
      source: object;
      sourceMap: object;
    }) => {
      events.push(`dispose:${operation}`);
      expect(sourceMap.source).toBe(source);
    };
    const gateRunner = async ({
      gate,
      source,
      sourceMap,
    }: {
      gate: { kind: string; operation: string };
      source?: object;
      sourceMap?: object;
    }) => {
      events.push(`run:${gate.operation}`);
      if (gate.kind === "test") {
        expect(source).toBeUndefined();
        expect(sourceMap).toBeUndefined();
        return { exitCode: 0, discoveredTestCount: 1 };
      }
      expect(source).toBeDefined();
      expect(sourceMap).toBeDefined();
      return { exitCode: 0, discoveredTestCount: null };
    };
    const result = await runTask551ImplementWorkflowForTests({
      phase: "l03",
      headSnapshotProvider,
      leafDispatcher,
      gateRunner,
      phaseSourceProvider: sourceProvider,
      phaseMapBuilder: mapBuilder,
      phaseResourceDisposer: disposer,
    });
    expect(result.pass).toBe(true);
    expect(sourceIds).toHaveLength(2);
    expect(mapIds).toHaveLength(2);
    expect(sourceIds[0]).not.toBe(sourceIds[1]);
    expect(mapIds[0]).not.toBe(mapIds[1]);
    expect(events).toEqual([
      "run:l03-focused-test",
      "source:l03-initialize",
      "map:l03-initialize",
      "run:l03-initialize",
      "dispose:l03-initialize",
      "source:l03-check",
      "map:l03-check",
      "run:l03-check",
      "dispose:l03-check",
    ]);
  });
  test("L03 validates source/map/disposer before leaf dispatch", async () => {
    let dispatches = 0;
    const base = {
      phase: "l03" as const,
      headSnapshotProvider: async () => phaseHead,
      leafDispatcher: async () => {
        dispatches += 1;
        return { changedPaths: [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!] };
      },
      gateRunner: async () => ({ exitCode: 0, discoveredTestCount: 1 }),
      phaseSourceProvider: async () => ({}),
      phaseMapBuilder: async () => ({}),
      phaseResourceDisposer: async () => undefined,
    };
    for (const [key, expected] of [
      ["phaseSourceProvider", "phaseSourceProvider"],
      ["phaseMapBuilder", "phaseMapBuilder"],
      ["phaseResourceDisposer", "phaseResourceDisposer"],
    ] as const) {
      await expect(runTask551ImplementWorkflowForTests({ ...base, [key]: null })).rejects.toThrow(
        `task551_implement_runner_missing:${expected}`
      );
    }
    expect(dispatches).toBe(0);
  });
  test("arbitrary phase and evidence writer requests require explicit test seam", async () => {
    const base = {
      headSnapshotProvider: async () => phaseHead,
      leafDispatcher: async () => ({
        changedPaths: [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!],
      }),
      gateRunner: async () => ({ exitCode: 0, discoveredTestCount: 1 }),
    };
    await expect(runTask551ImplementWorkflow({ ...base, phase: "l03" })).rejects.toThrow(
      /requires_test_seam/
    );
    await expect(
      runTask551ImplementWorkflow({ ...base, evidenceWriter: async () => ({}) })
    ).rejects.toThrow(/evidence_writer_requires_test_seam/);
  });
  test("maxFixRounds is an integer constrained to one through three", async () => {
    const base = {
      phase: "l03",
      headSnapshotProvider: async () => phaseHead,
      leafDispatcher: async () => ({
        changedPaths: [...TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!],
      }),
      gateRunner: async () => ({ exitCode: 0, discoveredTestCount: 1 }),
    };
    for (const value of [0, 4, 1.5, Number.NaN]) {
      await expect(
        runTask551ImplementWorkflowForTests({ ...base, maxFixRounds: value })
      ).rejects.toThrow(/max_fix_rounds_invalid/);
    }
  });
});
describe("bounded argv child execution (fix workflow)", () => {
  const ARGV_BASE = {
    argv: ["/usr/local/bin/bun-real", "test", "some.test.ts"],
    cwd: "/repo",
    env: { EXAMPLE_VAR: "1" },
  };
  function makeFakeArgvSpawn(overrides: Partial<FakeArgvProc> = {}) {
    const calls: ArgvSpawnCall[] = [];
    const proc: FakeArgvProc = {
      pid: 4321,
      stdout: fakeArgvStream([]),
      stderr: fakeArgvStream([]),
      exited: Promise.resolve(0),
      signalCode: null,
      ...overrides,
    };
    const spawn = (argv: string[], opts: Record<string, unknown>): FakeArgvProc => {
      calls.push({ argv, opts });
      return proc;
    };
    return { spawn, calls };
  }
  test("spawn options pin detached === (process.platform !== 'win32')", async () => {
    const fake = makeFakeArgvSpawn();
    const result = await runTask551BoundedArgvChild({ ...ARGV_BASE, spawn: fake.spawn });
    expect(result.status).toBe("passed");
    expect(fake.calls.length).toBe(1);
    expect(fake.calls[0]!.opts.detached).toBe(process.platform !== "win32");
    expect(result.killStrategy).toBe("none");
  });
  test("hard timeout teardown pins the exact killStrategy per exercised path", async () => {
    const pendingExited = new Promise<number>(() => undefined);
    const cases: Array<[(pid: number, signal?: string) => boolean, string]> = [
      [() => true, "process_group"],
      [
        (pid) => {
          if (pid < 0) throw new Error("ESRCH");
          return true;
        },
        "root_pid_fallback",
      ],
      [
        () => {
          throw new Error("ESRCH");
        },
        "already_gone",
      ],
    ];
    for (const [impl, expected] of cases) {
      const fake = makeFakeArgvSpawn({
        stdout: hangingArgvStream(),
        stderr: hangingArgvStream(),
        exited: pendingExited,
      });
      let thrown: DiagnosticCarrier | undefined;
      const restoreKill = patchProcessKill(impl);
      try {
        thrown = (await runTask551BoundedArgvChild({
          ...ARGV_BASE,
          spawn: fake.spawn,
          timeoutMs: 30,
          killGraceMs: 20,
        }).catch((error: DiagnosticCarrier) => error)) as DiagnosticCarrier;
      } finally {
        restoreKill();
      }
      expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      const diagnostic = thrown!.task551Diagnostic!;
      expect(diagnostic).toBeDefined();
      expect(diagnostic.code).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
      expect(diagnostic.killStrategy).toBe(expected);
    }
  });
  test("timeout diagnostic serializes under TASK551_CHILD_DIAGNOSTIC_MAX_BYTES with redacted tails", async () => {
    const filler = new TextEncoder().encode(`${"A".repeat(120)}\n`);
    const secretTailLine = "API_TOKEN=supersecretvalue must not survive\n";
    const maskedLine = "ATTEMPT=9\n";
    const lastChunk = new TextEncoder().encode(`${"B".repeat(40)}\n${secretTailLine}${maskedLine}`);
    const fake = makeFakeArgvSpawn({
      stdout: fakeArgvStream([filler, filler, filler, lastChunk]),
      stderr: fakeArgvStream([lastChunk]),
      exited: new Promise<number>(() => undefined),
    });
    let thrown: DiagnosticCarrier | undefined;
    await runTask551BoundedArgvChild({
      ...ARGV_BASE,
      spawn: fake.spawn,
      timeoutMs: 30,
      killGraceMs: 20,
    }).catch((error: DiagnosticCarrier) => {
      thrown = error;
    });
    expect(thrown!.message).toBe(TASK551_CHILD_FAILURE_CODES.timeout);
    const diagnostic = thrown!.task551Diagnostic!;
    const serialized = JSON.stringify(diagnostic);
    expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(TASK551_CHILD_DIAGNOSTIC_MAX_BYTES);
    expect(serialized).not.toContain("supersecretvalue");
    expect(diagnostic.stderrTail).toContain("ATTEMPT=[redacted]");
  });
});
