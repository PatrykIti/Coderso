import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isArrayLiteralExpression,
  isAwaitExpression,
  isCallExpression,
  isFunctionDeclaration,
  isIdentifier,
  isIfStatement,
  isPropertyAccessExpression,
  isStringLiteralLike,
  isVariableDeclaration,
  transpileModule,
  type ArrayLiteralExpression,
  type Expression,
  type Node,
  type SourceFile,
} from "typescript";

const root = path.resolve(import.meta.dir, "../../..");
const platformPath = "scripts/runtime-smoke/adapters/task-540/operations/handlers/platform.ts";
const setupPath = "scripts/runtime-smoke/adapters/task-540/suite/contract/actions/setup.mjs";
const terminalPath = "scripts/runtime-smoke/adapters/task-540/suite/contract/actions/terminal.mjs";

interface QueryCall {
  readonly name: string;
  readonly arguments: readonly Expression[];
}

function normalize(source: string): string {
  return source.replace(/\s+/gu, "");
}

function parseSource(pathname: string, source: string, scriptKind: ScriptKind): SourceFile {
  const diagnostics = transpileModule(source, {
    compilerOptions: { target: ScriptTarget.Latest },
    fileName: pathname,
    reportDiagnostics: true,
  }).diagnostics;
  expect(diagnostics?.map(({ code }) => code) ?? []).toEqual([]);
  const parsed = createSourceFile(pathname, source, ScriptTarget.Latest, true, scriptKind);
  return parsed;
}

function findFunctionBody(sourceFile: SourceFile, name: string): Node {
  let body: Node | undefined;
  const visit = (node: Node): void => {
    if (
      isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.name.text === name &&
      node.body !== undefined
    ) {
      if (body !== undefined) throw new Error(`duplicate function declaration: ${name}`);
      body = node.body;
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  if (body === undefined) throw new Error(`missing function declaration: ${name}`);
  return body;
}

function findVariableInitializer(scope: Node, name: string): Expression {
  let initializer: Expression | undefined;
  const visit = (node: Node): void => {
    if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === name) {
      if (initializer !== undefined) throw new Error(`duplicate variable declaration: ${name}`);
      if (node.initializer === undefined) throw new Error(`missing initializer: ${name}`);
      initializer = node.initializer;
    }
    forEachChild(node, visit);
  };
  visit(scope);
  if (initializer === undefined) throw new Error(`missing variable declaration: ${name}`);
  return initializer;
}

function queryCalls(initializer: Expression): readonly QueryCall[] {
  const calls: QueryCall[] = [];
  if (!isAwaitExpression(initializer)) {
    throw new Error("storage baseline query must be awaited");
  }
  let current = initializer.expression;
  while (isCallExpression(current)) {
    if (!isPropertyAccessExpression(current.expression)) {
      throw new Error("storage baseline query must use a property-access call chain");
    }
    calls.unshift(
      Object.freeze({
        name: current.expression.name.text,
        arguments: [...current.arguments],
      })
    );
    current = current.expression.expression;
  }
  if (!isIdentifier(current) || current.text !== "db") {
    throw new Error("storage baseline query must start from db");
  }
  return Object.freeze(calls);
}

function requireCall(calls: readonly QueryCall[], index: number): QueryCall {
  const call = calls[index];
  if (call === undefined) throw new Error(`missing query call at index ${index}`);
  return call;
}

function expectArgument(call: QueryCall, sourceFile: SourceFile, expected: string): void {
  expect(call.arguments).toHaveLength(1);
  const [argument] = call.arguments;
  if (argument === undefined) throw new Error(`missing ${call.name} argument`);
  expect(normalize(argument.getText(sourceFile))).toBe(expected);
}

function expectBoundedInventoryQuery(
  sourceFile: SourceFile,
  initializer: Expression,
  input: {
    readonly projection: string;
    readonly table: string;
    readonly predicate: string;
    readonly order: string;
  }
): void {
  const calls = queryCalls(initializer);
  expect(calls.map(({ name }) => name)).toEqual(["select", "from", "where", "orderBy", "limit"]);
  expectArgument(requireCall(calls, 0), sourceFile, input.projection);
  expectArgument(requireCall(calls, 1), sourceFile, input.table);
  expectArgument(requireCall(calls, 2), sourceFile, input.predicate);
  expectArgument(requireCall(calls, 3), sourceFile, input.order);
  expectArgument(requireCall(calls, 4), sourceFile, "4097");
}

function findNamedErrorGuard(
  scope: Node,
  sourceFile: SourceFile,
  token: string
): {
  readonly condition: string;
  readonly consequence: string;
} {
  let guard: { readonly condition: string; readonly consequence: string } | undefined;
  const consequence = `thrownewError("${token}");`;
  const visit = (node: Node): void => {
    if (
      isIfStatement(node) &&
      normalize(node.thenStatement.getText(sourceFile)).includes(consequence)
    ) {
      if (guard !== undefined) throw new Error(`duplicate guard: ${token}`);
      guard = Object.freeze({
        condition: normalize(node.expression.getText(sourceFile)),
        consequence: normalize(node.thenStatement.getText(sourceFile)),
      });
    }
    forEachChild(node, visit);
  };
  visit(scope);
  if (guard === undefined) throw new Error(`missing guard: ${token}`);
  return guard;
}

function actionRows(
  sourceFile: SourceFile,
  declaration: string
): readonly ArrayLiteralExpression[] {
  const initializer = findVariableInitializer(sourceFile, declaration);
  if (
    !isCallExpression(initializer) ||
    !isIdentifier(initializer.expression) ||
    initializer.expression.text !== "deepFreezeExact"
  ) {
    throw new Error(`${declaration} must use deepFreezeExact`);
  }
  const [rows] = initializer.arguments;
  if (rows === undefined || !isArrayLiteralExpression(rows)) {
    throw new Error(`${declaration} must have an array literal`);
  }
  const output: ArrayLiteralExpression[] = [];
  for (const row of rows.elements) {
    if (!isArrayLiteralExpression(row)) throw new Error(`${declaration} contains a non-row value`);
    output.push(row);
  }
  return Object.freeze(output);
}

function stringCell(row: ArrayLiteralExpression, index: number): string {
  const cell = row.elements[index];
  if (cell === undefined || !isStringLiteralLike(cell)) {
    throw new Error(`action row must contain a string at column ${index}`);
  }
  return cell.text;
}

function findActionRow(
  rows: readonly ArrayLiteralExpression[],
  id: string
): ArrayLiteralExpression {
  const row = rows.find((candidate) => stringCell(candidate, 0) === id);
  if (row === undefined) throw new Error(`missing action row: ${id}`);
  return row;
}

test("TASK-540 storage preflight keeps every task-User-Agent baseline bounded and scoped", async () => {
  const [platformBytes, setupBytes, terminalBytes] = await Promise.all(
    [platformPath, setupPath, terminalPath].map((relativePath) =>
      readFile(path.join(root, relativePath))
    )
  );
  const platform = parseSource(platformPath, platformBytes.toString("utf8"), ScriptKind.TS);
  const setup = parseSource(setupPath, setupBytes.toString("utf8"), ScriptKind.JS);
  const terminal = parseSource(terminalPath, terminalBytes.toString("utf8"), ScriptKind.JS);
  const preflight = findFunctionBody(platform, "handlePlatformStoragePreflight");

  expect(findNamedErrorGuard(preflight, platform, "wf540_input")).toEqual({
    condition:
      'Object.keys(input).join(",")!=="userAgents"||!Array.isArray(input.userAgents)||input.userAgents.length!==4||newSet(input.userAgents).size!==4',
    consequence: 'thrownewError("wf540_input");',
  });

  expectBoundedInventoryQuery(platform, findVariableInitializer(preflight, "auditRows"), {
    projection: "{id:auditLogs.id}",
    table: "auditLogs",
    predicate: "inArray(sql.raw(\"metadata->>'userAgent'\"),input.userAgents)",
    order: "auditLogs.id",
  });
  expectBoundedInventoryQuery(platform, findVariableInitializer(preflight, "accessRows"), {
    projection: "{id:accessLogs.id}",
    table: "accessLogs",
    predicate: "inArray(accessLogs.userAgent,input.userAgents)",
    order: "accessLogs.id",
  });
  expectBoundedInventoryQuery(platform, findVariableInitializer(preflight, "sessionRows"), {
    projection: "{id:sessions.id}",
    table: "sessions",
    predicate: "inArray(sessions.userAgent,input.userAgents)",
    order: "sessions.id",
  });

  expect(findNamedErrorGuard(preflight, platform, "wf540_task_traffic_baseline_overflow")).toEqual({
    condition: "auditRows.length>4096||accessRows.length>4096||sessionRows.length>4096",
    consequence: 'thrownewError("wf540_task_traffic_baseline_overflow");',
  });

  const setupRow = findActionRow(
    actionRows(setup, "SETUP_ACTION_ROWS"),
    "set-001-storage-preflight"
  );
  const setupTransition = stringCell(setupRow, 3);
  expect(setupTransition).toContain("exact task-User-Agent bounded session baseline");
  expect(setupTransition).not.toContain("complete bounded session-row baselines");

  const terminalRows = actionRows(terminal, "TERMINAL_ACTION_ROWS");
  expect(terminalRows.map((row) => [stringCell(row, 0), stringCell(row, 2)])).toEqual([
    ["end-001-release-unroute", "cleanup-release-unroute"],
    ["end-002-route-list", "cleanup-route-list"],
    ["end-003-console-errors", "cleanup-console-errors"],
    ["end-004-console-warnings", "cleanup-console-warnings"],
    ["end-005-page-errors", "cleanup-page-errors"],
    ["end-006-close", "cleanup-close"],
    ["end-007-session-absence", "cleanup-session-absence"],
  ]);
  const terminalCells = terminalRows.flatMap((row) =>
    [0, 1, 2, 3, 4].map((index) => stringCell(row, index))
  );
  expect(terminalCells.filter((cell) => cell.includes("task-traffic"))).toEqual([]);
});
