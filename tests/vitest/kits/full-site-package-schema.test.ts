import { describe, expect, it } from "vitest";

import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import {
  assertPackageByteSize,
  createDiagnosticCollector,
} from "../../../core/services/kits/fullSitePackage/schema";
import {
  FULL_SITE_PACKAGE_SETTING_KEYS,
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  type FullSitePackageDiagnostic,
  type JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";
import {
  expectFullSitePackageCode,
  validFullSitePackage,
  validVisualResidual,
} from "./fullSitePackageTestSupport";

const nestedObject = (level: number): JsonObject => {
  let value: JsonObject = {};
  for (let depth = 1; depth < level; depth += 1) value = { nested: value };
  return value;
};

describe("full-site package schema and limits", () => {
  it("accepts all ten strict seed envelopes and canonicalizes collection order", () => {
    const input = validFullSitePackage();
    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      const keys =
        collection === "settings"
          ? ["site.name", "site.locale"]
          : [`${collection.toLowerCase()}-z`, `${collection.toLowerCase()}-a`];
      input.resources[collection].push(
        { key: keys[0], desired: { z: true } },
        { key: keys[1], desired: { a: true } }
      );
    }

    const normalized = normalizeFullSitePackageForWrite(input);

    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      expect(normalized.resources[collection].map(({ key }) => key)).toEqual(
        collection === "settings"
          ? ["site.locale", "site.name"]
          : [`${collection.toLowerCase()}-a`, `${collection.toLowerCase()}-z`]
      );
      expect(Object.keys(normalized.resources[collection][0])).toEqual(["key", "desired"]);
    }
  });

  it("rejects unknown keys at every package-owned envelope and database IDs", () => {
    const cases: unknown[] = [
      { ...validFullSitePackage(), extra: true },
      {
        ...validFullSitePackage(),
        metadata: { name: "Name", locale: "en", extra: true },
      },
      {
        ...validFullSitePackage(),
        resources: { ...validFullSitePackage().resources, extra: [] },
      },
      {
        ...validFullSitePackage(),
        resources: {
          ...validFullSitePackage().resources,
          pages: [{ key: "home", desired: {}, id: "database-id" }],
        },
      },
      {
        ...validFullSitePackage(),
        compatibility: { unresolvedVisuals: [], extra: true },
      },
      {
        ...validFullSitePackage(),
        verification: { scenarioIds: [], extra: true },
      },
    ];
    for (const value of cases) {
      expectFullSitePackageCode(
        () => normalizeFullSitePackageForWrite(value),
        "site_package_invalid"
      );
    }
  });

  it("uses the canonical grammar without trimming package, resource, or scenario identities", () => {
    for (const key of ["a", "a.b_c-d", `a${"x".repeat(126)}z`]) {
      const input = validFullSitePackage();
      input.key = key;
      input.resources.pages.push({ key, desired: {} });
      input.verification = { scenarioIds: [key] };
      expect(() => normalizeFullSitePackageForWrite(input)).not.toThrow();
    }
    for (const key of [" A", "a ", "Upper", "a/b", `a${"x".repeat(127)}z`]) {
      const input = validFullSitePackage();
      input.key = key;
      expectFullSitePackageCode(
        () => normalizeFullSitePackageForWrite(input),
        "site_package_invalid"
      );
    }
  });

  it("admits only the seven exact setting keys without applying the package-key grammar", () => {
    const input = validFullSitePackage();
    input.resources.settings = FULL_SITE_PACKAGE_SETTING_KEYS.map((key) => ({
      key,
      desired: { value: null },
    }));
    expect(
      normalizeFullSitePackageForWrite(input).resources.settings.map(({ key }) => key)
    ).toEqual([...FULL_SITE_PACKAGE_SETTING_KEYS].sort());

    for (const key of ["site.name ", "site.unknown", "Site.name", "auth.providerKey"]) {
      const invalid = validFullSitePackage();
      invalid.resources.settings.push({ key, desired: { value: "sentinel-value" } });
      const error = expectFullSitePackageCode(
        () => normalizeFullSitePackageForWrite(invalid),
        "site_package_setting_forbidden"
      );
      expect(JSON.stringify(error)).not.toContain(key);
      expect(JSON.stringify(error)).not.toContain("sentinel-value");
    }
  });

  it("accepts exact resource and serialized-byte limits and rejects one over", () => {
    const exactCollection = validFullSitePackage();
    exactCollection.resources.pages = Array.from(
      { length: PACKAGE_LIMITS.resourcesPerCollection },
      (_, index) => ({ key: `page-${index}`, desired: {} })
    );
    expect(normalizeFullSitePackageForWrite(exactCollection).resources.pages).toHaveLength(256);

    const overCollection = validFullSitePackage();
    overCollection.resources.pages = Array.from(
      { length: PACKAGE_LIMITS.resourcesPerCollection + 1 },
      (_, index) => ({ key: `page-${index}`, desired: {} })
    );
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(overCollection),
      "site_package_too_large"
    );

    const total = validFullSitePackage();
    total.resources.pages = exactCollection.resources.pages;
    total.resources.entries = Array.from({ length: 256 }, (_, index) => ({
      key: `entry-${index}`,
      desired: {},
    }));
    expect(() => normalizeFullSitePackageForWrite(total)).not.toThrow();
    total.resources.forms.push({ key: "extra", desired: {} });
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(total),
      "site_package_too_large"
    );

    const exactBytes = "x".repeat(PACKAGE_LIMITS.fileBytes - 2);
    expect(() => assertPackageByteSize(exactBytes)).not.toThrow();
    expectFullSitePackageCode(
      () => assertPackageByteSize(`${exactBytes}x`),
      "site_package_too_large"
    );
  });

  it("rejects sparse package-owned and recursive desired arrays", () => {
    const sparseCollections = validFullSitePackage();
    sparseCollections.resources.pages = new Array(1);
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(sparseCollections),
      "site_package_invalid"
    );

    const sparseDesired = validFullSitePackage();
    sparseDesired.resources.pages.push({ key: "home", desired: { values: new Array(1) } });
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(sparseDesired),
      "site_package_invalid"
    );

    const sparseResiduals = validFullSitePackage();
    sparseResiduals.compatibility = { unresolvedVisuals: new Array(1) };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(sparseResiduals),
      "site_package_invalid"
    );

    const sparseScenarios = validFullSitePackage();
    sparseScenarios.verification = { scenarioIds: new Array(1) };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(sparseScenarios),
      "site_package_invalid"
    );
  });

  it("accepts JSON level 64 and gives level 65 the static singleton", () => {
    const exact = validFullSitePackage();
    exact.resources.pages.push({ key: "home", desired: nestedObject(64) });
    expect(() => normalizeFullSitePackageForWrite(exact)).not.toThrow();

    const over = validFullSitePackage();
    over.resources.pages.push({ key: "home", desired: nestedObject(65) });
    over.resources.pages.push({ key: "home", desired: {} });
    const error = expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(over),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([{ path: "$.resources", reason: "json_depth_exceeded" }]);
  });

  it("keeps verification strict, accepts 100 inputs, and deduplicates by first occurrence", () => {
    const input = validFullSitePackage();
    input.verification = {
      scenarioIds: ["first", "second", "first", ...Array.from({ length: 97 }, (_, i) => `s-${i}`)],
    };
    const normalized = normalizeFullSitePackageForWrite(input);
    expect(normalized.verification?.scenarioIds.slice(0, 2)).toEqual(["first", "second"]);
    expect(normalized.verification?.scenarioIds).toHaveLength(99);

    const over = validFullSitePackage();
    over.verification = {
      scenarioIds: Array.from({ length: 101 }, (_, index) => `scenario-${index}`),
    };
    const error = expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(over),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toEqual([
      { path: "$.verification.scenarioIds", reason: "scenario_count_exceeded" },
    ]);
  });

  it("uses one bounded collector with the 101st-attempt replacement singleton", () => {
    const collector = createDiagnosticCollector<FullSitePackageDiagnostic>();
    for (let index = 0; index < 100; index += 1) {
      collector.add({ path: `$.trusted[${index}]`, reason: "test" });
    }
    expect(collector.read()).toMatchObject({ overflowed: false });
    expect(collector.read().diagnostics).toHaveLength(100);
    collector.add({ path: "$.trusted[100]", reason: "test" });
    expect(collector.read()).toEqual({
      overflowed: true,
      diagnostics: [{ path: "$.resources", reason: "diagnostic_limit_exceeded" }],
    });
    collector.add({ path: "$.trusted[101]", reason: "test" });
    expect(collector.read().diagnostics).toHaveLength(1);
  });

  it("does not count ref-shaped values at the structural boundary", () => {
    const input = validFullSitePackage();
    input.resources.pages.push({
      key: "home",
      desired: {
        arbitrary: Array.from({ length: PACKAGE_LIMITS.referenceEdges + 1 }, (_, index) => ({
          ref: "page",
          key: `page-${index}`,
        })),
      },
    });
    expect(() => normalizeFullSitePackageForWrite(input)).not.toThrow();
    expect(PACKAGE_LIMITS.referenceEdges).toBe(4_096);
  });

  it("accepts complete residuals while rejecting missing fields and non-false impact", () => {
    const input = validFullSitePackage();
    input.compatibility = { unresolvedVisuals: [validVisualResidual()] };
    expect(normalizeFullSitePackageForWrite(input).compatibility).toEqual(input.compatibility);

    const incomplete = validFullSitePackage();
    incomplete.compatibility = { unresolvedVisuals: ["residual"] as never };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(incomplete),
      "site_package_invalid"
    );

    const unsafe = validFullSitePackage();
    unsafe.compatibility = {
      unresolvedVisuals: [
        {
          ...validVisualResidual(),
          impact: { ...validVisualResidual().impact, accessibility: true },
        } as never,
      ],
    };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(unsafe),
      "site_package_invalid"
    );
  });
});
