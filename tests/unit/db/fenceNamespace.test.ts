import { expect, test } from "bun:test";

import {
  FENCE_NAMESPACE_OFFSET_ENV,
  NATIVE_CMS_WRITER_FENCE_NAMESPACE,
  resolveFenceNamespace,
} from "../../../core/db/nativeCmsWriterFence";

const offsetEnv = (value: string): Record<string, string> => ({
  NODE_ENV: "test",
  [FENCE_NAMESPACE_OFFSET_ENV]: value,
});

test("no environment fails closed to the production namespace", () => {
  expect(resolveFenceNamespace({})).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(resolveFenceNamespace(undefined)).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
});

test("NODE_ENV other than test never honors the offset", () => {
  expect(
    resolveFenceNamespace({ NODE_ENV: "production", [FENCE_NAMESPACE_OFFSET_ENV]: "3" })
  ).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(
    resolveFenceNamespace({ NODE_ENV: "development", [FENCE_NAMESPACE_OFFSET_ENV]: "3" })
  ).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
});

test("test lane without the offset env stays on the production namespace", () => {
  expect(resolveFenceNamespace({ NODE_ENV: "test" })).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
});

test("test lane honors a valid offset as namespace plus offset", () => {
  expect(resolveFenceNamespace(offsetEnv("1"))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE + 1);
  expect(resolveFenceNamespace(offsetEnv("3"))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE + 3);
  expect(resolveFenceNamespace(offsetEnv("1000"))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE + 1000);
});

test("test lane trims surrounding whitespace before parsing the offset", () => {
  expect(resolveFenceNamespace(offsetEnv(" 3 "))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE + 3);
});

test("test lane treats an empty or whitespace-only offset as unset", () => {
  expect(resolveFenceNamespace(offsetEnv(""))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(resolveFenceNamespace(offsetEnv("   "))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
  expect(resolveFenceNamespace(offsetEnv("\t\n"))).toBe(NATIVE_CMS_WRITER_FENCE_NAMESPACE);
});

test("invalid offsets throw fence_namespace_offset_invalid with the raw value", () => {
  for (const raw of ["0", "-1", "1001", "abc", "1.5", "NaN"]) {
    expect(() => resolveFenceNamespace(offsetEnv(raw))).toThrow(
      `fence_namespace_offset_invalid:${raw}`
    );
  }
});

test("a whitespace-padded invalid offset keeps the raw value in the error", () => {
  expect(() => resolveFenceNamespace(offsetEnv(" 0 "))).toThrow("fence_namespace_offset_invalid: 0 ");
});
