import { describe, expect, it } from "vitest";

import {
  REFERENCE_PATHS,
  buildReferencePlan,
  collectRefsAtAllowedPaths,
  stableTopologicalSort,
  type PackageReferenceEdge,
} from "../../../core/services/kits/fullSitePackage/referenceGraph";
import {
  ReferenceGraphError,
  indexUniqueKindKeys,
  toResourceIdentity,
} from "../../../core/services/kits/fullSitePackage/referenceRegistry";
import {
  PACKAGE_LIMITS,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type PackageRef,
  type PackageResourceCollection,
} from "../../../core/services/kits/fullSitePackage/types";

const ref = (kind: PackageRef["ref"], key: string): PackageRef => ({ ref: kind, key });

const emptyResources = (): FullSitePackageResources => ({
  contentTypes: [],
  forms: [],
  pageTemplates: [],
  listingTemplates: [],
  entries: [],
  listingQueries: [],
  detailPages: [],
  pages: [],
  menus: [],
  settings: [],
});

const packageWith = (resources: FullSitePackageResources): FullSitePackageV1 => ({
  schemaVersion: 1,
  key: "reference-test",
  metadata: { name: "Reference test", locale: "en" },
  resources,
});

const addSeed = (
  resources: FullSitePackageResources,
  collection: PackageResourceCollection,
  key: string,
  desired: JsonObject
) => {
  resources[collection].push({ key, desired });
};

const expectCode = (callback: () => unknown, code: string) => {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(ReferenceGraphError);
    expect((error as ReferenceGraphError).code).toBe(code);
    return error as ReferenceGraphError;
  }
  throw new Error(`Expected ${code}`);
};

const linearDependencyGraph = (length: number) => {
  const resources = emptyResources();
  const keys = Array.from({ length }, (_, index) => `depth-${String(index + 1).padStart(2, "0")}`);
  for (const key of keys) addSeed(resources, "pages", key, {});
  const identities = keys.map((key) => toResourceIdentity("page", key));
  const edges: PackageReferenceEdge[] = identities.slice(1).map((identity, index) => ({
    from: identity,
    to: identities[index]!,
    path: `$.synthetic[${index}]`,
  }));
  return { registry: indexUniqueKindKeys(resources), edges, identities };
};

const completeGraph = (): FullSitePackageV1 => {
  const resources = emptyResources();
  addSeed(resources, "contentTypes", "house-project", {
    slug: "house-project",
    status: "published",
  });
  addSeed(resources, "forms", "project-brief", { status: "published" });
  addSeed(resources, "pageTemplates", "footer", { status: "published" });
  addSeed(resources, "listingTemplates", "project-cards", { name: "Cards" });
  addSeed(resources, "entries", "aurora", {
    contentTypeId: ref("content_type", "house-project"),
    status: "published",
  });
  addSeed(resources, "listingQueries", "published-projects", {
    query: { sourceConfig: { contentTypeId: ref("content_type", "house-project") } },
  });
  addSeed(resources, "detailPages", "project-detail", {
    contentTypeId: ref("content_type", "house-project"),
    related: [
      {
        listingQueryId: ref("listing_query", "published-projects"),
      },
    ],
  });
  addSeed(resources, "pages", "home", {
    document: { sections: [] },
    status: "published",
  });
  addSeed(resources, "pages", "projects", {
    document: {
      settings: {
        collectionLink: {
          contentTypeId: ref("content_type", "house-project"),
          listingQueryId: ref("listing_query", "published-projects"),
          listingTemplateId: ref("listing_template", "project-cards"),
        },
      },
      sections: [
        {
          blocks: [
            {
              props: {
                contentTypeId: ref("content_type", "house-project"),
                queryId: ref("listing_query", "published-projects"),
                templateId: ref("listing_template", "project-cards"),
              },
            },
            { props: { formId: ref("form", "project-brief") } },
          ],
        },
      ],
    },
    status: "published",
  });
  addSeed(resources, "menus", "primary", {
    items: [{ pageId: ref("page", "home") }],
    document: { items: [{ pageId: ref("page", "projects") }] },
  });
  addSeed(resources, "settings", "site.homepageId", {
    value: ref("page", "home"),
  });
  addSeed(resources, "settings", "site.navigationMenuId", {
    value: ref("menu", "primary"),
  });
  addSeed(resources, "settings", "site.footerTemplateId", {
    value: ref("page_template", "footer"),
  });
  addSeed(resources, "settings", "site.contentRoutes", {
    value: [
      {
        type: "house-project",
        route: "/projects/:slug",
        detailPageId: ref("detail_page", "project-detail"),
      },
    ],
  });
  return packageWith(resources);
};

describe("full-site package reference graph", () => {
  it("freezes the complete closed path table", () => {
    expect(REFERENCE_PATHS).toEqual([
      {
        sourceKind: "content_entry",
        segments: ["contentTypeId"],
        targetKind: "content_type",
      },
      {
        sourceKind: "listing_query",
        segments: ["query", "sourceConfig", "contentTypeId"],
        targetKind: "content_type",
      },
      {
        sourceKind: "detail_page",
        segments: ["contentTypeId"],
        targetKind: "content_type",
      },
      {
        sourceKind: "detail_page",
        segments: ["related", "*", "listingQueryId"],
        targetKind: "listing_query",
      },
      {
        sourceKind: "page",
        segments: ["document", "settings", "collectionLink", "contentTypeId"],
        targetKind: "content_type",
      },
      {
        sourceKind: "page",
        segments: ["document", "settings", "collectionLink", "listingQueryId"],
        targetKind: "listing_query",
      },
      {
        sourceKind: "page",
        segments: ["document", "settings", "collectionLink", "listingTemplateId"],
        targetKind: "listing_template",
      },
      {
        sourceKind: "page",
        segments: ["document", "sections", "*", "blocks", "*", "props", "contentTypeId"],
        targetKind: "content_type",
      },
      {
        sourceKind: "page",
        segments: ["document", "sections", "*", "blocks", "*", "props", "queryId"],
        targetKind: "listing_query",
      },
      {
        sourceKind: "page",
        segments: ["document", "sections", "*", "blocks", "*", "props", "templateId"],
        targetKind: "listing_template",
      },
      {
        sourceKind: "page",
        segments: ["document", "sections", "*", "blocks", "*", "props", "formId"],
        targetKind: "form",
      },
      { sourceKind: "menu", segments: ["items", "*", "pageId"], targetKind: "page" },
      {
        sourceKind: "menu",
        segments: ["document", "items", "*", "pageId"],
        targetKind: "page",
      },
      {
        sourceKind: "setting",
        settingKey: "site.homepageId",
        segments: ["value"],
        targetKind: "page",
      },
      {
        sourceKind: "setting",
        settingKey: "site.navigationMenuId",
        segments: ["value"],
        targetKind: "menu",
      },
      {
        sourceKind: "setting",
        settingKey: "site.footerTemplateId",
        segments: ["value"],
        targetKind: "page_template",
      },
      {
        sourceKind: "setting",
        settingKey: "site.contentRoutes",
        segments: ["value", "*", "detailPageId"],
        targetKind: "detail_page",
      },
    ]);
  });

  it("resolves every allowed edge and orders every dependency before its consumer", () => {
    const pkg = completeGraph();
    const registry = indexUniqueKindKeys(pkg.resources);
    const edges = collectRefsAtAllowedPaths(registry);
    const plan = buildReferencePlan(pkg);
    const positions = new Map(plan.map((item, index) => [item.identity, index]));

    expect(edges).toHaveLength(18);
    for (const edge of edges) {
      expect(positions.get(edge.to)).toBeLessThan(positions.get(edge.from) ?? -1);
    }
    expect(plan.map((item) => item.identity)).toEqual(
      buildReferencePlan(pkg).map((item) => item.identity)
    );
  });

  it("rejects duplicate kind/key identities before graph construction", () => {
    const pkg = completeGraph();
    pkg.resources.pages.push({ key: "home", desired: {} });
    expectCode(() => buildReferencePlan(pkg), "site_package_ref_duplicate");
  });

  it("rejects missing and wrong-kind references", () => {
    const missing = completeGraph();
    missing.resources.entries[0].desired.contentTypeId = ref("content_type", "missing");
    expectCode(() => buildReferencePlan(missing), "site_package_ref_missing");

    const wrongKind = completeGraph();
    wrongKind.resources.entries[0].desired.contentTypeId = ref("page", "home");
    expectCode(() => buildReferencePlan(wrongKind), "site_package_ref_bad_path");
  });

  it("rejects arbitrary ref-like objects and unknown setting reference paths", () => {
    const arbitrary = completeGraph();
    arbitrary.resources.pages[0].desired.document = {
      sections: [],
      marketingCopy: { ref: "page", key: "projects" },
    };
    expectCode(() => buildReferencePlan(arbitrary), "site_package_ref_bad_path");

    const dollarRef = completeGraph();
    dollarRef.resources.pages[0].desired.document = {
      sections: [],
      text: { $ref: "page:projects" },
    };
    expectCode(() => buildReferencePlan(dollarRef), "site_package_ref_bad_path");

    const unknownSetting = completeGraph();
    unknownSetting.resources.settings.push({
      key: "design.tokens",
      desired: { value: ref("page", "home") },
    });
    expectCode(() => buildReferencePlan(unknownSetting), "site_package_ref_bad_path");
  });

  it("cross-checks content-route literal slugs and rejects ambiguity", () => {
    const missing = completeGraph();
    const routes = missing.resources.settings.find(
      (setting) => setting.key === "site.contentRoutes"
    );
    if (routes)
      routes.desired.value = [
        { type: "missing", detailPageId: ref("detail_page", "project-detail") },
      ];
    expectCode(() => buildReferencePlan(missing), "site_package_ref_missing");

    const ambiguous = completeGraph();
    ambiguous.resources.contentTypes.push({
      key: "another-project",
      desired: { slug: "house-project", status: "published" },
    });
    expectCode(() => buildReferencePlan(ambiguous), "site_package_ref_ambiguous");
  });

  it("detects cycles in the bounded deterministic sorter", () => {
    const pkg = completeGraph();
    const registry = indexUniqueKindKeys(pkg.resources);
    const edges: PackageReferenceEdge[] = [
      {
        from: toResourceIdentity("page", "home"),
        to: toResourceIdentity("page", "projects"),
        path: "$.synthetic[0]",
      },
      {
        from: toResourceIdentity("page", "projects"),
        to: toResourceIdentity("page", "home"),
        path: "$.synthetic[1]",
      },
    ];
    expectCode(() => stableTopologicalSort(registry, edges), "site_package_ref_cycle");
  });

  it("accepts a 64-edge dependency path deterministically and rejects 65 edges", () => {
    const exact = linearDependencyGraph(PACKAGE_LIMITS.depth + 1);
    const first = stableTopologicalSort(exact.registry, exact.edges);
    const second = stableTopologicalSort(exact.registry, exact.edges);
    expect(first.map((resource) => resource.identity)).toEqual(exact.identities);
    expect(second.map((resource) => resource.identity)).toEqual(exact.identities);

    const over = linearDependencyGraph(PACKAGE_LIMITS.depth + 2);
    const error = expectCode(
      () => stableTopologicalSort(over.registry, over.edges),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.resources", reason: "dependency_depth_exceeded" },
    ]);
  });

  it("enforces exact edge and JSON nesting limits before sorting", () => {
    const exact = completeGraph();
    exact.resources.pages[0].desired.document = {
      sections: [
        {
          blocks: Array.from({ length: PACKAGE_LIMITS.referenceEdges - 18 }, () => ({
            props: { formId: ref("form", "project-brief") },
          })),
        },
      ],
    };
    expect(collectRefsAtAllowedPaths(indexUniqueKindKeys(exact.resources))).toHaveLength(
      PACKAGE_LIMITS.referenceEdges
    );

    const over = completeGraph();
    over.resources.pages[0].desired.document = {
      sections: [
        {
          blocks: Array.from({ length: PACKAGE_LIMITS.referenceEdges - 17 }, () => ({
            props: { formId: ref("form", "project-brief") },
          })),
        },
      ],
    };
    expectCode(
      () => collectRefsAtAllowedPaths(indexUniqueKindKeys(over.resources)),
      "site_package_too_complex"
    );

    let nested: JsonObject = { ref: "page", key: "home" };
    for (let index = 0; index < PACKAGE_LIMITS.depth; index += 1) nested = { nested };
    const deep = completeGraph();
    deep.resources.pages[0].desired = nested;
    expectCode(() => buildReferencePlan(deep), "site_package_too_complex");
  });

  it("bounds bad-path diagnostics at 100", () => {
    const pkg = completeGraph();
    pkg.resources.pages[0].desired.document = {
      sections: [],
      arbitrary: Array.from({ length: PACKAGE_LIMITS.diagnostics + 1 }, (_, index) => ({
        ref: "page",
        key: `page-${index}`,
      })),
    };
    const error = expectCode(() => buildReferencePlan(pkg), "site_package_too_complex");
    expect(error.diagnostics).toHaveLength(PACKAGE_LIMITS.diagnostics);
  });
});
