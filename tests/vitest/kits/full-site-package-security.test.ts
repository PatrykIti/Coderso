import { describe, expect, it } from "vitest";

import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import {
  classifyForbiddenValue,
  isExplicitBinaryCarrier,
  isSensitiveFieldKey,
} from "../../../core/services/kits/fullSitePackage/schema";
import {
  FULL_SITE_PACKAGE_SETTING_KEYS,
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  PACKAGE_RESOURCE_KIND_BY_COLLECTION,
  PACKAGE_RESOURCE_KINDS,
  type FullSitePackageV1,
  type JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";
import {
  expectFullSitePackageCode,
  validFullSitePackage,
  validVisualResidual,
} from "./fullSitePackageTestSupport";

const packageWithDesired = (desired: unknown): FullSitePackageV1 => {
  const input = validFullSitePackage();
  input.resources.pages.push({ key: "home", desired } as never);
  return input;
};

const expectDesiredReason = (desired: unknown, reason: string) => {
  const error = expectFullSitePackageCode(
    () => normalizeFullSitePackageForWrite(packageWithDesired(desired)),
    "site_package_invalid"
  );
  expect(error.diagnostics).toEqual([
    {
      path: "$.resources.pages[0].desired.[redacted]",
      reason,
    },
  ]);
  return error;
};

const mutateFrozen = (callback: () => void): void => {
  try {
    callback();
  } catch {
    // Strict-module mutation failures are the expected runtime behavior.
  }
};

describe("full-site package security policy", () => {
  it("freezes every exported validation authority", () => {
    expect(Object.isFrozen(PACKAGE_RESOURCE_KINDS)).toBe(true);
    expect(Object.isFrozen(PACKAGE_RESOURCE_COLLECTIONS)).toBe(true);
    expect(Object.isFrozen(PACKAGE_RESOURCE_KIND_BY_COLLECTION)).toBe(true);
    expect(Object.isFrozen(PACKAGE_LIMITS)).toBe(true);
    expect(Object.isFrozen(FULL_SITE_PACKAGE_SETTING_KEYS)).toBe(true);

    const originalKind = PACKAGE_RESOURCE_KINDS[0];
    const originalCollection = PACKAGE_RESOURCE_COLLECTIONS[0];
    const originalMapping = PACKAGE_RESOURCE_KIND_BY_COLLECTION.contentTypes;
    const originalLimit = PACKAGE_LIMITS.depth;
    const originalSetting = FULL_SITE_PACKAGE_SETTING_KEYS[0];
    mutateFrozen(() => ((PACKAGE_RESOURCE_KINDS as unknown as string[])[0] = "page"));
    mutateFrozen(() => ((PACKAGE_RESOURCE_COLLECTIONS as unknown as string[])[0] = "pages"));
    mutateFrozen(
      () =>
        ((PACKAGE_RESOURCE_KIND_BY_COLLECTION as unknown as Record<string, string>)[
          "contentTypes"
        ] = "page")
    );
    mutateFrozen(() => ((PACKAGE_LIMITS as unknown as Record<string, number>)["depth"] = 1));
    mutateFrozen(() => ((FULL_SITE_PACKAGE_SETTING_KEYS as unknown as string[])[0] = "site.bad"));
    expect(PACKAGE_RESOURCE_KINDS[0]).toBe(originalKind);
    expect(PACKAGE_RESOURCE_COLLECTIONS[0]).toBe(originalCollection);
    expect(PACKAGE_RESOURCE_KIND_BY_COLLECTION.contentTypes).toBe(originalMapping);
    expect(PACKAGE_LIMITS.depth).toBe(originalLimit);
    expect(FULL_SITE_PACKAGE_SETTING_KEYS[0]).toBe(originalSetting);
  });

  it("rejects all exact prototype-sensitive own keys with one redacted finding", () => {
    for (const key of ["__proto__", "prototype", "constructor"] as const) {
      const sentinel = `unique-${key}-value`;
      const desired = JSON.parse(
        `{"safe":{"${key}":{"authorization":"${sentinel}"}}}`
      ) as JsonObject;
      const error = expectDesiredReason(desired, "prototype_key_forbidden");
      const serialized = JSON.stringify(error);
      expect(error.diagnostics[0].path).not.toContain(key);
      expect(serialized).not.toContain(sentinel);
      expect(error.diagnostics).toHaveLength(1);
    }
  });

  it("uses exact compact credential aliases and material suffixes", () => {
    const forbidden = [
      "authorization",
      "providerKey",
      "client_secret",
      "connectionString",
      "APIKey",
      "APIkey",
      "apiKEY",
      "XAPIKey",
      "X-API-Key",
      "sessionId",
      "sessionid",
      "secretAccessKey",
      "passwordHash",
      "apiKeyData",
      "apikeypayload",
      "apikeyheadervalue",
      "webhooksecret",
    ];
    for (const key of forbidden) {
      expect(isSensitiveFieldKey(key), key).toBe(true);
      expectDesiredReason({ [key]: "unique-secret-value" }, "secret_key_forbidden");
    }

    const allowed = [
      "tokenizedCopy",
      "tokenCount",
      "cookieBanner",
      "passwordPolicyLabel",
      "secretDescription",
      "apiKeyDescription",
      "apikeydescription",
      "possessionId",
      "providerKeynote",
      "connectionStringFormat",
      "status_code",
    ];
    for (const key of allowed) {
      expect(isSensitiveFieldKey(key), key).toBe(false);
      expect(() =>
        normalizeFullSitePackageForWrite(packageWithDesired({ [key]: "copy" }))
      ).not.toThrow();
    }
  });

  it("recognizes only the closed binary-carrier grammar", () => {
    for (const key of [
      "base64",
      "bytes",
      "binary",
      "blob",
      "base64Data",
      "base64data",
      "imageBase64Data",
      "binaryPayload",
      "bytesValue",
      "blobContent",
    ]) {
      expect(isExplicitBinaryCarrier(key), key).toBe(true);
      expectDesiredReason({ [key]: "QUJD" }, "base64_value_forbidden");
    }
    for (const key of [
      "base64Description",
      "database64",
      "binaryChoice",
      "blobLabel",
      "bytesPerSecond",
    ]) {
      expect(isExplicitBinaryCarrier(key), key).toBe(false);
      expect(() =>
        normalizeFullSitePackageForWrite(packageWithDesired({ [key]: "QUJD" }))
      ).not.toThrow();
    }
  });

  it("propagates explicit carriers through arrays and nested objects", () => {
    for (const desired of [
      { base64Data: "QUJD" },
      { base64Data: ["public-copy!", "QUJD"] },
      { base64Data: { nested: { value: "QUJD" } } },
    ]) {
      expectDesiredReason(desired, "base64_value_forbidden");
    }
    expect(() =>
      normalizeFullSitePackageForWrite(
        packageWithDesired({ base64Data: { nested: "not encoded!" } })
      )
    ).not.toThrow();
  });

  it("rejects canonical and malformed Base64-family variants only under carriers", () => {
    const forbidden = [
      "QUJD",
      "QUI=",
      "QUI",
      "Q-U_",
      "Q U\tJ\nD",
      "Q\vU\fJ\rD",
      "QU=JD",
      "QUI===",
      "Q+/__",
      "AAE",
      "AB==",
      "A=",
    ];
    for (const encoded of forbidden) {
      expect(classifyForbiddenValue(encoded, { explicitBinaryCarrier: true }), encoded).toBe(
        "base64_value_forbidden"
      );
      expectDesiredReason({ bytes: encoded }, "base64_value_forbidden");
    }
    for (const safe of ["", " \t\r\n", "A", "not encoded!", "copy.with:punctuation"]) {
      expect(classifyForbiddenValue(safe, { explicitBinaryCarrier: true }), safe).toBeNull();
    }
    expect(() =>
      normalizeFullSitePackageForWrite(packageWithDesired({ copy: "QUJD" }))
    ).not.toThrow();
  });

  it("rejects canonical and noncanonical Basic credentials without guessing prose", () => {
    for (const value of ["Basic YTo=", "Basic YTq=", "Basic YTo", "Basic YTo==", "Basic YTo==="]) {
      expectDesiredReason({ copy: value }, "authorization_value_forbidden");
    }
    for (const value of [
      "Basic analytics",
      "Basic Plan",
      "Basic QQ==",
      "Bearer token",
      "Bearer architecture",
    ]) {
      expect(() =>
        normalizeFullSitePackageForWrite(packageWithDesired({ copy: value }))
      ).not.toThrow();
    }
    expectDesiredReason({ copy: "Bearer abcdefghijklmnop.123" }, "authorization_value_forbidden");
  });

  it("rejects every nonempty Authorization wrapper while accepting empty and other headers", () => {
    for (const value of [
      "Authorization: Basic Plan",
      "authorization : Digest alphabetic",
      "'Authorization': 'Token short'",
      '"AUTHORIZATION": "Unknown opaque"',
      "prefix; Authorization: AWS4-HMAC value",
    ]) {
      expectDesiredReason({ copy: value }, "authorization_value_forbidden");
    }
    for (const value of [
      "Authorization:",
      "Authorization:   ",
      "X-Authorization: Basic YTo=",
      "Header: Digest alphabetic",
      "ordinary colon prose",
    ]) {
      expect(() =>
        normalizeFullSitePackageForWrite(packageWithDesired({ copy: value }))
      ).not.toThrow();
    }
  });

  it("rejects credential URLs, exact code parameters and whole relative assignments", () => {
    const forbidden = [
      "https://unique-user:unique-pass@example.test/path",
      "//unique-user:unique-pass@example.test/path",
      "http:unique-user:unique-pass@example.test/path",
      "https://example.test/?access_token=unique-value",
      "https://example.test/#code=unique-value",
      "https://example.test/?CODE=unique-value",
      "https://example.test/?%63ode=unique-value",
      "/download?token=unique-value",
      "./download?api_key=unique-value",
      "../download#access_token=unique-value",
      "?code=unique-value",
      "#?access%5Ftoken=unique-value",
      "contact?token=unique-value",
      "flow#access_token=unique-value",
      "https://example.test/?code=&code=unique-value",
    ];
    for (const value of forbidden) {
      const error = expectDesiredReason({ copy: value }, "credential_url_forbidden");
      expect(JSON.stringify(error)).not.toContain("unique-value");
      expect(JSON.stringify(error)).not.toContain("unique-user");
    }
    const allowed = [
      "https://example.test/public",
      "https://example.test/?code=",
      "https://example.test/?code=&code=",
      "https://example.test/?%2563ode=public",
      "https://example.test/?coupon_code=public",
      "https://example.test/?code_type=public",
      "https://example.test/?response_type=code",
      "contact?state=public",
      "contact without assignment",
    ];
    for (const value of allowed) {
      expect(() =>
        normalizeFullSitePackageForWrite(packageWithDesired({ copy: value }))
      ).not.toThrow();
    }
  });

  it("applies the classifier to all seven exact package-prose surfaces", () => {
    const candidate = "Bearer abcdefghijklmnop.987";
    const cases: Array<{
      path: string;
      mutate(input: FullSitePackageV1): void;
    }> = [
      {
        path: "$.metadata.name",
        mutate: (input) => {
          input.metadata.name = candidate;
        },
      },
      {
        path: "$.metadata.description",
        mutate: (input) => {
          input.metadata.description = candidate;
        },
      },
      ...(
        [
          "prototypeEvidence",
          "cmsConstraint",
          "installedApproximation",
          "userVisibleDifference",
          "postInstallRemediation",
        ] as const
      ).map((field) => ({
        path: `$.compatibility.unresolvedVisuals[0].${field}`,
        mutate: (input: FullSitePackageV1) => {
          input.compatibility = {
            unresolvedVisuals: [{ ...validVisualResidual(), [field]: candidate }],
          };
        },
      })),
    ];
    for (const testCase of cases) {
      const input = validFullSitePackage();
      testCase.mutate(input);
      const error = expectFullSitePackageCode(
        () => normalizeFullSitePackageForWrite(input),
        "site_package_invalid"
      );
      expect(error.diagnostics).toContainEqual({
        path: testCase.path,
        reason: "authorization_value_forbidden",
      });
      expect(JSON.stringify(error)).not.toContain(candidate);
    }
  });

  it("classifies every actual binary class first at bare and nested placement", () => {
    const values: unknown[] = [
      new ArrayBuffer(4),
      new Uint8Array([117, 110, 105, 113, 117, 101]),
      new DataView(new ArrayBuffer(8)),
      new Blob(["unique-blob-bytes"], { type: "application/x-unique-type" }),
    ];
    for (const value of values) {
      expectDesiredReason(value, "binary_value_forbidden");
      expectDesiredReason({ nested: [value] }, "binary_value_forbidden");
      expectDesiredReason({ nested: { value } }, "binary_value_forbidden");
      expectDesiredReason({ base64Data: value }, "binary_value_forbidden");
    }
  });

  it("uses fixed value-reason precedence and never discloses candidates", () => {
    const pem = "-----BEGIN UNIQUE PRIVATE KEY-----";
    const error = expectDesiredReason(
      {
        bytes: `Authorization: Digest unique-auth ${pem} https://example.test/?token=unique-url data:text/plain;base64,QUJD`,
      },
      "authorization_value_forbidden"
    );
    const serialized = JSON.stringify(error);
    for (const sentinel of ["unique-auth", "UNIQUE", "unique-url", "QUJD"]) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it("retains residual input indexes in prose diagnostics before residual sorting", () => {
    const input = validFullSitePackage();
    input.compatibility = {
      unresolvedVisuals: [
        validVisualResidual("z-residual"),
        {
          ...validVisualResidual("a-residual"),
          cmsConstraint: "https://unique-user:unique-pass@example.test/",
        },
      ],
    };
    const error = expectFullSitePackageCode(
      () => normalizeFullSitePackageForWrite(input),
      "site_package_invalid"
    );
    expect(error.diagnostics).toEqual([
      {
        path: "$.compatibility.unresolvedVisuals[1].cmsConstraint",
        reason: "credential_url_forbidden",
      },
    ]);
    expect(JSON.stringify(error)).not.toContain("a-residual");
    expect(JSON.stringify(error)).not.toContain("unique-user");
  });
});
