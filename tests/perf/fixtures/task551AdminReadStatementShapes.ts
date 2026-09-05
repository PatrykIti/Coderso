/**
 * TASK-551-01-L02 frozen future Admin statement-shape registry (test-only).
 *
 * The exact 32 planned TASK-551-03-L02 statement shapes enumerated by L01.
 * Every member owns its required future file/symbol, exact projected columns,
 * authorization/parent and normalized-filter predicate slots, keyset predicate,
 * join direction, order, LIMIT expression, fixture case, and expected output
 * bound. The L01 core fields (plannedShapeId, futureFile, futureSymbol, kind,
 * statementRole, bound, budgetId, fingerprintKey) mirror
 * `task551QueryInventory.ts` exactly so the 32-member ID/field set is the same
 * source of truth.
 *
 * Contains no production import and accepts no request-selected identifier or
 * raw CLI SQL. Pages are LIMIT <=101, fixed summaries return exactly one row,
 * ordinary facets return <=51, the two discriminated `UNION ALL` facet batches
 * return <=102, and capped service-resource/schedule lists read <=101. Fixed
 * summaries omit all normalized row filters; facets retain authorization/parent
 * scope but omit row filters. Page statements include them. No statement
 * contains a filtered count.
 */
import { createHash } from "node:crypto";

/**
 * Frozen future statement shape. The six L01-pinned fields are exact mirrors;
 * the remaining fields are the L02 execution contract (projection, predicate
 * slots, keyset, order, LIMIT, fixture case, output bound).
 */
export type Task551AdminReadShape = Readonly<{
  plannedShapeId: string;
  futureFile: string;
  futureSymbol: string;
  futureLine: null;
  futureColumn: null;
  callerFamily: "drizzle-executor";
  callerOperation: "select";
  kind: "list" | "point";
  statementRole: "page" | "fixed-summary" | "facet" | "fixed-list";
  projectionSensitivity: "summary" | "narrow";
  filterShape: "exact-key" | "keyset" | "bounded-filter";
  joinShape: "bounded";
  orderShape: "stable";
  bound: 1 | 51 | 101 | 102;
  queryCountBudget: 1;
  cacheEligibility: "eligible";
  freshnessPolicy: "request";
  transactionMode: "none";
  constraintOwner: "none";
  budgetId: string;
  fingerprintKey: string;
  owner: "TASK-551-03-L02";
  disposition: "optimize";
  projectedColumns: readonly string[];
  authorizationPredicate: readonly string[];
  normalizedFilterPredicateSlots: readonly string[];
  keysetPredicate: string;
  joinDirection: "none" | "left" | "inner";
  order: string;
  limitExpression: string;
  fixtureCase: string;
  expectedOutputBound: 1 | 51 | 101 | 102;
  canonicalTemplate: string;
  templateDigest: string;
}>;

type Task551ShapeExecution = Omit<
  Task551AdminReadShape,
  | "plannedShapeId"
  | "futureFile"
  | "futureSymbol"
  | "futureLine"
  | "futureColumn"
  | "callerFamily"
  | "callerOperation"
  | "kind"
  | "statementRole"
  | "projectionSensitivity"
  | "filterShape"
  | "joinShape"
  | "orderShape"
  | "bound"
  | "queryCountBudget"
  | "cacheEligibility"
  | "freshnessPolicy"
  | "transactionMode"
  | "constraintOwner"
  | "budgetId"
  | "fingerprintKey"
  | "owner"
  | "disposition"
  | "canonicalTemplate"
  | "templateDigest"
>;

const shape = (
  plannedShapeId: string,
  futureFile: string,
  futureSymbol: string,
  kind: Task551AdminReadShape["kind"],
  statementRole: Task551AdminReadShape["statementRole"],
  bound: Task551AdminReadShape["bound"],
  fingerprintKey: string,
  execution: Task551ShapeExecution
): Task551AdminReadShape => {
  const semantic = {
    futureLine: null,
    futureColumn: null,
    callerFamily: "drizzle-executor" as const,
    callerOperation: "select" as const,
    projectionSensitivity:
      statementRole === "fixed-summary" ? ("summary" as const) : ("narrow" as const),
    filterShape:
      statementRole === "fixed-summary"
        ? ("exact-key" as const)
        : statementRole === "page"
          ? ("keyset" as const)
          : ("bounded-filter" as const),
    joinShape: "bounded" as const,
    orderShape: "stable" as const,
    queryCountBudget: 1 as const,
    cacheEligibility: "eligible" as const,
    freshnessPolicy: "request" as const,
    transactionMode: "none" as const,
    constraintOwner: "none" as const,
    owner: "TASK-551-03-L02" as const,
    disposition: "optimize" as const,
  };
  const base = {
    plannedShapeId,
    futureFile,
    futureSymbol,
    kind,
    statementRole,
    bound,
    budgetId: plannedShapeId,
    fingerprintKey,
    ...semantic,
    ...execution,
  };
  const canonicalTemplate = serializeTask551AdminReadShape(base);
  return {
    ...base,
    canonicalTemplate,
    templateDigest: createHash("sha256").update(canonicalTemplate, "utf8").digest("hex"),
  };
};

export function serializeTask551AdminReadShape(
  shapeValue: Omit<Task551AdminReadShape, "canonicalTemplate" | "templateDigest">
): string {
  return [
    "task551-admin-read-v1",
    shapeValue.plannedShapeId,
    shapeValue.futureFile,
    shapeValue.futureSymbol,
    shapeValue.futureLine,
    shapeValue.futureColumn,
    shapeValue.callerFamily,
    shapeValue.callerOperation,
    shapeValue.kind,
    shapeValue.statementRole,
    shapeValue.projectionSensitivity,
    shapeValue.filterShape,
    shapeValue.joinShape,
    shapeValue.orderShape,
    shapeValue.bound,
    shapeValue.queryCountBudget,
    shapeValue.cacheEligibility,
    shapeValue.freshnessPolicy,
    shapeValue.transactionMode,
    shapeValue.constraintOwner,
    shapeValue.budgetId,
    shapeValue.fingerprintKey,
    shapeValue.owner,
    shapeValue.disposition,
    shapeValue.projectedColumns.join(","),
    shapeValue.authorizationPredicate.join(","),
    shapeValue.normalizedFilterPredicateSlots.join(","),
    shapeValue.keysetPredicate,
    shapeValue.joinDirection,
    shapeValue.order,
    shapeValue.limitExpression,
    shapeValue.fixtureCase,
    shapeValue.expectedOutputBound,
  ].join("\n");
}

const PAGE = {
  projectedColumns: ["id", "title", "slug", "status", "updated_at"],
  keysetPredicate: "keyset < $cursor or (keyset = $cursor and id < $cursorId)",
  joinDirection: "none",
  limitExpression: "LIMIT 101",
} as const;

const SUMMARY = {
  projectedColumns: ["total", "published", "draft", "scheduled", "archived"],
  authorizationPredicate: [],
  normalizedFilterPredicateSlots: [],
  keysetPredicate: "none",
  joinDirection: "none",
  order: "none",
  limitExpression: "LIMIT 1",
  expectedOutputBound: 1,
} as const;

const FACET = {
  projectedColumns: ["group_key", "count"],
  normalizedFilterPredicateSlots: [],
  keysetPredicate: "count < $cursor or (count = $cursor and group_key > $cursorKey)",
  joinDirection: "none",
  limitExpression: "LIMIT 51",
  expectedOutputBound: 51,
} as const;

export const TASK551_ADMIN_READ_STATEMENT_SHAPES: Readonly<Record<string, Task551AdminReadShape>> =
  {
    "admin-pages-page": shape(
      "admin-pages-page",
      "core/services/pages/pageReadService.ts",
      "selectPageListRows",
      "list",
      "page",
      101,
      "admin_pages_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-pages-fixed-summary": shape(
      "admin-pages-fixed-summary",
      "core/services/pages/pageReadService.ts",
      "selectPageListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_pages_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-pages-authors-facet": shape(
      "admin-pages-authors-facet",
      "core/services/pages/pageReadService.ts",
      "selectPageAuthorFacetPage",
      "list",
      "facet",
      51,
      "admin_pages_authors_facet",
      {
        ...FACET,
        authorizationPredicate: ["author_id is not null"],
        order: "count DESC, author_id ASC",
        fixtureCase: "pages-author",
      }
    ),
    "admin-entries-global-page": shape(
      "admin-entries-global-page",
      "core/services/content/entryReadService.ts",
      "selectGlobalEntryListRows",
      "list",
      "page",
      101,
      "admin_entries_global_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status", "visibility"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "entries-author",
        expectedOutputBound: 101,
      }
    ),
    "admin-entries-global-fixed-summary": shape(
      "admin-entries-global-fixed-summary",
      "core/services/content/entryReadService.ts",
      "selectGlobalEntryFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_entries_global_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-entries-global-facets": shape(
      "admin-entries-global-facets",
      "core/services/content/entryReadService.ts",
      "selectGlobalEntryFacetBatch",
      "list",
      "facet",
      102,
      "admin_entries_global_facets",
      {
        projectedColumns: ["group_key", "count"],
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: [],
        keysetPredicate: "count < $cursor or (count = $cursor and group_key > $cursorKey)",
        joinDirection: "none",
        order: "count DESC, group_key ASC",
        limitExpression: "UNION ALL facet batches LIMIT 102",
        fixtureCase: "entries-author",
        expectedOutputBound: 102,
      }
    ),
    "admin-entries-typed-page": shape(
      "admin-entries-typed-page",
      "core/services/content/entryReadService.ts",
      "selectTypedEntryListRows",
      "list",
      "page",
      101,
      "admin_entries_typed_page",
      {
        ...PAGE,
        authorizationPredicate: ["type_id = $typeId"],
        normalizedFilterPredicateSlots: ["status", "visibility"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "entries-type-author",
        expectedOutputBound: 101,
      }
    ),
    "admin-entries-typed-fixed-summary": shape(
      "admin-entries-typed-fixed-summary",
      "core/services/content/entryReadService.ts",
      "selectTypedEntryFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_entries_typed_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-entries-typed-authors-facet": shape(
      "admin-entries-typed-authors-facet",
      "core/services/content/entryReadService.ts",
      "selectTypedEntryAuthorFacetPage",
      "list",
      "facet",
      51,
      "admin_entries_typed_authors_facet",
      {
        ...FACET,
        authorizationPredicate: ["type_id = $typeId", "author_id is not null"],
        order: "count DESC, author_id ASC",
        fixtureCase: "entries-author",
      }
    ),
    "admin-posts-page": shape(
      "admin-posts-page",
      "core/services/content/postReadService.ts",
      "selectPostListRows",
      "list",
      "page",
      101,
      "admin_posts_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status", "tags"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "posts-author",
        expectedOutputBound: 101,
      }
    ),
    "admin-posts-fixed-summary": shape(
      "admin-posts-fixed-summary",
      "core/services/content/postReadService.ts",
      "selectPostListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_posts_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-posts-authors-facet": shape(
      "admin-posts-authors-facet",
      "core/services/content/postReadService.ts",
      "selectPostAuthorFacetPage",
      "list",
      "facet",
      51,
      "admin_posts_authors_facet",
      {
        ...FACET,
        authorizationPredicate: ["author_id is not null"],
        order: "count DESC, author_id ASC",
        fixtureCase: "posts-author",
      }
    ),
    "admin-users-page": shape(
      "admin-users-page",
      "core/services/admin/userReadService.ts",
      "selectUserListRows",
      "list",
      "page",
      101,
      "admin_users_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status", "role_id"],
        order: "created_at DESC, id DESC",
        fixtureCase: "users-role-30pct",
        expectedOutputBound: 101,
      }
    ),
    "admin-users-fixed-summary": shape(
      "admin-users-fixed-summary",
      "core/services/admin/userReadService.ts",
      "selectUserListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_users_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-users-roles-facet": shape(
      "admin-users-roles-facet",
      "core/services/admin/userReadService.ts",
      "selectUserRoleFacetPage",
      "list",
      "facet",
      51,
      "admin_users_roles_facet",
      {
        ...FACET,
        authorizationPredicate: [],
        order: "count DESC, role_id ASC",
        fixtureCase: "users-role-30pct",
      }
    ),
    "admin-forms-page": shape(
      "admin-forms-page",
      "core/services/forms/formReadService.ts",
      "selectFormListRows",
      "list",
      "page",
      101,
      "admin_forms_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-forms-fixed-summary": shape(
      "admin-forms-fixed-summary",
      "core/services/forms/formReadService.ts",
      "selectFormListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_forms_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-form-submissions-page": shape(
      "admin-form-submissions-page",
      "core/services/forms/submissionReadService.ts",
      "selectSubmissionListRows",
      "list",
      "page",
      101,
      "admin_form_submissions_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["form_id", "status"],
        order: "created_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-form-submissions-fixed-summary": shape(
      "admin-form-submissions-fixed-summary",
      "core/services/forms/submissionReadService.ts",
      "selectSubmissionListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_form_submissions_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-media-page": shape(
      "admin-media-page",
      "core/services/mediaReadService.ts",
      "selectMediaListRows",
      "list",
      "page",
      101,
      "admin_media_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["type", "mime_type", "tags"],
        order: "created_at DESC, id DESC",
        fixtureCase: "media-tags-and-1pct",
        expectedOutputBound: 101,
      }
    ),
    "admin-media-fixed-summary": shape(
      "admin-media-fixed-summary",
      "core/services/mediaReadService.ts",
      "selectMediaListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_media_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-media-facets": shape(
      "admin-media-facets",
      "core/services/mediaReadService.ts",
      "selectMediaFacetBatch",
      "list",
      "facet",
      102,
      "admin_media_facets",
      {
        projectedColumns: ["group_key", "count"],
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: [],
        keysetPredicate: "count < $cursor or (count = $cursor and group_key > $cursorKey)",
        joinDirection: "none",
        order: "count DESC, group_key ASC",
        limitExpression: "UNION ALL facet batches LIMIT 102",
        fixtureCase: "media-tags-and-1pct",
        expectedOutputBound: 102,
      }
    ),
    "admin-booking-reservations-page": shape(
      "admin-booking-reservations-page",
      "core/services/booking/bookingReadService.ts",
      "selectReservationListRows",
      "list",
      "page",
      101,
      "admin_booking_reservations_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["resource_id", "service_id", "status"],
        order: "starts_at DESC, id DESC",
        fixtureCase: "filter-50pct",
        expectedOutputBound: 101,
      }
    ),
    "admin-booking-reservations-fixed-summary": shape(
      "admin-booking-reservations-fixed-summary",
      "core/services/booking/bookingReadService.ts",
      "selectReservationListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_booking_reservations_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-booking-resources-page": shape(
      "admin-booking-resources-page",
      "core/services/booking/bookingReadService.ts",
      "selectResourceListRows",
      "list",
      "page",
      101,
      "admin_booking_resources_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status", "type"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-booking-resources-fixed-summary": shape(
      "admin-booking-resources-fixed-summary",
      "core/services/booking/bookingReadService.ts",
      "selectResourceListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_booking_resources_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-booking-services-page": shape(
      "admin-booking-services-page",
      "core/services/booking/bookingReadService.ts",
      "selectServiceListRows",
      "list",
      "page",
      101,
      "admin_booking_services_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["status"],
        order: "updated_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-booking-services-fixed-summary": shape(
      "admin-booking-services-fixed-summary",
      "core/services/booking/bookingReadService.ts",
      "selectServiceListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_booking_services_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-booking-blackouts-page": shape(
      "admin-booking-blackouts-page",
      "core/services/booking/bookingReadService.ts",
      "selectBlackoutListRows",
      "list",
      "page",
      101,
      "admin_booking_blackouts_page",
      {
        ...PAGE,
        authorizationPredicate: [],
        normalizedFilterPredicateSlots: ["resource_id"],
        order: "starts_at DESC, id DESC",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-booking-blackouts-fixed-summary": shape(
      "admin-booking-blackouts-fixed-summary",
      "core/services/booking/bookingReadService.ts",
      "selectBlackoutListFixedSummary",
      "point",
      "fixed-summary",
      1,
      "admin_booking_blackouts_fixed_summary",
      {
        ...SUMMARY,
        order: "none",
        fixtureCase: "point",
      }
    ),
    "admin-booking-service-resources-fixed-list": shape(
      "admin-booking-service-resources-fixed-list",
      "core/services/booking/bookingReadService.ts",
      "selectServiceResourceRows",
      "list",
      "fixed-list",
      101,
      "admin_booking_service_resources_fixed_list",
      {
        projectedColumns: ["resource_id", "is_required"],
        authorizationPredicate: ["service_id = $serviceId"],
        normalizedFilterPredicateSlots: [],
        keysetPredicate: "none",
        joinDirection: "inner",
        order: "resource_id ASC",
        limitExpression: "LIMIT 101",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
    "admin-booking-schedules-fixed-list": shape(
      "admin-booking-schedules-fixed-list",
      "core/services/booking/bookingReadService.ts",
      "selectScheduleRows",
      "list",
      "fixed-list",
      101,
      "admin_booking_schedules_fixed_list",
      {
        projectedColumns: ["id", "day_of_week", "start_minute", "end_minute", "is_available"],
        authorizationPredicate: ["resource_id = $resourceId"],
        normalizedFilterPredicateSlots: [],
        keysetPredicate: "none",
        joinDirection: "none",
        order: "day_of_week ASC, start_minute ASC, id ASC",
        limitExpression: "LIMIT 101",
        fixtureCase: "equal-sort-page",
        expectedOutputBound: 101,
      }
    ),
  };

export const TASK551_ADMIN_READ_STATEMENT_SHAPE_ENTRIES: readonly Task551AdminReadShape[] =
  Object.freeze(Object.values(TASK551_ADMIN_READ_STATEMENT_SHAPES));

export const TASK551_ADMIN_READ_PLANNED_IDS: readonly string[] = Object.freeze(
  TASK551_ADMIN_READ_STATEMENT_SHAPE_ENTRIES.map((shapeValue) => shapeValue.plannedShapeId)
);

type Task551L01ProjectionRecord = Readonly<{
  id: string;
  plannedShapeId: string;
  source: Readonly<{ file: string; symbol: string; line: null; column: null }>;
  caller: Readonly<{ family: "drizzle-executor"; operation: "select" }>;
  kind: "list" | "point";
  statementRole: "page" | "fixed-summary" | "facet" | "fixed-list";
  projectionSensitivity: "summary" | "narrow";
  filterShape: "exact-key" | "keyset" | "bounded-filter";
  joinShape: "bounded";
  orderShape: "stable";
  bound: 1 | 51 | 101 | 102;
  queryCountBudget: 1;
  cacheEligibility: "eligible";
  freshnessPolicy: "request";
  transactionMode: "none";
  constraintOwner: "none";
  budgetId: string;
  telemetryFingerprintKey: string;
  owner: "TASK-551-03-L02";
  disposition: "optimize";
}>;

type Task551SemanticTuple = readonly [
  string,
  string,
  string,
  string,
  null,
  null,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  1 | 51 | 101 | 102,
  1,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const shapeKeys = [
  "plannedShapeId",
  "futureFile",
  "futureSymbol",
  "futureLine",
  "futureColumn",
  "callerFamily",
  "callerOperation",
  "kind",
  "statementRole",
  "projectionSensitivity",
  "filterShape",
  "joinShape",
  "orderShape",
  "bound",
  "queryCountBudget",
  "cacheEligibility",
  "freshnessPolicy",
  "transactionMode",
  "constraintOwner",
  "budgetId",
  "fingerprintKey",
  "owner",
  "disposition",
  "projectedColumns",
  "authorizationPredicate",
  "normalizedFilterPredicateSlots",
  "keysetPredicate",
  "joinDirection",
  "order",
  "limitExpression",
  "fixtureCase",
  "expectedOutputBound",
  "canonicalTemplate",
  "templateDigest",
] as const;

function invalid(): never {
  throw new Error("database_baseline_invalid");
}
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};
const own = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!isPlainObject(value)) invalid();
  const actual = Reflect.ownKeys(value);
  const expected = new Set(keys);
  if (
    actual.length !== keys.length ||
    actual.some((key) => typeof key !== "string" || !expected.has(key)) ||
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
};
const stringValue = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) invalid();
  return value;
};
const stringArray = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid();
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== value.length + 1 ||
    ownKeys.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
  )
    invalid();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.enumerable !== false ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
  )
    invalid();
  return value.map(stringValue);
};
const enumValue = <T extends string>(value: unknown, values: readonly T[]): T => {
  if (typeof value !== "string" || !values.includes(value as T)) invalid();
  return value as T;
};

function projectionTuple(value: unknown): Task551SemanticTuple {
  const record = own(value, [
    "id",
    "plannedShapeId",
    "source",
    "caller",
    "kind",
    "statementRole",
    "projectionSensitivity",
    "filterShape",
    "joinShape",
    "orderShape",
    "bound",
    "queryCountBudget",
    "cacheEligibility",
    "freshnessPolicy",
    "transactionMode",
    "constraintOwner",
    "budgetId",
    "telemetryFingerprintKey",
    "owner",
    "disposition",
  ]);
  const source = own(record.source, ["file", "symbol", "line", "column"]);
  const caller = own(record.caller, ["family", "operation"]);
  if (source.line !== null || source.column !== null) invalid();
  if (caller.family !== "drizzle-executor" || caller.operation !== "select") invalid();
  if (
    record.queryCountBudget !== 1 ||
    record.joinShape !== "bounded" ||
    record.cacheEligibility !== "eligible" ||
    record.freshnessPolicy !== "request" ||
    record.transactionMode !== "none" ||
    record.constraintOwner !== "none" ||
    record.owner !== "TASK-551-03-L02" ||
    record.disposition !== "optimize"
  )
    invalid();
  const bound = record.bound;
  if (bound !== 1 && bound !== 51 && bound !== 101 && bound !== 102) invalid();
  const orderShape = enumValue(record.orderShape, ["stable"]);
  return [
    stringValue(record.id),
    stringValue(record.plannedShapeId),
    stringValue(source.file),
    stringValue(source.symbol),
    source.line,
    source.column,
    caller.family,
    caller.operation,
    enumValue(record.kind, ["list", "point"]),
    enumValue(record.statementRole, ["page", "fixed-summary", "facet", "fixed-list"]),
    enumValue(record.projectionSensitivity, ["summary", "narrow"]),
    enumValue(record.filterShape, ["exact-key", "keyset", "bounded-filter"]),
    record.joinShape,
    orderShape,
    bound,
    record.queryCountBudget,
    record.cacheEligibility as string,
    record.freshnessPolicy as string,
    record.transactionMode as string,
    record.constraintOwner as string,
    stringValue(record.budgetId),
    stringValue(record.telemetryFingerprintKey),
    record.owner as string,
    record.disposition as string,
  ];
}

function shapeTuple(value: unknown): Task551SemanticTuple {
  const record = own(value, shapeKeys);
  if (
    record.futureLine !== null ||
    record.futureColumn !== null ||
    record.callerFamily !== "drizzle-executor" ||
    record.callerOperation !== "select" ||
    record.joinShape !== "bounded" ||
    record.orderShape !== "stable" ||
    record.queryCountBudget !== 1 ||
    record.cacheEligibility !== "eligible" ||
    record.freshnessPolicy !== "request" ||
    record.transactionMode !== "none" ||
    record.constraintOwner !== "none" ||
    record.owner !== "TASK-551-03-L02" ||
    record.disposition !== "optimize"
  )
    invalid();
  const bound = record.bound;
  if (bound !== 1 && bound !== 51 && bound !== 101 && bound !== 102) invalid();
  const expectedTemplate = serializeTask551AdminReadShape(
    record as unknown as Omit<Task551AdminReadShape, "canonicalTemplate" | "templateDigest">
  );
  const expectedDigest = createHash("sha256").update(expectedTemplate, "utf8").digest("hex");
  if (record.canonicalTemplate !== expectedTemplate || record.templateDigest !== expectedDigest)
    invalid();
  stringArray(record.projectedColumns);
  stringArray(record.authorizationPredicate);
  stringArray(record.normalizedFilterPredicateSlots);
  return [
    stringValue(record.plannedShapeId),
    stringValue(record.plannedShapeId),
    stringValue(record.futureFile),
    stringValue(record.futureSymbol),
    null,
    null,
    record.callerFamily,
    record.callerOperation,
    enumValue(record.kind, ["list", "point"]),
    enumValue(record.statementRole, ["page", "fixed-summary", "facet", "fixed-list"]),
    enumValue(record.projectionSensitivity, ["summary", "narrow"]),
    enumValue(record.filterShape, ["exact-key", "keyset", "bounded-filter"]),
    record.joinShape,
    record.orderShape,
    bound,
    record.queryCountBudget,
    record.cacheEligibility,
    record.freshnessPolicy,
    record.transactionMode,
    record.constraintOwner,
    stringValue(record.budgetId),
    stringValue(record.fingerprintKey),
    record.owner,
    record.disposition,
  ];
}

function strictArray(value: unknown, length: number): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== length
  )
    invalid();
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some((key) => typeof key !== "string" || (key !== "length" && !/^\d+$/u.test(key)))
  )
    invalid();
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.enumerable !== false ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
  )
    invalid();
  return value;
}

export function assertTask551AdminReadStatementShapeDeclarations(
  declarations: readonly unknown[]
): void {
  const values = strictArray(declarations, declarations.length);
  const seen = new Set<string>();
  const keyed: Record<string, unknown> = {};
  for (const declaration of values) {
    const tuple = shapeTuple(declaration);
    const id = tuple[0];
    if (seen.has(id)) invalid();
    seen.add(id);
    keyed[id] = declaration;
  }
  if (values.length !== 32 || Object.keys(keyed).length !== 32) invalid();
}

export function assertExactAdminShapeProjection(
  input: Readonly<{
    l01Projection: readonly unknown[];
    shapes: Readonly<Record<string, unknown>>;
  }>
): void {
  const record = own(input, ["l01Projection", "shapes"]);
  const l01 = strictArray(record.l01Projection, 32);
  const shapes = record.shapes;
  if (!isPlainObject(shapes)) invalid();
  const shapeKeysActual = Reflect.ownKeys(shapes);
  if (shapeKeysActual.length !== 32 || shapeKeysActual.some((key) => typeof key !== "string"))
    invalid();
  assertTask551AdminReadStatementShapeDeclarations(Object.values(shapes));
  const l01Tuples = l01.map(projectionTuple);
  const shapeTuples = shapeKeysActual.map((key) => {
    if (typeof key !== "string") invalid();
    const tuple = shapeTuple(shapes[key]);
    if (tuple[0] !== key) invalid();
    return tuple;
  });
  const l01Ids = l01Tuples.map((tuple) => tuple[0]);
  const shapeIds = shapeTuples.map((tuple) => tuple[0]);
  const l01Sorted = [...l01Ids].sort();
  const shapeSorted = [...shapeIds].sort();
  if (
    new Set(l01Ids).size !== 32 ||
    new Set(shapeIds).size !== 32 ||
    l01Sorted.some((id, index) => id !== shapeSorted[index])
  )
    invalid();
  const l01ById = new Map(l01Tuples.map((tuple) => [tuple[0], tuple]));
  const shapeById = new Map(shapeTuples.map((tuple) => [tuple[0], tuple]));
  for (const id of l01Sorted) {
    const left = l01ById.get(id);
    const right = shapeById.get(id);
    if (left === undefined || right === undefined || JSON.stringify(left) !== JSON.stringify(right))
      invalid();
  }
}
