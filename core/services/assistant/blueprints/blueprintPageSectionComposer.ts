import type { PageCollectionLink } from "../../pages/pageCollectionLink";
import {
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../pages/pageDocumentV2";

type ResolvedFormEmbed = {
  formId: string;
  title: string;
  description: string;
  submitLabel: string;
  successMessage: string;
};

export type BlueprintPageSectionCompositionInput = {
  introTitle: string;
  introBody: string;
  sections?: PageSectionV2[];
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
  ctaLabel?: string | null;
  contentListStyle?: {
    columns?: "1" | "2" | "3";
    cardStyle?: "outlined" | "elevated" | "minimal";
  };
  listingFilters?: {
    title: string;
    description: string;
    autoApply: boolean;
    showSearch: boolean;
    searchPlaceholder: string;
    searchLabel: string;
    applyLabel: string;
    facets: Array<Record<string, unknown>>;
  } | null;
  formEmbed?: ResolvedFormEmbed | null;
  collectionLink?: PageCollectionLink | null;
};

const cloneSection = (section: PageSectionV2) =>
  createPageSectionV2(section.type, {
    ...section,
    blocks: section.blocks.map((block) => createPageBlockV2(block.type, block)),
  });

const splitTrailingFooterSections = (sections: PageSectionV2[] | undefined) => {
  const cloned = (sections ?? []).map(cloneSection);
  const trailing: PageSectionV2[] = [];

  while (cloned.length > 0) {
    const section = cloned.at(-1);
    if (!section || section.type !== "cta" || !/footer/i.test(`${section.id} ${section.name}`)) {
      break;
    }
    trailing.unshift(cloned.pop()!);
  }

  return { body: cloned, footer: trailing };
};

const headingBlock = (id: string, text: string, level: "h1" | "h2" = "h2"): PageBlockV2 =>
  createPageBlockV2("heading", {
    id,
    props: { text, level, align: level === "h1" ? "center" : "left" },
  });

const textBlock = (id: string, text: string, align: "left" | "center" = "left"): PageBlockV2 =>
  createPageBlockV2("text", {
    id,
    props: { text, format: "plain", align },
  });

const createIntroSection = (input: BlueprintPageSectionCompositionInput) =>
  createPageSectionV2("hero", {
    id: "assistant-intro",
    name: "Intro",
    variant: "centered",
    blocks: [
      headingBlock("assistant-intro-heading", input.introTitle, "h1"),
      textBlock("assistant-intro-copy", input.introBody, "center"),
    ],
  });

const createListingFiltersSection = (
  filters: NonNullable<BlueprintPageSectionCompositionInput["listingFilters"]>,
  listingQueryId: string
) =>
  createPageSectionV2("filters", {
    id: "assistant-listing-filters",
    name: filters.title,
    variant: "compact",
    blocks: [
      headingBlock("assistant-listing-filters-heading", filters.title),
      textBlock("assistant-listing-filters-copy", filters.description),
      createPageBlockV2("collection", {
        id: "assistant-listing-filters-block",
        props: {
          mode: "filters",
          queryId: listingQueryId,
          autoApply: filters.autoApply,
          showSearch: filters.showSearch,
          searchPlaceholder: filters.searchPlaceholder,
          searchLabel: filters.searchLabel,
          applyLabel: filters.applyLabel,
          facets: filters.facets,
        },
      }),
    ],
  });

const createCollectionSection = (input: {
  listingQueryId: string;
  listingTemplateId: string;
  ctaLabel?: string | null;
  contentListStyle?: BlueprintPageSectionCompositionInput["contentListStyle"];
}) =>
  createPageSectionV2("collection", {
    id: "assistant-content-list",
    name: "Collection",
    variant: "cards",
    layout: {
      columns: Number(input.contentListStyle?.columns ?? 3),
      align: "stretch",
      justify: "start",
      maxWidth: 1080,
    },
    blocks: [
      createPageBlockV2("collection", {
        id: "assistant-content-list-block",
        props: {
          mode: "listing",
          queryId: input.listingQueryId,
          templateId: input.listingTemplateId,
          statusScope: "published",
          limit: 9,
          sort: "title-asc",
          cardStyle: input.contentListStyle?.cardStyle ?? "outlined",
          ctaLabel: input.ctaLabel ?? "Read more",
        },
      }),
    ],
  });

const createFormSection = (id: string, formEmbed: ResolvedFormEmbed) =>
  createPageSectionV2("lead-form", {
    id,
    name: formEmbed.title,
    blocks: [
      headingBlock(`${id}-heading`, formEmbed.title),
      textBlock(`${id}-copy`, formEmbed.description),
      createPageBlockV2("form", {
        id: `${id}-form`,
        props: {
          formId: formEmbed.formId,
          submitLabel: formEmbed.submitLabel,
          successMessage: formEmbed.successMessage,
        },
      }),
    ],
  });

const composeCollectionSections = (
  input: {
    listingQueryId: string;
    listingTemplateId: string;
  } & Pick<
    BlueprintPageSectionCompositionInput,
    "sections" | "ctaLabel" | "contentListStyle" | "listingFilters" | "formEmbed"
  >
) => {
  const { body, footer } = splitTrailingFooterSections(input.sections);
  return [
    ...body,
    ...(input.listingFilters
      ? [createListingFiltersSection(input.listingFilters, input.listingQueryId)]
      : []),
    createCollectionSection({
      listingQueryId: input.listingQueryId,
      listingTemplateId: input.listingTemplateId,
      ctaLabel: input.ctaLabel,
      contentListStyle: input.contentListStyle,
    }),
    ...(input.formEmbed
      ? [createFormSection("assistant-catalog-inquiry-form", input.formEmbed)]
      : []),
    ...footer,
  ];
};

const composeSimpleSections = (
  input: Pick<
    BlueprintPageSectionCompositionInput,
    "introTitle" | "introBody" | "sections" | "formEmbed"
  >
) => {
  const { body, footer } = splitTrailingFooterSections(input.sections);
  return [
    ...(body.length > 0 ? body : [createIntroSection(input)]),
    ...(input.formEmbed ? [createFormSection("assistant-lead-capture-form", input.formEmbed)] : []),
    ...footer,
  ];
};

export const composeBlueprintPageData = (
  input: BlueprintPageSectionCompositionInput
): PageDocumentV2 => {
  const sections =
    input.listingQueryId && input.listingTemplateId
      ? composeCollectionSections({
          listingQueryId: input.listingQueryId,
          listingTemplateId: input.listingTemplateId,
          sections: input.sections,
          ctaLabel: input.ctaLabel,
          contentListStyle: input.contentListStyle,
          listingFilters: input.listingFilters,
          formEmbed: input.formEmbed,
        })
      : composeSimpleSections({
          introTitle: input.introTitle,
          introBody: input.introBody,
          sections: input.sections,
          formEmbed: input.formEmbed,
        });

  return normalizePageDocumentV2ForWrite({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {
      title: input.introTitle,
      description: input.introBody,
    },
    settings: {
      template: "page-v2",
      showInNav: true,
      ...(input.collectionLink ? { collectionLink: input.collectionLink } : {}),
    },
    sections,
  });
};
