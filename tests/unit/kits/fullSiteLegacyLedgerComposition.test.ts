import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  buildFullSiteRollbackActionV1,
  toSafeFullSiteErrorCode,
} from "../../../core/services/kits/fullSiteInstallTypes";
const readSource = (relativePath: string) =>
  Bun.file(fileURLToPath(new URL(relativePath, import.meta.url))).text();
const DIRECT_SELECTION_MEMBER =
  /^\s*([A-Za-z_$][\w$]*):\s*([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*),\s*$/u;
const extractUniqueBody = (source: string, prefix: string, suffix: string): string => {
  const start = source.indexOf(prefix);
  if (start < 0 || source.indexOf(prefix, start + prefix.length) >= 0) {
    throw new Error("selection_boundary_invalid");
  }
  const bodyStart = start + prefix.length;
  const end = source.indexOf(suffix, bodyStart);
  if (end < bodyStart) throw new Error("selection_boundary_invalid");
  return source.slice(bodyStart, end);
};
const assertDirectSelectionBody = (body: string, expected: readonly string[]): void => {
  const lines = body.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length !== expected.length) throw new Error("selection_member_count_invalid");
  lines.forEach((line, index) => {
    const match = DIRECT_SELECTION_MEMBER.exec(line);
    if (!match) throw new Error("selection_member_invalid");
    const member = `${match[1]}:${match[2]}.${match[3]}`;
    if (member !== expected[index]) throw new Error("selection_member_unexpected");
  });
};
type DbModule = typeof import("../../../core/db/client");
type PersistenceModule = typeof import("../../../core/services/kits/legacyInstallRunPersistence");
type SchemaModule = typeof import("../../../core/db/schema");
type DbHarness = {
  db: DbModule["db"];
  buildManagedResourceEvidenceQuery: PersistenceModule["buildManagedResourceEvidenceQuery"];
  createLegacyInstallLedger: PersistenceModule["createLegacyInstallLedger"];
  getSolutionKitInstallRun: PersistenceModule["getSolutionKitInstallRun"];
  runFullSiteInstallLockLifecycle: PersistenceModule["runFullSiteInstallLockLifecycle"];
  withFullSiteInstallLocks: PersistenceModule["withFullSiteInstallLocks"];
  solutionKitInstallItems: SchemaModule["solutionKitInstallItems"];
  solutionKitInstallRuns: SchemaModule["solutionKitInstallRuns"];
};
type DbHarnessStages<T> = readonly [
  load: () => Promise<T>,
  probeConnection: (loaded: T) => Promise<void>,
  probeRunSchema: (loaded: T) => Promise<void>,
  probeItemSchema: (loaded: T) => Promise<void>,
];
const DB_HARNESS_FAILURE = "full_site_legacy_ledger_db_harness_failed";
const createDbHarnessStages = <T>(...stages: DbHarnessStages<T>): DbHarnessStages<T> => stages;
const isDatabaseUrlConfigured = (value: string | undefined): boolean => value !== undefined;
const createDbHarnessFailure = (): Error => {
  const error = new Error(DB_HARNESS_FAILURE);
  for (const key of Reflect.ownKeys(error)) {
    if (key !== "message" && key !== "stack") Reflect.deleteProperty(error, key);
  }
  return error;
};
const loadDbHarness = async (): Promise<DbHarness> => {
  const [dbModule, persistence, schemaModule] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/services/kits/legacyInstallRunPersistence"),
    import("../../../core/db/schema"),
  ]);
  return {
    db: dbModule.db,
    buildManagedResourceEvidenceQuery: persistence.buildManagedResourceEvidenceQuery,
    createLegacyInstallLedger: persistence.createLegacyInstallLedger,
    getSolutionKitInstallRun: persistence.getSolutionKitInstallRun,
    runFullSiteInstallLockLifecycle: persistence.runFullSiteInstallLockLifecycle,
    withFullSiteInstallLocks: persistence.withFullSiteInstallLocks,
    solutionKitInstallItems: schemaModule.solutionKitInstallItems,
    solutionKitInstallRuns: schemaModule.solutionKitInstallRuns,
  };
};
const initializeDbHarness = async <T>(stages: DbHarnessStages<T>): Promise<T> => {
  try {
    const loaded = await stages[0]();
    await stages[1](loaded);
    await stages[2](loaded);
    await stages[3](loaded);
    return loaded;
  } catch {
    throw createDbHarnessFailure();
  }
};
const DB_HARNESS_STAGES = createDbHarnessStages<DbHarness>(
  loadDbHarness,
  async ({ db: harnessDb }) => {
    await harnessDb.execute(sql`select 1`);
  },
  async ({ db: harnessDb, solutionKitInstallRuns: runs }) => {
    await harnessDb
      .select({
        id: runs.id,
        kitId: runs.kitId,
        mode: runs.mode,
        status: runs.status,
        actorId: runs.actorId,
        rollbackOfRunId: runs.rollbackOfRunId,
        options: runs.options,
        summary: runs.summary,
        error: runs.error,
        createdAt: runs.createdAt,
        updatedAt: runs.updatedAt,
        finishedAt: runs.finishedAt,
      })
      .from(runs)
      .limit(0);
  },
  async ({ db: harnessDb, solutionKitInstallItems: items }) => {
    await harnessDb
      .select({
        id: items.id,
        runId: items.runId,
        position: items.position,
        resourceType: items.resourceType,
        resourceKey: items.resourceKey,
        operation: items.operation,
        status: items.status,
        beforeSnapshot: items.beforeSnapshot,
        afterSnapshot: items.afterSnapshot,
        rollbackAction: items.rollbackAction,
        error: items.error,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
      })
      .from(items)
      .limit(0);
  }
);
const databaseUrlConfigured = isDatabaseUrlConfigured(process.env.DATABASE_URL);
const dbHarness = databaseUrlConfigured ? await initializeDbHarness(DB_HARNESS_STAGES) : null;
const testIfDb = databaseUrlConfigured ? test : test.skip;
const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};
const pollUntil = async <T>(read: () => Promise<T | null>): Promise<T> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = await read();
    if (value !== null) return value;
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("db_lock_state_timeout");
};
test("catalog kit installer delegates run-table work to the shared ledger port", async () => {
  const source = await readSource("../../../core/services/kits/kitInstaller.ts");
  expect(source).not.toContain('from "drizzle-orm"');
  expect(source).not.toContain('from "../../db/client"');
  expect(source).not.toContain('from "../../db/schema"');
  expect(source).not.toContain("solutionKitInstallRuns");
  expect(source).toContain("defaultLegacyInstallLedger.patchRunMetadata");
  expect(source).toContain("defaultLegacyInstallLedger.findLatestSuccessfulApplyRun");
});
test("the existing shared ledger adapter owns both catalog composition capabilities", async () => {
  const [typesSource, persistenceSource, facadeSource] = await Promise.all([
    readSource("../../../core/services/kits/fullSiteInstallTypes.ts"),
    readSource("../../../core/services/kits/legacyInstallRunPersistence.ts"),
    readSource("../../../core/services/kits/solutionKitsInstallService.ts"),
  ]);
  expect(typesSource).toContain("patchRunMetadata?");
  expect(typesSource).toContain("findLatestSuccessfulApplyRun?");
  expect(persistenceSource).toContain("async patchRunMetadata(input)");
  expect(persistenceSource).toContain("async findLatestSuccessfulApplyRun(packageKey)");
  expect(persistenceSource).toMatch(
    /orderBy\(desc\(solutionKitInstallRuns\.createdAt\),\s*desc\(solutionKitInstallRuns\.id\)\)/
  );
  expect(facadeSource).toContain("defaultLegacyInstallLedger");
  expect(facadeSource).toContain("FullSiteInstallLedgerPort");
});
test("L01-owned files do not depend on the future form write helper", async () => {
  const futureHelper = ["normalizeFormActions", "ForWrite"].join("");
  const sources = await Promise.all(
    [
      "../../../core/services/kits/fullSiteInstallTypes.ts",
      "../../../core/services/kits/fullSiteInstall/currentResourceResolver.ts",
      "../../../core/services/kits/legacyInstallRunPersistence.ts",
      "../../vitest/kits/full-site-install-planner.test.ts",
      "./fullSiteLegacyLedgerComposition.test.ts",
      "../../integration/kits/fullSiteManagedOwnershipDb.test.ts",
      "../../integration/kits/fullSiteManagedEvidenceExplainDb.test.ts",
    ].map(readSource)
  );
  for (const source of sources) expect(source).not.toContain(futureHelper);
});
test("current-resource resolver and DB harness use bounded exhaustive direct projections", async () => {
  const [source, ledgerSource] = await Promise.all([
    readSource("../../../core/services/kits/fullSiteInstall/currentResourceResolver.ts"),
    readSource("./fullSiteLegacyLedgerComposition.test.ts"),
  ]);
  const selections: Record<string, string> = {
    CONTENT_TYPE_PLANNER_EQUALITY_SELECTION:
      "name:contentTypes.name slug:contentTypes.slug schema:contentTypes.schema status:contentTypes.status config:contentTypes.config",
    FORM_PLANNER_EQUALITY_SELECTION:
      "name:forms.name slug:forms.slug status:forms.status description:forms.description successMessage:forms.successMessage successRedirectUrl:forms.successRedirectUrl submissionAccess:forms.submissionAccess settings:forms.settings",
    FORM_FIELD_PLANNER_EQUALITY_SELECTION:
      "id:formFields.id type:formFields.type label:formFields.label name:formFields.name required:formFields.required settings:formFields.settings orderIndex:formFields.orderIndex",
    FORM_ACTION_PLANNER_EQUALITY_SELECTION:
      "id:formActions.id type:formActions.type label:formActions.label enabled:formActions.enabled continueOnError:formActions.continueOnError condition:formActions.condition config:formActions.config orderIndex:formActions.orderIndex",
    PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION:
      "name:pageTemplates.name slug:pageTemplates.slug description:pageTemplates.description category:pageTemplates.category status:pageTemplates.status document:pageTemplates.document",
    LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION:
      "name:listingTemplates.name slug:listingTemplates.slug description:listingTemplates.description layout:listingTemplates.layout config:listingTemplates.config",
    CONTENT_ENTRY_ID_SELECTION: "id:contentEntries.id",
    CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION:
      "contentTypeId:contentEntries.typeId title:contentEntries.title slug:contentEntries.slug status:contentEntries.status data:contentEntries.data",
    LISTING_QUERY_PLANNER_EQUALITY_SELECTION:
      "name:listingQueries.name description:listingQueries.description query:listingQueries.query",
    DETAIL_PAGE_PLANNER_EQUALITY_SELECTION:
      "name:detailPageDocuments.name contentTypeId:detailPageDocuments.contentTypeId currentDocument:detailPageDocuments.currentDocument",
    PAGE_PLANNER_EQUALITY_SELECTION:
      "slug:pages.slug title:pages.title status:pages.status currentData:pages.currentData",
    MENU_PLANNER_EQUALITY_SELECTION:
      "name:menus.name location:menus.location status:menus.status settings:menus.settings",
    MENU_ITEM_PLANNER_EQUALITY_SELECTION:
      "id:menuItems.id label:menuItems.label href:menuItems.href pageId:menuItems.pageId parentId:menuItems.parentId orderIndex:menuItems.orderIndex settings:menuItems.settings",
  };
  for (const [name, expectedFields] of Object.entries(selections)) {
    assertDirectSelectionBody(
      extractUniqueBody(source, `const ${name} = {`, "\n} as const;"),
      expectedFields.split(" ")
    );
    const expectedUses = name === "CONTENT_ENTRY_ID_SELECTION" ? 2 : 1;
    expect(source.match(new RegExp(`\\.select\\(${name}\\)`, "g")) ?? []).toHaveLength(
      expectedUses
    );
  }
  expect(source.match(/\.from\(contentEntries\)/g) ?? []).toHaveLength(3);
  expect(source).not.toMatch(/\.select\(\s*\)/);
  for (const forbidden of [
    "contentEntries.accessPassword",
    "pages.publishedData",
    "detailPageDocuments.publishedDocument",
  ])
    expect(source).not.toContain(forbidden);
  const runSelection =
    "id:runs.id kitId:runs.kitId mode:runs.mode status:runs.status actorId:runs.actorId rollbackOfRunId:runs.rollbackOfRunId options:runs.options summary:runs.summary error:runs.error createdAt:runs.createdAt updatedAt:runs.updatedAt finishedAt:runs.finishedAt";
  const itemSelection =
    "id:items.id runId:items.runId position:items.position resourceType:items.resourceType resourceKey:items.resourceKey operation:items.operation status:items.status beforeSnapshot:items.beforeSnapshot afterSnapshot:items.afterSnapshot rollbackAction:items.rollbackAction error:items.error createdAt:items.createdAt updatedAt:items.updatedAt";
  assertDirectSelectionBody(
    extractUniqueBody(
      ledgerSource,
      "async ({ db: harnessDb, solutionKitInstallRuns: runs }) => {\n    await harnessDb\n      .select({",
      "\n      })\n      .from(runs)\n      .limit(0);"
    ),
    runSelection.split(" ")
  );
  assertDirectSelectionBody(
    extractUniqueBody(
      ledgerSource,
      "async ({ db: harnessDb, solutionKitInstallItems: items }) => {\n    await harnessDb\n      .select({",
      "\n      })\n      .from(items)\n      .limit(0);"
    ),
    itemSelection.split(" ")
  );
  expect(ledgerSource).toContain("const DB_HARNESS_STAGES = createDbHarnessStages<DbHarness>(");
  expect(DB_HARNESS_STAGES).toHaveLength(4);
  for (const malicious of ["  ...table,", "  [key]: table.id,"]) {
    expect(() => assertDirectSelectionBody(malicious, ["id:table.id"])).toThrow(
      "selection_member_invalid"
    );
  }
  expect(source).toContain("const FORM_FIELD_READ_CAP = FORM_FIELD_SCHEMA_LIMITS.fields;");
  expect(source).toContain(
    "const RESOURCE_CHILD_READ_CAP = PACKAGE_LIMITS.resourcesPerCollection;"
  );
  const nativeStart = source.indexOf("const readNativeDesired");
  const formStart = source.indexOf('  if (kind === "form") {', nativeStart);
  const formEnd = source.indexOf('  if (kind === "page_template") {', formStart);
  const menuStart = source.indexOf('  if (kind === "menu") {', formEnd);
  const menuEnd = source.indexOf(
    '  throw new Error("site_package_resource_kind_invalid")',
    menuStart
  );
  const formBranch = source.slice(formStart, formEnd);
  const menuBranch = source.slice(menuStart, menuEnd);
  expect(formBranch).toContain(
    ".orderBy(asc(formFields.orderIndex), asc(formFields.id))\n        .limit(FORM_FIELD_READ_CAP + 1)"
  );
  expect(formBranch).toContain(
    ".orderBy(asc(formActions.orderIndex), asc(formActions.id))\n        .limit(RESOURCE_CHILD_READ_CAP + 1)"
  );
  const formGuard = formBranch.indexOf(
    "if (fields.length > FORM_FIELD_READ_CAP || actions.length > RESOURCE_CHILD_READ_CAP)"
  );
  expect(formGuard).toBeGreaterThan(formBranch.lastIndexOf(".limit("));
  expect(formBranch.indexOf("if (!row) return null")).toBeGreaterThan(formGuard);
  expect(formBranch.indexOf("normalizeFormFields")).toBeGreaterThan(formGuard);
  expect(formBranch.indexOf("projectDesired")).toBeGreaterThan(formGuard);
  expect(menuBranch).toContain(
    ".orderBy(asc(menuItems.orderIndex), asc(menuItems.id))\n        .limit(RESOURCE_CHILD_READ_CAP + 1)"
  );
  const menuGuard = menuBranch.indexOf("if (itemRows.length > RESOURCE_CHILD_READ_CAP)");
  expect(menuGuard).toBeGreaterThan(menuBranch.lastIndexOf(".limit("));
  expect(menuBranch.indexOf("if (!row) return null")).toBeGreaterThan(menuGuard);
  expect(menuBranch.indexOf("projectDesired")).toBeGreaterThan(menuGuard);
  expect(formBranch + menuBranch).not.toContain(".slice(");
});
test("metadata diagnostics preserve reviewed counts and redact arbitrary messages", () => {
  expect(
    toSafeFullSiteErrorCode("template_failed_operations:2", "solution_kit_install_failed")
  ).toBe("template_failed_operations:2");
  expect(
    toSafeFullSiteErrorCode("postgres://secret@example.invalid", "solution_kit_install_failed")
  ).toBe("solution_kit_install_failed");
  for (const code of [
    "site_package_recovery_missing_intended_id",
    "site_package_rollback_dependency_invalid",
    "site_package_rollback_dependency_blocked",
    "site_package_rollback_ledger_failed",
    "page_revision_snapshot_too_large",
    "entry_revision_snapshot_too_large",
    "detail_page_revision_snapshot_too_large",
  ]) {
    expect(toSafeFullSiteErrorCode(code)).toBe(code);
  }
});
test("metadata diagnostics are total for throwing getters and hostile proxies", () => {
  const throwingCode = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(throwingCode, "code", {
    get: () => {
      throw new Error("code_getter_failed");
    },
  });
  const throwingGetTrap = new Proxy(
    {},
    {
      get: () => {
        throw new Error("proxy_get_failed");
      },
    }
  );
  const throwingPrototypeTrap = new Proxy(
    {},
    {
      get: () => undefined,
      getPrototypeOf: () => {
        throw new Error("proxy_prototype_failed");
      },
    }
  );
  const throwingMessage = new Error("message");
  Object.defineProperty(throwingMessage, "message", {
    get: () => {
      throw new Error("message_getter_failed");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  for (const hostile of [
    throwingCode,
    throwingGetTrap,
    throwingPrototypeTrap,
    throwingMessage,
    revoked.proxy,
  ]) {
    expect(toSafeFullSiteErrorCode(hostile, "solution_kit_install_failed")).toBe(
      "solution_kit_install_failed"
    );
  }
});
test("DB harness configuration skips only an undefined URL", () => {
  expect(isDatabaseUrlConfigured(undefined)).toBe(false);
  expect(isDatabaseUrlConfigured("")).toBe(true);
  expect(isDatabaseUrlConfigured("postgres://configured")).toBe(true);
});
for (const [label, failedStage] of [
  ["dependency import", 0],
  ["connection", 1],
  ["run schema", 2],
  ["install-item schema", 3],
] as const) {
  test(`configured DB ${label} failure exposes only the sanitized harness code`, async () => {
    const sentinel = new Error(`postgres://user:secret@example.invalid/${label}`);
    const traces: number[][] = [];
    const errors: Error[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const calls: number[] = [];
      const fixture = { loaded: true };
      const runStage = async (index: number): Promise<void> => {
        calls.push(index);
        if (failedStage === index) throw sentinel;
      };
      const stages = createDbHarnessStages(
        async () => {
          await runStage(0);
          return fixture;
        },
        async () => runStage(1),
        async () => runStage(2),
        async () => runStage(3)
      );
      const error = await initializeDbHarness(stages).then(
        () => null,
        (failure: unknown) => failure
      );
      if (!(error instanceof Error)) throw new Error("sanitized_harness_error_missing");
      traces.push(calls);
      errors.push(error);
    }
    const expectedTrace = Array.from({ length: failedStage + 1 }, (_, index) => index);
    expect(traces).toEqual([expectedTrace, expectedTrace]);
    expect(errors[0]).not.toBe(errors[1]);
    for (const error of errors) {
      expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
      expect(error).not.toBe(sentinel);
      expect(error.message).toBe(DB_HARNESS_FAILURE);
      expect(Reflect.ownKeys(error).sort()).toEqual(["message", "stack"]);
      const observable = [error.message, error.stack, String(error), JSON.stringify(error)].join(
        " "
      );
      for (const forbidden of [sentinel.message, "postgres://", "secret", "driver", "schema"]) {
        expect(observable).not.toContain(forbidden);
      }
      expect(Object.prototype.hasOwnProperty.call(error, "cause")).toBe(false);
    }
  });
}
testIfDb("managed evidence uses one bounded executable SELECT", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  const source = await readSource("../../../core/services/kits/legacyInstallRunPersistence.ts");
  const start = source.indexOf("export const findManagedResourceEvidence");
  const end = source.indexOf("\nconst toFullSiteRun", start);
  const implementation = source.slice(start, end);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  expect(implementation.match(/buildManagedResourceEvidenceQuery/g)).toHaveLength(1);
  expect(implementation).toMatch(
    /const \[row\] = await buildManagedResourceEvidenceQuery\(input\)/
  );
  const query = harness.buildManagedResourceEvidenceQuery({
    packageKey: `query-shape-${randomUUID()}`,
    kind: "form",
    key: "bounded-evidence",
  });
  const compiled = query.toSQL();
  const normalized = compiled.sql.toLowerCase().replace(/\s+/g, " ");
  expect(normalized.split(";").filter(Boolean)).toHaveLength(1);
  expect(normalized.match(/not exists/g)).toHaveLength(1);
  expect(normalized.match(/\bexists\b/g)).toHaveLength(2);
  expect(normalized.match(/after_snapshot/g)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_item_id"/g)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_item_created_at"/g)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_run_id"/g)).toHaveLength(1);
  expect(normalized).not.toMatch(/select "[^"]+"\."id"(?:,| from)/);
  expect(normalized).toContain(
    'from "solution_kit_install_runs" "managed_candidate_run" inner join lateral'
  );
  expect(normalized).not.toContain(
    'from "solution_kit_install_items" "managed_candidate_item" inner join "solution_kit_install_runs"'
  );
  expect(normalized).toContain('"managed_candidate_item"."run_id" = "managed_candidate_run"."id"');
  expect(normalized).toContain('"managed_candidate_item"."resource_type" =');
  expect(normalized).toContain('"managed_candidate_item"."resource_key" =');
  expect(normalized).toContain('"managed_candidate_item"."status" =');
  expect(normalized).toContain('"managed_candidate_item"."operation" in');
  expect(normalized).toContain('"managed_rollback_run"."rollback_of_run_id" =');
  expect(normalized).toContain('"managed_rollback_run"."mode" =');
  expect(normalized).toContain('"managed_rollback_run"."status" =');
  expect(normalized).toContain(" or exists (");
  expect(normalized).toContain('"managed_rollback_item"."run_id" = "managed_rollback_run"."id"');
  expect(normalized).toContain('"managed_rollback_item"."status" =');
  expect(normalized).toContain(
    'select "candidate_run_id", "solution_kit_install_items"."after_snapshot"'
  );
  expect(normalized).toContain('"solution_kit_install_items"."id" = "candidate_item_id"');
  const lateralStart = normalized.indexOf(" inner join lateral ");
  const lateralEnd = normalized.indexOf(') "managed_candidate_item_for_run" on true');
  const itemOrderStart = normalized.indexOf(" order by ", lateralStart);
  const itemLimitStart = normalized.indexOf(" limit ", itemOrderStart);
  const createdAtPosition = normalized.indexOf('"candidate_item_created_at" desc', itemOrderStart);
  const itemIdPosition = normalized.indexOf('"candidate_item_id" desc', itemOrderStart);
  expect(itemOrderStart).toBeGreaterThan(lateralStart);
  expect(createdAtPosition).toBeGreaterThan(itemOrderStart);
  expect(itemIdPosition).toBeGreaterThan(createdAtPosition);
  expect(itemLimitStart).toBeGreaterThan(itemIdPosition);
  expect(lateralEnd).toBeGreaterThan(itemLimitStart);
  const orderStart = normalized.indexOf(" order by ", lateralEnd);
  const limitStart = normalized.indexOf(" limit ", orderStart);
  const orderedTerms = [
    'managed_candidate_run"."created_at" desc',
    'managed_candidate_run"."updated_at" desc',
    '"candidate_run_id" desc',
    '"candidate_item_created_at" desc',
    '"candidate_item_id" desc',
  ];
  let priorPosition = orderStart;
  for (const term of orderedTerms) {
    const position = normalized.indexOf(term, priorPosition + 1);
    expect(position).toBeGreaterThan(priorPosition);
    priorPosition = position;
  }
  expect(limitStart).toBeGreaterThan(priorPosition);
  const limitPlaceholders = [...normalized.matchAll(/ limit \$(\d+)/g)];
  expect(limitPlaceholders).toHaveLength(2);
  for (const match of limitPlaceholders) {
    expect(compiled.params[Number(match[1]) - 1]).toBe(1);
  }
  expect(await query).toEqual([]);
});
testIfDb(
  "lock lifecycle validates both unlock acknowledgements and completes reverse cleanup",
  async () => {
    const harness = dbHarness;
    if (!harness) throw new Error("db_test_unavailable");
    for (const failedUnlock of ["package", "global"] as const) {
      const events: string[] = [];
      const result = harness.runFullSiteInstallLockLifecycle(
        {
          reserveSession: async () => {
            events.push("reserve");
            return {
              acquireGlobal: async () => {
                events.push("acquire-global");
              },
              acquirePackage: async () => {
                events.push("acquire-package");
              },
              releasePackage: async () => {
                events.push("release-package");
                return failedUnlock !== "package";
              },
              releaseGlobal: async () => {
                events.push("release-global");
                return failedUnlock !== "global";
              },
              releaseReservation: () => {
                events.push("release-reservation");
              },
            };
          },
          endClient: async () => {
            events.push("end-client");
          },
        },
        async () => {
          events.push("execute");
          return "done";
        }
      );
      await expect(result).rejects.toThrow("site_package_lock_release_failed");
      expect(events).toEqual([
        "reserve",
        "acquire-global",
        "acquire-package",
        "execute",
        "release-package",
        "release-global",
        "release-reservation",
        "end-client",
      ]);
    }
  }
);
testIfDb("lock lifecycle cleans up every acquisition boundary", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  for (const failedStep of ["reserve", "global", "package", null] as const) {
    const events: string[] = [];
    const failure = failedStep ? new Error(`${failedStep}_failed`) : null;
    const result = harness
      .runFullSiteInstallLockLifecycle(
        {
          reserveSession: async () => {
            events.push("reserve");
            if (failedStep === "reserve") throw failure;
            return {
              acquireGlobal: async () => {
                events.push("acquire-global");
                if (failedStep === "global") throw failure;
              },
              acquirePackage: async () => {
                events.push("acquire-package");
                if (failedStep === "package") throw failure;
              },
              releasePackage: async () => {
                events.push("release-package");
                return true;
              },
              releaseGlobal: async () => {
                events.push("release-global");
                return true;
              },
              releaseReservation: () => {
                events.push("release-reservation");
              },
            };
          },
          endClient: async () => {
            events.push("end-client");
          },
        },
        async () => {
          events.push("execute");
          return "done";
        }
      )
      .then(
        (value) => ({ ok: true as const, value, error: null }),
        (error: unknown) => ({ ok: false as const, value: null, error })
      );
    const outcome = await result;
    if (failure) {
      expect(outcome.ok).toBe(false);
      expect(outcome.error).toBe(failure);
    } else {
      expect(outcome).toEqual({ ok: true, value: "done", error: null });
    }
    expect(events).toEqual(
      failedStep === "reserve"
        ? ["reserve", "end-client"]
        : failedStep === "global"
          ? ["reserve", "acquire-global", "release-reservation", "end-client"]
          : failedStep === "package"
            ? [
                "reserve",
                "acquire-global",
                "acquire-package",
                "release-global",
                "release-reservation",
                "end-client",
              ]
            : [
                "reserve",
                "acquire-global",
                "acquire-package",
                "execute",
                "release-package",
                "release-global",
                "release-reservation",
                "end-client",
              ]
    );
  }
});
testIfDb("callback errors take precedence without truncating lock cleanup", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  const events: string[] = [];
  const callbackError = new Error("callback_failed");
  const result = harness
    .runFullSiteInstallLockLifecycle(
      {
        reserveSession: async () => ({
          acquireGlobal: async () => {
            events.push("acquire-global");
          },
          acquirePackage: async () => {
            events.push("acquire-package");
          },
          releasePackage: async () => {
            events.push("release-package");
            return false;
          },
          releaseGlobal: async () => {
            events.push("release-global");
            return false;
          },
          releaseReservation: () => {
            events.push("release-reservation");
            throw new Error("reservation_release_failed");
          },
        }),
        endClient: async () => {
          events.push("end-client");
          throw new Error("client_end_failed");
        },
      },
      async () => {
        events.push("execute");
        throw callbackError;
      }
    )
    .then(
      () => ({ ok: true as const, error: null }),
      (error: unknown) => ({ ok: false as const, error })
    );
  const outcome = await result;
  expect(outcome.ok).toBe(false);
  expect(outcome.error).toBe(callbackError);
  expect(events).toEqual([
    "acquire-global",
    "acquire-package",
    "execute",
    "release-package",
    "release-global",
    "release-reservation",
    "end-client",
  ]);
});
testIfDb("shared ledger metadata patch persists JSON and redacts unsafe errors", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  const { solutionKitInstallRuns } = harness;
  const ledger = harness.createLegacyInstallLedger();
  const run = await ledger.createRun({
    packageKey: `ledger-patch-${randomUUID()}`,
    actorId: null,
    dryRun: false,
    options: { initial: true },
  });
  try {
    const patchRunMetadata = ledger.patchRunMetadata;
    if (!patchRunMetadata) throw new Error("ledger_patch_capability_missing");
    const patched = await patchRunMetadata({
      runId: run.id,
      status: "success",
      summary: { total: 2, success: 2 },
      error: "postgres://secret@example.invalid/database",
      options: { manifest: { key: "scoped" } },
    });
    const persisted = await harness.getSolutionKitInstallRun(run.id);
    expect(patched).toBe(true);
    expect(persisted).toMatchObject({
      id: run.id,
      status: "success",
      summary: { total: 2, success: 2 },
      error: "solution_kit_install_failed",
      options: { manifest: { key: "scoped" } },
    });
  } finally {
    await harness.db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, run.id));
  }
});
testIfDb(
  "shared ledger preserves omitted V1 evidence and honors an explicit null clear",
  async () => {
    const harness = dbHarness;
    if (!harness) throw new Error("db_test_unavailable");
    const { solutionKitInstallRuns } = harness;
    const ledger = harness.createLegacyInstallLedger();
    const run = await ledger.createRun({
      packageKey: `ledger-action-${randomUUID()}`,
      actorId: null,
      dryRun: false,
    });
    const rollbackAction = buildFullSiteRollbackActionV1({
      identity: "page:home",
      dependencies: ["form:contact"],
    });
    const base = {
      runId: run.id,
      position: 0,
      kind: "page" as const,
      key: "home",
      operation: "create" as const,
      beforeSnapshot: null,
      afterSnapshot: { id: randomUUID() },
      error: null,
    };
    try {
      await ledger.recordItem({ ...base, status: "planned", rollbackAction });
      await ledger.recordItem({ ...base, status: "success" });
      const [preserved] = await ledger.listItems(run.id);
      expect(preserved?.rollbackAction).toEqual(rollbackAction);
      await ledger.recordItem({ ...base, status: "success", rollbackAction: null });
      const [cleared] = await ledger.listItems(run.id);
      expect(cleared?.rollbackAction).toBeNull();
    } finally {
      await harness.db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, run.id));
    }
  }
);
testIfDb(
  "two-lock composition serializes both same and different package keys",
  async () => {
    const harness = dbHarness;
    const databaseUrl = process.env.DATABASE_URL;
    if (!harness || !databaseUrl) throw new Error("db_test_unavailable");
    const probe = postgres(databaseUrl, { max: 1 });
    try {
      for (const useDifferentPackage of [false, true]) {
        const scope = randomUUID();
        const firstKey = `lock-first-${scope}`;
        const secondKey = useDifferentPackage ? `lock-second-${scope}` : firstKey;
        const entered = createDeferred();
        const release = createDeferred();
        const events: string[] = [];
        let active = 0;
        let maxActive = 0;
        const first = harness.withFullSiteInstallLocks(firstKey, async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          events.push("first-enter");
          entered.resolve();
          await release.promise;
          events.push("first-exit");
          active -= 1;
        });
        await entered.promise;
        const second = harness.withFullSiteInstallLocks(secondKey, async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          events.push("second-enter");
          active -= 1;
          events.push("second-exit");
        });
        try {
          const lockState = await pollUntil(async () => {
            const [row] = await probe`
            select
              exists (
                select 1
                from pg_locks
                where locktype = 'advisory'
                  and classid = 548
                  and objid = 0
                  and not granted
              ) as waiting,
              exists (
                select 1
                from pg_locks global_lock
                inner join pg_locks package_lock on package_lock.pid = global_lock.pid
                where global_lock.locktype = 'advisory'
                  and global_lock.classid = 548
                  and global_lock.objid = 0
                  and global_lock.granted
                  and package_lock.locktype = 'advisory'
                  and package_lock.classid = 547
                  and package_lock.granted
              ) as same_session
          `;
            return row?.waiting === true ? row : null;
          });
          expect(lockState.same_session).toBe(true);
        } finally {
          release.resolve();
        }
        await Promise.all([first, second]);
        expect(maxActive).toBe(1);
        expect(events).toEqual(["first-enter", "first-exit", "second-enter", "second-exit"]);
      }
    } finally {
      await probe.end();
    }
  },
  360_000
);
testIfDb(
  "partial package-lock acquisition failure releases the global session lock",
  async () => {
    const harness = dbHarness;
    const databaseUrl = process.env.DATABASE_URL;
    if (!harness || !databaseUrl) throw new Error("db_test_unavailable");
    const holder = postgres(databaseUrl, { max: 1 });
    const probe = postgres(databaseUrl, { max: 1 });
    const packageKey = `partial-lock-${randomUUID()}`;
    let holderAcquired = false;
    let callbackCalled = false;
    try {
      await holder`select pg_advisory_lock(547, hashtext(${packageKey}))`;
      holderAcquired = true;
      const [holderRow] = await holder`select pg_backend_pid() as pid`;
      if (typeof holderRow?.pid !== "number") throw new Error("db_holder_pid_missing");
      const attempt = harness
        .withFullSiteInstallLocks(packageKey, async () => {
          callbackCalled = true;
        })
        .then(
          () => ({ ok: true as const, error: null }),
          (error: unknown) => ({ ok: false as const, error })
        );
      const waiterPid = await pollUntil(async () => {
        const [row] = await probe`
        select waiting.pid
        from pg_locks held
        inner join pg_locks waiting
          on waiting.locktype = held.locktype
          and waiting.database = held.database
          and waiting.classid = held.classid
          and waiting.objid = held.objid
          and waiting.objsubid = held.objsubid
        inner join pg_locks global_lock
          on global_lock.pid = waiting.pid
          and global_lock.locktype = 'advisory'
          and global_lock.classid = 548
          and global_lock.objid = 0
          and global_lock.granted
        where held.pid = ${holderRow.pid}
          and held.locktype = 'advisory'
          and held.classid = 547
          and held.granted
          and waiting.pid <> held.pid
          and not waiting.granted
        limit 1
      `;
        return typeof row?.pid === "number" ? row.pid : null;
      });
      const [cancelled] = await probe`select pg_cancel_backend(${waiterPid}) as cancelled`;
      expect(cancelled?.cancelled).toBe(true);
      const outcome = await attempt;
      expect(outcome.ok).toBe(false);
      expect(outcome.error).toBeTruthy();
      expect(callbackCalled).toBe(false);
      await holder`select pg_advisory_unlock(547, hashtext(${packageKey}))`;
      holderAcquired = false;
      await expect(
        harness.withFullSiteInstallLocks(`partial-followup-${randomUUID()}`, async () => "released")
      ).resolves.toBe("released");
    } finally {
      if (holderAcquired) {
        await holder`select pg_advisory_unlock(547, hashtext(${packageKey}))`;
      }
      await Promise.all([holder.end(), probe.end()]);
    }
  },
  360_000
);
testIfDb("lock entry rejects a non-canonical package key before invoking work", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  let called = false;
  await expect(
    harness.withFullSiteInstallLocks(" Not-Canonical ", async () => {
      called = true;
    })
  ).rejects.toThrow("site_package_invalid");
  expect(called).toBe(false);
});
testIfDb("shared ledger selects the greatest id when successful apply timestamps tie", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  const { solutionKitInstallRuns } = harness;
  const packageKey = `ledger-latest-${randomUUID()}`;
  const orderedIds = [randomUUID(), randomUUID()].sort();
  const lowerId = orderedIds[0]!;
  const higherId = orderedIds[1]!;
  const failedId = randomUUID();
  const runIds = [lowerId, higherId, failedId];
  const timestamp = new Date("2026-07-23T12:00:00.000Z");
  try {
    await harness.db.insert(solutionKitInstallRuns).values([
      {
        id: lowerId,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { candidate: "lower" },
        summary: {},
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        finishedAt: timestamp,
      },
      {
        id: higherId,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { candidate: "higher" },
        summary: {},
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        finishedAt: timestamp,
      },
      {
        id: failedId,
        kitId: packageKey,
        mode: "apply",
        status: "failed",
        actorId: null,
        rollbackOfRunId: null,
        options: { candidate: "failed" },
        summary: {},
        error: "solution_kit_install_failed",
        createdAt: new Date(timestamp.getTime() + 1_000),
        updatedAt: new Date(timestamp.getTime() + 1_000),
        finishedAt: new Date(timestamp.getTime() + 1_000),
      },
    ]);
    const ledger = harness.createLegacyInstallLedger();
    const findLatestSuccessfulApplyRun = ledger.findLatestSuccessfulApplyRun;
    if (!findLatestSuccessfulApplyRun) throw new Error("ledger_lookup_capability_missing");
    await expect(findLatestSuccessfulApplyRun(packageKey)).resolves.toMatchObject({
      id: higherId,
      packageKey,
      mode: "apply",
      status: "success",
      options: { candidate: "higher" },
    });
  } finally {
    await harness.db
      .delete(solutionKitInstallRuns)
      .where(inArray(solutionKitInstallRuns.id, runIds));
  }
});
