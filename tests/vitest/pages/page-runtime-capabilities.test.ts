import { describe, expect, test } from "vitest";

import { composeBlueprintPageData } from "../../../core/services/assistant/blueprints/blueprintPageSectionComposer";
import { listBusinessBlueprintPacks } from "../../../core/services/assistant/blueprints/businessBlueprintTypes";
import { solutionKitsCatalog } from "../../../core/services/kits/solutionKitsCatalog";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockTypes,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const collectBlocks = (blocks: readonly PageBlockV2[]): PageBlockV2[] =>
  blocks.flatMap((block) => [
    block,
    ...Object.values(block.slots ?? {}).flatMap((slotBlocks) => collectBlocks(slotBlocks ?? [])),
  ]);

const collectDocumentBlocks = (document: PageDocumentV2): PageBlockV2[] =>
  document.sections.flatMap((section) => collectBlocks(section.blocks));

describe("Page runtime capability parity", () => {
  test("exposed block capabilities always have real public runtime renderers", () => {
    const failures = pageBlockTypes.flatMap((type) => {
      const capability = pageBlockCapabilities[type];
      const exposed =
        capability.editorInsertable || capability.insertable || capability.assistantEmittable;
      return exposed && capability.runtimeRenderer !== "real"
        ? [`${type}:${capability.runtimeRenderer}`]
        : [];
    });

    expect(failures).toEqual([]);
  });

  test("assistant and solution-kit Page emitters use runtime-real blocks", () => {
    const assistantCollectionPage = composeBlueprintPageData({
      introTitle: "Products",
      introBody: "Browse products.",
      listingQueryId: "query-1",
      listingTemplateId: "template-1",
      formEmbed: {
        formId: "form-1",
        title: "Ask about a product",
        description: "Send a question.",
        submitLabel: "Send",
        successMessage: "Thanks.",
      },
    });
    const documents = [
      { source: "assistant:collection-page", document: assistantCollectionPage },
      ...listBusinessBlueprintPacks().flatMap((pack) => {
        const plan = pack.buildPlan({ promptKind: "setup_request" });
        return plan.actions.flatMap((action) => {
          if (action.type !== "page.upsert" || !action.input.sections?.length) return [];
          return [
            {
              source: `assistant-pack:${pack.id}:${action.id}`,
              document: normalizeStoredPageDocumentV2ForRead({
                schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
                sections: action.input.sections,
                settings: { template: "page-v2", showInNav: true },
              }),
            },
          ];
        });
      }),
      ...solutionKitsCatalog.flatMap((kit) =>
        kit.resourceBlueprint.pages.map((page) => ({
          source: `solution-kit:${kit.id}:${page.slug}`,
          document: normalizeStoredPageDocumentV2ForRead(page.data),
        }))
      ),
    ];
    const failures = documents.flatMap(({ source, document }) =>
      collectDocumentBlocks(document).flatMap((block) => {
        const capability = pageBlockCapabilities[block.type];
        if (capability.runtimeRenderer === "real") return [];
        return [`${source}:${block.id}:${block.type}:${capability.runtimeRenderer}`];
      })
    );

    expect(failures).toEqual([]);
  });
});
