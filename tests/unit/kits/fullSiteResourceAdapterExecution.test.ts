import { describe, expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";

import {
  assertFullSiteSagaAdapterApplyInput,
  FULL_SITE_ROLLBACK_ADAPTERS,
  FULL_SITE_RESOURCE_ADAPTERS,
  LIFECYCLE_CAPABLE_PUBLISH_KINDS,
  type FullSiteNativeSnapshot,
  type FullSiteResourceAdapterRegistry,
  type FullSiteRollbackAdapters,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { applyFullSitePackage as applyFullSitePackageCurrent } from "../../../core/services/kits/fullSiteInstall/execute";
import { readFullSiteDurableAfterSnapshotV1 } from "../../../core/services/kits/fullSiteInstall/staging";
import type {
  FullSiteCurrentResourceResolver,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteInstallRun,
  PersistedFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import {
  PACKAGE_RESOURCE_KINDS,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type ResourceSeed,
} from "../../../core/services/kits/fullSitePackage/types";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";

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

const fullPackage = (): FullSitePackageV1 => {
  const value = resources();
  value.contentTypes.push({
    key: "project",
    desired: {
      slug: "project",
      status: "published",
      schema: { type: "object", additionalProperties: false, properties: {} },
    },
  });
  value.forms.push({
    key: "brief",
    desired: {
      status: "published",
      fields: [{ name: "email", type: "email" }],
      actions: [{ type: "success_message", enabled: true }],
    },
  });
  value.pageTemplates.push({
    key: "footer",
    desired: { slug: "footer", status: "published", document: { sections: [] } },
  });
  value.listingTemplates.push({
    key: "cards",
    desired: { slug: "cards", name: "Cards" },
  });
  value.entries.push({
    key: "aurora",
    desired: {
      contentTypeId: { ref: "content_type", key: "project" },
      title: "Aurora",
      slug: "aurora",
      status: "published",
      data: {},
    },
  });
  value.listingQueries.push({
    key: "published-projects",
    desired: {
      query: {
        sourceConfig: { contentTypeId: { ref: "content_type", key: "project" } },
      },
    },
  });
  value.detailPages.push({
    key: "project-detail",
    desired: {
      contentTypeId: { ref: "content_type", key: "project" },
      status: "published",
      related: [{ listingQueryId: { ref: "listing_query", key: "published-projects" } }],
    },
  });
  value.pages.push({
    key: "home",
    desired: { title: "Home", slug: "/", status: "published", document: { sections: [] } },
  });
  value.menus.push({
    key: "primary",
    desired: {
      status: "published",
      items: [{ label: "Home", pageId: { ref: "page", key: "home" } }],
      document: { items: [] },
      appearance: { mode: "light" },
    },
  });
  value.settings.push(
    {
      key: "site.homepageId",
      desired: { value: { ref: "page", key: "home" } },
    },
    {
      key: "site.navigationMenuId",
      desired: { value: { ref: "menu", key: "primary" } },
    },
    {
      key: "site.footerTemplateId",
      desired: { value: { ref: "page_template", key: "footer" } },
    },
    {
      key: "site.contentRoutes",
      desired: {
        value: [
          {
            type: "project",
            detailPageId: { ref: "detail_page", key: "project-detail" },
          },
        ],
      },
    }
  );
  return {
    schemaVersion: 1,
    key: "adapter-test",
    metadata: { name: "Adapter test", locale: "en" },
    resources: value,
  };
};

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

const fakeRollbackAdapters = (
  adapters: FullSiteResourceAdapterRegistry
): FullSiteRollbackAdapters => {
  const overrides = Object.fromEntries(
    PACKAGE_RESOURCE_KINDS.map((kind) => [
      kind,
      {
        ...FULL_SITE_ROLLBACK_ADAPTERS[kind],
        captureSnapshotByIdOrNull: async (id: string) => {
          try {
            return await adapters[kind].captureSnapshotById(id);
          } catch {
            return null;
          }
        },
        deleteSnapshotAtomic: adapters[kind].deleteSnapshotAtomic,
        restoreSnapshotAtomic: adapters[kind].restoreSnapshotAtomic,
        ...(kind === "setting"
          ? { reverseSettingsBatch: adapters.setting.reverseSettingsBatch }
          : {}),
      },
    ])
  );
  return { ...FULL_SITE_ROLLBACK_ADAPTERS, ...overrides } as FullSiteRollbackAdapters;
};

const fakeRuntime = (events: string[], state: FakeCurrentState = new Map()) => {
  const adapters = fakeAdapters(events, state);
  let generated = 0;
  return {
    adapters,
    rollbackAdapters: fakeRollbackAdapters(adapters),
    resolveCurrentResource: async (kind: FullSiteInstallResourceKind, seed: { key: string }) =>
      state.get(`${kind}:${seed.key}`) ?? null,
    generateId: () => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`,
  };
};

const assertRefsResolved = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(assertRefsResolved);
    return;
  }
  if (!value || typeof value !== "object") return;
  expect(Object.prototype.hasOwnProperty.call(value, "ref")).toBe(false);
  Object.values(value).forEach(assertRefsResolved);
};

describe("full-site resource adapter execution", () => {
  test("publishes only lifecycle resources explicitly requesting published", async () => {
    const pkg = fullPackage();
    pkg.resources.entries[0]!.desired.status = "draft";
    pkg.resources.detailPages[0]!.desired.status = "draft";
    pkg.resources.pages[0]!.desired.status = "draft";
    pkg.resources.menus[0]!.desired.status = "draft";
    const events: string[] = [];
    const runtime = fakeRuntime(events);
    await applyFullSitePackage(
      { package: pkg, actorId: ACTOR_ID },
      {
        ledger: fakeLedger([]),
        ...runtime,
      }
    );
    expect(events.some((event) => event.startsWith("publish:"))).toBe(false);
  });

  test.each(["content_entry", "detail_page", "page", "menu"] as const)(
    "rejects invalid %s lifecycle status before writes",
    async (kind) => {
      const pkg = structuredClone(buildFormaDomPackage());
      const collection = {
        content_entry: pkg.resources.entries,
        detail_page: pkg.resources.detailPages,
        page: pkg.resources.pages,
        menu: pkg.resources.menus,
      }[kind];
      collection[0]!.desired.status = "archived";
      const events: LedgerEvent[] = [];
      const adapters = fakeAdapters([]);
      adapters[kind].validateDesired = FULL_SITE_RESOURCE_ADAPTERS[kind].validateDesired;
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(events),
            adapters,
          }
        )
      ).rejects.toThrow();
      expect(events.some((event) => event.type === "record")).toBe(false);
    }
  );

  test("executor stages lifecycle resources, applies shell settings, then publishes", async () => {
    const adapterEvents: string[] = [];
    const ledgerEvents: LedgerEvent[] = [];
    const runtime = fakeRuntime(adapterEvents);
    const result = await applyFullSitePackage(
      { package: fullPackage(), actorId: ACTOR_ID },
      {
        ledger: fakeLedger(ledgerEvents),
        ...runtime,
      }
    );

    expect(result.resources).toHaveLength(13);
    for (const kind of LIFECYCLE_CAPABLE_PUBLISH_KINDS) {
      expect(adapterEvents.some((event) => event.startsWith(`staged:${kind}:`))).toBe(true);
      expect(adapterEvents).toContain(`publish:${kind}`);
    }
    const firstSetting = adapterEvents.findIndex((event) => event.startsWith("desired:setting:"));
    const firstPublish = Math.min(
      ...adapterEvents
        .map((event, index) => (event.startsWith("publish:") ? index : -1))
        .filter((index) => index >= 0)
    );
    expect(firstSetting).toBeLessThan(firstPublish);
    expect(adapterEvents.filter((event) => event.startsWith("desired:form:"))).toHaveLength(1);
    expect(
      adapterEvents.filter((event) => event.startsWith("desired:listing_template:"))
    ).toHaveLength(1);
    expect(ledgerEvents.at(-1)).toEqual({ type: "finalize", status: "success" });
  });

  test("applies all changed settings through one final batch adapter call", async () => {
    const runtime = fakeRuntime([]);
    let batches = 0;
    const applySettingsBatchAtomic = runtime.adapters.setting.applySettingsBatchAtomic;
    runtime.adapters.setting.applySettingsBatchAtomic = async (input) => {
      batches += 1;
      return applySettingsBatchAtomic(input);
    };
    await applyFullSitePackage(
      { package: fullPackage(), actorId: ACTOR_ID },
      {
        ledger: fakeLedger([]),
        ...runtime,
      }
    );
    expect(batches).toBe(1);
  });

  test("dry-run writes ledger evidence but performs zero adapter writes", async () => {
    const adapterEvents: string[] = [];
    const ledgerEvents: LedgerEvent[] = [];
    await applyFullSitePackage(
      { package: fullPackage(), actorId: ACTOR_ID, dryRun: true },
      {
        ledger: fakeLedger(ledgerEvents),
        resolveCurrentResource: async () => null,
        adapters: fakeAdapters(adapterEvents),
        rollbackAdapters: FULL_SITE_ROLLBACK_ADAPTERS,
      }
    );
    expect(adapterEvents).toHaveLength(PACKAGE_RESOURCE_KINDS.length + 3);
    expect(adapterEvents.every((event) => event.startsWith("validate:"))).toBe(true);
    expect(ledgerEvents.filter((event) => event.type === "record")).toHaveLength(13);
    expect(
      ledgerEvents
        .filter(
          (event): event is Extract<LedgerEvent, { type: "record" }> => event.type === "record"
        )
        .every((event) => event.status === "planned")
    ).toBe(true);
  });

  test("normalizes native desired before dry-run and reapply classification", async () => {
    const pkg: FullSitePackageV1 = {
      schemaVersion: 1,
      key: "canonical-reapply",
      metadata: { name: "Canonical reapply", locale: "en" },
      resources: resources(),
    };
    const rawDesired: JsonObject = {
      name: "  Project cards  ",
      slug: "Project Cards",
      description: "",
      layout: "grid",
      config: {},
    };
    pkg.resources.listingTemplates.push({ key: "cards", desired: rawDesired });
    const normalized = await FULL_SITE_RESOURCE_ADAPTERS.listing_template.validateDesired({
      operation: "update",
      currentId: "listing-template-id",
      key: "cards",
      desired: rawDesired,
      actorId: ACTOR_ID,
    });
    if (!normalized) throw new Error("listing_template_fixture_invalid");

    const executeAgainst = async (currentDesired: JsonObject, dryRun: boolean) => {
      const ledger = fakeLedger([]);
      ledger.findManagedResourceEvidence = async () => ({
        runId: "managed-run",
        resourceId: "listing-template-id",
        desired: currentDesired,
        successful: true,
        rolledBack: false,
      });
      let writes = 0;
      const state: FakeCurrentState = new Map([
        [
          "listing_template:cards",
          { id: "listing-template-id", desired: structuredClone(currentDesired) },
        ],
      ]);
      const adapters = fakeAdapters([], state);
      adapters.listing_template.validateDesired =
        FULL_SITE_RESOURCE_ADAPTERS.listing_template.validateDesired;
      const applyDesired = adapters.listing_template.applyDesired;
      adapters.listing_template.applyDesired = async (input) => {
        writes += 1;
        return applyDesired(input);
      };
      const result = await applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID, dryRun },
        {
          ledger,
          adapters,
          rollbackAdapters: FULL_SITE_ROLLBACK_ADAPTERS,
          resolveCurrentResource: async () => ({
            id: "listing-template-id",
            desired: currentDesired,
          }),
        }
      );
      return { captured: await ledger.listItems("run-id"), result, writes };
    };

    const canonicalDryRun = await executeAgainst(normalized, true);
    expect(canonicalDryRun.result.resources[0]?.operation).toBe("noop");
    expect(
      readFullSiteDurableAfterSnapshotV1(canonicalDryRun.captured.at(-1)?.afterSnapshot)
    ).toMatchObject({
      id: "listing-template-id",
      desired: normalized,
      recovery: { phase: "prepared" },
    });
    expect(canonicalDryRun.writes).toBe(0);

    const canonicalReapply = await executeAgainst(normalized, false);
    expect(canonicalReapply.result.resources[0]?.operation).toBe("noop");
    expect(
      readFullSiteDurableAfterSnapshotV1(canonicalReapply.captured.at(-1)?.afterSnapshot)
    ).toMatchObject({
      id: "listing-template-id",
      desired: normalized,
      recovery: { phase: "complete" },
    });
    expect(canonicalReapply.writes).toBe(0);

    const legacyReapply = await executeAgainst(rawDesired, false);
    expect(legacyReapply.result.resources[0]?.operation).toBe("update");
    expect(legacyReapply.writes).toBe(1);
    expect(
      readFullSiteDurableAfterSnapshotV1(legacyReapply.captured.at(-1)?.afterSnapshot)
    ).toMatchObject({
      id: "listing-template-id",
      desired: normalized,
      recovery: { phase: "complete" },
    });
  });

  test.each(["content_type", "setting"] as const)(
    "revalidates a %s noop against its newly normalized desired",
    async (kind) => {
      const pkg: FullSitePackageV1 = {
        schemaVersion: 1,
        key: `noop-race-${kind}`,
        metadata: { name: "Noop race", locale: "en" },
        resources: resources(),
      };
      const key = kind === "setting" ? "site.name" : "project";
      const desired: JsonObject =
        kind === "setting"
          ? { value: "Stable" }
          : {
              name: "Stable",
              slug: "stable",
              status: "published",
              schema: { type: "object", additionalProperties: false, properties: {} },
            };
      if (kind === "setting") pkg.resources.settings.push({ key, desired });
      else pkg.resources.contentTypes.push({ key, desired });

      const execute = async (changeOnExecution: boolean) => {
        const captured: Parameters<FullSiteInstallLedgerPort["recordItem"]>[0][] = [];
        const ledger = fakeLedger([]);
        ledger.recordItem = async (item) => void captured.push(structuredClone(item));
        ledger.findManagedResourceEvidence = async () => ({
          runId: "managed-run",
          resourceId: kind === "setting" ? key : "managed-id",
          desired,
          successful: true,
          rolledBack: false,
        });
        const events: string[] = [];
        const resourceId = kind === "setting" ? key : "managed-id";
        const state: FakeCurrentState = new Map([
          [`${kind}:${key}`, { id: resourceId, desired: structuredClone(desired) }],
        ]);
        const adapters = fakeAdapters(events, state);
        let validations = 0;
        adapters[kind].validateDesired = (input) => {
          validations += 1;
          events.push(`validate:${kind}:${input.key}`);
          return changeOnExecution && validations >= 2
            ? { ...input.desired, changed: true }
            : input.desired;
        };
        const invocation = applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID },
          {
            ledger,
            adapters,
            rollbackAdapters: FULL_SITE_ROLLBACK_ADAPTERS,
            resolveCurrentResource: async () => ({
              id: resourceId,
              desired,
            }),
          }
        );
        return { invocation, captured, events };
      };

      const stable = await execute(false);
      expect((await stable.invocation).resources[0]?.operation).toBe("noop");
      expect(stable.captured.some((item) => item.status === "success")).toBe(true);
      expect(stable.events.every((event) => event.startsWith("validate:"))).toBe(true);

      const changed = await execute(true);
      await expect(changed.invocation).rejects.toThrow("site_package_state_changed");
      expect(changed.captured.some((item) => item.status === "success")).toBe(false);
      expect(changed.events.every((event) => event.startsWith("validate:"))).toBe(true);
    }
  );

  test("preflight rejects before the first domain mutation", async () => {
    const adapterEvents: string[] = [];
    const adapters = fakeAdapters(adapterEvents);
    adapters.form.validateDesired = () => {
      adapterEvents.push("validate:form:brief");
      throw new Error("form_invalid");
    };
    await expect(
      applyFullSitePackage(
        { package: fullPackage(), actorId: ACTOR_ID },
        {
          ledger: fakeLedger([]),
          resolveCurrentResource: async () => null,
          adapters,
          rollbackAdapters: FULL_SITE_ROLLBACK_ADAPTERS,
        }
      )
    ).rejects.toThrow("form_invalid");
    expect(
      adapterEvents.some(
        (event) =>
          event.startsWith("desired:") ||
          event.startsWith("staged:") ||
          event.startsWith("publish:")
      )
    ).toBe(false);
  });

  test("aborts when native state changes between planning and the first mutation", async () => {
    const pkg = fullPackage();
    const adapterEvents: string[] = [];
    const state: FakeCurrentState = new Map();
    const runtime = fakeRuntime(adapterEvents, state);
    const intendedId = "00000000-0000-4000-8000-000000000547";
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID },
        {
          ledger: fakeLedger([]),
          ...runtime,
          generateId: () => intendedId,
          loadPlanningSnapshot: async (planned) => {
            state.set("content_type:project", {
              id: intendedId,
              desired: { marker: "concurrent" },
            });
            return planned.map((resource) => ({
              identity: resource.identity,
              evidence: null,
              current: null,
            }));
          },
        }
      )
    ).rejects.toThrow("site_package_state_changed");
    expect(
      adapterEvents.some((event) => event.startsWith("desired:") || event.startsWith("staged:"))
    ).toBe(false);
  });

  test("compensates an in-memory success when its ledger write fails", async () => {
    const ledger = fakeLedger([]);
    ledger.recordItem = async (input) => {
      if (input.runId === "run-id" && input.status === "success") {
        throw new Error("ledger_record_failed");
      }
    };
    const rollbackEvents: string[] = [];
    const runtime = fakeRuntime([]);
    const rollbackAdapters = runtime.rollbackAdapters;
    const deleteSnapshotAtomic = rollbackAdapters.content_type.deleteSnapshotAtomic;
    rollbackAdapters.content_type.deleteSnapshotAtomic = async (input) => {
      rollbackEvents.push(`delete:${input.id}`);
      await deleteSnapshotAtomic(input);
    };
    await expect(
      applyFullSitePackage(
        { package: fullPackage(), actorId: ACTOR_ID },
        { ledger, ...runtime, rollbackAdapters }
      )
    ).rejects.toThrow("ledger_record_failed");
    expect(rollbackEvents).toEqual(["delete:00000000-0000-4000-8000-000000000001"]);
  });

  test("claims and resumes the durable automatic compensation run", async () => {
    const ledger = fakeLedger([]);
    const claims: Array<{ sourceRunId: string; options?: JsonObject }> = [];
    ledger.recordItem = async (input) => {
      if (input.runId === "run-id" && input.status === "success") {
        throw new Error("ledger_record_failed");
      }
    };
    ledger.claimRollbackRun = async (input) => {
      claims.push({ sourceRunId: input.sourceRunId, options: input.options });
      return { id: "rollback-id", state: "resumed" };
    };
    ledger.createRollbackRun = async () => {
      throw new Error("non_claimed_rollback_run");
    };
    const rollbackEvents: string[] = [];
    const runtime = fakeRuntime([]);
    const deleteSnapshotAtomic = runtime.rollbackAdapters.content_type.deleteSnapshotAtomic;
    runtime.rollbackAdapters.content_type.deleteSnapshotAtomic = async (input) => {
      rollbackEvents.push(`delete:${input.id}`);
      await deleteSnapshotAtomic(input);
    };
    await expect(
      applyFullSitePackage({ package: fullPackage(), actorId: ACTOR_ID }, { ledger, ...runtime })
    ).rejects.toThrow("ledger_record_failed");
    expect(claims).toEqual([
      {
        sourceRunId: "run-id",
        options: { automaticCompensation: true, fullSitePackage: true },
      },
    ]);
    expect(rollbackEvents).toEqual(["delete:00000000-0000-4000-8000-000000000001"]);
  });

  test("compensates the entire committed settings batch when its first ledger write fails", async () => {
    const pkg: FullSitePackageV1 = {
      schemaVersion: 1,
      key: "settings-ledger-failure",
      metadata: { name: "Settings failure", locale: "en" },
      resources: resources(),
    };
    pkg.resources.settings.push(
      { key: "site.name", desired: { value: "After" } },
      { key: "site.locale", desired: { value: "pl" } }
    );
    const state: FakeCurrentState = new Map();
    const runtime = fakeRuntime([], state);
    const restored: string[][] = [];
    const rollbackAdapters = runtime.rollbackAdapters;
    const reverseSettingsBatch = rollbackAdapters.setting.reverseSettingsBatch;
    rollbackAdapters.setting.reverseSettingsBatch = async (input) => {
      restored.push(input.items.map((item) => item.id));
      await reverseSettingsBatch(input);
    };
    const ledger = fakeLedger([]);
    ledger.recordItem = async (input) => {
      if (input.runId === "run-id" && input.status === "success") {
        throw new Error("ledger_record_failed");
      }
    };
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID },
        {
          ledger,
          ...runtime,
          rollbackAdapters,
        }
      )
    ).rejects.toThrow("ledger_record_failed");
    expect(restored).toEqual([["site.locale", "site.name"]]);
    expect(state.size).toBe(0);
  });

  test("rejects an invalid actor before planner or ledger DB access", async () => {
    let calls = 0;
    const ledger = fakeLedger([]);
    const withPackageLock = ledger.withPackageLock;
    ledger.withPackageLock = async (reservation, execute) => {
      calls += 1;
      return withPackageLock(reservation, execute);
    };
    await expect(
      applyFullSitePackage(
        { package: fullPackage(), actorId: "not-a-uuid" },
        {
          ledger,
          resolveCurrentResource: async () => {
            calls += 1;
            return null;
          },
          adapters: fakeAdapters([]),
          rollbackAdapters: FULL_SITE_ROLLBACK_ADAPTERS,
        }
      )
    ).rejects.toThrow("site_package_actor_invalid");
    expect(calls).toBe(0);
  });

  test("finalizes failed run with a safe machine-readable adapter error", async () => {
    const ledgerEvents: LedgerEvent[] = [];
    const runtime = fakeRuntime([]);
    const adapters = runtime.adapters;
    adapters.form.applyDesired = async () => {
      throw new Error("form_invalid");
    };
    await expect(
      applyFullSitePackage(
        { package: fullPackage(), actorId: ACTOR_ID },
        {
          ledger: fakeLedger(ledgerEvents),
          resolveCurrentResource: runtime.resolveCurrentResource,
          adapters,
          rollbackAdapters: runtime.rollbackAdapters,
        }
      )
    ).rejects.toThrow("form_invalid");
    expect(ledgerEvents.at(-1)).toEqual({ type: "finalize", status: "failed" });
  });

  test("complete desired snapshots retain nested form fields and actions", async () => {
    const captured: JsonObject[] = [];
    const runtime = fakeRuntime([]);
    const adapters = runtime.adapters;
    const applyDesired = adapters.form.applyDesired;
    adapters.form.applyDesired = async (input) => {
      captured.push(input.desired);
      return applyDesired(input);
    };
    await applyFullSitePackage(
      { package: fullPackage(), actorId: ACTOR_ID },
      {
        ledger: fakeLedger([]),
        resolveCurrentResource: runtime.resolveCurrentResource,
        adapters,
        rollbackAdapters: runtime.rollbackAdapters,
      }
    );
    expect(captured[0]?.fields).toEqual([{ name: "email", type: "email" }]);
    expect(captured[0]?.actions).toEqual([{ type: "success_message", enabled: true }]);
  });
});
