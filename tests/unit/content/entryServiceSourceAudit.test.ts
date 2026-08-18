import { expect, test } from "bun:test";
import { isIdentifier } from "typescript";
import { createEntryMutationDepsForTest } from "../../../core/services/content/entryService";
import {
  collectCalls,
  entryServiceAst,
  entryServiceSource,
  findFunction,
  methodCallsNamed,
  readProjectionKeys,
} from "./support/entryServiceTestSupport";

test("entry mutation source pins secret-minimal projections and write query shapes", () => {
  expect(readProjectionKeys("ENTRY_MUTATION_FIELDS")).toEqual([
    "id",
    "typeId",
    "slug",
    "title",
    "status",
    "data",
    "publishedAt",
    "scheduledAt",
    "visibility",
    "tags",
    "createdAt",
    "updatedAt",
    "hasPassword",
  ]);
  expect(readProjectionKeys("ENTRY_CACHE_FIELDS")).toEqual([
    "id",
    "typeId",
    "slug",
    "status",
    "publishedAt",
    "scheduledAt",
    "updatedAt",
  ]);
  expect(readProjectionKeys("ENTRY_DELETE_FIELDS")).toEqual(["id", "title"]);
  expect(readProjectionKeys("ENTRY_UPDATE_FIELDS")).toEqual([
    "id",
    "typeId",
    "title",
    "slug",
    "data",
  ]);
  expect(readProjectionKeys("CONTENT_TYPE_MUTATION_CONTEXT_FIELDS")).toEqual([
    "id",
    "slug",
    "schema",
  ]);

  for (const name of [
    "ENTRY_MUTATION_FIELDS",
    "ENTRY_CACHE_FIELDS",
    "ENTRY_DELETE_FIELDS",
    "ENTRY_UPDATE_FIELDS",
  ]) {
    expect(readProjectionKeys(name)).not.toContain("accessPassword");
  }

  const loader = findFunction(entryServiceAst, "loadEntryMutationStateForUpdate");
  expect(methodCallsNamed(loader, "select")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_MUTATION_FIELDS"
  );
  expect(methodCallsNamed(loader, "for")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    '"update"'
  );

  const statusWriter = findFunction(entryServiceAst, "writeEntryStatusTx");
  expect(
    methodCallsNamed(statusWriter, "returning")[0]?.arguments[0]?.getText(entryServiceAst)
  ).toBe("ENTRY_CACHE_FIELDS");
  const metadataWriter = findFunction(entryServiceAst, "writeEntryMetadataTx");
  expect(methodCallsNamed(metadataWriter, "returning")).toHaveLength(0);

  const update = findFunction(entryServiceAst, "updateEntry");
  expect(methodCallsNamed(update, "select")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_UPDATE_FIELDS"
  );
  expect(methodCallsNamed(update, "returning")).toHaveLength(0);

  const remove = findFunction(entryServiceAst, "deleteEntry");
  expect(methodCallsNamed(remove, "returning")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_DELETE_FIELDS"
  );

  const publish = findFunction(entryServiceAst, "publishEntry");
  expect(
    collectCalls(publish).some(
      (call) =>
        isIdentifier(call.expression) && call.expression.text === "loadEntryMutationStateForUpdate"
    )
  ).toBe(true);
  expect(entryServiceSource).not.toContain("select({ accessPassword:");
  expect(entryServiceSource).not.toContain("returning({ accessPassword:");
});

test("entry mutation dependency factory clones and freezes production seams", () => {
  const hash = async () => "test-hash";
  const first = createEntryMutationDepsForTest({ hashPassword: hash });
  const second = createEntryMutationDepsForTest({});

  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(second)).toBe(true);
  expect(first.hashPassword).toBe(hash);
  expect(second.hashPassword).not.toBe(hash);
  expect(() => {
    (first as unknown as { hashPassword: null }).hashPassword = null;
  }).toThrow();
});
