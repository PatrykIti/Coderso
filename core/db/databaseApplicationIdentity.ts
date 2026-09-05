/**
 * Bun-free pure owner of per-process PostgreSQL application identity
 * (TASK-551-02-L02).
 *
 * Accepts the already-parsed L01 `DatabaseFleetConfig`; it never parses or
 * defaults either fleet count. Values reveal only the process class plus an
 * opaque replica/operation identifier: no URL, host, tenant, credential, user
 * ID, or request value may enter a name.
 */

export const DATABASE_APPLICATION_IDENTITY_ERROR_CODES = {
  processKindInvalid: "database_process_kind_invalid",
  replicaIdInvalid: "database_replica_id_invalid",
  replicaIdRequired: "database_replica_id_required",
} as const;

export class DatabaseApplicationIdentityError extends Error {
  readonly code: string;
  readonly key: string | null;

  constructor(code: string, key: string | null = null) {
    super(key === null ? code : `${code}: ${key}`);
    this.name = "DatabaseApplicationIdentityError";
    this.code = code;
    this.key = key;
  }
}

export type DatabaseProcessKind = "runtime" | "worker";
/** Closed kinds accepted by `buildDatabaseApplicationName`. */
export type DatabaseApplicationKind = "runtime" | "worker" | "maintenance" | "migration";

export type DatabaseApplicationIdentity = Readonly<{
  processKind: DatabaseProcessKind;
  replicaId: string;
}>;

type Environment = Readonly<Record<string, string | undefined>>;

const PROCESS_KIND_VALUES: readonly DatabaseProcessKind[] = ["runtime", "worker"];
const REPLICA_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
/** PostgreSQL truncates application_name at 63 bytes. */
const APPLICATION_NAME_MAX_BYTES = 63;
const MIGRATION_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function rejectUnknownIdentityKeys(env: Environment): void {
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("CODERSO_DB_") &&
      key !== "CODERSO_DB_PROCESS_KIND" &&
      key !== "CODERSO_DB_REPLICA_ID"
    ) {
      throw new DatabaseApplicationIdentityError(
        DATABASE_APPLICATION_IDENTITY_ERROR_CODES.processKindInvalid,
        key
      );
    }
  }
}

function parseReplicaId(env: Environment, fleet: DatabaseFleetConfigRef): string {
  const raw = env.CODERSO_DB_REPLICA_ID;
  if (raw === undefined) {
    // The default ID is legal only for the default one-runtime/zero-worker
    // local profile; any non-default fleet requires an explicit replica ID.
    if (fleet.runtimeProcessCount !== 1 || fleet.workerProcessCount !== 0) {
      throw new DatabaseApplicationIdentityError(
        DATABASE_APPLICATION_IDENTITY_ERROR_CODES.replicaIdRequired,
        "CODERSO_DB_REPLICA_ID"
      );
    }
    return "replica-1";
  }
  if (!REPLICA_ID_PATTERN.test(raw)) {
    // Unknown/coerced/whitespace/case-variant values all fail closed here.
    throw new DatabaseApplicationIdentityError(
      DATABASE_APPLICATION_IDENTITY_ERROR_CODES.replicaIdInvalid,
      "CODERSO_DB_REPLICA_ID"
    );
  }
  return raw;
}

type DatabaseFleetConfigRef = Readonly<{
  runtimeProcessCount: number;
  workerProcessCount: number;
}>;

/**
 * Parses the strict identity environment against the already-parsed L01 fleet.
 * Fails closed on unknown `CODERSO_DB_*` keys, invalid process kind/replica
 * ID grammar, an illegal default replica ID, and worker-kind fleets without
 * workers.
 */
export function parseDatabaseApplicationIdentity(
  env: Environment,
  fleet: DatabaseFleetConfigRef
): DatabaseApplicationIdentity {
  rejectUnknownIdentityKeys(env);

  const rawKind = env.CODERSO_DB_PROCESS_KIND ?? "runtime";
  if (!(PROCESS_KIND_VALUES as readonly string[]).includes(rawKind)) {
    throw new DatabaseApplicationIdentityError(
      DATABASE_APPLICATION_IDENTITY_ERROR_CODES.processKindInvalid,
      "CODERSO_DB_PROCESS_KIND"
    );
  }
  const processKind = rawKind as DatabaseProcessKind;

  // A worker process requires a non-empty declared worker array in the fleet.
  if (processKind === "worker" && fleet.workerProcessCount < 1) {
    throw new DatabaseApplicationIdentityError(
      DATABASE_APPLICATION_IDENTITY_ERROR_CODES.processKindInvalid,
      "CODERSO_DB_PROCESS_KIND"
    );
  }

  return Object.freeze({
    processKind,
    replicaId: parseReplicaId(env, fleet),
  });
}

/**
 * Builds the sanitized `application_name` for one physical session class.
 * Runtime, worker, and maintenance names are `coderso:<kind>:<replicaId>`;
 * migration renders `coderso:migration:<operationId>` with a canonical
 * lowercase UUID operation id. Every result is ASCII and at most 63 bytes.
 */
export function buildDatabaseApplicationName(
  kind: DatabaseApplicationKind,
  identity: string
): string {
  if (kind === "migration") {
    if (!MIGRATION_UUID_PATTERN.test(identity)) {
      throw new DatabaseApplicationIdentityError(
        DATABASE_APPLICATION_IDENTITY_ERROR_CODES.replicaIdInvalid,
        "operationId"
      );
    }
    const name = `coderso:migration:${identity}`;
    assertBoundedAscii(name);
    return name;
  }
  if (!REPLICA_ID_PATTERN.test(identity)) {
    throw new DatabaseApplicationIdentityError(
      DATABASE_APPLICATION_IDENTITY_ERROR_CODES.replicaIdInvalid,
      "replicaId"
    );
  }
  const name = `coderso:${kind}:${identity}`;
  assertBoundedAscii(name);
  return name;
}

function assertBoundedAscii(name: string): void {
  if (!/^[\x20-\x7e]+$/.test(name) || Buffer.byteLength(name) > APPLICATION_NAME_MAX_BYTES) {
    throw new DatabaseApplicationIdentityError(
      DATABASE_APPLICATION_IDENTITY_ERROR_CODES.replicaIdInvalid,
      "application_name"
    );
  }
}
