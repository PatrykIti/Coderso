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

test("normalizeAssistantActionPlan rejects malformed form delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
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
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "form-archive",
          type: "form.archive",
          title: "Archive contact form",
          description: "Archive form.",
          input: {
            id: "form-1",
            name: "Contact",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsupported page widget patch operations", () => {
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
            operation: "delete-block",
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

test("normalizeAssistantActionPlan rejects unsafe page widget data patch paths", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-hero-title",
          type: "page.widget.patch",
          title: "Patch hero title",
          description: "Patch selected block title.",
          input: {
            pageSlug: "/products",
            operation: "patch-data",
            blockId: "hero-1",
            dataPath: ["__proto__"],
            value: "Nope",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed page update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
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
            patch: {
              blocks: [],
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects retired widget template edit actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const type of ["widget-template.update", "widget-template.block.patch"]) {
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: "template-update",
            type,
            title: "Update template",
            description: "Update reusable widget template.",
            input: {
              id: "template-1",
              name: "Hero Template",
              patch: {
                settings: {
                  wrapperContainer: "wide",
                },
              },
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan rejects malformed custom screen edit actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
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
            patch: {
              binding: {
                blockId: "hero-1",
                propPath: "headline",
                field: "title",
                mode: "admin",
              },
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "screen-block-patch",
          type: "custom-screen.block.patch",
          title: "Patch screen block",
          description: "Patch custom screen block.",
          input: {
            id: "screen-1",
            name: "Project Screen",
            blockId: "hero-1",
            dataPath: ["prototype"],
            value: "Nope",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed listing template card patches", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-card",
          type: "listing-template.card.patch",
          title: "Update card config",
          description: "Patch product card config.",
          input: {
            listingTemplateSlug: "products-grid",
            card: {},
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed remaining domain update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-query-update",
          type: "listing-query.update",
          title: "Update query",
          description: "Update listing query.",
          input: {
            id: "query-1",
            name: "Products Query",
            patch: {
              debug: true,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "menu-item-update",
          type: "menu.item.update",
          title: "Update menu item",
          description: "Update menu item.",
          input: {
            menuId: "menu-primary",
            itemId: "menu-products",
            label: "Products",
            patch: {
              href: "https://example.com",
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed listing query filter patches", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-filters",
          type: "listing-query.filters.patch",
          title: "Add listing filters",
          description: "Patch filters onto the product listing query.",
          input: {
            listingQueryName: "Products Catalog Query",
            filters: [],
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed listing delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-query-delete",
          type: "listing-query.delete",
          title: "Delete listing query",
          description: "Delete product listing query.",
          input: {
            id: "query-1",
            name: "Products Catalog Query",
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-template-delete",
          type: "listing-template.delete",
          title: "Delete listing template",
          description: "Delete product listing template.",
          input: {
            id: "template-1",
            name: "Products Grid",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsupported media reference targets", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "media-entry",
          type: "media.reference.attach",
          title: "Attach hero image",
          description: "Attach existing media to page field.",
          input: {
            mediaId: "media-1",
            targetType: "page",
            targetId: "page-1",
            field: "heroImage",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects raw media URLs inside page upsert blocks", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const imageBlock = createPageBlockV2("image", {
    id: "hero-media",
    props: {
      alt: "Browse products",
    },
  });
  const heroSection = createPageSectionV2("hero", {
    id: "hero-1",
    name: "Hero",
  });

  for (const src of [
    "https://example.com/hero.jpg",
    "data:image/png;base64,Zm9v",
    "blob:https://example.com/123",
    "file:///tmp/hero.jpg",
  ]) {
    expect(() =>
      normalizeAssistantActionPlan({
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
                {
                  ...heroSection,
                  blocks: [
                    {
                      ...imageBlock,
                      props: {
                        ...imageBlock.props,
                        src,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan accepts assistant-emittable nested layout page blocks", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-layout",
        type: "page.upsert",
        title: "Create layout page",
        description: "Create a page with nested layout blocks.",
        input: {
          title: "Layout",
          slug: "/layout",
          status: "published",
          introTitle: "Layout",
          introBody: "Nested layout content.",
          sections: [
            createPageSectionV2("content", {
              id: "section-layout",
              blocks: [
                createPageBlockV2("container", {
                  id: "container-1",
                  slots: {
                    children: [
                      createPageBlockV2("heading", {
                        id: "nested-heading",
                        props: { text: "Nested heading", level: "h2", align: "left" },
                      }),
                    ],
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

  const pageAction = normalized.actions[0];
  expect(pageAction?.type).toBe("page.upsert");
  expect(
    pageAction?.type === "page.upsert" ? pageAction.input.sections?.[0]?.blocks[0] : null
  ).toMatchObject({
    type: "container",
    slots: {
      children: [{ id: "nested-heading", type: "heading" }],
    },
  });
});
