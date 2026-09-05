import { describe, expect, test } from "bun:test";
const it = test;
import { readFileSync } from "node:fs";
import {
  getTask551FreezeCandidateGenerationBootstrapV2,
  parseTask551FreezeCandidateGenerationBootstrapV2,
  TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2,
  type Task551FreezeCandidateGenerationBootstrapV2,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap";
import * as freezeCandidateGenerationBootstrap from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap";

const INVALID_ERROR_MESSAGE = "task551_freeze_candidate_generation_bootstrap_invalid";
const BOOTSTRAP_SCHEMA = "coderso.task551.freeze-candidate-generation-bootstrap@v2";
const GENERATION_ID = "task551-freeze-candidate-generation-v2";
const ARCHIVE_PATH = "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
const ARCHIVE_SHA256 = "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
const INITIAL_STATE = "awaiting-small";
const BOOTSTRAP_KEYS = ["schema", "version", "generationId", "archive", "state"] as const;
const ARCHIVE_KEYS = ["path", "sha256"] as const;
const PRODUCTION_SOURCE_URL =
  "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts";

function invalid(action: () => unknown): void {
  expect(action).toThrow(INVALID_ERROR_MESSAGE);
}

function buildValidArchive(): Record<string, unknown> {
  return { path: ARCHIVE_PATH, sha256: ARCHIVE_SHA256 };
}

function buildValidBootstrap(): Record<string, unknown> {
  return {
    schema: BOOTSTRAP_SCHEMA,
    version: 2,
    generationId: GENERATION_ID,
    archive: buildValidArchive(),
    state: INITIAL_STATE,
  };
}

function parseCandidate(candidate: unknown): Task551FreezeCandidateGenerationBootstrapV2 {
  return parseTask551FreezeCandidateGenerationBootstrapV2(candidate);
}

function buildWithoutOwnKey(key: string): Record<string, unknown> {
  const value = buildValidBootstrap();
  delete value[key];
  return value;
}

function buildArchiveWithoutOwnKey(key: string): Record<string, unknown> {
  const value = buildValidBootstrap();
  const archive = value.archive as Record<string, unknown>;
  delete archive[key];
  return value;
}

function buildWithUndefinedValue(key: string, nested: boolean): Record<string, unknown> {
  const value = buildValidBootstrap();
  if (nested) (value.archive as Record<string, unknown>)[key] = undefined;
  else value[key] = undefined;
  return value;
}

function buildWithSparseProperty(): Record<string, unknown> {
  const value = buildValidBootstrap();
  delete value.state;
  Object.defineProperty(value, "state", { enumerable: true, writable: true, configurable: true });
  return value;
}

function buildWithSparseArchiveArray(): Record<string, unknown> {
  const value = buildValidBootstrap();
  const archive = new Array(2) as unknown[];
  archive[0] = ARCHIVE_PATH;
  value.archive = archive;
  return value;
}

function buildWithAccessor(key: string, nested: boolean): Record<string, unknown> {
  const value = buildValidBootstrap();
  const holder = nested ? (value.archive as Record<string, unknown>) : value;
  const fieldValue = holder[key];
  delete holder[key];
  Object.defineProperty(holder, key, {
    enumerable: true,
    get() {
      return fieldValue;
    },
  });
  return value;
}

function buildWithReadWriteAccessor(): Record<string, unknown> {
  const value = buildValidBootstrap();
  Object.defineProperty(value, "state", {
    enumerable: true,
    get() {
      return INITIAL_STATE;
    },
    set(_next: string) {
      return;
    },
  });
  return value;
}

function buildWithNonEnumerableValue(): Record<string, unknown> {
  const value = buildValidBootstrap();
  Object.defineProperty(value, "version", {
    enumerable: false,
    value: 2,
    writable: true,
    configurable: true,
  });
  return value;
}

function buildWithInheritedArchiveOnly(): Record<string, unknown> {
  return Object.assign(Object.create(buildValidArchive()), {
    schema: BOOTSTRAP_SCHEMA,
    version: 2,
    generationId: GENERATION_ID,
    state: INITIAL_STATE,
  });
}

function attemptStateMutation(value: Task551FreezeCandidateGenerationBootstrapV2): void {
  (value as { state: string }).state = "reviewed";
}

function attemptArchiveMutation(value: Task551FreezeCandidateGenerationBootstrapV2): void {
  (value.archive as { sha256: string }).sha256 = "0".repeat(64);
}

describe("TASK-551 L04 freeze-candidate generation bootstrap", () => {
  it("exposes exactly the contract surface and pins the stable bootstrap identity", () => {
    const constant = TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2;
    expect(Object.keys(freezeCandidateGenerationBootstrap).sort()).toEqual([
      "TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2",
      "getTask551FreezeCandidateGenerationBootstrapV2",
      "parseTask551FreezeCandidateGenerationBootstrapV2",
    ]);
    expect(typeof parseTask551FreezeCandidateGenerationBootstrapV2).toBe("function");
    expect(typeof getTask551FreezeCandidateGenerationBootstrapV2).toBe("function");
    expect(constant).toEqual({
      schema: BOOTSTRAP_SCHEMA,
      version: 2,
      generationId: GENERATION_ID,
      archive: { path: ARCHIVE_PATH, sha256: ARCHIVE_SHA256 },
      state: INITIAL_STATE,
    });
    expect(constant.schema).toBe(BOOTSTRAP_SCHEMA);
    expect(constant.version).toBe(2);
    expect(constant.generationId).toBe(GENERATION_ID);
    expect(constant.archive.path).toBe(ARCHIVE_PATH);
    expect(constant.archive.sha256).toBe(ARCHIVE_SHA256);
    expect(constant.state).toBe(INITIAL_STATE);
    expect(Reflect.ownKeys(constant)).toEqual([...BOOTSTRAP_KEYS]);
    expect(Reflect.ownKeys(constant.archive)).toEqual([...ARCHIVE_KEYS]);
    expect(Object.getPrototypeOf(constant)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(constant.archive)).toBe(Object.prototype);
    expect(Object.isFrozen(constant)).toBe(true);
    expect(Object.isFrozen(constant.archive)).toBe(true);
    expect(getTask551FreezeCandidateGenerationBootstrapV2()).toBe(constant);
    expect(getTask551FreezeCandidateGenerationBootstrapV2()).toEqual(constant);
    for (const descriptor of BOOTSTRAP_KEYS.map((key) =>
      Object.getOwnPropertyDescriptor(constant, key)
    )) {
      expect(descriptor?.enumerable).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(descriptor, "value")).toBe(true);
      expect(descriptor?.get).toBeUndefined();
      expect(descriptor?.set).toBeUndefined();
    }
    for (const descriptor of ARCHIVE_KEYS.map((key) =>
      Object.getOwnPropertyDescriptor(constant.archive, key)
    )) {
      expect(descriptor?.enumerable).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(descriptor, "value")).toBe(true);
      expect(descriptor?.get).toBeUndefined();
      expect(descriptor?.set).toBeUndefined();
    }
  });

  it("returns a deeply frozen canonical clone and never mutates input or result", () => {
    const input = buildValidBootstrap();
    const inputBefore = JSON.stringify(input);
    const result = parseCandidate(input);
    expect(result).not.toBe(input);
    expect(result).not.toBe(TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2);
    expect(result).not.toBe(getTask551FreezeCandidateGenerationBootstrapV2());
    expect(result).toEqual(TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2);
    expect(JSON.stringify(result)).toBe(inputBefore);
    expect(JSON.stringify(input)).toBe(inputBefore);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.archive)).toBe(true);
    expect(parseCandidate(result)).toEqual(result);
    expect(() => attemptStateMutation(result)).toThrow(TypeError);
    expect(result.state).toBe(INITIAL_STATE);
    expect(() => attemptArchiveMutation(result)).toThrow(TypeError);
    expect(result.archive.sha256).toBe(ARCHIVE_SHA256);
    input.state = "reviewed";
    (input.archive as Record<string, unknown>).sha256 = "0".repeat(64);
    expect(JSON.stringify(input)).not.toBe(inputBefore);
    expect(result.state).toBe(INITIAL_STATE);
    expect(result.archive.sha256).toBe(ARCHIVE_SHA256);
  });

  it("rejects missing, undefined, and sparse own fields without defaulting any value", () => {
    for (const key of BOOTSTRAP_KEYS) {
      invalid(() => parseCandidate(buildWithoutOwnKey(key)));
      invalid(() => parseCandidate(buildWithUndefinedValue(key, false)));
    }
    for (const key of ARCHIVE_KEYS) {
      invalid(() => parseCandidate(buildArchiveWithoutOwnKey(key)));
      invalid(() => parseCandidate(buildWithUndefinedValue(key, true)));
    }
    invalid(() => parseCandidate(buildWithSparseProperty()));
    invalid(() => parseCandidate(new Array(3) as unknown));
    invalid(() => parseCandidate(buildWithSparseArchiveArray()));
    invalid(() =>
      parseCandidate({
        schema: BOOTSTRAP_SCHEMA,
        version: 2,
        generationId: GENERATION_ID,
        state: INITIAL_STATE,
      })
    );
    invalid(() => parseCandidate(buildValidArchive()));
  });

  it("rejects inherited fields, accessor fields, and non-plain prototypes", () => {
    invalid(() => parseCandidate(Object.create(buildValidBootstrap())));
    invalid(() => parseCandidate(buildWithInheritedArchiveOnly()));
    invalid(() => parseCandidate(Object.assign(Object.create(null), buildValidBootstrap())));
    for (const key of BOOTSTRAP_KEYS) {
      invalid(() => parseCandidate(buildWithAccessor(key, false)));
    }
    for (const key of ARCHIVE_KEYS) {
      invalid(() => parseCandidate(buildWithAccessor(key, true)));
    }
    invalid(() => parseCandidate(buildWithReadWriteAccessor()));
    invalid(() => parseCandidate(buildWithNonEnumerableValue()));
    const symbolKeyed = buildValidBootstrap();
    (symbolKeyed as Record<symbol, unknown>)[Symbol("task551-extra")] = true;
    invalid(() => parseCandidate(symbolKeyed));
    const symbolArchiveKey = buildValidBootstrap();
    (symbolArchiveKey.archive as Record<symbol, unknown>)[Symbol("task551-archive-extra")] = true;
    invalid(() => parseCandidate(symbolArchiveKey));
  });

  it("rejects every non-record input and every non-record archive value", () => {
    const nonRecords: unknown[] = [
      null,
      undefined,
      false,
      true,
      0,
      2,
      Number.NaN,
      "",
      BOOTSTRAP_SCHEMA,
      ARCHIVE_SHA256,
      3n,
      Symbol("task551"),
      [],
      new Array(2) as unknown[],
      new Date(0),
      new Map(),
      new Set(),
      /task551/u,
      Buffer.alloc(0),
      new Error(INVALID_ERROR_MESSAGE),
      () => undefined,
      function namedFactory() {
        return buildValidBootstrap();
      },
    ];
    for (const candidate of nonRecords) {
      invalid(() => parseCandidate(candidate));
      invalid(() => parseCandidate({ ...buildValidBootstrap(), archive: candidate }));
    }
  });

  it("rejects every wrong schema, version, generation, path, hash, and state value", () => {
    const schemaNegatives: string[] = [
      "",
      "coderso.task551.freeze-candidate-generation-bootstrap@v1",
      "coderso.task551.freeze-candidate-generation-bootstrap@v3",
      "coderso.task551.freeze-candidate-generation-bootstrap",
      "coderso.task551.database-baseline-check@v1",
      "coderso.task551.fixture-bootstrap-tool-contract@v1",
      BOOTSTRAP_SCHEMA.split("").reverse().join(""),
      BOOTSTRAP_SCHEMA.toUpperCase(),
      ` ${BOOTSTRAP_SCHEMA}`,
      `${BOOTSTRAP_SCHEMA}\n`,
    ];
    const versionNegatives: unknown[] = [
      0,
      1,
      3,
      -2,
      "2",
      2.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      null,
      true,
      3n,
    ];
    const generationNegatives: string[] = [
      "",
      "task551-freeze-candidate-generation-v1",
      "task551-freeze-candidate-generation-v3",
      "task551-freeze-candidate-generation",
      "task551-freeze-candidate-generations-v2",
      "task551-freeze-candidate-generation-v2 ",
      ` ${GENERATION_ID}`,
      GENERATION_ID.toUpperCase(),
      "coderso.task551.freeze-candidate-generation-v2",
    ];
    const archivePathNegatives: string[] = [
      "",
      `${ARCHIVE_PATH}.bak`,
      `${ARCHIVE_PATH}.orig`,
      `./${ARCHIVE_PATH}`,
      `/${ARCHIVE_PATH}`,
      `${ARCHIVE_PATH} `,
      ARCHIVE_PATH.split("freezeReceipts").join("FreezeReceipts"),
      ARCHIVE_PATH.split("/").join("\\"),
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.ts",
      "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts",
      "tests/unit/task551DatabaseBaseline/freezeReceipts.ts",
    ];
    const archiveHashNegatives: string[] = [
      "",
      "0".repeat(63),
      "0".repeat(65),
      "0".repeat(64),
      "f".repeat(64),
      "1234567890abcdef".repeat(4),
      ARCHIVE_SHA256.split("a").join("A"),
      `sha256:${ARCHIVE_SHA256}`,
      `0x${ARCHIVE_SHA256}`,
      `${ARCHIVE_SHA256.slice(0, 32)}-${ARCHIVE_SHA256.slice(32)}`,
      `${ARCHIVE_SHA256.slice(0, 63)}g`,
      `${ARCHIVE_SHA256.slice(0, 31)} ${ARCHIVE_SHA256.slice(32)}`,
      `${ARCHIVE_SHA256} `,
      "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4e",
    ];
    const stateNegatives: string[] = [
      "",
      "awaiting-large",
      "ready-for-review",
      "reviewed",
      "candidate",
      "awaiting-mixed",
      "awaiting_small",
      "awaitingSmall",
      "AWAITING-SMALL",
      "awaiting-small-and-large",
      ` ${INITIAL_STATE}`,
      `${INITIAL_STATE}\n`,
    ];
    for (const schema of schemaNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), schema }));
    }
    for (const version of versionNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), version }));
    }
    for (const generationId of generationNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), generationId }));
    }
    for (const path of archivePathNegatives) {
      invalid(() =>
        parseCandidate({ ...buildValidBootstrap(), archive: { path, sha256: ARCHIVE_SHA256 } })
      );
    }
    for (const sha256 of archiveHashNegatives) {
      invalid(() =>
        parseCandidate({ ...buildValidBootstrap(), archive: { path: ARCHIVE_PATH, sha256 } })
      );
    }
    for (const state of stateNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), state }));
    }
    invalid(() => parseCandidate({ ...buildValidBootstrap(), legacyPair: "never-a-fallback" }));
    invalid(() =>
      parseCandidate({ ...buildValidBootstrap(), archive: { ...buildValidArchive(), extra: true } })
    );
  });

  it("rejects wrong-primitive non-string values for every string field", () => {
    // The contract lists "wrong primitive" as a per-field negative category.
    // versionNegatives above already covers the numeric version field; these
    // sets prove the five string fields reject non-string primitives too, so a
    // regression from strict !== to loose/coercing equality on any single
    // field cannot pass. Each set mirrors the version coercion stress set and
    // carries one field-specific trap.
    const schemaPrimitiveNegatives: unknown[] = [
      2, // the version literal: a loose cross-field check would accept it
      0,
      -2,
      2.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      null, // loose == null would also swallow an undefined field
      true,
      false,
      2n,
    ];
    const generationIdPrimitiveNegatives: unknown[] = [
      2, // the version literal: a loose cross-field check would accept it
      0,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      null,
      true,
      false,
      2n,
    ];
    const archivePathPrimitiveNegatives: unknown[] = [
      0, // falsy: a truthiness or defaulting check would slip through
      1,
      2, // the version literal: a loose cross-field check would accept it
      Number.NaN,
      null,
      true,
      false,
      0n,
    ];
    // The parser guards sha256 with an explicit typeof-string check before the
    // regex and strict comparison; these digit-shaped numbers pin that guard
    // because a Number()-coercing comparison could otherwise confuse decimal
    // readings of the hex string with the hash itself.
    const archiveSha256PrimitiveNegatives: unknown[] = [
      17, // decimal reading of the hash's leading digits "17"
      1,
      0,
      Number.NaN,
      null,
      true,
      false,
      1n,
    ];
    const statePrimitiveNegatives: unknown[] = [
      0, // first-index: an enum-index coercion would accept it
      1,
      2, // the version literal: a loose cross-field check would accept it
      Number.NaN,
      null,
      true,
      false,
      0n,
    ];
    for (const schema of schemaPrimitiveNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), schema }));
    }
    for (const generationId of generationIdPrimitiveNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), generationId }));
    }
    for (const path of archivePathPrimitiveNegatives) {
      invalid(() =>
        parseCandidate({ ...buildValidBootstrap(), archive: { path, sha256: ARCHIVE_SHA256 } })
      );
    }
    for (const sha256 of archiveSha256PrimitiveNegatives) {
      invalid(() =>
        parseCandidate({ ...buildValidBootstrap(), archive: { path: ARCHIVE_PATH, sha256 } })
      );
    }
    for (const state of statePrimitiveNegatives) {
      invalid(() => parseCandidate({ ...buildValidBootstrap(), state }));
    }
  });

  it("keeps the production module import-free and dependency-free through a static source guard", () => {
    const source = readFileSync(new URL(PRODUCTION_SOURCE_URL, import.meta.url), "utf8");
    const forbiddenPatterns: RegExp[] = [
      /^\s*import\b/mu,
      /\bexport\s+[^;\n]*?\bfrom\b/u,
      /\brequire\s*\(/u,
      /\bnode:(?:fs|crypto|os|child_process|path|url|util|worker_threads|net|http|https|stream|buffer|timers|dns|tls|zlib|v8)\b/u,
      /\bprocess\b/u,
      /\bBun\b/u,
      /\bglobalThis\b/u,
      /\bwindow\b|\bdocument\b|\blocalStorage\b/u,
      /\bdotenv\b|\bgetenv\b/u,
      /\bpostgres\b|\bmysql\b|\bsqlite\b|\bdb\/client\b/u,
      /\bconnect\s*\(/u,
      /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/u,
      /\breadFileSync\b|\bwriteFileSync\b|\bstatSync\b|\blstatSync\b|\bexistsSync\b|\bopenSync\b|\breaddirSync\b|\brealpathSync\b/u,
      /\bcreateHash\b|\bcreateHmac\b|\brandomBytes\b/u,
      /\bchild_process\b|\bexecFileSync\b|\bspawnSync\b|\bspawn\b|\bexec\b/u,
      /\bnew Date\b|\bDate\.now\b|\bDate\.parse\b|\bperformance\.now\b|\bsetTimeout\b|\bsetInterval\b|\bsetImmediate\b|\bqueueMicrotask\b/u,
      /\basync\b|\bawait\b/u,
      /\bJSON\./u,
      /\beval\s*\(|\bnew Function\b/u,
      /\bdescribe\b|\bexpect\s*\(|\bbun:test\b|^\s*(?:test|it)\s*\(/mu,
      /_docs\/_workflows|task-551-implement|task-551-contract|task-551-worktree-compatibility|task-551-l02-subgate-executor/u,
      /task551DatabaseScale|fixtureTarget|contractTestHelpers|task551DatabaseBudgets|fixtures\//u,
      /advanceActiveGeneration|readLegacyArchive|readActiveState|atomicWriteActiveState|freezeCandidateGenerationStore|freezeCandidateGenerationState|freezeCandidateGenerationFixture|freezeCandidateGenerationTestHelpers|reviewedPair/u,
      /database_baseline_invalid|task551_l04_bootstrap_provenance_invalid|fixture_bootstrap_invalid/u,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
    expect(source.match(/^export (?:type|const|function) [A-Za-z0-9_]+/gmu)).toEqual([
      "export type Task551FreezeCandidateGenerationBootstrapV2",
      "export const TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2",
      "export function parseTask551FreezeCandidateGenerationBootstrapV2",
      "export function getTask551FreezeCandidateGenerationBootstrapV2",
    ]);
    expect(source.match(/Object\.freeze/gu)?.length).toBe(4);
    expect(source).toContain("Reflect.ownKeys");
    expect(source).toContain("getOwnPropertyDescriptor");
    expect(source).toContain("version: 2");
    expect(source).toContain(`"${ARCHIVE_PATH}"`);
    expect(source).toContain(`"${ARCHIVE_SHA256}"`);
    expect(source).toContain(`"${BOOTSTRAP_SCHEMA}"`);
    expect(source).toContain(`"${GENERATION_ID}"`);
    expect(source).toContain(`"${INITIAL_STATE}"`);
    expect(source.match(/task551_freeze_candidate_generation_bootstrap_invalid/gu)).toEqual([
      INVALID_ERROR_MESSAGE,
    ]);
  });
});
