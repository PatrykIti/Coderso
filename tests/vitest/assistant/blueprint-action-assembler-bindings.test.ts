import { expect, test } from "vitest";

import {
  assembleComposedBlueprintPlan,
  buildBlueprintActionMergeKey,
  mergeBlueprintActions,
} from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";
import { normalizeCustomScreenDefinitionForWrite } from "../../../core/services/customScreens/customScreenSchemas";
import {
  buildCatalogFragments,
  buildProductCatalogCompositionGraph,
  buildProductCatalogPlan,
  getProductCatalogRegistration,
} from "./blueprintActionAssemblerFixtures";

test("assembleComposedBlueprintPlan dedupes typed conflicts instead of surfacing a second generic duplicate question", () => {
  const base = buildProductCatalogPlan();
  const conflicting = buildProductCatalogPlan();
  const page = conflicting.actions.find((action) => action.type === "page.upsert");
  if (!page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  page.input.listingQueryName = "Other Query";

  const registration = getProductCatalogRegistration();

  const fragments = buildCatalogFragments(base, conflicting, {
    additiveCapabilityId: "product-catalog-conflict",
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with a conflicting route.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildProductCatalogCompositionGraph({
      registration,
      fragments,
      selectedCapabilityIds: [registration.capability.id],
      conflicts: resolveBlueprintCompositionConflicts({ fragments }),
    }),
  });

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "needs_input",
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-route-conflict"),
    }),
  ]);
  expect(plan?.answer).toContain('Conflicting page setup targets the same route "/produkty"');
  expect(plan?.answer).not.toContain("Conflicting page.upsert actions target the same resource");
});

test("assembleComposedBlueprintPlan keeps separate questions for different targets that share the same conflict code", () => {
  const registration = getProductCatalogRegistration();

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with two route conflicts.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildProductCatalogCompositionGraph({
      registration,
      fragments: [],
      selectedCapabilityIds: [registration.capability.id],
      conflicts: [
        {
          code: "route_conflict",
          severity: "error",
          actionType: "page.upsert",
          resourceKey: "page:/produkty",
          message: "Products route conflict.",
        },
        {
          code: "route_conflict",
          severity: "error",
          actionType: "page.upsert",
          resourceKey: "page:/blog",
          message: "Blog route conflict.",
        },
      ],
    }),
  });

  expect(plan?.questions).toHaveLength(2);
  expect(plan?.questions?.map((question) => question.id)).toEqual([
    expect.stringContaining("page:-produkty"),
    expect.stringContaining("page:-blog"),
  ]);
});

test("buildBlueprintActionMergeKey scopes custom screen resources by content type slug and composition metadata", () => {
  expect(
    buildBlueprintActionMergeKey({
      id: "screen-products",
      type: "custom-screen.upsert",
      title: "Products screen",
      description: "Products.",
      input: {
        name: "Overview",
        contentTypeSlug: "products",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "Overview",
        definition: normalizeCustomScreenDefinitionForWrite(),
      },
    })
  ).not.toBe(
    buildBlueprintActionMergeKey({
      id: "screen-services",
      type: "custom-screen.upsert",
      title: "Services screen",
      description: "Services.",
      input: {
        name: "Overview",
        contentTypeSlug: "services",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "Overview",
        definition: normalizeCustomScreenDefinitionForWrite(),
      },
    })
  );

  const canonicalProductsScreen = {
    id: "screen-products-canonical",
    type: "custom-screen.upsert" as const,
    title: "Products screen",
    description: "Products.",
    input: {
      name: "Overview",
      contentTypeSlug: "products",
      status: "active" as const,
      collectionRole: "canonical-admin-screen" as const,
      compositionKey: "product-catalog",
      showInSidebar: true,
      sidebarLabel: "Overview",
      definition: normalizeCustomScreenDefinitionForWrite(),
    },
  };
  const comparisonProductsScreen = {
    ...canonicalProductsScreen,
    id: "screen-products-comparison",
    input: {
      ...canonicalProductsScreen.input,
      collectionRole: "secondary-admin-screen" as const,
      compositionKey: "comparison",
    },
  };

  expect(buildBlueprintActionMergeKey(canonicalProductsScreen)).not.toBe(
    buildBlueprintActionMergeKey(comparisonProductsScreen)
  );
  expect(mergeBlueprintActions(canonicalProductsScreen, comparisonProductsScreen)).toBeNull();
});
