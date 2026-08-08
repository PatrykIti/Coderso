import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";

export const NATIVE_CMS_WRITER_FENCE_NAMESPACE = 548 as const;
export const NATIVE_CMS_WRITER_FENCE_KEY = 0 as const;
export const NATIVE_CMS_WRITER_FENCE_OPTION_KEY = "nativeCmsWriterFenceV1" as const;

declare const ownerLeaseBrand: unique symbol;
export type NativeCmsWriterOwnerLease = Readonly<{ [ownerLeaseBrand]: true }>;

type PrivateOwnerState = {
  state: "active" | "closing" | "revoked" | "lost";
  ownerRunId: string;
  generation: string;
};

export type NativeCmsWriterFenceExecutor = Readonly<{
  execute(query: unknown): Promise<unknown>;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const leaseStates = new WeakMap<NativeCmsWriterOwnerLease, PrivateOwnerState>();
const ownerContext = new AsyncLocalStorage<NativeCmsWriterOwnerLease>();

const freshError = (code: string): Error => new Error(code);

const asRows = (value: unknown): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value)) throw freshError("native_cms_writer_fence_failed");
  const rows: Record<string, unknown>[] = [];
  for (const row of value) {
    if (!row || Array.isArray(row) || typeof row !== "object") {
      throw freshError("native_cms_writer_fence_failed");
    }
    rows.push(row as Record<string, unknown>);
  }
  return rows;
};

const requirePrivateLeaseState = (lease: NativeCmsWriterOwnerLease): PrivateOwnerState => {
  const state = leaseStates.get(lease);
  if (!state) throw freshError("native_cms_writer_fence_lost");
  return state;
};

const isStrictMarker = (value: unknown, generation: string): boolean => {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  try {
    const record = value as Record<string, unknown>;
    const keys = Reflect.ownKeys(record);
    return (
      keys.length === 2 &&
      keys.includes("schemaVersion") &&
      keys.includes("generation") &&
      Reflect.get(record, "schemaVersion") === 1 &&
      Reflect.get(record, "generation") === generation
    );
  } catch {
    return false;
  }
};

const executeRows = async (
  tx: NativeCmsWriterFenceExecutor,
  query: unknown
): Promise<readonly Record<string, unknown>[]> => {
  try {
    return asRows(await tx.execute(query));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("native_cms_writer_")) throw error;
    throw freshError("native_cms_writer_fence_failed");
  }
};

const acquireOrdinaryFence = async (tx: NativeCmsWriterFenceExecutor): Promise<void> => {
  const lockRows = await executeRows(
    tx,
    sql`select pg_try_advisory_xact_lock_shared(${NATIVE_CMS_WRITER_FENCE_NAMESPACE}, ${NATIVE_CMS_WRITER_FENCE_KEY}) as acquired`
  );
  if (lockRows.length !== 1 || typeof lockRows[0].acquired !== "boolean") {
    throw freshError("native_cms_writer_fence_failed");
  }
  if (lockRows[0].acquired === false) throw freshError("native_cms_writer_fence_busy");
  const markerRows = await executeRows(
    tx,
    sql`select id, status, options->${NATIVE_CMS_WRITER_FENCE_OPTION_KEY} as marker
        from solution_kit_install_runs
        where options ? ${NATIVE_CMS_WRITER_FENCE_OPTION_KEY}
        order by created_at asc, id asc
        limit 2`
  );
  if (markerRows.length > 0) throw freshError("native_cms_writer_recovery_required");
};

const lockAndValidateOwnerForShare = async (
  tx: NativeCmsWriterFenceExecutor,
  lease: NativeCmsWriterOwnerLease,
  owner: PrivateOwnerState
): Promise<void> => {
  const rows = await executeRows(
    tx,
    sql`select id, status, options->${NATIVE_CMS_WRITER_FENCE_OPTION_KEY} as marker
        from solution_kit_install_runs
        where id = ${owner.ownerRunId}
        for share`
  );
  if (
    rows.length !== 1 ||
    rows[0].id !== owner.ownerRunId ||
    rows[0].status !== "running" ||
    !isStrictMarker(rows[0].marker, owner.generation)
  ) {
    markNativeCmsWriterOwnerLost(lease);
    throw freshError("native_cms_writer_fence_lost");
  }
};

export const assertNativeCmsWriterOwnerContextAbsent = (): void => {
  if (ownerContext.getStore()) throw freshError("site_package_lock_reentrant");
};

/** @internal Only the rich package-lock holder may create a lease. */
export const createNativeCmsWriterOwnerLease = (
  ownerRunId: string,
  generation: string
): NativeCmsWriterOwnerLease => {
  if (!UUID_PATTERN.test(ownerRunId) || !UUID_PATTERN.test(generation)) {
    throw freshError("native_cms_writer_fence_failed");
  }
  const lease = Object.freeze({}) as NativeCmsWriterOwnerLease;
  leaseStates.set(lease, { state: "active", ownerRunId, generation });
  return lease;
};

export const runWithNativeCmsWriterOwnerContext = <T>(
  lease: NativeCmsWriterOwnerLease,
  execute: () => Promise<T>
): Promise<T> => {
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "active") throw freshError("native_cms_writer_fence_lost");
  return ownerContext.run(lease, execute);
};

export const beginNativeCmsWriterOwnerClosing = (): NativeCmsWriterOwnerLease => {
  const lease = ownerContext.getStore();
  if (!lease) throw freshError("native_cms_writer_fence_lost");
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "active") throw freshError("native_cms_writer_fence_lost");
  owner.state = "closing";
  return lease;
};

export const markNativeCmsWriterOwnerLost = (lease: NativeCmsWriterOwnerLease): void => {
  const owner = requirePrivateLeaseState(lease);
  if (owner.state === "active" || owner.state === "closing") owner.state = "lost";
};

/** @internal Revoked is terminal and normal client close must not relabel it lost. */
export const revokeNativeCmsWriterOwnerLease = (lease: NativeCmsWriterOwnerLease): void => {
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "lost") owner.state = "revoked";
};

/** @internal Finalization drains all preceding owner transactions as statement one. */
export const lockNativeCmsWriterOwnerForUpdate = async (
  tx: NativeCmsWriterFenceExecutor,
  lease: NativeCmsWriterOwnerLease
): Promise<Readonly<{ ownerRunId: string }>> => {
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "closing") throw freshError("native_cms_writer_fence_lost");
  const rows = await executeRows(
    tx,
    sql`select id, status, options->${NATIVE_CMS_WRITER_FENCE_OPTION_KEY} as marker
        from solution_kit_install_runs
        where id = ${owner.ownerRunId}
        for update`
  );
  if (
    rows.length !== 1 ||
    rows[0].id !== owner.ownerRunId ||
    rows[0].status !== "running" ||
    !isStrictMarker(rows[0].marker, owner.generation)
  ) {
    markNativeCmsWriterOwnerLost(lease);
    throw freshError("native_cms_writer_fence_lost");
  }
  return Object.freeze({ ownerRunId: owner.ownerRunId });
};

/** @internal Ambiguous-finalization recovery locks the captured owner as statement one. */
export const lockNativeCmsWriterOwnerForTerminalRead = async (
  tx: NativeCmsWriterFenceExecutor,
  lease: NativeCmsWriterOwnerLease
): Promise<Readonly<{ ownerRunId: string }>> => {
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "closing") throw freshError("native_cms_writer_fence_lost");
  const rows = await executeRows(
    tx,
    sql`select id from solution_kit_install_runs where id = ${owner.ownerRunId} for update`
  );
  if (rows.length !== 1 || rows[0].id !== owner.ownerRunId) {
    throw freshError("native_cms_writer_fence_failed");
  }
  return Object.freeze({ ownerRunId: owner.ownerRunId });
};

export const acquireNativeCmsWriterFence = async (
  tx: NativeCmsWriterFenceExecutor
): Promise<void> => {
  const lease = ownerContext.getStore();
  if (!lease) return acquireOrdinaryFence(tx);
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "active") throw freshError("native_cms_writer_fence_lost");
  return lockAndValidateOwnerForShare(tx, lease, owner);
};
