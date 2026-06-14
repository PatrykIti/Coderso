import { expect, test } from "vitest";

import { composeBlueprintPageData } from "../../../core/services/assistant/blueprints/blueprintPageSectionComposer";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

test("composeBlueprintPageData builds listing filters and collection sections for canonical collection pages", () => {
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

  expect(data.schemaVersion).toBe(2);
  expect(data.sections.map((section) => section.type)).toEqual(["filters", "collection"]);
  // TASK-459-02 canonical shape: the filter surface is the dedicated filters
  // BLOCK bound to the same saved query the collection block lists.
  expect(data.sections[0]?.blocks.map((block) => block.type)).toContain("filters");
  expect(data.sections[0]?.blocks.map((block) => block.type)).not.toContain("collection");
  expect(data.sections[0]?.blocks.find((block) => block.type === "filters")).toMatchObject({
    props: {
      queryId: "query-1",
      autoApply: true,
      showSearch: true,
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
  });
  expect(data.sections[1]?.blocks[0]).toMatchObject({
    type: "collection",
    props: {
      queryId: "query-1",
      templateId: "template-1",
    },
  });
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

  expect(data.sections.map((section) => section.type)).toEqual(["collection", "lead-form"]);
  expect(data.sections[1]?.blocks.find((block) => block.type === "form")).toMatchObject({
    props: {
      formId: "form-1",
    },
  });
});

test("composeBlueprintPageData preserves simple page sections and normalized form sections", () => {
  const data = composeBlueprintPageData({
    introTitle: "Contact",
    introBody: "Get in touch.",
    sections: [
      createPageSectionV2("content", {
        id: "contact-intro",
        name: "Contact intro",
        blocks: [
          createPageBlockV2("heading", {
            id: "contact-heading",
            props: { text: "Talk to us", level: "h2", align: "left" },
          }),
        ],
      }),
    ],
    formEmbed: {
      formId: "form-1",
      title: "Write to us",
      description: "Leave a message.",
      submitLabel: "Send",
      successMessage: "Thanks.",
    },
  });

  expect(data.sections.map((section) => section.type)).toEqual(["content", "lead-form"]);
  expect(data.sections[0]?.blocks[0]).toMatchObject({
    type: "heading",
    props: { text: "Talk to us" },
  });
});
