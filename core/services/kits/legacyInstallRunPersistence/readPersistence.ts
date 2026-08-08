import { aliasedTable, and, asc, desc, eq, exists, inArray, notExists, or, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { db } from "../../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../db/schema";
import { asRecord, isRecord } from "../legacyInstallPlanning";
import type {
  SolutionKitInstallItemOperation,
  SolutionKitInstallItemRecord,
  SolutionKitInstallItemRow,
  SolutionKitInstallItemStatus,
  SolutionKitInstallResourceType,
  SolutionKitInstallRunRecord,
  SolutionKitInstallRunRow,
  SolutionKitInstallStatus,
  SolutionKitInstallSummary,
} from "../legacyInstallPlanning";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteResourceIdentity,
  ManagedResourceEvidence,
  RawFullSiteInstallLedgerItem,
} from "../fullSiteInstallTypes";
import { PACKAGE_LIMITS, type JsonObject } from "../fullSitePackage/types";

type QueryExecutor = Readonly<{ execute(query: unknown): Promise<unknown> }>;
type PersistedResourceType = typeof solutionKitInstallItems.$inferSelect.resourceType;

export const MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT = 1 as const;

export const normalizeRunRow = (row: SolutionKitInstallRunRow): SolutionKitInstallRunRecord => ({
  id: row.id,
  kitId: row.kitId,
  mode: row.mode as SolutionKitInstallRunRecord["mode"],
  status: row.status as SolutionKitInstallStatus,
  actorId: row.actorId,
  rollbackOfRunId: row.rollbackOfRunId,
  options: asRecord(row.options),
  summary: asRecord(row.summary),
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  finishedAt: row.finishedAt,
});

export const normalizeItemRow = (row: SolutionKitInstallItemRow): SolutionKitInstallItemRecord => ({
  id: row.id,
  runId: row.runId,
  position: row.position,
  resourceType: row.resourceType as SolutionKitInstallResourceType,
  resourceKey: row.resourceKey,
  operation: row.operation as SolutionKitInstallItemOperation,
  status: row.status as SolutionKitInstallItemStatus,
  beforeSnapshot: isRecord(row.beforeSnapshot) ? row.beforeSnapshot : null,
  afterSnapshot: isRecord(row.afterSnapshot) ? row.afterSnapshot : null,
  rollbackAction: (row.rollbackAction ?? null) as JsonObject | null,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const buildSummary = (
  items: readonly Pick<SolutionKitInstallItemRecord, "operation" | "status">[]
): SolutionKitInstallSummary => {
  const summary: SolutionKitInstallSummary = {
    total: 0,
    success: 0,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: { create: 0, update: 0, noop: 0, delete: 0, restore: 0 },
  };
  for (const item of items) {
    summary.total += 1;
    summary.operations[item.operation] += 1;
    summary[item.status] += 1;
  }
  return summary;
};

const readOrderedItemRows = async (runId: string, limit: number) =>
  db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id))
    .limit(limit);

export async function listSolutionKitInstallItems(
  runId: string
): Promise<SolutionKitInstallItemRecord[]> {
  const rows = await readOrderedItemRows(runId, PACKAGE_LIMITS.resourcesTotal + 1);
  if (rows.length > PACKAGE_LIMITS.resourcesTotal) throw new Error("site_package_too_large");
  return rows.map(normalizeItemRow);
}

const toRawItem = (
  row: typeof solutionKitInstallItems.$inferSelect
): RawFullSiteInstallLedgerItem =>
  Object.freeze({
    position: row.position,
    kind: row.resourceType,
    key: row.resourceKey,
    operation: row.operation,
    status: row.status,
    beforeSnapshot: row.beforeSnapshot,
    afterSnapshot: row.afterSnapshot,
    rollbackAction: row.rollbackAction,
    error: row.error,
  });

const readSnapshotId = (value: unknown): string | null =>
  isRecord(value) && typeof value.id === "string" ? value.id : null;

const readDesiredSnapshot = (value: unknown): JsonObject =>
  isRecord(value) && isRecord(value.desired)
    ? (value.desired as JsonObject)
    : isRecord(value)
      ? (value as JsonObject)
      : {};

export const buildManagedResourceEvidenceQuery = (
  input: Readonly<{
    packageKey: string;
    kind: FullSiteInstallResourceKind;
    key: string;
  }>
) => {
  const candidateItem = aliasedTable(solutionKitInstallItems, "managed_candidate_item");
  const candidateRun = aliasedTable(solutionKitInstallRuns, "managed_candidate_run");
  const rollbackRun = aliasedTable(solutionKitInstallRuns, "managed_rollback_run");
  const rollbackItem = aliasedTable(solutionKitInstallItems, "managed_rollback_item");
  const candidateItemId = sql<string>`${candidateItem.id}`.as("candidate_item_id");
  const candidateItemCreatedAt = sql<Date>`${candidateItem.createdAt}`.as(
    "candidate_item_created_at"
  );
  const candidateItemForRun = db
    .select({ candidateItemId, candidateItemCreatedAt })
    .from(candidateItem)
    .where(
      and(
        eq(candidateItem.runId, candidateRun.id),
        eq(candidateItem.resourceType, input.kind as PersistedResourceType),
        eq(candidateItem.resourceKey, input.key),
        eq(candidateItem.status, "success"),
        inArray(candidateItem.operation, ["create", "update"])
      )
    )
    .orderBy(desc(candidateItemCreatedAt), desc(candidateItemId))
    .limit(1)
    .as("managed_candidate_item_for_run");
  const invalidatingRollbackRun = db
    .select({ one: sql<number>`1` })
    .from(rollbackRun)
    .where(
      and(
        eq(rollbackRun.rollbackOfRunId, candidateRun.id),
        eq(rollbackRun.mode, "rollback"),
        or(
          eq(rollbackRun.status, "success"),
          exists(
            db
              .select({ one: sql<number>`1` })
              .from(rollbackItem)
              .where(
                and(
                  eq(rollbackItem.runId, rollbackRun.id),
                  eq(rollbackItem.resourceType, input.kind as PersistedResourceType),
                  eq(rollbackItem.resourceKey, input.key),
                  eq(rollbackItem.status, "success")
                )
              )
          )
        )
      )
    );
  const candidateRunId = sql<string>`${candidateRun.id}`.as("candidate_run_id");
  const winner = db
    .select({
      candidateRunId,
      candidateItemId: candidateItemForRun.candidateItemId,
      candidateItemCreatedAt: candidateItemForRun.candidateItemCreatedAt,
    })
    .from(candidateRun)
    .innerJoinLateral(candidateItemForRun, sql`true`)
    .where(
      and(
        eq(candidateRun.kitId, input.packageKey),
        eq(candidateRun.mode, "apply"),
        eq(candidateRun.status, "success"),
        notExists(invalidatingRollbackRun)
      )
    )
    .orderBy(
      desc(candidateRun.createdAt),
      desc(candidateRun.updatedAt),
      desc(candidateRunId),
      desc(candidateItemForRun.candidateItemCreatedAt),
      desc(candidateItemForRun.candidateItemId)
    )
    .limit(1)
    .as("managed_resource_winner");
  return db
    .select({ runId: winner.candidateRunId, afterSnapshot: solutionKitInstallItems.afterSnapshot })
    .from(winner)
    .innerJoin(solutionKitInstallItems, eq(solutionKitInstallItems.id, winner.candidateItemId));
};

export const findManagedResourceEvidence = async (
  input: Readonly<{
    packageKey: string;
    kind: FullSiteInstallResourceKind;
    key: string;
  }>
): Promise<ManagedResourceEvidence | null> => {
  const [row] = await buildManagedResourceEvidenceQuery(input);
  if (!row) return null;
  const resourceId = readSnapshotId(row.afterSnapshot);
  if (!resourceId) return null;
  return {
    runId: row.runId,
    resourceId,
    desired: readDesiredSnapshot(row.afterSnapshot),
    successful: true,
    rolledBack: false,
  };
};

type ManagedEvidenceBatchInput = Readonly<{
  packageKey: string;
  resources: readonly Readonly<{
    identity: FullSiteResourceIdentity;
    kind: FullSiteInstallResourceKind;
    key: string;
  }>[];
}>;

const validateBatchInput = (input: ManagedEvidenceBatchInput): ManagedEvidenceBatchInput => {
  if (!Array.isArray(input.resources)) throw new Error("site_package_invalid");
  if (input.resources.length > PACKAGE_LIMITS.resourcesTotal) {
    throw new Error("site_package_too_large");
  }
  const identities = new Set<FullSiteResourceIdentity>();
  for (const resource of input.resources) {
    if (!resource || identities.has(resource.identity)) throw new Error("site_package_invalid");
    identities.add(resource.identity);
  }
  return input;
};

const buildEvidenceRequestJson = (input: ManagedEvidenceBatchInput): string =>
  JSON.stringify(
    input.resources.map((resource, ordinal) => ({
      ordinal,
      identity: resource.identity,
      kind: resource.kind,
      key: resource.key,
    }))
  );

const buildLateralEvidenceBatchSql = (input: ManagedEvidenceBatchInput) => sql`
    with request as (
      select ordinal, identity, kind, key
      from jsonb_to_recordset(${buildEvidenceRequestJson(input)}::jsonb)
        as request(ordinal integer, identity text, kind text, key text)
    )
    select request.ordinal, request.identity,
      winner.run_id as "runId", winner.resource_id as "resourceId"
    from request
    left join lateral (
      select candidate_run.id as run_id,
        candidate_item.after_snapshot->>'id' as resource_id
      from solution_kit_install_runs candidate_run
      join lateral (
        select candidate_item.id, candidate_item.created_at, candidate_item.after_snapshot
        from solution_kit_install_items candidate_item
        where candidate_item.run_id = candidate_run.id
          and candidate_item.resource_type = request.kind
          and candidate_item.resource_key = request.key
          and candidate_item.status = 'success'
          and candidate_item.operation in ('create', 'update')
        order by candidate_item.created_at desc, candidate_item.id desc
        limit 1
      ) candidate_item on true
      where candidate_run.kit_id = ${input.packageKey}
        and candidate_run.mode = 'apply'
        and candidate_run.status = 'success'
        and not exists (
          select 1 from solution_kit_install_runs rollback_run
          where rollback_run.rollback_of_run_id = candidate_run.id
            and rollback_run.mode = 'rollback'
            and (
              rollback_run.status = 'success'
              or exists (
                select 1 from solution_kit_install_items rollback_item
                where rollback_item.run_id = rollback_run.id
                  and rollback_item.resource_type = request.kind
                  and rollback_item.resource_key = request.key
                  and rollback_item.status = 'success'
              )
            )
        )
      order by candidate_run.created_at desc, candidate_run.updated_at desc,
        candidate_run.id desc, candidate_item.created_at desc, candidate_item.id desc
      limit 1
    ) winner on true
    order by request.ordinal asc`;

const buildSetEvidenceBatchSql = (input: ManagedEvidenceBatchInput) => sql`
    with request as (
      select ordinal, identity, kind, key
      from jsonb_to_recordset(${buildEvidenceRequestJson(input)}::jsonb)
        as request(ordinal integer, identity text, kind text, key text)
    ), batch_ranked as (
      select batch_request.ordinal,
        batch_candidate_run.id as run_id,
        batch_candidate_item.after_snapshot->>'id' as resource_id,
        row_number() over (
          partition by batch_request.ordinal
          order by batch_candidate_run.created_at desc, batch_candidate_run.updated_at desc,
            batch_candidate_run.id desc, batch_candidate_item.created_at desc,
            batch_candidate_item.id desc
        ) as winner_rank
      from request batch_request
      inner join solution_kit_install_items batch_candidate_item
        on batch_candidate_item.resource_type = batch_request.kind
        and batch_candidate_item.resource_key = batch_request.key
      inner join solution_kit_install_runs batch_candidate_run
        on batch_candidate_run.id = batch_candidate_item.run_id
      where batch_candidate_item.status = 'success'
        and batch_candidate_item.operation in ('create', 'update')
        and batch_candidate_run.kit_id = ${input.packageKey}
        and batch_candidate_run.mode = 'apply'
        and batch_candidate_run.status = 'success'
        and not exists (
          select 1 from solution_kit_install_runs batch_rollback_run
          where batch_rollback_run.rollback_of_run_id = batch_candidate_run.id
            and batch_rollback_run.mode = 'rollback'
            and (
              batch_rollback_run.status = 'success'
              or exists (
                select 1 from solution_kit_install_items batch_rollback_item
                where batch_rollback_item.run_id = batch_rollback_run.id
                  and batch_rollback_item.resource_type = batch_request.kind
                  and batch_rollback_item.resource_key = batch_request.key
                  and batch_rollback_item.status = 'success'
              )
            )
        )
    ), batch_winner as (
      select ordinal, run_id, resource_id
      from batch_ranked
      where winner_rank = 1
    )
    select request.ordinal, request.identity,
      batch_winner.run_id as "runId", batch_winner.resource_id as "resourceId"
    from request
    left join batch_winner on batch_winner.ordinal = request.ordinal
    order by request.ordinal asc`;

const buildEvidenceBatchSql = (input: ManagedEvidenceBatchInput) =>
  input.resources.length <= MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT
    ? buildLateralEvidenceBatchSql(input)
    : buildSetEvidenceBatchSql(input);

export const buildManagedResourceEvidenceBatchQuery = (rawInput: ManagedEvidenceBatchInput) => {
  const input = validateBatchInput(rawInput);
  const query = buildEvidenceBatchSql(input);
  return Object.freeze({
    query,
    toSQL: () => new PgDialect().sqlToQuery(query),
  });
};

export const findManagedResourceEvidenceBatch = async (
  tx: QueryExecutor,
  rawInput: ManagedEvidenceBatchInput
) => {
  const input = validateBatchInput(rawInput);
  if (input.resources.length === 0) return Object.freeze([]);
  let rows: unknown;
  try {
    rows = await tx.execute(buildEvidenceBatchSql(input));
  } catch {
    throw new Error("site_package_invalid");
  }
  if (!Array.isArray(rows) || rows.length !== input.resources.length) {
    throw new Error("site_package_invalid");
  }
  return Object.freeze(
    rows.map((raw, index) => {
      if (!raw || Array.isArray(raw) || typeof raw !== "object") {
        throw new Error("site_package_invalid");
      }
      const row = raw as Record<string, unknown>;
      const expected = input.resources[index];
      if (row.ordinal !== index || row.identity !== expected.identity) {
        throw new Error("site_package_invalid");
      }
      const evidence =
        row.runId === null && row.resourceId === null
          ? null
          : typeof row.runId === "string" && typeof row.resourceId === "string"
            ? Object.freeze({ runId: row.runId, resourceId: row.resourceId })
            : (() => {
                throw new Error("site_package_invalid");
              })();
      return Object.freeze({ identity: expected.identity, evidence });
    })
  );
};

export const createLegacyInstallReadPersistence = (): Pick<
  FullSiteInstallLedgerPort,
  "listItems" | "listRawItems" | "findManagedResourceEvidence"
> => ({
  async listItems(runId) {
    return (await listSolutionKitInstallItems(runId))
      .filter((item) => ["create", "update", "noop"].includes(item.operation))
      .map((item) => ({
        position: item.position,
        kind: item.resourceType as FullSiteInstallResourceKind,
        key: item.resourceKey,
        operation: item.operation as "create" | "update" | "noop",
        status: item.status,
        beforeSnapshot: item.beforeSnapshot as JsonObject | null,
        afterSnapshot: item.afterSnapshot as JsonObject | null,
        rollbackAction: item.rollbackAction as JsonObject | null,
        error: item.error,
      }));
  },
  async listRawItems(runId) {
    const rows = await readOrderedItemRows(runId, PACKAGE_LIMITS.resourcesTotal + 1);
    if (rows.length > PACKAGE_LIMITS.resourcesTotal) {
      throw new Error("site_package_rollback_invalid_source");
    }
    return Object.freeze(rows.map(toRawItem));
  },
  findManagedResourceEvidence,
});
