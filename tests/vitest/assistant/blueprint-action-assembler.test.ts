import { expect, test } from "vitest";

import {
  assembleComposedBlueprintPlan,
  buildBlueprintActionMergeKey,
  mergeBlueprintActions,
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
    "detail-page.upsert",
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

test("assembleComposedBlueprintPlan merges compatible content schemas into one content-type action", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const additive = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
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
      capabilityId: "product-catalog-addon",
      planId: additive.id,
      title: additive.title,
      assumptions: additive.assumptions,
      actions: additive.actions,
    },
  ];

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with an extra delivery-time field.",
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
      selectedCapabilityIds: [registration.capability.id, "product-catalog-addon"],
    },
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
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const additive = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

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
      capabilityId: "product-catalog-addon",
      planId: additive.id,
      title: additive.title,
      assumptions: additive.assumptions,
      actions: additive.actions,
    },
  ];

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with delivery-time filters and cards.",
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
      selectedCapabilityIds: [registration.capability.id, "product-catalog-addon"],
    },
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
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const additive = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
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
      capabilityId: "product-catalog-addon",
      planId: additive.id,
      title: additive.title,
      assumptions: additive.assumptions,
      actions: additive.actions,
    },
  ];

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with an unsupported filter.",
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
      selectedCapabilityIds: [registration.capability.id, "product-catalog-addon"],
    },
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
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const conflicting = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
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
    prompt: "Create a product catalog with conflicting listing filters.",
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
    actions: [],
  });
  expect(plan?.questions).toEqual([
    expect.objectContaining({
      id: expect.stringContaining("blueprint-route-conflict"),
    }),
  ]);
});

test("assembleComposedBlueprintPlan widens projection fields for each query when pages share one listing template", () => {
  const registration = getBlueprintCapabilityRegistration("product-catalog");
  if (!registration) {
    throw new Error("registration_missing");
  }

  const primaryPlan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const secondaryPlan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

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

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create two product pages sharing one listing template.",
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
      conflicts: [],
      fragments: [
        {
          capabilityId: "product-catalog-primary",
          planId: primaryPlan.id,
          title: primaryPlan.title,
          assumptions: primaryPlan.assumptions,
          actions: primaryPlan.actions,
        },
        {
          capabilityId: "product-catalog-secondary",
          planId: secondaryPlan.id,
          title: secondaryPlan.title,
          assumptions: secondaryPlan.assumptions,
          actions: secondaryPlan.actions,
        },
      ],
      selectedCapabilityIds: [registration.capability.id],
    },
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
      blocks: [],
      bindings: [],
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
