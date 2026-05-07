import { ensureRuntimeWidgetsRegistered } from "../../../widgets/runtime";
import type { WidgetBlock } from "../../../widgets/types";
import { normalizeWidgetBlock } from "../../../widgets/validator";
import type { PageCollectionLink } from "../../pages/pageCollectionLink";
import type { AssistantPageUpsertAction } from "../actionPlanTypes";
import { buildBlueprintPageSectionSeed } from "./blueprintPageSectionLibrary";

type AssistantPageUpsertInput = AssistantPageUpsertAction["input"];

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
  blocks?: WidgetBlock[];
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
  ctaLabel?: string | null;
  contentListStyle?: AssistantPageUpsertInput["contentListStyle"];
  listingFilters?: AssistantPageUpsertInput["listingFilters"];
  formEmbed?: ResolvedFormEmbed | null;
  collectionLink?: PageCollectionLink | null;
};

const normalizePageBlock = (block: WidgetBlock) => {
  ensureRuntimeWidgetsRegistered();
  return normalizeWidgetBlock(block);
};

const buildResolvedFormEmbedBlock = (input: { id: string; formEmbed: ResolvedFormEmbed }) =>
  buildBlueprintPageSectionSeed("form-embed", {
    id: input.id,
    data: {
      formId: input.formEmbed.formId,
      title: input.formEmbed.title,
      description: input.formEmbed.description,
      submitLabel: input.formEmbed.submitLabel,
      successMessage: input.formEmbed.successMessage,
      layout: {
        alignment: "start",
        width: "lg",
        spacing: "md",
        buttonAlignment: "start",
      },
      style: {
        background: "transparent",
        surface: "var(--color-bg)",
        borderColor: "var(--color-border)",
        borderWidth: "1",
        radius: "md",
        inputSize: "md",
      },
      fields: {
        showLabels: true,
        showRequiredIndicator: true,
      },
    },
  });

const composeCollectionBlocks = (
  input: Required<
    Pick<BlueprintPageSectionCompositionInput, "listingQueryId" | "listingTemplateId">
  > &
    Pick<
      BlueprintPageSectionCompositionInput,
      "ctaLabel" | "contentListStyle" | "listingFilters" | "formEmbed"
    >
) => [
  ...(input.listingFilters
    ? [
        buildBlueprintPageSectionSeed("listing-filters", {
          id: "catalog-listing-filters",
          data: {
            listingQueryId: input.listingQueryId,
            title: input.listingFilters.title,
            description: input.listingFilters.description,
            autoApply: input.listingFilters.autoApply,
            showSearch: input.listingFilters.showSearch,
            searchPlaceholder: input.listingFilters.searchPlaceholder,
            searchLabel: input.listingFilters.searchLabel,
            applyLabel: input.listingFilters.applyLabel,
            facets: input.listingFilters.facets,
            resolved: {
              listingQueryId: input.listingQueryId,
              metrics: [],
              searchQuery: "",
              rejectedTokens: [],
            },
          },
        }),
      ]
    : []),
  buildBlueprintPageSectionSeed("content-list", {
    id: "catalog-content-list",
    variant: "cards",
    data: {
      source: {
        mode: "listing",
        listingQueryId: input.listingQueryId,
        listingTemplateId: input.listingTemplateId,
        statusScope: "published",
        limit: 9,
        sort: "title-asc",
      },
      fields: {
        showImage: true,
        showExcerpt: true,
        showMeta: true,
        showCta: true,
      },
      emptyState: {
        title: "No catalog items yet",
        description: "Add your first catalog entry in Coderso to populate this page.",
      },
      style: {
        columns: input.contentListStyle?.columns ?? "3",
        gap: "md",
        cardStyle: input.contentListStyle?.cardStyle ?? "outlined",
        ctaLabel: input.ctaLabel ?? "Read more",
        backgroundColor: "var(--color-bg)",
        borderColor: "var(--color-border)",
        textColor: "var(--color-text)",
      },
      resolved: {
        items: [],
        total: 0,
        sourceTypeId: "",
        sourceTypeSlug: "",
        listingQueryId: input.listingQueryId,
        listingTemplateId: input.listingTemplateId,
        resolvedAt: "",
        runtime: {
          rejectedTokens: [],
          searchQuery: "",
          page: 1,
        },
      },
    },
  }),
  ...(input.formEmbed
    ? [
        buildResolvedFormEmbedBlock({
          id: "catalog-inquiry-form",
          formEmbed: input.formEmbed,
        }),
      ]
    : []),
];

const composeSimpleBlocks = (
  input: Pick<BlueprintPageSectionCompositionInput, "blocks" | "formEmbed">
) => [
  ...(input.blocks ?? []).map(normalizePageBlock),
  ...(input.formEmbed
    ? [
        buildResolvedFormEmbedBlock({
          id: "lead-capture-form",
          formEmbed: input.formEmbed,
        }),
      ]
    : []),
];

export const composeBlueprintPageData = (input: BlueprintPageSectionCompositionInput) => {
  const blocks =
    input.listingQueryId && input.listingTemplateId
      ? composeCollectionBlocks({
          listingQueryId: input.listingQueryId,
          listingTemplateId: input.listingTemplateId,
          ctaLabel: input.ctaLabel,
          contentListStyle: input.contentListStyle,
          listingFilters: input.listingFilters,
          formEmbed: input.formEmbed,
        })
      : composeSimpleBlocks({
          blocks: input.blocks,
          formEmbed: input.formEmbed,
        });

  return {
    blocks,
    settings: {
      showInNav: true,
      seo: {
        title: input.introTitle,
        description: input.introBody,
      },
      ...(input.collectionLink ? { collectionLink: input.collectionLink } : {}),
    },
  };
};
