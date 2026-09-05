import {
  TASK551_EVIDENCE_PINS,
  TASK551_EQUAL_SORT_FAMILIES,
  TASK551_SCALE_COUNTS,
  TASK551_SCALE_DISTRIBUTIONS,
  TASK551_SEARCH_ELIGIBILITY,
  TASK551_SEARCH_TOKENS,
  expectedSearchHits,
  type FixtureFamily,
  type ScaleProfile,
  type SeedTable,
} from "../../tests/perf/fixtures/task551DatabaseScale";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

const TABLE_FAMILY: Readonly<Record<string, FixtureFamily>> = {
  users: "users",
  roles: "roles",
  user_roles: "userRoles",
  pages: "pages",
  content_types: "contentTypes",
  content_entries: "contentEntries",
  posts: "posts",
  media_folders: "mediaFolders",
  media: "media",
  forms: "forms",
  form_actions: "formActions",
  form_submissions: "formSubmissions",
  form_action_runs: "formActionRuns",
  booking_resources: "bookingResources",
  booking_services: "bookingServices",
  booking_service_resources: "bookingServiceResources",
  booking_schedules: "bookingSchedules",
  booking_blackouts: "bookingBlackouts",
  bookings: "bookings",
  search_history: "searchHistory",
  access_logs: "accessLogs",
  audit_logs: "auditLogs",
  email_delivery_logs: "emailDeliveryLogs",
  integrations: "integrations",
  integration_requests: "integrationRequests",
  webhooks: "webhooks",
  webhook_deliveries: "webhookDeliveries",
  sessions: "sessions",
  password_resets: "passwordResets",
  preview_tokens: "previewTokens",
  post_preview_tokens: "postPreviewTokens",
  assistant_doc_ingest_runs: "assistantDocIngestRuns",
  settings: "settings",
  redirects: "redirects",
  assistant_docs: "assistantDocs",
  assistant_doc_chunks: "assistantDocChunks",
  assistant_action_executions: "assistantActionExecutions",
  assistant_action_undo_items: "assistantActionUndoItems",
  analytics_sessions: "analyticsSessions",
  analytics_pageviews: "analyticsPageviews",
  widget_templates: "widgetTemplates",
  detail_page_documents: "detailPageDocuments",
  solution_kit_install_runs: "solutionKitInstallRuns",
  solution_kit_install_items: "solutionKitInstallItems",
  page_revisions: "pageRevisions",
  content_revisions: "contentRevisions",
  post_revisions: "postRevisions",
  widget_template_revisions: "widgetTemplateRevisions",
  detail_page_revisions: "detailPageRevisions",
};

function columnIndex(table: SeedTable, name: string): number {
  const index = table.columns.indexOf(name);
  if (index < 0) invalid();
  return index;
}

function values(table: SeedTable, column: string): readonly unknown[] {
  const index = columnIndex(table, column);
  return table.rows.map((row) => row[index]);
}

function countWhere(
  table: SeedTable,
  column: string,
  predicate: (value: unknown, row: readonly unknown[]) => boolean
): number {
  const index = columnIndex(table, column);
  return table.rows.filter((row) => predicate(row[index], row)).length;
}

function assertClassCounts(
  table: SeedTable,
  column: string,
  expected: Readonly<Record<string, number>>
): void {
  const counts = new Map<string, number>();
  for (const value of values(table, column)) {
    if (typeof value !== "string") invalid();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const expectedKeys = Object.keys(expected);
  if (
    counts.size !== expectedKeys.length ||
    expectedKeys.some((key) => counts.get(key) !== expected[key])
  )
    invalid();
}

function assertPercentageDistribution(
  table: SeedTable,
  column: string,
  percentages: Readonly<Record<string, number>>
): void {
  const expected = Object.fromEntries(
    Object.entries(percentages).map(([key, percentage]) => [
      key,
      (table.rows.length * percentage) / 100,
    ])
  );
  assertClassCounts(table, column, expected);
}

function assertArrayClassCounts(
  table: SeedTable,
  column: string,
  expected: Readonly<Record<string, number>>
): void {
  const index = columnIndex(table, column);
  const counts = new Map<string, number>();
  for (const row of table.rows) {
    const value = row[index];
    if (!Array.isArray(value) || value.length !== 1 || typeof value[0] !== "string") invalid();
    counts.set(value[0], (counts.get(value[0]) ?? 0) + 1);
  }
  const expectedKeys = Object.keys(expected);
  if (
    counts.size !== expectedKeys.length ||
    expectedKeys.some((key) => counts.get(key) !== expected[key])
  )
    invalid();
}

function assertEqualSortClasses(table: SeedTable): void {
  const counts = new Map<number, number>();
  for (const value of values(table, "created_at")) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) invalid();
    counts.set(value.getTime(), (counts.get(value.getTime()) ?? 0) + 1);
  }
  const groupSize = TASK551_SCALE_DISTRIBUTIONS.equalSortGroupSize;
  if (
    counts.size !== table.rows.length / groupSize ||
    [...counts.values()].some((count) => count !== groupSize)
  )
    invalid();
}

function assertSearchSelectivity(
  table: SeedTable,
  family: "users" | "pages" | "entries" | "posts" | "media" | "assistantDocs" | "assistantChunks",
  profile: ScaleProfile
): void {
  const eligibility = TASK551_SEARCH_ELIGIBILITY[family];
  const index = columnIndex(table, eligibility.column);
  const eligible = (row: readonly unknown[]): boolean => {
    if (family === "users") return row[columnIndex(table, "status")] === "active";
    if (family === "pages" || family === "posts")
      return row[columnIndex(table, "status")] === "published";
    if (family === "entries")
      return (
        row[columnIndex(table, "status")] === "published" &&
        row[columnIndex(table, "visibility")] === "public"
      );
    if (family === "media") return row[columnIndex(table, "type")] === "image";
    if (family === "assistantDocs") return row[columnIndex(table, "language")] === "en";
    return Number(row[columnIndex(table, "token_count")]) > 0;
  };
  const tokenCount = (token: string): number =>
    table.rows.filter(
      (row) =>
        eligible(row) && typeof row[index] === "string" && row[index].split(/\s+/u).includes(token)
    ).length;
  if (tokenCount(TASK551_SEARCH_TOKENS.common) !== expectedSearchHits(family, profile, "common"))
    invalid();
  if (tokenCount(TASK551_SEARCH_TOKENS.rare) !== expectedSearchHits(family, profile, "rare"))
    invalid();
  if (tokenCount(TASK551_SEARCH_TOKENS.hidden) !== expectedSearchHits(family, profile, "hidden"))
    invalid();
  if (
    tokenCount(`${TASK551_SEARCH_TOKENS.uniquePrefix}0`) !==
    expectedSearchHits(family, profile, "unique")
  )
    invalid();
  if (tokenCount(TASK551_SEARCH_TOKENS.miss) !== expectedSearchHits(family, profile, "miss"))
    invalid();
}

function assertEvidenceSelectivity(
  table: SeedTable,
  family: FixtureFamily,
  profile: ScaleProfile
): void {
  if (family === "pages") {
    const firstAuthor = values(table, "author_id")[0];
    if (
      countWhere(table, "author_id", (value) => value === firstAuthor) !==
      TASK551_EVIDENCE_PINS.pageAuthorZero[profile]
    )
      invalid();
  }
  if (family === "contentEntries") {
    const firstAuthor = values(table, "author_id")[0];
    const firstType = values(table, "type_id")[0];
    if (
      countWhere(table, "author_id", (value) => value === firstAuthor) !==
      TASK551_EVIDENCE_PINS.entryAuthorZero[profile]
    )
      invalid();
    if (
      table.rows.filter(
        (row) =>
          row[columnIndex(table, "author_id")] === firstAuthor &&
          row[columnIndex(table, "type_id")] === firstType
      ).length !== TASK551_EVIDENCE_PINS.entryTypeAuthorZero[profile]
    )
      invalid();
  }
  if (family === "posts") {
    const firstAuthor = values(table, "author_id")[0];
    if (
      countWhere(table, "author_id", (value) => value === firstAuthor) !==
      TASK551_EVIDENCE_PINS.postAuthorZero[profile]
    )
      invalid();
    if (
      countWhere(
        table,
        "tags",
        (value) => Array.isArray(value) && value.includes("task551-post-extra")
      ) !== TASK551_EVIDENCE_PINS.postTagContainment[profile]
    )
      invalid();
  }
  if (
    family === "media" &&
    countWhere(
      table,
      "tags",
      (value) => Array.isArray(value) && value.includes("task551-media-pair")
    ) !== TASK551_EVIDENCE_PINS.mediaTagsAnd[profile]
  )
    invalid();
  if (family === "userRoles") {
    const roleValues = values(table, "role_id");
    const roleOne = roleValues.find((value) => value !== roleValues[0]);
    if (
      roleOne === undefined ||
      countWhere(table, "role_id", (value) => value === roleOne) !==
        TASK551_EVIDENCE_PINS.roleOneUsers[profile]
    )
      invalid();
  }
  if (family === "webhooks") {
    const eventZero = TASK551_SCALE_DISTRIBUTIONS.webhookEvents[0];
    if (
      countWhere(table, "events", (value) => Array.isArray(value) && value.includes(eventZero)) !==
      TASK551_EVIDENCE_PINS.webhookEventZero[profile]
    )
      invalid();
  }
  if (family === "webhookDeliveries") {
    const firstWebhook = values(table, "webhook_id")[0];
    if (
      countWhere(table, "webhook_id", (value) => value === firstWebhook) !==
      TASK551_EVIDENCE_PINS.webhookParentDeliveries[profile]
    )
      invalid();
  }
  if (family === "bookingBlackouts") {
    if (countWhere(table, "resource_id", (value) => value === null) !== table.rows.length / 10)
      invalid();
  }
}

export function assertTask551FixtureTable(table: SeedTable, profile: ScaleProfile): void {
  const family = TABLE_FAMILY[table.table];
  if (family === undefined || table.rows.length !== TASK551_SCALE_COUNTS[family][profile])
    invalid();
  if (table.rows.some((row) => row.length !== table.columns.length)) invalid();
  if (family === "users")
    assertPercentageDistribution(table, "status", {
      active: TASK551_SCALE_DISTRIBUTIONS.users.active,
      inactive: TASK551_SCALE_DISTRIBUTIONS.users.inactive,
      pending: TASK551_SCALE_DISTRIBUTIONS.users.pending,
    });
  if (family === "pages" || family === "contentEntries" || family === "posts")
    assertPercentageDistribution(table, "status", TASK551_SCALE_DISTRIBUTIONS.contentStatus);
  if (family === "contentEntries")
    assertPercentageDistribution(table, "visibility", TASK551_SCALE_DISTRIBUTIONS.entryVisibility);
  if (family === "forms")
    assertPercentageDistribution(table, "status", TASK551_SCALE_DISTRIBUTIONS.formStatus);
  if (family === "formSubmissions")
    assertPercentageDistribution(table, "status", TASK551_SCALE_DISTRIBUTIONS.submissionStatus);
  if (family === "bookings")
    assertClassCounts(
      table,
      "status",
      Object.fromEntries(
        TASK551_SCALE_DISTRIBUTIONS.bookingStatuses.map((status) => [
          status,
          table.rows.length / TASK551_SCALE_DISTRIBUTIONS.bookingStatuses.length,
        ])
      )
    );
  if (family === "webhooks")
    assertArrayClassCounts(
      table,
      "events",
      Object.fromEntries(
        TASK551_SCALE_DISTRIBUTIONS.webhookEvents.map((event) => [
          event,
          table.rows.length / TASK551_SCALE_DISTRIBUTIONS.webhookEvents.length,
        ])
      )
    );
  if (family === "webhookDeliveries")
    assertClassCounts(
      table,
      "event",
      Object.fromEntries(
        TASK551_SCALE_DISTRIBUTIONS.webhookEvents.map((event) => [
          event,
          table.rows.length / TASK551_SCALE_DISTRIBUTIONS.webhookEvents.length,
        ])
      )
    );
  if (TASK551_EQUAL_SORT_FAMILIES.includes(family)) assertEqualSortClasses(table);
  if (
    family === "users" ||
    family === "pages" ||
    family === "contentEntries" ||
    family === "posts" ||
    family === "media" ||
    family === "assistantDocs" ||
    family === "assistantDocChunks"
  ) {
    const searchFamily =
      family === "contentEntries"
        ? "entries"
        : family === "assistantDocChunks"
          ? "assistantChunks"
          : family;
    assertSearchSelectivity(table, searchFamily, profile);
  }
  assertEvidenceSelectivity(table, family, profile);
}

export function assertTask551FixtureLedgerCounts(
  entries: readonly Readonly<{ table: string; keyRows: readonly (readonly unknown[])[] }>[],
  profile: ScaleProfile
): void {
  const tableNames = new Set<string>();
  for (const entry of entries) {
    const family = TABLE_FAMILY[entry.table];
    if (
      family === undefined ||
      tableNames.has(entry.table) ||
      entry.table.includes("task551_fixture_sentinel") ||
      entry.keyRows.length !== TASK551_SCALE_COUNTS[family][profile]
    )
      invalid();
    tableNames.add(entry.table);
    const keys = entry.keyRows.map((row) => JSON.stringify(row));
    if (keys.some((key) => key === undefined) || new Set(keys).size !== keys.length) invalid();
  }
}
