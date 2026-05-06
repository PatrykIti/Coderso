import { expect, test } from "vitest";

import {
  assembleComposedBlueprintPlan,
  buildBlueprintActionMergeKey,
} from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { getBlueprintCapabilityRegistration } from "../../../core/services/assistant/blueprints/blueprintCapabilityRegistry";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";

test("assembleComposedBlueprintPlan keeps the existing product inquiry action shape", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    candidates: [
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
      },
      {
        capabilityId: "product-inquiry-catalog",
        role: "adjunct",
        score: 82,
        matchedSignals: ["module:product-inquiry"],
        reasons: ["Inquiry."],
      },
    ],
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with inquiry form.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph,
  });

  expect(plan?.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
    "setting.content-route.upsert",
  ]);
  expect(plan?.actions.find((action) => action.type === "page.upsert")).toMatchObject({
    input: {
      slug: "/produkty",
      formEmbed: {
        formName: "Product Catalog Inquiry",
      },
    },
  });
});

test("assembleComposedBlueprintPlan appends independent adjunct pages without duplicating catalog resources", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
    candidates: [
      {
        capabilityId: "house-projects-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:catalog_showcase"],
        reasons: ["Primary catalog."],
      },
      {
        capabilityId: "lead-capture-site",
        role: "adjunct",
        score: 70,
        matchedSignals: ["module:lead-capture"],
        reasons: ["Contact."],
      },
      {
        capabilityId: "editorial-content-hub",
        role: "adjunct",
        score: 60,
        matchedSignals: ["module:editorial-hub"],
        reasons: ["Blog."],
      },
    ],
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Build a house projects catalog with contact form and blog.",
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
    graph,
  });

  expect(plan?.actions.filter((action) => action.type === "content-type.upsert")).toHaveLength(1);
  expect(plan?.actions.filter((action) => action.type === "form.upsert")).toHaveLength(1);
  expect(
    plan?.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/projekty-domow", "/kontakt", "/blog"]);
});

test("assembleComposedBlueprintPlan returns null when no primary capability is present", () => {
  const plan = assembleComposedBlueprintPlan({
    prompt: "Booking only",
    promptKind: "setup_request",
    intentFamily: "booking_service",
    graph: {
      primary: null,
      adjuncts: [],
      gated: [],
      resources: [],
      conflicts: [],
      fragments: [],
      selectedCapabilityIds: [],
    },
  });

  expect(plan).toBeNull();
});

test("assembleComposedBlueprintPlan returns needs_input when fatal conflicts are already present on the graph", () => {
  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with fatal conflict.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: {
      primary: {
        capabilityId: registration.capability.id,
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
        capability: registration.capability,
      },
      adjuncts: [],
      gated: [],
      resources: [],
      conflicts: [
        {
          code: "route_conflict",
          severity: "error",
          message: "Forced fatal conflict.",
        },
      ],
      fragments: [],
      selectedCapabilityIds: [registration.capability.id],
    },
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

test("assembleComposedBlueprintPlan builds typed needs_input questions for field and resource conflicts", () => {
  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with schema and template conflicts.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: {
      primary: {
        capabilityId: registration.capability.id,
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
        capability: registration.capability,
      },
      adjuncts: [],
      gated: [],
      resources: [],
      conflicts: [
        {
          code: "field_type_conflict",
          severity: "error",
          actionType: "content-type.upsert",
          resourceKey: "content-type:products:field:priceFrom",
          message: "Field conflict.",
        },
        {
          code: "resource_slug_conflict",
          severity: "error",
          actionType: "listing-template.upsert",
          resourceKey: "listing-template:product-catalog-grid",
          message: "Template conflict.",
        },
      ],
      fragments: [],
      selectedCapabilityIds: [registration.capability.id],
    },
  });

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "needs_input",
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({ id: expect.stringContaining("blueprint-field-type-conflict") }),
    expect.objectContaining({ id: expect.stringContaining("blueprint-resource-conflict") }),
  ]);
});

test("assembleComposedBlueprintPlan returns gated needs_input when a blocking gated capability is selected", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "services_directory",
    candidates: [
      {
        capabilityId: "services-directory",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:services_directory"],
        reasons: ["Primary services directory."],
      },
      {
        capabilityId: "booking-service",
        role: "gated",
        score: 90,
        matchedSignals: ["module:booking"],
        reasons: ["Booking stays gated."],
      },
    ],
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Build a services directory with booking.",
    promptKind: "setup_request",
    intentFamily: "services_directory",
    graph,
  });

  expect(plan).toMatchObject({
    status: "needs_input",
    responseKind: "gated",
    actions: [],
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-gated-domain"),
    }),
  ]);
  expect(plan?.summary).toContain("Booking Service");
  expect(plan?.summary).not.toContain("Services Directory)");
});

test("assembleComposedBlueprintPlan dedupes typed conflicts instead of surfacing a second generic duplicate question", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const conflicting = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const page = conflicting.actions.find((action) => action.type === "page.upsert");
  if (!page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  page.input.listingQueryName = "Other Query";

  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }

  const fragments = [
    {
      capabilityId: "product-catalog",
      planId: base.id,
      title: base.title,
      assumptions: base.assumptions,
      actions: base.actions,
    },
    {
      capabilityId: "product-catalog-conflict",
      planId: conflicting.id,
      title: conflicting.title,
      assumptions: conflicting.assumptions,
      actions: conflicting.actions,
    },
  ];

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with a conflicting route.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: {
      primary: {
        capabilityId: registration.capability.id,
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
        capability: registration.capability,
      },
      adjuncts: [],
      gated: [],
      resources: [],
      conflicts: resolveBlueprintCompositionConflicts({ fragments }),
      fragments,
      selectedCapabilityIds: [registration.capability.id],
    },
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
  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }

  const plan = assembleComposedBlueprintPlan({
    prompt: "Product catalog with two route conflicts.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph: {
      primary: {
        capabilityId: registration.capability.id,
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
        capability: registration.capability,
      },
      adjuncts: [],
      gated: [],
      resources: [],
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
      fragments: [],
      selectedCapabilityIds: [registration.capability.id],
    },
  });

  expect(plan?.questions).toHaveLength(2);
  expect(plan?.questions?.map((question) => question.id)).toEqual([
    expect.stringContaining("page:-produkty"),
    expect.stringContaining("page:-blog"),
  ]);
});

test("buildBlueprintActionMergeKey scopes custom screen resources by content type slug", () => {
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
        blocks: [],
        bindings: [],
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
        blocks: [],
        bindings: [],
      },
    })
  );
});
