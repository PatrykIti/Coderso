import { expect, test } from "vitest";

import { assembleComposedBlueprintPlan } from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { getBlueprintCapabilityRegistration } from "../../../core/services/assistant/blueprints/blueprintCapabilityRegistry";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";

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
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
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

test("assembleComposedBlueprintPlan returns null when fatal conflicts are already present on the graph", () => {
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
          code: "forced_conflict",
          severity: "error",
          message: "Forced fatal conflict.",
        },
      ],
      fragments: [],
      selectedCapabilityIds: [registration.capability.id],
    },
  });

  expect(plan).toBeNull();
});

test("assembleComposedBlueprintPlan keeps gated capabilities as assumptions only", () => {
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

  expect(plan?.assumptions.join(" ")).toContain(
    "Booking Service Business remains gated and is excluded from the executable typed action plan."
  );
  expect(plan?.actions.some((action) => action.type === "form.upsert")).toBe(false);
});
