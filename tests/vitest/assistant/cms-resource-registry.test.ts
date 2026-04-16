import { expect, test } from "vitest";

import {
  getCmsResourceRegistryEntry,
  resolveCmsResourceKindFromPrompt,
} from "../../../core/services/assistant/cmsResourceRegistry";

test("resolveCmsResourceKindFromPrompt resolves CMS resource aliases generically", () => {
  expect(resolveCmsResourceKindFromPrompt("czy widzisz strone Pysiek w pages")).toBe("page");
  expect(resolveCmsResourceKindFromPrompt("jakie ekrany z prefixem House Projects")).toBe(
    "custom-screen"
  );
  expect(resolveCmsResourceKindFromPrompt("usun formularz Lead Form")).toBe("form");
  expect(resolveCmsResourceKindFromPrompt("zmien listing template products-grid")).toBe(
    "listing-template"
  );
});

test("registry entries declare operations and read permissions", () => {
  const page = getCmsResourceRegistryEntry("page");
  expect(page?.supportedOperations).toContain("delete");
  expect(page?.readPermissions).toEqual(["content:read"]);

  const form = getCmsResourceRegistryEntry("form");
  expect(form?.supportedOperations).toContain("archive");
  expect(form?.readPermissions).toEqual(["forms:read"]);
});
