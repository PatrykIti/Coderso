import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Task540OperationParityRow } from "../../../scripts/runtime-smoke/adapters/task-540/operations/contracts";
import {
  TASK540_OPERATION_ALIASES,
  assertTask540OperationParity,
  requireTask540OperationAlias,
} from "../../../scripts/runtime-smoke/adapters/task-540/operations/aliases";
import { createTask540TypedHandlers } from "../../../scripts/runtime-smoke/adapters/task-540/operations/handlers";
import {
  createTask540OperationDefinitions,
  createTask540OperationRegistry,
} from "../../../scripts/runtime-smoke/adapters/task-540/operations/registry";
import {
  TASK540_CLEANUP_API_NODE_OPERATIONS,
  TASK540_CLEANUP_DB_OPERATIONS,
  TASK540_CLEANUP_LOGICAL_RECEIPTS,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/executor/cleanup-receipts";
import { TASK540_RESPONSE_LOST_BASELINE_OPERATIONS } from "../../../scripts/runtime-smoke/adapters/task-540/suite/executor/response-lost";
import { routeTask540Operation } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/operation-router";

const root = path.resolve(import.meta.dir, "../../..");
const fixturePath = path.join(root, "tests/fixtures/runtime-smoke/task540-operation-parity.json");

interface OperationParityFixture {
  readonly schemaVersion: 1;
  readonly handlerArtifactVersion: string;
  readonly counts: Readonly<{
    canonicalHandlers: number;
    acceptedOperationIds: number;
    canonicalIds: number;
    explicitAliases: number;
    responseLostAliases: number;
    resourceAliases: number;
  }>;
  readonly rows: readonly Task540OperationParityRow[];
}

async function readFixture(): Promise<OperationParityFixture> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as OperationParityFixture;
}

test("TASK-540 typed registry matches the immutable 57/160 parity fixture", async () => {
  const fixture = await readFixture();
  expect(fixture.schemaVersion).toBe(1);
  expect(fixture.counts).toEqual({
    canonicalHandlers: 57,
    acceptedOperationIds: 160,
    canonicalIds: 57,
    explicitAliases: 26,
    responseLostAliases: 36,
    resourceAliases: 41,
  });
  expect(TASK540_OPERATION_ALIASES).toEqual(fixture.rows);
  expect(createTask540TypedHandlers().size).toBe(57);
  const definitions = createTask540OperationDefinitions();
  expect(definitions).toHaveLength(160);
  expect(new Set(definitions.map(({ operationId }) => operationId)).size).toBe(160);
  expect(createTask540OperationRegistry().ids()).toEqual(
    fixture.rows.map(({ operationId }) => operationId)
  );
  for (const definition of definitions) {
    const row = requireTask540OperationAlias(definition.operationId);
    expect(definition).toMatchObject({
      operationId: row.operationId,
      profileId: row.profileId,
      inputSchemaId: row.inputSchemaId,
      outputSchemaId: row.outputSchemaId,
      sourceSha256: row.handlerArtifactSha256,
      retryClass: row.retryClass,
    });
    expect(Object.hasOwn(definition, "source")).toBe(false);
  }
});

test("TASK-540 parity rejects missing, extra, duplicate, mapping, schema, and authority mutants", () => {
  const baseline = TASK540_OPERATION_ALIASES;
  const first = baseline[0]!;
  const different = <TKey extends keyof Task540OperationParityRow>(key: TKey) =>
    baseline.find((row) => row[key] !== first[key])!;
  const replaceFirst = (replacement: Task540OperationParityRow) => [
    replacement,
    ...baseline.slice(1),
  ];
  const mutants: readonly (readonly Task540OperationParityRow[])[] = [
    baseline.slice(1),
    [...baseline, first],
    replaceFirst({ ...first, operationId: different("operationId").operationId }),
    replaceFirst({ ...first, handlerId: different("handlerId").handlerId }),
    replaceFirst({ ...first, inputSchemaId: different("inputSchemaId").inputSchemaId }),
    replaceFirst({ ...first, outputSchemaId: different("outputSchemaId").outputSchemaId }),
    replaceFirst({
      ...first,
      handlerArtifactSha256: different("handlerArtifactSha256").handlerArtifactSha256,
    }),
    replaceFirst({
      ...first,
      retryClass: first.retryClass === "mutation" ? "idempotent-read" : "mutation",
    }),
  ];
  for (const mutant of mutants) {
    expect(() => assertTask540OperationParity(mutant)).toThrow("operation parity drifted");
    expect(() => createTask540OperationDefinitions(mutant)).toThrow();
  }
});

test("TASK-540 aliases do not widen shared handler input or output authority", () => {
  const contentRoutes = requireTask540OperationAlias("resource/content-routes-exact");
  const baselineAbsence = requireTask540OperationAlias("site-content-routes-baseline/absence");
  expect(contentRoutes.handlerId).toBe(baselineAbsence.handlerId);
  expect(contentRoutes.inputSchemaId).toBe("empty-input-v1");
  expect(baselineAbsence.inputSchemaId).toBe("empty-input-v1");
  expect(contentRoutes.outputSchemaId).toBe("content-routes-private-v1");
  expect(baselineAbsence.outputSchemaId).toBe("strict-resource-operation-v1");
});

test("TASK-540 native executor/runtime facades preserve response-lost and cleanup authority", () => {
  expect(TASK540_RESPONSE_LOST_BASELINE_OPERATIONS).toHaveLength(18);
  expect(TASK540_CLEANUP_DB_OPERATIONS + TASK540_CLEANUP_API_NODE_OPERATIONS).toBe(
    TASK540_CLEANUP_LOGICAL_RECEIPTS
  );
  expect(
    routeTask540Operation({
      operationId: "dynamic/resource/content-type/provenance/001",
      envProfileId: "database",
      inputSchemaId: "identifier-uuid-input-v1",
      outputSchemaId: "strict-resource-operation-v1",
      resourceKind: "content-type",
      resourceSlot: "provenance",
      acquisitionChannel: "failure-discovery",
    }).operationId
  ).toBe("content-type/provenance/failure-discovery");
  expect(() =>
    routeTask540Operation({
      operationId: "runtime/set-035-screen-create",
      envProfileId: "database",
    })
  ).toThrow("authority drifted");
  expect(() =>
    routeTask540Operation({ operationId: "runtime/not-registered", envProfileId: "database" })
  ).toThrow("not allowlisted");
});
