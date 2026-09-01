import { describe, expect, test } from "vitest";

import { composeAdminSurface } from "../../../core/services/assistant/blueprints/blueprintAdminSurfaceComposer";
import {
  normalizeBlueprintCapabilities,
  normalizeBlueprintCapability,
} from "../../../core/services/assistant/blueprints/blueprintCapabilitySchema";
import {
  normalizeBlueprintConflict,
  type BlueprintCapability,
  type BlueprintCandidate,
} from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import {
  mergeListingCardConfig,
  validateListingCardConfigAgainstSchema,
} from "../../../core/services/assistant/blueprints/blueprintCardConfigMerger";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { buildBlueprintCompositionMetadata } from "../../../core/services/assistant/blueprints/blueprintCompositionMetadata";
import {
  mergeListingFacets,
  schemaHasListingField,
  validateListingFacetsAgainstSchema,
} from "../../../core/services/assistant/blueprints/blueprintFacetMerger";
import { composeBlueprintPageData } from "../../../core/services/assistant/blueprints/blueprintPageSectionComposer";
import { extractBlueprintPromptSignals } from "../../../core/services/assistant/blueprints/blueprintPromptSignals";
import { mergeBlueprintSchemas } from "../../../core/services/assistant/blueprints/blueprintSchemaMerger";

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

describe("blueprint prompt signals", () => {
  test("extractBlueprintPromptSignals maps portfolio prompts to portfolio projects", () => {
    const signals = extractBlueprintPromptSignals({
      prompt: "show my portfolio projects page",
    });
    expect(signals.intentFamily).toBe("portfolio_projects");
  });

  test("contextRouteToIntentFamily recognizes house-projects and portfolio route keywords", () => {
    const houseProjects = extractBlueprintPromptSignals({
      prompt: "skonfiguruj strone",
      context: { page: "/admin/advanced/house-projects", locale: "pl-PL" },
    });
    expect(houseProjects.contextualIntentFamily).toBe("catalog_showcase");
    const portfolio = extractBlueprintPromptSignals({
      prompt: "skonfiguruj strone",
      context: { page: "/admin/advanced/portfolio", locale: "pl-PL" },
    });
    expect(portfolio.contextualIntentFamily).toBe("portfolio_projects");
  });
});

describe("blueprint composition graph", () => {
  test("buildBlueprintCompositionGraph breaks candidate ties by capability id", () => {
    const candidates: BlueprintCandidate[] = [
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 20,
        matchedSignals: [],
        reasons: [],
      },
      {
        capabilityId: "editorial-content-hub",
        role: "adjunct",
        score: 10,
        matchedSignals: [],
        reasons: [],
      },
      {
        capabilityId: "product-inquiry-catalog",
        role: "adjunct",
        score: 10,
        matchedSignals: [],
        reasons: [],
      },
    ];
    const graph = buildBlueprintCompositionGraph({
      candidates,
      promptKind: "setup_request",
      intentFamily: "product_catalog",
    });
    expect(graph.adjuncts.map((node) => node.capabilityId)).toEqual([
      "editorial-content-hub",
      "product-inquiry-catalog",
    ]);
  });
});

describe("blueprint composition metadata", () => {
  test("buildBlueprintCompositionMetadata throws when the graph has no primary", () => {
    expect(() =>
      buildBlueprintCompositionMetadata({
        graph: {
          primary: null,
          adjuncts: [],
          gated: [],
          resources: [],
          conflicts: [],
          fragments: [],
          selectedCapabilityIds: [],
        },
      })
    ).toThrow("assistant_blueprint_composition_metadata_missing_primary");
  });
});

describe("blueprint page section composer", () => {
  test("composeBlueprintPageData splits trailing footer cta sections", () => {
    const data = composeBlueprintPageData({
      introTitle: "Start",
      introBody: "Body.",
      sections: [
        {
          id: "content-1",
          type: "content",
          name: "Content",
          variant: "default",
          layout: {
            columns: 1,
            align: "start",
            justify: "start",
            maxWidth: 1080,
            stackVertical: false,
          },
          style: {
            background: "#ffffff",
            backgroundType: "color",
            backgroundImage: null,
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          spacing: {
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 32,
            paddingRight: 32,
            gap: 16,
          },
          visibility: {
            visible: true,
            authOnly: false,
            anchor: null,
            startsAt: null,
            endsAt: null,
          },
          responsive: {},
          blocks: [],
        },
        {
          id: "cta-footer",
          type: "cta",
          name: "Footer CTA",
          variant: "default",
          layout: {
            columns: 1,
            align: "start",
            justify: "start",
            maxWidth: 1080,
            stackVertical: false,
          },
          style: {
            background: "#ffffff",
            backgroundType: "color",
            backgroundImage: null,
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          spacing: {
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 32,
            paddingRight: 32,
            gap: 16,
          },
          visibility: {
            visible: true,
            authOnly: false,
            anchor: null,
            startsAt: null,
            endsAt: null,
          },
          responsive: {},
          blocks: [],
        },
      ],
    });
    expect(data.sections.map((section) => section.type)).toContain("cta");
  });

  test("composeBlueprintPageData creates an intro hero when no body sections exist", () => {
    const data = composeBlueprintPageData({
      introTitle: "Intro",
      introBody: "Welcome.",
      sections: [],
    });
    expect(data.sections[0]).toMatchObject({ type: "hero", id: "assistant-intro" });
  });
});

describe("blueprint admin surface composer", () => {
  const header = { eyebrow: "eyebrow", subtitle: "subtitle", description: "desc", badge: "badge" };
  const columns = { leftTitle: "Left", rightTitle: "Right" };

  test("composeAdminSurface rejects empty field paths", () => {
    expect(() =>
      composeAdminSurface({
        key: "services",
        header,
        columns,
        groups: [
          {
            key: "main",
            title: "Main",
            description: "desc",
            column: "left",
            fields: [{ key: "f1", label: "Name", helper: "helper", field: "  " }],
          },
        ],
      })
    ).toThrow("assistant_blueprint_admin_surface_field_invalid");
  });

  test("composeAdminSurface rejects unsafe path segments", () => {
    expect(() =>
      composeAdminSurface({
        key: "services",
        header,
        columns,
        groups: [
          {
            key: "main",
            title: "Main",
            description: "desc",
            column: "left",
            fields: [{ key: "f1", label: "Name", helper: "helper", field: "data.__proto__" }],
          },
        ],
      })
    ).toThrow("assistant_blueprint_admin_surface_field_invalid");
  });

  test("composeAdminSurface skips exact duplicate fields across groups", () => {
    const composition = composeAdminSurface({
      key: "services",
      header,
      columns,
      groups: [
        {
          key: "main",
          title: "Main",
          description: "desc",
          column: "left",
          fields: [{ key: "f1", label: "Name", helper: "helper", field: "data.name" }],
        },
        {
          key: "main",
          title: "Main",
          description: "desc",
          column: "left",
          fields: [{ key: "f1", label: "Name", helper: "helper", field: "data.name" }],
        },
      ],
    });
    expect(composition.blocks.length).toBeGreaterThan(0);
  });

  test("composeAdminSurface rejects conflicting duplicate fields", () => {
    expect(() =>
      composeAdminSurface({
        key: "services",
        header,
        columns,
        groups: [
          {
            key: "main",
            title: "Main",
            description: "desc",
            column: "left",
            fields: [{ key: "f1", label: "Name", helper: "helper", field: "data.name" }],
          },
          {
            key: "main",
            title: "Main",
            description: "desc",
            column: "left",
            fields: [{ key: "f1", label: "Renamed", helper: "helper", field: "data.name" }],
          },
        ],
      })
    ).toThrow(/assistant_blueprint_admin_surface_duplicate_field/);
  });
});

describe("blueprint capability schema", () => {
  test("normalizeBlueprintCapability scans nested arrays and records for secret-like keys", () => {
    expect(() =>
      normalizeBlueprintCapability({
        id: "test-capability",
        version: 1,
        label: "Test",
        family: "test",
        provides: [{ kind: "catalog", key: "test-catalog", label: "Test" }],
        resources: [
          {
            key: "content-type:test",
            kind: "content-type",
            label: "Test content type",
            executable: true,
            actionTypes: ["content-type.upsert"],
            owner: "content-type.upsert",
            stableTarget: "content-type:test",
            metadata: {
              nested: { token: "x" },
              credentials: ["a"],
            },
          },
        ],
        merge: {
          role: "primary",
          resourceStrategy: "dedupe-by-key",
          pageStrategy: "merge-page-upsert",
          gatedStrategy: "metadata-only",
          priority: 10,
        },
      })
    ).toThrow(/assistant_blueprint_capability_invalid/);
  });

  test("normalizeBlueprintCapability rejects secret-like keys nested inside arrays", () => {
    expect(() =>
      normalizeBlueprintCapability({
        id: "test-capability",
        version: 1,
        label: "Test",
        family: "test",
        provides: [{ kind: "catalog", key: "test-catalog", label: "Test" }],
        resources: [
          {
            key: "content-type:test",
            kind: "content-type",
            label: "Test content type",
            executable: true,
            actionTypes: ["content-type.upsert"],
            owner: "content-type.upsert",
            stableTarget: "content-type:test",
            metadata: { configs: [{ token: "x" }] },
          },
        ],
        merge: {
          role: "primary",
          resourceStrategy: "dedupe-by-key",
          pageStrategy: "merge-page-upsert",
          gatedStrategy: "metadata-only",
          priority: 10,
        },
      })
    ).toThrow(/assistant_blueprint_capability_invalid/);
  });

  test("normalizeBlueprintCapability preserves safe metadata records", () => {
    const capability = normalizeBlueprintCapability({
      id: "test-capability",
      version: 1,
      label: "Test",
      family: "test",
      provides: [{ kind: "catalog", key: "test-catalog", label: "Test" }],
      resources: [
        {
          key: "content-type:test",
          kind: "content-type",
          label: "Test content type",
          executable: true,
          actionTypes: ["content-type.upsert"],
          owner: "content-type.upsert",
          stableTarget: "content-type:test",
          metadata: { mode: "draft" },
        },
      ],
      merge: {
        role: "primary",
        resourceStrategy: "dedupe-by-key",
        pageStrategy: "merge-page-upsert",
        gatedStrategy: "metadata-only",
        priority: 10,
      },
    });
    expect(capability.resources[0]?.metadata).toEqual({ mode: "draft" });
  });

  test("normalizeBlueprintCapabilities rejects records with secret-like keys", () => {
    expect(() =>
      normalizeBlueprintCapabilities([
        {
          ...createTestCapability(),
          defaults: { client: { apiKey: "secret" } },
        },
      ])
    ).toThrow("assistant_blueprint_capability_invalid");
  });
});

describe("blueprint capability types", () => {
  test("normalizeBlueprintConflict rejects invalid codes and empty identifiers", () => {
    expect(() =>
      normalizeBlueprintConflict({
        code: "not-a-code" as never,
        severity: "error",
        message: "msg",
      })
    ).toThrow("assistant_blueprint_conflict_invalid");
    expect(() =>
      normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        message: "msg",
        capabilityId: "  ",
      })
    ).toThrow("assistant_blueprint_conflict_invalid");
    expect(() =>
      normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        message: "msg",
        resourceKey: "  ",
      })
    ).toThrow("assistant_blueprint_conflict_invalid");
    expect(() =>
      normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        message: "msg",
        actionType: "  " as never,
      })
    ).toThrow("assistant_blueprint_conflict_invalid");
  });
});

describe("blueprint card config merger", () => {
  const baseConfig = {
    fields: [
      {
        key: "summary",
        source: "data.summary",
        label: "Summary",
        fallback: null,
        format: "text",
        conditions: [],
      },
    ],
    itemActions: [
      { id: "view-entry", label: "View", kind: "view", href: null, opensInNewTab: false },
    ],
    emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
    style: { columns: 3, gap: "md", cardVariant: "default" },
  };

  test("mergeListingCardConfig rejects conflicting visibility conditions", () => {
    expect(() =>
      mergeListingCardConfig(baseConfig, {
        ...baseConfig,
        fields: [
          {
            key: "summary",
            source: "data.summary",
            label: "Summary",
            fallback: null,
            format: "text",
            conditions: [{ id: "c1", field: "data.projectStatus", op: "eq", value: "available" }],
          },
        ],
      })
    ).toThrow(/incompatible visibility conditions/);
  });

  test("mergeListingCardConfig rejects conflicting item actions", () => {
    expect(() =>
      mergeListingCardConfig(baseConfig, {
        ...baseConfig,
        itemActions: [
          { id: "view-entry", label: "View", kind: "view", href: "/x", opensInNewTab: true },
        ],
      })
    ).toThrow(/conflicts across composed fragments/);
  });

  test("validateListingCardConfigAgainstSchema rejects missing sources and condition sources", () => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string", xFieldType: "text" },
        rooms: { type: "number", xFieldType: "number" },
      },
    } as const;
    expect(() =>
      validateListingCardConfigAgainstSchema(schema, {
        fields: [
          {
            key: "status",
            source: "data.status",
            label: "Status",
            fallback: null,
            format: "text",
            conditions: [],
          },
        ],
        itemActions: [],
        emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
        style: { columns: 1, gap: "sm", cardVariant: "default" },
      })
    ).toThrow(/missing source/);
    expect(() =>
      validateListingCardConfigAgainstSchema(schema, {
        fields: [
          {
            key: "status",
            source: "data.rooms",
            label: "Status",
            fallback: null,
            format: "text",
            conditions: [{ id: "c1", field: "data.missing", op: "eq", value: "x" }],
          },
        ],
        itemActions: [],
        emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
        style: { columns: 1, gap: "sm", cardVariant: "default" },
      })
    ).toThrow(/missing condition source/);
  });
});

describe("blueprint facet merger", () => {
  const schema = {
    type: "object",
    properties: {
      rooms: { type: "number", xFieldType: "number" },
      areaM2: { type: "number", xFieldType: "number" },
    },
  } as const;

  test("schemaHasListingField walks nested and fallback paths", () => {
    expect(schemaHasListingField(schema, "data.rooms")).toBe(true);
    expect(schemaHasListingField(schema, "data.missing.deep")).toBe(false);
    expect(schemaHasListingField(schema, "other.key")).toBe(false);
    expect(schemaHasListingField(schema, "status")).toBe(true);
    expect(schemaHasListingField(schema, "data.rooms.extra")).toBe(false);
    expect(schemaHasListingField(schema, "data.api_key")).toBe(false);
    expect(schemaHasListingField(schema, "   ")).toBe(false);
  });

  test("schemaHasListingField stops at records without nested properties", () => {
    const groupSchema = {
      type: "object",
      properties: {
        group: { type: "object" },
        nested: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      },
    } as const;
    expect(schemaHasListingField(groupSchema, "data.group.title")).toBe(false);
    expect(schemaHasListingField(groupSchema, "data.nested.title")).toBe(true);
  });

  test("mergeListingFacets rejects conflicting sort options", () => {
    expect(() =>
      mergeListingFacets(
        [
          {
            id: "sort",
            kind: "sort",
            label: "Sort",
            field: "data.areaM2",
            op: "sort",
            sortOptions: [{ value: "area", field: "data.areaM2", dir: "desc" }],
          },
        ],
        [
          {
            id: "sort",
            kind: "sort",
            label: "Sort",
            field: "data.areaM2",
            op: "sort",
            sortOptions: [{ value: "area", field: "data.areaM2", dir: "asc" }],
          },
        ]
      )
    ).toThrow(/incompatible field or direction/);
  });

  test("mergeListingFacets rejects incompatible facet fields and presentation", () => {
    expect(() =>
      mergeListingFacets(
        [{ id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms", op: "in" }],
        [{ id: "rooms", kind: "range", label: "Rooms", field: "data.rooms", op: "between" }]
      )
    ).toThrow(/incompatible fields or operators/);
    expect(() =>
      mergeListingFacets(
        [
          {
            id: "rooms",
            kind: "checkbox",
            label: "Rooms",
            field: "data.rooms",
            op: "in",
            presentation: { controlMode: "inline" },
          },
        ],
        [
          {
            id: "rooms",
            kind: "checkbox",
            label: "Rooms",
            field: "data.rooms",
            op: "in",
            presentation: { controlMode: "searchable" },
          },
        ]
      )
    ).toThrow(/incompatible presentation/);
  });

  test("validateListingFacetsAgainstSchema rejects sort facets with missing fields", () => {
    expect(() =>
      validateListingFacetsAgainstSchema(schema, [
        {
          id: "sort",
          kind: "sort",
          label: "Sort",
          field: "data.areaM2",
          op: "sort",
          sortOptions: [{ value: "missing", field: "data.missing", dir: "asc" }],
        },
      ])
    ).toThrow(/missing field/);
  });
});

describe("blueprint schema merger", () => {
  test("mergeBlueprintSchemas rejects incompatible scalar config leaves", () => {
    expect(() =>
      mergeBlueprintSchemas([
        {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 5 },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", maxLength: 10 },
          },
        },
      ])
    ).toThrow(/incompatible config/);
  });

  test("mergeBlueprintSchemas rejects unsupported enum values", () => {
    expect(() =>
      mergeBlueprintSchemas([
        {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { type: "string", enum: ["auto"] },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { type: "string", enum: [{ label: "object-enum" }] },
          },
        },
      ])
    ).toThrow(/unsupported enum value/);
  });

  test("mergeBlueprintSchemas merges nested required contracts", () => {
    const merged = mergeBlueprintSchemas([
      {
        type: "object",
        additionalProperties: false,
        properties: {
          group: {
            type: "object",
            additionalProperties: false,
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        properties: {
          group: {
            type: "object",
            additionalProperties: false,
            properties: { slug: { type: "string" } },
            required: ["slug"],
          },
        },
      },
    ]);
    expect((merged.properties as Record<string, { required?: string[] }>).group?.required).toEqual([
      "name",
      "slug",
    ]);
  });

  test("mergeBlueprintSchemas rejects incompatible arrays and scalar conflicts", () => {
    expect(() =>
      mergeBlueprintSchemas([
        {
          type: "object",
          additionalProperties: false,
          properties: {
            tags: { type: "array", items: [{ type: "string" }], minItems: 1, maxItems: 1 },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            tags: { type: "array", items: [{ type: "number" }], minItems: 1, maxItems: 1 },
          },
        },
      ])
    ).toThrow(/incompatible array config/);
    expect(() =>
      mergeBlueprintSchemas([
        {
          type: "object",
          additionalProperties: false,
          properties: { status: { type: "string", xFieldType: "text" } },
        },
        {
          type: "object",
          additionalProperties: false,
          properties: { status: { type: "string", xFieldType: "richtext" } },
        },
      ])
    ).toThrow(/uses incompatible types \(text vs richtext\)/);
  });
});
