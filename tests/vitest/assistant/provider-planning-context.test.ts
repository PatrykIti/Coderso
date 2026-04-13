import { expect, test } from "vitest";

import { buildProviderPlanningPromptPackage } from "../../../core/services/assistant/providerPlanningContext";

const resourceCatalog = {
  schemaVersion: 1,
  generatedAt: "2026-04-12T10:00:00.000Z",
  budget: {
    maxItemsPerGroup: 50,
    maxFieldsPerResource: 24,
    truncated: false,
  },
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
  warnings: [],
} as const;

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
      page: "/admin/coderso/entries",
      locale: "pl-PL",
      resourceCatalog,
      runtimeSnapshot: {
        schemaVersion: 1,
        route: "/admin/coderso/entries",
        activeHref: "/admin/coderso/entries",
        area: "coderso",
        codersoModule: "entries",
        selectedResource: {
          kind: "content-type",
          id: "ct-products",
        },
        visibleActions: [
          {
            id: "entry.create",
            label: "Create entry",
            kind: "create",
            href: "/admin/coderso/entries",
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
    route: "/admin/coderso/entries",
    runtime: {
      route: "/admin/coderso/entries",
      area: "coderso",
      codersoModule: "entries",
      selectedResource: {
        kind: "content-type",
        id: "ct-products",
      },
    },
  });
  expect(prompt.docs).toHaveLength(1);
  expect(prompt.docs[0]?.content).toContain("...");
  expect(prompt.resources?.contentTypes).toHaveLength(1);
  expect(prompt.resources?.forms).toHaveLength(1);
  expect(prompt.resources?.widgets).toHaveLength(1);
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
      page: "/admin/coderso/widgets/templates/template-1",
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
  expect(prompt.activeSurface?.kind === "widget-template" ? prompt.activeSurface.blocks[0]?.label : null).toBeNull();
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
        schemaVersion: 1,
        route: "/admin/settings",
        activeHref: "/admin/settings",
        area: "settings",
        codersoModule: null,
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
