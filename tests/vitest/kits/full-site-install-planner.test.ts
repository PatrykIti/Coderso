import { describe, expect, it } from "vitest";

import {
  buildReferencePlan,
  type PlannedPackageResource,
} from "../../../core/services/kits/fullSitePackage/referenceGraph";
import { planFullSiteInstall as planFullSiteInstallWithSnapshot } from "../../../core/services/kits/fullSiteInstallPlanner";
import {
  buildFullSiteRollbackActionV1,
  readFullSiteRollbackActionV1,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type {
  CurrentResourceState,
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteCurrentResourceResolver,
  FullSitePlanningDesiredNormalizer,
  FullSiteResourceIdentity,
  ManagedResourceEvidence,
  PersistedFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import {
  PACKAGE_LIMITS,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";

const resources = (): FullSitePackageResources => ({
  contentTypes: [],
  forms: [],
  pageTemplates: [],
  listingTemplates: [],
  entries: [],
  listingQueries: [],
  detailPages: [],
  pages: [],
  menus: [],
  settings: [],
});

const packageFixture = (): FullSitePackageV1 => {
  const value = resources();
  value.contentTypes.push({
    key: "project",
    desired: { slug: "project", status: "published" },
  });
  value.entries.push({
    key: "aurora",
    desired: {
      contentTypeId: { ref: "content_type", key: "project" },
      status: "published",
    },
  });
  return {
    schemaVersion: 1,
    key: "planner-test",
    metadata: { name: "Planner test", locale: "en" },
    resources: value,
  };
};

const fakeLedger = (evidence: Map<string, ManagedResourceEvidence>): FullSiteInstallLedgerPort => ({
  withPackageLock: async (_reservation, execute) =>
    execute({ intent: "apply", ownerRunId: "run-id", resumePhase: "reserved" }),
  createRun: async () => ({ id: "run-id" }),
  recordItem: async () => undefined,
  finalizeRun: async () => undefined,
  getRun: async () => null,
  listItems: async () => [],
  listRawItems: async () => [],
  initializeReservedRun: async () => ({ id: "run-id" }),
  finalizeOwnedRun: async () => ({ outcome: "desired_terminal" }),
  createRollbackRun: async () => ({ id: "rollback-id" }),
  hasSuccessfulRollback: async () => false,
  findManagedResourceEvidence: async ({ kind, key }) => evidence.get(`${kind}:${key}`) ?? null,
});

type LegacyPlannerTestDeps = Readonly<{
  ledger: Pick<FullSiteInstallLedgerPort, "findManagedResourceEvidence">;
  resolveCurrentResource: FullSiteCurrentResourceResolver;
  normalizeDesired?: FullSitePlanningDesiredNormalizer;
  allowSettingTakeover?: boolean;
}>;

const planFullSiteInstall = (pkg: FullSitePackageV1, deps: LegacyPlannerTestDeps) =>
  planFullSiteInstallWithSnapshot(pkg, {
    allowSettingTakeover: deps.allowSettingTakeover,
    normalizeDesired: deps.normalizeDesired,
    loadPlanningSnapshot: async (planned) =>
      Promise.all(
        planned.map(async (resource) => {
          const [candidate, current] = await Promise.all([
            deps.ledger.findManagedResourceEvidence({
              packageKey: pkg.key,
              kind: resource.kind,
              key: resource.key,
            }),
            deps.resolveCurrentResource(resource.kind, resource.seed as unknown as ResourceSeed),
          ]);
          const evidence =
            candidate?.successful === true && candidate.rolledBack === false
              ? { runId: candidate.runId, resourceId: candidate.resourceId }
              : null;
          return { identity: resource.identity, evidence, current };
        })
      ),
  });

const identityNormalizer: FullSitePlanningDesiredNormalizer = async ({ desired }) => desired;

const expectRollbackActionRejectedWithoutThrow = (value: unknown): void => {
  let result: ReturnType<typeof readFullSiteRollbackActionV1> | undefined;
  expect(() => {
    result = readFullSiteRollbackActionV1(value);
  }).not.toThrow();
  expect(result).toBeNull();
};

describe("full-site rollback dependency envelope", () => {
  it("builds a bounded canonical V1 envelope and reads it without coercion", () => {
    const action = buildFullSiteRollbackActionV1({
      identity: "page:home",
      dependencies: ["menu:primary", "content_type:project", "menu:primary", "form:contact"],
    });

    expect(action).toEqual({
      schemaVersion: 1,
      dependencies: ["content_type:project", "form:contact", "menu:primary"],
    });
    expect(readFullSiteRollbackActionV1(action)).toEqual(action);
  });

  it("rejects self references, invalid identities, and over-budget builders", () => {
    expect(() =>
      buildFullSiteRollbackActionV1({
        identity: "page:home",
        dependencies: ["page:home"],
      })
    ).toThrow("site_package_rollback_dependency_invalid");
    expect(() =>
      buildFullSiteRollbackActionV1({
        identity: "page:home",
        dependencies: ["unknown:resource" as FullSiteResourceIdentity],
      })
    ).toThrow("site_package_rollback_dependency_invalid");
    expect(() =>
      buildFullSiteRollbackActionV1({
        identity: "page:Not-Canonical" as FullSiteResourceIdentity,
        dependencies: [],
      })
    ).toThrow("site_package_rollback_dependency_invalid");
    expect(() =>
      buildFullSiteRollbackActionV1({
        identity: "page:home",
        dependencies: Array.from(
          { length: PACKAGE_LIMITS.referenceEdges + 1 },
          (_, index) => `form:form-${index}` as FullSiteResourceIdentity
        ),
      })
    ).toThrow("site_package_rollback_dependency_invalid");
  });

  it.each([
    null,
    [],
    new (class Envelope {
      schemaVersion = 1;
      dependencies: string[] = [];
    })(),
    { schemaVersion: 2, dependencies: [] },
    { schemaVersion: 1 },
    { schemaVersion: 1, dependencies: [], extra: true },
    { schemaVersion: 1, dependencies: ["page:home", "page:home"] },
    { schemaVersion: 1, dependencies: ["unknown:home"] },
    { schemaVersion: 1, dependencies: ["page:Not-Canonical"] },
  ])("returns null for malformed or non-V1 dependency evidence %#", (value) => {
    expect(readFullSiteRollbackActionV1(value)).toBeNull();
  });

  it("rejects sparse, symbol-keyed, accessor-failing, and over-budget envelopes", () => {
    const sparse = new Array(1) as string[];
    const symbolKeyed = { schemaVersion: 1, dependencies: [] as string[] };
    Object.defineProperty(symbolKeyed, Symbol("hidden"), { value: true });
    const accessorFailing = Object.create(Object.prototype) as Record<string, unknown>;
    Object.defineProperty(accessorFailing, "schemaVersion", {
      enumerable: true,
      get: () => {
        throw new Error("getter_failed");
      },
    });
    accessorFailing.dependencies = [];

    expect(readFullSiteRollbackActionV1({ schemaVersion: 1, dependencies: sparse })).toBeNull();
    expect(readFullSiteRollbackActionV1(symbolKeyed)).toBeNull();
    expectRollbackActionRejectedWithoutThrow(accessorFailing);
    expectRollbackActionRejectedWithoutThrow({
      schemaVersion: 1,
      dependencies: Array.from(
        { length: PACKAGE_LIMITS.referenceEdges + 1 },
        (_, index) => `page:page-${index}`
      ),
    });
  });

  it("returns null for a revoked Proxy without throwing", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    expectRollbackActionRejectedWithoutThrow(revoked.proxy);
  });

  it("returns null for a revoked dependencies-array Proxy without throwing", () => {
    const revoked = Proxy.revocable<string[]>([], {});
    revoked.revoke();
    expectRollbackActionRejectedWithoutThrow({ schemaVersion: 1, dependencies: revoked.proxy });
  });

  it("fails closed for throwing envelope traps", () => {
    const hostile = new Error("hostile_envelope_sentinel");
    const throwingPrototype = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw hostile;
        },
      }
    );
    const throwingOwnKeys = new Proxy(
      { schemaVersion: 1, dependencies: [] },
      {
        ownKeys: () => {
          throw hostile;
        },
      }
    );
    const throwingDependencies = new Proxy(
      { schemaVersion: 1, dependencies: [] },
      {
        get: (target, property, receiver) => {
          if (property === "dependencies") throw hostile;
          return Reflect.get(target, property, receiver);
        },
      }
    );

    for (const envelope of [throwingPrototype, throwingOwnKeys, throwingDependencies]) {
      expectRollbackActionRejectedWithoutThrow(envelope);
    }
  });

  it("reads the envelope dependencies property exactly once", () => {
    let dependencyReads = 0;
    const envelope = {
      schemaVersion: 1,
      get dependencies() {
        dependencyReads += 1;
        return ["page:home"];
      },
    };

    expect(readFullSiteRollbackActionV1(envelope)).toEqual({
      schemaVersion: 1,
      dependencies: ["page:home"],
    });
    expect(dependencyReads).toBe(1);
  });

  it("fails closed for changing and throwing Proxy-array boundaries", () => {
    let changingLengthReads = 0;
    const changingLength = new Proxy(["page:home"], {
      get(target, property, receiver) {
        if (property === "length") {
          changingLengthReads += 1;
          return changingLengthReads === 1 ? 1 : 2;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const nonNumericLength = new Proxy(["page:home"], {
      get(target, property, receiver) {
        return property === "length" ? "1" : Reflect.get(target, property, receiver);
      },
    });
    const throwingLength = new Proxy(["page:home"], {
      get(target, property, receiver) {
        if (property === "length") throw new Error("hostile_length");
        return Reflect.get(target, property, receiver);
      },
    });
    let finalLengthReads = 0;
    const throwingFinalLength = new Proxy(["page:home"], {
      get(target, property, receiver) {
        if (property === "length" && finalLengthReads++ > 0) {
          throw new Error("hostile_final_length");
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const throwingPresence = new Proxy(["page:home"], {
      has() {
        throw new Error("hostile_presence");
      },
    });
    const throwingOwnCheck = new Proxy(["page:home"], {
      getOwnPropertyDescriptor() {
        throw new Error("hostile_own_check");
      },
    });
    const throwingIndex = new Proxy(["page:home"], {
      get(target, property, receiver) {
        if (property === "0") throw new Error("hostile_index");
        return Reflect.get(target, property, receiver);
      },
    });

    for (const dependencies of [
      changingLength,
      nonNumericLength,
      throwingLength,
      throwingFinalLength,
      throwingPresence,
      throwingOwnCheck,
      throwingIndex,
    ]) {
      expectRollbackActionRejectedWithoutThrow({ schemaVersion: 1, dependencies });
    }
  });

  it("rejects every invalid numeric Proxy-array length class", () => {
    for (const length of [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      const dependencies = new Proxy<string[]>([], {
        get: (target, property, receiver) =>
          property === "length" ? length : Reflect.get(target, property, receiver),
      });
      expectRollbackActionRejectedWithoutThrow({ schemaVersion: 1, dependencies });
    }
  });

  it("accepts exactly 4096 dense identities and rejects exactly 4097 once", () => {
    const dependencies = Array.from(
      { length: PACKAGE_LIMITS.referenceEdges },
      (_, index) => `page:page-${index}`
    );
    expect(readFullSiteRollbackActionV1({ schemaVersion: 1, dependencies })).toEqual({
      schemaVersion: 1,
      dependencies,
    });
    expectRollbackActionRejectedWithoutThrow({
      schemaVersion: 1,
      dependencies: [...dependencies, "page:page-over-limit"],
    });
  });

  it("keeps construction backward compatible while listed rows require raw evidence", async () => {
    const legacyConstruction: FullSiteInstallLedgerItem = {
      position: 0,
      kind: "page",
      key: "home",
      operation: "create",
      status: "planned",
      beforeSnapshot: null,
      afterSnapshot: null,
    };
    const persisted: PersistedFullSiteInstallLedgerItem = {
      ...legacyConstruction,
      rollbackAction: { schemaVersion: 1, dependencies: [] },
    };
    const port = fakeLedger(new Map());
    port.listItems = async () => [persisted];
    const listedItems = await port.listItems("run-id");
    const listed = listedItems[0];
    expect(listed).toBeDefined();
    if (!listed) throw new Error("persisted_ledger_item_missing");
    const requiredAction: JsonObject | null = listed.rollbackAction;

    expect(legacyConstruction).not.toHaveProperty("rollbackAction");
    expect(requiredAction).toEqual({ schemaVersion: 1, dependencies: [] });
  });
});

describe("full-site install planner", () => {
  it("plans an exact reversible update for an existing unmanaged global setting", async () => {
    const pkg = packageFixture();
    pkg.resources.settings.push({
      key: "site.name",
      desired: { value: "FormaDom" },
    });
    let normalizationCalls = 0;
    const plan = await planFullSiteInstall(pkg, {
      ledger: fakeLedger(new Map()),
      allowSettingTakeover: true,
      normalizeDesired: async ({ desired }) => {
        normalizationCalls += 1;
        return desired;
      },
      resolveCurrentResource: async (kind) =>
        kind === "setting" ? { id: "site.name", desired: { value: "Before" } } : null,
    });
    expect(plan.operations.find((item) => item.kind === "setting")).toMatchObject({
      operation: "update",
      currentId: "site.name",
      currentDesired: { value: "Before" },
      managedRunId: null,
    });
    expect(normalizationCalls).toBe(1);
  });

  it("rejects unmanaged global settings without explicit takeover consent", async () => {
    const pkg = packageFixture();
    pkg.resources.settings.push({ key: "site.name", desired: { value: "FormaDom" } });
    await expect(
      planFullSiteInstall(pkg, {
        ledger: fakeLedger(new Map()),
        normalizeDesired: identityNormalizer,
        resolveCurrentResource: async (kind) =>
          kind === "setting" ? { id: "site.name", desired: { value: "Before" } } : null,
      })
    ).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "setting:site.name",
    });
  });

  it("rejects an unmanaged malformed setting before native desired normalization", async () => {
    const pkg = packageFixture();
    pkg.resources.contentTypes = [];
    pkg.resources.entries = [];
    pkg.resources.settings.push({
      key: "site.locale",
      desired: { value: ["not-a-locale"] },
    });
    let normalizationCalls = 0;

    await expect(
      planFullSiteInstall(pkg, {
        ledger: fakeLedger(new Map()),
        normalizeDesired: async () => {
          normalizationCalls += 1;
          throw new Error("native_setting_validation_should_not_run");
        },
        resolveCurrentResource: async () => ({
          id: "site.locale",
          desired: { value: "en" },
        }),
      })
    ).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "setting:site.locale",
    });
    expect(normalizationCalls).toBe(0);
  });

  it("creates missing resources in deterministic dependency order", async () => {
    const plan = await planFullSiteInstall(packageFixture(), {
      ledger: fakeLedger(new Map()),
      resolveCurrentResource: async () => null,
    });

    expect(plan.operations.map((item) => [item.identity, item.operation])).toEqual([
      ["content_type:project", "create"],
      ["content_entry:aurora", "create"],
    ]);
    expect(plan.operations[1]?.dependencies).toEqual(["content_type:project"]);
  });

  it("plans noop only for matching desired state with valid managed proof", async () => {
    const desiredByIdentity = new Map<string, CurrentResourceState>([
      [
        "content_type:project",
        { id: "type-id", desired: { slug: "project", status: "published" } },
      ],
      [
        "content_entry:aurora",
        {
          id: "entry-id",
          desired: {
            contentTypeId: "type-id",
            status: "published",
          },
        },
      ],
    ]);
    const evidence = new Map<string, ManagedResourceEvidence>(
      [...desiredByIdentity].map(([identity, current]) => [
        identity,
        {
          runId: "run-id",
          resourceId: current.id,
          desired: current.desired,
          successful: true,
          rolledBack: false,
        },
      ])
    );

    const plan = await planFullSiteInstall(packageFixture(), {
      ledger: fakeLedger(evidence),
      normalizeDesired: identityNormalizer,
      resolveCurrentResource: async (kind, seed) =>
        desiredByIdentity.get(`${kind}:${seed.key}`) ?? null,
    });

    expect(plan.operations.map((item) => item.operation)).toEqual(["noop", "noop"]);
    expect(plan.operations.every((item) => item.managedRunId === "run-id")).toBe(true);
  });

  it("detects drift in a resolved reference-bearing native payload", async () => {
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "content_type:project",
        {
          runId: "run-id",
          resourceId: "type-id",
          desired: { slug: "project", status: "published" },
          successful: true,
          rolledBack: false,
        },
      ],
      [
        "content_entry:aurora",
        {
          runId: "run-id",
          resourceId: "entry-id",
          desired: { contentTypeId: "type-id", status: "published" },
          successful: true,
          rolledBack: false,
        },
      ],
    ]);
    const plan = await planFullSiteInstall(packageFixture(), {
      ledger: fakeLedger(evidence),
      normalizeDesired: identityNormalizer,
      resolveCurrentResource: async (kind): Promise<CurrentResourceState> => {
        if (kind === "content_type") {
          return { id: "type-id", desired: { slug: "project", status: "published" } };
        }
        return {
          id: "entry-id",
          desired: { contentTypeId: "different-type-id", status: "published" },
        };
      },
    });
    expect(plan.operations.map((item) => item.operation)).toEqual(["noop", "update"]);
  });

  it("plans update for ledger-proven identity with changed complete desired state", async () => {
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "content_type:project",
        {
          runId: "run-id",
          resourceId: "type-id",
          desired: {},
          successful: true,
          rolledBack: false,
        },
      ],
    ]);
    const plan = await planFullSiteInstall(
      {
        ...packageFixture(),
        resources: {
          ...resources(),
          contentTypes: packageFixture().resources.contentTypes,
        },
      },
      {
        ledger: fakeLedger(evidence),
        normalizeDesired: identityNormalizer,
        resolveCurrentResource: async () => ({
          id: "type-id",
          desired: { slug: "project", status: "draft" },
        }),
      }
    );
    expect(plan.operations[0]?.operation).toBe("update");
  });

  it.each([
    ["no evidence", null],
    [
      "mismatched id",
      {
        runId: "run-id",
        resourceId: "other-id",
        desired: {},
        successful: true,
        rolledBack: false,
      },
    ],
    [
      "failed evidence",
      {
        runId: "run-id",
        resourceId: "type-id",
        desired: {},
        successful: false,
        rolledBack: false,
      },
    ],
    [
      "rolled-back evidence",
      {
        runId: "run-id",
        resourceId: "type-id",
        desired: {},
        successful: true,
        rolledBack: true,
      },
    ],
  ] as const)("rejects unmanaged current resources with %s", async (_name, proof) => {
    const pkg = packageFixture();
    pkg.resources.entries = [];
    const ledgerEvidence = new Map<string, ManagedResourceEvidence>();
    if (proof) ledgerEvidence.set("content_type:project", proof);

    await expect(
      planFullSiteInstall(pkg, {
        ledger: fakeLedger(ledgerEvidence),
        normalizeDesired: identityNormalizer,
        resolveCurrentResource: async () => ({
          id: "type-id",
          desired: { slug: "project", status: "published" },
        }),
      })
    ).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "content_type:project",
    });
  });

  it("rejects an unmanaged ref-bearing dependent before native normalization", async () => {
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "content_type:project",
        {
          runId: "run-id",
          resourceId: "type-id",
          desired: { slug: "project", status: "published" },
          successful: true,
          rolledBack: false,
        },
      ],
    ]);
    let normalizationCalls = 0;

    await expect(
      planFullSiteInstall(packageFixture(), {
        ledger: fakeLedger(evidence),
        normalizeDesired: async ({ kind, desired }) => {
          if (kind !== "content_entry") return desired;
          normalizationCalls += 1;
          throw new Error("native_entry_validation_should_not_run");
        },
        resolveCurrentResource: async (kind): Promise<CurrentResourceState | null> => {
          if (kind === "content_entry") {
            const desired: JsonObject = {
              contentTypeId: "type-id",
              status: "published",
            };
            return { id: "entry-id", desired };
          }
          const desired: JsonObject = { slug: "project", status: "published" };
          return { id: "type-id", desired };
        },
      })
    ).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "content_entry:aurora",
    });
    expect(normalizationCalls).toBe(0);
  });

  it("classifies canonical site locale as noop after native desired normalization", async () => {
    const pkg = packageFixture();
    pkg.resources.contentTypes = [];
    pkg.resources.entries = [];
    pkg.resources.settings.push({ key: "site.locale", desired: { value: "pl-pl" } });
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "setting:site.locale",
        {
          runId: "run-id",
          resourceId: "site.locale",
          desired: { value: "pl-PL" },
          successful: true,
          rolledBack: false,
        },
      ],
    ]);
    const normalizeLocale: FullSitePlanningDesiredNormalizer = async ({ desired }) => ({
      ...desired,
      value: desired.value === "pl-pl" ? "pl-PL" : desired.value,
    });

    const plan = await planFullSiteInstall(pkg, {
      ledger: fakeLedger(evidence),
      normalizeDesired: normalizeLocale,
      resolveCurrentResource: async () => ({
        id: "site.locale",
        desired: { value: "pl-PL" },
      }),
    });

    expect(plan.operations[0]).toMatchObject({
      operation: "noop",
      desired: { value: "pl-pl" },
      currentDesired: { value: "pl-PL" },
    });
  });

  it("updates a legacy noncanonical site locale after native desired normalization", async () => {
    const pkg = packageFixture();
    pkg.resources.contentTypes = [];
    pkg.resources.entries = [];
    pkg.resources.settings.push({ key: "site.locale", desired: { value: "pl-pl" } });
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "setting:site.locale",
        {
          runId: "run-id",
          resourceId: "site.locale",
          desired: { value: "pl-pl" },
          successful: true,
          rolledBack: false,
        },
      ],
    ]);

    const plan = await planFullSiteInstall(pkg, {
      ledger: fakeLedger(evidence),
      normalizeDesired: async ({ desired }) => ({ ...desired, value: "pl-PL" }),
      resolveCurrentResource: async () => ({
        id: "site.locale",
        desired: { value: "pl-pl" },
      }),
    });

    expect(plan.operations[0]?.operation).toBe("update");
  });

  it("fails closed for an existing row when no native normalizer is injected", async () => {
    const pkg = packageFixture();
    pkg.resources.entries = [];
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "content_type:project",
        {
          runId: "run-id",
          resourceId: "type-id",
          desired: { slug: "project", status: "published" },
          successful: true,
          rolledBack: false,
        },
      ],
    ]);

    await expect(
      planFullSiteInstall(pkg, {
        ledger: fakeLedger(evidence),
        resolveCurrentResource: async () => ({
          id: "type-id",
          desired: { slug: "project", status: "published" },
        }),
      })
    ).rejects.toMatchObject({
      code: "site_package_invalid",
      identity: "content_type:project",
    });
  });

  it("updates a managed dependent when its ref target is planned for creation", async () => {
    const evidence = new Map<string, ManagedResourceEvidence>([
      [
        "content_entry:aurora",
        {
          runId: "run-id",
          resourceId: "entry-id",
          desired: {},
          successful: true,
          rolledBack: false,
        },
      ],
    ]);
    let normalizedEntryDesired: CurrentResourceState["desired"] | null = null;
    const placeholderId = "00000000-0000-4000-8000-000000000001";

    const pkg = packageFixture();
    const originalDesired = pkg.resources.entries[0]?.desired;
    const plan = await planFullSiteInstall(pkg, {
      ledger: fakeLedger(evidence),
      normalizeDesired: async ({ kind, desired }) => {
        if (kind === "content_entry") normalizedEntryDesired = desired;
        return desired;
      },
      resolveCurrentResource: async (kind) =>
        kind === "content_entry"
          ? {
              id: "entry-id",
              desired: { contentTypeId: placeholderId, status: "published" },
            }
          : null,
    });

    expect(normalizedEntryDesired).toEqual({
      contentTypeId: placeholderId,
      status: "published",
    });
    expect(plan.operations.map((item) => item.operation)).toEqual(["create", "update"]);
    expect(pkg.resources.entries[0]?.desired).toBe(originalDesired);
    expect(plan.operations[1]?.desired).not.toBe(originalDesired);
    expect(plan.operations[1]?.desired).toEqual({
      contentTypeId: { ref: "content_type", key: "project" },
      status: "published",
    });
  });

  it("loads one ordered snapshot and performs no ledger writes", async () => {
    let snapshotLoads = 0;
    const writeCounts = {
      withPackageLock: 0,
      createRun: 0,
      recordItem: 0,
      finalizeRun: 0,
      initializeReservedRun: 0,
      finalizeOwnedRun: 0,
      patchRunMetadata: 0,
      createRollbackRun: 0,
      claimRollbackRun: 0,
    };
    const rejectPlannerWrite = (seam: keyof typeof writeCounts): never => {
      writeCounts[seam] += 1;
      throw new Error(`planner_write_${seam}`);
    };
    const ledger: FullSiteInstallLedgerPort = {
      withPackageLock: async <T>(): Promise<T> => rejectPlannerWrite("withPackageLock"),
      createRun: async () => rejectPlannerWrite("createRun"),
      recordItem: async () => rejectPlannerWrite("recordItem"),
      finalizeRun: async () => rejectPlannerWrite("finalizeRun"),
      getRun: async () => null,
      patchRunMetadata: async () => rejectPlannerWrite("patchRunMetadata"),
      listItems: async () => [],
      listRawItems: async () => [],
      initializeReservedRun: async () => rejectPlannerWrite("initializeReservedRun"),
      finalizeOwnedRun: async () => rejectPlannerWrite("finalizeOwnedRun"),
      createRollbackRun: async () => rejectPlannerWrite("createRollbackRun"),
      claimRollbackRun: async () => rejectPlannerWrite("claimRollbackRun"),
      hasSuccessfulRollback: async () => false,
      findManagedResourceEvidence: async () => null,
    };
    const deps = {
      ledger,
      loadPlanningSnapshot: async (planned: readonly PlannedPackageResource[]) => {
        snapshotLoads += 1;
        return planned.map((resource) => ({
          identity: resource.identity,
          evidence: null,
          current: null,
        }));
      },
    };
    const plan = await planFullSiteInstallWithSnapshot(packageFixture(), deps);
    expect(snapshotLoads).toBe(1);
    expect(plan.operations.map((item) => item.identity)).toEqual([
      "content_type:project",
      "content_entry:aurora",
    ]);
    expect(writeCounts.withPackageLock).toBe(0);
    expect(writeCounts.createRun).toBe(0);
    expect(writeCounts.recordItem).toBe(0);
    expect(writeCounts.finalizeRun).toBe(0);
    expect(writeCounts.initializeReservedRun).toBe(0);
    expect(writeCounts.finalizeOwnedRun).toBe(0);
    expect(writeCounts.patchRunMetadata).toBe(0);
    expect(writeCounts.createRollbackRun).toBe(0);
    expect(writeCounts.claimRollbackRun).toBe(0);
    expect(Object.values(writeCounts).reduce((sum, count) => sum + count, 0)).toBe(0);
  });

  it("consumes the supplied frozen reference plan without replacing its identity", async () => {
    const pkg = packageFixture();
    const referencePlan = buildReferencePlan(pkg);
    let receivedPlan: readonly unknown[] | null = null;

    const plan = await planFullSiteInstallWithSnapshot(pkg, referencePlan, {
      loadPlanningSnapshot: async (planned) => {
        receivedPlan = planned;
        return planned.map((resource) => ({
          identity: resource.identity,
          evidence: null,
          current: null,
        }));
      },
    });

    expect(receivedPlan).toBe(referencePlan);
    expect(Object.isFrozen(referencePlan)).toBe(true);
    expect(plan.operations).toHaveLength(2);
  });
});
