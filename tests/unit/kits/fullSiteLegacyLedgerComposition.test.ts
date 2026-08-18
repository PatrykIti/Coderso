import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import { toSafeFullSiteErrorCode } from "../../../core/services/kits/fullSiteInstallTypes";
import { startFullSiteLockContender, type FullSiteLockContender } from "./fullSiteLockContender";
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
  createLegacyInstallLedger: PersistenceModule["createLegacyInstallLedger"];
  getSolutionKitInstallRun: PersistenceModule["getSolutionKitInstallRun"];
  withFullSiteInstallLocks: PersistenceModule["withFullSiteInstallLocks"];
  solutionKitInstallItems: SchemaModule["solutionKitInstallItems"];
  solutionKitInstallRuns: SchemaModule["solutionKitInstallRuns"];
  users: SchemaModule["users"];
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
    createLegacyInstallLedger: persistence.createLegacyInstallLedger,
    getSolutionKitInstallRun: persistence.getSolutionKitInstallRun,
    withFullSiteInstallLocks: persistence.withFullSiteInstallLocks,
    solutionKitInstallItems: schemaModule.solutionKitInstallItems,
    solutionKitInstallRuns: schemaModule.solutionKitInstallRuns,
    users: schemaModule.users,
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
const createDeferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};
const DB_EVENTUALLY_DEADLINE_MS = 50_000;
const pollUntil = async <T>(read: () => Promise<T | null>): Promise<T> => {
  const deadline = performance.now() + DB_EVENTUALLY_DEADLINE_MS;
  while (performance.now() < deadline) {
    const value = await read();
    if (value !== null) return value;
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("db_lock_state_timeout");
};
const createLockActor = async (harness: DbHarness): Promise<string> => {
  const actorId = randomUUID();
  await harness.db.insert(harness.users).values({
    id: actorId,
    email: `full-site-lock-${actorId}@example.test`,
    passwordHash: "test-only-password-hash",
    name: "Full-site lock test",
  });
  return actorId;
};
const TWO_LOCK_FIXTURE = "full-site-legacy-ledger-composition-two-lock-v1";
const clearTwoLockFixtures = async (harness: DbHarness): Promise<void> => {
  await harness.db
    .delete(harness.solutionKitInstallRuns)
    .where(sql`${harness.solutionKitInstallRuns.options}->>'testFixture' = ${TWO_LOCK_FIXTURE}`);
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
  const [source, selectionSource, batchSource, ledgerSource] = await Promise.all([
    readSource("../../../core/services/kits/fullSiteInstall/currentResourceResolver.ts"),
    readSource("../../../core/services/kits/fullSiteInstall/plannerEqualitySelections.ts"),
    readSource("../../../core/services/kits/fullSiteInstall/planningResourceBatchReader.ts"),
    readSource("./fullSiteLegacyLedgerComposition.test.ts"),
  ]);
  const selections: Record<string, string> = {
    SETTING_PLANNER_EQUALITY_SELECTION: "value:settings.value",
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
    const ownerSource = name === "CONTENT_ENTRY_ID_SELECTION" ? source : selectionSource;
    const declaration = name === "CONTENT_ENTRY_ID_SELECTION" ? "const" : "export const";
    assertDirectSelectionBody(
      extractUniqueBody(ownerSource, `${declaration} ${name} = {`, "\n} as const;"),
      expectedFields.split(" ")
    );
    // TASK-547 (smoke-560) moved the page current-resource read out of this
    // resolver into the dedicated bounded reader readPageLifecycleNativeSnapshot
    // (pageService), so the resolver no longer emits .select(PAGE_PLANNER...).
    // The selection stays in plannerEqualitySelections for the batch reader.
    const expectedUses =
      name === "CONTENT_ENTRY_ID_SELECTION"
        ? 2
        : name === "PAGE_PLANNER_EQUALITY_SELECTION"
          ? 0
          : 1;
    expect(source.match(new RegExp(`\\.select\\(${name}\\)`, "g")) ?? []).toHaveLength(
      expectedUses
    );
    if (name !== "CONTENT_ENTRY_ID_SELECTION") {
      expect(source).not.toContain(`const ${name} = {`);
      expect(batchSource).not.toContain(`const ${name} = {`);
      expect(batchSource).toContain(name);
    }
  }
  expect(source).toContain("readPageLifecycleNativeSnapshot");
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
const assertTwoLockComposition = async (useDifferentPackage: boolean): Promise<void> => {
  const harness = dbHarness;
  const databaseUrl = process.env.DATABASE_URL;
  if (!harness || !databaseUrl) throw new Error("db_test_unavailable");
  const probe = postgres(databaseUrl, { max: 1 });
  let actorId: string | null = null;
  let contender: FullSiteLockContender | null = null;
  const release = createDeferred();
  let first: Promise<void> | null = null;
  try {
    await clearTwoLockFixtures(harness);
    actorId = await createLockActor(harness);
    const lockActorId = actorId;
    const scope = randomUUID();
    const firstKey = `lock-first-${scope}`;
    const secondKey = useDifferentPackage ? `lock-second-${scope}` : firstKey;
    const reservation = (packageKey: string) => ({
      intent: "apply" as const,
      packageKey,
      actorId: lockActorId,
      dryRun: false,
      options: { request: scope, testFixture: TWO_LOCK_FIXTURE },
    });
    const entered = createDeferred();
    const events: string[] = [];
    let active = 0;
    let maxActive = 0;
    let firstEntered = false;
    let contenderSettledBeforeContention = false;
    const firstRun = harness.withFullSiteInstallLocks(reservation(firstKey), async () => {
      firstEntered = true;
      active += 1;
      maxActive = Math.max(maxActive, active);
      events.push("first-enter");
      entered.resolve();
      await release.promise;
      events.push("first-exit");
      active -= 1;
    });
    first = firstRun;
    const firstOutcome = firstRun.then(
      () => ({ ok: true as const, error: null }),
      (error: unknown) => ({
        ok: false as const,
        error: error instanceof Error ? error : new Error("native_cms_writer_fence_failed"),
      })
    );
    await Promise.race([
      entered.promise,
      firstOutcome.then((outcome) => {
        if (firstEntered) return;
        if (!outcome.ok) throw outcome.error;
        throw new Error("full_site_lock_callback_not_entered");
      }),
    ]);
    try {
      contender = startFullSiteLockContender({
        actorId: lockActorId,
        fixture: TWO_LOCK_FIXTURE,
        packageKey: secondKey,
        request: scope,
      });
      void contender.outcome.then(
        () => {
          contenderSettledBeforeContention = true;
        },
        () => {
          contenderSettledBeforeContention = true;
        }
      );
      const lockState = await pollUntil(async () => {
        if (contenderSettledBeforeContention) {
          throw new Error("full_site_lock_contender_settled_before_contention");
        }
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
    await firstRun;
    if (!contender) throw new Error("full_site_lock_contender_missing");
    const secondOutcome = await contender.outcome;
    if (useDifferentPackage) {
      expect(secondOutcome).toMatchObject({
        ok: false,
        error: "site_package_recovery_conflict",
      });
      expect(secondOutcome.callbackCalled).toBe(false);
    } else {
      expect(secondOutcome).toEqual({ ok: true, callbackCalled: true, error: null });
    }
    expect(maxActive).toBe(1);
    expect(events).toEqual(["first-enter", "first-exit"]);
  } finally {
    release.resolve();
    if (first) await Promise.allSettled([first]);
    if (contender) await contender.stop();
    await clearTwoLockFixtures(harness);
    if (actorId) await harness.db.delete(harness.users).where(eq(harness.users.id, actorId));
    await probe.end();
  }
};
testIfDb(
  "two-lock composition serializes exact takeover for the same package",
  async () => {
    await assertTwoLockComposition(false);
  },
  60_000
);
testIfDb(
  "two-lock composition rejects takeover for a different package",
  async () => {
    await assertTwoLockComposition(true);
  },
  60_000
);
testIfDb(
  "partial package-lock acquisition failure releases the global transaction lock",
  async () => {
    const harness = dbHarness;
    const databaseUrl = process.env.DATABASE_URL;
    if (!harness || !databaseUrl) throw new Error("db_test_unavailable");
    const holder = postgres(databaseUrl, { max: 1 });
    const probe = postgres(databaseUrl, { max: 1 });
    const actorId = await createLockActor(harness);
    const packageKey = `partial-lock-${randomUUID()}`;
    const reservation = (value: string) => ({
      intent: "apply" as const,
      packageKey: value,
      actorId,
      dryRun: false,
      options: { request: packageKey },
    });
    const holderReady = createDeferred<number>();
    const releaseHolder = createDeferred();
    let followupOwnerRunId: string | null = null;
    const holderTransaction = holder.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(547, hashtext(${packageKey}))`;
      const [holderRow] = await transaction`select pg_backend_pid() as pid`;
      if (typeof holderRow?.pid !== "number") throw new Error("db_holder_pid_missing");
      holderReady.resolve(holderRow.pid);
      await releaseHolder.promise;
    });
    let callbackCalled = false;
    try {
      const holderPid = await holderReady.promise;
      const attempt = harness
        .withFullSiteInstallLocks(reservation(packageKey), async () => {
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
        where held.pid = ${holderPid}
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
      releaseHolder.resolve();
      await holderTransaction;
      await expect(
        harness.withFullSiteInstallLocks(
          reservation(`partial-followup-${randomUUID()}`),
          async (context) => {
            followupOwnerRunId = context.ownerRunId;
            return "released";
          }
        )
      ).resolves.toBe("released");
    } finally {
      releaseHolder.resolve();
      await Promise.allSettled([holderTransaction]);
      if (followupOwnerRunId) {
        await harness.db
          .delete(harness.solutionKitInstallRuns)
          .where(eq(harness.solutionKitInstallRuns.id, followupOwnerRunId));
      }
      await harness.db.delete(harness.users).where(eq(harness.users.id, actorId));
      await Promise.all([holder.end(), probe.end()]);
    }
  },
  60_000
);
testIfDb(
  "explicit rollback transfers the writer marker from an interrupted apply source",
  async () => {
    const harness = dbHarness;
    if (!harness) throw new Error("db_test_unavailable");
    const actorId = await createLockActor(harness);
    const packageKey = `rollback-transfer-${randomUUID()}`;
    const ownedRunIds = new Set<string>();
    try {
      let sourceRunId = "";
      await harness.withFullSiteInstallLocks(
        {
          intent: "apply",
          packageKey,
          actorId,
          dryRun: false,
          options: { request: packageKey },
        },
        async (context) => {
          if (context.intent !== "apply") throw new Error("apply_context_expected");
          sourceRunId = context.ownerRunId;
          ownedRunIds.add(sourceRunId);
        }
      );
      let rollbackRunId = "";
      await harness.withFullSiteInstallLocks(
        {
          intent: "explicit_rollback",
          packageKey,
          actorId,
          sourceRunId,
          options: { request: `rollback-${packageKey}` },
        },
        async (context) => {
          if (context.intent !== "explicit_rollback") {
            throw new Error("rollback_context_expected");
          }
          rollbackRunId = context.ownerRunId;
          ownedRunIds.add(rollbackRunId);
        }
      );
      const [source, rollback] = await Promise.all([
        harness.getSolutionKitInstallRun(sourceRunId),
        harness.getSolutionKitInstallRun(rollbackRunId),
      ]);
      expect(source).toMatchObject({ id: sourceRunId, mode: "apply", status: "running" });
      expect(source?.options).toMatchObject({ request: packageKey });
      expect(source?.options).not.toHaveProperty("nativeCmsWriterFenceV1");
      expect(rollback).toMatchObject({
        id: rollbackRunId,
        mode: "rollback",
        status: "running",
        rollbackOfRunId: sourceRunId,
      });
      expect(rollback?.options).toHaveProperty("nativeCmsWriterFenceV1");
    } finally {
      if (ownedRunIds.size > 0) {
        await harness.db
          .delete(harness.solutionKitInstallRuns)
          .where(inArray(harness.solutionKitInstallRuns.id, [...ownedRunIds]));
      }
      await harness.db.delete(harness.users).where(eq(harness.users.id, actorId));
    }
  },
  60_000
);
testIfDb("lock entry rejects a non-canonical package key before invoking work", async () => {
  const harness = dbHarness;
  if (!harness) throw new Error("db_test_unavailable");
  let called = false;
  await expect(
    harness.withFullSiteInstallLocks(
      {
        intent: "apply",
        packageKey: " Not-Canonical ",
        actorId: randomUUID(),
        dryRun: false,
        options: {},
      },
      async () => {
        called = true;
      }
    )
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
