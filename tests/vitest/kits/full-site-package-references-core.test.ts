import { describe, expect, it } from "vitest";

import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import {
  REFERENCE_PATHS,
  buildReferencePlan,
  collectRefsAtAllowedPaths,
  finalizeAndSortReferenceGraph,
  resolvePlannedPackageResourceRefs,
  stableTopologicalSort,
  type PackageReferenceEdge,
  type TaggedGraphDiagnostic,
} from "../../../core/services/kits/fullSitePackage/referenceGraph";
import {
  indexUniqueKindKeys,
  toResourceIdentity,
} from "../../../core/services/kits/fullSitePackage/referenceRegistry";
import { createDiagnosticCollector } from "../../../core/services/kits/fullSitePackage/schema";
import { emptyFullSitePackageResources } from "./fullSitePackageTestSupport";
import {
  addPackageSeed,
  completeReferencePackage,
  expectReferenceGraphCode,
  packageRef,
  packageWithResources,
} from "./fullSitePackageReferenceTestSupport";

describe("full-site package fixed reference registry", () => {
  it("exports one recursively frozen non-Page path table without the menu document row", () => {
    expect(REFERENCE_PATHS).toEqual([
      { sourceKind: "content_entry", segments: ["contentTypeId"], targetKind: "content_type" },
      {
        sourceKind: "listing_query",
        segments: ["query", "sourceConfig", "contentTypeId"],
        targetKind: "content_type",
      },
      { sourceKind: "detail_page", segments: ["contentTypeId"], targetKind: "content_type" },
      {
        sourceKind: "detail_page",
        segments: ["related", "*", "listingQueryId"],
        targetKind: "listing_query",
      },
      { sourceKind: "menu", segments: ["items", "*", "pageId"], targetKind: "page" },
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
    expect(Object.isFrozen(REFERENCE_PATHS)).toBe(true);
    for (const row of REFERENCE_PATHS) {
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.isFrozen(row.segments)).toBe(true);
    }
    expect(REFERENCE_PATHS.some(({ segments }) => segments.includes("document"))).toBe(false);
  });

  it("resolves every fixed and dynamic occurrence with dependencies first", () => {
    const pkg = completeReferencePackage();
    const registry = indexUniqueKindKeys(pkg.resources);
    const edges = collectRefsAtAllowedPaths(registry);
    const plan = buildReferencePlan(pkg);
    const positions = new Map(plan.map((resource, index) => [resource.identity, index]));

    expect(edges).toHaveLength(17);
    for (const edge of edges) {
      expect(positions.get(edge.to)).toBeLessThan(positions.get(edge.from) ?? -1);
    }
    expect(plan.map(({ identity }) => identity)).toEqual(
      buildReferencePlan(pkg).map(({ identity }) => identity)
    );
  });

  it("enforces required, when-present and nullable presence independently", () => {
    const requiredMissing = completeReferencePackage();
    delete requiredMissing.resources.entries[0].desired.contentTypeId;
    expect(
      expectReferenceGraphCode(
        () => buildReferencePlan(requiredMissing),
        "site_package_ref_bad_path"
      ).diagnostics
    ).toContainEqual({
      path: "$.resources.entries[0].desired.contentTypeId",
      reason: "expected_package_ref",
    });

    const listingAbsent = completeReferencePackage();
    listingAbsent.resources.listingQueries[0].desired = { query: { sourceConfig: {} } };
    expect(() => buildReferencePlan(listingAbsent)).not.toThrow();

    const listingNull = completeReferencePackage();
    listingNull.resources.listingQueries[0].desired.query = {
      sourceConfig: { contentTypeId: null },
    };
    expect(
      expectReferenceGraphCode(() => buildReferencePlan(listingNull), "site_package_ref_bad_path")
        .diagnostics
    ).toContainEqual({
      path: "$.resources.listingQueries[0].desired.query.sourceConfig.contentTypeId",
      reason: "expected_package_ref",
    });

    const nullable = completeReferencePackage();
    nullable.resources.detailPages[0].desired.related = [{}, { listingQueryId: null }];
    nullable.resources.menus[0].desired.items = [{}, { pageId: null }];
    expect(() => buildReferencePlan(nullable)).not.toThrow();
  });

  it("uses exact first-match ref validation and canonical ref-key grammar", () => {
    const cases: Array<{
      value: unknown;
      reason: string;
      code: Parameters<typeof expectReferenceGraphCode>[1];
    }> = [
      { value: "not-ref", reason: "expected_package_ref", code: "site_package_ref_bad_path" },
      {
        value: { ref: "content_type", key: "house-project", extra: true },
        reason: "package_ref_shape_invalid",
        code: "site_package_ref_bad_path",
      },
      {
        value: { ref: "page", key: "Upper Bad" },
        reason: "package_ref_kind_mismatch",
        code: "site_package_ref_bad_path",
      },
      {
        value: { ref: "content_type", key: "Upper Bad" },
        reason: "package_ref_key_invalid",
        code: "site_package_ref_bad_path",
      },
      {
        value: { ref: "content_type", key: "absent-ref-sentinel" },
        reason: "package_ref_target_missing",
        code: "site_package_ref_missing",
      },
    ];
    for (const testCase of cases) {
      const pkg = completeReferencePackage();
      pkg.resources.entries[0].desired.contentTypeId = testCase.value as never;
      const error = expectReferenceGraphCode(() => buildReferencePlan(pkg), testCase.code);
      expect(error.diagnostics[0].reason).toBe(testCase.reason);
      expect(JSON.stringify(error)).not.toContain("Upper Bad");
      expect(JSON.stringify(error)).not.toContain("absent-ref-sentinel");
    }
  });

  it("rejects duplicate identities without echoing either identity", () => {
    const pkg = completeReferencePackage();
    pkg.resources.pages.push({ key: "home", desired: { data: { sections: [] } } });
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(pkg),
      "site_package_ref_duplicate"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.resources.pages", reason: "duplicate_resource_identity" },
    ]);
    expect(JSON.stringify(error)).not.toContain("page:home");
  });

  it("treats menu document items as forbidden while retaining native top-level items", () => {
    const pkg = completeReferencePackage();
    pkg.resources.menus[0].desired.document = {
      items: [{ pageId: packageRef("page", "home") }],
    };
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(pkg),
      "site_package_ref_bad_path"
    );
    expect(error.diagnostics).toContainEqual({
      path: "$.resources.menus[0].desired.document.items[0].pageId",
      reason: "package_ref_path_forbidden",
    });
  });

  it("keeps content-route detail substitution and literal-type validation as distinct edges", () => {
    const pkg = completeReferencePackage();
    const plan = buildReferencePlan(pkg);
    const route = plan.find(({ key }) => key === "site.contentRoutes");
    expect(route?.dependencies).toEqual([
      "content_type:house-project",
      "detail_page:project-detail",
    ]);
    expect(route?.references).toEqual([
      {
        path: ["value", 0, "detailPageId"],
        targetIdentity: "detail_page:project-detail",
      },
    ]);
    if (!route) throw new Error("route resource missing");
    const resolved = resolvePlannedPackageResourceRefs(
      route,
      new Map([["detail_page:project-detail", "detail-native-id"]])
    );
    expect(resolved).toEqual({
      value: [{ type: "house-project", detailPageId: "detail-native-id" }],
    });

    const nullDetail = completeReferencePackage();
    const setting = nullDetail.resources.settings.find(({ key }) => key === "site.contentRoutes");
    if (!setting) throw new Error("route setting missing");
    setting.desired.value = [{ type: "house-project", detailPageId: null }];
    const nullPlan = buildReferencePlan(nullDetail).find(({ key }) => key === "site.contentRoutes");
    expect(nullPlan?.dependencies).toEqual(["content_type:house-project"]);
    expect(nullPlan?.references).toEqual([]);
  });

  it("enforces route/detail content-type agreement only after all prerequisites resolve", () => {
    const mismatch = completeReferencePackage();
    mismatch.resources.contentTypes.push({ key: "other", desired: { slug: "other" } });
    const setting = mismatch.resources.settings.find(({ key }) => key === "site.contentRoutes");
    if (!setting) throw new Error("route setting missing");
    setting.desired.value = [
      { type: "other", detailPageId: packageRef("detail_page", "project-detail") },
    ];
    const error = expectReferenceGraphCode(
      () => buildReferencePlan(mismatch),
      "site_package_ref_bad_path"
    );
    expect(error.diagnostics).toEqual([
      {
        path: "$.resources.settings[3].desired.value[0].detailPageId",
        reason: "content_route_detail_content_type_mismatch",
      },
    ]);
    expect(JSON.stringify(error)).not.toContain("other");
    expect(JSON.stringify(error)).not.toContain("house-project");

    const missingDetail = completeReferencePackage();
    const missingSetting = missingDetail.resources.settings.find(
      ({ key }) => key === "site.contentRoutes"
    );
    if (!missingSetting) throw new Error("route setting missing");
    missingSetting.desired.value = [
      { type: "house-project", detailPageId: packageRef("detail_page", "absent") },
    ];
    const missingError = expectReferenceGraphCode(
      () => buildReferencePlan(missingDetail),
      "site_package_ref_missing"
    );
    expect(missingError.diagnostics.map(({ reason }) => reason)).toEqual([
      "package_ref_target_missing",
    ]);
  });

  it("accumulates missing and ambiguous route literals instead of throwing inline", () => {
    const missing = completeReferencePackage();
    const setting = missing.resources.settings.find(({ key }) => key === "site.contentRoutes");
    if (!setting) throw new Error("route setting missing");
    setting.desired.value = [{ type: "absent", detailPageId: null }];
    expect(
      expectReferenceGraphCode(() => buildReferencePlan(missing), "site_package_ref_missing")
        .diagnostics[0].reason
    ).toBe("content_route_content_type_missing");

    const ambiguous = completeReferencePackage();
    ambiguous.resources.contentTypes.push({ key: "second", desired: { slug: "house-project" } });
    expect(
      expectReferenceGraphCode(() => buildReferencePlan(ambiguous), "site_package_ref_ambiguous")
        .diagnostics[0].reason
    ).toBe("content_route_content_type_ambiguous");
  });

  it("detects cycles statically and gives semantic findings precedence", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "pages", "a", { data: { sections: [] } });
    addPackageSeed(resources, "pages", "b", { data: { sections: [] } });
    const registry = indexUniqueKindKeys(resources);
    const edges: PackageReferenceEdge[] = [
      {
        from: toResourceIdentity("page", "a"),
        to: toResourceIdentity("page", "b"),
        path: ["synthetic", 0],
        purpose: "substitute",
      },
      {
        from: toResourceIdentity("page", "b"),
        to: toResourceIdentity("page", "a"),
        path: ["synthetic", 1],
        purpose: "substitute",
      },
    ];
    expect(
      expectReferenceGraphCode(
        () => stableTopologicalSort(registry, edges),
        "site_package_ref_cycle"
      ).diagnostics
    ).toEqual([{ path: "$.resources", reason: "reference_cycle" }]);

    const collector = createDiagnosticCollector<TaggedGraphDiagnostic>();
    collector.add({
      code: "site_package_ref_missing",
      diagnostic: { path: "$.resources", reason: "package_ref_target_missing" },
    });
    const semantic = expectReferenceGraphCode(
      () => finalizeAndSortReferenceGraph(registry, edges, collector.read()),
      "site_package_ref_missing"
    );
    expect(semantic.diagnostics[0].reason).toBe("package_ref_target_missing");
  });

  it("rejects a normalized bad path before acquiring a lazy dependency", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "pages", "home", {
      data: { sections: [] },
      document: { arbitrary: packageRef("page", "home") },
    });
    let acquired = false;
    const run = (raw: unknown) => {
      const normalized = normalizeFullSitePackageForWrite(raw);
      buildReferencePlan(normalized);
      acquired = true;
    };
    expectReferenceGraphCode(
      () => run(packageWithResources(resources)),
      "site_package_ref_bad_path"
    );
    expect(acquired).toBe(false);
  });
});
