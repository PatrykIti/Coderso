import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { resolveSiteBuilderIntakeAdvancedSectionVariant } from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedOptions";
import type { AssistantCustomScreenUpsertAction } from "../../../core/services/assistant/actionPlanTypes";
import { buildProductCatalogPlan } from "./blueprintActionAssemblerFixtures";

const clone = <T>(value: T): T => structuredClone(value);

const catalogPlan = () => clone(buildProductCatalogPlan());

const withActions = (actions: unknown[]): Record<string, unknown> => ({
  ...catalogPlan(),
  actions,
});

const findScreenAction = (plan: ReturnType<typeof catalogPlan>) => {
  const screen = plan.actions.find(
    (action): action is AssistantCustomScreenUpsertAction => action.type === "custom-screen.upsert"
  );
  if (!screen) throw new Error("missing_custom_screen_upsert_action");
  return screen;
};

const routeAction = (overrides: Record<string, unknown> = {}) => ({
  id: "route-blog",
  type: "setting.content-route.upsert",
  title: "Update blog route",
  description: "Update the blog route.",
  input: {
    typeSlug: "blog",
    listPath: "/blog",
    detailPath: "/blog/:slug",
    enabled: true,
    ...overrides,
  },
});

test("normalizeAssistantActionPlan accepts content-type fields with select options", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "ct-add",
        type: "content-type.field.add",
        title: "Add product fields",
        description: "Add extra product fields.",
        input: {
          id: "a1",
          name: "Add product fields",
          slug: "products",
          expectedEntryCount: 0,
          fields: [
            { name: "size", label: "Size", type: "text" },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                { label: "Apparel", value: "apparel" },
                { label: "Gear", value: "gear" },
              ],
            },
          ],
        },
      },
    ])
  );

  expect(normalized.actions[0].input).toMatchObject({
    id: "a1",
    slug: "products",
    fields: [
      { name: "size", type: "text" },
      {
        name: "category",
        type: "select",
        options: [
          { label: "Apparel", value: "apparel" },
          { label: "Gear", value: "gear" },
        ],
      },
    ],
  });
});

test("normalizeAssistantActionPlan rejects content-type field specs that fail contract normalization", () => {
  const plan = withActions([
    {
      id: "ct-add-invalid",
      type: "content-type.field.add",
      title: "Add required field",
      description: "Additive fields cannot be required.",
      input: {
        id: "a2",
        name: "Add required field",
        slug: "products",
        expectedEntryCount: 0,
        fields: [{ name: "sku", label: "SKU", type: "text", required: true }],
      },
    },
  ]);

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts custom-screen.section.add with a real screen section", () => {
  const plan = catalogPlan();
  const screen = findScreenAction(plan);
  const section = screen.input.definition.editorView.document.sections[0];

  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "screen-section",
        type: "custom-screen.section.add",
        title: "Add section",
        description: "Add a section to the products screen.",
        input: {
          id: "s1",
          name: "Add section",
          section,
        },
      },
    ])
  );

  expect(normalized.actions[0].input).toMatchObject({
    id: "s1",
    section: { id: section.id, type: "section" },
  });
});

test("normalizeAssistantActionPlan accepts custom-screen.block.add with a real screen block", () => {
  const plan = catalogPlan();
  const screen = findScreenAction(plan);
  const block = screen.input.definition.editorView.document.sections[0].blocks[0];

  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "screen-block",
        type: "custom-screen.block.add",
        title: "Add block",
        description: "Add a block to the products screen.",
        input: {
          id: "b1",
          name: "Add block",
          sectionId: "section-default",
          slotId: "content",
          block,
          bindings: [
            {
              id: "bind-1",
              blockId: block.id,
              propPath: "value",
              source: "entry",
              field: "title",
              mode: "readwrite",
            },
          ],
        },
      },
    ])
  );

  expect(normalized.actions[0].input).toMatchObject({
    id: "b1",
    block: { id: block.id, type: block.type },
    bindings: [{ id: "bind-1", blockId: block.id }],
  });
});

test("normalizeAssistantActionPlan accepts custom-screen.block.move", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "screen-move",
        type: "custom-screen.block.move",
        title: "Move block",
        description: "Move the block up.",
        input: {
          id: "m1",
          name: "Move block",
          blockId: "product-catalog-price",
          direction: "up",
        },
      },
    ])
  );

  expect(normalized.actions[0].input).toMatchObject({
    id: "m1",
    blockId: "product-catalog-price",
    direction: "up",
  });
});

test("normalizeAssistantActionPlan accepts custom-screen.block.remove", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "screen-remove",
        type: "custom-screen.block.remove",
        title: "Remove block",
        description: "Remove the price block.",
        input: {
          id: "r1",
          name: "Remove block",
          blockId: "product-catalog-price",
          expectedBlockType: "field",
        },
      },
    ])
  );

  expect(normalized.actions[0].input).toMatchObject({
    id: "r1",
    blockId: "product-catalog-price",
    expectedBlockType: "field",
  });
});

test("normalizeAssistantActionPlan rejects custom-screen.block.patch with non-scalar values", () => {
  const plan = withActions([
    {
      id: "screen-patch",
      type: "custom-screen.block.patch",
      title: "Patch block",
      description: "Patch a nested value.",
      input: {
        id: "p1",
        name: "Patch block",
        blockId: "product-catalog-price",
        dataPath: ["data", "value"],
        value: { nested: true },
      },
    },
  ]);

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts custom-screen.list-view.patch with a real list view", () => {
  const plan = catalogPlan();
  const screen = findScreenAction(plan);
  const listView = screen.input.definition.listView;

  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "screen-list",
        type: "custom-screen.list-view.patch",
        title: "Patch list view",
        description: "Patch the products list view.",
        input: {
          id: "lv1",
          name: "Patch list view",
          listView: clone(listView),
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      listView: {
        columns: [
          { id: "system-title", field: "title" },
          { id: "system-updatedat", field: "updatedAt" },
        ],
        defaultSort: { field: "updatedAt", direction: "desc" },
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts site-kit.validate inputs", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "kit-validate",
        type: "site-kit.validate",
        title: "Validate kit",
        description: "Validate the selected site kit.",
        input: { runId: "run-1" },
      },
    ])
  );

  expect(normalized.actions[0].input).toEqual({ runId: "run-1" });
});

test("normalizeAssistantActionPlan accepts stable-location menu targets", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "menu-item",
        type: "menu.item.upsert",
        title: "Add nav item",
        description: "Add an item to the primary menu.",
        input: {
          menuId: {
            kind: "stable-location",
            resourceType: "menu",
            location: "primary",
          },
          label: "Shop",
          href: "/shop",
          orderIndex: 1,
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      menuId: {
        kind: "stable-location",
        resourceType: "menu",
        location: "primary",
      },
    },
  });
});

test("normalizeAssistantActionPlan rejects stable-location targets for non-menu resources", () => {
  const plan = withActions([
    {
      id: "menu-item-invalid",
      type: "menu.item.upsert",
      title: "Add nav item",
      description: "Point at a page instead of a menu.",
      input: {
        menuId: {
          kind: "stable-location",
          resourceType: "page",
          location: "primary",
        },
        label: "Shop",
        href: "/shop",
      },
    },
  ]);

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts stable-slug entry targets", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "seo-entry",
        type: "seo.document.upsert",
        title: "Update product SEO",
        description: "Update the product SEO document.",
        input: {
          targetType: "entry",
          targetId: {
            kind: "stable-slug",
            resourceType: "entry",
            contentTypeSlug: "products",
            slug: "widget",
          },
          seo: { slug: "widget", title: "Widget" },
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      targetId: {
        kind: "stable-slug",
        resourceType: "entry",
        contentTypeSlug: "products",
        slug: "widget",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts page.upsert content list styles", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "page-list",
        type: "page.upsert",
        title: "Create products page",
        description: "Create the products listing page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          introTitle: "Products",
          introBody: "Browse the catalog.",
          contentListStyle: { columns: "2", cardStyle: "outlined" },
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      contentListStyle: {
        columns: "2",
        cardStyle: "outlined",
      },
    },
  });
});

test("normalizeAssistantActionPlan rejects advanced section overrides that mismatch the variant definition", () => {
  const definition = resolveSiteBuilderIntakeAdvancedSectionVariant("proof-grid");
  const plan = withActions([
    {
      id: "kit-recommend",
      type: "site-kit.recommend",
      title: "Recommend kit",
      description: "Recommend a kit for the site.",
      input: {
        businessType: "ecommerce",
        goals: ["sales"],
        locale: "en",
        preview: {},
        advancedRuntimeOverrides: {
          schemaVersion: 1,
          sectionVariants: [
            {
              variantId: definition.id,
              sectionRoleId: "wrong-role",
              alias: definition.alias,
              widgetType: definition.widgetType,
              widgetVariantId: definition.widgetVariantId,
              module: definition.module,
            },
          ],
        },
      },
    },
  ]);

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts advanced section overrides that match the variant definition", () => {
  const definition = resolveSiteBuilderIntakeAdvancedSectionVariant("proof-grid");
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "kit-recommend",
        type: "site-kit.recommend",
        title: "Recommend kit",
        description: "Recommend a kit for the site.",
        input: {
          businessType: "ecommerce",
          goals: ["sales"],
          locale: "en",
          preview: {},
          advancedRuntimeOverrides: {
            schemaVersion: 1,
            sectionVariants: [
              {
                variantId: definition.id,
                sectionRoleId: definition.sectionRoleId,
                alias: definition.alias,
                widgetType: definition.widgetType,
                widgetVariantId: definition.widgetVariantId,
                module: definition.module,
              },
            ],
          },
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      advancedRuntimeOverrides: {
        sectionVariants: [{ variantId: definition.id }],
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts site-kit.install settings patches", () => {
  const normalized = normalizeAssistantActionPlan(
    withActions([
      {
        id: "kit-install",
        type: "site-kit.install",
        title: "Install kit",
        description: "Install the selected site kit.",
        input: {
          businessType: "ecommerce",
          goals: ["sales"],
          locale: "en",
          preview: {},
          dryRun: true,
          settingsPatch: { branding: { siteName: "Acme" } },
          notes: ["First pass"],
        },
      },
    ])
  );

  expect(normalized.actions[0]).toMatchObject({
    input: {
      settingsPatch: {
        branding: { siteName: "Acme" },
      },
    },
  });
});

test("normalizeAssistantActionPlan rejects gated plans whose status is ready", () => {
  const plan = catalogPlan();
  plan.status = "ready";
  plan.responseKind = "gated";
  plan.questions = [];

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects needs_input plans whose status is ready", () => {
  const plan = withActions([routeAction()]);
  plan.status = "ready";
  plan.responseKind = "needs_input";
  plan.questions = [];

  expect(() => normalizeAssistantActionPlan(plan)).toThrowError("assistant_action_plan_invalid");
});
