import { expect, test } from "bun:test";
import {
  API_VERSION,
  CORE_VERSION,
  assertCompatible,
  isCompatible,
} from "../../../core/plugins/compat";

const compatibleRange = `>=${CORE_VERSION}`;

test("accepts compatible api/core versions", () => {
  expect(
    isCompatible({ apiVersion: API_VERSION, coreVersion: compatibleRange })
  ).toBe(true);
});

test("rejects incompatible apiVersion", () => {
  expect(
    isCompatible({ apiVersion: "2", coreVersion: compatibleRange })
  ).toBe(false);
  expect(() =>
    assertCompatible({ apiVersion: "2", coreVersion: compatibleRange })
  ).toThrow("plugin_api_version_incompatible");
});

test("rejects incompatible coreVersion", () => {
  expect(
    isCompatible({ apiVersion: API_VERSION, coreVersion: "<0.0.1" })
  ).toBe(false);
  expect(() =>
    assertCompatible({ apiVersion: API_VERSION, coreVersion: "<0.0.1" })
  ).toThrow("plugin_core_version_incompatible");
});
