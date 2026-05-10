import { expect, test } from "vitest";

import { hydrateAssistantActiveSurfaceContext } from "../../../core/services/assistant/activeSurfaceHydration";

const deps = {
  getPage: async (id: string) =>
    id === "page-1"
      ? {
          id,
          title: "Contact from server",
          slug: "/contact",
          status: "published",
        }
      : null,
  getWidgetTemplate: async (id: string) =>
    id === "template-1"
      ? {
          id,
          name: "Template from server",
          status: "published",
          category: "Marketing",
        }
      : null,
  getCustomScreen: async (id: string) =>
    id === "screen-1"
      ? {
          id,
          name: "Screen from server",
          status: "active",
          contentTypeId: "type-1",
          showInSidebar: true,
          sidebarLabel: "Screen",
          capabilities: { mode: "editor" },
        }
      : null,
  getDetailPageDocument: async (id: string) =>
    id === "detail-page-1"
      ? {
          id,
          name: "Product Detail from server",
          contentTypeId: "ct-products",
          status: "published",
          currentDocument: {
            schemaVersion: 1,
            id,
            name: "Product Detail from server",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            status: "published",
            titlePattern: "{title} | Store",
            blocks: [
              {
                id: "template-ref",
                type: "template-section",
                data: {
                  templateId: "template-1",
                  templateName: "Product CTA",
                },
              },
            ],
          },
        }
      : null,
  getCollectionWorkspaceSummary: async (contentTypeId: string) => {
    if (contentTypeId !== "ct-products") throw new Error("content_type_not_found");
    return {
      contentType: {
        id: "ct-products",
        name: "Products",
        slug: "products",
        status: "published",
        fieldCount: 3,
        updatedAt: "2026-05-10T10:00:00.000Z",
      },
      canonical: {
        contentRoute: null,
        detailPage: {
          id: "detail-page-1",
          label: "Product Detail",
          status: "published",
        },
        listPage: null,
        listingQuery: null,
        listingTemplate: null,
        adminScreen: null,
      },
      linkedSecondary: {
        pages: [],
        adminScreens: [],
      },
      unresolved: [],
      candidates: {
        detailPages: [
          {
            id: "detail-page-1",
            label: "Product Detail",
            status: "published",
          },
        ],
        pages: [],
        listingQueries: [],
        listingTemplates: [],
        adminScreens: [],
      },
    };
  },
};

test("hydrateAssistantActiveSurfaceContext rehydrates page identity and preserves block summary", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      page: "/admin/pages/page-1",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-1",
          title: "Contact local",
          slug: "/local",
          status: "draft",
          template: "landing",
        },
        selectedBlockId: "hero-1",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            label: "Hero",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: null,
            templateName: null,
          },
        ],
        warnings: [],
      },
    },
    deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]
  );

  expect(context?.activeSurface).toMatchObject({
    kind: "page",
    page: {
      id: "page-1",
      title: "Contact from server",
      slug: "/contact",
      status: "published",
      template: "landing",
    },
    blocks: [{ id: "hero-1", type: "hero" }],
  });
});

test("hydrateAssistantActiveSurfaceContext drops missing active resources", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "missing",
          name: "Missing",
          status: "draft",
          category: "Marketing",
        },
        selectedBlockId: null,
        blocks: [],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
    deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]
  );

  expect(context?.activeSurface).toBeNull();
});

test("hydrateAssistantActiveSurfaceContext rehydrates detail page surface and workspace package", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      page: "/admin/advanced/engine/ct-products/collection/detail-template/detail-page-1",
      collectionWorkspaceHint: {
        contentTypeId: "ct-products",
        activeDetailPageId: "detail-page-1",
      },
      activeSurface: {
        kind: "detail-page",
        detailPage: {
          id: "detail-page-1",
          name: "Product Detail local",
          status: "draft",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          titlePattern: "{title}",
        },
        sampleEntryId: "entry-1",
        selectedBlockId: "template-ref",
        blocks: [
          {
            id: "template-ref",
            type: "template-section",
            label: "Product CTA",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: "template-1",
            templateName: "Product CTA",
          },
        ],
        warnings: [],
      },
    },
    deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]
  );

  expect(context?.collectionWorkspace).toMatchObject({
    contentType: {
      id: "ct-products",
    },
    activeDetailPageId: "detail-page-1",
  });
  expect(context?.activeSurface).toMatchObject({
    kind: "detail-page",
    detailPage: {
      id: "detail-page-1",
      name: "Product Detail from server",
      status: "published",
      contentTypeSlug: "products",
      titlePattern: "{title} | Store",
    },
    templateReferences: [
      {
        templateId: "template-1",
        blockIds: ["template-ref"],
      },
    ],
  });
});

test("hydrateAssistantActiveSurfaceContext drops stale detail page surfaces", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      page: "/admin/advanced/engine/ct-products/collection/detail-template/missing",
      collectionWorkspaceHint: {
        contentTypeId: "ct-products",
        activeDetailPageId: "missing",
      },
      activeSurface: {
        kind: "detail-page",
        detailPage: {
          id: "missing",
          name: "Missing",
          status: "draft",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          titlePattern: "{title}",
        },
        sampleEntryId: null,
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    },
    deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]
  );

  expect(context?.activeSurface).toBeNull();
  expect(context?.collectionWorkspace?.activeDetailPageId).toBeNull();
});

test("hydrateAssistantActiveSurfaceContext drops workspace package when read permission is missing", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      collectionWorkspaceHint: {
        contentTypeId: "ct-products",
        activeDetailPageId: "detail-page-1",
      },
      activeSurface: {
        kind: "detail-page",
        detailPage: {
          id: "detail-page-1",
          name: "Product Detail",
          status: "draft",
          contentTypeId: "ct-products",
          contentTypeSlug: "products",
          titlePattern: "{title}",
        },
        sampleEntryId: null,
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    },
    {
      ...(deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]),
      permissions: ["settings:read"],
    }
  );

  expect(context?.collectionWorkspace).toBeNull();
  expect(context?.activeSurface).toBeNull();
});
