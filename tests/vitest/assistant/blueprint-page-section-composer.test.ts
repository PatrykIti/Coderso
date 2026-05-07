import { expect, test } from "vitest";

import { composeBlueprintPageData } from "../../../core/services/assistant/blueprints/blueprintPageSectionComposer";

test("composeBlueprintPageData builds listing filters and content list blocks for canonical collection pages", () => {
  const data = composeBlueprintPageData({
    introTitle: "Products",
    introBody: "Browse products.",
    listingQueryId: "query-1",
    listingTemplateId: "template-1",
    ctaLabel: "Read more",
    listingFilters: {
      title: "Filter products",
      description: "Narrow results.",
      autoApply: true,
      showSearch: true,
      searchPlaceholder: "Search products",
      searchLabel: "Search",
      applyLabel: "Apply",
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "data.projectStatus",
          op: "in",
          options: [{ value: "active", label: "Active" }],
        },
      ],
    },
    collectionLink: {
      contentTypeId: "type-1",
      pageRole: "canonical-list-page",
      listingQueryId: "query-1",
      listingTemplateId: "template-1",
    },
  });

  expect((data.blocks as Array<{ type: string }>).map((block) => block.type)).toEqual([
    "listing-filters",
    "content-list",
  ]);
  expect(data).toMatchObject({
    settings: {
      showInNav: true,
      collectionLink: {
        contentTypeId: "type-1",
        pageRole: "canonical-list-page",
        listingQueryId: "query-1",
        listingTemplateId: "template-1",
      },
    },
  });
});

test("composeBlueprintPageData appends resolved form embeds to collection-backed page data", () => {
  const data = composeBlueprintPageData({
    introTitle: "Products",
    introBody: "Browse products.",
    listingQueryId: "query-1",
    listingTemplateId: "template-1",
    formEmbed: {
      formId: "form-1",
      title: "Ask about a product",
      description: "Send a question.",
      submitLabel: "Send inquiry",
      successMessage: "Thanks.",
    },
  });

  const blocks = data.blocks as Array<{ type: string; data?: { formId?: string } }>;
  expect(blocks.map((block) => block.type)).toEqual(["content-list", "form-embed"]);
  expect(blocks[1]?.data?.formId).toBe("form-1");
});

test("composeBlueprintPageData preserves simple page blocks and normalized form sections", () => {
  const data = composeBlueprintPageData({
    introTitle: "Contact",
    introBody: "Get in touch.",
    blocks: [
      {
        id: "contact-intro",
        type: "rich-text-section",
        variant: "single-column",
        data: {
          titleBlock: {
            title: "Talk to us",
          },
        },
      },
    ],
    formEmbed: {
      formId: "form-1",
      title: "Write to us",
      description: "Leave a message.",
      submitLabel: "Send",
      successMessage: "Thanks.",
    },
  });

  expect((data.blocks as Array<{ type: string }>).map((block) => block.type)).toEqual([
    "rich-text-section",
    "form-embed",
  ]);
});
