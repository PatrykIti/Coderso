import { describe, expect, it } from "vitest";

import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import {
  compareFullSitePackageObjectKeys,
  compareFullSitePackageText,
} from "../../../core/services/kits/fullSitePackage/schema";
import { PACKAGE_RESOURCE_COLLECTIONS } from "../../../core/services/kits/fullSitePackage/types";
import {
  expectFullSitePackageCode,
  validFullSitePackage,
  validVisualResidual,
} from "./fullSitePackageTestSupport";

describe("full-site package canonicalization", () => {
  it("uses code-unit identity order and the exact ECMAScript array-index boundary", () => {
    expect(["aa", "a_a", "a.a", "a-a"].sort(compareFullSitePackageText)).toEqual([
      "a-a",
      "a.a",
      "a_a",
      "aa",
    ]);
    expect(
      ["text", "4294967295", "01", "4294967294"].sort(compareFullSitePackageObjectKeys)
    ).toEqual(["4294967294", "01", "4294967295", "text"]);
  });

  it("reconstructs free-form objects in canonical key order and preserves array order", () => {
    const input = validFullSitePackage();
    input.resources.pages.push({
      key: "home",
      desired: {
        text: "text",
        "4294967295": "not-index",
        "01": "leading-zero",
        "4294967294": "max-index",
        nested: { z: 1, "10": 10, a: 2, "2": 2, "01": 1 },
        authored: [{ z: "last", a: "first" }, null],
      },
    });

    const desired = normalizeFullSitePackageForWrite(input).resources.pages[0].desired;

    expect(
      JSON.stringify({
        "4294967294": desired["4294967294"],
        "01": desired["01"],
        "4294967295": desired["4294967295"],
        text: desired.text,
      })
    ).toBe('{"4294967294":"max-index","01":"leading-zero","4294967295":"not-index","text":"text"}');
    expect(Object.keys(desired.nested as object)).toEqual(["2", "10", "01", "a", "z"]);
    expect(desired.authored).toEqual([{ a: "first", z: "last" }, null]);
  });

  it("keeps schema-owned root/envelope order and the fixed resource tuple", () => {
    const input = validFullSitePackage();
    input.compatibility = { unresolvedVisuals: [] };
    input.verification = { scenarioIds: ["scenario"] };
    const normalized = normalizeFullSitePackageForWrite(input);

    expect(Object.keys(normalized)).toEqual([
      "schemaVersion",
      "key",
      "metadata",
      "resources",
      "compatibility",
      "verification",
    ]);
    expect(Object.keys(normalized.metadata)).toEqual(["name", "locale", "description"]);
    expect(Object.keys(normalized.resources)).toEqual([...PACKAGE_RESOURCE_COLLECTIONS]);
  });

  it("trims package prose, preserves locale case and desired string bytes", () => {
    const input = validFullSitePackage();
    input.metadata = {
      name: "\u00a0 Name with  interior  spaces \u2003",
      locale: "  zh-Hant-TW  ",
      description: "\n Description \t",
    };
    input.resources.pages.push({
      key: "home",
      desired: { copy: "\u00a0 desired bytes \u2003" },
    });
    input.compatibility = {
      unresolvedVisuals: [
        {
          ...validVisualResidual(),
          prototypeEvidence: "  Evidence  ",
        },
      ],
    };

    const normalized = normalizeFullSitePackageForWrite(input);

    expect(normalized.metadata).toEqual({
      name: "Name with  interior  spaces",
      locale: "zh-Hant-TW",
      description: "Description",
    });
    expect(normalized.resources.pages[0].desired.copy).toBe("\u00a0 desired bytes \u2003");
    expect(normalized.compatibility?.unresolvedVisuals[0].prototypeEvidence).toBe("Evidence");
  });

  it("never trims residual identities and sorts unique residuals by code-unit order", () => {
    const input = validFullSitePackage();
    input.compatibility = {
      unresolvedVisuals: [validVisualResidual("aa"), validVisualResidual("a-a")],
    };
    expect(
      normalizeFullSitePackageForWrite(input).compatibility?.unresolvedVisuals.map(({ id }) => id)
    ).toEqual(["a-a", "aa"]);

    const whitespace = validFullSitePackage();
    whitespace.compatibility = {
      unresolvedVisuals: [validVisualResidual(" residual")],
    };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(whitespace),
      "site_package_invalid"
    );

    const duplicate = validFullSitePackage();
    duplicate.compatibility = {
      unresolvedVisuals: [validVisualResidual("same"), validVisualResidual("same")],
    };
    expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(duplicate),
      "site_package_invalid"
    );
  });

  it("canonicalizes negative zero without changing other finite numbers", () => {
    const input = validFullSitePackage();
    input.resources.pages.push({
      key: "home",
      desired: { negativeZero: -0, values: [-0, 1.25, -2] },
    });
    const desired = normalizeFullSitePackageForWrite(input).resources.pages[0].desired;
    expect(Object.is(desired.negativeZero, -0)).toBe(false);
    expect((desired.values as number[]).map((value) => Object.is(value, -0))).toEqual([
      false,
      false,
      false,
    ]);
    expect(desired.values).toEqual([0, 1.25, -2]);
  });

  it("allows more than 100 valid residuals because 100 bounds diagnostics, not data", () => {
    const input = validFullSitePackage();
    input.compatibility = {
      unresolvedVisuals: Array.from({ length: 101 }, (_, index) =>
        validVisualResidual(`residual-${String(index).padStart(3, "0")}`)
      ),
    };
    expect(normalizeFullSitePackageForWrite(input).compatibility?.unresolvedVisuals).toHaveLength(
      101
    );
  });

  it("is idempotent over complete desired snapshots and optional package shapes", () => {
    const input = validFullSitePackage();
    input.resources.pages.push({
      key: "home",
      desired: {
        z: 1,
        a: { z: false, a: true },
        children: [{ z: "last", a: "first" }],
        status: "published",
      },
    });
    input.compatibility = { unresolvedVisuals: [validVisualResidual()] };
    input.verification = { scenarioIds: ["second", "first", "second"] };

    const first = normalizeFullSitePackageForWrite(input);
    const second = normalizeFullSitePackageForWrite(first);

    expect(second).toEqual(first);
    expect(first.verification?.scenarioIds).toEqual(["second", "first"]);
    expect(first.resources.pages[0].desired).toEqual({
      a: { a: true, z: false },
      children: [{ a: "first", z: "last" }],
      status: "published",
      z: 1,
    });
  });
});
