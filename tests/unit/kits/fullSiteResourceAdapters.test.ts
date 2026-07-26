import { describe, expect, test } from "bun:test";

import {
  FULL_SITE_RESOURCE_ADAPTERS,
  LIFECYCLE_CAPABLE_PUBLISH_KINDS,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { applyFullSitePackage } from "../../../core/services/kits/fullSiteInstall/execute";
import { readSagaSnapshot } from "../../../core/services/kits/fullSiteInstall/staging";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
} from "../../../core/services/kits/fullSiteInstallTypes";
import {
  PACKAGE_RESOURCE_KINDS,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
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
      document: { items: [{ pageId: { ref: "page", key: "home" } }] },
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
  | { type: "create"; packageKey: string }
  | { type: "record"; key: string; status: string }
  | { type: "finalize"; status: string };

const fakeLedger = (events: LedgerEvent[]): FullSiteInstallLedgerPort => ({
  async createRun(input) {
    events.push({ type: "create", packageKey: input.packageKey });
    return { id: "run-id" };
  },
  async recordItem(input) {
    events.push({ type: "record", key: input.key, status: input.status });
  },
  async finalizeRun(input) {
    events.push({ type: "finalize", status: input.status });
  },
  async getRun() {
    return null;
  },
  async listItems() {
    return [];
  },
  async createRollbackRun() {
    return { id: "rollback-id" };
  },
  async hasSuccessfulRollback() {
    return false;
  },
  async findManagedResourceEvidence() {
    return null;
  },
});

type FakeCurrentState = Map<string, { id: string; desired: JsonObject }>;

const fakeRollbackAdapters = (
  state?: FakeCurrentState
): import("../../../core/services/kits/fullSiteInstall/compensation").FullSiteRollbackAdapters => {
  const adapter = {
    deleteById: async (id: string) => {
      for (const [identity, current] of state ?? []) {
        if (current.id === id) state?.delete(identity);
      }
    },
    restoreById: async () => undefined,
  };
  return {
    content_type: adapter,
    form: adapter,
    page_template: adapter,
    listing_template: adapter,
    content_entry: adapter,
    listing_query: adapter,
    detail_page: adapter,
    page: adapter,
    menu: adapter,
    setting: adapter,
  };
};

const fakeAdapters = (events: string[], state?: FakeCurrentState) =>
  Object.fromEntries(
    PACKAGE_RESOURCE_KINDS.map((kind) => {
      const adapter: ResourceAdapter = {
        validateDesired(input) {
          events.push(`validate:${kind}:${input.key}`);
          assertRefsResolved(input.desired);
        },
        async applyDesired(input) {
          events.push(`desired:${kind}:${input.key}`);
          assertRefsResolved(input.desired);
          const result = { id: `${kind}-id-${input.key}`, desired: input.desired };
          state?.set(`${kind}:${input.key}`, result);
          return result;
        },
        async applyStaged(input) {
          events.push(`staged:${kind}:${input.key}`);
          assertRefsResolved(input.desired);
          const result = { id: `${kind}-id-${input.key}`, desired: input.desired };
          state?.set(`${kind}:${input.key}`, {
            id: result.id,
            desired: { ...input.desired, status: "draft" },
          });
          return result;
        },
        async publish(id, _actorId) {
          events.push(`publish:${kind}`);
          for (const [identity, current] of state ?? []) {
            if (current.id === id) {
              state?.set(identity, {
                id,
                desired: { ...current.desired, status: "published" },
              });
            }
          }
        },
      };
      return [kind, adapter];
    })
  ) as Record<FullSiteInstallResourceKind, ResourceAdapter>;

const fakeRuntime = (events: string[]) => {
  const state: FakeCurrentState = new Map();
  return {
    adapters: fakeAdapters(events, state),
    rollbackAdapters: fakeRollbackAdapters(state),
    resolveCurrentResource: async (kind: FullSiteInstallResourceKind, seed: { key: string }) =>
      state.get(`${kind}:${seed.key}`) ?? null,
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

describe("full-site resource adapters", () => {
  test.each([
    [
      "listing template name",
      (pkg: FullSitePackageV1) => {
        pkg.resources.listingTemplates[0]!.desired.name = "";
      },
    ],
    [
      "site locale",
      (pkg: FullSitePackageV1) => {
        const locale = pkg.resources.settings.find((setting) => setting.key === "site.locale");
        if (!locale) throw new Error("setting_fixture_missing");
        locale.desired.value = "../pl";
      },
    ],
  ] as const)(
    "native preflight rejects invalid %s before creating the run",
    async (_label, mutate) => {
      const pkg = structuredClone(buildFormaDomPackage());
      mutate(pkg);
      const ledgerEvents: LedgerEvent[] = [];
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(ledgerEvents),
            resolveCurrentResource: async () => null,
          }
        )
      ).rejects.toThrow();
      expect(ledgerEvents).toEqual([]);
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
  ] as const)("dry-run rejects invalid %s payload before domain writes", async (_kind, mutate) => {
    const pkg = structuredClone(buildFormaDomPackage());
    mutate(pkg);
    const ledgerEvents: LedgerEvent[] = [];
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID, dryRun: true },
        {
          ledger: fakeLedger(ledgerEvents),
          resolveCurrentResource: async () => null,
          rollbackAdapters: fakeRollbackAdapters(),
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
          resolveCurrentResource: async () => null,
          adapters,
          rollbackAdapters: fakeRollbackAdapters(),
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
    expect(ledgerEvents).toEqual([]);
  });

  test.each(["tags", "visibility", "scheduledAt"] as const)(
    "rejects unsupported content-entry %s instead of silently dropping it",
    async (field) => {
      const pkg = structuredClone(buildFormaDomPackage());
      pkg.resources.entries[0]!.desired[field] =
        field === "tags" ? ["modern"] : field === "visibility" ? "public" : "2030-01-01";
      const ledgerEvents: LedgerEvent[] = [];
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(ledgerEvents),
            resolveCurrentResource: async () => null,
            rollbackAdapters: fakeRollbackAdapters(),
          }
        )
      ).rejects.toThrow("aurora_invalid");
      expect(ledgerEvents).toEqual([]);
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
      await expect(
        applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID, dryRun: true },
          {
            ledger: fakeLedger(events),
            resolveCurrentResource: async () => null,
            rollbackAdapters: fakeRollbackAdapters(),
          }
        )
      ).rejects.toThrow();
      expect(events.some((event) => event.type === "record")).toBe(false);
    }
  );

  test("executor stages lifecycle resources, publishes last, then applies shell settings", async () => {
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
    const lastPublish = Math.max(
      ...adapterEvents
        .map((event, index) => (event.startsWith("publish:") ? index : -1))
        .filter((index) => index >= 0)
    );
    expect(firstSetting).toBeGreaterThan(lastPublish);
    expect(adapterEvents.filter((event) => event.startsWith("desired:form:"))).toHaveLength(1);
    expect(
      adapterEvents.filter((event) => event.startsWith("desired:listing_template:"))
    ).toHaveLength(1);
    expect(ledgerEvents.at(-1)).toEqual({ type: "finalize", status: "success" });
  });

  test("applies all changed settings through one final batch adapter call", async () => {
    const runtime = fakeRuntime([]);
    let batches = 0;
    runtime.adapters.setting.applyBatch = async (inputs) => {
      batches += 1;
      return inputs.map((input) => ({ id: input.key, desired: input.desired }));
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
        rollbackAdapters: fakeRollbackAdapters(),
      }
    );
    expect(adapterEvents).toHaveLength((PACKAGE_RESOURCE_KINDS.length + 3) * 2);
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
      const captured: Parameters<FullSiteInstallLedgerPort["recordItem"]>[0][] = [];
      const ledger = fakeLedger([]);
      ledger.recordItem = async (input) => {
        captured.push(structuredClone(input));
      };
      ledger.findManagedResourceEvidence = async () => ({
        runId: "managed-run",
        resourceId: "listing-template-id",
        desired: currentDesired,
        successful: true,
        rolledBack: false,
      });
      let writes = 0;
      const adapters = fakeAdapters([]);
      adapters.listing_template.validateDesired =
        FULL_SITE_RESOURCE_ADAPTERS.listing_template.validateDesired;
      adapters.listing_template.applyDesired = async (input) => {
        writes += 1;
        return { id: input.currentId ?? "listing-template-id", desired: input.desired };
      };
      const result = await applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID, dryRun },
        {
          ledger,
          adapters,
          rollbackAdapters: fakeRollbackAdapters(),
          resolveCurrentResource: async () => ({
            id: "listing-template-id",
            desired: currentDesired,
          }),
        }
      );
      return { captured, result, writes };
    };

    const canonicalDryRun = await executeAgainst(normalized, true);
    expect(canonicalDryRun.result.resources[0]?.operation).toBe("noop");
    expect(canonicalDryRun.captured.at(-1)?.afterSnapshot).toEqual({
      id: "listing-template-id",
      desired: normalized,
    });
    expect(canonicalDryRun.writes).toBe(0);

    const canonicalReapply = await executeAgainst(normalized, false);
    expect(canonicalReapply.result.resources[0]?.operation).toBe("noop");
    expect(canonicalReapply.captured.at(-1)?.afterSnapshot).toEqual({
      id: "listing-template-id",
      desired: normalized,
    });
    expect(canonicalReapply.writes).toBe(0);

    const legacyReapply = await executeAgainst(rawDesired, false);
    expect(legacyReapply.result.resources[0]?.operation).toBe("update");
    expect(legacyReapply.writes).toBe(1);
    expect(readSagaSnapshot(legacyReapply.captured.at(-1)?.afterSnapshot ?? null)).toMatchObject({
      id: "listing-template-id",
      desired: normalized,
      phase: "complete",
      intendedDesired: normalized,
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
        const adapters = fakeAdapters(events);
        let validations = 0;
        adapters[kind].validateDesired = (input) => {
          validations += 1;
          events.push(`validate:${kind}:${input.key}`);
          return changeOnExecution && validations >= 3
            ? { ...input.desired, changed: true }
            : input.desired;
        };
        const invocation = applyFullSitePackage(
          { package: pkg, actorId: ACTOR_ID },
          {
            ledger,
            adapters,
            rollbackAdapters: fakeRollbackAdapters(),
            resolveCurrentResource: async () => ({
              id: kind === "setting" ? key : "managed-id",
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
          rollbackAdapters: fakeRollbackAdapters(),
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
    let resolves = 0;
    const adapterEvents: string[] = [];
    await expect(
      applyFullSitePackage(
        { package: pkg, actorId: ACTOR_ID },
        {
          ledger: fakeLedger([]),
          resolveCurrentResource: async () => {
            resolves += 1;
            return resolves <= 13
              ? null
              : { id: "concurrent-id", desired: { marker: "concurrent" } };
          },
          adapters: fakeAdapters(adapterEvents),
          rollbackAdapters: fakeRollbackAdapters(),
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
    rollbackAdapters.content_type.deleteById = async (id) => {
      rollbackEvents.push(`delete:${id}`);
    };
    await expect(
      applyFullSitePackage(
        { package: fullPackage(), actorId: ACTOR_ID },
        {
          ledger,
          resolveCurrentResource: runtime.resolveCurrentResource,
          adapters: runtime.adapters,
          rollbackAdapters,
        }
      )
    ).rejects.toThrow("ledger_record_failed");
    expect(rollbackEvents).toEqual(["delete:content_type-id-project"]);
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
    runtime.rollbackAdapters.content_type.deleteById = async (id) => {
      rollbackEvents.push(`delete:${id}`);
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
    expect(rollbackEvents).toEqual(["delete:content_type-id-project"]);
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
    const adapters = fakeAdapters([], state);
    adapters.setting.applyBatch = async (inputs) => {
      for (const input of inputs) {
        state.set(`setting:${input.key}`, { id: input.key, desired: input.desired });
      }
      return inputs.map((input) => ({ id: input.key, desired: input.desired }));
    };
    const restored: string[][] = [];
    const rollbackAdapters = fakeRollbackAdapters(state);
    rollbackAdapters.setting.applyBatch = async (items) => {
      restored.push(items.map((item) => item.id));
      for (const item of items) state.delete(`setting:${item.id}`);
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
          adapters,
          rollbackAdapters,
          resolveCurrentResource: async (kind, seed) => state.get(`${kind}:${seed.key}`) ?? null,
        }
      )
    ).rejects.toThrow("ledger_record_failed");
    expect(restored).toEqual([["site.locale", "site.name"]]);
    expect(state.size).toBe(0);
  });

  test("rejects an invalid actor before planner or ledger DB access", async () => {
    let calls = 0;
    const ledger = fakeLedger([]);
    const originalCreate = ledger.createRun;
    ledger.createRun = async (input) => {
      calls += 1;
      return originalCreate(input);
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
          rollbackAdapters: fakeRollbackAdapters(),
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
    adapters.form.applyDesired = async (input) => {
      captured.push(input.desired);
      return { id: "form-id", desired: input.desired };
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
