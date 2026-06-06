import { expect, test } from "bun:test";

import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "../../../core/services/assistant/siteBuilderExecutor";
import type { GuidedSiteBuilderPlanInput } from "../../../core/services/assistant/siteBuilderPlanAdapter";
import { getSolutionKitFromCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import type {
  ApplySolutionKitInstallInput,
  SolutionKitInstallItemRecord,
  SolutionKitInstallRunRecord,
} from "../../../core/services/kits/solutionKitsInstallService";
import type { SolutionKitDefinition } from "../../../core/services/kits/solutionKitTypes";

const now = new Date("2026-02-20T12:00:00.000Z");

const makeRun = (
  overrides: Partial<SolutionKitInstallRunRecord> = {}
): SolutionKitInstallRunRecord => ({
  id: "run-1",
  kitId: "automotive-workshop",
  mode: "apply",
  status: "success",
  actorId: "user-1",
  rollbackOfRunId: null,
  options: {},
  summary: {
    total: 1,
    success: 1,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: {
      create: 1,
      update: 0,
      noop: 0,
      delete: 0,
      restore: 0,
    },
  },
  error: null,
  createdAt: now,
  updatedAt: now,
  finishedAt: now,
  ...overrides,
});

const makeItem = (
  overrides: Partial<SolutionKitInstallItemRecord> = {}
): SolutionKitInstallItemRecord => ({
  id: "item-1",
  runId: "run-1",
  position: 1,
  resourceType: "page",
  resourceKey: "home",
  operation: "create",
  status: "success",
  beforeSnapshot: null,
  afterSnapshot: { id: "page-home" },
  rollbackAction: null,
  error: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const getCatalogKit = (
  id: "automotive-workshop" | "local-service-business"
): SolutionKitDefinition => {
  const kit = getSolutionKitFromCatalog(id);
  if (!kit) throw new Error("missing_test_kit");
  return kit;
};

test("previewGuidedSiteBuilderPlan is deterministic and keeps fixed steps", () => {
  const input = {
    businessType: "automotive_workshop" as const,
    goals: ["lead_generation", "online_booking"],
    locale: "pl",
    siteName: "AutoFix",
    selectedKitId: "automotive-workshop" as const,
    enabledStepIds: ["pages"],
  } satisfies GuidedSiteBuilderPlanInput;

  const first = previewGuidedSiteBuilderPlan(input);
  const second = previewGuidedSiteBuilderPlan(input);

  expect(first).toEqual(second);
  expect(first.enabledStepIds).toEqual(["settings", "pages", "qa"]);
  expect(first.actions.some((action) => action.target === "form")).toBe(false);
  expect(first.actions.some((action) => action.target === "content_type")).toBe(false);
  expect(first.actions.some((action) => action.stepId === "settings")).toBe(true);
  expect(first.actions.some((action) => action.stepId === "qa")).toBe(true);
});

test("executeGuidedSiteBuilder filters kit resources by enabled steps and returns validation", async () => {
  const selectedKit = getCatalogKit("automotive-workshop");
  const selectedManifest = selectedKit.manifest;
  if (!selectedManifest) throw new Error("missing_test_manifest");
  let capturedApplyInput: ApplySolutionKitInstallInput | null = null;

  const executionResult = {
    run: makeRun(),
    items: [makeItem()],
    summary: {
      total: 1,
      success: 1,
      failed: 0,
      planned: 0,
      skipped: 0,
      operations: {
        create: 1,
        update: 0,
        noop: 0,
        delete: 0,
        restore: 0,
      },
    },
    manifest: selectedManifest,
    templateInstall: {
      summary: {
        total: 0,
        success: 0,
        failed: 0,
        planned: 0,
        operations: {
          create: 0,
          update: 0,
          noop: 0,
        },
      },
      items: [],
      results: [],
      rollbackPlan: [],
    },
  };

  const result = await executeGuidedSiteBuilder(
    {
      businessType: "automotive_workshop",
      goals: ["lead_generation", "online_booking"],
      locale: "en",
      siteName: "AutoFix",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
      dryRun: true,
      continueOnError: true,
    },
    {
      buildPlan: () => ({
        recommendedKitId: "automotive-workshop",
        confidence: 90,
        recommendations: [],
        steps: [
          {
            id: "settings",
            type: "settings",
            title: "Settings",
            description: "Apply settings",
            editable: false,
            affectsResources: [],
          },
          {
            id: "content-model",
            type: "content-model",
            title: "Content model",
            description: "Apply content model",
            editable: true,
            affectsResources: ["content_type"],
          },
          {
            id: "pages",
            type: "pages",
            title: "Pages",
            description: "Apply pages",
            editable: true,
            affectsResources: ["page"],
          },
          {
            id: "forms",
            type: "forms",
            title: "Forms",
            description: "Apply forms",
            editable: true,
            affectsResources: ["form"],
          },
          {
            id: "navigation",
            type: "navigation",
            title: "Navigation",
            description: "Apply navigation",
            editable: true,
            affectsResources: ["menu"],
          },
          {
            id: "qa",
            type: "qa",
            title: "QA",
            description: "Run checks",
            editable: false,
            affectsResources: [],
          },
        ],
        settingsPatch: { "site.locale": "en" },
        notes: ["generated"],
      }),
      getKitById: (id) => (id === "automotive-workshop" ? selectedKit : null),
      apply: async (input) => {
        capturedApplyInput = input;
        return executionResult;
      },
      getRun: async () => null,
      listItems: async () => [],
    }
  );

  const captured = capturedApplyInput as unknown as ApplySolutionKitInstallInput;
  expect(captured).toBeTruthy();
  expect(captured.kitDefinitionOverride?.resourceBlueprint.pages.length).toBeGreaterThan(0);
  expect(captured.kitDefinitionOverride?.resourceBlueprint.templates).toEqual(
    selectedKit.resourceBlueprint.templates ?? []
  );
  expect(captured.kitDefinitionOverride?.resourceBlueprint.contentTypes).toHaveLength(0);
  expect(captured.kitDefinitionOverride?.resourceBlueprint.forms).toHaveLength(0);
  expect(captured.kitDefinitionOverride?.resourceBlueprint.menus).toHaveLength(0);

  const runOptions = captured.runOptions as
    | { assistantSiteBuilder?: { enabledStepIds?: string[] } }
    | undefined;
  expect(runOptions?.assistantSiteBuilder?.enabledStepIds).toEqual(["settings", "pages", "qa"]);

  expect(result.validation.status).toBe("ok");
  expect(result.validation.unresolvedItems).toHaveLength(0);
  expect(result.actions.some((action) => action.target === "template")).toBe(true);
});

test("executeGuidedSiteBuilder applies Advanced runtime overrides to executable kit copy", async () => {
  const selectedKit = getCatalogKit("local-service-business");
  const selectedManifest = selectedKit.manifest;
  if (!selectedManifest) throw new Error("missing_test_manifest");
  let capturedApplyInput: ApplySolutionKitInstallInput | null = null;

  const originalHomeData = selectedKit.resourceBlueprint.pages.find((page) => page.slug === "")
    ?.data as { blocks?: Array<Record<string, unknown>> } | undefined;

  const executionResult = {
    run: makeRun({ kitId: "local-service-business" }),
    items: [makeItem()],
    summary: {
      total: 1,
      success: 1,
      failed: 0,
      planned: 0,
      skipped: 0,
      operations: {
        create: 1,
        update: 0,
        noop: 0,
        delete: 0,
        restore: 0,
      },
    },
    manifest: selectedManifest,
    templateInstall: {
      summary: {
        total: 0,
        success: 0,
        failed: 0,
        planned: 0,
        operations: {
          create: 0,
          update: 0,
          noop: 0,
        },
      },
      items: [],
      results: [],
      rollbackPlan: [],
    },
  };

  await executeGuidedSiteBuilder(
    {
      businessType: "custom",
      goals: ["lead_generation"],
      locale: "en",
      siteName: "Local Pro",
      selectedKitId: "local-service-business",
      enabledStepIds: ["settings", "pages", "navigation", "qa"],
      dryRun: true,
      advancedRuntimeOverrides: {
        schemaVersion: 1,
        menu: {
          behaviorIds: ["sticky", "mobile-drawer"],
          variantId: "with-cta",
          sticky: true,
          transparent: false,
          mobileMode: "drawer",
          ctaTargetPageRole: "contact",
        },
        hero: {
          variantId: "media-left",
          widgetType: "hero",
          widgetVariantId: "media-left",
          module: "content",
          alias: "hero",
        },
        sectionVariants: [
          {
            variantId: "proof-spotlight",
            sectionRoleId: "proof",
            alias: "testimonials",
            widgetType: "testimonials",
            widgetVariantId: "spotlight",
            module: "engagement",
          },
          {
            variantId: "faq-two-column",
            sectionRoleId: "faq",
            alias: "faq",
            widgetType: "faq-accordion",
            widgetVariantId: "two-column",
            module: "engagement",
          },
        ],
      },
    },
    {
      buildPlan: () => ({
        recommendedKitId: "local-service-business",
        confidence: 90,
        recommendations: [],
        steps: [
          {
            id: "settings",
            type: "settings",
            title: "Settings",
            description: "Apply settings",
            editable: false,
            affectsResources: [],
          },
          {
            id: "pages",
            type: "pages",
            title: "Pages",
            description: "Apply pages",
            editable: true,
            affectsResources: ["page"],
          },
          {
            id: "navigation",
            type: "navigation",
            title: "Navigation",
            description: "Apply navigation",
            editable: true,
            affectsResources: ["menu"],
          },
          {
            id: "qa",
            type: "qa",
            title: "QA",
            description: "Run checks",
            editable: false,
            affectsResources: [],
          },
        ],
        settingsPatch: { "site.locale": "en" },
        notes: ["generated"],
      }),
      getKitById: (id) => (id === "local-service-business" ? selectedKit : null),
      apply: async (input) => {
        capturedApplyInput = input;
        return executionResult;
      },
      getRun: async () => null,
      listItems: async () => [],
    }
  );

  const captured = capturedApplyInput as unknown as ApplySolutionKitInstallInput;
  const executableKit = captured.kitDefinitionOverride;
  if (!executableKit) throw new Error("missing_executable_kit");
  const home = executableKit.resourceBlueprint.pages.find((page) => page.slug === "");
  const homeData = home?.data as { blocks?: Array<Record<string, unknown>> } | undefined;
  const blocks = homeData?.blocks ?? [];
  const primaryMenu = executableKit.resourceBlueprint.menus.find(
    (menu) => menu.location === "primary"
  );

  expect(blocks[0]).toMatchObject({
    type: "navigation",
    variant: "with-cta",
    data: {
      linksSource: "menu",
      cta: {
        href: "/contact",
      },
      behavior: {
        sticky: true,
        mobileMode: "drawer",
      },
    },
  });
  expect(blocks.find((block) => block.type === "hero")).toMatchObject({ variant: "media-left" });
  expect(blocks.find((block) => block.type === "testimonials")).toMatchObject({
    variant: "spotlight",
  });
  expect(blocks.find((block) => block.type === "faq-accordion")).toMatchObject({
    variant: "two-column",
  });
  expect(primaryMenu?.items?.find((item) => item.key === "assistant-advanced-cta")).toMatchObject({
    pageSlug: "contact",
  });
  expect(originalHomeData?.blocks?.[0]).toMatchObject({
    type: "hero",
  });
  expect(originalHomeData?.blocks?.[0]).not.toHaveProperty("variant");
});

test("validateGuidedSiteBuilderRun reports unresolved checks for failed items", async () => {
  const selectedKit = getCatalogKit("automotive-workshop");

  const validation = await validateGuidedSiteBuilderRun(
    {
      runId: "run-1",
    },
    {
      buildPlan: () => {
        throw new Error("not_used");
      },
      getKitById: (id) => (id === "automotive-workshop" ? selectedKit : null),
      apply: async () => {
        throw new Error("not_used");
      },
      getRun: async () =>
        makeRun({
          kitId: "unknown-kit",
          status: "failed",
          options: {
            assistantSiteBuilder: {
              selectedKitId: "automotive-workshop",
              enabledStepIds: ["forms", "qa"],
            },
          },
        }),
      listItems: async () => [
        makeItem({
          resourceType: "form",
          resourceKey: "contact",
          status: "failed",
          operation: "update",
          error: "failed",
        }),
      ],
    }
  );

  expect(validation.status).toBe("failed");
  expect(validation.unresolvedItems).toContain("1 install item(s) failed.");
  expect(
    validation.checks.some((check) => check.id === "step.forms" && check.status === "warning")
  ).toBe(true);
  expect(validation.checks.some((check) => check.id === "step.qa")).toBe(true);
});

test("validateGuidedSiteBuilderRun throws when run does not exist", async () => {
  await expect(
    validateGuidedSiteBuilderRun(
      { runId: "missing" },
      {
        buildPlan: () => {
          throw new Error("not_used");
        },
        getKitById: () => null,
        apply: async () => {
          throw new Error("not_used");
        },
        getRun: async () => null,
        listItems: async () => [],
      }
    )
  ).rejects.toThrow("site_builder_run_not_found");
});
