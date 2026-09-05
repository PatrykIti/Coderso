import { createHash } from "node:crypto";
import {
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  type Task551DigestScenario,
  type Task551LowercaseSha256,
  type Task551ReviewableReceiptNumericCeilingV1,
  type Task551SanitizedCatalogProjectionV1,
} from "./digestContract";
import {
  assertTask551FixtureTarget,
  parseTask551FixtureTarget,
  type Task551FixtureTarget,
  type Task551FixtureTargetClient,
} from "./fixtureTarget";
import {
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
} from "../../tests/perf/fixtures/task551AdminReadStatementShapes";
import {
  createRunScope,
  TASK551_FAMILY_BUILDERS,
  MEASUREMENT,
  PROFILE_POOL_CAPACITY,
  TASK551_SCALE_COUNTS,
  task551UuidV5,
  TASK551_SCENARIOS,
  type ScaleProfile,
  type SeedContext,
  type SeedTable,
} from "../../tests/perf/fixtures/task551DatabaseScale";
import { freezeCeiling, medianOfThree, p95SpreadPercent } from "./metrics";
import { readTask551SanitizedCatalogProjection } from "./catalog";
import { readTask551RuntimeProvenance } from "./runtimeProvenance";
import { assertTask551FixtureLedgerCounts, assertTask551FixtureTable } from "./fixtureValidation";
import type {
  Task551DatabaseRuntimeContext,
  Task551DatabaseTargetTransport,
  Task551ScenarioInput,
  Task551ScenarioMeasurement,
} from "./runner";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

type Task551ScaleProfile = ScaleProfile;
type Task551PostgresRows = readonly Record<string, unknown>[];
type Task551PostgresClient = {
  unsafe(query: string, values?: readonly unknown[]): Promise<Task551PostgresRows>;
  end(options?: Readonly<{ timeout?: number }>): Promise<void>;
  reserve(): Promise<Task551PostgresReservedClient>;
};
type Task551PostgresReservedClient = Task551PostgresClient & {
  release(): void;
};
type Task551PostgresTransportDependencies = Readonly<{
  loadPostgresModule?: () => Promise<unknown>;
}>;

const TASK551_TRANSPORT_TARGET_KEYS = ["url", "expectedDatabaseName", "sentinel"] as const;

function isTask551PostgresClient(value: unknown): value is Task551PostgresClient {
  if (value === null || typeof value !== "object") return false;
  try {
    const record = value as Record<string, unknown>;
    return (
      typeof record.unsafe === "function" &&
      typeof record.end === "function" &&
      typeof record.reserve === "function"
    );
  } catch {
    return false;
  }
}

async function closeUnusableTask551PostgresClient(value: unknown): Promise<void> {
  if (value === null || typeof value !== "object") return;
  try {
    const end = (value as Record<string, unknown>).end;
    if (typeof end === "function")
      await (end as (options?: Readonly<{ timeout?: number }>) => Promise<void>).call(value, {
        timeout: 5_000,
      });
  } catch {
    // The original validation error remains the only public failure.
  }
}

function revalidateTask551TransportTarget(value: unknown): Task551FixtureTarget {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) invalid();
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== TASK551_TRANSPORT_TARGET_KEYS.length ||
    ownKeys.some(
      (key) =>
        typeof key !== "string" ||
        !TASK551_TRANSPORT_TARGET_KEYS.includes(
          key as (typeof TASK551_TRANSPORT_TARGET_KEYS)[number]
        )
    ) ||
    TASK551_TRANSPORT_TARGET_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    invalid();
  }
  const readValue = (key: (typeof TASK551_TRANSPORT_TARGET_KEYS)[number]): unknown => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      invalid();
    }
    return descriptor.value;
  };
  return parseTask551FixtureTarget({
    TASK551_FIXTURE_DATABASE_URL: readValue("url"),
    TASK551_FIXTURE_DATABASE_NAME: readValue("expectedDatabaseName"),
    TASK551_FIXTURE_DATABASE_SENTINEL: readValue("sentinel"),
  });
}

type Task551FixtureLedgerTable = Readonly<{
  table: string;
  keyColumns: readonly string[];
  keyRows: (readonly unknown[])[];
}>;

type Task551FixtureLedger = {
  readonly scope: string;
  readonly scenarioId: string;
  readonly tables: Task551FixtureLedgerTable[];
};

const TASK551_IDENTIFIER = /^[a-z_][a-z0-9_]*$/u;
const TASK551_SEED_BATCH_SIZE = 250;

function quoteTask551Identifier(value: string): string {
  if (!TASK551_IDENTIFIER.test(value)) invalid();
  return `"${value}"`;
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/gu, (_match, character: string) => character.toUpperCase());
}

const TASK551_SCENARIO_FAMILY_HINTS: readonly (readonly [string, string])[] = [
  ["booking_reservations", "bookings"],
  ["booking_resources", "bookingResources"],
  ["booking_services", "bookingServices"],
  ["booking_blackouts", "bookingBlackouts"],
  ["booking_service_resources", "bookingServiceResources"],
  ["booking_schedules", "bookingSchedules"],
  ["form_submissions", "formSubmissions"],
  ["pages", "pages"],
  ["entries", "contentEntries"],
  ["posts", "posts"],
  ["users", "users"],
  ["forms", "forms"],
  ["media", "media"],
];

const TASK551_FAMILY_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
  pages: ["users"],
  contentEntries: ["users", "contentTypes"],
  posts: ["users"],
  media: ["users", "mediaFolders"],
  mediaFolders: ["users"],
  forms: [],
  formActions: ["forms"],
  formSubmissions: ["forms"],
  formActionRuns: ["forms", "formActions", "formSubmissions"],
  bookingResources: ["users"],
  bookingServices: [],
  bookingServiceResources: ["bookingServices", "bookingResources"],
  bookingSchedules: ["bookingResources"],
  bookingBlackouts: ["bookingResources"],
  bookings: ["bookingServices", "bookingResources"],
  webhooks: [],
  webhookDeliveries: ["webhooks"],
  sessions: ["users"],
  passwordResets: ["users"],
  previewTokens: ["pages"],
  postPreviewTokens: ["posts"],
  assistantDocs: [],
  assistantDocChunks: ["assistantDocs"],
  assistantActionExecutions: ["users"],
  assistantActionUndoItems: ["assistantActionExecutions"],
  analyticsSessions: [],
  analyticsPageviews: ["analyticsSessions"],
  detailPageDocuments: ["contentTypes"],
  solutionKitInstallItems: ["solutionKitInstallRuns"],
  pageRevisions: ["pages", "users"],
  contentRevisions: ["contentEntries", "users"],
  postRevisions: ["posts", "users"],
  widgetTemplateRevisions: ["widgetTemplates", "users"],
  detailPageRevisions: ["detailPageDocuments", "users"],
};

function scenarioFamilies(scenario: Task551DigestScenario): readonly string[] {
  if (scenario.kind === "task489-predecessor") invalid();
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (family: string): void => {
    if (seen.has(family)) return;
    const dependencies = TASK551_FAMILY_DEPENDENCIES[family];
    if (dependencies === undefined && TASK551_FAMILY_BUILDERS[family] === undefined) invalid();
    for (const dependency of dependencies ?? []) add(dependency);
    seen.add(family);
    ordered.push(family);
  };
  const addToken = (token: string): void => {
    if (token === "public.task551_fixture_sentinel" || token === "task551_fixture_sentinel")
      invalid();
    const direct = TASK551_FAMILY_BUILDERS[token] === undefined ? snakeToCamel(token) : token;
    if (TASK551_FAMILY_BUILDERS[direct] === undefined) invalid();
    add(direct);
  };
  if (
    scenario.minimumClosure.length === 0 ||
    new Set(scenario.minimumClosure).size !== scenario.minimumClosure.length
  )
    invalid();
  if (new Set(scenario.supportTables).size !== scenario.supportTables.length) invalid();
  for (const token of [...scenario.minimumClosure, ...scenario.supportTables]) addToken(token);
  for (const [hint, family] of TASK551_SCENARIO_FAMILY_HINTS) {
    if (scenario.targetStatementOrFamily.includes(hint)) add(family);
  }
  if (ordered.length === 0) invalid();
  return ordered;
}

function buildTask551SeedContext(scope: string, profile: Task551ScaleProfile): SeedContext {
  const ids = (family: keyof typeof TASK551_SCALE_COUNTS): readonly string[] =>
    Array.from({ length: TASK551_SCALE_COUNTS[family][profile] }, (_value, ordinal) =>
      task551UuidV5(scope, profile, family, ordinal)
    );
  return {
    scope,
    profile,
    userIds: ids("users"),
    roleIds: ids("roles"),
    pageIds: ids("pages"),
    typeIds: ids("contentTypes"),
    entryIds: ids("contentEntries"),
    postIds: ids("posts"),
    folderIds: ids("mediaFolders"),
    mediaIds: ids("media"),
    formIds: ids("forms"),
    submissionIds: ids("formSubmissions"),
    actionIds: ids("formActions"),
    resourceIds: ids("bookingResources"),
    serviceIds: ids("bookingServices"),
    integrationIds: ids("integrations"),
    webhookIds: ids("webhooks"),
    sessionIds: ids("sessions"),
    docIds: ids("assistantDocs"),
    executionIds: ids("assistantActionExecutions"),
    analyticsSessionIds: ids("analyticsSessions"),
    kitRunIds: ids("solutionKitInstallRuns"),
    widgetTemplateIds: ids("widgetTemplates"),
    detailPageIds: ids("detailPageDocuments"),
  };
}

function ledgerKeyColumns(table: SeedTable): readonly string[] {
  if (table.columns.length < 1) invalid();
  if (table.table === "user_roles" || table.table === "booking_service_resources") {
    if (table.columns.length < 2) invalid();
    return table.columns.slice(0, 2);
  }
  return [table.columns[0]!];
}

function assertMutableFixtureTable(table: SeedTable): void {
  if (
    table.table === "public.task551_fixture_sentinel" ||
    table.table === "task551_fixture_sentinel" ||
    table.table.includes("task551_fixture_sentinel")
  ) {
    invalid();
  }
  quoteTask551Identifier(table.table);
  for (const column of table.columns) quoteTask551Identifier(column);
}

function keyPredicate(
  keyColumns: readonly string[],
  rows: readonly (readonly unknown[])[]
): Readonly<{ sql: string; values: readonly unknown[] }> {
  if (rows.length === 0 || keyColumns.length === 0) invalid();
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    if (row.length !== keyColumns.length) invalid();
    const placeholders = row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return keyColumns.length === 1 ? placeholders[0]! : `(${placeholders.join(",")})`;
  });
  const columns = keyColumns.map(quoteTask551Identifier).join(",");
  return {
    sql:
      keyColumns.length === 1
        ? `${columns} IN (${tuples.join(",")})`
        : `(${columns}) IN (${tuples.join(",")})`,
    values,
  };
}

async function countOwnedRows(
  sql: Task551PostgresClient,
  entry: Task551FixtureLedgerTable
): Promise<number> {
  let total = 0;
  for (let offset = 0; offset < entry.keyRows.length; offset += TASK551_SEED_BATCH_SIZE) {
    const batch = entry.keyRows.slice(offset, offset + TASK551_SEED_BATCH_SIZE);
    const predicate = keyPredicate(entry.keyColumns, batch);
    const rows = await sql.unsafe(
      `SELECT count(*)::int AS count FROM ${quoteTask551Identifier(entry.table)} WHERE ${predicate.sql}`,
      predicate.values
    );
    const count = Number(rows[0]?.count ?? NaN);
    if (!Number.isSafeInteger(count) || count < 0) invalid();
    total += count;
  }
  return total;
}

async function insertFixtureBatch(
  sql: Task551PostgresClient,
  table: SeedTable,
  batch: readonly (readonly unknown[])[]
): Promise<void> {
  const values: unknown[] = [];
  const rowsSql = batch.map((row) => {
    if (row.length !== table.columns.length) invalid();
    const placeholders = row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return `(${placeholders.join(",")})`;
  });
  await sql.unsafe(
    `INSERT INTO ${quoteTask551Identifier(table.table)} (${table.columns.map(quoteTask551Identifier).join(",")}) VALUES ${rowsSql.join(",")}`,
    values
  );
}

async function deleteFixtureTable(
  sql: Task551PostgresClient,
  entry: Task551FixtureLedgerTable
): Promise<number> {
  let deleted = 0;
  for (let offset = 0; offset < entry.keyRows.length; offset += TASK551_SEED_BATCH_SIZE) {
    const batch = entry.keyRows.slice(offset, offset + TASK551_SEED_BATCH_SIZE);
    const predicate = keyPredicate(entry.keyColumns, batch);
    const rows = await sql.unsafe(
      `DELETE FROM ${quoteTask551Identifier(entry.table)} WHERE ${predicate.sql} RETURNING ${entry.keyColumns.map(quoteTask551Identifier).join(",")}`,
      predicate.values
    );
    if (rows.length !== batch.length) invalid();
    deleted += rows.length;
  }
  return deleted;
}

function median(values: readonly number[]): number {
  if (values.length === 0) invalid();
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0 || fraction <= 0 || fraction > 1) invalid();
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
}

function sharedHitBlocks(value: unknown): number {
  if (Array.isArray(value)) return Math.max(0, ...value.map(sharedHitBlocks));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record["Shared Hit Blocks"];
    const own = typeof direct === "number" && Number.isFinite(direct) ? direct : 0;
    return Math.max(own, ...Object.values(record).map(sharedHitBlocks));
  }
  return 0;
}

function actualRowsRead(value: unknown): number {
  if (Array.isArray(value)) return Math.max(0, ...value.map(actualRowsRead));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record["Actual Rows"];
    const own = typeof direct === "number" && Number.isFinite(direct) ? direct : 0;
    return Math.max(own, ...Object.values(record).map(actualRowsRead));
  }
  return 0;
}

type Task551ReferenceMetricKind = "list" | "aggregate" | "append";
type Task551ReferenceQuery = Readonly<{
  sql: string;
  values: readonly unknown[];
  bound: 1 | 51 | 101 | 102;
  metricKind: Task551ReferenceMetricKind;
}>;
type Task551ReferenceQueryContext = Readonly<{
  ledger: Task551FixtureLedger;
  profile: Task551ScaleProfile;
}>;
type Task551ReferenceRecipe = Readonly<{
  scenarioId: string;
  statementId: string | null;
  table: string;
  fromSql?: string;
  selectSql: string;
  whereSql: string;
  groupBySql: string;
  orderSql: string;
  limit: 1 | 51 | 101 | 102;
  metricKind: Task551ReferenceMetricKind;
  values?: (context: Task551ReferenceQueryContext) => readonly unknown[];
}>;

export type Task551PostgresReferenceExecutor = Readonly<{
  scenarioId: string;
  statementId: string | null;
  buildQuery: (context: Task551ReferenceQueryContext) => Task551ReferenceQuery;
}>;

function firstFixtureId(ledger: Task551FixtureLedger, table: string): string {
  const entry = ledger.tables.find((candidate) => candidate.table === table);
  const value = entry?.keyRows[0]?.[0];
  if (typeof value !== "string") invalid();
  return value;
}

function recipeExecutor(recipe: Task551ReferenceRecipe): Task551PostgresReferenceExecutor {
  return {
    scenarioId: recipe.scenarioId,
    statementId: recipe.statementId,
    buildQuery: (context) => {
      const from =
        recipe.fromSql === undefined ? quoteTask551Identifier(recipe.table) : recipe.fromSql;
      const values = recipe.values?.(context) ?? [];
      const where = recipe.whereSql.length === 0 ? "" : ` WHERE ${recipe.whereSql}`;
      const groupBy = recipe.groupBySql.length === 0 ? "" : ` GROUP BY ${recipe.groupBySql}`;
      const order = recipe.orderSql.length === 0 ? "" : ` ORDER BY ${recipe.orderSql}`;
      return {
        sql: `SELECT ${recipe.selectSql} FROM ${from}${where}${groupBy}${order} LIMIT ${recipe.limit}`,
        values,
        bound: recipe.limit,
        metricKind: recipe.metricKind,
      };
    },
  };
}

const adminReferenceRecipes: Readonly<Record<string, Task551ReferenceRecipe>> = {
  "admin-pages-page": {
    scenarioId: "admin-pages-page",
    statementId: "admin-pages-page",
    table: "pages",
    selectSql: "id, title, slug, status, updated_at",
    whereSql: "status = $1 AND (updated_at, id) < ($2, $3)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "published",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "pages"),
    ],
  },
  "admin-pages-fixed-summary": {
    scenarioId: "admin-pages-fixed-summary",
    statementId: "admin-pages-fixed-summary",
    table: "pages",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'published')::int AS published, count(*) FILTER (WHERE status = 'draft')::int AS draft, count(*) FILTER (WHERE status = 'scheduled')::int AS scheduled, count(*) FILTER (WHERE status = 'archived')::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-pages-authors-facet": {
    scenarioId: "admin-pages-authors-facet",
    statementId: "admin-pages-authors-facet",
    table: "pages",
    fromSql:
      "(SELECT author_id AS group_key, count(*)::int AS count FROM pages WHERE author_id IS NOT NULL GROUP BY author_id) AS page_author_facets",
    selectSql: "page_author_facets.group_key, page_author_facets.count",
    whereSql: "(page_author_facets.count, page_author_facets.group_key) < ($1, $2)",
    groupBySql: "",
    orderSql: "page_author_facets.count DESC, page_author_facets.group_key ASC",
    limit: 51,
    metricKind: "list",
    values: ({ ledger }) => [1_000_000, firstFixtureId(ledger, "users")],
  },
  "admin-entries-global-page": {
    scenarioId: "admin-entries-global-page",
    statementId: "admin-entries-global-page",
    table: "content_entries",
    selectSql: "id, title, slug, status, updated_at",
    whereSql: "status = $1 AND visibility = $2 AND (updated_at, id) < ($3, $4)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "published",
      "public",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "content_entries"),
    ],
  },
  "admin-entries-global-fixed-summary": {
    scenarioId: "admin-entries-global-fixed-summary",
    statementId: "admin-entries-global-fixed-summary",
    table: "content_entries",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'published')::int AS published, count(*) FILTER (WHERE status = 'draft')::int AS draft, count(*) FILTER (WHERE status = 'scheduled')::int AS scheduled, count(*) FILTER (WHERE status = 'archived')::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-entries-global-facets": {
    scenarioId: "admin-entries-global-facets",
    statementId: "admin-entries-global-facets",
    table: "content_entries",
    fromSql:
      "(SELECT author_id::text AS group_key, count(*)::int AS count FROM content_entries GROUP BY author_id UNION ALL SELECT type_id::text AS group_key, count(*)::int AS count FROM content_entries GROUP BY type_id) AS entry_facets",
    selectSql: "entry_facets.group_key, entry_facets.count",
    whereSql: "(entry_facets.count, entry_facets.group_key) < ($1, $2)",
    groupBySql: "",
    orderSql: "entry_facets.count DESC, entry_facets.group_key ASC",
    limit: 102,
    metricKind: "list",
    values: () => [1_000_000, ""],
  },
  "admin-entries-typed-page": {
    scenarioId: "admin-entries-typed-page",
    statementId: "admin-entries-typed-page",
    table: "content_entries",
    selectSql: "id, title, slug, status, updated_at",
    whereSql: "type_id = $1 AND status = $2 AND visibility = $3 AND (updated_at, id) < ($4, $5)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      firstFixtureId(ledger, "content_types"),
      "published",
      "public",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "content_entries"),
    ],
  },
  "admin-entries-typed-fixed-summary": {
    scenarioId: "admin-entries-typed-fixed-summary",
    statementId: "admin-entries-typed-fixed-summary",
    table: "content_entries",
    selectSql:
      "count(type_id)::int AS total, count(type_id) FILTER (WHERE status = 'published')::int AS published, count(type_id) FILTER (WHERE status = 'draft')::int AS draft, count(type_id) FILTER (WHERE status = 'scheduled')::int AS scheduled, count(type_id) FILTER (WHERE status = 'archived')::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-entries-typed-authors-facet": {
    scenarioId: "admin-entries-typed-authors-facet",
    statementId: "admin-entries-typed-authors-facet",
    table: "content_entries",
    fromSql:
      "(SELECT author_id AS group_key, count(*)::int AS count FROM content_entries WHERE type_id = $1 AND author_id IS NOT NULL GROUP BY author_id) AS entry_author_facets",
    selectSql: "entry_author_facets.group_key, entry_author_facets.count",
    whereSql: "(entry_author_facets.count, entry_author_facets.group_key) < ($2, $3)",
    groupBySql: "",
    orderSql: "entry_author_facets.count DESC, entry_author_facets.group_key ASC",
    limit: 51,
    metricKind: "list",
    values: ({ ledger }) => [
      firstFixtureId(ledger, "content_types"),
      1_000_000,
      firstFixtureId(ledger, "users"),
    ],
  },
  "admin-posts-page": {
    scenarioId: "admin-posts-page",
    statementId: "admin-posts-page",
    table: "posts",
    selectSql: "id, title, slug, status, updated_at",
    whereSql: "status = $1 AND tags @> $2::jsonb AND (updated_at, id) < ($3, $4)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "published",
      ["task551-post-extra"],
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "posts"),
    ],
  },
  "admin-posts-fixed-summary": {
    scenarioId: "admin-posts-fixed-summary",
    statementId: "admin-posts-fixed-summary",
    table: "posts",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'published')::int AS published, count(*) FILTER (WHERE status = 'draft')::int AS draft, count(*) FILTER (WHERE status = 'scheduled')::int AS scheduled, count(*) FILTER (WHERE status = 'archived')::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-posts-authors-facet": {
    scenarioId: "admin-posts-authors-facet",
    statementId: "admin-posts-authors-facet",
    table: "posts",
    fromSql:
      "(SELECT author_id AS group_key, count(*)::int AS count FROM posts WHERE author_id IS NOT NULL GROUP BY author_id) AS post_author_facets",
    selectSql: "post_author_facets.group_key, post_author_facets.count",
    whereSql: "(post_author_facets.count, post_author_facets.group_key) < ($1, $2)",
    groupBySql: "",
    orderSql: "post_author_facets.count DESC, post_author_facets.group_key ASC",
    limit: 51,
    metricKind: "list",
    values: ({ ledger }) => [1_000_000, firstFixtureId(ledger, "users")],
  },
  "admin-users-page": {
    scenarioId: "admin-users-page",
    statementId: "admin-users-page",
    table: "users",
    selectSql: "id, name AS title, email AS slug, status, created_at AS updated_at",
    whereSql:
      "status = $1 AND id IN (SELECT user_id FROM user_roles WHERE role_id = $2) AND (created_at, id) < ($3, $4)",
    groupBySql: "",
    orderSql: "created_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "active",
      firstFixtureId(ledger, "roles"),
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "users"),
    ],
  },
  "admin-users-fixed-summary": {
    scenarioId: "admin-users-fixed-summary",
    statementId: "admin-users-fixed-summary",
    table: "users",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS published, count(*) FILTER (WHERE status = 'inactive')::int AS draft, count(*) FILTER (WHERE status = 'pending')::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-users-roles-facet": {
    scenarioId: "admin-users-roles-facet",
    statementId: "admin-users-roles-facet",
    table: "user_roles",
    fromSql:
      "(SELECT role_id AS group_key, count(*)::int AS count FROM user_roles GROUP BY role_id) AS user_role_facets",
    selectSql: "user_role_facets.group_key, user_role_facets.count",
    whereSql: "(user_role_facets.count, user_role_facets.group_key) < ($1, $2)",
    groupBySql: "",
    orderSql: "user_role_facets.count DESC, user_role_facets.group_key ASC",
    limit: 51,
    metricKind: "list",
    values: ({ ledger }) => [1_000_000, firstFixtureId(ledger, "roles")],
  },
  "admin-forms-page": {
    scenarioId: "admin-forms-page",
    statementId: "admin-forms-page",
    table: "forms",
    selectSql: "id, name AS title, slug, status, updated_at",
    whereSql: "status = $1 AND (updated_at, id) < ($2, $3)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "published",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "forms"),
    ],
  },
  "admin-forms-fixed-summary": {
    scenarioId: "admin-forms-fixed-summary",
    statementId: "admin-forms-fixed-summary",
    table: "forms",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'published')::int AS published, count(*) FILTER (WHERE status = 'draft')::int AS draft, 0::int AS scheduled, count(*) FILTER (WHERE status = 'archived')::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-form-submissions-page": {
    scenarioId: "admin-form-submissions-page",
    statementId: "admin-form-submissions-page",
    table: "form_submissions",
    selectSql: "id, form_id::text AS title, status AS slug, status, created_at AS updated_at",
    whereSql: "form_id = $1 AND status = $2 AND (created_at, id) < ($3, $4)",
    groupBySql: "",
    orderSql: "created_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      firstFixtureId(ledger, "forms"),
      "new",
      new Date("2026-01-15T12:00:00.000Z"),
      firstFixtureId(ledger, "form_submissions"),
    ],
  },
  "admin-form-submissions-fixed-summary": {
    scenarioId: "admin-form-submissions-fixed-summary",
    statementId: "admin-form-submissions-fixed-summary",
    table: "form_submissions",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'new')::int AS published, count(*) FILTER (WHERE status = 'processed')::int AS draft, count(*) FILTER (WHERE status = 'spam')::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-media-page": {
    scenarioId: "admin-media-page",
    statementId: "admin-media-page",
    table: "media",
    selectSql: "id, title, key AS slug, type AS status, created_at AS updated_at",
    whereSql: "type = $1 AND mime_type = $2 AND tags @> $3::jsonb AND (created_at, id) < ($4, $5)",
    groupBySql: "",
    orderSql: "created_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "image",
      "task551-mime-0",
      ["task551-media-pair", "task551-media-tag-0"],
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "media"),
    ],
  },
  "admin-media-fixed-summary": {
    scenarioId: "admin-media-fixed-summary",
    statementId: "admin-media-fixed-summary",
    table: "media",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE type = 'image')::int AS published, count(*) FILTER (WHERE type = 'file')::int AS draft, 0::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-media-facets": {
    scenarioId: "admin-media-facets",
    statementId: "admin-media-facets",
    table: "media",
    fromSql:
      "(SELECT type::text AS group_key, count(*)::int AS count FROM media GROUP BY type UNION ALL SELECT mime_type AS group_key, count(*)::int AS count FROM media GROUP BY mime_type) AS media_facets",
    selectSql: "media_facets.group_key, media_facets.count",
    whereSql: "(media_facets.count, media_facets.group_key) < ($1, $2)",
    groupBySql: "",
    orderSql: "media_facets.count DESC, media_facets.group_key ASC",
    limit: 102,
    metricKind: "list",
    values: () => [1_000_000, ""],
  },
  "admin-booking-reservations-page": {
    scenarioId: "admin-booking-reservations-page",
    statementId: "admin-booking-reservations-page",
    table: "bookings",
    selectSql:
      "id, service_id::text AS title, resource_id::text AS slug, status, starts_at AS updated_at",
    whereSql: "resource_id = $1 AND service_id = $2 AND status = $3 AND (starts_at, id) < ($4, $5)",
    groupBySql: "",
    orderSql: "starts_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      firstFixtureId(ledger, "booking_resources"),
      firstFixtureId(ledger, "booking_services"),
      "confirmed",
      new Date("2026-01-15T12:00:00.000Z"),
      firstFixtureId(ledger, "bookings"),
    ],
  },
  "admin-booking-reservations-fixed-summary": {
    scenarioId: "admin-booking-reservations-fixed-summary",
    statementId: "admin-booking-reservations-fixed-summary",
    table: "bookings",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'pending')::int AS published, count(*) FILTER (WHERE status = 'confirmed')::int AS draft, count(*) FILTER (WHERE status = 'cancelled')::int AS scheduled, count(*) FILTER (WHERE status IN ('completed', 'no_show'))::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-booking-resources-page": {
    scenarioId: "admin-booking-resources-page",
    statementId: "admin-booking-resources-page",
    table: "booking_resources",
    selectSql: "id, name AS title, slug, status, updated_at",
    whereSql: "status = $1 AND type = $2 AND (updated_at, id) < ($3, $4)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "active",
      "staff",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "booking_resources"),
    ],
  },
  "admin-booking-resources-fixed-summary": {
    scenarioId: "admin-booking-resources-fixed-summary",
    statementId: "admin-booking-resources-fixed-summary",
    table: "booking_resources",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS published, 0::int AS draft, 0::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-booking-services-page": {
    scenarioId: "admin-booking-services-page",
    statementId: "admin-booking-services-page",
    table: "booking_services",
    selectSql: "id, name AS title, slug, status, updated_at",
    whereSql: "status = $1 AND (updated_at, id) < ($2, $3)",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      "active",
      new Date("2026-01-01T00:00:00.000Z"),
      firstFixtureId(ledger, "booking_services"),
    ],
  },
  "admin-booking-services-fixed-summary": {
    scenarioId: "admin-booking-services-fixed-summary",
    statementId: "admin-booking-services-fixed-summary",
    table: "booking_services",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS published, 0::int AS draft, 0::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-booking-blackouts-page": {
    scenarioId: "admin-booking-blackouts-page",
    statementId: "admin-booking-blackouts-page",
    table: "booking_blackouts",
    selectSql:
      "id, resource_id::text AS title, starts_at::text AS slug, ends_at::text AS status, created_at AS updated_at",
    whereSql: "resource_id = $1 AND (starts_at, id) < ($2, $3)",
    groupBySql: "",
    orderSql: "starts_at DESC, id DESC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [
      firstFixtureId(ledger, "booking_resources"),
      new Date("2026-01-15T12:00:00.000Z"),
      firstFixtureId(ledger, "booking_blackouts"),
    ],
  },
  "admin-booking-blackouts-fixed-summary": {
    scenarioId: "admin-booking-blackouts-fixed-summary",
    statementId: "admin-booking-blackouts-fixed-summary",
    table: "booking_blackouts",
    selectSql:
      "count(*)::int AS total, count(*) FILTER (WHERE resource_id IS NULL)::int AS published, count(*) FILTER (WHERE resource_id IS NOT NULL)::int AS draft, 0::int AS scheduled, 0::int AS archived",
    whereSql: "",
    groupBySql: "",
    orderSql: "",
    limit: 1,
    metricKind: "aggregate",
  },
  "admin-booking-service-resources-fixed-list": {
    scenarioId: "admin-booking-service-resources-fixed-list",
    statementId: "admin-booking-service-resources-fixed-list",
    table: "booking_service_resources",
    fromSql:
      "booking_service_resources INNER JOIN booking_services ON booking_services.id = booking_service_resources.service_id",
    selectSql: "booking_service_resources.resource_id, booking_service_resources.is_required",
    whereSql: "booking_service_resources.service_id = $1",
    groupBySql: "",
    orderSql: "booking_service_resources.resource_id ASC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [firstFixtureId(ledger, "booking_services")],
  },
  "admin-booking-schedules-fixed-list": {
    scenarioId: "admin-booking-schedules-fixed-list",
    statementId: "admin-booking-schedules-fixed-list",
    table: "booking_schedules",
    selectSql: "id, day_of_week, start_minute, end_minute, is_available",
    whereSql: "resource_id = $1",
    groupBySql: "",
    orderSql: "day_of_week ASC, start_minute ASC, id ASC",
    limit: 101,
    metricKind: "list",
    values: ({ ledger }) => [firstFixtureId(ledger, "booking_resources")],
  },
};

const supplementalReferenceRecipes: Readonly<Record<string, Task551ReferenceRecipe>> = {
  "public-html-dependencies-128": {
    scenarioId: "public-html-dependencies-128",
    statementId: null,
    table: "pages",
    selectSql: "id, 'page'::text AS dependency_kind, updated_at",
    whereSql: "status = 'published'",
    groupBySql: "",
    orderSql: "updated_at DESC, id DESC",
    limit: 102,
    metricKind: "list",
  },
  "password-resets-expired": {
    scenarioId: "password-resets-expired",
    statementId: null,
    table: "password_resets",
    selectSql: "id, user_id, expires_at",
    whereSql: "expires_at < $1 AND used_at IS NULL",
    groupBySql: "",
    orderSql: "expires_at ASC, id ASC",
    limit: 101,
    metricKind: "list",
    values: () => [new Date("2026-01-15T12:00:00.000Z")],
  },
  "preview-tokens-expired": {
    scenarioId: "preview-tokens-expired",
    statementId: null,
    table: "preview_tokens",
    fromSql:
      "(SELECT id, target_id, expires_at FROM preview_tokens WHERE expires_at < $1 UNION ALL SELECT id, post_id AS target_id, expires_at FROM post_preview_tokens WHERE expires_at < $1) AS expired_preview_tokens",
    selectSql:
      "expired_preview_tokens.id, expired_preview_tokens.target_id, expired_preview_tokens.expires_at",
    whereSql: "",
    groupBySql: "",
    orderSql: "expired_preview_tokens.expires_at ASC, expired_preview_tokens.id ASC",
    limit: 101,
    metricKind: "list",
    values: () => [new Date("2026-01-15T12:00:00.000Z")],
  },
  "assistant-ingest-old": {
    scenarioId: "assistant-ingest-old",
    statementId: null,
    table: "assistant_doc_ingest_runs",
    selectSql: "id, source_root, status, started_at, finished_at",
    whereSql: "started_at < $1 AND status = $2",
    groupBySql: "",
    orderSql: "started_at ASC, id ASC",
    limit: 101,
    metricKind: "list",
    values: () => [new Date("2026-01-01T00:00:00.000Z"), "success"],
  },
  "form-runs-child-first": {
    scenarioId: "form-runs-child-first",
    statementId: null,
    table: "form_action_runs",
    selectSql: "id, submission_id, action_id, status, created_at",
    whereSql: "created_at < $1",
    groupBySql: "",
    orderSql: "created_at ASC, id ASC",
    limit: 101,
    metricKind: "append",
    values: () => [new Date("2036-01-01T00:00:00.000Z")],
  },
  "solution-kit-child-first": {
    scenarioId: "solution-kit-child-first",
    statementId: null,
    table: "solution_kit_install_items",
    selectSql: "id, run_id, position, operation, status",
    whereSql: "status = $1",
    groupBySql: "",
    orderSql: "run_id ASC, position ASC, id ASC",
    limit: 101,
    metricKind: "append",
    values: () => ["success"],
  },
};

const referenceRecipes: Readonly<Record<string, Task551ReferenceRecipe>> = Object.freeze({
  ...adminReferenceRecipes,
  ...supplementalReferenceRecipes,
});

const REFERENCE_SQL_WORDS = new Set([
  "all",
  "and",
  "as",
  "asc",
  "by",
  "count",
  "desc",
  "distinct",
  "filter",
  "from",
  "group",
  "in",
  "inner",
  "is",
  "join",
  "limit",
  "not",
  "null",
  "on",
  "or",
  "order",
  "select",
  "text",
  "union",
  "where",
  "int",
  "jsonb",
]);

function normalizeReferenceSql(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z_][a-z0-9_]*\./gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeReferenceOrder(value: string): string {
  const normalized = normalizeReferenceSql(value);
  if (normalized.length === 0) return "none";
  return normalized.replace(
    /\b(?:author_id|role_id|type_id|mime_type|resource_id)\b/gu,
    "group_key"
  );
}

function splitReferenceProjection(value: string): readonly string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  if (depth !== 0 || parts.some((part) => part.length === 0)) invalid();
  return parts;
}

function referenceProjectionAliases(value: string): readonly string[] {
  return splitReferenceProjection(value).map((part) => {
    const alias = /\bas\s+([a-z_][a-z0-9_]*)\s*$/iu.exec(part)?.[1];
    if (alias !== undefined) return alias.toLowerCase();
    const simple = part
      .replace(/\s*::\s*[a-z_][a-z0-9_]*/giu, "")
      .match(/([a-z_][a-z0-9_]*)$/iu)?.[1];
    if (simple === undefined) invalid();
    return simple.toLowerCase();
  });
}

function referenceSqlAliases(sql: string): ReadonlySet<string> {
  const aliases = new Set<string>();
  for (const match of sql.matchAll(/\bas\s+([a-z_][a-z0-9_]*)/giu))
    aliases.add(match[1]!.toLowerCase());
  for (const alias of [
    "count",
    "group_key",
    "total",
    "published",
    "draft",
    "scheduled",
    "archived",
  ])
    aliases.add(alias);
  return aliases;
}

function referenceSqlTables(sql: string): readonly string[] {
  return [...sql.matchAll(/\b(?:from|join)\s+"?([a-z_][a-z0-9_]*)"?/giu)].map((match) =>
    match[1]!.toLowerCase()
  );
}

function assertReferenceSqlUsesCatalog(recipe: Task551ReferenceRecipe, sql: string): void {
  const catalog = new Map(
    TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.map((table) => [
      table.name,
      new Set(table.columns.map((column) => column.name)),
    ])
  );
  const tables = new Set([recipe.table, ...referenceSqlTables(sql)]);
  for (const table of tables) if (!catalog.has(table)) invalid();
  const aliases = referenceSqlAliases(sql);
  const known = new Set(REFERENCE_SQL_WORDS);
  for (const table of catalog.keys()) known.add(table);
  for (const columns of catalog.values()) for (const column of columns) known.add(column);
  for (const alias of aliases) known.add(alias);
  const sanitized = sql.replace(/'(?:''|[^'])*'/gu, " ").replace(/\$\d+/gu, " ");
  for (const token of sanitized.match(/[a-z_][a-z0-9_]*/giu) ?? []) {
    if (!known.has(token.toLowerCase())) invalid();
  }
}

function adminReferenceTable(statementId: string): string {
  if (statementId.startsWith("admin-pages-")) return "pages";
  if (statementId.startsWith("admin-entries-")) return "content_entries";
  if (statementId.startsWith("admin-posts-")) return "posts";
  if (statementId.startsWith("admin-users-"))
    return statementId.endsWith("roles-facet") ? "user_roles" : "users";
  if (statementId.startsWith("admin-forms-")) return "forms";
  if (statementId.startsWith("admin-form-submissions-")) return "form_submissions";
  if (statementId.startsWith("admin-media-")) return "media";
  if (statementId.startsWith("admin-booking-reservations-")) return "bookings";
  if (statementId.startsWith("admin-booking-resources-")) return "booking_resources";
  if (statementId.startsWith("admin-booking-services-")) return "booking_services";
  if (statementId.startsWith("admin-booking-blackouts-")) return "booking_blackouts";
  if (statementId === "admin-booking-service-resources-fixed-list")
    return "booking_service_resources";
  if (statementId === "admin-booking-schedules-fixed-list") return "booking_schedules";
  invalid();
}

function assertReferenceQueryBindings(sql: string, values: readonly unknown[]): void {
  if (sql.includes(";")) invalid();
  const placeholders = [...sql.matchAll(/\$(\d+)/gu)].map((match) => Number(match[1]));
  const maximum = placeholders.length === 0 ? 0 : Math.max(...placeholders);
  if (
    maximum !== values.length ||
    new Set(placeholders).size !== maximum ||
    placeholders.some((value) => value < 1 || value > maximum)
  )
    invalid();
  if (values.some((value) => value === undefined)) invalid();
}

function assertReferenceRecipe(
  recipe: Task551ReferenceRecipe,
  context: Task551ReferenceQueryContext
): void {
  if (recipe.scenarioId.length === 0 || recipe.table.length === 0 || recipe.limit < 1) invalid();
  const query = recipeExecutor(recipe).buildQuery(context);
  assertReferenceQueryBindings(query.sql, query.values);
  const limitMatches = [...query.sql.matchAll(/\blimit\s+(\d+)/giu)];
  if (
    limitMatches.length !== 1 ||
    Number(limitMatches[0]![1]) !== recipe.limit ||
    query.bound !== recipe.limit
  )
    invalid();
  assertReferenceSqlUsesCatalog(recipe, query.sql);
  if (recipe.statementId !== null) {
    const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[recipe.statementId];
    if (
      shape === undefined ||
      shape.plannedShapeId !== recipe.statementId ||
      recipe.scenarioId !== recipe.statementId
    )
      invalid();
    if (
      recipe.table !== adminReferenceTable(recipe.statementId) ||
      recipe.metricKind !== (shape.statementRole === "fixed-summary" ? "aggregate" : "list")
    )
      invalid();
    if (
      referenceProjectionAliases(recipe.selectSql).join(",") !== shape.projectedColumns.join(",")
    ) {
      invalid();
    }
    if (recipe.limit !== shape.expectedOutputBound || query.bound !== shape.bound) invalid();
    const normalizedSql = normalizeReferenceSql(query.sql);
    const expectedJoin = shape.joinDirection === "inner";
    if (/\bjoin\b/iu.test(normalizedSql) !== expectedJoin) invalid();
    const expectedOrder = normalizeReferenceOrder(shape.order);
    if (normalizeReferenceOrder(recipe.orderSql) !== expectedOrder) invalid();
    for (const predicate of [
      ...shape.authorizationPredicate,
      ...shape.normalizedFilterPredicateSlots,
    ]) {
      const column = predicate.match(/[a-z_][a-z0-9_]*/iu)?.[0];
      if (column === undefined || !new RegExp(`\\b${column}\\b`, "iu").test(normalizedSql))
        invalid();
    }
    if (shape.statementRole === "fixed-summary" && recipe.whereSql.length > 0) invalid();
    if (shape.statementRole === "page") {
      const sortColumn = shape.order.split(",")[0]!.trim().split(/\s+/u)[0]!;
      if (!new RegExp(`\\(${sortColumn},\\s*id\\)\\s*<`, "iu").test(normalizedSql)) invalid();
    }
    if (shape.statementRole === "facet") {
      if (
        !/\(\s*(?:[a-z_][a-z0-9_]*\.)?count\s*,\s*(?:[a-z_][a-z0-9_]*\.)?group_key\s*\)\s*</iu.test(
          normalizedSql
        )
      )
        invalid();
    }
    if (shape.statementRole === "fixed-list" && recipe.groupBySql.length > 0) invalid();
  }
}

export const TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY: Readonly<
  Record<string, Task551PostgresReferenceExecutor>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(referenceRecipes).map(([scenarioId, recipe]) => [
      scenarioId,
      Object.freeze(recipeExecutor(recipe)),
    ])
  )
);

export function assertTask551PostgresReferenceExecutorRegistry(): void {
  const expected = TASK551_SCENARIOS.filter(
    (scenario) => scenario.equalityParticipation !== "deferred"
  ).map((scenario) => scenario.id);
  const actual = Object.keys(TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY);
  if (actual.length !== 38 || JSON.stringify(actual) !== JSON.stringify(expected)) invalid();
  const context: Task551ReferenceQueryContext = {
    profile: "small",
    ledger: {
      scope: "task551-reference-validation",
      scenarioId: "reference-validation",
      tables: TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.map((table) => ({
        table: table.name,
        keyColumns: ["id"],
        keyRows: [[`${table.name}-id`]],
      })),
    },
  };
  for (const [scenarioId, recipe] of Object.entries(referenceRecipes)) {
    if (scenarioId !== recipe.scenarioId || actual.indexOf(scenarioId) < 0) invalid();
    assertReferenceRecipe(recipe, context);
  }
  for (const statementId of TASK551_ADMIN_READ_PLANNED_IDS) {
    const executor = TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY[statementId];
    if (
      executor?.statementId !== statementId ||
      TASK551_ADMIN_READ_STATEMENT_SHAPES[statementId] === undefined
    )
      invalid();
  }
  for (const scenario of TASK551_SCENARIOS) {
    if (
      scenario.equalityParticipation === "deferred" &&
      TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY[scenario.id] !== undefined
    )
      invalid();
  }
}

assertTask551PostgresReferenceExecutorRegistry();

export async function openTask551PostgresTransport(
  target: Task551FixtureTarget,
  profile: Task551ScaleProfile,
  dependencies: Task551PostgresTransportDependencies = {}
): Promise<Task551DatabaseTargetTransport> {
  const validatedTarget = revalidateTask551TransportTarget(target);
  const poolCapacity =
    profile === "small"
      ? PROFILE_POOL_CAPACITY.small
      : profile === "large"
        ? PROFILE_POOL_CAPACITY.large
        : invalid();
  const loadPostgresModule = dependencies.loadPostgresModule ?? (async () => import("postgres"));
  let postgresModule: unknown;
  try {
    postgresModule = await loadPostgresModule();
  } catch {
    invalid();
  }
  if (postgresModule === null || typeof postgresModule !== "object") invalid();
  const factory = (postgresModule as { default?: unknown }).default;
  if (typeof factory !== "function") invalid();
  let createdClient: unknown;
  try {
    createdClient = (factory as (url: string, options: Readonly<{ max: number }>) => unknown)(
      validatedTarget.url,
      {
        max: poolCapacity,
      }
    );
  } catch {
    invalid();
  }
  if (!isTask551PostgresClient(createdClient)) {
    await closeUnusableTask551PostgresClient(createdClient);
    invalid();
  }
  const sql = createdClient;
  let activeTransaction = false;
  let calibrationMedianMs: number | undefined;
  let poolWaitCeiling: Task551ReviewableReceiptNumericCeilingV1 | undefined;
  let lastScopeDigest: string | undefined;
  let postgresMajor: number | undefined;
  let runtimeContext: Task551DatabaseRuntimeContext | undefined;
  const ledgers = new Map<string, Task551FixtureLedger>();
  const client: Task551FixtureTargetClient = {
    beginReadOnlyTransaction: async () => {
      if (activeTransaction) invalid();
      activeTransaction = true;
      try {
        await sql.unsafe("BEGIN READ ONLY");
      } catch {
        activeTransaction = false;
        invalid();
      }
      return {
        readFixtureTargetProof: async (input) => {
          try {
            const databaseRows = await sql.unsafe(
              "SELECT current_database() = $1::text AS current_database_matched",
              [input.expectedDatabaseName]
            );
            const sentinelRows = await sql.unsafe(
              "SELECT count(*)::int AS marker_count, bool_and(convert_to(sentinel, 'UTF8') = convert_to($1::text, 'UTF8')) AS bound_sentinel_byte_matched FROM public.task551_fixture_sentinel WHERE marker = $2::text",
              [input.expectedSentinel, input.marker]
            );
            return {
              currentDatabaseMatched: databaseRows[0]?.current_database_matched === true,
              markerCount: Number(sentinelRows[0]?.marker_count ?? -1),
              boundSentinelByteMatched: sentinelRows[0]?.bound_sentinel_byte_matched === true,
            };
          } catch {
            invalid();
          }
        },
        rollback: async () => {
          try {
            await sql.unsafe("ROLLBACK");
          } catch {
            invalid();
          } finally {
            activeTransaction = false;
          }
        },
      };
    },
  };
  const ledgerFor = (input: Task551ScenarioInput): Task551FixtureLedger => {
    const key = `${input.profile}:${input.scenario.id}`;
    const ledger = ledgers.get(key);
    if (ledger === undefined) invalid();
    return ledger;
  };
  const executeScenario = async (input: Task551ScenarioInput): Promise<void> => {
    await assertTask551FixtureTarget(validatedTarget, client);
    const key = `${input.profile}:${input.scenario.id}`;
    if (ledgers.has(key)) invalid();
    const scope = createRunScope();
    lastScopeDigest = createHash("sha256").update(scope, "utf8").digest("hex");
    const ledger: Task551FixtureLedger = { scope, scenarioId: input.scenario.id, tables: [] };
    ledgers.set(key, ledger);
    try {
      const context = buildTask551SeedContext(scope, input.profile);
      for (const family of scenarioFamilies(input.scenario)) {
        const builder = TASK551_FAMILY_BUILDERS[family];
        if (builder === undefined) invalid();
        const table = builder(context);
        assertMutableFixtureTable(table);
        assertTask551FixtureTable(table, input.profile);
        const keyColumns = ledgerKeyColumns(table);
        const plannedKeyRows = table.rows.map((row) => keyColumns.map((_, index) => row[index]));
        const entry: Task551FixtureLedgerTable = { table: table.table, keyColumns, keyRows: [] };
        ledger.tables.push(entry);
        if ((await countOwnedRows(sql, { ...entry, keyRows: plannedKeyRows })) !== 0) invalid();
        for (let offset = 0; offset < table.rows.length; offset += TASK551_SEED_BATCH_SIZE) {
          const batch = table.rows.slice(offset, offset + TASK551_SEED_BATCH_SIZE);
          await insertFixtureBatch(sql, table, batch);
          entry.keyRows.push(...batch.map((row) => keyColumns.map((_, index) => row[index])));
          if ((await countOwnedRows(sql, entry)) !== entry.keyRows.length) invalid();
        }
        assertTask551FixtureTable(table, input.profile);
        if ((await countOwnedRows(sql, entry)) !== table.rows.length) invalid();
      }
      assertTask551FixtureLedgerCounts(ledger.tables, input.profile);
    } catch {
      invalid();
    }
  };
  const cleanupScenario = async (input: Task551ScenarioInput): Promise<void> => {
    const ledger = ledgerFor(input);
    let failureCount = 0;
    for (const entry of [...ledger.tables].reverse()) {
      try {
        const retainedBeforeCleanup = await countOwnedRows(sql, entry);
        if (retainedBeforeCleanup !== entry.keyRows.length) failureCount += 1;
      } catch {
        failureCount += 1;
      }
      try {
        const deleted = await deleteFixtureTable(sql, entry);
        if (deleted !== entry.keyRows.length) failureCount += 1;
      } catch {
        failureCount += 1;
      }
    }
    for (const entry of ledger.tables) {
      try {
        if ((await countOwnedRows(sql, entry)) !== 0) failureCount += 1;
      } catch {
        failureCount += 1;
      }
    }
    ledgers.delete(`${input.profile}:${input.scenario.id}`);
    if (failureCount !== 0) invalid();
  };
  const calibrate = async (): Promise<number> => {
    if (calibrationMedianMs !== undefined) return calibrationMedianMs;
    for (let index = 0; index < MEASUREMENT.calibrationWarmups; index += 1) {
      await sql.unsafe("SELECT 1 AS calibration");
    }
    const samples: number[] = [];
    for (let index = 0; index < MEASUREMENT.calibrationSamples; index += 1) {
      const started = performance.now();
      await sql.unsafe("SELECT 1 AS calibration");
      samples.push(Math.max(0.001, performance.now() - started));
    }
    calibrationMedianMs = median(samples);
    return calibrationMedianMs;
  };
  const measurePoolWait = async (): Promise<Task551ReviewableReceiptNumericCeilingV1> => {
    if (poolWaitCeiling !== undefined) return poolWaitCeiling;
    const samples: number[] = [];
    for (let repetition = 0; repetition < MEASUREMENT.repetitions; repetition += 1) {
      const reservations: Task551PostgresReservedClient[] = [];
      let waiter: Task551PostgresReservedClient | undefined;
      try {
        for (let index = 0; index < PROFILE_POOL_CAPACITY[profile]; index += 1)
          reservations.push(await sql.reserve());
        const started = performance.now();
        const waiting = sql.reserve();
        await Promise.resolve();
        reservations[0]?.release();
        reservations.shift();
        waiter = await waiting;
        samples.push(Math.max(0.001, performance.now() - started));
      } catch {
        invalid();
      } finally {
        waiter?.release();
        for (const reservation of reservations) reservation.release();
      }
    }
    poolWaitCeiling = {
      queryCountMax: 1,
      rowsReadMax: 1,
      rowsReturnedMax: 1,
      transferredBytesMax: 64,
      sharedBuffersMax: 1,
      p50MsMax: freezeCeiling("pool", percentile(samples, 0.5)),
      p95MsMax: freezeCeiling("pool", percentile(samples, 0.95)),
      p99MsMax: freezeCeiling("pool", percentile(samples, 0.99)),
    };
    return poolWaitCeiling;
  };
  const measureScenario = async (
    input: Task551ScenarioInput
  ): Promise<Task551ScenarioMeasurement> => {
    const ledger = ledgerFor(input);
    const executor = TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY[input.scenario.id];
    if (executor === undefined || executor.scenarioId !== input.scenario.id) invalid();
    const reference = executor.buildQuery({ ledger, profile });
    const runQuery = async (): Promise<
      Readonly<{ rows: Task551PostgresRows; elapsedMs: number; bytes: number }>
    > => {
      const started = performance.now();
      const rows = await sql.unsafe(reference.sql, reference.values);
      if (rows.length > reference.bound) invalid();
      const elapsedMs = Math.max(0.001, performance.now() - started);
      const bytes = Math.max(1, new TextEncoder().encode(JSON.stringify(rows)).byteLength);
      return { rows, elapsedMs, bytes };
    };
    const repetitionP50: [number, number, number] = [0, 0, 0];
    const repetitionP95: [number, number, number] = [0, 0, 0];
    const repetitionP99: [number, number, number] = [0, 0, 0];
    let maxRows = 1;
    let maxBytes = 1;
    let sharedBuffers = 1;
    for (let repetition = 0; repetition < MEASUREMENT.repetitions; repetition += 1) {
      for (let warmup = 0; warmup < MEASUREMENT.warmups; warmup += 1) await runQuery();
      const repetitionSamples: number[] = [];
      for (let sample = 0; sample < MEASUREMENT.samples; sample += 1) {
        const measured = await runQuery();
        repetitionSamples.push(measured.elapsedMs);
        maxRows = Math.max(maxRows, measured.rows.length);
        maxBytes = Math.max(maxBytes, measured.bytes);
      }
      repetitionP50[repetition] = percentile(repetitionSamples, 0.5);
      repetitionP95[repetition] = percentile(repetitionSamples, 0.95);
      repetitionP99[repetition] = percentile(repetitionSamples, 0.99);
    }
    try {
      const explainRows = await sql.unsafe(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${reference.sql}`,
        reference.values
      );
      const planValue = explainRows[0]?.["QUERY PLAN"];
      if (planValue === undefined) invalid();
      let parsed: unknown = planValue;
      if (typeof planValue === "string") parsed = JSON.parse(planValue) as unknown;
      sharedBuffers = Math.max(1, sharedHitBlocks(parsed));
      const planRowsRead = actualRowsRead(parsed);
      if (!Number.isSafeInteger(planRowsRead) || planRowsRead < 1) invalid();
      maxRows = Math.max(maxRows, planRowsRead);
    } catch {
      invalid();
    }
    const p50 = medianOfThree(repetitionP50);
    const p95 = medianOfThree(repetitionP95);
    const p99 = medianOfThree(repetitionP99);
    const baseCeiling = {
      queryCountMax: 1 as const,
      rowsReadMax: maxRows,
      rowsReturnedMax: reference.bound,
      transferredBytesMax: maxBytes,
      sharedBuffersMax: sharedBuffers,
      p50MsMax: freezeCeiling(reference.metricKind, p50),
      p95MsMax: freezeCeiling(reference.metricKind, p95),
      p99MsMax: freezeCeiling(reference.metricKind, p99),
    } satisfies Task551ReviewableReceiptNumericCeilingV1;
    const statementCeilings = executor.statementId === null ? [] : [baseCeiling];
    const calibration = await calibrate();
    const poolWait = await measurePoolWait();
    const runtimeContext = await readRuntimeContext();
    return {
      statementCeilings,
      statementIds: executor.statementId === null ? [] : [executor.statementId],
      poolWaitCeiling: poolWait,
      calibrationMedianMs: calibration,
      p95Repetitions: repetitionP95,
      p95SpreadPercent: p95SpreadPercent(repetitionP95),
      scopeDigest: lastScopeDigest as Task551LowercaseSha256,
      runtimeContext,
    };
  };
  const readRuntimeContext = async (): Promise<Task551DatabaseRuntimeContext> => {
    if (runtimeContext !== undefined) return runtimeContext;
    if (postgresMajor === undefined) {
      const versionRows = await sql.unsafe("SHOW server_version_num");
      const version = Number(versionRows[0]?.server_version_num ?? NaN);
      if (!Number.isSafeInteger(version) || version < 10_000) invalid();
      postgresMajor = Math.floor(version / 10_000);
    }
    const configRows = await sql.unsafe(
      "SELECT name, setting FROM pg_settings WHERE name = ANY($1::text[]) ORDER BY name",
      [["max_connections", "shared_buffers", "work_mem", "jit"]]
    );
    const config = configRows.map((row) => {
      if (typeof row.name !== "string" || typeof row.setting !== "string") invalid();
      return [row.name, row.setting] as const;
    });
    if (config.length !== 4 || new Set(config.map(([name]) => name)).size !== 4) invalid();
    const provenance = readTask551RuntimeProvenance();
    if (lastScopeDigest === undefined) invalid();
    runtimeContext = {
      provenanceCommit: provenance.provenanceCommit,
      platform: provenance.platform,
      arch: provenance.arch,
      cpuModel: provenance.cpuModel,
      logicalCpus: provenance.logicalCpus,
      memoryMb: provenance.memoryMb,
      postgresMajor,
      postgresConfigDigest: createHash("sha256")
        .update(JSON.stringify({ poolMax: PROFILE_POOL_CAPACITY[profile], config }), "utf8")
        .digest("hex"),
      bunVersion: process.versions.bun ?? invalid(),
      poolCapacity: PROFILE_POOL_CAPACITY[profile],
      containerMode: provenance.containerMode,
      scopeDigest: lastScopeDigest,
    };
    return runtimeContext;
  };
  const readSanitizedCatalogProjection = (): Promise<Task551SanitizedCatalogProjectionV1> =>
    readTask551SanitizedCatalogProjection(sql);
  return {
    client,
    executeScenario,
    measureScenario,
    cleanupScenario,
    readSanitizedCatalogProjection,
    readRuntimeContext,
    close: async () => {
      if (activeTransaction || ledgers.size !== 0) invalid();
      try {
        await sql.end({ timeout: 5_000 });
      } catch {
        invalid();
      }
    },
  };
}
