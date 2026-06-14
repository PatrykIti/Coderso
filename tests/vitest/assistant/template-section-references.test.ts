import { expect, test } from "vitest";

import { hydrateAssistantActiveSurfaceContext } from "../../../core/services/assistant/activeSurfaceHydration";
import {
  extractAssistantTemplateSectionReferences,
  normalizeAssistantReferencedWidgetTemplate,
} from "../../../core/services/assistant/adminContextCatalogNormalizer";
import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";

test("extractAssistantTemplateSectionReferences finds nested refs and dedupes template ids", () => {
  const references = extractAssistantTemplateSectionReferences([
    {
      id: "section-a",
      type: "template-section",
      data: {
        templateId: "template-a",
        templateName: "Contact CTA",
      },
    },
    {
      id: "layout",
      type: "grid-columns",
      data: {},
      slots: {
        main: [
          {
            id: "section-a-repeat",
            type: "template-section",
            data: {
              templateId: "template-a",
              templateName: "Contact CTA Copy",
            },
          },
          {
            id: "section-b",
            type: "template-section",
            data: {
              templateId: "template-b",
              templateName: "Footer CTA",
            },
          },
        ],
      },
    },
  ]);

  expect(references).toEqual([
    {
      templateId: "template-a",
      templateName: "Contact CTA",
      blockIds: ["section-a", "section-a-repeat"],
      paths: ["0", "1.slots.main.0"],
      count: 2,
    },
    {
      templateId: "template-b",
      templateName: "Footer CTA",
      blockIds: ["section-b"],
      paths: ["1.slots.main.1"],
      count: 1,
    },
  ]);
});

test("normalizeAssistantReferencedWidgetTemplate summarizes nested blocks and redacts secret-like config", () => {
  const summary = normalizeAssistantReferencedWidgetTemplate({
    id: "template-a",
    name: "Contact CTA",
    status: "published",
    category: "Marketing",
    description: "Reusable CTA section.",
    settings: {
      layout: {
        wrapper: {
          container: "narrow",
          background: {
            media: {
              type: "image",
              source: "external",
              src: "https://cdn.example.test/hero.jpg",
            },
          },
        },
        sections: {
          gap: "md",
        },
      },
    },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        data: {
          title: "Visible title",
          headline: "apiKey should not become a label",
          apiKey: "never expose",
        },
        children: [
          {
            id: "cta-1",
            type: "cta-banner",
            data: {
              headline: "Book now",
              webhookSecret: "never expose",
            },
          },
        ],
        slots: {
          footer: [
            {
              id: "secret-widget",
              type: "token-secret-widget",
              data: {
                title: "Do not expose",
              },
            },
          ],
        },
      },
      {
        id: "nested-template",
        type: "template-section",
        data: {
          templateId: "template-b",
          templateName: "Nested CTA",
        },
      },
    ],
  });

  expect(summary).toMatchObject({
    id: "template-a",
    name: "Contact CTA",
    blockCount: 4,
    settings: {
      wrapperContainer: "narrow",
      sectionGap: "md",
      hasBackgroundMedia: true,
    },
  });
  expect(summary?.blocks.map((block) => block.id)).toEqual(["hero-1", "cta-1", "nested-template"]);
  expect(summary?.blocks[0]).toMatchObject({
    id: "hero-1",
    label: "Visible title",
    dataKeys: ["headline", "title"],
    slotKeys: ["footer"],
  });
  expect(summary?.blocks[2]).toMatchObject({
    id: "nested-template",
    type: "template-section",
    templateId: "template-b",
    templateName: "Nested CTA",
  });
  expect(JSON.stringify(summary)).not.toContain("never expose");
  expect(JSON.stringify(summary)).not.toContain("apiKey should not become a label");
  expect(JSON.stringify(summary)).not.toContain("secret-widget");
  expect(summary?.warnings).toContain("widget_template_template-a_block_data_key_redacted");
  expect(summary?.warnings).toContain("widget_template_template-a_block_redacted");
});

test("hydrateAssistantActiveSurfaceContext loads referenced detail-page template summaries", async () => {
  const templateLoads: string[] = [];
  const deps = {
    getPage: async () => null,
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
                  id: "persisted-ref",
                  type: "template-section",
                  data: {
                    templateId: "template-a",
                    templateName: "Contact CTA",
                  },
                },
                {
                  id: "persisted-footer-ref",
                  type: "template-section",
                  data: {
                    templateId: "template-b",
                    templateName: "Footer CTA",
                  },
                },
              ],
            },
          }
        : null,
    getWidgetTemplate: async (id: string) => {
      templateLoads.push(id);
      return id === "template-a"
        ? {
            id,
            name: "Contact CTA",
            status: "published",
            category: "Marketing",
            description: null,
            settings: {
              layout: {
                wrapper: { container: "default" },
                sections: { gap: "md" },
              },
            },
            blocks: [
              {
                id: "cta-1",
                type: "cta-banner",
                data: {
                  headline: "Contact us",
                },
              },
            ],
          }
        : null;
    },
    getCustomScreen: async () => null,
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
        selectedBlockId: "local-ref",
        blocks: [
          {
            id: "local-ref",
            type: "template-section",
            label: "Local CTA",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: "template-a",
            templateName: "Contact CTA",
          },
        ],
        warnings: [],
      },
    },
    deps as unknown as Parameters<typeof hydrateAssistantActiveSurfaceContext>[1]
  );

  expect(templateLoads.sort()).toEqual(["template-a", "template-b"]);
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
        templateId: "template-a",
        blockIds: ["local-ref", "persisted-ref"],
        count: 2,
      },
      {
        templateId: "template-b",
        blockIds: ["persisted-footer-ref"],
        count: 1,
      },
    ],
    referencedTemplates: [
      {
        id: "template-a",
        blocks: [
          {
            id: "cta-1",
            type: "cta-banner",
            dataKeys: ["headline"],
          },
        ],
      },
    ],
    warnings: ["referenced_widget_template_missing"],
  });
});

test("buildAssistantAdminContext preserves server-hydrated detail-page template summaries", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/advanced/engine/ct-products/collection/detail-template/detail-page-1",
    activeSurface: {
      kind: "detail-page",
      detailPage: {
        id: "detail-page-1",
        name: "Product Detail",
        status: "published",
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        titlePattern: "{title}",
      },
      sampleEntryId: "entry-1",
      selectedBlockId: null,
      blocks: [],
      templateReferences: [
        {
          templateId: "template-a",
          templateName: "Contact CTA",
          blockIds: ["section-a"],
          paths: ["0"],
          count: 1,
        },
      ],
      referencedTemplates: [
        {
          id: "template-a",
          name: "Contact CTA",
          status: "published",
          category: "Marketing",
          description: null,
          blockCount: 3,
          blocks: [
            {
              id: "cta-1",
              type: "cta-banner",
              label: "Contact",
              path: "0",
              childCount: 0,
              slotKeys: [],
              dataKeys: ["headline"],
              templateId: null,
              templateName: null,
            },
          ],
          settings: {
            wrapperContainer: "narrow",
            sectionGap: "md",
            hasBackgroundMedia: true,
          },
          warnings: [],
        },
      ],
      warnings: [],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "detail-page",
    templateReferences: [
      {
        templateId: "template-a",
        blockIds: ["section-a"],
        count: 1,
      },
    ],
    referencedTemplates: [
      {
        id: "template-a",
        blockCount: 3,
        blocks: [
          {
            id: "cta-1",
            dataKeys: ["headline"],
          },
        ],
        settings: {
          wrapperContainer: "narrow",
          sectionGap: "md",
          hasBackgroundMedia: true,
        },
      },
    ],
  });
});
