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

test("normalizeAssistantActionPlan rejects data-bound sections outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-form-section",
          type: "page.upsert",
          title: "Create form page",
          description: "Attempt to create an assistant-gated form section.",
          input: {
            title: "Contact",
            slug: "/contact",
            status: "published",
            introTitle: "Contact",
            introBody: "Send a message.",
            sections: [
              createPageSectionV2("lead-form", {
                id: "section-form",
                blocks: [createPageBlockV2("text", { id: "form-copy" })],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects data-bound blocks outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-form-block",
          type: "page.upsert",
          title: "Create form block page",
          description: "Attempt to create an assistant-gated form block.",
          input: {
            title: "Contact",
            slug: "/contact",
            status: "published",
            introTitle: "Contact",
            introBody: "Send a message.",
            sections: [
              createPageSectionV2("content", {
                id: "section-content",
                blocks: [
                  createPageBlockV2("form", {
                    id: "form-1",
                    props: { formId: "form-contact", title: "Contact form" },
                  }),
                ],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects page blocks outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-icon",
          type: "page.upsert",
          title: "Create icon page",
          description: "Attempt to create a gated icon block.",
          input: {
            title: "Icon",
            slug: "/icon",
            status: "published",
            introTitle: "Icon",
            introBody: "Unsupported block.",
            sections: [
              createPageSectionV2("content", {
                id: "section-icon",
                blocks: [createPageBlockV2("icon", { id: "icon-1" })],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects raw media URLs inside entry media fields", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const key of ["coverImageUrl", "heroImage", "gallery"]) {
    const values =
      key === "gallery"
        ? { title: "Unsafe entry", gallery: ["https://example.com/gallery.jpg"] }
        : { title: "Unsafe entry", [key]: "https://example.com/cover.jpg" };
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: `entry-unsafe-${key}`,
            type: "entry.sample.create",
            title: "Create unsafe sample",
            description: "Attempt to render a remote media URL from provider output.",
            input: {
              contentTypeSlug: "portfolio-projects",
              title: "Unsafe entry",
              slug: "unsafe-entry",
              status: "published",
              values,
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan rejects curated URLs inside media asset id fields", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const curatedUrl = fullServicePlan.actions.find((action) => action.type === "entry.sample.create")
    ?.input.values.coverImageUrl;
  if (typeof curatedUrl !== "string") {
    throw new Error("expected_curated_cover_url");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const key of ["heroImage", "gallery"]) {
    const values =
      key === "gallery"
        ? { title: "Unsafe entry", gallery: [curatedUrl] }
        : { title: "Unsafe entry", [key]: curatedUrl };
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: `entry-curated-unsafe-${key}`,
            type: "entry.sample.create",
            title: "Create unsafe curated sample",
            description: "Attempt to store a curated URL inside a media asset id field.",
            input: {
              contentTypeSlug: "portfolio-projects",
              title: "Unsafe entry",
              slug: "unsafe-entry",
              status: "published",
              values,
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan rejects untrusted curated media metadata urls", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const sample = fullServicePlan.actions.find((action) => action.type === "entry.sample.create");
  if (!sample || sample.type !== "entry.sample.create") {
    throw new Error("expected_curated_sample");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-unsafe-curated-source",
          type: "entry.sample.create",
          title: "Create unsafe curated source",
          description: "Attempt to attach an arbitrary source URL to curated media.",
          input: {
            contentTypeSlug: "portfolio-projects",
            title: "Unsafe source",
            slug: "unsafe-source",
            status: "published",
            values: {
              title: "Unsafe source",
              coverImageUrl: sample.input.values.coverImageUrl,
              coverImageSourceName: sample.input.values.coverImageSourceName,
              coverImageSourceUrl: "https://example.com/source",
              coverImageLicenseName: sample.input.values.coverImageLicenseName,
              coverImageLicenseUrl: sample.input.values.coverImageLicenseUrl,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan requires source and license metadata for curated cover urls", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const sample = fullServicePlan.actions.find((action) => action.type === "entry.sample.create");
  if (!sample || sample.type !== "entry.sample.create") {
    throw new Error("expected_curated_sample");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-missing-curated-source",
          type: "entry.sample.create",
          title: "Create incomplete curated source",
          description: "Attempt to attach curated media without source metadata.",
          input: {
            contentTypeSlug: "portfolio-projects",
            title: "Incomplete source",
            slug: "incomplete-source",
            status: "published",
            values: {
              title: "Incomplete source",
              coverImageUrl: sample.input.values.coverImageUrl,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan keeps non-media URL fields available to page section contracts", () => {
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
                createPageBlockV2("button", {
                  id: "hero-cta",
                  props: {
                    href: "https://example.com/buy",
                    label: "Buy",
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
                href: "https://example.com/buy",
              },
            },
          ],
        },
      ],
    },
  });
});

test("normalizeAssistantActionPlan rejects invalid seo targets and fields", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "seo-products",
          type: "seo.document.upsert",
          title: "Update product SEO",
          description: "Add SEO metadata to products page.",
          input: {
            targetType: "product",
            targetId: "page-products",
            seo: {
              title: "Products",
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
          id: "seo-products",
          type: "seo.document.upsert",
          title: "Update product SEO",
          description: "Add SEO metadata to products page.",
          input: {
            targetType: "page",
            targetId: "page-products",
            seo: {
              title: "Products",
              debug: true,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed menu and seo delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "menu-delete",
          type: "menu.item.delete",
          title: "Delete menu item",
          description: "Delete selected menu item.",
          input: {
            menuId: "menu-primary",
            itemId: "menu-products",
            label: "Products",
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
          id: "seo-delete",
          type: "seo.document.delete",
          title: "Delete SEO",
          description: "Delete selected SEO document.",
          input: {
            id: "seo-1",
            targetType: "product",
            targetId: "page-products",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsafe menu hrefs", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "menu-products",
          type: "menu.item.upsert",
          title: "Add products to menu",
          description: "Add products catalog link.",
          input: {
            menuId: "menu-primary",
            label: "Products",
            href: "https://example.com/products",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed sample entry actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-products",
          type: "entry.sample.create",
          title: "Create product entry",
          description: "Draft sample product entry.",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            status: "draft",
            values: {
              title: "Sample",
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
          id: "entry-products",
          type: "entry.sample.create",
          title: "Create product entry",
          description: "Published sample product entry.",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            status: "published",
            values: {
              title: "Sample",
            },
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects remaining contract-only actions until adapters land", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-products",
          type: "entry.bulk-draft.create",
          title: "Create product entries",
          description: "Draft sample product entries.",
          input: {
            contentTypeSlug: "products",
            entries: [],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan enforces ready and needs-input invariants", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      questions: [
        {
          id: "question",
          label: "Question",
          description: "Description",
          required: true,
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      status: "needs_input",
      actions: [],
      questions: [],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan clamps confidence and type guard uses strict schema", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(
    normalizeAssistantActionPlan({
      ...plan,
      confidence: 1.7,
    }).confidence
  ).toBe(1);
  expect(isAssistantActionPlanStrict(plan)).toBe(true);
  expect(
    isAssistantActionPlanStrict({
      ...plan,
      actions: [{ ...plan.actions[0], extra: true }],
    })
  ).toBe(false);
});
