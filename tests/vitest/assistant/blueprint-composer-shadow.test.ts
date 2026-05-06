import { afterEach, expect, test, vi } from "vitest";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import {
  compareBlueprintCandidateSelection,
  runBlueprintCandidateShadow,
  shouldRunBlueprintCandidateShadow,
} from "../../../core/services/assistant/blueprints/blueprintComposerShadow";
import { resolveBlueprintCandidates } from "../../../core/services/assistant/blueprints/blueprintCandidateResolver";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("compareBlueprintCandidateSelection reports no mismatch for live-composed mixed product prompts", () => {
  const currentPlan = planAssistantActions({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    })
  ).toMatchObject({
    currentIntentId: "blueprint-composed-product-catalog",
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
    mismatchReason: null,
  });
});

test("compareBlueprintCandidateSelection reports composed capability drift when adjunct or gated selections change", () => {
  const currentPlan = planAssistantActions({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with booking.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    }).mismatchReason
  ).toBe("composed_capabilities_drifted");
});

test("compareBlueprintCandidateSelection reports no mismatch for aligned single-pack prompts", () => {
  const currentPlan = planAssistantActions({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    }).mismatchReason
  ).toBeNull();
});

test("compareBlueprintCandidateSelection reports gated-only shadow outcomes", () => {
  const currentPlan = planAssistantActions({
    prompt: "I need booking setup with reservations and a calendar.",
  });
  const candidates = resolveBlueprintCandidates({
    prompt: "I need booking setup with reservations and a calendar.",
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    })
  ).toMatchObject({
    primaryCapabilityId: null,
    gatedCapabilityIds: ["booking-service"],
    mismatchReason: "missing_primary_candidate",
  });
});

test("compareBlueprintCandidateSelection reports no mismatch for live-composed gated mixed prompts", () => {
  const currentPlan = planAssistantActions({
    prompt: "Build a services directory with contact page and booking.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt: "Build a services directory with contact page and booking.",
    context: {
      page: "/admin/advanced/entries",
      locale: "en-US",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    })
  ).toMatchObject({
    currentIntentId: "blueprint-composed-services-directory-needs-input",
    primaryCapabilityId: "services-directory",
    adjunctCapabilityIds: ["lead-capture-site"],
    gatedCapabilityIds: ["booking-service"],
    mismatchReason: null,
  });
});

test("runBlueprintCandidateShadow uses catalog context to avoid no-candidate drift on refinements", () => {
  const context: AssistantActionContext = {
    page: "/admin/advanced/listings",
    locale: "pl-PL",
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: "2026-05-06T10:00:00.000Z",
      budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
      pages: [],
      posts: [],
      entries: [],
      contentTypes: [
        {
          id: "ct-products",
          slug: "products",
          name: "Products",
          entryCount: 1,
          fields: [],
        },
      ],
      customScreens: [],
      listings: {
        queries: [
          {
            id: "query-products",
            name: "Products Query",
            description: null,
            source: "entries",
            contentTypeId: "ct-products",
            taxonomyId: null,
            includeDrafts: false,
            fields: ["title"],
            sort: [],
            limit: 12,
          },
        ],
        templates: [],
      },
      forms: [],
      menus: [],
      seoDocuments: [],
      widgets: [],
      media: [],
      warnings: [],
    },
  };

  const currentPlan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context,
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj sortowanie A-Z",
      context,
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("runBlueprintCandidateShadow resolves portfolio catalog context from resource catalog hints", () => {
  const currentPlan = planAssistantActions({
    prompt: "dodaj case study highlights",
    context: {
      page: "/admin/advanced/listings",
      locale: "en-US",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-portfolio",
            slug: "portfolio",
            name: "Portfolio",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj case study highlights",
      context: {
        page: "/admin/advanced/listings",
        locale: "en-US",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-06T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
          posts: [],
          entries: [],
          contentTypes: [
            {
              id: "ct-portfolio",
              slug: "portfolio",
              name: "Portfolio",
              entryCount: 1,
              fields: [],
            },
          ],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          media: [],
          warnings: [],
        },
      },
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: "portfolio-projects",
  });
});

test("runBlueprintCandidateShadow resolves services catalog context from resource catalog hints", () => {
  const currentPlan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z dla uslug",
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-services",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj sortowanie A-Z dla uslug",
      context: {
        page: "/admin/advanced/listings",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-06T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
          posts: [],
          entries: [],
          contentTypes: [
            {
              id: "ct-services",
              slug: "services",
              name: "Services",
              entryCount: 1,
              fields: [],
            },
          ],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          media: [],
          warnings: [],
        },
      },
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: "services-directory",
  });
});

test("runBlueprintCandidateShadow ignores caller resource catalogs without the include flag", () => {
  const currentPlan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
    },
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj sortowanie A-Z",
      context: {
        page: "/admin/advanced/listings",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-06T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
          posts: [],
          entries: [],
          contentTypes: [
            {
              id: "ct-products",
              slug: "products",
              name: "Products",
              entryCount: 1,
              fields: [],
            },
          ],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          media: [],
          warnings: [],
        },
      },
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: null,
    mismatchReason: "no_candidates",
  });
});

test("runBlueprintCandidateShadow does not let unrelated pages catalog residue pick a blueprint", () => {
  const currentPlan = planAssistantActions({
    prompt: "czy widzisz strone Home w Pages?",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [{ id: "page-home", title: "Home", slug: "/", status: "published" }],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "czy widzisz strone Home w Pages?",
      context: {
        page: "/admin/pages",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-06T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [{ id: "page-home", title: "Home", slug: "/", status: "published" }],
          posts: [],
          entries: [],
          contentTypes: [
            {
              id: "ct-products",
              slug: "products",
              name: "Products",
              entryCount: 1,
              fields: [],
            },
          ],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          media: [],
          warnings: [],
        },
      },
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: null,
  });
});

test("runBlueprintCandidateShadow normalizes admin alias routes before resolving candidates", () => {
  const context: AssistantActionContext = {
    page: "/admin/content",
    locale: "pl-PL",
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: "2026-05-06T10:00:00.000Z",
      budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
      pages: [],
      posts: [],
      entries: [],
      contentTypes: [
        {
          id: "ct-products",
          slug: "products",
          name: "Products",
          entryCount: 1,
          fields: [],
        },
      ],
      customScreens: [],
      listings: {
        queries: [
          {
            id: "query-products",
            name: "Products Query",
            description: null,
            source: "entries",
            contentTypeId: "ct-products",
            taxonomyId: null,
            includeDrafts: false,
            fields: ["title"],
            sort: [],
            limit: 12,
          },
        ],
        templates: [],
      },
      forms: [],
      menus: [],
      seoDocuments: [],
      widgets: [],
      media: [],
      warnings: [],
    },
  };

  const currentPlan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context,
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj sortowanie A-Z",
      context,
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: "product-catalog",
  });
});

test("runBlueprintCandidateShadow treats mixed catalog residue as ambiguous", () => {
  const currentPlan = planAssistantActions({
    prompt: "dodaj sortowanie A-Z",
    context: {
      page: "/admin/advanced/listings/query-services",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-06T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 1,
            fields: [],
          },
          {
            id: "ct-services",
            slug: "services",
            name: "Services",
            entryCount: 1,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(
    runBlueprintCandidateShadow({
      prompt: "dodaj sortowanie A-Z",
      context: {
        page: "/admin/advanced/listings/query-services",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-06T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
          posts: [],
          entries: [],
          contentTypes: [
            {
              id: "ct-products",
              slug: "products",
              name: "Products",
              entryCount: 1,
              fields: [],
            },
            {
              id: "ct-services",
              slug: "services",
              name: "Services",
              entryCount: 1,
              fields: [],
            },
          ],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          widgets: [],
          media: [],
          warnings: [],
        },
      },
      currentPlan,
    })
  ).toMatchObject({
    primaryCapabilityId: "services-directory",
  });
});

test("shouldRunBlueprintCandidateShadow stays off outside tests/debug for normal runtime prompts", () => {
  vi.stubEnv("NODE_ENV", "production");

  expect(
    shouldRunBlueprintCandidateShadow({
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
      },
    })
  ).toBe(false);

  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  expect(
    shouldRunBlueprintCandidateShadow({
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
      },
    })
  ).toBe(true);
});

test("shouldRunBlueprintCandidateShadow still blocks non-allowlisted prompts outside tests", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  expect(
    shouldRunBlueprintCandidateShadow({
      promptKind: "setup_request",
      intentFamily: "unknown",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
      },
    })
  ).toBe(false);
});
