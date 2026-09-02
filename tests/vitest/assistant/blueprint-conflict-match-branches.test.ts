import { describe, expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import type {
  AssistantCustomScreenUpsertAction,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { BlueprintCandidate } from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import {
  attachBlueprintShadowMetadata,
  compareBlueprintCandidateSelection,
} from "../../../core/services/assistant/blueprints/blueprintComposerShadow";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { normalizeBlueprintConflict } from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";
import { matchExistingCompositionResources } from "../../../core/services/assistant/blueprints/blueprintExistingResourceMatcher";
import { buildGenericMarkdownCatalogPlan } from "../../../core/services/assistant/blueprints/genericMarkdownCatalogBlueprint";
import { normalizeCustomScreenDefinitionForWrite } from "../../../core/services/customScreens/customScreenSchemas";
import type { AssistantResourceCatalogSnapshot } from "../../../core/services/assistant/adminContextTypes";

const createCatalog = (
  overrides: Partial<AssistantResourceCatalogSnapshot> = {}
): AssistantResourceCatalogSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-05-06T10:00:00.000Z",
  budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
  entries: [],
  contentTypes: [
    { id: "ct-products", slug: "products", name: "Products", entryCount: 0, fields: [] },
  ],
  customScreens: [],
  detailPages: [],
  listings: { queries: [], templates: [] },
  forms: [],
  menus: [],
  seoDocuments: [],
  media: [],
  commerce: { products: [], collections: [] },
  solutionKits: [],
  warnings: [],
  ...overrides,
});

describe("blueprint conflict resolver", () => {
  const fragment = (capabilityId: string, planId: string, actions: AssistantPlannedAction[]) => ({
    capabilityId,
    planId,
    title: "Fragment plan",
    assumptions: [],
    actions,
  });

  test("resolveBlueprintCompositionConflicts reports duplicate resources for unlisted action families", () => {
    const menuConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "menu-1",
            type: "menu.upsert",
            title: "Main menu",
            description: "Primary navigation.",
            input: { name: "Main", location: "main", status: "published" },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "menu-2",
            type: "menu.upsert",
            title: "Secondary menu",
            description: "Secondary navigation.",
            input: { name: "Secondary", location: "main", status: "published" },
          },
        ]),
      ],
    });
    expect(menuConflict.some((entry) => entry.code === "resource_key_duplicate")).toBe(true);
  });

  test("resolveBlueprintCompositionConflicts reports slug conflicts across action families", () => {
    const contentConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "ct-1",
            type: "content-type.upsert",
            title: "Create services",
            description: "Create services.",
            input: {
              slug: "services",
              name: "Services",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  status: { type: "string", enum: ["a", "b"] },
                },
              },
            },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "ct-2",
            type: "content-type.upsert",
            title: "Create services",
            description: "Create services.",
            input: {
              slug: "services",
              name: "Services",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  status: { type: "string", enum: ["a", "c"] },
                },
              },
            },
          },
        ]),
      ],
    });
    expect(contentConflict).toContainEqual(
      expect.objectContaining({ code: "resource_slug_conflict" })
    );

    const listingTemplateConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "lt-1",
            type: "listing-template.upsert",
            title: "Template",
            description: "Template.",
            input: {
              slug: "services-grid",
              name: "Services",
              description: null,
              layout: "grid",
              config: {},
            },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "lt-2",
            type: "listing-template.upsert",
            title: "Template",
            description: "Template.",
            input: {
              slug: "services-grid",
              name: "Services",
              description: null,
              layout: "list",
              config: {},
            },
          },
        ]),
      ],
    });
    expect(listingTemplateConflict).toContainEqual(
      expect.objectContaining({ resourceKey: "listing-template:services-grid" })
    );

    const listingQueryConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "lq-1",
            type: "listing-query.upsert",
            title: "Query",
            description: "Query.",
            input: {
              name: "Services Query",
              description: null,
              contentTypeSlug: "services",
              fields: [],
              includeDrafts: false,
              limit: 12,
              sort: [{ field: "title", dir: "asc" }],
            },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "lq-2",
            type: "listing-query.upsert",
            title: "Query",
            description: "Query.",
            input: {
              name: "Services Query",
              description: null,
              contentTypeSlug: "products",
              fields: [],
              includeDrafts: false,
              limit: 12,
              sort: [{ field: "title", dir: "asc" }],
            },
          },
        ]),
      ],
    });
    expect(listingQueryConflict).toContainEqual(
      expect.objectContaining({ resourceKey: "listing-query:Services Query" })
    );

    const formConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "fm-1",
            type: "form.upsert",
            title: "Form",
            description: "Form.",
            input: {
              slug: "contact",
              name: "Contact A",
              status: "published",
              description: null,
              successMessage: null,
              submissionAccess: "public",
              fields: [],
            },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "fm-2",
            type: "form.upsert",
            title: "Form",
            description: "Form.",
            input: {
              slug: "contact",
              name: "Contact B",
              status: "published",
              description: null,
              successMessage: null,
              submissionAccess: "public",
              fields: [],
            },
          },
        ]),
      ],
    });
    expect(formConflict).toContainEqual(expect.objectContaining({ resourceKey: "form:contact" }));

    const customScreenConflict = resolveBlueprintCompositionConflicts({
      fragments: [
        fragment("a", "p1", [
          {
            id: "cs-1",
            type: "custom-screen.upsert",
            title: "Screen",
            description: "Screen.",
            input: {
              name: "Services Screen",
              contentTypeSlug: "services",
              status: "active",
              showInSidebar: false,
              sidebarLabel: null,
              definition: normalizeCustomScreenDefinitionForWrite(),
            },
          },
        ]),
        fragment("b", "p2", [
          {
            id: "cs-2",
            type: "custom-screen.upsert",
            title: "Screen",
            description: "Screen.",
            input: {
              name: "Services Screen",
              contentTypeSlug: "services",
              status: "draft",
              showInSidebar: false,
              sidebarLabel: null,
              definition: normalizeCustomScreenDefinitionForWrite(),
            },
          },
        ]),
      ],
    });
    expect(customScreenConflict).toContainEqual(
      expect.objectContaining({ resourceKey: "custom-screen:services:Services Screen" })
    );
  });
});

describe("blueprint composer shadow", () => {
  const minimalPlan = (overrides: { id: string; intentId: string }) =>
    normalizeAssistantActionPlan({
      status: "ready",
      questions: [],
      actions: [],
      id: overrides.id,
      intentId: overrides.intentId,
      title: "Plan",
      answer: "answer",
      summary: "summary",
      confidence: 0.9,
      assumptions: [],
    });

  const candidate = (
    capabilityId: string,
    role: BlueprintCandidate["role"],
    score: number
  ): BlueprintCandidate => ({
    capabilityId,
    role,
    score,
    matchedSignals: [],
    reasons: [],
  });

  test("attachBlueprintShadowMetadata exposes planner metadata when shadow is enabled", () => {
    const previous = process.env.ASSISTANT_BLUEPRINT_SHADOW;
    process.env.ASSISTANT_BLUEPRINT_SHADOW = "1";
    try {
      const currentPlan = normalizeAssistantActionPlan({
        status: "ready",
        questions: [],
        actions: [
          {
            id: "menu-1",
            type: "menu.upsert",
            title: "Main menu",
            description: "Primary navigation.",
            input: { name: "Main", location: "main", status: "published" },
          },
        ],
        id: "plan-shadow",
        intentId: "product-catalog",
        responseKind: "action_plan",
        title: "Plan",
        answer: "answer",
        summary: "summary",
        confidence: 0.9,
        assumptions: [],
      });
      const attached = attachBlueprintShadowMetadata({
        plan: currentPlan,
        prompt: "dodaj produkty",
        context: {
          page: "/admin/advanced/listings",
          locale: "pl-PL",
          includeResourceCatalog: true,
          resourceCatalog: createCatalog(),
        },
        promptKind: "setup_request",
        intentFamily: "catalog_showcase",
      });
      expect(attached.metadata?.planner).toBe("local");
      expect(attached.metadata?.blueprintShadow).toMatchObject({
        primaryCapabilityId: "product-catalog",
      });
    } finally {
      if (previous === undefined) {
        delete process.env.ASSISTANT_BLUEPRINT_SHADOW;
      } else {
        process.env.ASSISTANT_BLUEPRINT_SHADOW = previous;
      }
    }
  });

  test("compareBlueprintCandidateSelection reports element-level composition drift", () => {
    const currentPlan = minimalPlan({
      id: "plan-blueprint-composed-product-catalog~product-inquiry-catalog~editorial-content-hub",
      intentId: "blueprint-composed-product-catalog",
    });
    const candidates = [
      candidate("product-catalog", "primary", 20),
      candidate("product-inquiry-catalog", "adjunct", 18),
      candidate("services-directory", "adjunct", 17),
    ];
    expect(compareBlueprintCandidateSelection({ currentPlan, candidates }).mismatchReason).toBe(
      "composed_capabilities_drifted"
    );
  });

  test("compareBlueprintCandidateSelection defers adjunct capabilities for non-composed plans", () => {
    const currentPlan = minimalPlan({ id: "plan-regular", intentId: "product-catalog" });
    const candidates = [
      candidate("product-catalog", "primary", 20),
      candidate("product-inquiry-catalog", "adjunct", 18),
    ];
    expect(compareBlueprintCandidateSelection({ currentPlan, candidates }).mismatchReason).toBe(
      "adjunct_capabilities_deferred"
    );
  });

  test("compareBlueprintCandidateSelection detects gated capabilities for non-composed plans", () => {
    const currentPlan = minimalPlan({ id: "plan-regular", intentId: "product-catalog" });
    const candidates = [
      candidate("product-catalog", "primary", 20),
      candidate("booking-service", "gated", 5),
    ];
    expect(compareBlueprintCandidateSelection({ currentPlan, candidates }).mismatchReason).toBe(
      "gated_capabilities_detected"
    );
  });
});

describe("blueprint existing resource matcher", () => {
  const layout = {
    wrapper: {
      container: "default" as const,
      padding: { top: "md" as const, bottom: "lg" as const },
      background: {
        color: "#ffffff",
        image: null,
        media: {
          type: "none" as const,
          source: "external" as const,
          src: null,
        },
      },
    },
    sections: {
      gap: "lg" as const,
      defaults: {
        container: "default" as const,
        padding: { top: "xl" as const, bottom: "xl" as const },
        margin: { top: "none" as const, bottom: "none" as const },
      },
    },
    applyDefaultsToNewBlocks: false,
  };

  const detailPageAction = (
    document: Record<string, unknown>
  ): Extract<AssistantPlannedAction, { type: "detail-page.upsert" }> => ({
    id: "detail-page-products",
    type: "detail-page.upsert",
    title: "Create products detail page",
    description: "Create products detail page.",
    input: {
      document: {
        schemaVersion: 2,
        id: "detail-planned",
        name: "Products detail",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        status: "published",
        titlePattern: "{{ title }}",
        settings: { template: "detail", layout },
        sections: [],
        bindings: [],
        ...document,
      },
    },
  });

  test("matchExistingCompositionResources resolves same-collection canonical detail pages", () => {
    const result = matchExistingCompositionResources({
      actions: [detailPageAction({ id: "detail-new" })],
      catalog: createCatalog({
        detailPages: [
          {
            id: "detail-existing",
            name: "Existing",
            status: "published",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            linkedRouteType: "unrelated",
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
        ],
      }),
    });
    expect(result.actions[0]?.input).toMatchObject({
      expectedExistingId: "detail-existing",
    });
  });

  test("matchExistingCompositionResources reports ambiguous same-collection detail pages", () => {
    const result = matchExistingCompositionResources({
      actions: [detailPageAction({ id: "detail-new" })],
      catalog: createCatalog({
        detailPages: [
          {
            id: "detail-a",
            name: "A",
            status: "published",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            linkedRouteType: "unrelated-a",
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
          {
            id: "detail-b",
            name: "B",
            status: "published",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            linkedRouteType: "unrelated-b",
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
        ],
      }),
    });
    expect(result.matches).toContainEqual(
      expect.objectContaining({ reason: "ambiguous_candidates" })
    );
  });

  test("matchExistingCompositionResources blocks detail pages owned by another content type", () => {
    const result = matchExistingCompositionResources({
      actions: [detailPageAction({ id: "detail-planned" })],
      catalog: createCatalog({
        detailPages: [
          {
            id: "detail-planned",
            name: "Other",
            status: "published",
            contentTypeId: "ct-other",
            contentTypeSlug: "other",
            linkedRouteType: null,
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
        ],
      }),
    });
    expect(result.matches).toContainEqual(
      expect.objectContaining({ reason: "content_type_mismatch" })
    );
  });

  test("matchExistingCompositionResources reports ambiguous linked detail pages", () => {
    const result = matchExistingCompositionResources({
      actions: [detailPageAction({ id: "detail-new" })],
      catalog: createCatalog({
        detailPages: [
          {
            id: "detail-a",
            name: "A",
            status: "published",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            linkedRouteType: "products",
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
          {
            id: "detail-b",
            name: "B",
            status: "published",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            linkedRouteType: "products",
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
        ],
      }),
    });
    expect(result.matches).toContainEqual(
      expect.objectContaining({ reason: "ambiguous_candidates" })
    );
  });

  test("matchExistingCompositionResources reports ambiguous collection-link pages", () => {
    const result = matchExistingCompositionResources({
      actions: [
        {
          id: "page-products",
          type: "page.upsert",
          title: "Create products page",
          description: "Create products page.",
          input: {
            title: "Products",
            slug: "/new-products",
            status: "published",
            introTitle: "Products",
            introBody: "Products.",
            collectionLink: {
              contentTypeSlug: "products",
              pageRole: "canonical-list-page",
            },
          },
        },
      ],
      catalog: createCatalog({
        pages: [
          {
            id: "page-a",
            title: "A",
            slug: "/a",
            status: "published",
            collectionLink: {
              contentTypeId: "ct-products",
              pageRole: "canonical-list-page",
              compositionKey: null,
              listingQueryId: "query-products",
              listingTemplateId: "template-products",
            },
          },
          {
            id: "page-b",
            title: "B",
            slug: "/b",
            status: "published",
            collectionLink: {
              contentTypeId: "ct-products",
              pageRole: "canonical-list-page",
              compositionKey: null,
              listingQueryId: "query-products",
              listingTemplateId: "template-products",
            },
          },
        ],
      }),
    });
    expect(result.matches).toContainEqual(
      expect.objectContaining({ reason: "ambiguous_candidates" })
    );
  });

  test("matchExistingCompositionResources reports ambiguous custom screens and matches unique ones", () => {
    const screenAction: AssistantCustomScreenUpsertAction = {
      id: "screen-products",
      type: "custom-screen.upsert",
      title: "Create screen",
      description: "Create screen.",
      input: {
        name: "Products Screen",
        contentTypeSlug: "products",
        status: "active",
        showInSidebar: false,
        sidebarLabel: null,
        definition: normalizeCustomScreenDefinitionForWrite(),
      },
    };
    const ambiguous = matchExistingCompositionResources({
      actions: [screenAction],
      catalog: createCatalog({
        customScreens: [
          {
            id: "screen-a",
            name: "Products Screen",
            status: "active",
            contentTypeId: "ct-products",
            showInSidebar: false,
            sidebarLabel: null,
            collectionRole: null,
            compositionKey: null,
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-b",
            name: "Products Screen",
            status: "active",
            contentTypeId: "ct-products",
            showInSidebar: false,
            sidebarLabel: null,
            collectionRole: null,
            compositionKey: null,
            writableBindingFields: [],
            bindings: [],
          },
        ],
      }),
    });
    expect(ambiguous.matches).toContainEqual(
      expect.objectContaining({ reason: "ambiguous_candidates" })
    );

    const unique = matchExistingCompositionResources({
      actions: [screenAction],
      catalog: createCatalog({
        customScreens: [
          {
            id: "screen-a",
            name: "Products Screen",
            status: "active",
            contentTypeId: "ct-products",
            showInSidebar: false,
            sidebarLabel: null,
            collectionRole: null,
            compositionKey: null,
            writableBindingFields: [],
            bindings: [],
          },
        ],
      }),
    });
    expect(unique.matches).toContainEqual(
      expect.objectContaining({ resourceKey: "custom-screen:ct-products" })
    );
  });

  test("matchExistingCompositionResources reports missing required media assets", () => {
    const result = matchExistingCompositionResources({
      actions: [],
      catalog: createCatalog(),
      resources: [
        {
          key: "media:hero",
          kind: "media",
          label: "Hero image",
          executable: true,
          actionTypes: ["page.upsert"],
          stableTarget: "hero",
          owner: "page.upsert",
          metadata: { required: true },
        },
      ],
    });
    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ code: "media_asset_missing" })
    );
  });
});

describe("blueprint composition graph", () => {
  test("buildBlueprintCompositionGraph drops unregistered capabilities without a primary", () => {
    const graph = buildBlueprintCompositionGraph({
      candidates: [
        {
          capabilityId: "not-a-registered-capability",
          role: "primary",
          score: 20,
          matchedSignals: [],
          reasons: [],
        },
      ],
      promptKind: "setup_request",
      intentFamily: "unknown",
    });
    expect(graph.primary).toBeNull();
    expect(graph.fragments).toEqual([]);
  });
});

describe("blueprint conflict normalization", () => {
  test("normalizeBlueprintConflict rejects unsupported severity values", () => {
    expect(() =>
      normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "info" as never,
        message: "Duplicate resource.",
      })
    ).toThrow(/assistant_blueprint_conflict_invalid/);
  });
});

describe("generic markdown catalog blueprint", () => {
  test("buildGenericMarkdownCatalogPlan appends missing summary, image, and status fields and gates nested arrays", () => {
    const plan = buildGenericMarkdownCatalogPlan(
      `Stwórz katalog usług z tymi polami:
- nazwa
- cena
- termin_realizacji
- ilosc
- lokalizacja
- galeria_zdjec[]`,
      { promptKind: "setup_request", intentFamily: "services_directory" }
    );
    expect(plan).not.toBeNull();
    expect(JSON.stringify(plan)).toContain("summary");
    expect(JSON.stringify(plan)).toContain("heroImage");
    expect(JSON.stringify(plan)).toContain("projectStatus");
  });

  test("buildGenericMarkdownCatalogPlan extracts the markdown title heading", () => {
    const plan = buildGenericMarkdownCatalogPlan(
      "# Stwórz katalog uslug\n- nazwa\n- cena\n- opis\n- zdjecie",
      { promptKind: "setup_request", intentFamily: "services_directory" }
    );
    expect(plan).not.toBeNull();
    expect(plan?.intentId).toContain("generic-catalog");
  });

  test("buildGenericMarkdownCatalogPlan falls back to the catalog default title without headings", () => {
    const plan = buildGenericMarkdownCatalogPlan(
      "Stworz katalog produktow\n- nazwa\n- cena\n- opis\n- zdjecie",
      { promptKind: "setup_request", intentFamily: "product_catalog" }
    );
    expect(plan).not.toBeNull();
    expect(plan?.intentId).toContain("generic-catalog");
    expect(JSON.stringify(plan)).toContain("summary");
  });
});
