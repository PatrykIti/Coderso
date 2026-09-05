const INVALID_ERROR_MESSAGE = "task551_freeze_candidate_generation_bootstrap_invalid";
const BOOTSTRAP_KEYS = ["schema", "version", "generationId", "archive", "state"] as const;
const ARCHIVE_KEYS = ["path", "sha256"] as const;
const LOWERCASE_SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export type Task551FreezeCandidateGenerationBootstrapV2 = Readonly<{
  schema: "coderso.task551.freeze-candidate-generation-bootstrap@v2";
  version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  archive: Readonly<{
    path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
    sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
  }>;
  state: "awaiting-small";
}>;

const EXPECTED: Task551FreezeCandidateGenerationBootstrapV2 = Object.freeze({
  schema: "coderso.task551.freeze-candidate-generation-bootstrap@v2",
  version: 2,
  generationId: "task551-freeze-candidate-generation-v2",
  archive: Object.freeze({
    path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
    sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f",
  }),
  state: "awaiting-small",
});

function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function requireExactOwnRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainRecord(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  const expectedKeys = new Set<string>(keys);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  return value;
}

function requireExactLiteral(value: unknown, expected: string | number): void {
  if (value !== expected) invalid();
}

function requireExactLowercaseSha256(value: unknown, expected: string): void {
  if (typeof value !== "string" || !LOWERCASE_SHA256_PATTERN.test(value) || value !== expected)
    invalid();
}

function cloneAndDeepFreeze(
  source: Task551FreezeCandidateGenerationBootstrapV2
): Task551FreezeCandidateGenerationBootstrapV2 {
  return Object.freeze({
    schema: source.schema,
    version: source.version,
    generationId: source.generationId,
    archive: Object.freeze({ path: source.archive.path, sha256: source.archive.sha256 }),
    state: source.state,
  });
}

export const TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2: Task551FreezeCandidateGenerationBootstrapV2 =
  EXPECTED;

export function parseTask551FreezeCandidateGenerationBootstrapV2(
  value: unknown
): Task551FreezeCandidateGenerationBootstrapV2 {
  const record = requireExactOwnRecord(value, BOOTSTRAP_KEYS);
  const archive = requireExactOwnRecord(record.archive, ARCHIVE_KEYS);
  requireExactLiteral(record.schema, EXPECTED.schema);
  requireExactLiteral(record.version, EXPECTED.version);
  requireExactLiteral(record.generationId, EXPECTED.generationId);
  requireExactLiteral(archive.path, EXPECTED.archive.path);
  requireExactLowercaseSha256(archive.sha256, EXPECTED.archive.sha256);
  requireExactLiteral(record.state, EXPECTED.state);
  return cloneAndDeepFreeze(EXPECTED);
}

export function getTask551FreezeCandidateGenerationBootstrapV2(): Task551FreezeCandidateGenerationBootstrapV2 {
  return TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2;
}
