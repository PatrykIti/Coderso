// TASK-551-11 durable evidence kernel. The public facade is task-551-contract.mjs.
// This module deliberately has no imports from the facade, declarations, or workflows.
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyTask551EvidenceTestFault,
  installTask551EvidenceStorageForOwner,
  installTask551EvidenceStorageForTests,
  recoverTask551EvidenceFilesystem,
  restartTask551EvidenceStorageForTests,
  setTask551EvidenceTestFaultPlan,
  stageTask551EvidenceTestTemp,
  writeTask551EvidenceFilesystem,
} from "./task-551-evidence-filesystem.mjs";

export const TASK551_CANONICAL_EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-551/audit-evidence";
export const TASK551_PARENT_IMPL_FILE = "_docs/_workflows/_smoke/task-551/impl-01-l02.json";
export const TASK551_TERMINAL_HANDOFF_PATHS = Object.freeze([
  `${TASK551_CANONICAL_EVIDENCE_ROOT}/task489-predecessor-v1.json`,
  `${TASK551_CANONICAL_EVIDENCE_ROOT}/task489-predecessor-promotion-v1.json`,
]);

const frozen = (value) => Object.freeze(value);
const frozenStrings = (values) => frozen([...values]);
const manifestRow = (row) => frozen({ ...row, keys: frozenStrings(row.keys) });

export const TASK551_DURABLE_EVIDENCE_MANIFEST = frozen([
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l03-initialize.json`,
    schema: "coderso.task551.l03-initialize-evidence@v1",
    phase: "l03-initialize",
    keys: ["schema", "taskId", "phase", "pass", "noLeak", "commandReceipt"],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l03-check.json`,
    schema: "coderso.task551.l03-check-evidence@v1",
    phase: "l03-check",
    keys: [
      "schema",
      "taskId",
      "phase",
      "pass",
      "noLeak",
      "producer",
      "focusedTestReceipt",
      "checkCommandReceipt",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-static-small.json`,
    schema: "coderso.task551.l02-static-evidence@v1",
    phase: "l02-static",
    profile: "small",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "focusedTests",
      "manifestSha256",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-static-large.json`,
    schema: "coderso.task551.l02-static-evidence@v1",
    phase: "l02-static",
    profile: "large",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "focusedTests",
      "manifestSha256",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-freeze-candidate-small.json`,
    schema: "coderso.task551.l02.freeze-candidate@v1",
    phase: "l02-freeze-candidate",
    profile: "small",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "candidateReceipt",
      "candidateCanonicalReceiptDigest",
      "freezeCommandReceipt",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-freeze-candidate-large.json`,
    schema: "coderso.task551.l02.freeze-candidate@v1",
    phase: "l02-freeze-candidate",
    profile: "large",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "candidateReceipt",
      "candidateCanonicalReceiptDigest",
      "freezeCommandReceipt",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-reviewed-candidates.json`,
    schema: "coderso.task551.l02.reviewed-candidates@v1",
    phase: "l02-reviewed-candidates",
    keys: ["schema", "taskId", "phase", "pass", "noLeak", "reviewed"],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-check-small.json`,
    schema: "coderso.task551.l02.check-evidence@v1",
    phase: "l02-check",
    profile: "small",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "staticEvidencePath",
      "candidatePath",
      "reviewedCandidatesPath",
      "checkCommandReceipt",
      "immutableDigests",
      "targetProof",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-check-large.json`,
    schema: "coderso.task551.l02.check-evidence@v1",
    phase: "l02-check",
    profile: "large",
    keys: [
      "schema",
      "taskId",
      "phase",
      "profile",
      "pass",
      "noLeak",
      "staticEvidencePath",
      "candidatePath",
      "reviewedCandidatesPath",
      "checkCommandReceipt",
      "immutableDigests",
      "targetProof",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/task489-predecessor-v1.json`,
    schema: "coderso.task551.task489-predecessor@v1",
    phase: "task489-predecessor",
    keys: [
      "schema",
      "pass",
      "noLeak",
      "companionIds",
      "fixtureCounts",
      "logicalCases",
      "statementReceipts",
    ],
  }),
  manifestRow({
    path: `${TASK551_CANONICAL_EVIDENCE_ROOT}/task489-predecessor-promotion-v1.json`,
    schema: "coderso.task551.task489-predecessor-promotion@v1",
    phase: "task489-predecessor-promotion",
    keys: [
      "schemaVersion",
      "sourceTask",
      "sourcePhase",
      "sourceProfile",
      "sourceScenario",
      "sourceHead",
      "sourceDigest",
      "predecessor",
      "promotionState",
      "promotionDecision",
      "promotionReason",
      "validationSummaries",
      "createdAt",
      "reviewedAt",
      "promotedAt",
      "ownerCapabilityReceiptDigest",
    ],
  }),
]);

const rowByPath = new Map(TASK551_DURABLE_EVIDENCE_MANIFEST.map((row) => [row.path, row]));
export const TASK551_EVIDENCE_ROW_IDS = frozen([
  "l03Initialize",
  "l03Check",
  "l02StaticSmall",
  "l02StaticLarge",
  "l02FreezeCandidateSmall",
  "l02FreezeCandidateLarge",
  "l02ReviewedCandidates",
  "l02CheckSmall",
  "l02CheckLarge",
  "task489Predecessor",
  "task489PredecessorPromotion",
]);
export const TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID = frozen(
  Object.fromEntries(TASK551_EVIDENCE_ROW_IDS.map((id, index) => [id, index]))
);
const TASK551_EVIDENCE_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
let ownerEvidenceStorage;
let ownerEvidenceStorageBootstrap;
const TASK551_EVIDENCE_MAX_DOCUMENT_UTF8_BYTES = 1_048_576;
const TASK551_EVIDENCE_VALUE_INVALID = "task551_evidence_value_invalid";
const TASK551_TERMINAL_COMMITTED_HEAD_VERIFY_ERROR = "task551_terminal_committed_head_invalid";
const TASK551_TERMINAL_COMMITTED_HEAD_INPUT_KEYS = Object.freeze([
  "sourceHead",
  "terminalHead",
  "terminalParentHead",
  "commitBChangedPaths",
  "terminalHeadFiles",
  "currentTreeFiles",
]);
const TASK551_TERMINAL_HEAD_FILE_KEYS = Object.freeze(["path", "tracked", "kind", "bytes"]);
const TASK551_TERMINAL_CURRENT_FILE_KEYS = Object.freeze([
  "path",
  "tracked",
  "kind",
  "bytes",
  "dirty",
  "replaced",
]);
const INVALID_EVIDENCE_VALUE = Symbol("task551_evidence_value_invalid");
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SAFE_REDACTED_TEXT = /^[A-Za-z0-9][A-Za-z0-9 ._+(),/=-]*$/u;
const FORBIDDEN_EVIDENCE_TEXT =
  /(?:\b(?:password|secret|token|api[-_ ]?key|credential(?:s)?|authorization|bearer|private[-_ ]?key|database[-_ ]?url|redis[-_ ]?url|capabilit(?:y|ies)|source(?:s|map|maps)?|bind(?:ing|ings|s)?|sql)\b|\b(?:select|insert|update|delete|alter|drop|create|grant|revoke|join|where|values|into|explain|analyze)\b|\b[a-z][a-z0-9+.-]{1,31}:\/\/)/iu;

function isCanonicalUtcTimestamp(value) {
  if (typeof value !== "string" || !UTC_TIMESTAMP.test(value)) return false;
  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

const literal = (value) => frozen({ kind: "literal", value });
const boundedString = (max = 16_384, min = 1) => frozen({ kind: "string", max, min });
const lowercaseSha256 = frozen({ kind: "sha256" });
const prefixedSha256 = frozen({ kind: "prefixed-sha256" });
const gitSha = frozen({ kind: "git-sha" });
const utcTimestamp = frozen({ kind: "utc-timestamp" });
const safeInteger = (min = 0, max = TASK551_EVIDENCE_MAX_DOCUMENT_UTF8_BYTES) =>
  frozen({ kind: "safe-integer", min, max });
const finiteNumber = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  frozen({ kind: "finite-number", min, max });
const strictRecord = (fields) =>
  frozen({
    kind: "record",
    keys: frozenStrings(Object.keys(fields)),
    fields: frozen({ ...fields }),
  });
const fixedArray = (items) => frozen({ kind: "tuple", items: frozen([...items]) });
const boundedArray = (item, min, max) => frozen({ kind: "array", item, min, max });
const oneOf = (options) => frozen({ kind: "one-of", options: frozen([...options]) });
const TRUE = literal(true);
const NULL = literal(null);
const POSITIVE_SAFE_INTEGER = safeInteger(1, 1_048_576);
const NONNEGATIVE_NUMBER = finiteNumber(0);

const PROCESS_RESULT = strictRecord({
  status: literal("passed"),
  result: literal("zero_exit"),
  exitCode: literal(0),
  signalCode: NULL,
  stdoutBytes: safeInteger(),
  stderrBytes: safeInteger(),
});
const INITIALIZE_PROCESS_RESULT = strictRecord({
  status: literal("passed"),
  result: literal("zero_exit"),
  exitCode: literal(0),
  signalCode: NULL,
  stdoutBytes: literal(0),
  stderrBytes: literal(0),
});
const BOOTSTRAP_PRODUCER = strictRecord({
  schema: literal("coderso.task551.fixture-bootstrap-check@v1"),
  taskId: literal("TASK-551-01-L03"),
  mode: literal("check"),
  pass: TRUE,
  markerCount: literal(1),
  targetProof: literal("current-database-and-single-marker"),
  noLeak: TRUE,
  toolContractDigest: prefixedSha256,
});
const ADMIN_STATEMENT_IDS = frozenStrings([
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
]);
const NUMERIC_CEILING = strictRecord({
  queryCountMax: literal(1),
  rowsReadMax: finiteNumber(0.000_001),
  rowsReturnedMax: oneOf([literal(1), literal(51), literal(101), literal(102)]),
  transferredBytesMax: finiteNumber(0.000_001),
  sharedBuffersMax: finiteNumber(0.000_001),
  p50MsMax: finiteNumber(0.000_001),
  p95MsMax: finiteNumber(0.000_001),
  p99MsMax: finiteNumber(0.000_001),
});
const statementCeiling = (id) =>
  strictRecord({ statementId: literal(id), ceiling: NUMERIC_CEILING });
const REVIEWABLE_RECEIPT = (profile, reviewState) =>
  strictRecord({
    reviewableReceiptDigest: lowercaseSha256,
    reviewState: literal(reviewState),
    profile: literal(profile),
    provenanceCommit: gitSha,
    contractDigest: lowercaseSha256,
    fixtureDigest: lowercaseSha256,
    schemaDigest: lowercaseSha256,
    runnerDigest: lowercaseSha256,
    platform: boundedString(128),
    arch: boundedString(128),
    cpuModel: boundedString(512),
    logicalCpus: POSITIVE_SAFE_INTEGER,
    memoryMb: POSITIVE_SAFE_INTEGER,
    postgresMajor: POSITIVE_SAFE_INTEGER,
    postgresConfigDigest: boundedString(128),
    bunVersion: boundedString(128),
    poolCapacity: literal(profile === "small" ? 2 : 10),
    containerMode: boundedString(128),
    scopeDigest: boundedString(128),
    calibration: strictRecord({
      warmups: literal(20),
      samples: literal(100),
      medianMs: finiteNumber(0.000_001),
    }),
    statementCeilings: fixedArray(ADMIN_STATEMENT_IDS.map(statementCeiling)),
    poolWaitCeiling: NUMERIC_CEILING,
  });
const CANDIDATE_ENTRY = (profile) =>
  strictRecord({
    profile: literal(profile),
    candidateCanonicalReceiptDigest: lowercaseSha256,
    reviewedReceipt: REVIEWABLE_RECEIPT(profile, "reviewed"),
    reviewedCanonicalReceiptDigest: lowercaseSha256,
  });
const REVIEWED_CANDIDATES = strictRecord({
  schema: literal("coderso.task551.reviewed-candidate-transition-result@v1"),
  capabilityReceipt: strictRecord({
    schemaVersion: literal("coderso.task551.l02-owner-capability-receipt@v1"),
    digest: lowercaseSha256,
  }),
  reviewed: fixedArray([CANDIDATE_ENTRY("small"), CANDIDATE_ENTRY("large")]),
});
const IMMUTABLE_DIGESTS = strictRecord({
  reviewableReceiptDigest: lowercaseSha256,
  contractDigest: lowercaseSha256,
  fixtureDigest: lowercaseSha256,
  schemaDigest: lowercaseSha256,
  runnerDigest: lowercaseSha256,
  manifestScenarioResultDigest: lowercaseSha256,
});
const PREDECESSOR_COMPANIONS = frozenStrings([
  "task489-runs-all-keyset",
  "task489-runs-package-keyset",
  "task489-effective-supersession",
  "task489-active-starter-owner",
  "task489-safe-detail",
]);
const PREDECESSOR_FIXTURE_COUNTS = strictRecord({
  bulkHistoryRuns: strictRecord({ small: literal(10_000), large: literal(1_000_000) }),
  boundedSupportRuns: literal(109_890),
  totalRuns: strictRecord({ small: literal(119_890), large: literal(1_109_890) }),
  syntheticActorUsers: literal(100),
  safeDetailItems: literal(513),
  activeStarterOwners: literal(1),
  templateEvidenceRows: literal(1),
  rollbackProgressRows: literal(1),
});
const PREDECESSOR_LOGICAL_CASE = strictRecord({
  companionId: oneOf(PREDECESSOR_COMPANIONS.map(literal)),
  logicalCaseId: boundedString(128),
  statementIds: boundedArray(boundedString(160), 1, 2),
});
const PREDECESSOR_PROFILE_RESULT = (profile) =>
  strictRecord({
    profile: literal(profile),
    planDigest: lowercaseSha256,
    queryCount: literal(1),
    rowsRead: NONNEGATIVE_NUMBER,
    rowsReturned: NONNEGATIVE_NUMBER,
    transferredBytes: NONNEGATIVE_NUMBER,
    sharedBuffers: NONNEGATIVE_NUMBER,
    p50Ms: NONNEGATIVE_NUMBER,
    p95Ms: NONNEGATIVE_NUMBER,
    p99Ms: NONNEGATIVE_NUMBER,
  });
const PREDECESSOR_STATEMENT_RECEIPT = strictRecord({
  companionId: oneOf(PREDECESSOR_COMPANIONS.map(literal)),
  logicalCaseId: boundedString(128),
  statementId: boundedString(160),
  profileResults: fixedArray([
    PREDECESSOR_PROFILE_RESULT("small"),
    PREDECESSOR_PROFILE_RESULT("large"),
  ]),
});
const PREDECESSOR_PAYLOAD = strictRecord({
  schema: literal("coderso.task551.task489-predecessor@v1"),
  pass: TRUE,
  companionIds: fixedArray(PREDECESSOR_COMPANIONS.map(literal)),
  fixtureCounts: PREDECESSOR_FIXTURE_COUNTS,
  logicalCases: boundedArray(PREDECESSOR_LOGICAL_CASE, 14, 14),
  statementReceipts: boundedArray(PREDECESSOR_STATEMENT_RECEIPT, 15, 15),
});
const PROMOTION = strictRecord({
  schemaVersion: literal("coderso.task551.task489-predecessor-promotion@v1"),
  sourceTask: literal("TASK-551-05-L02"),
  sourcePhase: literal("05-l02"),
  sourceProfile: NULL,
  sourceScenario: literal("task489-predecessor"),
  sourceHead: gitSha,
  sourceDigest: lowercaseSha256,
  predecessor: strictRecord({
    sourcePath: literal(".tmp/task-551/task489-predecessor-v1.json"),
    durablePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/task489-predecessor-v1.json`),
    schemaVersion: literal("coderso.task551.task489-predecessor@v1"),
    digest: lowercaseSha256,
  }),
  promotionState: literal("promoted"),
  promotionDecision: literal("accept"),
  promotionReason: literal("exact-byte-match-after-owner-review"),
  validationSummaries: strictRecord({
    sourceIdentity: literal("passed"),
    predecessorBytes: literal("passed"),
    atomicNoReplace: literal("passed"),
    terminalHead: literal("passed"),
  }),
  createdAt: utcTimestamp,
  reviewedAt: utcTimestamp,
  promotedAt: utcTimestamp,
  ownerCapabilityReceiptDigest: lowercaseSha256,
});
const makeRoot = (row, expectedTaskId, fields, result) => {
  const keys = Object.keys(fields);
  if (keys.length !== row.keys.length || keys.some((key, index) => key !== row.keys[index])) {
    throw new Error("task551_evidence_descriptor_root_keys_invalid");
  }
  return frozen({
    manifestRow: row,
    path: row.path,
    expectedTaskId,
    keys: row.keys,
    root: strictRecord(fields),
    result,
    maxDepth: 12,
    maxNodes: 4_096,
    maxItems: 1_024,
    maxUtf8Bytes: 16_384,
    maxDocumentUtf8Bytes: TASK551_EVIDENCE_MAX_DOCUMENT_UTF8_BYTES,
  });
};
const l03InitializeResult = strictRecord({
  pass: TRUE,
  noLeak: TRUE,
  commandReceipt: INITIALIZE_PROCESS_RESULT,
});
const l03CheckResult = strictRecord({
  pass: TRUE,
  noLeak: TRUE,
  producer: BOOTSTRAP_PRODUCER,
  focusedTestReceipt: PROCESS_RESULT,
  checkCommandReceipt: PROCESS_RESULT,
});
const staticResult = strictRecord({
  pass: TRUE,
  noLeak: TRUE,
  focusedTests: fixedArray([PROCESS_RESULT, PROCESS_RESULT]),
  manifestSha256: lowercaseSha256,
});
const freezeResult = (profile) =>
  strictRecord({
    pass: TRUE,
    noLeak: TRUE,
    candidateReceipt: REVIEWABLE_RECEIPT(profile, "candidate"),
    candidateCanonicalReceiptDigest: lowercaseSha256,
    freezeCommandReceipt: PROCESS_RESULT,
  });
const reviewedResult = strictRecord({ pass: TRUE, noLeak: TRUE, reviewed: REVIEWED_CANDIDATES });
const checkResult = (profile) =>
  strictRecord({
    pass: TRUE,
    noLeak: TRUE,
    staticEvidencePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-static-${profile}.json`),
    candidatePath: literal(
      `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-freeze-candidate-${profile}.json`
    ),
    reviewedCandidatesPath: literal(
      `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-reviewed-candidates.json`
    ),
    checkCommandReceipt: PROCESS_RESULT,
    immutableDigests: IMMUTABLE_DIGESTS,
    targetProof: literal("current-database-and-single-marker"),
  });

export const TASK551_EVIDENCE_VALUE_DESCRIPTORS = frozen([
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[0],
    "TASK-551-01-L03",
    {
      schema: literal("coderso.task551.l03-initialize-evidence@v1"),
      taskId: literal("TASK-551-01-L03"),
      phase: literal("l03-initialize"),
      pass: TRUE,
      noLeak: TRUE,
      commandReceipt: INITIALIZE_PROCESS_RESULT,
    },
    l03InitializeResult
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[1],
    "TASK-551-01-L03",
    {
      schema: literal("coderso.task551.l03-check-evidence@v1"),
      taskId: literal("TASK-551-01-L03"),
      phase: literal("l03-check"),
      pass: TRUE,
      noLeak: TRUE,
      producer: BOOTSTRAP_PRODUCER,
      focusedTestReceipt: PROCESS_RESULT,
      checkCommandReceipt: PROCESS_RESULT,
    },
    l03CheckResult
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[2],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02-static-evidence@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-static"),
      profile: literal("small"),
      pass: TRUE,
      noLeak: TRUE,
      focusedTests: fixedArray([PROCESS_RESULT, PROCESS_RESULT]),
      manifestSha256: lowercaseSha256,
    },
    staticResult
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[3],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02-static-evidence@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-static"),
      profile: literal("large"),
      pass: TRUE,
      noLeak: TRUE,
      focusedTests: fixedArray([PROCESS_RESULT, PROCESS_RESULT]),
      manifestSha256: lowercaseSha256,
    },
    staticResult
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[4],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02.freeze-candidate@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-freeze-candidate"),
      profile: literal("small"),
      pass: TRUE,
      noLeak: TRUE,
      candidateReceipt: REVIEWABLE_RECEIPT("small", "candidate"),
      candidateCanonicalReceiptDigest: lowercaseSha256,
      freezeCommandReceipt: PROCESS_RESULT,
    },
    freezeResult("small")
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[5],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02.freeze-candidate@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-freeze-candidate"),
      profile: literal("large"),
      pass: TRUE,
      noLeak: TRUE,
      candidateReceipt: REVIEWABLE_RECEIPT("large", "candidate"),
      candidateCanonicalReceiptDigest: lowercaseSha256,
      freezeCommandReceipt: PROCESS_RESULT,
    },
    freezeResult("large")
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[6],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02.reviewed-candidates@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-reviewed-candidates"),
      pass: TRUE,
      noLeak: TRUE,
      reviewed: REVIEWED_CANDIDATES,
    },
    reviewedResult
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[7],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02.check-evidence@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-check"),
      profile: literal("small"),
      pass: TRUE,
      noLeak: TRUE,
      staticEvidencePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-static-small.json`),
      candidatePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-freeze-candidate-small.json`),
      reviewedCandidatesPath: literal(
        `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-reviewed-candidates.json`
      ),
      checkCommandReceipt: PROCESS_RESULT,
      immutableDigests: IMMUTABLE_DIGESTS,
      targetProof: literal("current-database-and-single-marker"),
    },
    checkResult("small")
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[8],
    "TASK-551-01-L02",
    {
      schema: literal("coderso.task551.l02.check-evidence@v1"),
      taskId: literal("TASK-551-01-L02"),
      phase: literal("l02-check"),
      profile: literal("large"),
      pass: TRUE,
      noLeak: TRUE,
      staticEvidencePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-static-large.json`),
      candidatePath: literal(`${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-freeze-candidate-large.json`),
      reviewedCandidatesPath: literal(
        `${TASK551_CANONICAL_EVIDENCE_ROOT}/l02-reviewed-candidates.json`
      ),
      checkCommandReceipt: PROCESS_RESULT,
      immutableDigests: IMMUTABLE_DIGESTS,
      targetProof: literal("current-database-and-single-marker"),
    },
    checkResult("large")
  ),
  makeRoot(
    TASK551_DURABLE_EVIDENCE_MANIFEST[9],
    "TASK-551-05-L02",
    {
      schema: literal("coderso.task551.task489-predecessor@v1"),
      pass: TRUE,
      noLeak: TRUE,
      companionIds: fixedArray(PREDECESSOR_COMPANIONS.map(literal)),
      fixtureCounts: PREDECESSOR_FIXTURE_COUNTS,
      logicalCases: boundedArray(PREDECESSOR_LOGICAL_CASE, 14, 14),
      statementReceipts: boundedArray(PREDECESSOR_STATEMENT_RECEIPT, 15, 15),
    },
    null
  ),
  makeRoot(TASK551_DURABLE_EVIDENCE_MANIFEST[10], "TASK-551-05-L02", PROMOTION.fields, null),
]);
const descriptorByRow = new Map(
  TASK551_EVIDENCE_VALUE_DESCRIPTORS.map((descriptor) => [descriptor.manifestRow, descriptor])
);

export const TASK551_L10_PROJECTION_KEYS = frozenStrings([
  "consumer",
  "schema",
  "taskId",
  "phase",
  "scenario",
  "profile",
  "status",
  "result",
  "timestamp",
  "sourceHead",
  "sourceDigest",
  "noLeak",
  "predecessor",
  "promotion",
]);
export const TASK551_L10_RESULT_FIELDS = frozen({
  "l03-initialize": frozenStrings(["pass", "noLeak", "commandReceipt"]),
  "l03-check": frozenStrings([
    "pass",
    "noLeak",
    "producer",
    "focusedTestReceipt",
    "checkCommandReceipt",
  ]),
  "l02-static": frozenStrings(["pass", "noLeak", "focusedTests", "manifestSha256"]),
  "l02-freeze-candidate": frozenStrings([
    "pass",
    "noLeak",
    "candidateReceipt",
    "candidateCanonicalReceiptDigest",
    "freezeCommandReceipt",
  ]),
  "l02-reviewed-candidates": frozenStrings(["pass", "noLeak", "reviewed"]),
  "l02-check": frozenStrings([
    "pass",
    "noLeak",
    "staticEvidencePath",
    "candidatePath",
    "reviewedCandidatesPath",
    "checkCommandReceipt",
    "immutableDigests",
    "targetProof",
  ]),
});
export const TASK551_L10_PROJECTION_MATRIX = frozen({
  "l03-initialize": frozen({
    kind: "evidence",
    profileValues: frozen([null]),
    scenario: "l03-initialize",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l03-initialize"],
  }),
  "l03-check": frozen({
    kind: "evidence",
    profileValues: frozen([null]),
    scenario: "l03-check",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l03-check"],
  }),
  "l02-static": frozen({
    kind: "evidence",
    profileValues: frozenStrings(["small", "large"]),
    scenario: "l02-static",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l02-static"],
  }),
  "l02-freeze-candidate": frozen({
    kind: "evidence",
    profileValues: frozenStrings(["small", "large"]),
    scenario: "l02-freeze-candidate",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l02-freeze-candidate"],
  }),
  "l02-reviewed-candidates": frozen({
    kind: "evidence",
    profileValues: frozen([null]),
    scenario: "l02-reviewed-candidates",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l02-reviewed-candidates"],
  }),
  "l02-check": frozen({
    kind: "evidence",
    profileValues: frozenStrings(["small", "large"]),
    scenario: "l02-check",
    noLeak: true,
    predecessor: null,
    promotion: null,
    resultKeys: TASK551_L10_RESULT_FIELDS["l02-check"],
  }),
  "task489-predecessor-promotion": frozen({
    kind: "terminal",
    profileValues: frozen([null]),
    scenario: "task489-predecessor",
    noLeak: null,
    predecessor: "required",
    promotion: "required",
    result: null,
  }),
});
export const TASK551_CONSUMER_FIELDS = frozen({
  l10Aggregate: frozenStrings([
    "schema",
    "pass",
    "summary",
    "head",
    "fixtureProfiles",
    "commands",
    "ownerTargetedHandoffs",
    "metrics",
    "errors",
  ]),
  l10Redis: frozenStrings([
    "schema",
    "pass",
    "serverUp",
    "redisVersion",
    "namespaceDigest",
    "publicConsistency",
    "scenarios",
    "consoleErrors",
    "screenshots",
    "failures",
  ]),
  l10AdminUi: frozenStrings([
    "schema",
    "pass",
    "session",
    "scenarios",
    "consoleErrors",
    "failures",
  ]),
  task489Predecessor: TASK551_DURABLE_EVIDENCE_MANIFEST[9].keys,
  task489Promotion: TASK551_DURABLE_EVIDENCE_MANIFEST[10].keys,
});
function ownDataRecordValues(value, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    if (
      expectedKeys !== undefined &&
      (ownKeys.length !== expectedKeys.length ||
        ownKeys.some((key, index) => key !== expectedKeys[index]))
    )
      return null;
    const keys = expectedKeys ?? ownKeys;
    const values = [];
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        return null;
      values.push(descriptor.value);
    }
    return values;
  } catch {
    return null;
  }
}

function ownDenseArrayValues(value) {
  if (!Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      lengthDescriptor.enumerable !== false ||
      !Object.hasOwn(lengthDescriptor, "value")
    )
      return null;
    const values = [];
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        return null;
      values.push(descriptor.value);
    }
    if (
      ownKeys.some(
        (key) =>
          key !== "length" &&
          (typeof key !== "string" ||
            !/^(0|[1-9][0-9]*)$/u.test(key) ||
            Number(key) >= value.length)
      )
    )
      return null;
    return values;
  } catch {
    return null;
  }
}

function isPlainOwnDataRecord(value, keys) {
  return ownDataRecordValues(value, keys) !== null;
}

function decodeDescriptor(descriptor, value, state, depth = 0) {
  if (depth > state.maxDepth || ++state.nodes > state.maxNodes) return INVALID_EVIDENCE_VALUE;
  try {
    if (descriptor.kind === "literal")
      return Object.is(value, descriptor.value) ? value : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "string") {
      if (
        typeof value !== "string" ||
        Buffer.byteLength(value, "utf8") < descriptor.min ||
        Buffer.byteLength(value, "utf8") > descriptor.max ||
        !SAFE_REDACTED_TEXT.test(value) ||
        FORBIDDEN_EVIDENCE_TEXT.test(value)
      )
        return INVALID_EVIDENCE_VALUE;
      return value;
    }
    if (descriptor.kind === "sha256")
      return typeof value === "string" && SHA256.test(value) && !/^0{64}$/u.test(value)
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "prefixed-sha256")
      return typeof value === "string" &&
        /^sha256:[a-f0-9]{64}$/u.test(value) &&
        !/^sha256:0{64}$/u.test(value)
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "git-sha")
      return typeof value === "string" && GIT_SHA.test(value) && !/^0+$/u.test(value)
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "utc-timestamp") {
      return isCanonicalUtcTimestamp(value) ? value : INVALID_EVIDENCE_VALUE;
    }
    if (descriptor.kind === "safe-integer")
      return Number.isSafeInteger(value) && value >= descriptor.min && value <= descriptor.max
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "finite-number")
      return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= descriptor.min &&
        value <= descriptor.max
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (descriptor.kind === "one-of")
      return descriptor.options.some(
        (option) => option.kind === "literal" && Object.is(option.value, value)
      )
        ? value
        : INVALID_EVIDENCE_VALUE;
    if (value === null || typeof value !== "object" || state.seen.has(value))
      return INVALID_EVIDENCE_VALUE;
    state.seen.add(value);
    if (descriptor.kind === "record") {
      const values = ownDataRecordValues(value, descriptor.keys);
      if (values === null) return INVALID_EVIDENCE_VALUE;
      const copy = {};
      for (let index = 0; index < descriptor.keys.length; index += 1) {
        const key = descriptor.keys[index];
        const decoded = decodeDescriptor(descriptor.fields[key], values[index], state, depth + 1);
        if (decoded === INVALID_EVIDENCE_VALUE) return decoded;
        copy[key] = decoded;
      }
      return frozen(copy);
    }
    if (descriptor.kind === "tuple" || descriptor.kind === "array") {
      const values = ownDenseArrayValues(value);
      if (values === null) return INVALID_EVIDENCE_VALUE;
      const expectedLength = descriptor.kind === "tuple" ? descriptor.items.length : undefined;
      if (
        values.length > state.maxItems ||
        (expectedLength !== undefined && values.length !== expectedLength) ||
        (expectedLength === undefined &&
          (values.length < descriptor.min || values.length > descriptor.max))
      )
        return INVALID_EVIDENCE_VALUE;
      const copy = [];
      for (let index = 0; index < values.length; index += 1) {
        const itemDescriptor =
          descriptor.kind === "tuple" ? descriptor.items[index] : descriptor.item;
        const decoded = decodeDescriptor(itemDescriptor, values[index], state, depth + 1);
        if (decoded === INVALID_EVIDENCE_VALUE) return decoded;
        copy.push(decoded);
      }
      return frozen(copy);
    }
  } catch {
    return INVALID_EVIDENCE_VALUE;
  }
  return INVALID_EVIDENCE_VALUE;
}

const canonicalRows = new Set(TASK551_DURABLE_EVIDENCE_MANIFEST);
function canonicalRow(row) {
  return canonicalRows.has(row) ? row : null;
}

function decodeTask551EvidenceValue(row, value) {
  const canonical = canonicalRow(row);
  const descriptor = canonical === null ? null : descriptorByRow.get(canonical);
  if (canonical === null || descriptor === undefined)
    return { error: "task551_evidence_manifest_not_canonical" };
  const decoded = decodeDescriptor(descriptor.root, value, {
    maxDepth: descriptor.maxDepth,
    maxNodes: descriptor.maxNodes,
    maxItems: descriptor.maxItems,
    nodes: 0,
    seen: new Set(),
  });
  if (decoded === INVALID_EVIDENCE_VALUE) {
    return { error: TASK551_EVIDENCE_VALUE_INVALID };
  }
  try {
    if (Buffer.byteLength(JSON.stringify(decoded), "utf8") + 1 > descriptor.maxDocumentUtf8Bytes)
      return { error: TASK551_EVIDENCE_VALUE_INVALID };
  } catch {
    return { error: TASK551_EVIDENCE_VALUE_INVALID };
  }
  return { value: decoded };
}

export function validateTask551EvidenceValue(manifestRowValue, value) {
  return decodeTask551EvidenceValue(manifestRowValue, value).error ?? null;
}

function skipJsonWhitespace(text, index) {
  while (index < text.length && /[\u0020\u000a\u000d\u0009]/u.test(text[index])) index += 1;
  return index;
}
function scanJsonString(text, index) {
  if (text[index] !== '"') throw new Error("task551_evidence_json_string_expected");
  let cursor = index + 1;
  while (cursor < text.length) {
    const code = text.charCodeAt(cursor);
    if (code < 0x20) throw new Error("task551_evidence_json_control");
    if (text[cursor] === '"') return cursor + 1;
    if (text[cursor] === "\\") {
      cursor += 1;
      if (cursor >= text.length) throw new Error("task551_evidence_json_escape");
      if (text[cursor] === "u") {
        if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(cursor + 1, cursor + 5)))
          throw new Error("task551_evidence_json_unicode_escape");
        cursor += 5;
      } else if (!'"\\/bfnrt'.includes(text[cursor]))
        throw new Error("task551_evidence_json_escape");
      else cursor += 1;
    } else cursor += 1;
  }
  throw new Error("task551_evidence_json_unterminated_string");
}
function scanJsonValue(text, index) {
  let cursor = skipJsonWhitespace(text, index);
  const initial = text[cursor];
  if (initial === '"') return scanJsonString(text, cursor);
  if (initial === "{") {
    cursor = skipJsonWhitespace(text, cursor + 1);
    const keys = new Set();
    if (text[cursor] === "}") return cursor + 1;
    while (true) {
      const start = cursor;
      cursor = scanJsonString(text, cursor);
      const key = JSON.parse(text.slice(start, cursor));
      if (keys.has(key)) throw new Error("task551_evidence_json_duplicate_key");
      keys.add(key);
      cursor = skipJsonWhitespace(text, cursor);
      if (text[cursor] !== ":") throw new Error("task551_evidence_json_colon");
      cursor = scanJsonValue(text, cursor + 1);
      cursor = skipJsonWhitespace(text, cursor);
      if (text[cursor] === "}") return cursor + 1;
      if (text[cursor] !== ",") throw new Error("task551_evidence_json_object_delimiter");
      cursor = skipJsonWhitespace(text, cursor + 1);
    }
  }
  if (initial === "[") {
    cursor = skipJsonWhitespace(text, cursor + 1);
    if (text[cursor] === "]") return cursor + 1;
    while (true) {
      cursor = scanJsonValue(text, cursor);
      cursor = skipJsonWhitespace(text, cursor);
      if (text[cursor] === "]") return cursor + 1;
      if (text[cursor] !== ",") throw new Error("task551_evidence_json_array_delimiter");
      cursor = skipJsonWhitespace(text, cursor + 1);
    }
  }
  const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/u.exec(
    text.slice(cursor)
  );
  if (match === null) throw new Error("task551_evidence_json_value");
  return cursor + match[0].length;
}
function parseUniqueJson(text) {
  const end = skipJsonWhitespace(text, scanJsonValue(text, 0));
  if (end !== text.length) throw new Error("task551_evidence_json_trailing");
  return JSON.parse(text);
}

export function validateTask551EvidenceBytes(manifestRowValue, bytes) {
  const canonical = canonicalRow(manifestRowValue);
  if (canonical === null) return "task551_evidence_manifest_not_canonical";
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > 1_048_576)
    return "task551_evidence_bytes_invalid";
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return "task551_evidence_json_invalid";
  if (
    bytes[bytes.byteLength - 1] !== 0x0a ||
    (bytes.byteLength > 1 && bytes[bytes.byteLength - 2] === 0x0a)
  )
    return "task551_evidence_lf_terminated";
  let value;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\r")) return "task551_evidence_lf_terminated";
    value = parseUniqueJson(text.slice(0, -1));
  } catch (error) {
    return error?.message === "task551_evidence_json_duplicate_key"
      ? error.message
      : "task551_evidence_json_invalid";
  }
  return validateTask551EvidenceValue(canonical, value);
}

export function sha256Task551Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireTask551TerminalCommittedHead(condition) {
  if (!condition) throw new Error(TASK551_TERMINAL_COMMITTED_HEAD_VERIFY_ERROR);
}

function terminalCommittedHeadFileDigests(value, expectedKeys, currentTree) {
  const entries = ownDenseArrayValues(value);
  requireTask551TerminalCommittedHead(
    entries !== null && entries.length === TASK551_TERMINAL_HANDOFF_PATHS.length
  );
  const observations = new Map();
  for (const entry of entries) {
    const fields = ownDataRecordValues(entry, expectedKeys);
    requireTask551TerminalCommittedHead(fields !== null);
    const [path, tracked, kind, bytes, dirty, replaced] = fields;
    requireTask551TerminalCommittedHead(
      typeof path === "string" &&
        TASK551_TERMINAL_HANDOFF_PATHS.includes(path) &&
        !observations.has(path) &&
        tracked === true &&
        kind === "regular" &&
        (!currentTree || (dirty === false && replaced === false)) &&
        bytes instanceof Uint8Array
    );
    try {
      const copiedBytes = new Uint8Array(bytes);
      const digest = sha256Task551Bytes(copiedBytes);
      let value = null;
      if (!currentTree) {
        const manifestRow = rowByPath.get(path);
        requireTask551TerminalCommittedHead(
          manifestRow !== undefined &&
            validateTask551EvidenceBytes(manifestRow, copiedBytes) === null
        );
        value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(copiedBytes));
      }
      observations.set(path, { digest, value });
    } catch {
      throw new Error(TASK551_TERMINAL_COMMITTED_HEAD_VERIFY_ERROR);
    }
  }
  requireTask551TerminalCommittedHead(observations.size === TASK551_TERMINAL_HANDOFF_PATHS.length);
  return observations;
}

/** Validates injected observations only; no repository adapter or raw-byte output. */
export async function verifyTask551TerminalCommittedHeadHandoff(input) {
  const values = ownDataRecordValues(input, TASK551_TERMINAL_COMMITTED_HEAD_INPUT_KEYS);
  requireTask551TerminalCommittedHead(values !== null);
  const [
    sourceHead,
    terminalHead,
    terminalParentHead,
    commitBChangedPaths,
    terminalHeadFiles,
    currentTreeFiles,
  ] = values;
  requireTask551TerminalCommittedHead(
    typeof sourceHead === "string" &&
      typeof terminalHead === "string" &&
      typeof terminalParentHead === "string" &&
      GIT_SHA.test(sourceHead) &&
      GIT_SHA.test(terminalHead) &&
      GIT_SHA.test(terminalParentHead) &&
      !/^0+$/u.test(sourceHead) &&
      !/^0+$/u.test(terminalHead) &&
      !/^0+$/u.test(terminalParentHead) &&
      sourceHead !== terminalHead &&
      terminalParentHead === sourceHead
  );
  const changedPaths = ownDenseArrayValues(commitBChangedPaths);
  requireTask551TerminalCommittedHead(
    changedPaths !== null &&
      changedPaths.length === TASK551_TERMINAL_HANDOFF_PATHS.length &&
      new Set(changedPaths).size === TASK551_TERMINAL_HANDOFF_PATHS.length &&
      changedPaths.every(
        (path) => typeof path === "string" && TASK551_TERMINAL_HANDOFF_PATHS.includes(path)
      )
  );
  const headFiles = terminalCommittedHeadFileDigests(
    terminalHeadFiles,
    TASK551_TERMINAL_HEAD_FILE_KEYS,
    false
  );
  const currentFiles = terminalCommittedHeadFileDigests(
    currentTreeFiles,
    TASK551_TERMINAL_CURRENT_FILE_KEYS,
    true
  );
  for (const path of TASK551_TERMINAL_HANDOFF_PATHS) {
    requireTask551TerminalCommittedHead(
      headFiles.get(path)?.digest === currentFiles.get(path)?.digest
    );
  }
  try {
    const promotion = headFiles.get(TASK551_TERMINAL_HANDOFF_PATHS[1])?.value;
    requireTask551TerminalCommittedHead(
      promotion?.sourceHead === sourceHead &&
        promotion?.predecessor?.durablePath === TASK551_TERMINAL_HANDOFF_PATHS[0] &&
        promotion?.predecessor?.digest === headFiles.get(TASK551_TERMINAL_HANDOFF_PATHS[0])?.digest
    );
  } catch {
    throw new Error(TASK551_TERMINAL_COMMITTED_HEAD_VERIFY_ERROR);
  }
  return true;
}

/** Binds Commit B's opaque file observations to the two durable writer receipts. */
export function requireTask551TerminalEvidenceHandoffBinding(
  handoff,
  terminal,
  predecessorReceipt,
  promotionReceipt
) {
  const code = "task551_implement_terminal_handoff_mismatch";
  try {
    const files = handoff?.terminalHeadFiles;
    if (!Array.isArray(files)) throw new Error(code);
    const find = (row) => files.find((file) => file?.path === row.path);
    const predecessor = find(TASK551_DURABLE_EVIDENCE_MANIFEST[9]),
      promotion = find(TASK551_DURABLE_EVIDENCE_MANIFEST[10]);
    if (
      !(predecessor?.bytes instanceof Uint8Array) ||
      !(promotion?.bytes instanceof Uint8Array) ||
      validateTask551EvidenceBytes(TASK551_DURABLE_EVIDENCE_MANIFEST[9], predecessor.bytes) !==
        null ||
      validateTask551EvidenceBytes(TASK551_DURABLE_EVIDENCE_MANIFEST[10], promotion.bytes) !==
        null ||
      predecessorReceipt?.digest !== `sha256:${sha256Task551Bytes(predecessor.bytes)}` ||
      promotionReceipt?.digest !== `sha256:${sha256Task551Bytes(promotion.bytes)}`
    )
      throw new Error(code);
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(promotion.bytes));
    if (
      value.sourceHead !== terminal?.promotionValue?.sourceHead ||
      value.sourceDigest !== terminal?.sourceDigest ||
      value.predecessor?.digest !== predecessorReceipt.digest.slice("sha256:".length)
    )
      throw new Error(code);
    return true;
  } catch {
    throw new Error(code);
  }
}

/** A test seam may not claim a durable receipt for bytes it did not write. */
export function requireTask551EvidenceWriteReceiptDigest(manifestRowValue, value, receipt) {
  const row = canonicalRow(manifestRowValue),
    decoded =
      row === null
        ? { error: TASK551_EVIDENCE_VALUE_INVALID }
        : decodeTask551EvidenceValue(row, value);
  if (
    decoded.error ||
    receipt?.digest !==
      `sha256:${sha256Task551Bytes(new TextEncoder().encode(`${JSON.stringify(decoded.value)}\n`))}`
  )
    throw new Error("task551_evidence_receipt_digest_mismatch");
  return true;
}

function detachedOwnDataRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) return null;
    const copy = {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
        return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch {
    return null;
  }
}

function decodeState(descriptor) {
  return {
    maxDepth: descriptor.maxDepth,
    maxNodes: descriptor.maxNodes,
    maxItems: descriptor.maxItems,
    nodes: 0,
    seen: new Set(),
  };
}

function requireProjectionInput(input) {
  const copy = detachedOwnDataRecord(input);
  const allowed = new Set([
    "manifestRow",
    "taskId",
    "sourceHead",
    "sourceDigest",
    "timestamp",
    "status",
    "result",
    "predecessor",
    "promotion",
  ]);
  const required = ["manifestRow", "taskId", "sourceHead", "sourceDigest", "timestamp", "result"];
  if (copy === null) throw new Error("task551_l10_projection_input_invalid");
  if (Object.keys(copy).some((key) => !allowed.has(key)))
    throw new Error("task551_l10_projection_keys_mismatch");
  if (required.some((key) => !Object.hasOwn(copy, key)))
    throw new Error("task551_l10_projection_keys_mismatch");
  if (
    copy.taskId !== "TASK-551-11" ||
    typeof copy.sourceHead !== "string" ||
    !GIT_SHA.test(copy.sourceHead) ||
    /^0+$/u.test(copy.sourceHead) ||
    typeof copy.sourceDigest !== "string" ||
    !SHA256.test(copy.sourceDigest) ||
    /^0{64}$/u.test(copy.sourceDigest) ||
    !isCanonicalUtcTimestamp(copy.timestamp) ||
    (Object.hasOwn(copy, "status") && copy.status !== "accepted")
  )
    throw new Error("task551_l10_projection_identity_invalid");
  return copy;
}

function decodeProjectionValue(descriptor, value, state = decodeState(descriptor)) {
  const decoded = decodeDescriptor(descriptor, value, state);
  if (decoded === INVALID_EVIDENCE_VALUE) throw new Error("task551_l10_projection_value_invalid");
  return decoded;
}

function decodeTerminalPredecessor(value, state) {
  const predecessor = decodeProjectionValue(PREDECESSOR_PAYLOAD, value, state);
  return predecessor;
}

export function buildTask551L10EvidenceProjection(input) {
  const request = requireProjectionInput(input);
  const row = canonicalRow(request.manifestRow);
  const descriptor = row === null ? undefined : descriptorByRow.get(row);
  if (row === null || descriptor === undefined)
    throw new Error("task551_l10_projection_manifest_not_canonical");
  const matrix = TASK551_L10_PROJECTION_MATRIX[row.phase];
  if (matrix?.kind === "evidence") {
    if (Object.hasOwn(request, "predecessor") || Object.hasOwn(request, "promotion"))
      throw new Error("task551_l10_projection_terminal_invalid");
    const result = decodeProjectionValue(descriptor.result, request.result);
    return frozen({
      consumer: "TASK-551-10-L01",
      schema: row.schema,
      taskId: "TASK-551-11",
      phase: row.phase,
      scenario: matrix.scenario,
      profile: row.profile ?? null,
      status: "accepted",
      result,
      timestamp: request.timestamp,
      sourceHead: request.sourceHead,
      sourceDigest: request.sourceDigest,
      noLeak: true,
      predecessor: null,
      promotion: null,
    });
  }
  if (
    matrix?.kind === "terminal" &&
    request.result === null &&
    Object.hasOwn(request, "predecessor") &&
    Object.hasOwn(request, "promotion")
  ) {
    const state = decodeState(descriptor);
    const predecessor = decodeTerminalPredecessor(request.predecessor, state);
    const promotion = decodeProjectionValue(PROMOTION, request.promotion, state);
    if (
      promotion.sourceHead !== request.sourceHead ||
      promotion.sourceDigest !== request.sourceDigest
    )
      throw new Error("task551_l10_projection_terminal_invalid");
    return frozen({
      consumer: "TASK-551-10-L01",
      schema: row.schema,
      taskId: "TASK-551-11",
      phase: row.phase,
      scenario: matrix.scenario,
      profile: null,
      status: "accepted",
      result: null,
      timestamp: request.timestamp,
      sourceHead: request.sourceHead,
      sourceDigest: request.sourceDigest,
      noLeak: null,
      predecessor,
      promotion,
    });
  }
  throw new Error("task551_l10_projection_terminal_invalid");
}

const TASK551_EVIDENCE_FILESYSTEM_POLICY = Object.freeze({
  canonicalRoot: TASK551_CANONICAL_EVIDENCE_ROOT,
  manifest: TASK551_DURABLE_EVIDENCE_MANIFEST,
  rowIds: TASK551_EVIDENCE_ROW_IDS,
  rowByPath,
  validateBytes: validateTask551EvidenceBytes,
  decodeValue: decodeTask551EvidenceValue,
  sha256: sha256Task551Bytes,
});

function requireOwnerEvidenceStorage() {
  if (ownerEvidenceStorage === undefined) throw new Error("task551_evidence_storage_uninstalled");
  return ownerEvidenceStorage;
}
function canonicalEvidenceRowId(rowId) {
  if (typeof rowId !== "string" || !Object.hasOwn(TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID, rowId))
    throw new Error("task551_evidence_row_id_invalid");
  return TASK551_DURABLE_EVIDENCE_MANIFEST[TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID[rowId]];
}

/** Eager owner-only bootstrap. It deliberately accepts no filesystem authority. */
export async function bootstrapTask551EvidenceStorageForOwnerWorkflowHost() {
  if (arguments.length !== 0 || ownerEvidenceStorageBootstrap !== undefined)
    throw new Error("task551_evidence_storage_rebind");
  ownerEvidenceStorageBootstrap = installTask551EvidenceStorageForOwner({
    repoRoot: TASK551_EVIDENCE_REPOSITORY_ROOT,
    canonicalRoot: TASK551_CANONICAL_EVIDENCE_ROOT,
  });
  ownerEvidenceStorage = await ownerEvidenceStorageBootstrap;
  return true;
}

/** Schema/recovery facade; callers cannot supply root, path, fs, or run state. */
export async function recoverTask551EvidenceRoot() {
  if (arguments.length !== 0) throw new Error("task551_evidence_recovery_request_invalid");
  return recoverTask551EvidenceFilesystem(
    requireOwnerEvidenceStorage(),
    TASK551_EVIDENCE_FILESYSTEM_POLICY
  );
}

/** Schema-bound owner-private no-replace writer. */
export async function writeTask551EvidenceFileIfAbsent(rowId, value) {
  if (arguments.length !== 2) throw new Error("task551_evidence_write_request_invalid");
  return writeTask551EvidenceFilesystem(
    requireOwnerEvidenceStorage(),
    canonicalEvidenceRowId(rowId),
    value,
    TASK551_EVIDENCE_FILESYSTEM_POLICY
  );
}

function task551EvidenceTestHarness(storage) {
  return Object.freeze({
    recover: () => recoverTask551EvidenceFilesystem(storage, TASK551_EVIDENCE_FILESYSTEM_POLICY),
    write: (rowId, value) =>
      writeTask551EvidenceFilesystem(
        storage,
        canonicalEvidenceRowId(rowId),
        value,
        TASK551_EVIDENCE_FILESYSTEM_POLICY
      ),
    stage: (rowId, value, count = 1) =>
      stageTask551EvidenceTestTemp(
        storage,
        canonicalEvidenceRowId(rowId),
        value,
        TASK551_EVIDENCE_FILESYSTEM_POLICY,
        count
      ),
    restart: async () =>
      task551EvidenceTestHarness(await restartTask551EvidenceStorageForTests(storage)),
    faults: async (faults) => {
      if (!Array.isArray(faults)) throw new Error("task551_evidence_test_fault_invalid");
      if (
        faults.length === 0 ||
        faults.every((fault) => typeof fault === "object" && fault !== null)
      )
        return setTask551EvidenceTestFaultPlan(storage, faults);
      if (faults.every((fault) => typeof fault === "string")) {
        if (
          faults.length === 0 ||
          faults.length > 4 ||
          [...new Set(faults)].length !== faults.length
        )
          throw new Error("task551_evidence_test_fault_invalid");
        for (const fault of [...faults].sort()) await applyTask551EvidenceTestFault(storage, fault);
        return true;
      }
      return setTask551EvidenceTestFaultPlan(storage, faults);
    },
  });
}
/** Static-closure-limited focused-test seam; it is not part of the facade declaration. */
export async function createTask551EvidenceTestHarnessForTests() {
  return task551EvidenceTestHarness(
    await installTask551EvidenceStorageForTests(TASK551_CANONICAL_EVIDENCE_ROOT)
  );
}
