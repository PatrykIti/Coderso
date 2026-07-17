import { expect, test } from "bun:test";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import { executeGuidedSiteBuilder } from "../../../core/services/assistant/siteBuilderExecutor";
import type { AssistantSiteKitPlanInput } from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantUndoManifestItem } from "../../../core/services/assistant/actionUndoManifest";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";

import { createActionExecutorTestDeps } from "./support/actionExecutorTestDeps";

import { buildExecutorSiteKitPlan } from "./support/actionExecutorFixtures";

const createDeps = () => createActionExecutorTestDeps().deps;

test("executeAssistantActionPlan creates resources and reuses idempotency key", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );

  expect(first.summary.failed).toBe(0);
  expect(first.summary.create).toBe(7);
  expect(first.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(first.results.some((item) => item.publicHref === "/projekty-domow")).toBe(true);
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBe(deps.__state.detailPages[0]?.id);
  expect(second.summary).toEqual(first.summary);
  expect(second.results).toEqual(first.results);
  expect(second.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
});

test("executeAssistantActionPlan rejects memory idempotency conflicts", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();
  const idempotencyKey = "assistant-house-projects-memory-conflict-1";

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey,
    },
    deps
  );

  await expect(
    executeAssistantActionPlan(
      {
        plan: { ...plan, id: "plan-house-projects-changed" },
        actorId: "user-1",
        idempotencyKey,
      },
      deps
    )
  ).rejects.toThrow("assistant_action_idempotency_conflict");

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-2",
        idempotencyKey,
      },
      deps
    )
  ).rejects.toThrow("assistant_action_idempotency_conflict");
});

test("executeAssistantActionPlan replays persisted idempotency result", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();
  type SavedExecution = {
    idempotencyKey: string;
    actorId: string;
    planId: string;
    planHash: string;
    result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
    undoItems?: AssistantUndoManifestItem[];
  };
  let saved: SavedExecution | null = null;

  const persistentDeps = Object.assign(deps, {
    getExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
    }) => {
      if (
        saved &&
        saved.idempotencyKey === input.idempotencyKey &&
        saved.actorId === input.actorId &&
        saved.planId === input.planId &&
        saved.planHash === input.planHash
      ) {
        return saved.result;
      }
      return null;
    },
    saveExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
      result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
      undoItems?: AssistantUndoManifestItem[];
    }) => {
      saved = input;
    },
  });

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );

  const savedRecord = saved as unknown as SavedExecution;
  expect(savedRecord.planId).toBe(plan.id);
  expect(savedRecord.result.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(savedRecord.undoItems?.length).toBe(first.results.length);
  expect(
    savedRecord.undoItems?.some(
      (item: AssistantUndoManifestItem) =>
        item.actionType === "content-type.upsert" &&
        item.resourceType === "content-type" &&
        item.undoStrategy === "delete"
    )
  ).toBe(true);
  expect(first.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(second.summary).toEqual(first.summary);
  expect(second.results).toEqual(first.results);
  expect(second.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
});

test("executeAssistantActionPlan propagates idempotency conflicts", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = Object.assign(createDeps(), {
    getExecutionResult: async () => {
      throw new Error("assistant_action_idempotency_conflict");
    },
    saveExecutionResult: async () => undefined,
  });

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-house-projects-conflict-1",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_idempotency_conflict");
});

test("dryRunAssistantActionPlan supports product catalog preset through the same executor contract", async () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(7);
  expect(preview.changes.some((change) => change.targetType === "detail-page")).toBe(true);
  expect(preview.changes.some((change) => change.targetKey === "products")).toBe(true);
  expect(preview.changes.some((change) => change.targetKey === "/produkty")).toBe(true);
});

test("dryRunAssistantActionPlan previews site-kit recommend and install actions", async () => {
  const plan = buildExecutorSiteKitPlan();

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes.map((change) => change.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  expect(preview.changes[0]?.operation).toBe("noop");
  expect(preview.changes[1]?.operation).toBe("create");
  expect(preview.changes[1]?.details?.siteKit?.plan?.selectedKitId).toBe("automotive-workshop");
});

test("executeAssistantActionPlan delegates site-kit install to guided site-builder executor", async () => {
  const plan = buildExecutorSiteKitPlan();

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-site-kit-install-1",
    },
    createDeps()
  );

  const installResult = result.results.find((item) => item.type === "site-kit.install");
  expect(result.summary.failed).toBe(0);
  expect(result.summary.create).toBe(1);
  expect(result.summary.noop).toBe(1);
  expect(installResult?.resourceId).toBe("run-site-kit-1");
  expect(installResult?.details?.siteKit?.execution?.validation.status).toBe("ok");
});

test("executeAssistantActionPlan passes Advanced runtime overrides through site-kit install map", async () => {
  const plan = buildExecutorSiteKitPlan();
  const installAction = plan.actions.find((item) => item.type === "site-kit.install");
  if (!installAction || installAction.type !== "site-kit.install") {
    throw new Error("site_kit_install_action_missing");
  }
  const advancedRuntimeOverrides = {
    schemaVersion: 1,
    hero: {
      variantId: "split",
      widgetType: "hero",
      widgetVariantId: "split",
      module: "content",
      alias: "hero",
    },
  } satisfies NonNullable<AssistantSiteKitPlanInput["advancedRuntimeOverrides"]>;
  installAction.input.advancedRuntimeOverrides = advancedRuntimeOverrides;
  let capturedInput: Parameters<typeof executeGuidedSiteBuilder>[0] | null = null;
  const deps = createDeps();
  const wrappedDeps = Object.assign(deps, {
    executeSiteKit: (async (input) => {
      capturedInput = input;
      return deps.executeSiteKit(input);
    }) as typeof executeGuidedSiteBuilder,
  });

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-site-kit-install-advanced-runtime-1",
    },
    wrappedDeps
  );

  expect(capturedInput).not.toBeNull();
  expect(
    (capturedInput as unknown as Parameters<typeof executeGuidedSiteBuilder>[0])
      .advancedRuntimeOverrides
  ).toEqual(advancedRuntimeOverrides);
});
