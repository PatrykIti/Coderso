import { describe, expect, it } from "vitest";

import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import { assertPackageByteSize } from "../../../core/services/kits/fullSitePackage/schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  FullSitePackageError,
  type FullSitePackageV1,
  type FullSitePackageResources,
  type JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";

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

const validPackage = (): FullSitePackageV1 => ({
  schemaVersion: 1,
  key: "formadom-studio",
  metadata: {
    name: "FormaDom Studio",
    locale: "pl-PL",
    description: "Reference package",
  },
  resources: emptyResources(),
});

const expectCode = (callback: () => unknown, code: string) => {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(FullSitePackageError);
    expect((error as FullSitePackageError).code).toBe(code);
    return error as FullSitePackageError;
  }
  throw new Error(`Expected ${code}`);
};

describe("full-site package schema", () => {
  it("normalizes every strict resource envelope and sorts collections by key", () => {
    const input = validPackage();
    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      const prefix = collection.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
      const keys =
        collection === "settings" ? ["site.locale", "site.name"] : [`${prefix}-z`, `${prefix}-a`];
      input.resources[collection].push(
        { key: keys[0], desired: { nested: { value: true } } },
        { key: keys[1], desired: { status: "published" } }
      );
    }

    const normalized = normalizeFullSitePackageForWrite(input);

    for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
      const prefix = collection.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
      const expectedKeys =
        collection === "settings" ? ["site.locale", "site.name"] : [`${prefix}-z`, `${prefix}-a`];
      expect(normalized.resources[collection].map((seed) => seed.key)).toEqual([
        ...expectedKeys.sort(),
      ]);
      expect(Object.keys(normalized.resources[collection][0] ?? {})).toEqual(["key", "desired"]);
    }
  });

  it("rejects unknown root, metadata, resource, seed, compatibility and impact keys", () => {
    const cases = [
      () => ({ ...validPackage(), unexpected: true }),
      () => ({ ...validPackage(), metadata: { name: "Name", locale: "pl", extra: true } }),
      () => ({ ...validPackage(), resources: { ...emptyResources(), extra: [] } }),
      () => ({
        ...validPackage(),
        resources: {
          ...emptyResources(),
          pages: [{ key: "home", desired: {}, id: "00000000-0000-4000-8000-000000000000" }],
        },
      }),
      () => ({
        ...validPackage(),
        compatibility: { unresolvedVisuals: [], extra: true },
      }),
      () => ({
        ...validPackage(),
        compatibility: {
          unresolvedVisuals: [
            {
              ...validResidual(),
              impact: { ...validResidual().impact, extra: false },
            },
          ],
        },
      }),
    ];

    for (const build of cases) {
      expectCode(() => normalizeFullSitePackageForWrite(build()), "site_package_invalid");
    }
  });

  it("rejects prototype-sensitive parsed JSON keys before ref-like objects can bypass scans", () => {
    for (const key of ["__proto__", "prototype", "constructor"] as const) {
      const desired = JSON.parse(`{"${key}":{"ref":"page","key":"target"}}`) as JsonObject;
      expect(Object.prototype.hasOwnProperty.call(desired, key)).toBe(true);
      const input = validPackage();
      input.resources.pages.push({ key: "home", desired });

      const error = expectCode(
        () => normalizeFullSitePackageForWrite(input),
        "site_package_invalid"
      );
      expect(error.diagnostics).toContainEqual({
        path: `_.resources.pages[0].desired.${key}`,
        reason: "prototype_key_forbidden",
      });
    }
  });

  it("rejects database IDs and missing desired snapshots in seed envelopes", () => {
    const withId = validPackage();
    withId.resources.pages.push({
      key: "home",
      desired: {},
      id: "de305d54-75b4-431b-adb2-eb6b9e546014",
    } as never);
    expectCode(() => normalizeFullSitePackageForWrite(withId), "site_package_invalid");

    const withoutDesired = validPackage();
    withoutDesired.resources.pages.push({ key: "home" } as never);
    expectCode(() => normalizeFullSitePackageForWrite(withoutDesired), "site_package_invalid");
  });

  it("accepts exact resource limits and rejects one over each count limit", () => {
    const exactCollection = validPackage();
    exactCollection.resources.pages = Array.from(
      { length: PACKAGE_LIMITS.resourcesPerCollection },
      (_, index) => ({ key: `page-${index}`, desired: {} })
    );
    expect(normalizeFullSitePackageForWrite(exactCollection).resources.pages).toHaveLength(256);

    const overCollection = validPackage();
    overCollection.resources.pages = Array.from(
      { length: PACKAGE_LIMITS.resourcesPerCollection + 1 },
      (_, index) => ({ key: `page-${index}`, desired: {} })
    );
    expectCode(() => normalizeFullSitePackageForWrite(overCollection), "site_package_too_large");

    const exactTotal = validPackage();
    exactTotal.resources.pages = Array.from({ length: 256 }, (_, index) => ({
      key: `page-${index}`,
      desired: {},
    }));
    exactTotal.resources.entries = Array.from({ length: 256 }, (_, index) => ({
      key: `entry-${index}`,
      desired: {},
    }));
    expect(normalizeFullSitePackageForWrite(exactTotal).resources.entries).toHaveLength(256);

    const overTotal = validPackage();
    overTotal.resources.pages = exactTotal.resources.pages;
    overTotal.resources.entries = exactTotal.resources.entries;
    overTotal.resources.forms = [{ key: "extra", desired: {} }];
    expectCode(() => normalizeFullSitePackageForWrite(overTotal), "site_package_too_large");
  });

  it("enforces the exact serialized byte cap", () => {
    const JSON_STRING_OVERHEAD = 2;
    const exact = "x".repeat(PACKAGE_LIMITS.fileBytes - JSON_STRING_OVERHEAD);
    expect(() => assertPackageByteSize(exact)).not.toThrow();
    expectCode(() => assertPackageByteSize(`${exact}x`), "site_package_too_large");
  });

  it("accepts depth 64 and rejects depth 65", () => {
    const buildNested = (depth: number): JsonObject => {
      let value: JsonObject = {};
      for (let index = 1; index < depth; index += 1) value = { nested: value };
      return value;
    };
    const exact = validPackage();
    exact.resources.pages.push({ key: "home", desired: buildNested(64) });
    expect(() => normalizeFullSitePackageForWrite(exact)).not.toThrow();

    const over = validPackage();
    over.resources.pages.push({ key: "home", desired: buildNested(65) });
    expectCode(() => normalizeFullSitePackageForWrite(over), "site_package_too_complex");
  });

  it("accepts 4096 reference-shaped edges and rejects 4097", () => {
    const build = (count: number) => {
      const input = validPackage();
      input.resources.pages.push({
        key: "home",
        desired: {
          refs: Array.from({ length: count }, (_, index) => ({
            ref: "page",
            key: `page-${index}`,
          })),
        },
      });
      return input;
    };
    expect(() => normalizeFullSitePackageForWrite(build(4_096))).not.toThrow();
    expectCode(() => normalizeFullSitePackageForWrite(build(4_097)), "site_package_too_complex");
  });

  it("bounds diagnostics to 100 and reports overflow as complexity", () => {
    const input = validPackage() as Record<string, unknown>;
    for (let index = 0; index < PACKAGE_LIMITS.diagnostics + 1; index += 1) {
      input[`unknown-${index}`] = true;
    }
    const error = expectCode(
      () => normalizeFullSitePackageForWrite(input),
      "site_package_too_complex"
    );
    expect(error.diagnostics).toHaveLength(PACKAGE_LIMITS.diagnostics);
  });

  it("rejects forbidden settings, secret fields, credential URLs, base64 and binary data", () => {
    const forbiddenSetting = validPackage();
    forbiddenSetting.resources.settings.push({ key: "auth.providerKey", desired: {} });
    expectCode(
      () => normalizeFullSitePackageForWrite(forbiddenSetting),
      "site_package_setting_forbidden"
    );

    for (const desired of [
      { providerKey: "value" },
      { url: "https://user:password@example.test/path" },
      { bytes: "QUJD".repeat(32) },
      { bytes: new Uint8Array([1, 2, 3]) },
    ]) {
      const input = validPackage();
      input.resources.pages.push({ key: "home", desired } as never);
      expectCode(() => normalizeFullSitePackageForWrite(input), "site_package_invalid");
    }
  });

  it("accepts complete visual residuals and rejects incomplete or unsafe residuals", () => {
    const valid = validPackage();
    valid.compatibility = { unresolvedVisuals: [validResidual()] };
    expect(normalizeFullSitePackageForWrite(valid).compatibility).toEqual({
      unresolvedVisuals: [validResidual()],
    });

    const bareCode = validPackage();
    bareCode.compatibility = { unresolvedVisuals: ["favicon-not-installed"] as never };
    expectCode(() => normalizeFullSitePackageForWrite(bareCode), "site_package_invalid");

    const unsafe = validPackage();
    unsafe.compatibility = {
      unresolvedVisuals: [
        {
          ...validResidual(),
          impact: { ...validResidual().impact, accessibility: true },
        } as never,
      ],
    };
    expectCode(() => normalizeFullSitePackageForWrite(unsafe), "site_package_invalid");
  });

  it("canonicalizes complete desired snapshots and is idempotent", () => {
    const input = validPackage();
    input.resources.pages.push({
      key: "home",
      desired: {
        z: 1,
        children: [{ z: "last", a: "first" }],
        a: { z: false, a: true },
        status: "published",
      },
    });
    input.verification = { scenarioIds: ["mobile-navigation", "home-desktop-effects"] };

    const first = normalizeFullSitePackageForWrite(input);
    const second = normalizeFullSitePackageForWrite(first);

    expect(second).toEqual(first);
    expect(first.verification?.scenarioIds).toEqual(["mobile-navigation", "home-desktop-effects"]);
    expect(Object.keys(first.resources.pages[0]?.desired ?? {})).toEqual([
      "a",
      "children",
      "status",
      "z",
    ]);
    expect(first.resources.pages[0]?.desired.children).toEqual([{ a: "first", z: "last" }]);
  });
});

const validResidual = () => ({
  id: "favicon-not-installed",
  prototypeEvidence: "Prototype contains a favicon.",
  cmsConstraint: "The package has no media resource kind.",
  installedApproximation: "The existing favicon remains.",
  userVisibleDifference: "Brand favicon is not installed.",
  impact: {
    functional: false as const,
    accessibility: false as const,
    data: false as const,
    security: false as const,
    testIntegrity: false as const,
  },
  postInstallRemediation: "Upload the approved favicon through the media library.",
});
