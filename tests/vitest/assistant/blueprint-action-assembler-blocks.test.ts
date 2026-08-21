import { expect, test } from "vitest";

import { assembleComposedBlueprintPlan } from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";
import {
  buildCatalogFragments,
  buildProductCatalogCompositionGraph,
  buildProductCatalogPlan,
  getProductCatalogRegistration,
} from "./blueprintActionAssemblerFixtures";

test("assembleComposedBlueprintPlan merges compatible content schemas into one content-type action", () => {
  const base = buildProductCatalogPlan();
  const additive = buildProductCatalogPlan();
  const contentType = additive.actions.find((action) => action.type === "content-type.upsert");
  if (!contentType || contentType.type !== "content-type.upsert") {
    throw new Error("content_type_upsert_missing");
  }
  const schemaClone = structuredClone(contentType.input.schema) as {
    required?: string[];
    properties?: Record<string, Record<string, unknown>>;
  };
  schemaClone.required = [...(schemaClone.required ?? []), "deliveryTimeDays"];
  schemaClone.properties = {
    ...(schemaClone.properties ?? {}),
    deliveryTimeDays: {
      type: "number",
      title: "Delivery time",
      xFieldType: "number",
      xFieldConfig: {
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
    },
    projectStatus: {
      ...(schemaClone.properties?.projectStatus ?? {}),
      enum: ["active", "coming-soon", "archived", "sold-out"],
      xFieldConfig: {
        ...(schemaClone.properties?.projectStatus?.xFieldConfig as Record<string, unknown>),
        layout: { tab: "commercial", section: "Commercial", width: "half" },
      },
    },
  };
  contentType.input.schema = schemaClone;

  const registration = getProductCatalogRegistration();

  const fragments = buildCatalogFragments(base, additive);

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with an extra delivery-time field.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildProductCatalogCompositionGraph({
      registration,
      fragments,
      selectedCapabilityIds: [registration.capability.id, "product-catalog-addon"],
      conflicts: resolveBlueprintCompositionConflicts({ fragments }),
    }),
  });

  const contentTypeAction = plan?.actions.find((action) => action.type === "content-type.upsert");
  expect(contentTypeAction).toMatchObject({
    type: "content-type.upsert",
    input: {
      slug: "products",
      schema: {
        required: expect.arrayContaining(["deliveryTimeDays"]),
        properties: {
          deliveryTimeDays: {
            type: "number",
            xFieldType: "number",
          },
          projectStatus: {
            enum: ["active", "coming-soon", "archived", "sold-out"],
          },
        },
      },
    },
  });
  expect(plan?.actions.filter((action) => action.type === "content-type.upsert")).toHaveLength(1);
});

test("assembleComposedBlueprintPlan merges listing facets/card config and widens listing query projection fields", () => {
  const base = buildProductCatalogPlan();
  const additive = buildProductCatalogPlan();

  const contentType = additive.actions.find((action) => action.type === "content-type.upsert");
  if (!contentType || contentType.type !== "content-type.upsert") {
    throw new Error("content_type_upsert_missing");
  }
  const schemaClone = structuredClone(contentType.input.schema) as {
    properties?: Record<string, Record<string, unknown>>;
  };
  schemaClone.properties = {
    ...(schemaClone.properties ?? {}),
    deliveryTimeDays: {
      type: "number",
      title: "Delivery time",
      xFieldType: "number",
    },
  };
  contentType.input.schema = schemaClone;

  const page = additive.actions.find((action) => action.type === "page.upsert");
  if (!page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  page.input.listingFilters = {
    title: "Filter products",
    description: "Narrow results.",
    autoApply: true,
    showSearch: true,
    searchPlaceholder: "Search",
    searchLabel: "Search",
    applyLabel: "Apply",
    facets: [
      {
        id: "delivery-time",
        kind: "range",
        label: "Delivery time",
        field: "data.deliveryTimeDays",
        op: "between",
      },
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [{ value: "title-asc", label: "Title", field: "title", dir: "asc" }],
      },
    ],
  };

  const template = additive.actions.find((action) => action.type === "listing-template.upsert");
  if (!template || template.type !== "listing-template.upsert") {
    throw new Error("listing_template_upsert_missing");
  }
  template.input.config = {
    ...(template.input.config as Record<string, unknown>),
    fields: [
      ...((template.input.config as { fields?: Array<Record<string, unknown>> }).fields ?? []),
      {
        key: "delivery-time",
        source: "data.deliveryTimeDays",
        label: "Delivery time",
        fallback: null,
        format: "text",
        conditions: [{ id: "status", field: "data.projectStatus", op: "eq", value: "active" }],
      },
    ],
  };

  const registration = getProductCatalogRegistration();

  const fragments = buildCatalogFragments(base, additive);

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with delivery-time filters and cards.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildProductCatalogCompositionGraph({
      registration,
      fragments,
      selectedCapabilityIds: [registration.capability.id],
      conflicts: resolveBlueprintCompositionConflicts({ fragments }),
    }),
  });

  const query = plan?.actions.find((action) => action.type === "listing-query.upsert");
  const mergedPage = plan?.actions.find((action) => action.type === "page.upsert");
  const mergedTemplate = plan?.actions.find((action) => action.type === "listing-template.upsert");

  expect(query).toMatchObject({
    type: "listing-query.upsert",
    input: {
      fields: expect.arrayContaining(["data.deliveryTimeDays", "data.projectStatus"]),
    },
  });
  expect(mergedPage).toMatchObject({
    type: "page.upsert",
    input: {
      listingFilters: {
        facets: expect.arrayContaining([
          expect.objectContaining({
            id: "delivery-time",
            field: "data.deliveryTimeDays",
          }),
          expect.objectContaining({
            id: "sort",
            kind: "sort",
          }),
        ]),
      },
    },
  });
  expect(mergedTemplate).toMatchObject({
    type: "listing-template.upsert",
    input: {
      config: {
        fields: expect.arrayContaining([
          expect.objectContaining({
            key: "delivery-time",
            source: "data.deliveryTimeDays",
          }),
        ]),
      },
    },
  });
});

test("assembleComposedBlueprintPlan returns needs_input when merged listing facets reference fields outside the composed schema", () => {
  const base = buildProductCatalogPlan();
  const additive = buildProductCatalogPlan();
  const page = additive.actions.find((action) => action.type === "page.upsert");
  if (!page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  page.input.listingFilters = {
    title: "Filter products",
    description: "Narrow results.",
    autoApply: true,
    showSearch: true,
    searchPlaceholder: "Search",
    searchLabel: "Search",
    applyLabel: "Apply",
    facets: [
      {
        id: "unknown-field",
        kind: "checkbox",
        label: "Unknown field",
        field: "data.unknownField",
        op: "in",
      },
    ],
  };

  const registration = getProductCatalogRegistration();

  const fragments = buildCatalogFragments(base, additive);

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with an unsupported filter.",
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
    actions: [],
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-facet-field-missing"),
    }),
  ]);
  expect(plan?.answer).toContain(
    'Listing facet "Unknown field" references missing field "data.unknownField".'
  );
});

test("assembleComposedBlueprintPlan downgrades incompatible merged listing filters into needs_input instead of throwing", () => {
  const base = buildProductCatalogPlan();
  const conflicting = buildProductCatalogPlan();
  const basePage = base.actions.find((action) => action.type === "page.upsert");
  const page = conflicting.actions.find((action) => action.type === "page.upsert");
  if (!basePage || basePage.type !== "page.upsert" || !page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  basePage.input.listingFilters = {
    title: "Filter products",
    description: "Narrow results.",
    autoApply: true,
    showSearch: true,
    searchPlaceholder: "Search",
    searchLabel: "Search",
    applyLabel: "Apply",
    facets: [
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: [{ value: "active", label: "Active" }],
      },
    ],
  };
  page.input.listingFilters = {
    title: "Filter products",
    description: "Narrow results.",
    autoApply: true,
    showSearch: true,
    searchPlaceholder: "Search",
    searchLabel: "Search",
    applyLabel: "Apply",
    facets: [
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "data.projectStatus",
        op: "in",
        options: [{ value: "active", label: "Available" }],
      },
    ],
  };

  const registration = getProductCatalogRegistration();

  const fragments = buildCatalogFragments(base, conflicting, {
    additiveCapabilityId: "product-catalog-conflict",
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with conflicting listing filters.",
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
    actions: [],
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-route-conflict"),
    }),
  ]);
});

test("assembleComposedBlueprintPlan widens projection fields for each query when pages share one listing template", () => {
  const registration = getProductCatalogRegistration();

  const primaryPlan = buildProductCatalogPlan();
  const secondaryPlan = buildProductCatalogPlan();

  const primaryQuery = primaryPlan.actions.find((action) => action.type === "listing-query.upsert");
  const secondaryQuery = secondaryPlan.actions.find(
    (action) => action.type === "listing-query.upsert"
  );
  const secondaryPage = secondaryPlan.actions.find((action) => action.type === "page.upsert");
  const secondaryContentType = secondaryPlan.actions.find(
    (action) => action.type === "content-type.upsert"
  );
  const secondaryTemplate = secondaryPlan.actions.find(
    (action) => action.type === "listing-template.upsert"
  );
  if (
    !primaryQuery ||
    primaryQuery.type !== "listing-query.upsert" ||
    !secondaryQuery ||
    secondaryQuery.type !== "listing-query.upsert" ||
    !secondaryPage ||
    secondaryPage.type !== "page.upsert" ||
    !secondaryContentType ||
    secondaryContentType.type !== "content-type.upsert" ||
    !secondaryTemplate ||
    secondaryTemplate.type !== "listing-template.upsert"
  ) {
    throw new Error("shared_template_fixture_missing");
  }

  primaryQuery.input.name = "Primary Query";
  secondaryQuery.input.name = "Secondary Query";
  const primaryPage = primaryPlan.actions.find((action) => action.type === "page.upsert");
  if (!primaryPage || primaryPage.type !== "page.upsert") {
    throw new Error("primary_page_upsert_missing");
  }
  primaryPage.input.listingQueryName = "Primary Query";
  secondaryPage.input.listingQueryName = "Secondary Query";
  secondaryPage.input.slug = "/produkty-drugi";
  secondaryPage.input.title = "Drugi katalog";
  secondaryPage.input.introTitle = "Drugi katalog";
  secondaryPage.input.introBody = "Druga strona katalogu.";
  const schemaClone = structuredClone(secondaryContentType.input.schema) as {
    properties?: Record<string, Record<string, unknown>>;
  };
  schemaClone.properties = {
    ...(schemaClone.properties ?? {}),
    deliveryTimeDays: {
      type: "number",
      title: "Delivery time",
      xFieldType: "number",
    },
  };
  secondaryContentType.input.schema = schemaClone;
  secondaryTemplate.input.config = {
    ...(secondaryTemplate.input.config as Record<string, unknown>),
    fields: [
      ...((secondaryTemplate.input.config as { fields?: Array<Record<string, unknown>> }).fields ??
        []),
      {
        key: "delivery-time",
        source: "data.deliveryTimeDays",
        label: "Delivery time",
        fallback: null,
        format: "text",
        conditions: [],
      },
    ],
  };

  const fragments = buildCatalogFragments(primaryPlan, secondaryPlan, {
    baseCapabilityId: "product-catalog-primary",
    additiveCapabilityId: "product-catalog-secondary",
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create two product pages sharing one listing template.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: buildProductCatalogCompositionGraph({
      registration,
      fragments,
      selectedCapabilityIds: [registration.capability.id],
      conflicts: [],
    }),
  });

  const queries =
    plan?.actions.filter(
      (
        action
      ): action is Extract<(typeof plan.actions)[number], { type: "listing-query.upsert" }> =>
        action.type === "listing-query.upsert"
    ) ?? [];
  expect(queries).toHaveLength(2);
  expect(queries.every((query) => query.input.fields.includes("data.deliveryTimeDays"))).toBe(true);
});
