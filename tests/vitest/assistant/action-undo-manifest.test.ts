import { expect, test } from "vitest";

import { buildAssistantUndoManifestItems } from "../../../core/services/assistant/actionUndoManifest";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import type {
  AssistantActionDryRunResult,
  AssistantActionExecutionItem,
  AssistantActionPlan,
  AssistantActionPreviewChange,
} from "../../../core/services/assistant/actionPlanTypes";

const changeFor = (
  result: AssistantActionExecutionItem,
  dependencies: AssistantActionPreviewChange["dependencies"] = []
): AssistantActionPreviewChange => ({
  actionId: result.actionId,
  type: result.type,
  targetType: result.targetType,
  targetKey: result.targetKey,
  operation: result.operation,
  summary: result.message,
  warnings: [],
  conflicts: [],
  dependencies,
});

test("buildAssistantUndoManifestItems records delete provenance for created resources", () => {
  const plan = buildHouseProjectsCatalogPlan();
  const contentTypeAction = plan.actions.find((action) => action.type === "content-type.upsert");
  if (!contentTypeAction) throw new Error("missing content type action");

  const result: AssistantActionExecutionItem = {
    actionId: contentTypeAction.id,
    type: contentTypeAction.type,
    targetType: "content-type",
    targetKey: "house-projects",
    operation: "create",
    status: "success",
    resourceId: "type-1",
    adminHref: "/admin/advanced/engine/type-1",
    publicHref: null,
    message: "Content type created.",
  };
  const preview: AssistantActionDryRunResult = {
    plan,
    changes: [
      changeFor(result, [
        {
          actionId: "custom-screen-house-projects",
          targetType: "custom-screen",
          targetKey: "House Projects",
          optional: false,
        },
      ]),
    ],
    warnings: [],
    readyToExecute: true,
  };

  const [item] = buildAssistantUndoManifestItems({ plan, preview, results: [result] });

  expect(item).toMatchObject({
    actionId: contentTypeAction.id,
    actionType: "content-type.upsert",
    operation: "create",
    resourceType: "content-type",
    resourceId: "type-1",
    resourceKey: "house-projects",
    createdByAssistant: true,
    undoStrategy: "delete",
    status: "available",
    dependencyKeys: ["custom-screen:House Projects"],
  });
  expect(item?.afterFingerprint).toMatch(/^[a-f0-9]{64}$/);
});

test("buildAssistantUndoManifestItems marks references and non-mutating actions safely", () => {
  const plan = buildHouseProjectsCatalogPlan();
  const pageAction = plan.actions.find((action) => action.type === "page.upsert");
  if (!pageAction) throw new Error("missing page action");
  const siteKitPlan = {
    ...plan,
    actions: [
      {
        id: "site-kit-recommend",
        type: "site-kit.recommend" as const,
        title: "Recommend kit",
        description: "Recommend kit",
        input: {
          businessType: "automotive_workshop" as const,
          goals: ["lead_generation" as const],
          locale: "en",
          preview: {
            plan: { selectedKitId: "automotive-workshop" },
          },
        },
      },
    ],
  } as unknown as AssistantActionPlan;

  const pageResult: AssistantActionExecutionItem = {
    actionId: pageAction.id,
    type: pageAction.type,
    targetType: "page",
    targetKey: "/projekty-domow",
    operation: "update",
    status: "success",
    resourceId: "page-1",
    adminHref: "/admin/pages/page-1",
    publicHref: "/projekty-domow",
    message: "Page updated.",
  };
  const recommendResult: AssistantActionExecutionItem = {
    actionId: "site-kit-recommend",
    type: "site-kit.recommend",
    targetType: "site-kit",
    targetKey: "automotive-workshop",
    operation: "noop",
    status: "success",
    resourceId: "automotive-workshop",
    adminHref: "/admin/advanced/solution-kits",
    publicHref: null,
    message: "Recommended kit.",
  };

  const [pageItem] = buildAssistantUndoManifestItems({
    plan,
    preview: { plan, changes: [changeFor(pageResult)], warnings: [], readyToExecute: true },
    results: [pageResult],
  });
  const [recommendItem] = buildAssistantUndoManifestItems({
    plan: siteKitPlan,
    preview: {
      plan: siteKitPlan,
      changes: [changeFor(recommendResult)],
      warnings: [],
      readyToExecute: true,
    },
    results: [recommendResult],
  });

  expect(pageItem).toMatchObject({
    operation: "update",
    undoStrategy: "restore-snapshot",
    status: "available",
    publicImpact: ["publicHref:/projekty-domow", "public-page"],
  });
  expect(recommendItem).toMatchObject({
    undoStrategy: "blocked",
    status: "manual-only",
    createdByAssistant: false,
  });
});
