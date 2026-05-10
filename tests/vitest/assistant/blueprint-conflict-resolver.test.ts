import { expect, test } from "vitest";

import { buildProductInquiryCatalogPlan } from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import {
  normalizeBlueprintConflict,
  type BlueprintCapability,
  type BlueprintCompositionNode,
} from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";

const createTestCapability = (
  overrides: Partial<BlueprintCapability> = {}
): BlueprintCapability => ({
  id: "test-capability",
  version: 1,
  label: "Test Capability",
  family: "test",
  provides: [{ kind: "catalog", key: "test-catalog", label: "Test catalog" }],
  requires: [],
  resources: [],
  pageSections: [],
  adminSurfaces: [],
  gated: [],
  merge: {
    role: "primary",
    resourceStrategy: "dedupe-by-key",
    pageStrategy: "merge-page-upsert",
    gatedStrategy: "metadata-only",
    priority: 10,
  },
  ...overrides,
});

const createTestNode = (capability: BlueprintCapability): BlueprintCompositionNode => ({
  capabilityId: capability.id,
  role: capability.merge.role,
  score: 10,
  matchedSignals: ["test"],
  reasons: ["Test node."],
  capability,
});

test("resolveBlueprintCompositionConflicts accepts product inquiry page merge on the same catalog slug", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const inquiry = buildProductInquiryCatalogPlan({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
      {
        capabilityId: "product-catalog",
        planId: base.id,
        title: base.title,
        assumptions: base.assumptions,
        actions: base.actions,
      },
      {
        capabilityId: "product-inquiry-catalog",
        planId: inquiry.id,
        title: inquiry.title,
        assumptions: inquiry.assumptions,
        actions: inquiry.actions,
      },
    ],
  });

  expect(conflicts).toEqual([]);
});

test("resolveBlueprintCompositionConflicts reports conflicting page upserts for the same slug", () => {
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

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
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
    ],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "route_conflict",
      actionType: "page.upsert",
      resourceKey: "page:/produkty",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts reports field_type_conflict for incompatible content schema fields", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const conflicting = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const contentType = conflicting.actions.find((action) => action.type === "content-type.upsert");
  if (!contentType || contentType.type !== "content-type.upsert") {
    throw new Error("content_type_upsert_missing");
  }
  const schemaClone = structuredClone(contentType.input.schema) as {
    properties?: Record<string, Record<string, unknown>>;
  };
  schemaClone.properties = {
    ...(schemaClone.properties ?? {}),
    priceFrom: {
      type: "string",
      xFieldType: "text",
    },
  };
  contentType.input.schema = schemaClone;

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
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
    ],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "field_type_conflict",
      actionType: "content-type.upsert",
      resourceKey: "content-type:products:field:priceFrom",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts accepts additive content schema merges for the same content type", () => {
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

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
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
    ],
  });

  expect(conflicts).toEqual([]);
});

test("resolveBlueprintCompositionConflicts reports resource_slug_conflict for incompatible listing template inputs", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const conflicting = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const listingTemplate = conflicting.actions.find(
    (action) => action.type === "listing-template.upsert"
  );
  if (!listingTemplate || listingTemplate.type !== "listing-template.upsert") {
    throw new Error("listing_template_upsert_missing");
  }
  const configClone = structuredClone(listingTemplate.input.config) as {
    fields?: Array<Record<string, unknown>>;
  };
  const [firstField, ...otherFields] = configClone.fields ?? [];
  if (!firstField) {
    throw new Error("listing_template_field_missing");
  }
  listingTemplate.input.config = {
    ...configClone,
    fields: [
      {
        ...firstField,
        source: "data.priceFrom",
      },
      ...otherFields,
    ],
  };

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
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
    ],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "resource_slug_conflict",
      actionType: "listing-template.upsert",
      resourceKey: "listing-template:product-catalog-grid",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts surfaces gated booking domains as blocking conflicts", () => {
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

  expect(graph.conflicts).toEqual([
    expect.objectContaining({
      code: "gated_domain",
      capabilityId: "booking-service",
      resourceKey: "gated:booking",
      severity: "error",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts surfaces media import gates as media upload conflicts", () => {
  const capability = createTestCapability({
    id: "media-import-gate",
    label: "Media Import Gate",
    gated: [
      {
        key: "gated:media-import",
        kind: "media-import",
        label: "Media import",
        reason: "Attached files must become trusted media-library assets first.",
      },
    ],
    merge: {
      role: "gated",
      resourceStrategy: "dedupe-by-key",
      pageStrategy: "keep-separate",
      gatedStrategy: "needs-input",
      priority: 10,
    },
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [],
    gated: [createTestNode(capability)],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "media_upload_gated",
      capabilityId: "media-import-gate",
      resourceKey: "gated:media-import",
      severity: "error",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts surfaces missing ambiguous and delete-gated media references", () => {
  const capability = createTestCapability({
    id: "media-reference-capability",
    label: "Media Reference Capability",
    resources: [
      {
        key: "media:hero",
        kind: "media",
        label: "Hero image",
        executable: false,
        actionTypes: [],
        stableTarget: "heroImage",
        owner: "media.reference.attach",
        metadata: {
          mode: "existing-asset-reference",
          targetKinds: ["entry"],
          field: "heroImage",
          operation: "attach",
          required: true,
        },
      },
      {
        key: "media:gallery",
        kind: "media",
        label: "Gallery image",
        executable: false,
        actionTypes: [],
        stableTarget: "gallery",
        owner: "media.reference.attach",
        metadata: {
          mode: "existing-asset-reference",
          targetKinds: ["entry"],
          field: "gallery",
          operation: "replace",
          candidateIds: ["media-1", "media-2"],
        },
      },
      {
        key: "media:delete",
        kind: "media",
        label: "Old hero image",
        executable: false,
        actionTypes: [],
        stableTarget: "oldHeroImage",
        owner: "media.reference.attach",
        metadata: {
          mode: "existing-asset-reference",
          targetKinds: ["entry"],
          field: "heroImage",
          operation: "delete-asset",
          assetId: "media-old",
        },
      },
    ],
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [],
    selectedCapabilities: [capability],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "media_asset_missing",
      capabilityId: "media-reference-capability",
      resourceKey: "media:hero",
    }),
    expect.objectContaining({
      code: "media_asset_ambiguous",
      capabilityId: "media-reference-capability",
      resourceKey: "media:gallery",
    }),
    expect.objectContaining({
      code: "media_delete_gated",
      capabilityId: "media-reference-capability",
      resourceKey: "media:delete",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts surfaces permission gaps against action contracts", () => {
  const capability = createTestCapability({
    id: "permission-capability",
    label: "Permission Capability",
    requires: [
      {
        kind: "permission",
        key: "media:delete",
        label: "Media delete",
      },
    ],
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [],
    selectedCapabilities: [capability],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "permission_gap",
      capabilityId: "permission-capability",
      resourceKey: "permission:media:delete",
      severity: "error",
    }),
  ]);
});

test("resolveBlueprintCompositionConflicts accepts permission requirements already declared by actions", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const capability = createTestCapability({
    id: "content-write-capability",
    label: "Content Write Capability",
    requires: [
      {
        kind: "permission",
        key: "content:write",
        label: "Content write",
      },
    ],
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
      {
        capabilityId: "product-catalog",
        planId: base.id,
        title: base.title,
        assumptions: base.assumptions,
        actions: base.actions,
      },
    ],
    selectedCapabilities: [capability],
  });

  expect(conflicts).toEqual([]);
});

test("normalizeBlueprintConflict rejects unknown conflict codes", () => {
  expect(() =>
    normalizeBlueprintConflict({
      code: "unknown_conflict" as never,
      severity: "error",
      message: "Invalid conflict.",
    })
  ).toThrowError("assistant_blueprint_conflict_invalid");
});

test("normalizeBlueprintConflict redacts secret-like strings from conflict payloads", () => {
  expect(
    normalizeBlueprintConflict({
      code: "resource_key_duplicate",
      severity: "error",
      message: "The apiKey field conflicts with the secretToken value.",
      resourceKey: "content-type:apiKey",
    })
  ).toMatchObject({
    message: "The [redacted] field conflicts with the [redacted] value.",
    resourceKey: "content-type:[redacted]",
  });
});
