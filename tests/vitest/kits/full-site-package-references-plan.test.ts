import { describe, expect, it } from "vitest";

import {
  buildReferencePlan,
  finalizeAndSortReferenceGraph,
  resolvePlannedPackageResourceRefs,
  stableTopologicalSort,
  type PackageReferenceEdge,
  type PackageResourceIdentity,
  type PlannedPackageResource,
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
  linearDependencyGraph,
  packageRef,
  packageWithResources,
} from "./fullSitePackageReferenceTestSupport";

const mutateFrozen = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Strict-module writes to frozen plan snapshots are expected to throw.
  }
};

const findResource = (
  plan: readonly PlannedPackageResource[],
  identity: PackageResourceIdentity
): PlannedPackageResource => {
  const resource = plan.find((candidate) => candidate.identity === identity);
  if (!resource) throw new Error(`Missing ${identity}`);
  return resource;
};

describe("full-site package frozen reference plan", () => {
  it("pins exact plan keys, global ordinals and local collection indexes", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "contentTypes", "content", { slug: "content" });
    addPackageSeed(resources, "pages", "first", { data: { sections: [] } });
    addPackageSeed(resources, "pages", "second", { data: { sections: [] } });
    addPackageSeed(resources, "menus", "menu", {
      items: [{ pageId: packageRef("page", "first") }],
    });
    const plan = buildReferencePlan(packageWithResources(resources));
    const content = findResource(plan, "content_type:content");
    const first = findResource(plan, "page:first");
    const second = findResource(plan, "page:second");
    const menu = findResource(plan, "menu:menu");

    expect(Object.keys(menu)).toEqual([
      "identity",
      "kind",
      "collection",
      "key",
      "ordinal",
      "collectionIndex",
      "seed",
      "dependencies",
      "references",
    ]);
    expect(content.collectionIndex).toBe(0);
    expect(first.collectionIndex).toBe(0);
    expect(second.collectionIndex).toBe(1);
    expect(menu.collectionIndex).toBe(0);
    expect(new Set([content.ordinal, first.ordinal, second.ordinal, menu.ordinal]).size).toBe(4);
  });

  it("preserves occurrence descriptors while deduplicating and code-unit-sorting dependencies", () => {
    const resources = emptyFullSitePackageResources();
    for (const key of ["aa", "a_a", "a.a", "a-a"]) {
      addPackageSeed(resources, "pages", key, { data: { sections: [] } });
    }
    addPackageSeed(resources, "menus", "menu", {
      items: [
        { pageId: packageRef("page", "aa") },
        { pageId: packageRef("page", "a_a") },
        { pageId: packageRef("page", "a.a") },
        { pageId: packageRef("page", "a-a") },
        { pageId: packageRef("page", "aa") },
      ],
    });
    const menu = findResource(buildReferencePlan(packageWithResources(resources)), "menu:menu");
    expect(menu.references).toHaveLength(5);
    expect(menu.references.map(({ path }) => path)).toEqual([
      ["items", 0, "pageId"],
      ["items", 1, "pageId"],
      ["items", 2, "pageId"],
      ["items", 3, "pageId"],
      ["items", 4, "pageId"],
    ]);
    expect(menu.dependencies).toEqual(["page:a-a", "page:a.a", "page:a_a", "page:aa"]);
  });

  it("deep-clones and freezes the entire plan without retaining package mutations", () => {
    const pkg = completeReferencePackage();
    const plan = buildReferencePlan(pkg);
    const projects = findResource(plan, "page:projects");
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(projects)).toBe(true);
    expect(Object.isFrozen(projects.seed)).toBe(true);
    expect(Object.isFrozen(projects.seed.desired)).toBe(true);
    expect(Object.isFrozen(projects.dependencies)).toBe(true);
    expect(Object.isFrozen(projects.references)).toBe(true);
    expect(Object.isFrozen(projects.references[0].path)).toBe(true);
    const frozenStatus = projects.seed.desired.status;
    pkg.resources.pages.find(({ key }) => key === "projects")!.desired.status = "mutated";
    expect(projects.seed.desired.status).toBe(frozenStatus);

    const originalIdentity = projects.identity;
    mutateFrozen(() => ((projects as unknown as { identity: string }).identity = "page:mutated"));
    mutateFrozen(() => ((projects.dependencies as unknown as string[])[0] = "page:mutated"));
    mutateFrozen(() => ((projects.references[0].path as unknown as string[])[0] = "mutated"));
    expect(projects.identity).toBe(originalIdentity);
    expect(projects.dependencies).not.toContain("page:mutated");
    expect(projects.references[0].path[0]).not.toBe("mutated");
  });

  it("resolves only frozen descriptors and leaves unrelated ref-shaped content untouched", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "pages", "target", { data: { sections: [] } });
    addPackageSeed(resources, "menus", "menu", {
      items: [{ pageId: packageRef("page", "target") }],
    });
    const menu = findResource(buildReferencePlan(packageWithResources(resources)), "menu:menu");
    const forged = {
      ...menu,
      seed: {
        ...menu.seed,
        desired: {
          ...menu.seed.desired,
          arbitrary: { ref: "page", key: "unrecorded" },
        },
      },
    } as PlannedPackageResource;
    const resolved = resolvePlannedPackageResourceRefs(
      forged,
      new Map([["page:target", "native-page-id"]])
    );
    expect(resolved).toEqual({
      arbitrary: { ref: "page", key: "unrecorded" },
      items: [{ pageId: "native-page-id" }],
    });
    expect(menu.seed.desired).toEqual({
      items: [{ pageId: { ref: "page", key: "target" } }],
    });
  });

  it("fails closed on a missing resolved ID and descriptor/source drift", () => {
    const resources = emptyFullSitePackageResources();
    addPackageSeed(resources, "pages", "target", { data: { sections: [] } });
    addPackageSeed(resources, "menus", "menu", {
      items: [{ pageId: packageRef("page", "target") }],
    });
    const menu = findResource(buildReferencePlan(packageWithResources(resources)), "menu:menu");
    const missing = expectReferenceGraphCode(
      () => resolvePlannedPackageResourceRefs(menu, new Map()),
      "site_package_ref_missing"
    );
    expect(missing.diagnostics).toEqual([
      {
        path: "$.resources.menus[0].desired.items[0].pageId",
        reason: "resolved_target_id_missing",
      },
    ]);

    const drifted = {
      ...menu,
      seed: {
        ...menu.seed,
        desired: { items: [{ pageId: packageRef("page", "different") }] },
      },
    } as PlannedPackageResource;
    const drift = expectReferenceGraphCode(
      () =>
        resolvePlannedPackageResourceRefs(drifted, new Map([["page:target", "native-page-id"]])),
      "site_package_ref_bad_path"
    );
    expect(drift.diagnostics).toEqual([
      {
        path: "$.resources.menus[0].desired.items[0].pageId",
        reason: "planned_reference_drift",
      },
    ]);
    expect(JSON.stringify(drift)).not.toContain("different");
  });

  it("accepts a 64-edge longest path and rejects 65 edges deterministically", () => {
    const exact = linearDependencyGraph(64);
    expect(
      stableTopologicalSort(exact.registry, exact.edges).map(({ identity }) => identity)
    ).toEqual(exact.identities);
    expect(
      stableTopologicalSort(exact.registry, exact.edges).map(({ identity }) => identity)
    ).toEqual(exact.identities);

    const over = linearDependencyGraph(65);
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const error = expectReferenceGraphCode(
        () => stableTopologicalSort(over.registry, over.edges),
        "site_package_too_complex"
      );
      expect(error.diagnostics).toEqual([
        { path: "$.resources", reason: "dependency_depth_exceeded" },
      ]);
    }
  });

  it("reports a cycle before an independent over-depth path", () => {
    const resources = emptyFullSitePackageResources();
    const chainKeys = Array.from({ length: 66 }, (_, index) => `chain-${index}`);
    for (const key of chainKeys)
      addPackageSeed(resources, "pages", key, { data: { sections: [] } });
    addPackageSeed(resources, "pages", "cycle-a", { data: { sections: [] } });
    addPackageSeed(resources, "pages", "cycle-b", { data: { sections: [] } });
    const registry = indexUniqueKindKeys(resources);
    const edges: PackageReferenceEdge[] = chainKeys.slice(1).map((key, index) => ({
      from: toResourceIdentity("page", key),
      to: toResourceIdentity("page", chainKeys[index]),
      path: ["chain", index],
      purpose: "substitute",
    }));
    edges.push(
      {
        from: "page:cycle-a",
        to: "page:cycle-b",
        path: ["cycle", 0],
        purpose: "substitute",
      },
      {
        from: "page:cycle-b",
        to: "page:cycle-a",
        path: ["cycle", 1],
        purpose: "substitute",
      }
    );
    expect(
      expectReferenceGraphCode(
        () => stableTopologicalSort(registry, edges),
        "site_package_ref_cycle"
      ).diagnostics
    ).toEqual([{ path: "$.resources", reason: "reference_cycle" }]);
  });

  it("reports semantic findings before dependency-depth calculation", () => {
    const over = linearDependencyGraph(65);
    const diagnostics = createDiagnosticCollector<TaggedGraphDiagnostic>();
    diagnostics.add({
      code: "site_package_ref_bad_path",
      diagnostic: { path: "$.resources", reason: "package_ref_path_forbidden" },
    });
    const error = expectReferenceGraphCode(
      () => finalizeAndSortReferenceGraph(over.registry, over.edges, diagnostics.read()),
      "site_package_ref_bad_path"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.resources", reason: "package_ref_path_forbidden" },
    ]);
  });

  it("keeps independent builds isolated", () => {
    const first = buildReferencePlan(completeReferencePackage());
    const second = buildReferencePlan(completeReferencePackage());
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
  });
});
