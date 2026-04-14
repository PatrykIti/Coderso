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
  expect(summary?.blocks.map((block) => block.id)).toEqual([
    "hero-1",
    "cta-1",
    "nested-template",
  ]);
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

test("hydrateAssistantActiveSurfaceContext loads referenced page template summaries", async () => {
  const templateLoads: string[] = [];
  const deps = {
    getPage: async (id: string) =>
      id === "page-1"
        ? {
            id,
            title: "Contact from server",
            slug: "/contact",
            status: "published",
            currentData: {
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
  };

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
    deps
  );

  expect(templateLoads.sort()).toEqual(["template-a", "template-b"]);
  expect(context?.activeSurface).toMatchObject({
    kind: "page",
    page: {
      id: "page-1",
      title: "Contact from server",
      slug: "/contact",
      status: "published",
      template: "landing",
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

test("buildAssistantAdminContext preserves server-hydrated referenced template summaries", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/pages/page-1",
    activeSurface: {
      kind: "page",
      page: {
        id: "page-1",
        title: "Contact",
        slug: "/contact",
        status: "published",
        template: "landing",
      },
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
    kind: "page",
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
