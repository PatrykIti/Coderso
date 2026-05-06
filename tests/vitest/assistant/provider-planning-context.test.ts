import { expect, test } from "vitest";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import { buildProviderPlanningPromptPackage } from "../../../core/services/assistant/providerPlanningContext";

const resourceCatalog = {
  schemaVersion: 1,
  generatedAt: "2026-04-12T10:00:00.000Z",
  budget: {
    maxItemsPerGroup: 50,
    maxFieldsPerResource: 24,
    truncated: false,
  },
  pages: [
    {
      id: "page-products",
      title: "Products",
      slug: "/products",
      status: "published",
    },
  ],
  contentTypes: [
    {
      id: "ct-products",
      slug: "products",
      name: "Products",
      entryCount: 4,
      fields: [
        {
          name: "title",
          type: "string",
          required: true,
          label: "Title",
          orderIndex: null,
        },
      ],
    },
    {
      id: "ct-services",
      slug: "services",
      name: "Services",
      entryCount: 2,
      fields: [],
    },
  ],
  customScreens: [],
  posts: [
    {
      id: "post-1",
      title: "Products launch",
      slug: "products-launch",
      status: "published",
      publishedAt: "2026-04-12T10:00:00.000Z",
    },
  ],
  entries: [
    {
      id: "entry-1",
      contentTypeId: "ct-products",
      contentTypeSlug: "products",
      title: "Router",
      slug: "router",
      status: "published",
      updatedAt: "2026-04-12T10:00:00.000Z",
    },
  ],
  listings: {
    queries: [],
    templates: [],
  },
  forms: [
    {
      id: "form-contact",
      name: "Contact",
      slug: "contact",
      status: "published",
      submissionAccess: "public",
      fields: [],
    },
  ],
  menus: [
    {
      id: "menu-primary",
      name: "Primary",
      location: "primary",
      itemCount: 1,
      items: [
        {
          id: "menu-products",
          label: "Products",
          href: "/products",
          pageId: null,
          parentId: null,
          orderIndex: 0,
          depth: 0,
        },
      ],
    },
  ],
  seoDocuments: [
    {
      id: "seo-products",
      targetType: "page",
      targetId: "page-products",
      targetTitle: "Products",
      slug: "/products",
      title: "Products",
      status: "warning",
    },
  ],
  widgets: [
    {
      id: "hero",
      source: "core",
      name: "Hero",
      description: "Hero widget",
      category: "content",
      module: "content",
      complexity: "composite",
      audience: "beginner",
      variants: ["default"],
      slots: [],
      surfaces: ["page-builder"],
      requires: [],
      status: "published",
    },
  ],
  media: [
    {
      id: "media-hero",
      name: "Hero",
      altText: "Hero",
      mimeType: "image/jpeg",
      width: 1600,
      height: 900,
      folder: null,
    },
  ],
  commerce: {
    products: [
      {
        id: "commerce-product-1",
        slug: "router-x",
        name: "Router X",
        status: "active",
        price: "299.00",
      },
    ],
    collections: [
      {
        id: "collection-1",
        slug: "networking",
        name: "Networking",
        productCount: 1,
      },
    ],
  },
  solutionKits: [
    {
      id: "kit-1",
      title: "Workshop",
      businessType: "services",
      moduleCount: 3,
      installed: false,
    },
  ],
  warnings: [],
} as unknown as AssistantActionContext["resourceCatalog"];

test("buildProviderPlanningPromptPackage creates bounded deterministic context", () => {
  const prompt = buildProviderPlanningPromptPackage({
    prompt: "Create a product catalog",
    maxDocs: 1,
    maxCharsPerDoc: 20,
    maxResourceItemsPerGroup: 1,
    evidence: [
      {
        path: "docs/coderso/products.md",
        heading: "Products",
        content: "This is a long documentation passage for product catalogs.",
        score: 3,
      },
      {
        path: "docs/coderso/other.md",
        heading: "Other",
        content: "Other content",
        score: 1,
      },
    ],
    context: {
      page: "/admin/advanced/entries",
      locale: "pl-PL",
      resourceCatalog,
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/entries",
        activeHref: "/admin/advanced/entries",
        area: "advanced",
        advancedModule: "entries",
        selectedResource: {
          kind: "content-type",
          id: "ct-products",
        },
        visibleActions: [
          {
            id: "entry.create",
            label: "Create entry",
            kind: "create",
            href: "/admin/advanced/entries",
            requiredPermission: "content:write",
          },
        ],
        permissionHints: {
          known: false,
          requiredForVisibleActions: ["content:write"],
          reason: "frontend_user_has_no_permissions",
        },
      },
    },
  });

  expect(prompt).toMatchObject({
    schemaVersion: 1,
    prompt: "Create a product catalog",
    locale: "pl-PL",
    route: "/admin/advanced/entries",
    runtime: {
      route: "/admin/advanced/entries",
      area: "advanced",
      advancedModule: "entries",
      selectedResource: {
        kind: "content-type",
        id: "ct-products",
      },
    },
  });
  expect(prompt.docs).toHaveLength(1);
  expect(prompt.docs[0]?.content).toContain("...");
  expect(prompt.registry.some((entry) => entry.kind === "page")).toBe(true);
  expect(prompt.policyGuidance.resources.some((entry) => entry.key === "page")).toBe(true);
  expect(prompt.policyGuidance.resources.some((entry) => entry.key === "settings-api-keys")).toBe(
    true
  );
  expect(prompt.operationDraftGuidance.notes.join(" ")).toContain("Allowed draft resourceKinds");
  expect(prompt.operationDraftGuidance.notes.join(" ")).toContain("custom-screen.status");
  expect(prompt.operationDraftGuidance.notes.join(" ")).toContain(
    "Secret-bearing resources are redacted"
  );
  expect(JSON.stringify(prompt.operationDraftGuidance.examples)).toContain("Custom Screens");
  expect(JSON.stringify(prompt.operationDraftGuidance.examples)).toContain("content-type");
  expect(JSON.stringify(prompt.operationDraftGuidance.examples)).toContain("Lead Form");
  expect(JSON.stringify(prompt.operationDraftGuidance.examples)).toContain("listing-query");
  expect(JSON.stringify(prompt.operationDraftGuidance.examples)).toContain("seo-document");
  expect(prompt.resources?.pages).toHaveLength(1);
  expect(prompt.resources?.posts).toHaveLength(1);
  expect(prompt.resources?.entries).toHaveLength(1);
  expect(prompt.resources?.contentTypes).toHaveLength(1);
  expect(prompt.resources?.forms).toHaveLength(1);
  expect(prompt.resources?.menus).toHaveLength(1);
  expect(prompt.resources?.seoDocuments).toHaveLength(1);
  expect(prompt.resources?.widgets).toHaveLength(1);
  expect(prompt.resources?.media).toHaveLength(1);
  expect(prompt.resources?.commerce.products).toHaveLength(1);
  expect(prompt.resources?.commerce.collections).toHaveLength(1);
  expect(prompt.resources?.solutionKits).toHaveLength(1);
  expect(prompt.blueprints.capabilities).toHaveLength(1);
  expect(prompt.blueprints.capabilities[0]?.id).toBe("house-projects-catalog");
  expect(prompt.blueprints.warnings).toContain("detail_pages_unavailable");
  expect(prompt.activeSurface).toBeNull();
  expect(prompt.warnings).toEqual([
    "docs_truncated",
    "doc_content_truncated",
    "content_types_truncated",
  ]);
});

test("buildProviderPlanningPromptPackage includes redacted active surface summaries", () => {
  const prompt = buildProviderPlanningPromptPackage({
    prompt: "Edit current template block",
    context: {
      page: "/admin/advanced/widgets/templates/template-1",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Contact Template",
          status: "published",
          category: "Marketing",
        },
        selectedBlockId: "cta-1",
        blocks: [
          {
            id: "cta-1",
            type: "cta-banner",
            label: "apiKey should be hidden",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: null,
            templateName: null,
          },
        ],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(prompt.activeSurface).toMatchObject({
    kind: "widget-template",
    template: {
      id: "template-1",
      name: "Contact Template",
    },
    selectedBlockId: "cta-1",
  });
  expect(JSON.stringify(prompt)).not.toContain("apiKey should be hidden");
  expect(
    prompt.activeSurface?.kind === "widget-template" ? prompt.activeSurface.blocks[0]?.label : null
  ).toBeNull();
});

test("buildProviderPlanningPromptPackage includes referenced template target context", () => {
  const prompt = buildProviderPlanningPromptPackage({
    prompt: "Edit the template-backed page section",
    context: {
      page: "/admin/pages/page-1",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-1",
          title: "Home",
          slug: "/",
          status: "draft",
          template: "landing",
        },
        selectedBlockId: "template-section-1",
        blocks: [
          {
            id: "template-section-1",
            type: "template-section",
            label: "Template section",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: "template-1",
            templateName: "Hero Template",
          },
        ],
        templateReferences: [
          {
            templateId: "template-1",
            templateName: "Hero Template",
            blockIds: ["template-section-1"],
            paths: ["0"],
            count: 1,
          },
        ],
        referencedTemplates: [
          {
            id: "template-1",
            name: "Hero Template",
            status: "published",
            category: "Marketing",
            description: null,
            blockCount: 1,
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                label: "apiKey should be hidden",
                path: "0",
                childCount: 0,
                slotKeys: [],
                dataKeys: ["headline", "apiKey"],
                templateId: null,
                templateName: null,
              },
            ],
            settings: {
              wrapperContainer: "default",
              sectionGap: "md",
              hasBackgroundMedia: false,
            },
            warnings: [],
          },
        ],
        warnings: [],
      },
    },
  });

  expect(prompt.activeSurface).toMatchObject({
    kind: "page",
    templateReferences: [
      {
        templateId: "template-1",
        blockIds: ["template-section-1"],
      },
    ],
    referencedTemplates: [
      {
        id: "template-1",
        blocks: [
          {
            id: "hero-1",
            dataKeys: ["headline"],
          },
        ],
      },
    ],
  });
  expect(JSON.stringify(prompt)).not.toContain("apiKey should be hidden");
  expect(JSON.stringify(prompt)).not.toContain("apiKey");
});

test("buildProviderPlanningPromptPackage redacts secret-like prompt data", () => {
  const prompt = buildProviderPlanningPromptPackage({
    prompt: "Use apiKey sk-or-v1-1234567890abcdef",
    evidence: [
      {
        path: "docs/private.md",
        heading: "Private",
        content: "Bearer sk-secret-12345678",
        score: 1,
      },
    ],
    context: {
      locale: "en",
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/settings",
        activeHref: "/admin/settings",
        area: "settings",
        advancedModule: null,
        selectedResource: null,
        visibleActions: [
          {
            id: "integration.secret.update",
            label: "Update secret",
            kind: "configure",
            href: "/admin/settings/integrations",
            requiredPermission: "settings:write",
          },
        ],
        permissionHints: {
          known: false,
          requiredForVisibleActions: ["settings:write"],
          reason: "frontend_user_has_no_permissions",
        },
      },
    },
  });

  expect(JSON.stringify(prompt)).not.toContain("sk-or-v1-1234567890abcdef");
  expect(JSON.stringify(prompt)).not.toContain("sk-secret-12345678");
  expect(JSON.stringify(prompt)).toContain("[REDACTED]");
});
