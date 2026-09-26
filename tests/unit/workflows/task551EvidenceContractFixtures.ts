import { createHash } from "node:crypto";
import { TASK551_DURABLE_EVIDENCE_MANIFEST } from "../../../_docs/_workflows/lib/task-551-contract.mjs";

export const sha = (seed: string) => createHash("sha256").update(seed).digest("hex");
export const sourceHead = "a".repeat(40);
export const terminalHead = "b".repeat(40);
export const sourceDigest = sha("task551-evidence-source");
export const timestamp = "2026-08-29T00:00:00.000Z";
const evidenceRoot = "_docs/_workflows/_smoke/task-551/audit-evidence";

export const processReceipt = () => ({
  status: "passed",
  result: "zero_exit",
  exitCode: 0,
  signalCode: null,
  stdoutBytes: 0,
  stderrBytes: 0,
});

const adminStatementIds = [
  "admin-pages-page",
  "admin-pages-fixed-summary",
  "admin-pages-authors-facet",
  "admin-entries-global-page",
  "admin-entries-global-fixed-summary",
  "admin-entries-global-facets",
  "admin-entries-typed-page",
  "admin-entries-typed-fixed-summary",
  "admin-entries-typed-authors-facet",
  "admin-posts-page",
  "admin-posts-fixed-summary",
  "admin-posts-authors-facet",
  "admin-users-page",
  "admin-users-fixed-summary",
  "admin-users-roles-facet",
  "admin-forms-page",
  "admin-form-submissions-page",
  "admin-form-submissions-fixed-summary",
  "admin-media-page",
  "admin-media-fixed-summary",
  "admin-media-facets",
  "admin-booking-reservations-page",
  "admin-booking-reservations-fixed-summary",
  "admin-booking-resources-page",
  "admin-booking-resources-fixed-summary",
  "admin-booking-services-page",
  "admin-booking-services-fixed-summary",
  "admin-booking-blackouts-page",
  "admin-booking-blackouts-fixed-summary",
  "admin-booking-service-resources-fixed-list",
  "admin-booking-schedules-fixed-list",
];
const ceiling = () => ({
  queryCountMax: 1,
  rowsReadMax: 1,
  rowsReturnedMax: 1,
  transferredBytesMax: 1,
  sharedBuffersMax: 1,
  p50MsMax: 1,
  p95MsMax: 1,
  p99MsMax: 1,
});
function reviewableReceipt(profile: "small" | "large", reviewState: "candidate" | "reviewed") {
  return {
    reviewableReceiptDigest: sha(`${profile}-${reviewState}-reviewable`),
    reviewState,
    profile,
    provenanceCommit: sourceHead,
    contractDigest: sha("contract"),
    fixtureDigest: sha("fixture"),
    schemaDigest: sha("schema"),
    runnerDigest: sha("runner"),
    platform: "linux",
    arch: "x64",
    cpuModel: "redacted-cpu",
    logicalCpus: 2,
    memoryMb: 1024,
    postgresMajor: 16,
    postgresConfigDigest: sha("postgres-config"),
    bunVersion: "1.4.0",
    poolCapacity: profile === "small" ? 2 : 10,
    containerMode: "container",
    scopeDigest: sha("scope"),
    calibration: { warmups: 20, samples: 100, medianMs: 1 },
    statementCeilings: adminStatementIds.map((statementId) => ({
      statementId,
      ceiling: ceiling(),
    })),
    poolWaitCeiling: ceiling(),
  };
}
const companions = [
  "task489-runs-all-keyset",
  "task489-runs-package-keyset",
  "task489-effective-supersession",
  "task489-active-starter-owner",
  "task489-safe-detail",
] as const;
const logicalCases = [
  [companions[0], "default", ["task489-runs-all-keyset/default"]],
  [companions[0], "relation-heavy-101", ["task489-runs-all-keyset/relation-heavy-101"]],
  [companions[1], "default", ["task489-runs-package-keyset/default"]],
  [companions[1], "relation-heavy-101", ["task489-runs-package-keyset/relation-heavy-101"]],
  [companions[2], "newer-0", ["task489-effective-supersession/newer-0"]],
  [companions[2], "newer-1", ["task489-effective-supersession/newer-1"]],
  [companions[2], "newer-511", ["task489-effective-supersession/newer-511"]],
  [companions[2], "newer-512", ["task489-effective-supersession/newer-512"]],
  [companions[2], "newer-513-all-rolled", ["task489-effective-supersession/newer-513-all-rolled"]],
  [
    companions[2],
    "newer-513-unrolled-first",
    ["task489-effective-supersession/newer-513-unrolled-first"],
  ],
  [
    companions[2],
    "newer-513-unrolled-middle",
    ["task489-effective-supersession/newer-513-unrolled-middle"],
  ],
  [
    companions[2],
    "newer-513-unrolled-last",
    ["task489-effective-supersession/newer-513-unrolled-last"],
  ],
  [companions[3], "active-owner", ["task489-active-starter-owner/active-owner"]],
  [
    companions[4],
    "point-plus-items",
    ["task489-safe-detail/run-point", "task489-safe-detail/items-page"],
  ],
] as const;
export function predecessorPayload() {
  return {
    schema: "coderso.task551.task489-predecessor@v1",
    pass: true,
    companionIds: [...companions],
    fixtureCounts: {
      bulkHistoryRuns: { small: 10_000, large: 1_000_000 },
      boundedSupportRuns: 109_890,
      totalRuns: { small: 119_890, large: 1_109_890 },
      syntheticActorUsers: 100,
      safeDetailItems: 513,
      activeStarterOwners: 1,
      templateEvidenceRows: 1,
      rollbackProgressRows: 1,
    },
    logicalCases: logicalCases.map(([companionId, logicalCaseId, statementIds]) => ({
      companionId,
      logicalCaseId,
      statementIds: [...statementIds],
    })),
    statementReceipts: logicalCases.flatMap(([companionId, logicalCaseId, statementIds]) =>
      statementIds.map((statementId) => ({
        companionId,
        logicalCaseId,
        statementId,
        profileResults: [
          {
            profile: "small",
            planDigest: sha(`${statementId}-small`),
            queryCount: 1,
            rowsRead: 0,
            rowsReturned: 0,
            transferredBytes: 0,
            sharedBuffers: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
          },
          {
            profile: "large",
            planDigest: sha(`${statementId}-large`),
            queryCount: 1,
            rowsRead: 0,
            rowsReturned: 0,
            transferredBytes: 0,
            sharedBuffers: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
          },
        ],
      }))
    ),
  };
}
export function promotion() {
  return {
    schemaVersion: "coderso.task551.task489-predecessor-promotion@v1",
    sourceTask: "TASK-551-05-L02",
    sourcePhase: "05-l02",
    sourceProfile: null,
    sourceScenario: "task489-predecessor",
    sourceHead,
    sourceDigest,
    predecessor: {
      sourcePath: ".tmp/task-551/task489-predecessor-v1.json",
      durablePath: `${evidenceRoot}/task489-predecessor-v1.json`,
      schemaVersion: "coderso.task551.task489-predecessor@v1",
      digest: sha("predecessor"),
    },
    promotionState: "promoted",
    promotionDecision: "accept",
    promotionReason: "exact-byte-match-after-owner-review",
    validationSummaries: {
      sourceIdentity: "passed",
      predecessorBytes: "passed",
      atomicNoReplace: "passed",
      terminalHead: "passed",
    },
    createdAt: timestamp,
    reviewedAt: timestamp,
    promotedAt: timestamp,
    ownerCapabilityReceiptDigest: sha("capability"),
  };
}
function l03Producer() {
  return {
    schema: "coderso.task551.fixture-bootstrap-check@v1",
    taskId: "TASK-551-01-L03",
    mode: "check",
    pass: true,
    markerCount: 1,
    targetProof: "current-database-and-single-marker",
    noLeak: true,
    toolContractDigest: `sha256:${sha("bootstrap-tool")}`,
  };
}
function immutableDigests() {
  return {
    reviewableReceiptDigest: sha("reviewable"),
    contractDigest: sha("contract"),
    fixtureDigest: sha("fixture"),
    schemaDigest: sha("schema"),
    runnerDigest: sha("runner"),
    manifestScenarioResultDigest: sha("scenario"),
  };
}
export function resultFor(row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number]) {
  if (row.phase === "l03-initialize")
    return { pass: true, noLeak: true, commandReceipt: processReceipt() };
  if (row.phase === "l03-check")
    return {
      pass: true,
      noLeak: true,
      producer: l03Producer(),
      focusedTestReceipt: processReceipt(),
      checkCommandReceipt: processReceipt(),
    };
  if (row.phase === "l02-static")
    return {
      pass: true,
      noLeak: true,
      focusedTests: [processReceipt(), processReceipt()],
      manifestSha256: sha(`static-${row.profile}`),
    };
  if (row.phase === "l02-freeze-candidate")
    return {
      pass: true,
      noLeak: true,
      candidateReceipt: reviewableReceipt(row.profile as "small" | "large", "candidate"),
      candidateCanonicalReceiptDigest: sha(`candidate-${row.profile}`),
      freezeCommandReceipt: processReceipt(),
    };
  if (row.phase === "l02-reviewed-candidates")
    return {
      pass: true,
      noLeak: true,
      reviewed: {
        schema: "coderso.task551.reviewed-candidate-transition-result@v1",
        capabilityReceipt: {
          schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
          digest: sha("capability"),
        },
        reviewed: [
          {
            profile: "small",
            candidateCanonicalReceiptDigest: sha("candidate-small"),
            reviewedReceipt: reviewableReceipt("small", "reviewed"),
            reviewedCanonicalReceiptDigest: sha("reviewed-small"),
          },
          {
            profile: "large",
            candidateCanonicalReceiptDigest: sha("candidate-large"),
            reviewedReceipt: reviewableReceipt("large", "reviewed"),
            reviewedCanonicalReceiptDigest: sha("reviewed-large"),
          },
        ],
      },
    };
  return {
    pass: true,
    noLeak: true,
    staticEvidencePath: `${evidenceRoot}/l02-static-${row.profile}.json`,
    candidatePath: `${evidenceRoot}/l02-freeze-candidate-${row.profile}.json`,
    reviewedCandidatesPath: `${evidenceRoot}/l02-reviewed-candidates.json`,
    checkCommandReceipt: processReceipt(),
    immutableDigests: immutableDigests(),
    targetProof: "current-database-and-single-marker",
  };
}
export function evidenceValueFor(row: (typeof TASK551_DURABLE_EVIDENCE_MANIFEST)[number]) {
  if (row.phase === "task489-predecessor") {
    const payload = predecessorPayload();
    return {
      schema: payload.schema,
      pass: payload.pass,
      noLeak: true,
      companionIds: payload.companionIds,
      fixtureCounts: payload.fixtureCounts,
      logicalCases: payload.logicalCases,
      statementReceipts: payload.statementReceipts,
    };
  }
  if (row.phase === "task489-predecessor-promotion") return promotion();
  return {
    schema: row.schema,
    taskId: row.phase.startsWith("l03-") ? "TASK-551-01-L03" : "TASK-551-01-L02",
    phase: row.phase,
    ...(row.profile === undefined ? {} : { profile: row.profile }),
    ...resultFor(row),
  };
}
