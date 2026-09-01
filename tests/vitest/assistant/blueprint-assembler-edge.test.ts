import { expect, test } from "vitest";

import type {
  AssistantCustomScreenUpsertAction,
  AssistantFormUpsertAction,
  AssistantListingQueryUpsertAction,
  AssistantListingTemplateUpsertAction,
  AssistantMenuUpsertAction,
  AssistantPageUpsertAction,
} from "../../../core/services/assistant/actionPlanTypes";
import {
  assembleBlueprintActions,
  assembleComposedBlueprintPlan,
  buildBlueprintActionMergeKey,
  mergeBlueprintActions,
} from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { normalizeBlueprintConflict } from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";
import { normalizeCustomScreenDefinitionForWrite } from "../../../core/services/customScreens/customScreenSchemas";
import {
  buildCatalogFragments,
  buildProductCatalogCompositionGraph,
  buildProductCatalogPlan,
  getProductCatalogRegistration,
} from "./blueprintActionAssemblerFixtures";

const listingQuery = (
  overrides: Partial<AssistantListingQueryUpsertAction["input"]> = {}
): AssistantListingQueryUpsertAction => ({
  id: "query-1",
  type: "listing-query.upsert",
  title: "Projects query",
  description: "Lists projects.",
  input: {
    name: "projects-query",
    description: null,
    contentTypeSlug: "projects",
    fields: ["title", "projectStatus"],
    includeDrafts: false,
    limit: 12,
    sort: [{ field: "title", dir: "asc" }],
    ...overrides,
  },
});

const listingTemplate = (
  overrides: Partial<AssistantListingTemplateUpsertAction["input"]> = {}
): AssistantListingTemplateUpsertAction => ({
  id: "template-1",
  type: "listing-template.upsert",
  title: "Project card",
  description: "Card layout.",
  input: {
    name: "Project card",
    slug: "project-card",
    description: null,
    layout: "grid",
    config: {
      fields: [
        {
          key: "title",
          source: "title",
          label: "Title",
          format: "plain",
          conditions: [],
        },
      ],
      itemActions: [],
      emptyState: {},
      style: { columns: "3" },
    },
    ...overrides,
  },
});

const formUpsert = (
  overrides: Partial<AssistantFormUpsertAction["input"]> = {}
): AssistantFormUpsertAction => ({
  id: "form-1",
  type: "form.upsert",
  title: "Contact form",
  description: "Contact form.",
  input: {
    name: "Contact form",
    slug: "contact",
    status: "draft",
    description: null,
    successMessage: "Thanks",
    submissionAccess: "public",
    fields: [{ name: "email", type: "email" }],
    ...overrides,
  },
});

const menuUpsert = (
  overrides: Partial<AssistantMenuUpsertAction["input"]> = {}
): AssistantMenuUpsertAction => ({
  id: "menu-1",
  type: "menu.upsert",
  title: "Main menu",
  description: "Primary navigation.",
  input: {
    name: "Main",
    location: "main",
    status: "published",
    ...overrides,
  },
});

const pageUpsert = (
  overrides: Partial<AssistantPageUpsertAction["input"]> = {}
): AssistantPageUpsertAction => ({
  id: "page-1",
  type: "page.upsert",
  title: "Projects",
  description: "Projects overview page.",
  input: {
    title: "Projects",
    slug: "projects",
    status: "draft",
    introTitle: "Our projects",
    introBody: "Browse the latest work.",
    ...overrides,
  },
});

const customScreenUpsert = (
  overrides: Partial<AssistantCustomScreenUpsertAction["input"]> = {}
): AssistantCustomScreenUpsertAction => ({
  id: "screen-1",
  type: "custom-screen.upsert",
  title: "Projects screen",
  description: "Collection screen.",
  input: {
    name: "Projects screen",
    contentTypeSlug: "projects",
    status: "active",
    showInSidebar: false,
    sidebarLabel: null,
    definition: normalizeCustomScreenDefinitionForWrite(),
    ...overrides,
  },
});

test("mergeBlueprintActions rejects content-type actions with mismatched identity", () => {
  const left = {
    id: "ct-1",
    type: "content-type.upsert" as const,
    title: "Projects",
    description: "",
    input: { slug: "projects", name: "Projects", schema: {} },
  };
  const right = {
    ...left,
    input: { ...left.input, slug: "other" },
  };
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions rejects listing queries with mismatched sort config", () => {
  const left = listingQuery();
  const right = listingQuery({ sort: [{ field: "title", dir: "desc" }] });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions merges compatible listing queries and widens the limit", () => {
  const left = listingQuery();
  const right = listingQuery({ description: "Wider query", limit: 24 });
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  if (!merged || merged.type !== "listing-query.upsert") {
    throw new Error("expected_listing_query_merge");
  }
  expect(merged.input.limit).toBe(24);
  expect(merged.input.description).toBe("Wider query");
});

test("mergeBlueprintActions rejects listing templates with mismatched layout", () => {
  const left = listingTemplate();
  const right = listingTemplate({ layout: "list" });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions merges compatible listing templates", () => {
  const plan = buildProductCatalogPlan();
  const template = plan.actions.find((action) => action.type === "listing-template.upsert");
  if (!template || template.type !== "listing-template.upsert") {
    throw new Error("listing_template_action_missing");
  }
  const left = { ...template, input: { ...template.input, description: null } };
  const right = {
    ...left,
    input: { ...left.input, description: "Shared card" },
  };
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  if (!merged || merged.type !== "listing-template.upsert") {
    throw new Error("expected_listing_template_merge");
  }
  expect(merged.input.description).toBe("Shared card");
});

test("mergeBlueprintActions rejects forms with mismatched submission access", () => {
  const left = formUpsert();
  const right = formUpsert({ submissionAccess: "internal" });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions rejects forms with conflicting fields", () => {
  const left = formUpsert({
    fields: [{ name: "email", type: "email" }],
  });
  const right = formUpsert({
    fields: [{ name: "email", type: "text" }],
  });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions merges compatible forms and keeps success message from left", () => {
  const left = formUpsert({ fields: [{ name: "email", type: "email" }] });
  const right = formUpsert({
    description: "Extended form",
    fields: [{ name: "phone", type: "text" }],
  });
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  if (!merged || merged.type !== "form.upsert") {
    throw new Error("expected_form_merge");
  }
  expect(merged.input.fields).toHaveLength(2);
  expect(merged.input.description).toBe("Extended form");
});

test("mergeBlueprintActions merges menu actions only when deep-equal", () => {
  const left = menuUpsert();
  const right = menuUpsert();
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  const changed = menuUpsert({ location: "footer" });
  expect(mergeBlueprintActions(left, changed)).toBeNull();
});

test("mergeBlueprintActions rejects detail pages with mismatched content type", () => {
  const catalogPlan = buildProductCatalogPlan();
  const detail = catalogPlan.actions.find((action) => action.type === "detail-page.upsert");
  if (!detail) throw new Error("missing_detail_page_action");
  const left = detail;
  const right = {
    ...left,
    input: {
      ...left.input,
      contentTypeId: "different-content-type",
    },
  };
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("buildBlueprintActionMergeKey covers menu and default action families", () => {
  expect(buildBlueprintActionMergeKey(menuUpsert())).toBe("menu.upsert:main");
  const entryAction = {
    id: "entry-1",
    type: "entry.upsert-draft" as const,
    title: "Entry",
    description: "",
    input: { contentTypeSlug: "projects", title: "Entry", slug: "entry", values: {} },
  };
  expect(buildBlueprintActionMergeKey(entryAction)).toBe("entry.upsert-draft:entry-1");
});

test("mergeBlueprintActions rejects pages with mismatched listing template slugs", () => {
  const left = pageUpsert({ listingTemplateSlug: "card-a" });
  const right = pageUpsert({ listingTemplateSlug: "card-b" });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergeBlueprintActions rejects pages with conflicting form embeds", () => {
  const left = pageUpsert({
    formEmbed: {
      formName: "contact",
      title: "Contact",
      description: "",
      submitLabel: "Send",
      successMessage: "OK",
    },
  });
  const right = pageUpsert({
    formEmbed: {
      formName: "other",
      title: "Contact",
      description: "",
      submitLabel: "Send",
      successMessage: "OK",
    },
  });
  expect(mergeBlueprintActions(left, right)).toBeNull();
});

test("mergePageCollectionLink rejects incompatible collection links", () => {
  const left = pageUpsert({
    collectionLink: { contentTypeSlug: "projects", pageRole: "canonical-list-page" },
  });
  const right = pageUpsert({
    collectionLink: { contentTypeSlug: "blog", pageRole: "canonical-list-page" },
  });
  expect(mergeBlueprintActions(left, right)).toBeNull();

  const compositionConflict = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      compositionKey: "a",
    },
  });
  const otherComposition = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      compositionKey: "b",
    },
  });
  expect(mergeBlueprintActions(compositionConflict, otherComposition)).toBeNull();

  const queryIdConflict = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingQueryId: "q1",
    },
  });
  const otherQueryId = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingQueryId: "q2",
    },
  });
  expect(mergeBlueprintActions(queryIdConflict, otherQueryId)).toBeNull();

  const queryNameConflict = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingQueryName: "q-a",
    },
  });
  const otherQueryName = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingQueryName: "q-b",
    },
  });
  expect(mergeBlueprintActions(queryNameConflict, otherQueryName)).toBeNull();

  const templateIdConflict = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingTemplateId: "t1",
    },
  });
  const otherTemplateId = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingTemplateId: "t2",
    },
  });
  expect(mergeBlueprintActions(templateIdConflict, otherTemplateId)).toBeNull();

  const templateSlugConflict = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingTemplateSlug: "t-a",
    },
  });
  const otherTemplateSlug = pageUpsert({
    collectionLink: {
      contentTypeSlug: "projects",
      pageRole: "canonical-list-page",
      listingTemplateSlug: "t-b",
    },
  });
  expect(mergeBlueprintActions(templateSlugConflict, otherTemplateSlug)).toBeNull();
});

test("mergeBlueprintActions merges compatible page collection links", () => {
  const left = pageUpsert({
    collectionLink: { contentTypeSlug: "projects", pageRole: "canonical-list-page" },
  });
  const right = pageUpsert({
    collectionLink: { contentTypeSlug: "projects", pageRole: "canonical-list-page" },
  });
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  if (!merged || merged.type !== "page.upsert") {
    throw new Error("expected_page_upsert_merge");
  }
  expect(merged.input.collectionLink).toMatchObject({
    contentTypeSlug: "projects",
  });
});

test("mergeBlueprintActions merges blocks by id and rejects conflicting block payloads", () => {
  const section = (id: string, text: string) => ({
    id,
    type: "hero" as const,
    name: "Hero",
    variant: "default" as const,
    layout: {
      columns: 1,
      align: "start" as const,
      justify: "start" as const,
      maxWidth: 1080,
      stackVertical: false,
    },
    style: {
      background: "#ffffff",
      backgroundType: "color" as const,
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none" as const,
    },
    spacing: {
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 32,
      paddingRight: 32,
      gap: 16,
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
        id: "heading",
        type: "heading" as const,
        props: { text },
        visibility: { visible: true },
      },
    ],
  });
  const left = pageUpsert({ sections: [section("s1", "Hello")] });
  const right = pageUpsert({ sections: [section("s1", "Hello"), section("s2", "World")] });
  const merged = mergeBlueprintActions(left, right);
  expect(merged).not.toBeNull();
  if (!merged || merged.type !== "page.upsert") {
    throw new Error("expected_page_upsert_merge");
  }
  expect(merged.input.sections).toHaveLength(2);

  const conflicting = pageUpsert({ sections: [section("s1", "Different")] });
  expect(mergeBlueprintActions(left, conflicting)).toBeNull();
});

test("assembleComposedBlueprintPlan builds questions for every fatal conflict code", () => {
  const registration = getProductCatalogRegistration();
  const plan = buildProductCatalogPlan();
  const fragments = buildCatalogFragments(plan, plan);
  const codes = [
    "media_asset_missing",
    "media_asset_ambiguous",
    "media_upload_gated",
    "media_delete_gated",
    "permission_gap",
    "widget_capability_missing",
  ] as const;

  for (const code of codes) {
    const graph = buildProductCatalogCompositionGraph({
      registration,
      fragments,
      selectedCapabilityIds: ["product-catalog"],
      conflicts: [
        normalizeBlueprintConflict({
          code,
          severity: "error",
          actionType: "media.reference.attach",
          resourceKey: `media:${code}`,
          message: `Blocking ${code} conflict for the composed plan.`,
        }),
      ],
    });
    const result = assembleComposedBlueprintPlan({
      prompt: "Compose a catalog",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      graph,
    });
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.status).toBe("needs_input");
    expect(result.questions.length).toBeGreaterThan(0);
  }
});

test("assembleBlueprintActions dedupes conflicts by canonical target keys", () => {
  const registration = getProductCatalogRegistration();
  const plan = buildProductCatalogPlan();
  const fragments = buildCatalogFragments(plan, plan);
  const screen = customScreenUpsert();
  const form = formUpsert();
  const entryAction = {
    id: "entry-1",
    type: "entry.upsert-draft" as const,
    title: "Entry",
    description: "",
    input: { contentTypeSlug: "projects", title: "Entry", slug: "entry", values: {} },
  };
  const graph = buildProductCatalogCompositionGraph({
    registration,
    fragments,
    selectedCapabilityIds: ["product-catalog"],
    conflicts: [
      normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "error",
        actionType: screen.type,
        resourceKey: `custom-screen:${screen.input.contentTypeSlug}:${screen.input.name}`,
        message: "Duplicate custom screen.",
      }),
      normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "error",
        actionType: form.type,
        resourceKey: `form:${form.input.slug}`,
        message: "Duplicate form.",
      }),
      normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "error",
        actionType: entryAction.type,
        resourceKey: "entry.upsert-draft:entry-1",
        message: "Duplicate entry.",
      }),
    ],
  });
  const result = assembleBlueprintActions(graph);
  expect(result.conflicts).toHaveLength(3);
});

test("assembleComposedBlueprintPlan rethrows malformed template config validation", () => {
  const registration = getProductCatalogRegistration();
  const plan = buildProductCatalogPlan();
  const template = plan.actions.find((action) => action.type === "listing-template.upsert");
  if (!template || template.type !== "listing-template.upsert") {
    throw new Error("listing_template_action_missing");
  }
  template.input.config = { fields: "broken" } as never;
  const fragments = [
    {
      capabilityId: "product-catalog",
      planId: "plan-edge-820",
      title: "Edge catalog",
      assumptions: [],
      actions: plan.actions.map((action) => structuredClone(action)),
    },
  ];
  const graph = buildProductCatalogCompositionGraph({
    registration,
    fragments,
    selectedCapabilityIds: ["product-catalog"],
  });
  expect(() =>
    assembleComposedBlueprintPlan({
      prompt: "Compose a catalog with a broken card config",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      graph,
    })
  ).toThrow(/listing_template_config_invalid/);
});

test("assembleComposedBlueprintPlan reports listing template facet gaps as conflicts", () => {
  const registration = getProductCatalogRegistration();
  const plan = buildProductCatalogPlan();
  const template = plan.actions.find((action) => action.type === "listing-template.upsert");
  if (!template || template.type !== "listing-template.upsert") {
    throw new Error("listing_template_action_missing");
  }
  // Point the template card at a data field the composed content schema does not define.
  template.input.config = structuredClone({
    ...(template.input.config as Record<string, unknown>),
    fields: [
      {
        key: "hero",
        source: "data.heroTitle",
        label: "Hero",
        format: "text",
        conditions: [],
      },
    ],
  });
  const fragments = [
    {
      capabilityId: "product-catalog",
      planId: "plan-edge",
      title: "Edge catalog",
      assumptions: [],
      actions: plan.actions.map((action) => structuredClone(action)),
    },
  ];
  const graph = buildProductCatalogCompositionGraph({
    registration,
    fragments,
    selectedCapabilityIds: ["product-catalog"],
  });
  const result = assembleComposedBlueprintPlan({
    prompt: "Compose a catalog with a hero card",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph,
  });
  expect(result).not.toBeNull();
  if (!result) return;
  expect(result.status).toBe("needs_input");
  expect(
    result.questions.some((question) => question.id.includes("blueprint-facet-field-missing"))
  ).toBe(true);
});
