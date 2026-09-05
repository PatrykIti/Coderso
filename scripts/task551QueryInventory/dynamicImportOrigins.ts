/** Source-only discovery of known literal dynamic client origins. */
import type * as tsNS from "typescript";

import { fail } from "./contracts";
import type { ClientKind } from "./clientExpressions";

type TypeScriptAdapter = typeof tsNS;
type DynamicClientModule = "client" | "session";
const SECURITY_SETTINGS_FILE = "core/services/settings/securitySettings.ts";
const SECURITY_SETTINGS_CLIENT_SPECIFIER = "../../db/client";

/** Resolves the stable enclosing symbol used by inventory records. */
export function namedFunctionSymbol(ts: TypeScriptAdapter, node: tsNS.Node): string | null {
  let cursor: tsNS.Node | undefined = node;
  let encounteredFunction = false;
  while (cursor !== undefined && !ts.isSourceFile(cursor)) {
    if (ts.isFunctionLike(cursor)) encounteredFunction = true;
    if (ts.isFunctionDeclaration(cursor) && cursor.name !== undefined) return cursor.name.text;
    if (
      (ts.isMethodDeclaration(cursor) ||
        ts.isGetAccessorDeclaration(cursor) ||
        ts.isSetAccessorDeclaration(cursor)) &&
      ts.isIdentifier(cursor.name)
    )
      return cursor.name.text;
    if (
      ts.isVariableDeclaration(cursor) &&
      ts.isIdentifier(cursor.name) &&
      cursor.initializer !== undefined &&
      (ts.isArrowFunction(cursor.initializer) || ts.isFunctionExpression(cursor.initializer))
    )
      return cursor.name.text;
    if (
      ts.isPropertyAssignment(cursor) &&
      ts.isIdentifier(cursor.name) &&
      (ts.isArrowFunction(cursor.initializer) || ts.isFunctionExpression(cursor.initializer))
    )
      return cursor.name.text;
    cursor = cursor.parent;
  }
  return encounteredFunction ? null : "<module>";
}

function clientKindForDynamicModule(kind: DynamicClientModule | null): ClientKind | null {
  if (kind === "client") return "drizzle-executor";
  if (kind === "session") return "session-client";
  return null;
}

function unwrapTransparentExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let unwrapped = expression;
  while (
    ts.isParenthesizedExpression(unwrapped) ||
    ts.isAsExpression(unwrapped) ||
    ts.isTypeAssertionExpression(unwrapped) ||
    ts.isNonNullExpression(unwrapped) ||
    ts.isSatisfiesExpression(unwrapped)
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped;
}

function exactSecuritySettingsGetDbOriginOrThrow(
  ts: TypeScriptAdapter,
  declaration: tsNS.VariableDeclaration,
  classify: (node: tsNS.CallExpression) => DynamicClientModule | null
): tsNS.CallExpression {
  const getDb = declaration.name;
  const factory = declaration.initializer;
  if (
    !ts.isIdentifier(getDb) ||
    getDb.text !== "getDb" ||
    factory === undefined ||
    !ts.isArrowFunction(factory) ||
    factory.parameters.length !== 0 ||
    !factory.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
    !ts.isBlock(factory.body) ||
    factory.body.statements.length !== 2
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  const [cacheStatement, returnStatement] = factory.body.statements;
  if (
    cacheStatement === undefined ||
    returnStatement === undefined ||
    !ts.isExpressionStatement(cacheStatement) ||
    !ts.isBinaryExpression(cacheStatement.expression) ||
    cacheStatement.expression.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionEqualsToken ||
    !ts.isIdentifier(cacheStatement.expression.left) ||
    cacheStatement.expression.left.text !== "dbPromise" ||
    !ts.isReturnStatement(returnStatement) ||
    returnStatement.expression === undefined ||
    !ts.isIdentifier(returnStatement.expression) ||
    returnStatement.expression.text !== "dbPromise"
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  const cacheFactoryCall = unwrapTransparentExpression(ts, cacheStatement.expression.right);
  const cacheFactory =
    ts.isCallExpression(cacheFactoryCall) && cacheFactoryCall.arguments.length === 0
      ? unwrapTransparentExpression(ts, cacheFactoryCall.expression)
      : null;
  if (
    cacheFactory === null ||
    !ts.isArrowFunction(cacheFactory) ||
    cacheFactory.parameters.length !== 0 ||
    !cacheFactory.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
    !ts.isBlock(cacheFactory.body) ||
    cacheFactory.body.statements.length !== 2
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  const [bindingStatement, dbReturnStatement] = cacheFactory.body.statements;
  if (
    bindingStatement === undefined ||
    dbReturnStatement === undefined ||
    !ts.isVariableStatement(bindingStatement) ||
    (bindingStatement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
    bindingStatement.declarationList.declarations.length !== 1 ||
    !ts.isReturnStatement(dbReturnStatement) ||
    dbReturnStatement.expression === undefined ||
    !ts.isIdentifier(dbReturnStatement.expression) ||
    dbReturnStatement.expression.text !== "db"
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  const [binding] = bindingStatement.declarationList.declarations;
  const initializer = binding?.initializer;
  if (
    binding === undefined ||
    initializer === undefined ||
    !ts.isObjectBindingPattern(binding.name) ||
    binding.name.elements.length !== 1 ||
    !ts.isAwaitExpression(initializer) ||
    !ts.isCallExpression(initializer.expression)
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  const [element] = binding.name.elements;
  const dynamicImport = initializer.expression;
  const [specifier] = dynamicImport.arguments;
  if (
    element === undefined ||
    element.dotDotDotToken !== undefined ||
    element.initializer !== undefined ||
    !ts.isIdentifier(element.name) ||
    element.name.text !== "db" ||
    (element.propertyName !== undefined &&
      (!ts.isIdentifier(element.propertyName) || element.propertyName.text !== "db")) ||
    dynamicImport.expression.kind !== ts.SyntaxKind.ImportKeyword ||
    dynamicImport.arguments.length !== 1 ||
    !ts.isStringLiteral(specifier) ||
    specifier.text !== SECURITY_SETTINGS_CLIENT_SPECIFIER ||
    classify(dynamicImport) !== "client"
  ) {
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  }
  return dynamicImport;
}

/** Resolves only the audited security-settings async-IIFE → cache → return path. */
export function collectExactSecuritySettingsGetDbOriginsOrThrow(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  classify: (node: tsNS.CallExpression) => DynamicClientModule | null
): ReadonlyMap<tsNS.Identifier, readonly tsNS.CallExpression[]> {
  if (sourceFile.fileName !== SECURITY_SETTINGS_FILE)
    return new Map<tsNS.Identifier, readonly tsNS.CallExpression[]>();
  const declarations = sourceFile.statements.flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations].filter(
          (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "getDb"
        )
      : []
  );
  if (declarations.length !== 1)
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  const origin = exactSecuritySettingsGetDbOriginOrThrow(ts, declarations[0]!, classify);
  const dynamicClientImports: tsNS.CallExpression[] = [];
  const visit = (node: tsNS.Node): void => {
    if (ts.isCallExpression(node) && clientKindForDynamicModule(classify(node)) !== null)
      dynamicClientImports.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (dynamicClientImports.length !== 1 || dynamicClientImports[0] !== origin)
    return fail("query_inventory_scan_invalid", "security-settings-provenance");
  const declaration = declarations[0]!.name as tsNS.Identifier;
  return new Map([[declaration, Object.freeze([origin])]]);
}

/** Returns the declaration that a direct identifier call resolves through. */
export function functionBindingDeclaration(
  ts: TypeScriptAdapter,
  node: tsNS.FunctionLikeDeclaration
): tsNS.Identifier | null {
  if (ts.isFunctionDeclaration(node)) return node.name ?? null;
  const parent = node.parent;
  return parent !== undefined &&
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name)
    ? parent.name
    : null;
}

function isDirectFactoryIife(ts: TypeScriptAdapter, node: tsNS.FunctionLikeDeclaration): boolean {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
  let expression: tsNS.Expression = node;
  while (true) {
    const parent = expression.parent;
    if (
      (ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isNonNullExpression(parent) ||
        ts.isSatisfiesExpression(parent)) &&
      parent.expression === expression
    ) {
      expression = parent;
      continue;
    }
    return ts.isCallExpression(parent) && parent.expression === expression;
  }
}

function hasUntrackableFactoryContext(ts: TypeScriptAdapter, node: tsNS.Node): boolean {
  for (
    let current = node.parent;
    current !== undefined && !ts.isSourceFile(current);
    current = current.parent
  ) {
    if (!ts.isFunctionLike(current) || !("body" in current) || current.body === undefined) continue;
    const factory = current as tsNS.FunctionLikeDeclaration;
    if (functionBindingDeclaration(ts, factory) !== null) continue;
    if (!isDirectFactoryIife(ts, factory)) return true;
  }
  return false;
}

/** Returns literal client/session imports enclosed by one directly invoked anonymous factory. */
export function directIifeDynamicClientOrigins(
  ts: TypeScriptAdapter,
  call: tsNS.CallExpression,
  classify: (node: tsNS.CallExpression) => DynamicClientModule | null
): readonly tsNS.CallExpression[] {
  let callee: tsNS.Expression = call.expression;
  while (
    ts.isParenthesizedExpression(callee) ||
    ts.isAsExpression(callee) ||
    ts.isTypeAssertionExpression(callee) ||
    ts.isNonNullExpression(callee) ||
    ts.isSatisfiesExpression(callee)
  )
    callee = callee.expression;
  if (!ts.isArrowFunction(callee) && !ts.isFunctionExpression(callee)) return [];
  const origins: tsNS.CallExpression[] = [];
  const visit = (node: tsNS.Node): void => {
    if (node !== callee && ts.isFunctionLike(node)) return;
    if (ts.isCallExpression(node) && clientKindForDynamicModule(classify(node)) !== null)
      origins.push(node);
    ts.forEachChild(node, visit);
  };
  visit(callee);
  return Object.freeze(origins);
}

/** Builds a cached subtree finder without loading or evaluating source modules. */
export function createContainedDynamicClientKindFinder(
  ts: TypeScriptAdapter,
  classify: (node: tsNS.CallExpression) => DynamicClientModule | null
): (node: tsNS.Node) => ClientKind | null {
  const cache = new WeakMap<tsNS.Node, ClientKind | null>();
  const find = (node: tsNS.Node): ClientKind | null => {
    if (cache.has(node)) return cache.get(node)!;
    let found = ts.isCallExpression(node) ? clientKindForDynamicModule(classify(node)) : null;
    if (found === null) {
      ts.forEachChild(node, (child) => {
        if (found === null) found = find(child);
      });
    }
    cache.set(node, found);
    return found;
  };
  return find;
}

/** Maps named client/session factories to their literal dynamic-import origins. */
export function collectDynamicClientFactoryOrigins(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  classify: (node: tsNS.CallExpression) => DynamicClientModule | null
): ReadonlyMap<tsNS.Identifier, readonly tsNS.CallExpression[]> {
  const originsByFactory = new Map<tsNS.Identifier, tsNS.CallExpression[]>();
  const visit = (node: tsNS.Node, factories: readonly tsNS.Identifier[]): void => {
    const declaration =
      ts.isFunctionLike(node) && "body" in node && node.body !== undefined
        ? functionBindingDeclaration(ts, node)
        : null;
    const active = declaration === null ? factories : [...factories, declaration];
    if (ts.isCallExpression(node) && clientKindForDynamicModule(classify(node)) !== null) {
      if (hasUntrackableFactoryContext(ts, node))
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      for (const factory of active) {
        const origins = originsByFactory.get(factory) ?? [];
        origins.push(node);
        originsByFactory.set(factory, origins);
      }
    }
    ts.forEachChild(node, (child) => visit(child, active));
  };
  visit(sourceFile, []);
  return new Map(
    [...originsByFactory].map(([factory, origins]) => [factory, Object.freeze(origins)])
  );
}
