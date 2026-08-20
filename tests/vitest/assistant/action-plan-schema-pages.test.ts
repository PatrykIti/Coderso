import { expect, test } from "vitest";

import {
  normalizeAssistantActionPlan,
  isAssistantActionPlanStrict,
} from "../../../core/services/assistant/actionPlanSchema";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildFullServiceSitePlan } from "../../../core/services/assistant/blueprints/fullServiceSiteBlueprint";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

// Assistant detail-page authoring is schemaVersion 2 sections only
// (TASK-580-03-L06).
const buildV2DetailPageDocument = (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
}): Record<string, unknown> => ({
  schemaVersion: 2,
  id: input.id,
  name: "Products detail template",
  contentTypeId: input.contentTypeId,
  contentTypeSlug: input.contentTypeSlug,
  status: "published",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: {
      wrapper: {
        container: "default",
        padding: { top: "md", bottom: "lg" },
        background: {
          color: "#ffffff",
          image: null,
          media: {
            type: "none",
            source: "external",
            src: null,
          },
        },
      },
      sections: {
        gap: "lg",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      name: "Hero",
      variant: "centered",
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
        paddingTop: 64,
        paddingBottom: 64,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: null,
        startsAt: null,
        endsAt: null,
      },
      responsive: {},
      blocks: [
        {
          id: "hero-1-heading",
          type: "heading",
          props: { text: "Products detail" },
          visibility: { visible: true },
        },
      ],
    },
  ],
  bindings: [
    {
      id: "detail-title",
      blockId: "hero-1-heading",
      propPath: "text",
      source: { kind: "entry-field", field: "title" },
      transform: "text",
      required: true,
    },
  ],
});

test("normalizeAssistantActionPlan rejects retired page widget patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-spacer",
          type: "page.widget.patch",
          title: "Add spacer",
          description: "Append a spacer block to the page.",
          input: {
            pageSlug: "/products",
            operation: "upsert-block",
            block: {
              id: "assistant-spacer",
              type: "spacer",
              data: {},
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts page update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-update",
        type: "page.update",
        title: "Update page",
        description: "Update page metadata.",
        input: {
          id: "page-1",
          title: "Products",
          slug: "/products",
          expectedStatus: "draft",
          patch: {
            title: "Products Catalog",
            slug: "/catalog",
            status: "published",
            settings: {
              template: "landing",
              showInNav: false,
              revisionRetention: 5,
              seo: {
                title: "Products Catalog",
                description: "Browse products.",
              },
            },
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("page.update");
});

test("normalizeAssistantActionPlan accepts page upsert collection-link metadata", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create page",
        description: "Create a catalog page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          listingQueryName: "Products Catalog Query",
          listingTemplateSlug: "products-grid",
          introTitle: "Products",
          introBody: "Browse products.",
          collectionLink: {
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            pageRole: "canonical-list-page",
            listingQueryId: "query-products",
            listingQueryName: "Products Catalog Query",
            listingTemplateId: "template-products",
            listingTemplateSlug: "products-grid",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      collectionLink: {
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        pageRole: "canonical-list-page",
        listingQueryId: "query-products",
        listingQueryName: "Products Catalog Query",
        listingTemplateId: "template-products",
        listingTemplateSlug: "products-grid",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts page upsert sections that reference trusted media library asset ids", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create page",
        description: "Create a catalog page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          introTitle: "Products",
          introBody: "Browse products.",
          sections: [
            createPageSectionV2("hero", {
              id: "hero-1",
              name: "Hero",
              blocks: [
                createPageBlockV2("image", {
                  id: "hero-media",
                  props: {
                    assetId: "media-hero",
                    alt: "Product hero",
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      sections: [
        {
          blocks: [
            {
              props: {
                assetId: "media-hero",
              },
            },
          ],
        },
      ],
    },
  });
});

test("normalizeAssistantActionPlan accepts detail-page upsert documents", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-detail-page-upsert",
    status: "ready",
    intentId: "detail-page-upsert",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: buildV2DetailPageDocument({
            id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeId: "4fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
          }),
          expectedExistingId: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "detail-page.upsert",
    input: {
      expectedExistingId: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      document: {
        id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        contentTypeSlug: "products",
        status: "published",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts detail-page content type locators", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-detail-page-upsert-locator",
    status: "ready",
    intentId: "detail-page-upsert-locator",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          contentTypeId: {
            kind: "stable-slug",
            resourceType: "content-type",
            slug: "products",
          },
          document: buildV2DetailPageDocument({
            id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeId: "4fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
          }),
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "detail-page.upsert",
    input: {
      contentTypeId: {
        kind: "stable-slug",
        resourceType: "content-type",
        slug: "products",
      },
    },
  });
});

test("normalizeAssistantActionPlan rejects top-level detail-page status outside document", () => {
  expect(() =>
    normalizeAssistantActionPlan({
      id: "plan-detail-page-upsert-invalid",
      status: "ready",
      intentId: "detail-page-upsert-invalid",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Create detail template",
      answer: "I can create the detail template.",
      summary: "Create a products detail template.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "detail-page-products",
          type: "detail-page.upsert",
          title: "Create products detail template",
          description: "Create a products detail template.",
          input: {
            status: "published",
            document: buildV2DetailPageDocument({
              id: "54d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
              contentTypeId: "5fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
              contentTypeSlug: "products",
            }),
          },
        },
      ],
    })
  ).toThrow();
});

test("normalizeAssistantActionPlan accepts custom screen update and V4 edit actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "screen-update",
        type: "custom-screen.update",
        title: "Update screen",
        description: "Update custom screen.",
        input: {
          id: "screen-1",
          name: "Project Screen",
          expectedStatus: "draft",
          expectedContentTypeId: "ct-projects",
          patch: {
            name: "Project Screen Updated",
            status: "active",
            collectionRole: "secondary-admin-screen",
            compositionKey: "projects-secondary",
            showInSidebar: true,
            sidebarLabel: "Projects",
          },
        },
      },
      {
        id: "screen-block-patch",
        type: "custom-screen.block.patch",
        title: "Patch screen block",
        description: "Patch custom screen block.",
        input: {
          id: "screen-1",
          name: "Project Screen",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
        },
      },
      {
        id: "screen-binding-set",
        type: "custom-screen.binding.set",
        title: "Set screen binding",
        description: "Set custom screen binding.",
        input: {
          id: "screen-1",
          name: "Project Screen",
          expectedStatus: "draft",
          binding: {
            blockId: "hero-1",
            propPath: "headline",
            field: "title",
            mode: "readwrite",
          },
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "custom-screen.update",
    "custom-screen.block.patch",
    "custom-screen.binding.set",
  ]);
  expect(normalized.actions[0]).toMatchObject({
    input: {
      patch: {
        collectionRole: "secondary-admin-screen",
        compositionKey: "projects-secondary",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts safe form automation upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "form-success",
        type: "form.automation.upsert",
        title: "Set success message",
        description: "Set form success message automation.",
        input: {
          formId: "form-1",
          action: {
            id: "success-message",
            type: "success_message",
            label: "Show success",
            config: {
              message: "Thanks for your message.",
            },
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("form.automation.upsert");
});

test("normalizeAssistantActionPlan accepts form delete and archive actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "form-delete",
        type: "form.delete",
        title: "Delete contact form",
        description: "Delete empty form.",
        input: {
          id: "form-1",
          name: "Contact",
          slug: "contact",
          expectedStatus: "draft",
        },
      },
      {
        id: "form-archive",
        type: "form.archive",
        title: "Archive lead form",
        description: "Archive form with submissions.",
        input: {
          id: "form-2",
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual(["form.delete", "form.archive"]);
});

test("normalizeAssistantActionPlan rejects webhook form automation in this slice", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "form-webhook",
          type: "form.automation.upsert",
          title: "Set webhook",
          description: "Set form webhook automation.",
          input: {
            formId: "form-1",
            action: {
              id: "webhook",
              type: "webhook",
              config: {
                url: "https://example.com/hook",
                method: "POST",
                headers: {
                  authorization: "secret",
                },
                timeoutMs: 8000,
                includeSubmission: true,
              },
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});
