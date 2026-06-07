import { expect, test } from "vitest";

import {
  buildSiteBuilderIntakeCompileResult,
  type AssistantSiteBuilderIntakeCompileGate,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import {
  resolveSiteBuilderIntakeContentEngines,
  type AssistantSiteBuilderContentEngineDecision,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeContentEngines";
import { resolveSiteBuilderIntakeCustomScreens } from "../../../core/services/assistant/assistantSiteBuilderIntakeCustomScreens";
import type {
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderIntakeFacts,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

const readyFacts = (
  overrides: Partial<AssistantSiteBuilderIntakeFacts> = {}
): AssistantSiteBuilderIntakeFacts => ({
  siteName: "Editing Surface Studio",
  locale: "en",
  goals: ["show reusable content and collect leads"],
  pageRoles: ["home", "contact"],
  sectionRoles: ["value-proposition", "lead-capture"],
  mediaPolicy: "placeholder",
  readyForReview: true,
  readyForExecution: true,
  ...overrides,
});

const contentEngineDecisions = (overrides: Partial<AssistantSiteBuilderIntakeFacts> = {}) =>
  resolveSiteBuilderIntakeContentEngines(readyFacts(overrides));

const decisionIds = (
  decisions: readonly AssistantSiteBuilderContentEngineDecision[]
): AssistantSiteBuilderContentEngineId[] => decisions.map((decision) => decision.id);

const gateCodes = (
  gates: readonly AssistantSiteBuilderIntakeCompileGate[]
): AssistantSiteBuilderIntakeCompileGate["code"][] => gates.map((gate) => gate.code);

test("resolveSiteBuilderIntakeCustomScreens maps supported engines to beginner internal admin surfaces", () => {
  const engines = contentEngineDecisions({
    pageRoles: [
      "services",
      "products",
      "portfolio",
      "case-studies",
      "blog",
      "team",
      "locations",
      "faq",
      "testimonials",
    ],
    goals: [],
    sectionRoles: [],
  });

  const result = resolveSiteBuilderIntakeCustomScreens(engines);

  expect(result.schemaVersion).toBe(1);
  expect(result.gates).toEqual([]);
  expect(result.candidates.map((candidate) => candidate.engineId)).toEqual([
    "services",
    "products",
    "portfolio",
    "case-studies",
    "blog",
    "team",
    "locations",
    "faq",
    "testimonials",
  ]);
  expect(result.candidates.find((candidate) => candidate.engineId === "products")).toMatchObject({
    engineLabel: "Products",
    screenKey: "products-workspace",
    name: "Products workspace",
    contentTypeSlug: "product",
    adminPath: "/admin/advanced/custom-screens/products-workspace/entries",
    status: "supported",
    actionFamily: "custom-screen.upsert",
    collectionRole: "canonical-admin-screen",
    compositionKey: "guided-products",
    showInSidebar: true,
    sidebarLabel: "Products",
    audience: "beginner",
    permissions: ["content:read", "content:write"],
    routeMode: "internal-admin",
    createMode: "editor-view",
    rowClickMode: "editor-view",
    writeMode: "entry",
    requiresPublicWriteEndpoint: false,
  });
  expect(result.summary).toBe(
    "Beginner editing surfaces: Services, Products, Portfolio, Case studies, Blog, Team, Locations, FAQ, Testimonials."
  );
});

test("resolveSiteBuilderIntakeCustomScreens keeps static-only sites without custom screens", () => {
  const result = resolveSiteBuilderIntakeCustomScreens(
    contentEngineDecisions({
      pageRoles: ["home", "about", "pricing", "contact"],
      goals: ["publish a simple static site"],
      sectionRoles: ["value-proposition", "pricing", "contact"],
    })
  );

  expect(result.candidates).toEqual([]);
  expect(result.gates).toEqual([]);
  expect(result.summary).toBe(
    "No beginner custom-screen surfaces are needed for static-only pages."
  );
});

test("resolveSiteBuilderIntakeCustomScreens gates unsupported custom-screen adapters", () => {
  const result = resolveSiteBuilderIntakeCustomScreens(
    contentEngineDecisions({
      pageRoles: ["services", "team"],
      goals: [],
      sectionRoles: [],
    }),
    {
      supportedEngineIds: ["services"],
    }
  );

  expect(result.candidates.map((candidate) => candidate.engineId)).toEqual(["services"]);
  expect(result.gates).toEqual([
    expect.objectContaining({
      code: "custom_screen_unsupported",
      severity: "error",
      engineId: "team",
    }),
  ]);
});

test("resolveSiteBuilderIntakeCustomScreens rejects unsafe or drifted admin routes", () => {
  const result = resolveSiteBuilderIntakeCustomScreens(
    contentEngineDecisions({
      pageRoles: ["products", "blog"],
      goals: [],
      sectionRoles: [],
    }),
    {
      routeOverrides: {
        products:
          "https://example.invalid/admin/advanced/custom-screens/products-workspace/entries",
        blog: "/admin/advanced/custom-screens/../blog-workspace/entries",
      },
    }
  );

  expect(result.candidates).toEqual([]);
  expect(result.gates).toEqual([
    expect.objectContaining({
      code: "custom_screen_route_invalid",
      engineId: "products",
    }),
    expect.objectContaining({
      code: "custom_screen_route_invalid",
      engineId: "blog",
    }),
  ]);
});

test("resolveSiteBuilderIntakeCustomScreens rejects permission and write-method drift", () => {
  const result = resolveSiteBuilderIntakeCustomScreens(
    contentEngineDecisions({
      pageRoles: ["products", "blog"],
      goals: [],
      sectionRoles: [],
    }),
    {
      permissionOverrides: {
        products: ["content:read", "plugin:write"],
        blog: ["content:read"],
      },
    }
  );

  expect(result.candidates).toEqual([]);
  expect(result.gates).toEqual([
    expect.objectContaining({
      code: "custom_screen_permission_invalid",
      engineId: "products",
    }),
    expect.objectContaining({
      code: "custom_screen_permission_invalid",
      engineId: "blog",
    }),
  ]);
});

test("buildSiteBuilderIntakeCompileResult exposes custom-screen decisions outside siteKit", () => {
  const result = buildSiteBuilderIntakeCompileResult(
    readyFacts({
      pageRoles: ["home", "products", "blog", "contact"],
      goals: ["sell products and publish articles"],
      summary: "A confused user wants products and articles with beginner editing.",
    })
  );
  const serializedSiteKit = JSON.stringify(result.siteKit);
  const serializedReviewFacts = JSON.stringify(result.reviewFacts);

  expect(decisionIds(result.reviewFacts.contentEngineDecisions.decisions)).toEqual([
    "products",
    "blog",
  ]);
  expect(
    result.reviewFacts.customScreenDecisions.candidates.map((candidate) => candidate.engineId)
  ).toEqual(["products", "blog"]);
  expect(gateCodes(result.gates)).toEqual([]);
  expect(serializedSiteKit).not.toContain("customScreenDecisions");
  expect(serializedSiteKit).not.toContain("contentEngineDecisions");
  expect(serializedSiteKit).not.toContain("confused user");
  expect(serializedReviewFacts).not.toContain("confused user");
});
