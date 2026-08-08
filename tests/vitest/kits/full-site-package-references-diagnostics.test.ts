import { describe, expect, it } from "vitest";

import { buildReferencePlan } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import type {
  FullSitePackageResources,
  JsonObject,
  JsonValue,
} from "../../../core/services/kits/fullSitePackage/types";
import { emptyFullSitePackageResources } from "./fullSitePackageTestSupport";
import {
  addPackageSeed,
  expectReferenceGraphCode,
  packageRef,
  packageWithResources,
} from "./fullSitePackageReferenceTestSupport";

const nestedValue = (level: number, terminal: JsonValue = null): JsonObject => {
  let value: JsonValue = terminal;
  for (let depth = level; depth > 1; depth -= 1) value = { nested: value };
  return value as JsonObject;
};

const genericBadPathPackage = (count: number) => {
  const resources = emptyFullSitePackageResources();
  addPackageSeed(resources, "pages", "source", {
    data: { sections: [] },
    arbitrary: Array.from({ length: count }, (_, index) => ({
      ref: "page",
      key: `sentinel-${index}`,
    })),
  });
  return packageWithResources(resources);
};

const menuEdgePackage = (count: number, extraDesired: JsonObject = {}) => {
  const resources = emptyFullSitePackageResources();
  addPackageSeed(resources, "pages", "target", { data: { sections: [] } });
  addPackageSeed(resources, "menus", "menu", {
    items: Array.from({ length: count }, () => ({
      pageId: packageRef("page", "target"),
    })),
    ...extraDesired,
  });
  return packageWithResources(resources);
};

const malformedDepthBranch = (refSentinel: string): JsonObject => ({
  type: "malformed",
  slots: {
    private: [
      {
        type: "malformed",
        slots: {
          private: [
            {
              type: "malformed",
              slots: {
                private: [{ ref: "form", key: refSentinel }],
              },
            },
          ],
        },
      },
    ],
  },
});

const malformedOversizedBranch = (refSentinel: string): JsonObject => ({
  type: "malformed",
  slots: {
    private: [...Array.from({ length: 24 }, () => null), { ref: "form", key: refSentinel }],
  },
});

const assertMalformedSiblingOrdering = (rootKey: "data" | "document") => {
  const resources = emptyFullSitePackageResources();
  addPackageSeed(resources, "forms", "form", {});
  const desiredRoot: JsonObject = {
    sections: [
      {
        blocks: [
          {
            type: "malformed",
            slots: {
              "zeta-private": [null, malformedOversizedBranch("blocked-zeta")],
              "safe-private": [
                null,
                { type: "malformed", props: { formId: packageRef("form", "form") } },
              ],
              "alpha-private": [null, malformedDepthBranch("blocked-alpha")],
              "10": [null, malformedOversizedBranch("blocked-ten")],
              "2": [null, malformedDepthBranch("blocked-two")],
            },
          },
        ],
      },
    ],
  };
  addPackageSeed(resources, rootKey === "data" ? "pages" : "pageTemplates", "source", {
    [rootKey]: desiredRoot,
  });
  const error = expectReferenceGraphCode(
    () => buildReferencePlan(packageWithResources(resources)),
    "site_package_ref_bad_path"
  );
  expect(error.diagnostics.map(({ reason }) => reason)).toEqual([
    "page_tree_depth_exceeded",
    "page_slot_children_exceeded",
    "page_tree_depth_exceeded",
    "page_slot_children_exceeded",
    "package_ref_path_forbidden",
  ]);
  const serialized = JSON.stringify(error);
  for (const sentinel of [
    "zeta-private",
    "safe-private",
    "alpha-private",
    "blocked-zeta",
    "blocked-alpha",
    "blocked-ten",
    "blocked-two",
  ]) {
    expect(serialized).not.toContain(sentinel);
  }
};

describe("full-site package reference diagnostics and limits", () => {
  it("gives JSON depth 65 precedence over duplicate identity at typed boundaries", () => {
    const exactResources = emptyFullSitePackageResources();
    addPackageSeed(exactResources, "pages", "source", nestedValue(64));
    expect(() => buildReferencePlan(packageWithResources(exactResources))).not.toThrow();

    const overResources = emptyFullSitePackageResources();
    addPackageSeed(overResources, "pages", "same", nestedValue(65));
    addPackageSeed(overResources, "pages", "same", { data: { sections: [] } });
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(packageWithResources(overResources)),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([{ path: "$.resources", reason: "json_depth_exceeded" }]);
  });

  it("uses fixed top-level priority while retaining mixed discovery order", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "contentTypes", "one", { slug: "shared" });
    addPackageSeed(resources, "contentTypes", "two", { slug: "shared" });
    addPackageSeed(resources, "entries", "entry", {
      contentTypeId: packageRef("content_type", "absent-target-sentinel"),
    });
    addPackageSeed(resources, "pages", "page", {
      data: { sections: [] },
      arbitrary: packageRef("page", "forbidden-target-sentinel"),
    });
    addPackageSeed(resources, "settings", "site.contentRoutes", {
      value: [{ type: "shared", detailPageId: null }],
    });
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(packageWithResources(resources)),
      "site_package_ref_bad_path"
    );
    expect(error.diagnostics.map(({ reason }) => reason)).toEqual([
      "package_ref_target_missing",
      "content_route_content_type_ambiguous",
      "package_ref_path_forbidden",
    ]);
    const serialized = JSON.stringify(error);
    expect(serialized).not.toContain("absent-target-sentinel");
    expect(serialized).not.toContain("forbidden-target-sentinel");
    expect(serialized).not.toContain("shared");
  });

  it("keeps 100 semantic findings and replaces them on the 101st attempt", () => {
    const exact = expectReferenceGraphCode(
      () => buildReferencePlan(genericBadPathPackage(100)),
      "site_package_ref_bad_path"
    );
    expect(exact.diagnostics).toHaveLength(100);
    expect(exact.diagnostics.every(({ reason }) => reason === "package_ref_path_forbidden")).toBe(
      true
    );

    const over = expectReferenceGraphCode(
      () => buildReferencePlan(genericBadPathPackage(101)),
      "site_package_too_complex"
    );
    expect(over.diagnostics).toEqual([
      { path: "$.resources", reason: "diagnostic_limit_exceeded" },
    ]);
  });

  it("applies the same 100/101 collector boundary to duplicate identities", () => {
    const build = (duplicates: number): FullSitePackageResources => {
      const resources = emptyFullSitePackageResources();
      resources.pages = Array.from({ length: duplicates + 1 }, () => ({
        key: "same",
        desired: { data: { sections: [] } },
      }));
      return resources;
    };
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(build(100))),
        "site_package_ref_duplicate"
      ).diagnostics
    ).toHaveLength(100);
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(packageWithResources(build(101))),
        "site_package_too_complex"
      ).diagnostics
    ).toEqual([{ path: "$.resources", reason: "diagnostic_limit_exceeded" }]);
  });

  it("accepts 4096 occurrence edges and rejects 4097 with the static singleton", () => {
    const exactPlan = buildReferencePlan(menuEdgePackage(4_096));
    const menu = exactPlan.find(({ kind }) => kind === "menu");
    expect(menu?.references).toHaveLength(4_096);
    expect(menu?.dependencies).toEqual(["page:target"]);

    const error = expectReferenceGraphCode(
      () => buildReferencePlan(menuEdgePackage(4_097)),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.resources", reason: "reference_edges_exceeded" },
    ]);
  });

  it("finalizes diagnostic overflow before edges, then edges before semantic findings", () => {
    const badPlusEdges = menuEdgePackage(4_097, {
      arbitrary: packageRef("page", "forbidden-sentinel"),
    });
    expect(
      expectReferenceGraphCode(() => buildReferencePlan(badPlusEdges), "site_package_too_complex")
        .diagnostics
    ).toEqual([{ path: "$.resources", reason: "reference_edges_exceeded" }]);

    const manyBadPlusEdges = menuEdgePackage(4_097, {
      arbitrary: Array.from({ length: 101 }, (_, index) => ({
        ref: "page",
        key: `forbidden-${index}`,
      })),
    });
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(manyBadPlusEdges),
        "site_package_too_complex"
      ).diagnostics
    ).toEqual([{ path: "$.resources", reason: "diagnostic_limit_exceeded" }]);
  });

  it("does not confuse 4097 forbidden occurrences with accepted edges", () => {
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(genericBadPathPackage(4_097)),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.resources", reason: "diagnostic_limit_exceeded" },
    ]);
  });

  it("qualifies authority by global source ordinal while retaining local indexes", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "forms", "form", {});
    addPackageSeed(resources, "pageTemplates", "template", {
      document: { sections: [] },
      data: {
        sections: [
          {
            blocks: [{ type: "form", props: { formId: packageRef("form", "form") } }],
          },
        ],
      },
    });
    addPackageSeed(resources, "pages", "page", {
      data: {
        sections: [
          {
            blocks: [{ type: "form", props: { formId: packageRef("form", "form") } }],
          },
        ],
      },
    });
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(packageWithResources(resources)),
      "site_package_ref_bad_path"
    );
    expect(error.diagnostics).toEqual([
      {
        path: "$.resources.pageTemplates[0].desired.data.sections[0].blocks[0].props.formId",
        reason: "package_ref_path_forbidden",
      },
    ]);
  });

  it("orders and isolates malformed Page sibling prefixes for Page", () => {
    assertMalformedSiblingOrdering("data");
  });

  it("orders and isolates malformed Page sibling prefixes for Page Template", () => {
    assertMalformedSiblingOrdering("document");
  });
});
