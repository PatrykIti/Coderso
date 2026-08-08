import { describe, expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";

import {
  assertFullSiteSagaAdapterApplyInput,
  FULL_SITE_RESOURCE_ADAPTERS,
  LIFECYCLE_CAPABLE_PUBLISH_KINDS,
  type FullSiteNativeSnapshot,
  type FullSiteResourceAdapterRegistry,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { applyFullSitePackage as applyFullSitePackageCurrent } from "../../../core/services/kits/fullSiteInstall/execute";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteInstallRun,
  PersistedFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import {
  PACKAGE_RESOURCE_KINDS,
  type FullSitePackageV1,
  type ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";

type LedgerEvent =
  { type: "record"; key: string; status: string } | { type: "finalize"; status: string };

const fakeLedger = (events: LedgerEvent[]): FullSiteInstallLedgerPort => {
  const sourceRows = new Map<number, PersistedFullSiteInstallLedgerItem>();
  const rollbackRows = new Map<number, PersistedFullSiteInstallLedgerItem>();
  let source: FullSiteInstallRun | null = null;
  const rowsFor = (runId: string) => (runId === "rollback-id" ? rollbackRows : sourceRows);
  const port: FullSiteInstallLedgerPort = {
    withPackageLock: async (reservation, execute) => {
      if (reservation.intent !== "apply") throw new Error("site_package_invalid");
      source = {
        id: "run-id",
        packageKey: reservation.packageKey,
        mode: "apply",
        status: "running",
        rollbackOfRunId: null,
        options: reservation.options,
      };
      return execute({ intent: "apply", ownerRunId: "run-id", resumePhase: "reserved" });
    },
    createRun: async () => ({ id: "run-id" }),
    recordItem: async (input) => {
      const { runId, operation, ...persisted } = input;
      if (operation === "delete" || operation === "restore") {
        throw new Error("unexpected_rollback_operation");
      }
      events.push({ type: "record", key: input.key, status: input.status });
      rowsFor(runId).set(input.position, {
        ...persisted,
        operation,
        rollbackAction: input.rollbackAction ?? null,
        error: input.error ?? null,
      });
    },
    finalizeRun: async (input) => {
      events.push({ type: "finalize", status: input.status });
    },
    getRun: async (runId) => (runId === "run-id" ? source : null),
    listItems: async (runId) => [...rowsFor(runId).values()],
    listRawItems: async (runId) =>
      [...rowsFor(runId).values()].map((item) => ({
        ...item,
        rollbackAction: item.rollbackAction,
        error: item.error ?? null,
      })),
    initializeReservedRun: async (input) => {
      source = {
        id: input.ownerRunId,
        packageKey: input.packageKey,
        mode: "apply",
        status: "running",
        rollbackOfRunId: null,
        options: {
          ...input.options,
          initializationPlanV1: input.items.map(({ position, kind, key, operation }) => ({
            position,
            kind,
            key,
            operation,
          })),
        },
      };
      for (const item of input.items) {
        sourceRows.set(item.position, { ...item, status: "planned", error: null });
        events.push({ type: "record", key: item.key, status: "planned" });
      }
      return { id: input.ownerRunId };
    },
    finalizeOwnedRun: async (input) => {
      events.push({ type: "finalize", status: input.status });
      if (source) source = { ...source, status: input.status };
      return { outcome: "desired_terminal" };
    },
    createRollbackRun: async () => ({ id: "rollback-id" }),
    claimRollbackRun: async () => ({ id: "rollback-id", state: "created" }),
    hasSuccessfulRollback: async () => false,
    findManagedResourceEvidence: async () => null,
  };
  return port;
};

type ApplyInput = Parameters<typeof applyFullSitePackageCurrent>[0];
type ApplyOverrides = NonNullable<Parameters<typeof applyFullSitePackageCurrent>[1]>;

const applyFullSitePackage = (
  input: ApplyInput,
  overrides: ApplyOverrides = {}
): ReturnType<typeof applyFullSitePackageCurrent> => {
  const ledger = overrides.ledger;
  const resolveCurrentResource: FullSiteCurrentResourceResolver =
    overrides.resolveCurrentResource ?? (async () => null);
  return applyFullSitePackageCurrent(input, {
    ...overrides,
    resolveCurrentResource,
    loadPlanningSnapshot:
      overrides.loadPlanningSnapshot ??
      (async (planned) => {
        if (!ledger) throw new Error("test_ledger_missing");
        return Promise.all(
          planned.map(async (resource) => {
            const [candidate, current] = await Promise.all([
              ledger.findManagedResourceEvidence({
                packageKey: input.package.key,
                kind: resource.kind,
                key: resource.key,
              }),
              resolveCurrentResource(resource.kind, resource.seed as ResourceSeed),
            ]);
            const evidence =
              candidate?.successful === true && candidate.rolledBack === false
                ? { runId: candidate.runId, resourceId: candidate.resourceId }
                : null;
            return { identity: resource.identity, evidence, current };
          })
        );
      }),
  });
};

type FakeCurrentState = Map<string, FullSiteNativeSnapshot>;

const stateEntryById = (
  state: FakeCurrentState,
  id: string
): [string, FullSiteNativeSnapshot] | undefined =>
  [...state.entries()].find(([, snapshot]) => snapshot.id === id);

const assertExactState = (actual: unknown, expected: unknown): void => {
  if (!isDeepStrictEqual(actual, expected)) throw new Error("site_package_state_changed");
};

const fakeAdapters = (
  events: string[],
  state: FakeCurrentState = new Map()
): FullSiteResourceAdapterRegistry =>
  Object.fromEntries(
    PACKAGE_RESOURCE_KINDS.map((kind) => {
      const captureSnapshotById = async (id: string): Promise<FullSiteNativeSnapshot> => {
        const current = stateEntryById(state, id)?.[1];
        if (current) return structuredClone(current);
        if (kind === "setting") return { id, desired: { present: false } };
        throw new Error(`${kind}_not_found`);
      };
      const apply = async (
        phase: "desired" | "staged",
        input: Parameters<ResourceAdapter["applyDesired"]>[0]
      ) => {
        assertFullSiteSagaAdapterApplyInput(input);
        events.push(`${phase}:${kind}:${input.key}`);
        state.set(`${kind}:${input.key}`, structuredClone(input.targetSnapshot));
        return structuredClone(input.targetSnapshot);
      };
      const adapter: FullSiteResourceAdapterRegistry[FullSiteInstallResourceKind] = {
        ...FULL_SITE_RESOURCE_ADAPTERS[kind],
        validateDesired(input: Parameters<ResourceAdapter["validateDesired"]>[0]) {
          events.push(`validate:${kind}:${input.key}`);
          assertRefsResolved(input.desired);
        },
        async prepareNativeTargets(input) {
          const id = input.operation === "create" ? input.intendedId : input.currentId;
          const complete = { id, desired: structuredClone(input.desired) };
          const staged =
            (LIFECYCLE_CAPABLE_PUBLISH_KINDS as readonly string[]).includes(kind) &&
            input.desired.status === "published"
              ? { id, desired: { ...structuredClone(input.desired), status: "draft" } }
              : null;
          return { staged, complete };
        },
        captureSnapshotById,
        applyDesired: (input) => apply("desired", input),
        applyStaged: (input) => apply("staged", input),
        async deleteSnapshotAtomic(input) {
          const current = stateEntryById(state, input.id);
          assertExactState(current?.[1] ?? null, input.expectedCurrent);
          if (current) state.delete(current[0]);
        },
        async restoreSnapshotAtomic(input) {
          const current = stateEntryById(state, input.id);
          assertExactState(current?.[1] ?? null, input.expectedCurrent);
          if (!current) throw new Error("site_package_state_changed");
          state.set(current[0], structuredClone(input.target));
        },
        async publishSnapshotAtomic(input) {
          const current = stateEntryById(state, input.id);
          assertExactState(current?.[1] ?? null, input.expectedCurrent);
          if (!current) throw new Error("site_package_state_changed");
          events.push(`publish:${kind}`);
          state.set(current[0], structuredClone(input.target));
        },
        async applySettingsBatchAtomic({ items }) {
          for (const item of items) {
            assertExactState(state.get(`setting:${item.key}`) ?? null, item.expectedSnapshot);
          }
          return items.map((item) => {
            events.push(`desired:setting:${item.key}`);
            state.set(`setting:${item.key}`, structuredClone(item.targetSnapshot));
            return structuredClone(item.targetSnapshot);
          });
        },
        async reverseSettingsBatch({ items }) {
          for (const item of items) {
            assertExactState(state.get(`setting:${item.id}`) ?? null, item.expectedCurrent);
          }
          for (const item of items) {
            if (item.target) state.set(`setting:${item.id}`, structuredClone(item.target));
            else state.delete(`setting:${item.id}`);
          }
        },
      };
      return [kind, adapter];
    })
  ) as unknown as FullSiteResourceAdapterRegistry;

const assertRefsResolved = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(assertRefsResolved);
    return;
  }
  if (!value || typeof value !== "object") return;
  expect(Object.prototype.hasOwnProperty.call(value, "ref")).toBe(false);
  Object.values(value).forEach(assertRefsResolved);
};

describe("full-site resource adapters", () => {
  test.each([
    [
      "listing template name",
      "listing_template",
      (pkg: FullSitePackageV1) => {
        pkg.resources.listingTemplates[0]!.desired.name = "";
      },
    ],
    [
      "site locale",
      "setting",
      (pkg: FullSitePackageV1) => {
        const locale = pkg.resources.settings.find((setting) => setting.key === "site.locale");
        if (!locale) throw new Error("setting_fixture_missing");
        locale.desired.value = "";
      },
    ],
  ] as const)(
    "native preflight rejects invalid %s before creating the run",
    async (_label, kind, mutate) => {
      const pkg = structuredClone(buildFormaDomPackage());
      mutate(pkg);
      const adapters = fakeAdapters([]);
      adapters[kind].validateDesired = FULL_SITE_RESOURCE_ADAPTERS[kind].validateDesired;
      const ledgerEvents: LedgerEvent[] = [];
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(ledgerEvents),
            adapters,
          }
        )
      ).rejects.toThrow();
      expect(ledgerEvents).toEqual([{ type: "finalize", status: "failed" }]);
    }
  );

  test.each([
    [
      "content_type",
      (pkg: FullSitePackageV1) => {
        pkg.resources.contentTypes[0]!.desired.unknown = true;
      },
    ],
    [
      "form",
      (pkg: FullSitePackageV1) => {
        pkg.resources.forms[0]!.desired.unknown = true;
      },
    ],
    [
      "page_template",
      (pkg: FullSitePackageV1) => {
        pkg.resources.pageTemplates[0]!.desired.unknown = true;
      },
    ],
    [
      "listing_template",
      (pkg: FullSitePackageV1) => {
        pkg.resources.listingTemplates[0]!.desired.unknown = true;
      },
    ],
    [
      "content_entry",
      (pkg: FullSitePackageV1) => {
        pkg.resources.entries[0]!.desired.unknown = true;
      },
    ],
    [
      "listing_query",
      (pkg: FullSitePackageV1) => {
        pkg.resources.listingQueries[0]!.desired.unknown = true;
      },
    ],
    [
      "detail_page",
      (pkg: FullSitePackageV1) => {
        pkg.resources.detailPages[0]!.desired.unknown = true;
      },
    ],
    [
      "page",
      (pkg: FullSitePackageV1) => {
        pkg.resources.pages[0]!.desired.unknown = true;
      },
    ],
    [
      "menu",
      (pkg: FullSitePackageV1) => {
        pkg.resources.menus[0]!.desired.unknown = true;
      },
    ],
    [
      "setting",
      (pkg: FullSitePackageV1) => {
        const routes = pkg.resources.settings.find(
          (setting) => setting.key === "site.contentRoutes"
        );
        if (!routes) throw new Error("setting_fixture_missing");
        routes.desired.unknown = true;
      },
    ],
  ] as const)("dry-run rejects invalid %s payload before domain writes", async (kind, mutate) => {
    const pkg = structuredClone(buildFormaDomPackage());
    mutate(pkg);
    const adapters = fakeAdapters([]);
    adapters[kind].validateDesired = FULL_SITE_RESOURCE_ADAPTERS[kind].validateDesired;
    const ledgerEvents: LedgerEvent[] = [];
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID, dryRun: true },
        {
          ledger: fakeLedger(ledgerEvents),
          adapters,
        }
      )
    ).rejects.toThrow();
    expect(ledgerEvents.some((event) => event.type === "record")).toBe(false);
  });

  test("preflight rejects a prototype-sensitive content-route key before any write", async () => {
    const pkg = structuredClone(buildFormaDomPackage());
    const routes = pkg.resources.settings.find((setting) => setting.key === "site.contentRoutes");
    const routeValue = routes?.desired.value;
    if (
      !Array.isArray(routeValue) ||
      !routeValue[0] ||
      typeof routeValue[0] !== "object" ||
      Array.isArray(routeValue[0])
    ) {
      throw new Error("setting_fixture_missing");
    }
    Object.defineProperty(routeValue[0], "__proto__", {
      value: true,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(Object.prototype.hasOwnProperty.call(routeValue[0], "__proto__")).toBe(true);

    const adapterEvents: string[] = [];
    const adapters = fakeAdapters(adapterEvents);
    adapters.setting.validateDesired = FULL_SITE_RESOURCE_ADAPTERS.setting.validateDesired;
    const ledgerEvents: LedgerEvent[] = [];
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID },
        {
          ledger: fakeLedger(ledgerEvents),
          adapters,
        }
      )
    ).rejects.toThrow("settings_value_invalid");
    expect(
      adapterEvents.some(
        (event) =>
          event.startsWith("desired:") ||
          event.startsWith("staged:") ||
          event.startsWith("publish:")
      )
    ).toBe(false);
    expect(ledgerEvents).toEqual([{ type: "finalize", status: "failed" }]);
  });

  test.each(["tags", "visibility", "scheduledAt"] as const)(
    "rejects unsupported content-entry %s instead of silently dropping it",
    async (field) => {
      const pkg = structuredClone(buildFormaDomPackage());
      pkg.resources.entries[0]!.desired[field] =
        field === "tags" ? ["modern"] : field === "visibility" ? "public" : "2030-01-01";
      const ledgerEvents: LedgerEvent[] = [];
      const adapters = fakeAdapters([]);
      adapters.content_entry.validateDesired =
        FULL_SITE_RESOURCE_ADAPTERS.content_entry.validateDesired;
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(ledgerEvents),
            adapters,
          }
        )
      ).rejects.toThrow("aurora_invalid");
      expect(ledgerEvents).toEqual([{ type: "finalize", status: "failed" }]);
    }
  );

  test("adapter registry covers exactly all ten resource kinds", () => {
    expect(Object.keys(FULL_SITE_RESOURCE_ADAPTERS).sort()).toEqual(
      [...PACKAGE_RESOURCE_KINDS].sort()
    );
    expect(LIFECYCLE_CAPABLE_PUBLISH_KINDS).toEqual([
      "content_entry",
      "detail_page",
      "page",
      "menu",
    ]);
  });
});
