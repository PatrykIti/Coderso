import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../../core/db/client";
import { solutionKitInstallRuns, users } from "../../../core/db/schema";
import {
  assertFullSiteSagaAdapterApplyInput,
  FULL_SITE_RESOURCE_ADAPTERS,
  createFormResourceAdapter,
  createMenuResourceAdapter,
  type AdapterApplyInput,
  type FullSiteNativeSnapshot,
  type FullSiteSettingsApplyBatchInput,
  type ResourceAdapter,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { applyFullSitePackage } from "../../../core/services/kits/fullSiteInstall/execute";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import {
  buildFullSiteDurableAfterSnapshotV1,
  classifyInterruptedSagaItems,
  readFullSiteDurableAfterSnapshotV1,
} from "../../../core/services/kits/fullSiteInstall/staging";
import type {
  FullSiteInstallLedgerPort,
  PersistedFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type {
  FullSitePackageV1,
  JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  listForms,
  setFormFields,
} from "../../../core/services/forms/formsService";
import { listFormActions, setFormActions } from "../../../core/services/forms/formActionsService";
import type {
  FormActionSuccessMessageConfig,
  FormActionType,
} from "../../../core/services/forms/formActionsContract";
import {
  createMenu,
  deleteMenu,
  getMenu,
  listMenuItems,
  listMenus,
  replaceMenuItems,
  updateMenu,
} from "../../../core/services/menus/menuService";
import { buildFormaDomPackage } from "../../../scripts/projekty-domow/package";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";
const ownedForms = new Set<string>();
const ownedMenus = new Set<string>();

afterEach(async () => {
  for (const id of ownedForms) await deleteForm(id);
  for (const id of ownedMenus) await deleteMenu(id);
  ownedForms.clear();
  ownedMenus.clear();
});

const formDesired = (slug: string) => {
  const actions: Array<{
    id: string;
    type: Extract<FormActionType, "success_message">;
    config: FormActionSuccessMessageConfig;
    orderIndex?: number;
  }> = [];

  return {
    name: "Atomic form",
    slug,
    status: "draft" as const,
    description: "after",
    successMessage: "after",
    successRedirectUrl: null,
    submissionAccess: "public" as const,
    settings: {},
    fields: [
      {
        id: crypto.randomUUID(),
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        orderIndex: 0,
        settings: {},
      },
    ],
    actions,
  };
};

const menuDesired = (name: string) => ({
  name,
  location: null,
  status: "draft" as const,
  document: { schemaVersion: 1 as const, sections: [] },
  appearance: {},
  items: [
    {
      id: crypto.randomUUID(),
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null as string | null,
      orderIndex: 0,
      settings: {},
    },
  ],
});

describe("full-site multi-step adapter atomicity", () => {
  test("projects canonical content-type, form, detail, and menu snapshots", async () => {
    const contentType = await FULL_SITE_RESOURCE_ADAPTERS.content_type.validateDesired({
      operation: "create",
      currentId: null,
      key: "project",
      desired: {
        name: "  House   project  ",
        slug: "HOUSE-PROJECT",
        status: "published",
        schema: { type: "object", additionalProperties: false, properties: {} },
      },
      actorId: ACTOR_ID,
    });
    expect(contentType).toEqual({
      name: "House project",
      slug: "house-project",
      status: "published",
      schema: { type: "object", additionalProperties: false, properties: {} },
    });
    expect(Object.prototype.hasOwnProperty.call(contentType, "config")).toBe(false);

    const form = formDesired("canonical-form");
    form.fields[0]!.orderIndex = 8;
    form.fields.push({
      id: crypto.randomUUID(),
      type: "email",
      label: "Second email",
      name: "second_email",
      required: false,
      orderIndex: 2,
      settings: {},
    });
    form.actions = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        type: "success_message",
        config: { message: "Second" },
        orderIndex: 9,
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "success_message",
        config: { message: "First" },
        orderIndex: 1,
      },
    ];
    const formAdapter = createFormResourceAdapter();
    const normalizedForm = await formAdapter.validateDesired({
      operation: "create",
      currentId: null,
      key: "canonical-form",
      desired: form,
      actorId: ACTOR_ID,
    });
    expect(
      (normalizedForm?.fields as Array<{ orderIndex: number }>).map((field) => field.orderIndex)
    ).toEqual([2, 8]);
    expect(
      (normalizedForm?.actions as Array<{ id: string; orderIndex: number }>).map(
        ({ id, orderIndex }) => ({ id, orderIndex })
      )
    ).toEqual([
      { id: "00000000-0000-4000-8000-000000000001", orderIndex: 0 },
      { id: "00000000-0000-4000-8000-000000000002", orderIndex: 1 },
    ]);
    const duplicateFieldOrder = structuredClone(form);
    duplicateFieldOrder.fields[0]!.orderIndex = 2;
    expect(() =>
      formAdapter.validateDesired({
        operation: "create",
        currentId: null,
        key: "canonical-form",
        desired: duplicateFieldOrder,
        actorId: ACTOR_ID,
      })
    ).toThrow("form_invalid");

    const detailSeed = structuredClone(buildFormaDomPackage().resources.detailPages[0]!);
    detailSeed.desired.contentTypeId = "00000000-0000-4000-8000-000000000011";
    detailSeed.desired.name = `  ${String(detailSeed.desired.name)}  `;
    delete detailSeed.desired.related;
    const detail = await FULL_SITE_RESOURCE_ADAPTERS.detail_page.validateDesired({
      operation: "create",
      currentId: null,
      key: detailSeed.key,
      desired: detailSeed.desired,
      actorId: ACTOR_ID,
    });
    expect(detail?.name).toBe(String(detailSeed.desired.name).trim());
    expect(detail?.status).toBe(detailSeed.desired.status);
    expect(Object.prototype.hasOwnProperty.call(detail, "id")).toBe(false);

    const menu = {
      ...menuDesired("Canonical menu"),
      extras: [],
      items: [
        { ...menuDesired("x").items[0]!, id: crypto.randomUUID(), orderIndex: 7 },
        { ...menuDesired("x").items[0]!, id: crypto.randomUUID(), orderIndex: 3 },
      ],
    };
    const menuAdapter = createMenuResourceAdapter();
    const normalizedMenu = await menuAdapter.validateDesired({
      operation: "create",
      currentId: null,
      key: "canonical-menu",
      desired: menu,
      actorId: ACTOR_ID,
    });
    expect(normalizedMenu?.document).toBeNull();
    expect(normalizedMenu?.extras).toBeNull();
    expect(
      (normalizedMenu?.items as Array<{ orderIndex: number }>).map((item) => item.orderIndex)
    ).toEqual([3, 7]);
    expect(JSON.parse(JSON.stringify(normalizedMenu))).toEqual(normalizedMenu);

    const nestedOrderReuse = structuredClone(menu);
    nestedOrderReuse.items.push({
      ...nestedOrderReuse.items[0]!,
      id: crypto.randomUUID(),
      parentId: nestedOrderReuse.items[0]!.id,
      orderIndex: nestedOrderReuse.items[1]!.orderIndex,
    });
    expect(
      await menuAdapter.validateDesired({
        operation: "create",
        currentId: null,
        key: "nested-order-menu",
        desired: nestedOrderReuse,
        actorId: ACTOR_ID,
      })
    ).toBeDefined();

    const orphan = structuredClone(menu);
    orphan.items[0]!.parentId = crypto.randomUUID();
    expect(() =>
      menuAdapter.validateDesired({
        operation: "create",
        currentId: null,
        key: "orphan-menu",
        desired: orphan,
        actorId: ACTOR_ID,
      })
    ).toThrow("menu_invalid");
    const duplicateMenuOrder = structuredClone(menu);
    duplicateMenuOrder.items[0]!.orderIndex = duplicateMenuOrder.items[1]!.orderIndex;
    expect(() =>
      menuAdapter.validateDesired({
        operation: "create",
        currentId: null,
        key: "duplicate-order-menu",
        desired: duplicateMenuOrder,
        actorId: ACTOR_ID,
      })
    ).toThrow("menu_invalid");
  });

  test("passes canonical form and menu aggregates unchanged to native writes", async () => {
    const formWrites: unknown[] = [];
    const formAdapter = createFormResourceAdapter({
      createForm: async (input) => {
        formWrites.push(input);
        return { id: "form-id" } as Awaited<ReturnType<typeof createForm>>;
      },
      setFormFields: async (_id, fields) => {
        formWrites.push(fields);
        return [] as Awaited<ReturnType<typeof setFormFields>>;
      },
      setFormActions: async (_id, actions) => {
        formWrites.push(actions);
        return [] as Awaited<ReturnType<typeof setFormActions>>;
      },
    });
    const rawForm = formDesired("native-write-form");
    rawForm.name = "  Native write form  ";
    rawForm.actions = [
      {
        id: "00000000-0000-4000-8000-000000000031",
        type: "success_message",
        config: { message: "  Done  " },
        orderIndex: 7,
      },
    ];
    const formInput = {
      operation: "create" as const,
      currentId: null,
      key: "native-write-form",
      desired: rawForm,
      actorId: ACTOR_ID,
    };
    const canonicalForm = await formAdapter.validateDesired(formInput);
    if (!canonicalForm) throw new Error("form_fixture_invalid");
    await formAdapter.applyDesired({ ...formInput, desired: canonicalForm });
    expect(formWrites).toEqual([
      Object.fromEntries(
        Object.entries(canonicalForm).filter(([key]) => key !== "fields" && key !== "actions")
      ),
      canonicalForm.fields,
      canonicalForm.actions,
    ]);

    const menuWrites: unknown[] = [];
    const menuAdapter = createMenuResourceAdapter({
      createMenu: async (input) => {
        menuWrites.push(input);
        return { id: "menu-id" } as Awaited<ReturnType<typeof createMenu>>;
      },
      updateMenu: async (_id, input) => {
        menuWrites.push(input);
        return { id: "menu-id" } as Awaited<ReturnType<typeof updateMenu>>;
      },
      replaceMenuItems: async (_id, items) => {
        menuWrites.push(items);
        return [] as Awaited<ReturnType<typeof replaceMenuItems>>;
      },
    });
    const rawMenu = { ...menuDesired("  Native menu  "), extras: [] };
    const menuInput = {
      operation: "create" as const,
      currentId: null,
      key: "native-menu",
      desired: rawMenu,
      actorId: ACTOR_ID,
    };
    const canonicalMenu = await menuAdapter.validateDesired(menuInput);
    if (!canonicalMenu) throw new Error("menu_fixture_invalid");
    await menuAdapter.applyStaged({ ...menuInput, desired: canonicalMenu });
    const nativeMenu = Object.fromEntries(
      Object.entries(canonicalMenu).filter(([key]) => key !== "status" && key !== "items")
    );
    expect(menuWrites).toEqual([
      { ...nativeMenu, status: "draft" },
      nativeMenu,
      canonicalMenu.items,
    ]);
  });

  test("persists ordinary create and update intents before each native mutation", async () => {
    const events: string[] = [];
    const before = { name: "Before", slug: "managed", status: "published" };
    const createId = "00000000-0000-4000-8000-000000000031";
    const updateId = "00000000-0000-4000-8000-000000000032";
    const pkg: FullSitePackageV1 = {
      schemaVersion: 1,
      key: "write-ahead-order",
      metadata: { name: "Write ahead", locale: "en" },
      resources: {
        contentTypes: [
          { key: "create", desired: { name: "Create", slug: "create", status: "published" } },
          { key: "update", desired: { name: "After", slug: "managed", status: "published" } },
        ],
        forms: [],
        pageTemplates: [],
        listingTemplates: [],
        entries: [],
        listingQueries: [],
        detailPages: [],
        pages: [],
        menus: [],
        settings: [
          { key: "site.name", desired: { value: "After name" } },
          { key: "site.locale", desired: { value: "pl" } },
        ],
      },
    };
    const planning = new Map<string, FullSiteNativeSnapshot>([
      ["content_type:update", { id: updateId, desired: before }],
      ["setting:site.name", { id: "site.name", desired: { value: "before" } }],
      ["setting:site.locale", { id: "site.locale", desired: { value: "before" } }],
    ]);
    const native = new Map<string, FullSiteNativeSnapshot>([
      [`content_type:${updateId}`, { id: updateId, desired: before }],
      ["setting:site.name", { id: "site.name", desired: { value: "before" } }],
      ["setting:site.locale", { id: "site.locale", desired: { value: "before" } }],
    ]);
    const rows = new Map<number, PersistedFullSiteInstallLedgerItem>();
    const ledger: FullSiteInstallLedgerPort = {
      withPackageLock: async (_reservation, execute) =>
        execute({ intent: "apply", ownerRunId: "run", resumePhase: "reserved" }),
      createRun: async () => ({ id: "unused" }),
      recordItem: async (input) => {
        if (input.operation === "delete" || input.operation === "restore") {
          throw new Error("unexpected_rollback_item");
        }
        const phase = readFullSiteDurableAfterSnapshotV1(input.afterSnapshot)?.recovery.phase;
        events.push(`phase:${input.key}:${phase}`);
        rows.set(input.position, {
          ...input,
          operation: input.operation,
          rollbackAction: input.rollbackAction ?? null,
          error: input.error ?? null,
        });
      },
      finalizeRun: async () => undefined,
      getRun: async () => null,
      listItems: async () =>
        [...rows.values()].sort((left, right) => left.position - right.position),
      listRawItems: async () =>
        [...rows.values()]
          .sort((left, right) => left.position - right.position)
          .map((item) => ({ ...item, error: item.error ?? null })),
      initializeReservedRun: async (input) => {
        events.push(`initialize:${input.items.map((item) => item.key).join(",")}`);
        for (const item of input.items) {
          rows.set(item.position, {
            ...item,
            status: "planned",
            error: null,
          });
        }
        return { id: input.ownerRunId };
      },
      finalizeOwnedRun: async (input) => {
        events.push(`final:${input.status}`);
        return { outcome: "desired_terminal" };
      },
      createRollbackRun: async () => ({ id: "unused-rollback" }),
      hasSuccessfulRollback: async () => false,
      findManagedResourceEvidence: async () => null,
    };
    const contentTypeAdapter = {
      ...FULL_SITE_RESOURCE_ADAPTERS.content_type,
      validateDesired: (input: Parameters<ResourceAdapter["validateDesired"]>[0]) => input.desired,
      prepareNativeTargets: async (
        input: Parameters<typeof FULL_SITE_RESOURCE_ADAPTERS.content_type.prepareNativeTargets>[0]
      ) => ({
        staged: null,
        complete: {
          id: input.operation === "create" ? input.intendedId : input.currentId,
          desired: structuredClone(input.desired),
        },
      }),
      captureSnapshotById: async (id: string) => {
        const snapshot = native.get(`content_type:${id}`);
        if (!snapshot) throw new Error("content_type_not_found");
        return structuredClone(snapshot);
      },
      applyDesired: async (input: AdapterApplyInput) => {
        assertFullSiteSagaAdapterApplyInput(input);
        events.push(`native:${input.key}`);
        native.set(
          `content_type:${input.targetSnapshot.id}`,
          structuredClone(input.targetSnapshot)
        );
        return structuredClone(input.targetSnapshot);
      },
    };
    const settingAdapter = {
      ...FULL_SITE_RESOURCE_ADAPTERS.setting,
      validateDesired: (input: Parameters<ResourceAdapter["validateDesired"]>[0]) => input.desired,
      prepareNativeTargets: async (
        input: Parameters<typeof FULL_SITE_RESOURCE_ADAPTERS.setting.prepareNativeTargets>[0]
      ) => ({ staged: null, complete: { id: input.key, desired: structuredClone(input.desired) } }),
      captureSnapshotById: async (id: string) =>
        structuredClone(native.get(`setting:${id}`) ?? { id, desired: { present: false } }),
      applySettingsBatchAtomic: async ({ items }: FullSiteSettingsApplyBatchInput) => {
        events.push("native:settings-batch");
        return items.map((input) => {
          assertFullSiteSagaAdapterApplyInput(input);
          native.set(`setting:${input.targetSnapshot.id}`, structuredClone(input.targetSnapshot));
          return structuredClone(input.targetSnapshot);
        });
      },
    };
    await applyFullSitePackage(
      { package: pkg, actorId: ACTOR_ID, allowSettingTakeover: true },
      {
        ledger,
        generateId: () => createId,
        loadPlanningSnapshot: async (resources) =>
          resources.map((resource) => {
            const current = planning.get(resource.identity) ?? null;
            return {
              identity: resource.identity,
              evidence:
                resource.identity === "content_type:update" && current
                  ? { runId: "managed-run", resourceId: current.id }
                  : null,
              current,
            };
          }),
        adapters: {
          ...FULL_SITE_RESOURCE_ADAPTERS,
          content_type: contentTypeAdapter,
          setting: settingAdapter,
        },
      }
    );
    expect(events).toEqual([
      "initialize:create,update,site.name,site.locale",
      "native:create",
      "phase:create:complete",
      "native:update",
      "phase:update:complete",
      "native:settings-batch",
      "phase:site.name:complete",
      "phase:site.locale:complete",
      "final:success",
    ]);
    expect([...rows.values()].every((row) => row.status === "success")).toBe(true);
  });

  test("classifies every interrupted durable target by exact id without deciding recovery", async () => {
    const prepared = (
      overrides: Partial<PersistedFullSiteInstallLedgerItem>
    ): PersistedFullSiteInstallLedgerItem => ({
      position: 0,
      kind: "page",
      key: "created",
      operation: "create",
      status: "planned",
      beforeSnapshot: null,
      afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
        complete: { id: "created-id", desired: { marker: "after" } },
        staged: null,
        phase: "prepared",
      }),
      rollbackAction: null,
      error: null,
      ...overrides,
    });
    const items = [
      prepared({}),
      prepared({
        position: 1,
        key: "updated",
        operation: "update",
        beforeSnapshot: { id: "updated-id", desired: { marker: "before" } },
        afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
          complete: { id: "updated-id", desired: { marker: "after" } },
          staged: null,
          phase: "prepared",
        }),
      }),
      ...["site.name", "site.locale"].map((key, index) =>
        prepared({
          position: index + 2,
          kind: "setting",
          key,
          operation: "update",
          beforeSnapshot: { id: key, desired: { value: "before" } },
          afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
            complete: { id: key, desired: { value: "after" } },
            staged: null,
            phase: "prepared",
          }),
        })
      ),
    ];
    const expectedIds: string[] = [];
    const exact = await classifyInterruptedSagaItems({
      items,
      resolveCurrentResource: async (_kind, seed, expectedId) => {
        expectedIds.push(expectedId ?? "missing");
        return { id: expectedId!, desired: seed.desired };
      },
    });
    expect(exact.map(({ identity, hint }) => [identity, hint])).toEqual([
      ["page:created", "applied"],
      ["page:updated", "applied"],
      ["setting:site.name", "applied"],
      ["setting:site.locale", "applied"],
    ]);
    expect(expectedIds).toEqual(["created-id", "updated-id", "site.name", "site.locale"]);

    const notApplied = await classifyInterruptedSagaItems({
      items,
      resolveCurrentResource: async (_kind, seed, expectedId) => {
        if (seed.key === "created") return null;
        const before = items.find((item) => item.key === seed.key)?.beforeSnapshot;
        return { id: expectedId!, desired: (before?.desired ?? {}) as JsonObject };
      },
    });
    expect(notApplied.map(({ hint }) => hint)).toEqual([
      "not_applied",
      "not_applied",
      "not_applied",
      "not_applied",
    ]);
  });

  test("requires stable nested ids and rejects unknown form/action/menu settings keys", async () => {
    const form = formDesired("strict-nested");
    form.actions = [
      {
        id: crypto.randomUUID(),
        type: "success_message",
        config: { message: "Done" },
      },
    ];
    const formInput = {
      operation: "create" as const,
      currentId: null,
      key: "strict-form",
      desired: form,
      actorId: ACTOR_ID,
    };
    const supportingTextInput = structuredClone(formInput);
    supportingTextInput.desired.settings = {
      theme: { submit: { label: "Send", supportingText: "We reply within one day." } },
    };
    expect(await createFormResourceAdapter().validateDesired(supportingTextInput)).toMatchObject({
      settings: {
        theme: { submit: { label: "Send", supportingText: "We reply within one day." } },
      },
    });
    const missingFieldId = structuredClone(formInput);
    delete (missingFieldId.desired.fields[0] as { id?: string }).id;
    expect(() => createFormResourceAdapter().validateDesired(missingFieldId)).toThrow(
      "form_invalid"
    );
    const unknownAction = structuredClone(formInput);
    Object.assign(unknownAction.desired.actions[0]!, { credential: "must-reject" });
    expect(() => createFormResourceAdapter().validateDesired(unknownAction)).toThrow(
      "form_invalid"
    );
    const unknownSettings = structuredClone(formInput);
    unknownSettings.desired.settings = { unknown: true };
    expect(() => createFormResourceAdapter().validateDesired(unknownSettings)).toThrow(
      "form_invalid"
    );

    const menuInput = {
      operation: "create" as const,
      currentId: null,
      key: "strict-menu",
      desired: menuDesired("Strict menu"),
      actorId: ACTOR_ID,
    };
    const missingItemId = structuredClone(menuInput);
    delete (missingItemId.desired.items[0] as { id?: string }).id;
    expect(() => createMenuResourceAdapter().validateDesired(missingItemId)).toThrow(
      "menu_invalid"
    );
    const unknownMenuSettings = structuredClone(menuInput);
    unknownMenuSettings.desired.items[0]!.settings = { token: "must-reject" };
    expect(() => createMenuResourceAdapter().validateDesired(unknownMenuSettings)).toThrow(
      "menu_invalid"
    );
  });

  test("redacts token-like errors before persisting ledger rows", async () => {
    const scope = crypto.randomUUID();
    const packageKey = `task-547-ledger-redaction-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@ledger-redaction.task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("actor_fixture_failed");
    const ledger = createLegacyInstallLedger();
    try {
      const run = await ledger.createRun({
        packageKey,
        actorId: actor.id,
        dryRun: false,
      });
      await ledger.recordItem({
        runId: run.id,
        position: 0,
        kind: "page",
        key: "home",
        operation: "create",
        status: "failed",
        beforeSnapshot: null,
        afterSnapshot: null,
        error: "site_package_token_sk_live_123456",
      });
      await ledger.finalizeRun({
        runId: run.id,
        status: "failed",
        error: "password=secret raw payload",
      });
      expect(await ledger.listItems(run.id)).toMatchObject([
        { error: "solution_kit_operation_failed" },
      ]);
      const [persisted] = await db
        .select({ error: solutionKitInstallRuns.error })
        .from(solutionKitInstallRuns)
        .where(eq(solutionKitInstallRuns.id, run.id));
      expect(persisted?.error).toBe("solution_kit_install_failed");
    } finally {
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });

  test("persists the normalized menu document as an exact JSON-safe snapshot", async () => {
    const scope = crypto.randomUUID();
    const seed = structuredClone(buildFormaDomPackage().resources.menus[0]!);
    seed.key = `json-safe-menu-${scope}`;
    seed.desired.name = `JSON-safe menu ${scope}`;
    seed.desired.location = `json-safe-${scope}`;
    if (!Array.isArray(seed.desired.items)) throw new Error("menu_fixture_invalid");
    seed.desired.items.forEach((item, index) => {
      if (!item || Array.isArray(item) || typeof item !== "object") {
        throw new Error("menu_fixture_invalid");
      }
      item.pageId = null;
      item.href = index === 0 ? "/" : `/item-${index}`;
    });
    const adapter = createMenuResourceAdapter();
    const normalized = await adapter.validateDesired({
      operation: "create",
      currentId: null,
      key: seed.key,
      desired: seed.desired,
      actorId: ACTOR_ID,
    });
    if (!normalized) throw new Error("menu_fixture_invalid");
    const result = await adapter.applyStaged({
      operation: "create",
      currentId: null,
      key: seed.key,
      desired: normalized,
      actorId: ACTOR_ID,
    });
    ownedMenus.add(result.id);
    const current = await createFullSiteCurrentResourceResolver(
      `json-safe-package-${scope}`,
      createLegacyInstallLedger()
    )("menu", { key: seed.key, desired: normalized }, result.id);
    expect(
      isDeepStrictEqual(current?.desired, {
        ...normalized,
        status: "draft",
      })
    ).toBe(true);
  });

  test("deletes a newly created form when setting actions fails", async () => {
    const slug = `task-547-form-create-${crypto.randomUUID()}`;
    const adapter = createFormResourceAdapter({
      setFormActions: async () => {
        throw new Error("injected_actions_failure");
      },
    });
    await expect(
      adapter.applyDesired({
        operation: "create",
        currentId: null,
        key: slug,
        desired: formDesired(slug),
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("injected_actions_failure");
    expect((await listForms()).some((form) => form.slug === slug)).toBe(false);
  }, 360_000);

  test("restores the exact form aggregate when setting actions fails on update", async () => {
    const slug = `task-547-form-update-${crypto.randomUUID()}`;
    const created = await createForm({
      name: "Before",
      slug,
      status: "draft",
      description: "before",
      submissionAccess: "public",
      settings: { marker: "before" },
    });
    if (!created) throw new Error("form_fixture_failed");
    ownedForms.add(created.id);
    await setFormFields(created.id, []);
    await setFormActions(created.id, []);
    const before = {
      form: await getForm(created.id),
      fields: await listFormFields(created.id),
      actions: await listFormActions(created.id),
    };
    let calls = 0;
    const adapter = createFormResourceAdapter({
      setFormActions: async (id, actions) => {
        calls += 1;
        if (calls === 1) throw new Error("injected_actions_failure");
        return setFormActions(id, actions);
      },
    });
    await expect(
      adapter.applyDesired({
        operation: "update",
        currentId: created.id,
        key: slug,
        desired: formDesired(slug),
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("injected_actions_failure");
    const restored = await getForm(created.id);
    expect(restored && { ...restored, updatedAt: before.form?.updatedAt }).toEqual(before.form);
    expect(await listFormFields(created.id)).toEqual(before.fields);
    expect(await listFormActions(created.id)).toEqual(before.actions);
  }, 360_000);

  test("deletes a newly created menu when replacing items fails", async () => {
    const name = `TASK-547 menu create ${crypto.randomUUID()}`;
    const adapter = createMenuResourceAdapter({
      replaceMenuItems: async () => {
        throw new Error("injected_items_failure");
      },
    });
    await expect(
      adapter.applyStaged({
        operation: "create",
        currentId: null,
        key: name,
        desired: menuDesired(name),
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("injected_items_failure");
    expect((await listMenus()).some((menu) => menu.name === name)).toBe(false);
  });

  test("deletes a newly created menu when applying its design state fails", async () => {
    const name = `TASK-547 menu design ${crypto.randomUUID()}`;
    const adapter = createMenuResourceAdapter({
      updateMenu: async () => {
        throw new Error("injected_menu_update_failure");
      },
    });
    await expect(
      adapter.applyStaged({
        operation: "create",
        currentId: null,
        key: name,
        desired: menuDesired(name),
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("injected_menu_update_failure");
    expect((await listMenus()).some((menu) => menu.name === name)).toBe(false);
  });

  test("restores the exact menu aggregate when replacing items fails on update", async () => {
    const name = `TASK-547 menu update ${crypto.randomUUID()}`;
    const created = await createMenu({ name, status: "draft" });
    if (!created) throw new Error("menu_fixture_failed");
    ownedMenus.add(created.id);
    await updateMenu(created.id, { appearance: null, document: null });
    await replaceMenuItems(created.id, []);
    const before = {
      menu: await getMenu(created.id),
      items: await listMenuItems(created.id),
    };
    let calls = 0;
    const adapter = createMenuResourceAdapter({
      replaceMenuItems: async (id, items) => {
        calls += 1;
        if (calls === 1) throw new Error("injected_items_failure");
        return replaceMenuItems(id, items);
      },
    });
    await expect(
      adapter.applyStaged({
        operation: "update",
        currentId: created.id,
        key: name,
        desired: menuDesired(name),
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("injected_items_failure");
    expect(await getMenu(created.id)).toEqual(before.menu);
    expect(await listMenuItems(created.id)).toEqual(before.items);
  });
});
