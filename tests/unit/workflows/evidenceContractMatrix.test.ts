import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_EVIDENCE_VALUE_DESCRIPTORS,
  TASK551_L10_PROJECTION_KEYS,
  TASK551_L10_RESULT_FIELDS,
  buildTask551L10EvidenceProjection,
  validateTask551EvidenceBytes,
  validateTask551EvidenceValue,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import * as task551ContractRuntime from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  evidenceValueFor,
  predecessorPayload,
  processReceipt,
  promotion,
  resultFor,
  sha,
  sourceDigest,
  sourceHead,
  timestamp,
} from "./task551EvidenceContractFixtures.js";

type MutableEvidence = Record<string, unknown> & { commandReceipt: Record<string, unknown> };
function isEvidenceRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requireEvidenceRecord(value: unknown): Record<string, unknown> {
  if (!isEvidenceRecord(value)) throw new Error("test evidence fixture must be an own-data record");
  return value;
}
function isMutableEvidence(value: unknown): value is MutableEvidence {
  return isEvidenceRecord(value) && isEvidenceRecord(value.commandReceipt);
}
function requireMutableEvidence(value: unknown): MutableEvidence {
  if (!isMutableEvidence(value))
    throw new Error("test evidence fixture must include commandReceipt");
  return value;
}

function projectionInput(
  row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number],
  result: unknown = resultFor(row)
) {
  return { manifestRow: row, taskId: "TASK-551-11", sourceHead, sourceDigest, timestamp, result };
}

describe("TASK-551 evidence decoder and L10 projection", () => {
  test("binds eleven deeply frozen descriptors to manifest identity through the facade", async () => {
    expect(TASK551_EVIDENCE_VALUE_DESCRIPTORS).toHaveLength(11);
    for (const [index, descriptor] of TASK551_EVIDENCE_VALUE_DESCRIPTORS.entries()) {
      expect(descriptor.manifestRow).toBe(TASK551_DURABLE_EVIDENCE_MANIFEST[index]);
      expect(descriptor.path).toBe(TASK551_DURABLE_EVIDENCE_MANIFEST[index]?.path);
      expect(Object.isFrozen(descriptor)).toBe(true);
      expect(Object.isFrozen(descriptor.root)).toBe(true);
      expect(Object.isFrozen(descriptor.root.fields)).toBe(true);
    }
    expect(
      TASK551_EVIDENCE_VALUE_DESCRIPTORS.map((descriptor) => descriptor.expectedTaskId)
    ).toEqual([
      "TASK-551-01-L03",
      "TASK-551-01-L03",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-01-L02",
      "TASK-551-05-L02",
      "TASK-551-05-L02",
    ]);
    const [facadeSource, helperSource, implementSource, declarationSource] = await Promise.all([
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-contract.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-evidence-contract.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/task-551-implement.mjs", import.meta.url),
        "utf8"
      ),
      readFile(
        new URL("../../../_docs/_workflows/lib/task-551-contract.d.mts", import.meta.url),
        "utf8"
      ),
    ]);
    expect(facadeSource).toContain('from "./task-551-evidence-contract.mjs"');
    expect(facadeSource).toMatch(
      /export async function bootstrapTask551EvidenceStorageForOwnerWorkflowHost\(\)/u
    );
    expect(declarationSource).not.toContain("bootstrapTask551EvidenceStorageForOwnerWorkflowHost");
    expect(implementSource).toContain("bootstrapTask551EvidenceStorageForOwnerWorkflowHost");
    expect(implementSource).not.toContain('from "./lib/task-551-evidence-contract.mjs"');
    const declaredNames = new Set(
      [
        ...declarationSource.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/gmu
        ),
      ].map(([, name]) => name)
    );
    const ownerOnlyRuntimeExport = "bootstrapTask551EvidenceStorageForOwnerWorkflowHost";
    expect(
      Object.keys(task551ContractRuntime).filter(
        (name) => name !== ownerOnlyRuntimeExport && !declaredNames.has(name)
      )
    ).toEqual([]);
    const declaredValueNames = new Set(
      [
        ...declarationSource.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|enum)\s+([A-Za-z0-9_]+)/gmu
        ),
      ].map(([, name]) => name)
    );
    expect([...declaredValueNames].filter((name) => !(name in task551ContractRuntime))).toEqual([]);
    expect(helperSource).not.toMatch(/from\s+["'][^"']*task-551-contract\.mjs["']/u);
    expect(helperSource).not.toMatch(/task489SolutionKitRunPredecessor/u);
    expect(helperSource).toContain(
      "ownerEvidenceStorageBootstrap = installTask551EvidenceStorageForOwner("
    );
    expect(helperSource).toContain(
      "arguments.length !== 0 || ownerEvidenceStorageBootstrap !== undefined"
    );
  });

  test("keeps test-only declaration imports and the owner bridge closed", async () => {
    const base = "../../../_docs/_workflows/";
    const [
      authorDeclaration,
      implementDeclaration,
      fixDeclaration,
      evidenceDeclaration,
      authorTest,
      authorDriftTest,
      authorBoundedTest,
      authorFixtures,
      workflowTest,
      workflowBootstrapTest,
      workflowSubgatesTest,
      workflowImplementationTest,
      workflowFixtures,
      workflowExecutionFixtures,
      evidenceTest,
      evidenceMatrixTest,
      evidenceFixtures,
      capsTest,
      authorSource,
      implementSource,
      fixSource,
    ] = await Promise.all([
      readFile(new URL(`${base}task-551-author-audit.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-implement.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-fix.d.mts`, import.meta.url), "utf8"),
      readFile(new URL(`${base}lib/task-551-evidence-contract.d.mts`, import.meta.url), "utf8"),
      readFile(new URL("./task551AuthorAudit.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./authorAuditDriftRounds.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./authorAuditBoundedChild.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551AuthorAuditFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowContracts.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsBootstrap.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsSubgates.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./workflowContractsImplementation.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowContractsFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551WorkflowExecutionFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551EvidenceContract.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./evidenceContractMatrix.test.ts", import.meta.url), "utf8"),
      readFile(new URL("./task551EvidenceContractFixtures.ts", import.meta.url), "utf8"),
      readFile(new URL("./dispatchContractCaps.test.ts", import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-author-audit.mjs`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-implement.mjs`, import.meta.url), "utf8"),
      readFile(new URL(`${base}task-551-fix.mjs`, import.meta.url), "utf8"),
    ]);
    const declaredValues = (source: string) =>
      [
        ...source.matchAll(
          /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|function|class|enum)\s+([A-Za-z0-9_]+)/gmu
        ),
      ]
        .map(([, name]) => name)
        .sort();
    expect(declaredValues(authorDeclaration)).toEqual(
      [
        "TASK551_RECONCILE_SCOPE",
        "deriveTask551AuditScopes",
        "evaluateTask551DriftRound",
        "normalizeTask551AuditResult",
        "planTask551Reaudit",
        "preflightTask551AuthorAuditDispatch",
        "requireTask551AuthoredScope",
        "requireTask551ProductionDispatchTaskSnapshot",
        "requireTask551ResearchGrounding",
        "requireTask551TestDispatchTaskSnapshotForTests",
        "runTask551AuthorAuditWorkflow",
        "runTask551AuthorAuditWorkflowForTests",
        "runTask551DriftAuditRound",
      ].sort()
    );
    expect(declaredValues(implementDeclaration)).toEqual(
      [
        "createTask551TestExecutionSession",
        "deriveTask551ImplementLandOrder",
        "publishTask551PhaseEvidence",
        "runTask551ImplementWorkflow",
        "runTask551ImplementWorkflowForTests",
      ].sort()
    );
    expect(declaredValues(fixDeclaration)).toEqual(
      [
        "requireTask551CommandReceiptV1",
        "requireTask551LogicalArgvPreimageV1",
        "runTask551BoundedChild",
      ].sort()
    );
    expect(declaredValues(evidenceDeclaration)).toEqual([
      "createTask551EvidenceTestHarnessForTests",
    ]);
    for (const source of [
      authorDeclaration,
      implementDeclaration,
      fixDeclaration,
      evidenceDeclaration,
    ])
      expect(source).not.toMatch(
        /(?:declare\s+(?:global|module)|export\s+\*|bootstrapTask551EvidenceStorageForOwnerWorkflowHost)/u
      );
    const privateImports = (source: string) =>
      [
        ...source.matchAll(
          /from\s+["']([^"']+_docs\/_workflows\/(?:task-551-(?:author-audit|implement|fix)|lib\/task-551-evidence-contract)\.mjs)["']/gu
        ),
      ]
        .map(([, specifier]) => specifier)
        .sort();
    expect([
      privateImports(authorTest),
      privateImports(authorDriftTest),
      privateImports(authorBoundedTest),
      privateImports(authorFixtures),
      privateImports(workflowTest),
      privateImports(workflowBootstrapTest),
      privateImports(workflowSubgatesTest),
      privateImports(workflowImplementationTest),
      privateImports(workflowFixtures),
      privateImports(workflowExecutionFixtures),
      privateImports(evidenceTest),
      privateImports(evidenceMatrixTest),
      privateImports(evidenceFixtures),
      privateImports(capsTest),
    ]).toEqual([
      [`${base}task-551-author-audit.mjs`],
      [`${base}task-551-author-audit.mjs`],
      [`${base}task-551-fix.mjs`],
      [],
      [],
      [`${base}task-551-fix.mjs`],
      [`${base}task-551-implement.mjs`],
      [`${base}task-551-implement.mjs`],
      [],
      [
        `${base}task-551-author-audit.mjs`,
        `${base}task-551-fix.mjs`,
        `${base}task-551-implement.mjs`,
      ].sort(),
      [`${base}lib/task-551-evidence-contract.mjs`, `${base}task-551-implement.mjs`].sort(),
      [],
      [],
      [`${base}task-551-author-audit.mjs`],
    ]);
    const bridge = "bootstrapTask551EvidenceStorageForOwnerWorkflowHost";
    expect(
      [authorSource, implementSource, fixSource].filter((source) => source.includes(bridge))
    ).toEqual([implementSource]);
  });

  test("accepts only closed, detached evidence shapes and rejects hostile nested data", async () => {
    for (const row of TASK551_DURABLE_EVIDENCE_MANIFEST) {
      expect(validateTask551EvidenceValue(row, evidenceValueFor(row))).toBeNull();
    }
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!;
    const valid = requireEvidenceRecord(evidenceValueFor(row));
    expect(validateTask551EvidenceBytes(row, Buffer.from(`${JSON.stringify(valid)}\n`))).toBeNull();
    expect(
      validateTask551EvidenceBytes(
        row,
        Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${JSON.stringify(valid)}\n`)])
      )
    ).toBe("task551_evidence_json_invalid");
    expect(validateTask551EvidenceBytes(row, Buffer.alloc(1_048_577, 0x20))).toBe(
      "task551_evidence_bytes_invalid"
    );
    expect(
      validateTask551EvidenceValue(row, {
        ...valid,
        commandReceipt: { DATABASE_URL: "postgres://leak" },
      })
    ).toBe("task551_evidence_value_invalid");
    expect(
      validateTask551EvidenceValue(row, {
        ...valid,
        commandReceipt: { ...requireEvidenceRecord(valid.commandReceipt), arbitrary: "nested" },
      })
    ).toBe("task551_evidence_value_invalid");
    const nullPrototype = Object.assign(Object.create(null), valid);
    expect(validateTask551EvidenceValue(row, nullPrototype)).toBe("task551_evidence_value_invalid");
    const inheritedPrototype = Object.assign(Object.create({ inherited: true }), valid);
    expect(validateTask551EvidenceValue(row, inheritedPrototype)).toBe(
      "task551_evidence_value_invalid"
    );
    const accessor = requireMutableEvidence(evidenceValueFor(row));
    delete accessor.commandReceipt.stdoutBytes;
    Object.defineProperty(accessor.commandReceipt, "stdoutBytes", {
      enumerable: true,
      get: () => 0,
    });
    expect(validateTask551EvidenceValue(row, accessor)).toBe("task551_evidence_value_invalid");
    const symbol = requireMutableEvidence(evidenceValueFor(row));
    Object.defineProperty(symbol.commandReceipt, Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    expect(validateTask551EvidenceValue(row, symbol)).toBe("task551_evidence_value_invalid");
    const cycle = requireMutableEvidence(evidenceValueFor(row));
    cycle.commandReceipt.loop = cycle.commandReceipt;
    expect(validateTask551EvidenceValue(row, cycle)).toBe("task551_evidence_value_invalid");
    const staticRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    const sparse = requireEvidenceRecord(evidenceValueFor(staticRow));
    const focusedTestsWithHole = [processReceipt()];
    focusedTestsWithHole.length = 2;
    sparse.focusedTests = focusedTestsWithHole;
    expect(validateTask551EvidenceValue(staticRow, sparse)).toBe("task551_evidence_value_invalid");
    const oversized = requireMutableEvidence(evidenceValueFor(row));
    oversized.commandReceipt.stdoutBytes = 1_048_577;
    expect(validateTask551EvidenceValue(row, oversized)).toBe("task551_evidence_value_invalid");

    const freezeRow = TASK551_DURABLE_EVIDENCE_MANIFEST[4]!;
    for (const forbiddenText of [
      "Bearer live-credential",
      "mysql://user:password@host",
      "select secret from bindings",
      "API key capabilities",
    ]) {
      const candidate = requireEvidenceRecord(evidenceValueFor(freezeRow));
      requireEvidenceRecord(candidate.candidateReceipt).cpuModel = forbiddenText;
      expect(validateTask551EvidenceValue(freezeRow, candidate)).toBe(
        "task551_evidence_value_invalid"
      );
    }

    const promotionRow = TASK551_DURABLE_EVIDENCE_MANIFEST[10]!;
    const invalidPromotion = requireEvidenceRecord(promotion());
    invalidPromotion.sourceHead = "Bearer live-credential";
    invalidPromotion.createdAt = "Bearer live-credential";
    expect(validateTask551EvidenceValue(promotionRow, invalidPromotion)).toBe(
      "task551_evidence_value_invalid"
    );
  });

  test("projects every accepted L10 evidence branch as an exact frozen fourteen-key envelope", () => {
    for (const row of TASK551_DURABLE_EVIDENCE_MANIFEST.slice(0, 9)) {
      const envelope = buildTask551L10EvidenceProjection(projectionInput(row));
      expect(Object.keys(envelope)).toEqual(TASK551_L10_PROJECTION_KEYS);
      expect(envelope.status).toBe("accepted");
      expect(envelope.profile).toBe(row.profile ?? null);
      expect(envelope.noLeak).toBe(true);
      expect(envelope.predecessor).toBeNull();
      expect(envelope.promotion).toBeNull();
      expect(Object.keys(requireEvidenceRecord(envelope.result))).toEqual(
        TASK551_L10_RESULT_FIELDS[row.phase]!
      );
      expect(Object.isFrozen(envelope)).toBe(true);
      expect(Object.isFrozen(envelope.result)).toBe(true);
    }
    const initializeRow = TASK551_DURABLE_EVIDENCE_MANIFEST[0]!;
    const receipt = processReceipt();
    const projection = buildTask551L10EvidenceProjection(
      projectionInput(initializeRow, { pass: true, noLeak: true, commandReceipt: receipt })
    );
    const projectionResult = requireEvidenceRecord(projection.result);
    const projectionReceipt = requireEvidenceRecord(projectionResult.commandReceipt);
    receipt.stdoutBytes = 37;
    expect(projectionReceipt.stdoutBytes).toBe(0);
    expect(Object.isFrozen(projectionReceipt)).toBe(true);
    expect(Reflect.set(projectionReceipt, "stdoutBytes", 17)).toBe(false);
    expect(() =>
      buildTask551L10EvidenceProjection({ ...projectionInput(initializeRow), status: "rejected" })
    ).toThrow(/projection_identity_invalid/);
    const staticRow = TASK551_DURABLE_EVIDENCE_MANIFEST[2]!;
    const staticResult = requireEvidenceRecord(resultFor(staticRow));
    expect(() =>
      buildTask551L10EvidenceProjection(
        projectionInput(staticRow, { ...staticResult, unexpected: true })
      )
    ).toThrow(/projection_value_invalid/);
    const { manifestSha256: _missing, ...missingResult } = staticResult;
    expect(() =>
      buildTask551L10EvidenceProjection(projectionInput(staticRow, missingResult))
    ).toThrow(/projection_value_invalid/);
    const aliasedReceipt = processReceipt();
    expect(() =>
      buildTask551L10EvidenceProjection(
        projectionInput(staticRow, {
          pass: true,
          noLeak: true,
          focusedTests: [aliasedReceipt, aliasedReceipt],
          manifestSha256: sha("alias"),
        })
      )
    ).toThrow(/projection_value_invalid/);
  });

  test("requires the closed terminal predecessor and promotion pair with null-only terminal fields", () => {
    const row = TASK551_DURABLE_EVIDENCE_MANIFEST[10]!;
    const predecessor = predecessorPayload();
    const terminal = buildTask551L10EvidenceProjection({
      manifestRow: row,
      taskId: "TASK-551-11",
      sourceHead,
      sourceDigest,
      timestamp,
      result: null,
      predecessor,
      promotion: promotion(),
    });
    expect(Object.keys(terminal)).toEqual(TASK551_L10_PROJECTION_KEYS);
    expect(terminal.profile).toBeNull();
    expect(terminal.result).toBeNull();
    expect(terminal.noLeak).toBeNull();
    expect(Object.isFrozen(terminal.predecessor)).toBe(true);
    expect(Object.isFrozen(terminal.promotion)).toBe(true);
    const base = {
      manifestRow: row,
      taskId: "TASK-551-11",
      sourceHead,
      sourceDigest,
      timestamp,
      result: null,
    };
    expect(() =>
      buildTask551L10EvidenceProjection({ ...base, predecessor: {}, promotion: promotion() })
    ).toThrow(/projection_(?:value|terminal)_invalid/);
    expect(() => buildTask551L10EvidenceProjection({ ...base, predecessor })).toThrow(
      /terminal_invalid/
    );
    expect(() =>
      buildTask551L10EvidenceProjection({
        ...base,
        predecessor,
        promotion: { ...promotion(), extra: true },
      })
    ).toThrow(/projection_value_invalid/);
    expect(() =>
      buildTask551L10EvidenceProjection({
        ...base,
        predecessor,
        promotion: { ...promotion(), sourceDigest: sha("other") },
      })
    ).toThrow(/terminal_invalid/);
  });
});
