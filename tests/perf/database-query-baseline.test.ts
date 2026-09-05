import { describe, expect, test } from "bun:test";
const it = test;
import {
  assertExactAdminShapeProjection,
  assertTask551AdminReadStatementShapeDeclarations,
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
  TASK551_ADMIN_READ_STATEMENT_SHAPE_ENTRIES,
} from "./fixtures/task551AdminReadStatementShapes";
import { TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION } from "./fixtures/task551QueryInventory";
import {
  MEASUREMENT,
  PROFILE_POOL_CAPACITY,
  TASK551_SCENARIOS,
  TASK551_SCALE_COUNTS,
  TASK551_SCALE_DISTRIBUTIONS,
  TASK551_FAMILY_BUILDERS,
  assertTask551ScenarioManifest,
  type ScaleProfile,
  type SeedContext,
} from "./fixtures/task551DatabaseScale";
import {
  TASK551_DATABASE_BUDGETS,
  TASK551_POOL_WAIT_BUDGETS,
} from "./fixtures/task551DatabaseBudgets";
import { resolveTask551ExecutableScenarioSelector } from "../../scripts/task551DatabaseBaseline/digestContract";
import {
  createTask489PredecessorReceiptV1,
  parseTask489PredecessorReceiptV1,
  serializeTask489PredecessorReceiptV1,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES,
  TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS,
} from "./fixtures/task489SolutionKitRunPredecessor";
import { cloneJson } from "./task551DatabaseBaseline/contractTestHelpers";
import {
  assertTask551PostgresReferenceExecutorRegistry,
  openTask551PostgresTransport,
  TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY,
} from "../../scripts/task551DatabaseBaseline/postgresTransport";
import { assertTask551FixtureTable } from "../../scripts/task551DatabaseBaseline/fixtureValidation";

const numericBudgetKeys = [
  "queryCountMax",
  "rowsReadMax",
  "rowsReturnedMax",
  "transferredBytesMax",
  "sharedBuffersMax",
  "p50MsMax",
  "p95MsMax",
  "p99MsMax",
] as const;

function assertNumericBudget(value: Record<string, unknown>, expectedRowsReturned: number): void {
  expect(Object.keys(value).sort()).toEqual([...numericBudgetKeys].sort());
  expect(value.queryCountMax).toBe(1);
  expect(value.rowsReturnedMax).toBe(expectedRowsReturned);
  for (const key of numericBudgetKeys.slice(1)) {
    expect(typeof value[key]).toBe("number");
    expect(Number.isFinite(value[key])).toBe(true);
    expect(value[key] as number).toBeGreaterThan(0);
  }
}

function invalid(action: () => unknown): void {
  expect(action).toThrow("database_baseline_invalid");
}

function projectionClone(): Record<string, unknown>[] {
  return cloneJson(TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION) as unknown as Record<
    string,
    unknown
  >[];
}

function shapesClone(): Record<string, Record<string, unknown>> {
  return cloneJson(TASK551_ADMIN_READ_STATEMENT_SHAPES) as unknown as Record<
    string,
    Record<string, unknown>
  >;
}

function assertProjectionAndShapes(l01Projection: unknown, shapes: unknown): void {
  invalid(() =>
    assertExactAdminShapeProjection({
      l01Projection: l01Projection as never,
      shapes: shapes as never,
    })
  );
}

function mutatePath(value: Record<string, unknown>, path: readonly string[]): void {
  let current: Record<string, unknown> = value;
  for (const key of path.slice(0, -1)) {
    const next = current[key];
    if (next === null || typeof next !== "object" || Array.isArray(next))
      throw new Error("test path invalid");
    current = next as Record<string, unknown>;
  }
  const leaf = path[path.length - 1];
  if (leaf === undefined) throw new Error("test path empty");
  current[leaf] = "__invalid__";
}

const semanticProjectionPaths = [
  ["id"],
  ["plannedShapeId"],
  ["source", "file"],
  ["source", "symbol"],
  ["source", "line"],
  ["source", "column"],
  ["caller", "family"],
  ["caller", "operation"],
  ["kind"],
  ["statementRole"],
  ["projectionSensitivity"],
  ["filterShape"],
  ["joinShape"],
  ["orderShape"],
  ["bound"],
  ["queryCountBudget"],
  ["cacheEligibility"],
  ["freshnessPolicy"],
  ["transactionMode"],
  ["constraintOwner"],
  ["budgetId"],
  ["telemetryFingerprintKey"],
  ["owner"],
  ["disposition"],
] as const;

const semanticShapePaths = [
  ["plannedShapeId"],
  ["futureFile"],
  ["futureSymbol"],
  ["futureLine"],
  ["futureColumn"],
  ["callerFamily"],
  ["callerOperation"],
  ["kind"],
  ["statementRole"],
  ["projectionSensitivity"],
  ["filterShape"],
  ["joinShape"],
  ["orderShape"],
  ["bound"],
  ["queryCountBudget"],
  ["cacheEligibility"],
  ["freshnessPolicy"],
  ["transactionMode"],
  ["constraintOwner"],
  ["budgetId"],
  ["fingerprintKey"],
  ["owner"],
  ["disposition"],
] as const;

function validTask489Receipt() {
  const statementReceipts = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS.map(
    (statementId) => {
      const logicalCase = TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.find((candidate) =>
        candidate.statementIds.includes(statementId)
      );
      if (logicalCase === undefined) throw new Error(`missing test statement ${statementId}`);
      const statement =
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[logicalCase.companionId].statements[statementId];
      if (statement === undefined)
        throw new Error(`missing test registry statement ${statementId}`);
      const profileResult = <P extends "small" | "large">(profile: P) => ({
        profile,
        planDigest: "a".repeat(64),
        queryCount: 1 as const,
        rowsRead: 0,
        rowsReturned: 0,
        transferredBytes: 0,
        sharedBuffers: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
      });
      return {
        companionId: logicalCase.companionId,
        logicalCaseId: logicalCase.logicalCaseId,
        statementId,
        profileResults: [profileResult("small"), profileResult("large")],
      } as const;
    }
  );
  return createTask489PredecessorReceiptV1(statementReceipts);
}

function task489Bytes(value: unknown, suffix = "\n"): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}${suffix}`);
}

function fixtureValidationContext(profile: ScaleProfile): SeedContext {
  const ids = (family: keyof typeof TASK551_SCALE_COUNTS): readonly string[] =>
    Array.from(
      { length: TASK551_SCALE_COUNTS[family][profile] },
      (_value, ordinal) => `task551-${family}-${ordinal}`
    );
  return {
    scope: "task551-validation",
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

describe("TASK-551 L02 static database baseline contract", () => {
  it("keeps an exact executor for every executable scenario without generic propagation", () => {
    assertTask551PostgresReferenceExecutorRegistry();
    const expectedIds = TASK551_SCENARIOS.filter(
      (scenario) => scenario.equalityParticipation !== "deferred"
    ).map((scenario) => scenario.id);
    expect(Object.keys(TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY)).toEqual(expectedIds);

    const tables = [
      "pages",
      "content_entries",
      "content_types",
      "posts",
      "users",
      "roles",
      "user_roles",
      "forms",
      "form_submissions",
      "media",
      "booking_resources",
      "booking_services",
      "bookings",
      "booking_blackouts",
      "booking_service_resources",
      "booking_schedules",
      "password_resets",
      "preview_tokens",
      "post_preview_tokens",
      "assistant_doc_ingest_runs",
      "form_action_runs",
      "solution_kit_install_items",
    ];
    const context = {
      profile: "small",
      ledger: {
        scope: "task551-test-scope",
        scenarioId: "registry-test",
        tables: tables.map((table) => ({ table, keyColumns: ["id"], keyRows: [[`${table}-id`]] })),
      },
    } as never;
    const queries = expectedIds.map((scenarioId) => {
      const executor = TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY[scenarioId]!;
      expect(executor.scenarioId).toBe(scenarioId);
      const query = executor.buildQuery(context);
      expect(query.sql).not.toContain("LIMIT $1");
      expect(query.sql).toContain(`LIMIT ${query.bound}`);
      return query.sql;
    });
    expect(new Set(queries).size).toBe(expectedIds.length);
  });

  it("preserves the complete immutable L01 Admin projection", () => {
    assertExactAdminShapeProjection({
      l01Projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
      shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
    });
  });

  it("keeps the 32 shape, manifest, and budget IDs in exact equality", () => {
    expect(TASK551_ADMIN_READ_PLANNED_IDS).toHaveLength(32);
    expect(Object.keys(TASK551_ADMIN_READ_STATEMENT_SHAPES)).toEqual(
      TASK551_ADMIN_READ_PLANNED_IDS
    );
    expect(Object.keys(TASK551_DATABASE_BUDGETS)).toEqual(TASK551_ADMIN_READ_PLANNED_IDS);
    expect(
      TASK551_SCENARIOS.filter((scenario) => scenario.kind === "admin-shape").map(
        (scenario) => scenario.id
      )
    ).toEqual(TASK551_ADMIN_READ_PLANNED_IDS);
  });

  it("validates every static profile ceiling and the two pool ceilings", () => {
    for (const id of TASK551_ADMIN_READ_PLANNED_IDS) {
      const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id]!;
      const budget = TASK551_DATABASE_BUDGETS[id]!;
      assertNumericBudget(
        budget.small as unknown as Record<string, unknown>,
        shape.expectedOutputBound
      );
      assertNumericBudget(
        budget.large as unknown as Record<string, unknown>,
        shape.expectedOutputBound
      );
    }
    assertNumericBudget(TASK551_POOL_WAIT_BUDGETS.small as unknown as Record<string, unknown>, 1);
    assertNumericBudget(TASK551_POOL_WAIT_BUDGETS.large as unknown as Record<string, unknown>, 1);
    expect(
      TASK551_ADMIN_READ_PLANNED_IDS.length * 2 * numericBudgetKeys.length +
        2 * numericBudgetKeys.length
    ).toBe(528);
  });

  it("pins the reviewed scale recipes and manifest classes", () => {
    expect(TASK551_SCALE_COUNTS.users).toEqual({ small: 100, large: 10_000 });
    expect(TASK551_SCALE_COUNTS.pages).toEqual({ small: 500, large: 100_000 });
    expect(TASK551_SCALE_COUNTS.contentEntries).toEqual({ small: 2_000, large: 100_000 });
    expect(TASK551_SCALE_DISTRIBUTIONS.equalSortGroupSize).toBe(10);
    expect(TASK551_SCALE_DISTRIBUTIONS.userRoles.additionalEvery).toBe(10);
    expect(MEASUREMENT.calibrationWarmups).toBe(20);
    expect(MEASUREMENT.calibrationSamples).toBe(100);
    expect(PROFILE_POOL_CAPACITY).toEqual({ small: 2, large: 10 });
    assertTask551ScenarioManifest();
    expect(TASK551_SCENARIOS.filter((scenario) => scenario.kind === "supplemental")).toHaveLength(
      6
    );
    expect(
      TASK551_SCENARIOS.filter((scenario) => scenario.kind === "task489-predecessor")
    ).toHaveLength(1);
  });

  it("fails closed on seeded count, distribution, selectivity, and equality drift", () => {
    for (const profile of ["small", "large"] as const) {
      const users = TASK551_FAMILY_BUILDERS.users!(fixtureValidationContext(profile));
      expect(() => assertTask551FixtureTable(users, profile)).not.toThrow();
      invalid(() => assertTask551FixtureTable({ ...users, rows: users.rows.slice(1) }, profile));
      const statusIndex = users.columns.indexOf("status");
      const changedDistribution = [...users.rows];
      changedDistribution[80] = [...changedDistribution[80]!].map((value, index) =>
        index === statusIndex ? "active" : value
      );
      invalid(() => assertTask551FixtureTable({ ...users, rows: changedDistribution }, profile));
    }
    const pages = TASK551_FAMILY_BUILDERS.pages!(fixtureValidationContext("small"));
    expect(() => assertTask551FixtureTable(pages, "small")).not.toThrow();
    const authorIndex = pages.columns.indexOf("author_id");
    const changedAuthor = [...pages.rows[0]!];
    changedAuthor[authorIndex] = "task551-other-author";
    const changedSelectivity = [...pages.rows];
    changedSelectivity[0] = changedAuthor;
    invalid(() => assertTask551FixtureTable({ ...pages, rows: changedSelectivity }, "small"));
    const createdAtIndex = pages.columns.indexOf("created_at");
    const changedTimestamp = [...pages.rows[0]!];
    changedTimestamp[createdAtIndex] = new Date("2040-01-01T00:00:00.000Z");
    const changedEquality = [...pages.rows];
    changedEquality[0] = changedTimestamp;
    invalid(() => assertTask551FixtureTable({ ...pages, rows: changedEquality }, "small"));
  });

  it("pins the separate TASK-489 predecessor arithmetic and finite registry", () => {
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES).toHaveLength(14);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS).toHaveLength(15);
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.totalRuns).toEqual({
      small: 119_890,
      large: 1_109_890,
    });
    expect(TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS.safeDetailItems).toBe(513);
  });

  it("rejects every one of the 32 L01 and L02 tuple members when mutated", () => {
    for (const [index, id] of TASK551_ADMIN_READ_PLANNED_IDS.entries()) {
      const l01 = projectionClone();
      l01[index]!.id = `${id}-mutated`;
      assertProjectionAndShapes(l01, shapesClone());

      const shapes = shapesClone();
      shapes[id]!.plannedShapeId = `${id}-mutated`;
      assertProjectionAndShapes(projectionClone(), shapes);
    }
    const semanticIndex = 0;
    const semanticId = TASK551_ADMIN_READ_PLANNED_IDS[semanticIndex]!;
    for (const path of semanticProjectionPaths) {
      const projection = projectionClone();
      mutatePath(projection[semanticIndex]!, path);
      assertProjectionAndShapes(projection, shapesClone());
    }
    for (const path of semanticShapePaths) {
      const shapes = shapesClone();
      mutatePath(shapes[semanticId]!, path);
      assertProjectionAndShapes(projectionClone(), shapes);
    }
  });

  it("rejects missing, extra, duplicate, defaulted, unknown, and execution-shape tuples", () => {
    const missingL01 = projectionClone();
    missingL01.pop();
    assertProjectionAndShapes(missingL01, shapesClone());

    const extraL01 = projectionClone();
    extraL01.push(cloneJson(extraL01[0]!));
    assertProjectionAndShapes(extraL01, shapesClone());

    const duplicateL01 = projectionClone();
    duplicateL01[1]!.id = duplicateL01[0]!.id;
    assertProjectionAndShapes(duplicateL01, shapesClone());

    const missingShape = shapesClone();
    delete missingShape[TASK551_ADMIN_READ_PLANNED_IDS[0]!];
    assertProjectionAndShapes(projectionClone(), missingShape);

    const extraShape = shapesClone();
    extraShape.extra = cloneJson(extraShape[TASK551_ADMIN_READ_PLANNED_IDS[0]!]!);
    assertProjectionAndShapes(projectionClone(), extraShape);

    const defaultedShape = shapesClone();
    delete defaultedShape[TASK551_ADMIN_READ_PLANNED_IDS[0]!]!.canonicalTemplate;
    assertProjectionAndShapes(projectionClone(), defaultedShape);

    const unknownShape = shapesClone();
    unknownShape[TASK551_ADMIN_READ_PLANNED_IDS[0]!]!.unknown = true;
    assertProjectionAndShapes(projectionClone(), unknownShape);

    const executionShape = shapesClone();
    executionShape[TASK551_ADMIN_READ_PLANNED_IDS[0]!]!.projectedColumns = [];
    assertProjectionAndShapes(projectionClone(), executionShape);

    invalid(() =>
      assertTask551AdminReadStatementShapeDeclarations([
        ...TASK551_ADMIN_READ_STATEMENT_SHAPE_ENTRIES,
        TASK551_ADMIN_READ_STATEMENT_SHAPE_ENTRIES[0]!,
      ])
    );
  });

  it("rejects inherited, nonenumerable, accessor, symbol, wrong-key, sparse, and undefined tuple members", () => {
    const projectionCases: Array<(value: Record<string, unknown>[]) => void> = [
      (value) => Object.setPrototypeOf(value[0]!, { inherited: true }),
      (value) => Object.defineProperty(value[0]!, "id", { value: value[0]!.id, enumerable: false }),
      (value) =>
        Object.defineProperty(value[0]!, "id", { get: () => "admin-pages-page", enumerable: true }),
      (value) =>
        Object.defineProperty(value[0]!, Symbol("projection"), { value: true, enumerable: true }),
      (value) => {
        delete value[0]!.id;
        value[0]!.wrongKey = "admin-pages-page";
      },
      (value) => {
        delete value[0]!.id;
      },
      (value) => {
        value[0]!.id = undefined;
      },
    ];
    for (const mutate of projectionCases) {
      const projection = projectionClone();
      mutate(projection);
      assertProjectionAndShapes(projection, shapesClone());
    }

    const shapeCases: Array<(value: Record<string, Record<string, unknown>>) => void> = [
      (value) => Object.setPrototypeOf(value["admin-pages-page"]!, { inherited: true }),
      (value) =>
        Object.defineProperty(value["admin-pages-page"]!, "plannedShapeId", {
          value: "admin-pages-page",
          enumerable: false,
        }),
      (value) =>
        Object.defineProperty(value["admin-pages-page"]!, "plannedShapeId", {
          get: () => "admin-pages-page",
          enumerable: true,
        }),
      (value) =>
        Object.defineProperty(value["admin-pages-page"]!, Symbol("shape"), {
          value: true,
          enumerable: true,
        }),
      (value) => {
        delete value["admin-pages-page"]!.plannedShapeId;
        value["admin-pages-page"]!.wrongKey = "admin-pages-page";
      },
      (value) => {
        delete value["admin-pages-page"]!.plannedShapeId;
      },
      (value) => {
        value["admin-pages-page"]!.plannedShapeId = undefined;
      },
    ];
    for (const mutate of shapeCases) {
      const shapes = shapesClone();
      mutate(shapes);
      assertProjectionAndShapes(projectionClone(), shapes);
    }
  });

  it("pins the TASK489 safe projection, source_run_id owner identity, and deferred boundary", () => {
    const forbiddenProjectionFields = [
      "actor_id",
      "owner_run_id",
      "options",
      "summary",
      "error",
      "before_snapshot",
      "after_snapshot",
      "rollback_action",
      "envelope",
    ];
    const params = {
      limitPlusOne: 101,
      cursorCreatedAt: "2026-01-01T00:00:00.000Z",
      cursorId: "task489-cursor",
      kitId: "task489-kit",
      packageKey: "task489-kit",
      sourceRunId: "task489-run",
      limit: 999_999,
      itemLimit: 999_999,
      runId: "task489-run",
      actorId: "task489-actor",
    };
    for (const companionId of TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.companionIds) {
      for (const statement of Object.values(
        TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES[companionId].statements
      )) {
        const projection = statement.projection.toLowerCase();
        for (const field of forbiddenProjectionFields) expect(projection).not.toContain(field);
        const query = statement.build(params);
        expect(query.bound).toBe(statement.bound);
        expect(query.sql).toMatch(/\blimit\s+\$\d+$/iu);
        expect(query.sql).not.toMatch(/\blimit\s+\d+$/iu);
        if (
          statement.companionId === "task489-runs-all-keyset" ||
          statement.companionId === "task489-runs-package-keyset"
        ) {
          invalid(() => statement.build({ ...params, limitPlusOne: 1 }));
          expect(query.values).toContain(101);
          expect(query.sql).toContain("created_at");
          expect(query.sql).toContain("id");
          expect(query.sql).toContain("< (");
          expect(
            statement.predicate.includes("lateral newer-apply and rollback-relation probes")
          ).toBe(statement.logicalCaseId === "relation-heavy-101");
          if (statement.logicalCaseId === "relation-heavy-101")
            expect(query.sql.toLowerCase()).toContain("join lateral");
        } else {
          expect(statement.build({ ...params, limit: 1, itemLimit: 1 })).toEqual(query);
        }
        const sql = query.sql.toLowerCase();
        const selectPart = sql.slice(sql.indexOf("select ") + 7, sql.indexOf(" from "));
        for (const field of forbiddenProjectionFields) expect(selectPart).not.toContain(field);
        expect(sql).not.toContain("source_id");
      }
    }
    invalid(() =>
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES["task489-runs-all-keyset"].statements[
        "task489-runs-all-keyset/default"
      ]!.build({ ...params, cursorId: undefined })
    );
    invalid(() =>
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES["task489-runs-all-keyset"].statements[
        "task489-runs-all-keyset/default"
      ]!.build({ ...params, limitPlusOne: 102 })
    );
    expect(
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES.filter(
        (logicalCase) => logicalCase.logicalCaseId === "relation-heavy-101"
      )
    ).toHaveLength(2);
    const owner =
      TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES["task489-active-starter-owner"].statements[
        "task489-active-starter-owner/active-owner"
      ]!;
    expect(owner.projection).toBe("package_key,source_run_id,released_at");
    expect(owner.predicate).toContain("source_run_id");
    const ownerQuery = owner.build(params);
    expect(ownerQuery.sql).toContain("source_run_id");
    expect(ownerQuery.sql).toContain("actor_id");
    expect(ownerQuery.sql).not.toContain("owner_run_id");
    expect(ownerQuery.values).toEqual(["task489-kit", "task489-actor", 2]);

    const deferred = TASK551_SCENARIOS.find((scenario) => scenario.id === "task489-predecessor")!;
    expect(TASK551_POSTGRES_REFERENCE_EXECUTOR_REGISTRY[deferred.id]).toBeUndefined();
    invalid(() =>
      resolveTask551ExecutableScenarioSelector(
        { kind: "scenario", id: deferred.id },
        TASK551_SCENARIOS
      )
    );
  });

  it("revalidates the transport target before loading or constructing postgres", async () => {
    const validTarget = {
      url: "postgres://fixture_user:fixture_password@127.0.0.1/coderso02?sslmode=require",
      expectedDatabaseName: "coderso02" as const,
      sentinel: "s".repeat(32),
    };
    const wrongPath = { ...validTarget, url: validTarget.url.replace("/coderso02", "/other") };
    const wrongName = { ...validTarget, expectedDatabaseName: "other" };
    const extraKey = { ...validTarget, extra: "rejected" };
    const nonEnumerable = { ...validTarget };
    Object.defineProperty(nonEnumerable, "url", { value: validTarget.url, enumerable: false });
    const accessor = { ...validTarget };
    Object.defineProperty(accessor, "url", { get: () => validTarget.url, enumerable: true });
    const symbolKey = { ...validTarget, [Symbol("target")]: "rejected" };
    let loaderCalls = 0;
    let factoryCalls = 0;
    const dependencies = {
      loadPostgresModule: async () => {
        loaderCalls += 1;
        return {
          default: () => {
            factoryCalls += 1;
            throw new Error("factory must not run");
          },
        };
      },
    };
    for (const candidate of [wrongPath, wrongName, extraKey, nonEnumerable, accessor, symbolKey]) {
      await expect(
        openTask551PostgresTransport(candidate as never, "small", dependencies)
      ).rejects.toThrow("database_baseline_invalid");
    }
    expect(loaderCalls).toBe(0);
    expect(factoryCalls).toBe(0);
  });

  it("round-trips the TASK-489 predecessor receipt and rejects parser, serializer, and cardinality negatives", () => {
    const receipt = validTask489Receipt();
    const serialized = serializeTask489PredecessorReceiptV1(receipt);
    expect(parseTask489PredecessorReceiptV1(serialized)).toEqual(receipt);
    expect(receipt.noLeak).toBe(true);
    expect(Reflect.ownKeys(JSON.parse(new TextDecoder().decode(serialized)))).toEqual([
      "schema",
      "pass",
      "noLeak",
      "companionIds",
      "fixtureCounts",
      "logicalCases",
      "statementReceipts",
    ]);

    const absentNoLeak = cloneJson(receipt) as unknown as Record<string, unknown>;
    delete absentNoLeak.noLeak;
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(absentNoLeak)));
    invalid(() => serializeTask489PredecessorReceiptV1(absentNoLeak as never));
    const falseNoLeak = { ...receipt, noLeak: false };
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(falseNoLeak)));
    const nonBooleanNoLeak = { ...receipt, noLeak: "true" };
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(nonBooleanNoLeak)));
    const misplacedNoLeak = cloneJson(receipt) as unknown as Record<string, unknown>;
    delete misplacedNoLeak.noLeak;
    (misplacedNoLeak.statementReceipts as Array<Record<string, unknown>>)[0]!.noLeak = true;
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(misplacedNoLeak)));
    const unknownNoLeakField = { ...receipt, noLeak: true, noLeakProof: true };
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(unknownNoLeakField)));

    invalid(() => parseTask489PredecessorReceiptV1(serialized.slice(0, -1)));
    invalid(() => parseTask489PredecessorReceiptV1(new Uint8Array([...serialized, 10])));
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes("not-json")));
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes({ ...receipt, unknown: true })));

    const missing = cloneJson(receipt) as Record<string, unknown>;
    delete missing.logicalCases;
    invalid(() => serializeTask489PredecessorReceiptV1(missing as never));

    const wrongSchema = { ...receipt, schema: "wrong" };
    invalid(() => serializeTask489PredecessorReceiptV1(wrongSchema as never));

    const wrongCompanionOrder = cloneJson(receipt) as unknown as Record<string, unknown>;
    wrongCompanionOrder.companionIds = [...receipt.companionIds].reverse();
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(wrongCompanionOrder)));

    for (const field of ["logicalCases", "statementReceipts"] as const) {
      const short = cloneJson(receipt) as unknown as Record<string, unknown>;
      (short[field] as unknown[]).pop();
      invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(short)));
    }

    const shortProfiles = cloneJson(receipt) as unknown as Record<string, unknown>;
    const firstStatement = (shortProfiles.statementReceipts as Array<Record<string, unknown>>)[0]!;
    (firstStatement.profileResults as unknown[]).pop();
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(shortProfiles)));

    const wrongProfile = cloneJson(receipt) as unknown as Record<string, unknown>;
    const firstResult = (
      (wrongProfile.statementReceipts as Array<Record<string, unknown>>)[0]!
        .profileResults as Array<Record<string, unknown>>
    )[0]!;
    firstResult.profile = "large";
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(wrongProfile)));

    const invalidMetric = cloneJson(receipt) as unknown as Record<string, unknown>;
    const metricResult = (
      (invalidMetric.statementReceipts as Array<Record<string, unknown>>)[0]!
        .profileResults as Array<Record<string, unknown>>
    )[0]!;
    metricResult.queryCount = 2;
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(invalidMetric)));

    const overBudget = cloneJson(receipt) as unknown as Record<string, unknown>;
    const overBudgetResult = (
      (overBudget.statementReceipts as Array<Record<string, unknown>>)[0]!.profileResults as Array<
        Record<string, unknown>
      >
    )[0]!;
    overBudgetResult.rowsReturned = 102;
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(overBudget)));

    const invalidDigest = cloneJson(receipt) as unknown as Record<string, unknown>;
    const digestResult = (
      (invalidDigest.statementReceipts as Array<Record<string, unknown>>)[0]!
        .profileResults as Array<Record<string, unknown>>
    )[0]!;
    digestResult.planDigest = "A".repeat(64);
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(invalidDigest)));

    const zeroDigest = cloneJson(receipt) as unknown as Record<string, unknown>;
    const zeroDigestResult = (
      (zeroDigest.statementReceipts as Array<Record<string, unknown>>)[0]!.profileResults as Array<
        Record<string, unknown>
      >
    )[0]!;
    zeroDigestResult.planDigest = "0".repeat(64);
    invalid(() => parseTask489PredecessorReceiptV1(task489Bytes(zeroDigest)));
  });
});
