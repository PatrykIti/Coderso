import { describe, expect, it } from "vitest";

import {
  pageBlockCapabilities,
  pageBlockTypes,
  pageBreakpoints,
  type PageBlockType,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildReferencePlan,
  resolvePlannedPackageResourceRefs,
} from "../../../core/services/kits/fullSitePackage/referenceGraph";
import type {
  FullSitePackageResources,
  JsonObject,
  PackageResourceCollection,
} from "../../../core/services/kits/fullSitePackage/types";
import { emptyFullSitePackageResources } from "./fullSitePackageTestSupport";
import {
  addPackageSeed,
  expectReferenceGraphCode,
  packageRef,
  packageWithResources,
  pageBlockChain,
} from "./fullSitePackageReferenceTestSupport";

type PageBackedKind = "page" | "page_template";

const pageBackedFixture = (
  kind: PageBackedKind,
  root: JsonObject
): { resources: FullSitePackageResources; collection: PackageResourceCollection; key: string } => {
  const resources = emptyFullSitePackageResources();
  addPackageSeed(resources, "contentTypes", "content", { slug: "content" });
  addPackageSeed(resources, "forms", "form", {});
  addPackageSeed(resources, "listingTemplates", "template", {});
  addPackageSeed(resources, "listingQueries", "query", { query: { sourceConfig: {} } });
  const collection = kind === "page" ? "pages" : "pageTemplates";
  const key = kind === "page" ? "page-source" : "template-source";
  addPackageSeed(resources, collection, key, kind === "page" ? { data: root } : { document: root });
  return { resources, collection, key };
};

const findSource = (kind: PageBackedKind, root: JsonObject) => {
  const fixture = pageBackedFixture(kind, root);
  const plan = buildReferencePlan(packageWithResources(fixture.resources));
  const source = plan.find(({ key }) => key === fixture.key);
  if (!source) throw new Error("page-backed source missing");
  return source;
};

const collectionBlock = (): JsonObject => ({
  type: "collection",
  props: {
    contentTypeId: packageRef("content_type", "content"),
    queryId: packageRef("listing_query", "query"),
    templateId: packageRef("listing_template", "template"),
  },
});

describe("full-site package Page reference traversal", () => {
  it("accepts and substitutes only Page data roots", () => {
    const fixture = pageBackedFixture("page", {
      settings: {
        collectionLink: {
          contentTypeId: packageRef("content_type", "content"),
          listingQueryId: packageRef("listing_query", "query"),
          listingTemplateId: packageRef("listing_template", "template"),
        },
      },
      sections: [{ blocks: [collectionBlock()] }],
    });
    const source = buildReferencePlan(packageWithResources(fixture.resources)).find(
      ({ key }) => key === fixture.key
    );
    if (!source) throw new Error("Page source missing");
    expect(source.references.map(({ path }) => path)).toEqual([
      ["data", "settings", "collectionLink", "contentTypeId"],
      ["data", "settings", "collectionLink", "listingQueryId"],
      ["data", "settings", "collectionLink", "listingTemplateId"],
      ["data", "sections", 0, "blocks", 0, "props", "contentTypeId"],
      ["data", "sections", 0, "blocks", 0, "props", "queryId"],
      ["data", "sections", 0, "blocks", 0, "props", "templateId"],
    ]);
    const resolved = resolvePlannedPackageResourceRefs(
      source,
      new Map([
        ["content_type:content", "ct-id"],
        ["listing_query:query", "query-id"],
        ["listing_template:template", "template-id"],
      ])
    );
    expect((resolved.data as JsonObject).settings).toEqual({
      collectionLink: {
        contentTypeId: "ct-id",
        listingQueryId: "query-id",
        listingTemplateId: "template-id",
      },
    });
    expect(fixture.resources.pages[0].desired.data).not.toBe(resolved.data);

    fixture.resources.pages[0].desired.document = {
      settings: { collectionLink: { contentTypeId: packageRef("content_type", "content") } },
    };
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(fixture.resources)),
        "site_package_ref_bad_path"
      ).diagnostics[0]
    ).toEqual({
      path: "$.resources.pages[0].desired.document.settings.collectionLink.contentTypeId",
      reason: "package_ref_path_forbidden",
    });
  });

  it("accepts and substitutes only Page Template document roots", () => {
    const fixture = pageBackedFixture("page_template", {
      settings: {
        collectionLink: { contentTypeId: packageRef("content_type", "content") },
      },
      sections: [{ blocks: [{ type: "form", props: { formId: packageRef("form", "form") } }] }],
    });
    const source = buildReferencePlan(packageWithResources(fixture.resources)).find(
      ({ key }) => key === fixture.key
    );
    if (!source) throw new Error("Page Template source missing");
    expect(source.references.map(({ path }) => path)).toEqual([
      ["document", "settings", "collectionLink", "contentTypeId"],
      ["document", "sections", 0, "blocks", 0, "props", "formId"],
    ]);

    fixture.resources.pageTemplates[0].desired.data = {
      sections: [
        {
          blocks: [{ type: "form", props: { formId: packageRef("form", "form") } }],
        },
      ],
    };
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(fixture.resources)),
        "site_package_ref_bad_path"
      ).diagnostics[0]
    ).toEqual({
      path: "$.resources.pageTemplates[0].desired.data.sections[0].blocks[0].props.formId",
      reason: "package_ref_path_forbidden",
    });
  });

  it("discovers base, tablet and mobile properties in fixed field/device order", () => {
    const source = findSource("page", {
      sections: [
        {
          blocks: [
            {
              type: "collection",
              props: {
                templateId: packageRef("listing_template", "template"),
                queryId: packageRef("listing_query", "query"),
                contentTypeId: packageRef("content_type", "content"),
              },
              responsive: {
                mobile: { props: { contentTypeId: packageRef("content_type", "content") } },
                tablet: {
                  props: {
                    templateId: packageRef("listing_template", "template"),
                    queryId: packageRef("listing_query", "query"),
                  },
                },
              },
            },
          ],
        },
      ],
    });
    expect(source.references.map(({ path }) => path)).toEqual([
      ["data", "sections", 0, "blocks", 0, "props", "contentTypeId"],
      ["data", "sections", 0, "blocks", 0, "props", "queryId"],
      ["data", "sections", 0, "blocks", 0, "props", "templateId"],
      ["data", "sections", 0, "blocks", 0, "responsive", "tablet", "props", "queryId"],
      ["data", "sections", 0, "blocks", 0, "responsive", "tablet", "props", "templateId"],
      ["data", "sections", 0, "blocks", 0, "responsive", "mobile", "props", "contentTypeId"],
    ]);
  });

  it("traverses every native slot in native order even above a columns props.count", () => {
    for (const kind of ["page", "page_template"] as const) {
      const source = findSource(kind, {
        sections: [
          {
            blocks: [
              {
                type: "columns",
                props: { count: 1 },
                slots: {
                  "column:4": [{ type: "form", props: { formId: packageRef("form", "form") } }],
                  "column:2": [
                    { type: "filters", props: { queryId: packageRef("listing_query", "query") } },
                  ],
                  "column:1": [collectionBlock()],
                  "column:3": [],
                },
              },
            ],
          },
        ],
      });
      expect(source.references.map(({ path }) => path)).toEqual([
        [
          kind === "page" ? "data" : "document",
          "sections",
          0,
          "blocks",
          0,
          "slots",
          "column:1",
          0,
          "props",
          "contentTypeId",
        ],
        [
          kind === "page" ? "data" : "document",
          "sections",
          0,
          "blocks",
          0,
          "slots",
          "column:1",
          0,
          "props",
          "queryId",
        ],
        [
          kind === "page" ? "data" : "document",
          "sections",
          0,
          "blocks",
          0,
          "slots",
          "column:1",
          0,
          "props",
          "templateId",
        ],
        [
          kind === "page" ? "data" : "document",
          "sections",
          0,
          "blocks",
          0,
          "slots",
          "column:2",
          0,
          "props",
          "queryId",
        ],
        [
          kind === "page" ? "data" : "document",
          "sections",
          0,
          "blocks",
          0,
          "slots",
          "column:4",
          0,
          "props",
          "formId",
        ],
      ]);
    }
  });

  it("accepts depth four and rejects a depth-five child for both Page-backed kinds", () => {
    for (const kind of ["page", "page_template"] as const) {
      expect(() =>
        findSource(kind, {
          sections: [{ blocks: [pageBlockChain(4, collectionBlock())] }],
        })
      ).not.toThrow();

      const over = pageBlockChain(5, collectionBlock());
      const fixture = pageBackedFixture(kind, { sections: [{ blocks: [over] }] });
      const error = expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(fixture.resources)),
        "site_package_ref_bad_path"
      );
      expect(error.diagnostics).toEqual([
        {
          path: `$.resources.${fixture.collection}[0].desired.${kind === "page" ? "data" : "document"}.sections[0].blocks[0].slots.children[0].slots.children[0].slots.children[0].slots`,
          reason: "page_tree_depth_exceeded",
        },
      ]);
    }
  });

  it("accepts 24 children and rejects child 25 without scanning the rejected subtree", () => {
    for (const kind of ["page", "page_template"] as const) {
      const exactChildren = Array.from({ length: 24 }, () => ({ type: "text", props: {} }));
      expect(() =>
        findSource(kind, {
          sections: [
            { blocks: [{ type: "container", props: {}, slots: { children: exactChildren } }] },
          ],
        })
      ).not.toThrow();

      const overChildren = [
        ...exactChildren,
        { type: "form", props: { formId: packageRef("form", "form") } },
      ];
      const fixture = pageBackedFixture(kind, {
        sections: [
          { blocks: [{ type: "container", props: {}, slots: { children: overChildren } }] },
        ],
      });
      const error = expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(fixture.resources)),
        "site_package_ref_bad_path"
      );
      expect(error.diagnostics).toEqual([
        {
          path: `$.resources.${fixture.collection}[0].desired.${kind === "page" ? "data" : "document"}.sections[0].blocks[0].slots`,
          reason: "page_slot_children_exceeded",
        },
      ]);
    }
  });

  it("keeps valid-discriminator structural first-match precedence", () => {
    const cases: Array<{ block: JsonObject; reason: string }> = [
      {
        block: pageBlockChain(4, {
          type: "text",
          props: {},
          slots: { unknown: Array.from({ length: 25 }, () => ({})) },
        }),
        reason: "page_tree_depth_exceeded",
      },
      {
        block: {
          type: "text",
          props: {},
          slots: { unknown: Array.from({ length: 25 }, () => ({})) },
        },
        reason: "page_slots_forbidden",
      },
      {
        block: {
          type: "container",
          props: {},
          slots: { unknown: Array.from({ length: 25 }, () => ({})) },
        },
        reason: "page_slot_key_forbidden",
      },
      {
        block: {
          type: "container",
          props: {},
          slots: { children: Array.from({ length: 25 }, () => ({})) },
        },
        reason: "page_slot_children_exceeded",
      },
    ];
    for (const testCase of cases) {
      const fixture = pageBackedFixture("page", {
        sections: [{ blocks: [testCase.block] }],
      });
      const error = expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(fixture.resources)),
        "site_package_ref_bad_path"
      );
      expect(error.diagnostics).toHaveLength(1);
      expect(error.diagnostics[0].reason).toBe(testCase.reason);
    }
  });

  it("bounds malformed Page discriminator branches without granting descendant authority", () => {
    const depthRejected = pageBackedFixture("page", {
      sections: [
        {
          blocks: [
            pageBlockChain(4, {
              type: "malformed",
              slots: {
                private: [{ type: "form", props: { formId: packageRef("form", "form") } }],
              },
            }),
          ],
        },
      ],
    });
    const depthError = expectReferenceGraphCode(
      () => buildReferencePlan(packageWithResources(depthRejected.resources)),
      "site_package_ref_bad_path"
    );
    expect(depthError.diagnostics.map(({ reason }) => reason)).toEqual([
      "page_tree_depth_exceeded",
    ]);

    const inBounds = pageBackedFixture("page_template", {
      sections: [
        {
          blocks: [
            {
              type: "malformed",
              slots: {
                private: [{ type: "form", props: { formId: packageRef("form", "form") } }],
              },
            },
          ],
        },
      ],
    });
    const genericError = expectReferenceGraphCode(
      () => buildReferencePlan(packageWithResources(inBounds.resources)),
      "site_package_ref_bad_path"
    );
    expect(genericError.diagnostics).toHaveLength(1);
    expect(genericError.diagnostics[0].reason).toBe("package_ref_path_forbidden");
    expect(genericError.diagnostics[0].path).toContain(".[redacted]");
  });

  it("keeps the private Page authority snapshot stable after imported-owner mutation", () => {
    const baselineRoot: JsonObject = {
      sections: [{ blocks: [collectionBlock()] }],
    };
    const baseline = findSource("page", baselineRoot).references;
    const mutableTypes = pageBlockTypes as unknown as string[];
    const mutableBreakpoints = pageBreakpoints as unknown as string[];
    const originalTypes = [...mutableTypes];
    const originalBreakpoints = [...mutableBreakpoints];
    const originalSlots = pageBlockCapabilities.container.slots;
    try {
      mutableTypes.splice(0, mutableTypes.length, "text");
      mutableBreakpoints.reverse();
      (pageBlockCapabilities.container as { slots: readonly string[] }).slots = [];
      expect(findSource("page", baselineRoot).references).toEqual(baseline);
    } finally {
      mutableTypes.splice(0, mutableTypes.length, ...originalTypes);
      mutableBreakpoints.splice(0, mutableBreakpoints.length, ...originalBreakpoints);
      (pageBlockCapabilities.container as { slots: readonly string[] }).slots = originalSlots;
    }
  });
});
