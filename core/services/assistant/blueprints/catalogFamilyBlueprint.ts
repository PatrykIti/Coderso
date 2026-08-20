import type { PageBlockV2, PageSectionV2 } from "../../pages/pageDocumentV2";
import type { DetailPageBinding, DetailPageDocument } from "../../content/detailPageTypes";
import {
  normalizeCustomScreenDefinitionForWrite,
  normalizeScreenFieldBindings,
  type CustomScreenDefinition,
  type ScreenBlockV1,
} from "../../customScreens/customScreenSchemas";
import type { ListingFacetConfig } from "../../search/filterContract";
import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPromptKind,
  AssistantPlannedAction,
} from "../actionPlanTypes";
import {
  composeAdminSurface,
  type BlueprintAdminSurfaceField,
} from "./blueprintAdminSurfaceComposer";
import { composeBindings } from "./blueprintBindingComposer";

type CatalogScreenFieldValue = {
  id: string;
  label: string;
  helper: string;
  tone: "default" | "strong" | "muted";
  field: string;
};

const detailPageContentTypePlaceholderId = "00000000-0000-5000-8000-000000000001";

const catalogDetailPageIds: Record<string, string> = {
  "house-projects-catalog": "5f9c2ed6-4df0-55ef-8c8f-7ab7f6b7f301",
  "product-catalog": "5f9c2ed6-4df0-55ef-8c8f-7ab7f6b7f302",
  "portfolio-projects": "5f9c2ed6-4df0-55ef-8c8f-7ab7f6b7f303",
  "services-directory": "5f9c2ed6-4df0-55ef-8c8f-7ab7f6b7f304",
};

const hashCatalogKey = (value: string) => {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const buildDynamicCatalogDetailPageId = (key: string) => {
  const left = hashCatalogKey(key);
  const right = hashCatalogKey(`${key}:detail`);
  return `5f9c2ed6-4df0-55ef-8c8f-${left}${right.slice(0, 4)}`;
};

export type CatalogFamilyPreset = {
  key: string;
  intentId: string;
  title: string;
  summary: string;
  answerIntro: string;
  contentTypeSlug: string;
  contentTypeName: string;
  catalogPageSlug: string;
  catalogHiddenListPath: string;
  detailPath: string;
  listingQueryName: string;
  listingTemplateSlug: string;
  listingTemplateName: string;
  customScreenName: string;
  introTitle: string;
  introBody: string;
  ctaLabel: string;
  contentSchema: Record<string, unknown>;
  listingTemplateConfig: Record<string, unknown>;
  summaryField?: string;
  statusField?: string;
  coverImageUrlField?: string;
  coverImageAltField?: string;
  screen: {
    eyebrow: string;
    subtitle: string;
    description: string;
    badge: string;
    leftTitle: string;
    rightTitle: string;
    leftGroupTitle: string;
    leftGroupDescription: string;
    rightGroupTitle: string;
    rightGroupDescription: string;
    leftFields: CatalogScreenFieldValue[];
    rightFields: CatalogScreenFieldValue[];
  };
  assumptions: string[];
  refinement: {
    defaultFilterTitle: string;
    defaultFilterDescription: string;
    defaultSearchPlaceholder: string;
    availableFacets: ListingFacetConfig[];
  };
};

export const getCatalogFamilyDetailPageId = (preset: Pick<CatalogFamilyPreset, "key">) => {
  const id = catalogDetailPageIds[preset.key];
  return id ?? buildDynamicCatalogDetailPageId(preset.key);
};

const toAdminSurfaceField = (
  field: CatalogScreenFieldValue,
  options?: { placeholderValue?: string }
): BlueprintAdminSurfaceField => ({
  key: field.id,
  label: field.label,
  helper: field.helper,
  field: field.field,
  tone: field.tone,
  ...(options?.placeholderValue !== undefined
    ? { placeholderValue: options.placeholderValue }
    : {}),
});

const buildScreenBlocks = (preset: CatalogFamilyPreset): ScreenBlockV1[] =>
  composeAdminSurface({
    key: preset.key,
    contentSchema: preset.contentSchema,
    header: {
      eyebrow: preset.screen.eyebrow,
      subtitle: preset.screen.subtitle,
      description: preset.screen.description,
      badge: preset.screen.badge,
    },
    columns: {
      leftTitle: preset.screen.leftTitle,
      rightTitle: preset.screen.rightTitle,
    },
    groups: [
      {
        key: "left",
        title: preset.screen.leftGroupTitle,
        description: preset.screen.leftGroupDescription,
        column: "left",
        fields: preset.screen.leftFields.map((field) => toAdminSurfaceField(field)),
      },
      {
        key: "right",
        title: preset.screen.rightGroupTitle,
        description: preset.screen.rightGroupDescription,
        column: "right",
        fields: preset.screen.rightFields.map((field) =>
          toAdminSurfaceField(field, {
            placeholderValue: field.tone === "muted" ? "status" : "0",
          })
        ),
      },
    ],
  }).blocks;

const buildScreenBindings = (preset: CatalogFamilyPreset) =>
  composeBindings({
    contentSchema: preset.contentSchema,
    bindings: [
      {
        id: `binding-${preset.key}-header-title`,
        widgetId: `${preset.key}-header`,
        propPath: "title",
        field: "title",
        mode: "read",
      },
      {
        id: `binding-${preset.key}-header-subtitle`,
        widgetId: `${preset.key}-header`,
        propPath: "subtitle",
        field: preset.summaryField ?? "summary",
        mode: "read",
      },
      {
        id: `binding-${preset.key}-header-badge`,
        widgetId: `${preset.key}-header`,
        propPath: "badge",
        field: preset.statusField ?? "projectStatus",
        mode: "read",
      },
      ...preset.screen.leftFields.map((field) => ({
        id: `binding-${preset.key}-${field.id}`,
        widgetId: `${preset.key}-${field.id}`,
        propPath: "value",
        field: field.field,
        mode: "read" as const,
      })),
      ...preset.screen.rightFields.map((field) => ({
        id: `binding-${preset.key}-${field.id}`,
        widgetId: `${preset.key}-${field.id}`,
        propPath: "value",
        field: field.field,
        mode: "read" as const,
      })),
    ],
  });

const buildScreenDefinition = (preset: CatalogFamilyPreset): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForWrite({
    definition: {
      schemaVersion: 4,
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "section-default",
              type: "section",
              label: "Details",
              data: { title: "Details" },
              blocks: buildScreenBlocks(preset),
            },
          ],
        },
        bindings: normalizeScreenFieldBindings(buildScreenBindings(preset)),
        saveMode: "entry",
        interactionMode: "inline",
      },
    },
  });

const buildDetailPageLayout = (): DetailPageDocument["settings"]["layout"] => ({
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
});

// Deterministic V2 hero section shell shared by every catalog-family detail
// template. Values mirror the L02 conversion output so the blueprint-authored
// document and a converted v1 document normalize to the same stored shape.
const detailPageHeroSectionDefaults = {
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
} as const;

const buildDetailPageDocument = (preset: CatalogFamilyPreset): DetailPageDocument => {
  const heroSectionId = `${preset.key}-detail-hero`;
  const heroHeadingId = `${heroSectionId}-heading`;
  const heroTextId = `${heroSectionId}-text`;
  const heroImageId = `${heroSectionId}-image`;
  const hasCoverImage = Boolean(preset.coverImageUrlField);
  const summaryField = preset.summaryField ?? "summary";

  const blocks: PageBlockV2[] = [
    {
      id: heroHeadingId,
      type: "heading",
      props: { text: preset.contentTypeName },
      visibility: { visible: true },
    },
    {
      id: heroTextId,
      type: "text",
      props: { text: preset.introBody },
      visibility: { visible: true },
    },
    ...(hasCoverImage
      ? [
          {
            id: heroImageId,
            type: "image" as const,
            props: { src: "", alt: "" },
            visibility: { visible: true } as const,
          },
        ]
      : []),
  ];

  const bindings: DetailPageBinding[] = [
    {
      id: `${preset.key}-detail-title`,
      blockId: heroHeadingId,
      propPath: "text",
      source: {
        kind: "entry-field",
        field: "title",
      },
      transform: "text",
      required: true,
    },
    {
      id: `${preset.key}-detail-summary`,
      blockId: heroTextId,
      propPath: "text",
      source: {
        kind: "entry-field",
        field: summaryField,
      },
      transform: "text",
      required: true,
    },
    ...(preset.coverImageUrlField
      ? [
          {
            id: `${preset.key}-detail-cover-image`,
            blockId: heroImageId,
            propPath: "src",
            source: {
              kind: "entry-field" as const,
              field: preset.coverImageUrlField,
            },
            transform: "text" as const,
            required: false,
          },
        ]
      : []),
    ...(preset.coverImageAltField
      ? [
          {
            id: `${preset.key}-detail-cover-image-alt`,
            blockId: heroImageId,
            propPath: "alt",
            source: {
              kind: "entry-field" as const,
              field: preset.coverImageAltField,
            },
            transform: "text" as const,
            required: false,
          },
        ]
      : []),
  ];

  const heroSection: PageSectionV2 = {
    id: heroSectionId,
    type: "hero",
    name: "Hero",
    variant: hasCoverImage ? "split" : "centered",
    layout: { ...detailPageHeroSectionDefaults.layout },
    style: { ...detailPageHeroSectionDefaults.style },
    spacing: { ...detailPageHeroSectionDefaults.spacing },
    visibility: { ...detailPageHeroSectionDefaults.visibility },
    responsive: {},
    blocks,
  };

  return {
    schemaVersion: 2,
    id: getCatalogFamilyDetailPageId(preset),
    name: `${preset.contentTypeName} Detail Template`,
    contentTypeId: detailPageContentTypePlaceholderId,
    contentTypeSlug: preset.contentTypeSlug,
    status: "published",
    titlePattern: "{{ title }}",
    seo: {
      titlePattern: "{{ title }}",
      descriptionField: summaryField,
      imageField: preset.coverImageUrlField ?? "heroImage",
    },
    settings: {
      template: "detail",
      layout: buildDetailPageLayout(),
    },
    sections: [heroSection],
    bindings,
  };
};

export const buildCatalogFamilyPlan = (
  preset: CatalogFamilyPreset,
  options?: {
    promptKind?: AssistantPromptKind;
    intentFamily?: AssistantIntentFamily;
  }
): AssistantActionPlan => {
  const detailPageDocument = buildDetailPageDocument(preset);
  const actions: AssistantPlannedAction[] = [
    {
      id: `content-type-${preset.key}`,
      type: "content-type.upsert",
      title: `Create the ${preset.contentTypeName.toLowerCase()} content model`,
      description: "Provision structured fields for summaries, media, specs, pricing, and status.",
      input: {
        slug: preset.contentTypeSlug,
        name: preset.contentTypeName,
        schema: preset.contentSchema,
      },
    },
    {
      id: `detail-page-${preset.key}`,
      type: "detail-page.upsert",
      title: `Create the ${preset.contentTypeName.toLowerCase()} detail template`,
      description: "Create a route-linked public detail template for individual catalog entries.",
      input: {
        document: detailPageDocument,
        contentTypeId: {
          kind: "stable-slug",
          resourceType: "content-type",
          slug: preset.contentTypeSlug,
        },
        expectedExistingId: detailPageDocument.id,
      },
    },
    {
      id: `content-route-${preset.key}`,
      type: "setting.content-route.upsert",
      title: `Register public detail route for ${preset.contentTypeName.toLowerCase()}`,
      description: "Add public entry routes so listing cards can open a working detail page.",
      input: {
        typeSlug: preset.contentTypeSlug,
        listPath: preset.catalogHiddenListPath,
        detailPath: preset.detailPath,
        enabled: true,
        detailPageId: detailPageDocument.id,
      },
    },
    {
      id: `custom-screen-${preset.key}`,
      type: "custom-screen.upsert",
      title: `Create a dedicated ${preset.customScreenName} admin screen`,
      description:
        "Add a sidebar shortcut and a dedicated records surface for reviewing key catalog data.",
      input: {
        name: preset.customScreenName,
        contentTypeSlug: preset.contentTypeSlug,
        status: "active",
        showInSidebar: true,
        sidebarLabel: preset.customScreenName,
        collectionRole: "canonical-admin-screen",
        compositionKey: preset.key,
        definition: buildScreenDefinition(preset),
      },
    },
    {
      id: `listing-query-${preset.key}`,
      type: "listing-query.upsert",
      title: "Create a listing query for the catalog",
      description: "Prepare a reusable query for published catalog entries.",
      input: {
        name: preset.listingQueryName,
        description: `Published ${preset.contentTypeName.toLowerCase()} used by the public catalog page.`,
        contentTypeSlug: preset.contentTypeSlug,
        fields: Array.from(
          new Set([
            "id",
            "title",
            "slug",
            "status",
            "updatedAt",
            `data.${preset.summaryField ?? "summary"}`,
            `data.${preset.coverImageUrlField ?? "heroImage"}`,
            ...(preset.coverImageUrlField ? [`data.${preset.coverImageUrlField}`] : []),
            ...(preset.coverImageAltField ? [`data.${preset.coverImageAltField}`] : []),
            ...[
              ...preset.screen.leftFields.map((field) => `data.${field.field}`),
              ...preset.screen.rightFields.map((field) => `data.${field.field}`),
            ].filter((field) => field !== `data.${preset.statusField ?? "projectStatus"}`),
            `data.${preset.statusField ?? "projectStatus"}`,
          ])
        ),
        includeDrafts: false,
        limit: 24,
        sort: [{ field: "title", dir: "asc" }],
      },
    },
    {
      id: `listing-template-${preset.key}`,
      type: "listing-template.upsert",
      title: "Create a grid listing template for catalog cards",
      description: "Define which catalog fields appear in cards and how they are formatted.",
      input: {
        name: preset.listingTemplateName,
        slug: preset.listingTemplateSlug,
        description: `Grid card layout for ${preset.contentTypeName.toLowerCase()} listings.`,
        layout: "grid",
        config: preset.listingTemplateConfig,
      },
    },
    {
      id: `page-${preset.key}`,
      type: "page.upsert",
      title: `Create the public ${preset.contentTypeName.toLowerCase()} catalog page`,
      description:
        "Publish a public landing page that renders the listing query through the content-list widget.",
      input: {
        title: preset.introTitle,
        slug: preset.catalogPageSlug,
        status: "published",
        listingQueryName: preset.listingQueryName,
        listingTemplateSlug: preset.listingTemplateSlug,
        introTitle: preset.introTitle,
        introBody: preset.introBody,
        ctaLabel: preset.ctaLabel,
        collectionLink: {
          contentTypeSlug: preset.contentTypeSlug,
          pageRole: "canonical-list-page",
          listingQueryName: preset.listingQueryName,
          listingTemplateSlug: preset.listingTemplateSlug,
        },
      },
    },
  ];

  return {
    id: `plan-${preset.key}`,
    status: "ready",
    intentId: preset.intentId,
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: options?.intentFamily ?? "catalog_showcase",
    title: preset.title,
    answer: [
      preset.answerIntro,
      "",
      "Planned resources:",
      `1. A structured content type for ${preset.contentTypeName.toLowerCase()}.`,
      `2. A dedicated ${preset.customScreenName} admin screen in the sidebar.`,
      "3. A listing query and grid template for catalog cards.",
      `4. A published catalog page at ${preset.catalogPageSlug}.`,
      "5. Public detail routes for each catalog entry.",
    ].join("\n"),
    summary: preset.summary,
    confidence: 0.91,
    assumptions: [...preset.assumptions],
    questions: [],
    actions,
  };
};

type CatalogFamilyRefinementOptions = {
  promptKind?: AssistantPromptKind;
  intentFamily?: AssistantIntentFamily;
  refinementId: string;
  title: string;
  answer: string;
  summary: string;
  assumptions?: string[];
  extraActions?: AssistantPlannedAction[];
  pageOverrides?: Partial<{
    title: string;
    slug: string;
    status: "draft" | "published";
    listingQueryName: string;
    listingTemplateSlug: string;
    introTitle: string;
    introBody: string;
    ctaLabel: string;
    contentListStyle: {
      columns?: "1" | "2" | "3";
      cardStyle?: "outlined" | "elevated" | "minimal";
    };
    listingFilters: {
      title: string;
      description: string;
      autoApply: boolean;
      showSearch: boolean;
      searchPlaceholder: string;
      searchLabel: string;
      applyLabel: string;
      facets: Array<Record<string, unknown>>;
    } | null;
    formEmbed: {
      formName: string;
      title: string;
      description: string;
      submitLabel: string;
      successMessage: string;
    } | null;
  }>;
};

export const buildCatalogFamilyRefinementPlan = (
  preset: CatalogFamilyPreset,
  options: CatalogFamilyRefinementOptions
): AssistantActionPlan => {
  const pageAction: AssistantPlannedAction = {
    id: `page-${preset.key}-${options.refinementId}`,
    type: "page.upsert",
    title: options.title,
    description:
      "Refine the existing catalog page and reuse the current listing query/template instead of creating duplicates.",
    input: {
      title: preset.introTitle,
      slug: preset.catalogPageSlug,
      status: "published",
      listingQueryName: preset.listingQueryName,
      listingTemplateSlug: preset.listingTemplateSlug,
      introTitle: preset.introTitle,
      introBody: preset.introBody,
      ctaLabel: preset.ctaLabel,
      collectionLink: {
        contentTypeSlug: preset.contentTypeSlug,
        pageRole: "canonical-list-page",
        listingQueryName: preset.listingQueryName,
        listingTemplateSlug: preset.listingTemplateSlug,
      },
      ...(options.pageOverrides ?? {}),
    },
  };

  return {
    id: `plan-${preset.key}-${options.refinementId}`,
    status: "ready",
    intentId: `${preset.intentId}-${options.refinementId}`,
    promptKind: options.promptKind ?? "refinement_request",
    intentFamily: options.intentFamily ?? "catalog_showcase",
    title: options.title,
    answer: options.answer,
    summary: options.summary,
    confidence: 0.84,
    assumptions: [...(options.assumptions ?? [])],
    questions: [],
    actions: [...(options.extraActions ?? []), pageAction],
  };
};
