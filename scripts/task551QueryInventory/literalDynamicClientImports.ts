/** Fail-closed analysis for literal `client` dynamic-import `.then` routes. */
import type * as tsNS from "typescript";

import { fail } from "./contracts";
import { createLexicalBindingResolver } from "./literalDynamicNamespaceSafety";

type TypeScriptAdapter = typeof tsNS;
const DIRECT_CLIENT_OPERATIONS = new Set([
  "select",
  "execute",
  "insert",
  "update",
  "delete",
  "transaction",
  "batch",
]);

export type LiteralDynamicClientThenBinding = Readonly<{
  declarations: readonly tsNS.Identifier[];
  node: tsNS.CallExpression;
  names: readonly string[];
  namespaceNames: readonly string[];
  namespaceDeclaration: tsNS.Identifier | null;
  dbBindingNames: readonly string[];
}>;

const DATABASE_LIFECYCLE_FILE = "core/db/databaseLifecycle.ts";

function outerExpression(ts: TypeScriptAdapter, expression: tsNS.Expression): tsNS.Expression {
  let outermost = expression;
  while (
    (ts.isParenthesizedExpression(outermost.parent) ||
      ts.isAsExpression(outermost.parent) ||
      ts.isTypeAssertionExpression(outermost.parent) ||
      ts.isNonNullExpression(outermost.parent) ||
      ts.isSatisfiesExpression(outermost.parent)) &&
    outermost.parent.expression === outermost
  ) {
    outermost = outermost.parent;
  }
  return outermost;
}

function outerExpressionParent(ts: TypeScriptAdapter, expression: tsNS.Expression): tsNS.Node {
  return outerExpression(ts, expression).parent;
}

function isDirectNamedFunctionAncestor(
  ts: TypeScriptAdapter,
  node: tsNS.Node,
  name: string
): boolean {
  let cursor: tsNS.Node | undefined = node.parent;
  while (cursor !== undefined && !ts.isSourceFile(cursor)) {
    if (ts.isFunctionLike(cursor))
      return ts.isFunctionDeclaration(cursor) && cursor.name?.text === name;
    cursor = cursor.parent;
  }
  return false;
}

function isTopLevelVariableDeclaration(
  ts: TypeScriptAdapter,
  declaration: tsNS.VariableDeclaration
): boolean {
  const declarations = declaration.parent;
  const statement = declarations.parent;
  return (
    ts.isVariableDeclarationList(declarations) &&
    (declarations.flags & ts.NodeFlags.Let) !== 0 &&
    ts.isVariableStatement(statement) &&
    ts.isSourceFile(statement.parent)
  );
}

function lifecycleLoaderForImport(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): tsNS.ArrowFunction | null {
  const body = outerExpression(ts, node);
  const parent = body.parent;
  return ts.isArrowFunction(parent) && parent.body === body ? parent : null;
}

function isInitialLifecycleLoader(ts: TypeScriptAdapter, loader: tsNS.ArrowFunction): boolean {
  const outermost = outerExpression(ts, loader);
  const parent = outermost.parent;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === outermost &&
    isTopLevelVariableDeclaration(ts, parent) &&
    ts.isIdentifier(parent.name) &&
    parent.name.text === "loader"
  );
}

function isFallbackLifecycleAssignment(
  ts: TypeScriptAdapter,
  assignment: tsNS.BinaryExpression
): boolean {
  if (
    assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !ts.isIdentifier(assignment.left) ||
    assignment.left.text !== "loader"
  )
    return false;
  const fallback = assignment.right;
  if (
    !ts.isBinaryExpression(fallback) ||
    fallback.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken ||
    !ts.isIdentifier(fallback.left) ||
    fallback.left.text !== "next"
  )
    return false;
  return isDirectNamedFunctionAncestor(ts, assignment, "setDatabaseClientModuleForTests");
}

function isFallbackLifecycleLoader(ts: TypeScriptAdapter, loader: tsNS.ArrowFunction): boolean {
  const fallback = outerExpression(ts, loader).parent;
  if (
    !ts.isBinaryExpression(fallback) ||
    fallback.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken ||
    fallback.right !== outerExpression(ts, loader) ||
    !ts.isIdentifier(fallback.left) ||
    fallback.left.text !== "next"
  )
    return false;
  const assignment = outerExpressionParent(ts, fallback);
  return (
    ts.isBinaryExpression(assignment) &&
    assignment.right === fallback &&
    isFallbackLifecycleAssignment(ts, assignment)
  );
}

function isAllowedLifecycleLoaderReference(ts: TypeScriptAdapter, node: tsNS.Identifier): boolean {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    const initializer = parent.initializer;
    return (
      initializer !== undefined &&
      ts.isArrowFunction(initializer) &&
      isInitialLifecycleLoader(ts, initializer)
    );
  }
  if (ts.isBinaryExpression(parent) && parent.left === node)
    return isFallbackLifecycleAssignment(ts, parent);
  if (
    !ts.isCallExpression(parent) ||
    parent.expression !== node ||
    parent.questionDotToken !== undefined ||
    parent.arguments.length !== 0
  )
    return false;
  const returnStatement = parent.parent;
  return (
    ts.isReturnStatement(returnStatement) &&
    isDirectNamedFunctionAncestor(ts, returnStatement, "loadClientModule")
  );
}

function isExactLoadClientModuleDeclaration(
  ts: TypeScriptAdapter,
  declaration: tsNS.FunctionDeclaration
): boolean {
  if (
    declaration.name?.text !== "loadClientModule" ||
    declaration.parameters.length !== 0 ||
    declaration.asteriskToken !== undefined ||
    declaration.body === undefined
  )
    return false;
  if (
    !declaration.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
    declaration.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  )
    return false;
  const [statement] = declaration.body.statements;
  if (
    declaration.body.statements.length !== 1 ||
    statement === undefined ||
    !ts.isReturnStatement(statement) ||
    statement.expression === undefined ||
    !ts.isCallExpression(statement.expression)
  )
    return false;
  const call = statement.expression;
  return (
    ts.isIdentifier(call.expression) &&
    call.expression.text === "loader" &&
    call.questionDotToken === undefined &&
    call.arguments.length === 0
  );
}

function awaitedLoadClientModuleBinding(
  ts: TypeScriptAdapter,
  call: tsNS.CallExpression
): tsNS.Identifier | null {
  if (
    call.questionDotToken !== undefined ||
    call.arguments.length !== 0 ||
    !ts.isAwaitExpression(call.parent) ||
    call.parent.expression !== call
  )
    return null;
  const declaration = call.parent.parent;
  if (
    !ts.isVariableDeclaration(declaration) ||
    declaration.initializer !== call.parent ||
    !ts.isIdentifier(declaration.name) ||
    declaration.name.text !== "clientModule"
  )
    return null;
  const declarations = declaration.parent;
  return ts.isVariableDeclarationList(declarations) &&
    (declarations.flags & ts.NodeFlags.Const) !== 0
    ? declaration.name
    : null;
}

function isLifecycleStartCallback(ts: TypeScriptAdapter, node: tsNS.Node): boolean {
  let cursor: tsNS.Node | undefined = node.parent;
  while (cursor !== undefined && !ts.isSourceFile(cursor)) {
    if (ts.isFunctionLike(cursor)) {
      const parent = cursor.parent;
      return (
        ts.isArrowFunction(cursor) &&
        ts.isPropertyAssignment(parent) &&
        parent.initializer === cursor &&
        ts.isIdentifier(parent.name) &&
        parent.name.text === "start"
      );
    }
    cursor = cursor.parent;
  }
  return false;
}

function assertExactLifecycleLoadClientModuleOrThrow(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): void {
  const declarations: tsNS.FunctionDeclaration[] = [];
  const collectDeclarations = (node: tsNS.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "loadClientModule")
      declarations.push(node);
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);
  const [declaration] = declarations;
  if (
    declarations.length !== 1 ||
    declaration === undefined ||
    !isExactLoadClientModuleDeclaration(ts, declaration)
  )
    fail("query_inventory_scan_invalid", "lifecycle-loader");
  const resolver = createLexicalBindingResolver(ts, sourceFile);
  const bindings: tsNS.Identifier[] = [];
  const collectLoadReferences = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && node.text === "loadClientModule" && node !== declaration.name) {
      if (
        resolver(node) !== declaration.name ||
        !ts.isCallExpression(node.parent) ||
        node.parent.expression !== node
      )
        fail("query_inventory_scan_invalid", "lifecycle-loader");
      const binding = awaitedLoadClientModuleBinding(ts, node.parent);
      if (binding === null) fail("query_inventory_scan_invalid", "lifecycle-loader");
      bindings.push(binding);
    }
    ts.forEachChild(node, collectLoadReferences);
  };
  collectLoadReferences(sourceFile);
  if (bindings.length !== 2 || new Set(bindings).size !== 2)
    fail("query_inventory_scan_invalid", "lifecycle-loader");
  const knownBindings = new Set(bindings);
  const methods = new Map<tsNS.Identifier, string[]>();
  const collectClientModuleUses = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && node.text === "clientModule") {
      const binding = resolver(node);
      if (binding !== null && knownBindings.has(binding) && node !== binding) {
        const property = node.parent;
        if (!ts.isPropertyAccessExpression(property) || property.expression !== node)
          fail("query_inventory_scan_invalid", "lifecycle-loader");
        const call = property.parent;
        if (
          !ts.isCallExpression(call) ||
          call.expression !== property ||
          call.questionDotToken !== undefined ||
          !ts.isAwaitExpression(call.parent) ||
          call.parent.expression !== call
        ) {
          fail("query_inventory_scan_invalid", "lifecycle-loader");
        }
        const method = property.name.text;
        const close =
          method === "closeAllDatabaseClientsWithin" &&
          call.arguments.length === 1 &&
          ts.isIdentifier(call.arguments[0]) &&
          call.arguments[0].text === "budgetMs" &&
          isDirectNamedFunctionAncestor(ts, call, "closeAllDatabaseClientsWithinAbsoluteDeadline");
        const startup =
          (method === "verifyDatabaseSessions" ||
            method === "assertMaintenanceSessionAffinityIfDeclared") &&
          call.arguments.length === 0 &&
          isLifecycleStartCallback(ts, call);
        if (!close && !startup) fail("query_inventory_scan_invalid", "lifecycle-loader");
        const used = methods.get(binding) ?? [];
        used.push(method);
        methods.set(binding, used);
      }
    }
    ts.forEachChild(node, collectClientModuleUses);
  };
  collectClientModuleUses(sourceFile);
  const methodSets = bindings
    .map((binding) => (methods.get(binding) ?? []).sort().join(","))
    .sort();
  if (
    methodSets.length !== 2 ||
    methodSets[0] !== "assertMaintenanceSessionAffinityIfDeclared,verifyDatabaseSessions" ||
    methodSets[1] !== "closeAllDatabaseClientsWithin"
  ) {
    fail("query_inventory_scan_invalid", "lifecycle-loader");
  }
}

/**
 * Returns the two harmless lazy lifecycle imports, and rejects every variant.
 * The database lifecycle is the only core module allowed to dynamically load
 * its sibling client without producing an inventory row.
 */
export function collectDatabaseLifecycleClientLoaderImportsOrThrow(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): ReadonlySet<tsNS.CallExpression> {
  if (sourceFile.fileName !== DATABASE_LIFECYCLE_FILE) return new Set<tsNS.CallExpression>();
  const imports: tsNS.CallExpression[] = [];
  const visit = (node: tsNS.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      imports.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (imports.length !== 2) fail("query_inventory_scan_invalid", "lifecycle-loader");
  let initialCount = 0;
  let fallbackCount = 0;
  for (const node of imports) {
    const [argument] = node.arguments;
    if (
      node.arguments.length !== 1 ||
      argument === undefined ||
      !ts.isStringLiteral(argument) ||
      argument.text !== "./client"
    ) {
      fail("query_inventory_scan_invalid", "lifecycle-loader");
    }
    const loader = lifecycleLoaderForImport(ts, node);
    if (loader === null || loader.parameters.length !== 0)
      fail("query_inventory_scan_invalid", "lifecycle-loader");
    if (isInitialLifecycleLoader(ts, loader)) initialCount += 1;
    else if (isFallbackLifecycleLoader(ts, loader)) fallbackCount += 1;
    else fail("query_inventory_scan_invalid", "lifecycle-loader");
  }
  if (initialCount !== 1 || fallbackCount !== 1)
    fail("query_inventory_scan_invalid", "lifecycle-loader");
  let loaderDeclaration: tsNS.Identifier | null = null;
  for (const node of imports) {
    const loader = lifecycleLoaderForImport(ts, node);
    if (loader !== null && isInitialLifecycleLoader(ts, loader)) {
      const parent = outerExpression(ts, loader).parent;
      if (!ts.isVariableDeclaration(parent) || !ts.isIdentifier(parent.name))
        fail("query_inventory_scan_invalid", "lifecycle-loader");
      loaderDeclaration = parent.name;
    }
  }
  if (loaderDeclaration === null) fail("query_inventory_scan_invalid", "lifecycle-loader");
  const resolver = createLexicalBindingResolver(ts, sourceFile);
  const references = (node: tsNS.Node): void => {
    if (
      ts.isIdentifier(node) &&
      node.text === "loader" &&
      (resolver(node) !== loaderDeclaration || !isAllowedLifecycleLoaderReference(ts, node))
    ) {
      fail("query_inventory_scan_invalid", "lifecycle-loader");
    }
    ts.forEachChild(node, references);
  };
  references(sourceFile);
  assertExactLifecycleLoadClientModuleOrThrow(ts, sourceFile);
  return new Set(imports);
}

function bindingPropertyName(ts: TypeScriptAdapter, element: tsNS.BindingElement): string | null {
  const property = element.propertyName;
  if (property === undefined) return ts.isIdentifier(element.name) ? element.name.text : null;
  return ts.isIdentifier(property) || ts.isStringLiteral(property) ? property.text : null;
}

function rootIdentifier(ts: TypeScriptAdapter, expression: tsNS.Expression): string | null {
  let cursor: tsNS.Expression = expression;
  while (true) {
    if (ts.isIdentifier(cursor)) return cursor.text;
    if (
      ts.isPropertyAccessExpression(cursor) ||
      ts.isElementAccessExpression(cursor) ||
      ts.isCallExpression(cursor)
    )
      cursor = cursor.expression;
    else if (
      ts.isParenthesizedExpression(cursor) ||
      ts.isAsExpression(cursor) ||
      ts.isTypeAssertionExpression(cursor) ||
      ts.isNonNullExpression(cursor) ||
      ts.isSatisfiesExpression(cursor) ||
      ts.isAwaitExpression(cursor)
    )
      cursor = cursor.expression;
    else return null;
  }
}

function memberNames(ts: TypeScriptAdapter, expression: tsNS.Expression): readonly string[] {
  const names: string[] = [];
  let cursor: tsNS.Expression = expression;
  while (ts.isPropertyAccessExpression(cursor)) {
    names.unshift(cursor.name.text);
    cursor = cursor.expression;
  }
  return names;
}

function exactDbBindingDeclaration(
  ts: TypeScriptAdapter,
  binding: tsNS.BindingName
): tsNS.Identifier | null {
  if (!ts.isObjectBindingPattern(binding) || binding.elements.length !== 1) return null;
  const [element] = binding.elements;
  if (
    element === undefined ||
    element.dotDotDotToken !== undefined ||
    bindingPropertyName(ts, element) !== "db" ||
    !ts.isIdentifier(element.name) ||
    element.initializer !== undefined
  )
    return null;
  return element.name;
}

function exactDbBindingName(ts: TypeScriptAdapter, binding: tsNS.BindingName): string | null {
  return exactDbBindingDeclaration(ts, binding)?.text ?? null;
}

function isDirectModuleDbAccess(
  ts: TypeScriptAdapter,
  node: tsNS.PropertyAccessExpression,
  moduleName: string
): boolean {
  return (
    node.questionDotToken === undefined &&
    node.name.text === "db" &&
    rootIdentifier(ts, node) === moduleName &&
    memberNames(ts, node).length === 1
  );
}

function isSupportedClientCall(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  dbNames: ReadonlySet<string>
): boolean {
  if (!ts.isPropertyAccessExpression(expression)) return false;
  const root = rootIdentifier(ts, expression);
  if (root === null || !dbNames.has(root)) return false;
  const names = memberNames(ts, expression);
  const first = names[0];
  return (
    (names.length === 1 && first !== undefined && DIRECT_CLIENT_OPERATIONS.has(first)) ||
    (first === "query" &&
      names.every((name) => name === "query" || !DIRECT_CLIENT_OPERATIONS.has(name)))
  );
}

function isSupportedDirectModuleDbUse(
  ts: TypeScriptAdapter,
  access: tsNS.PropertyAccessExpression,
  moduleName: string
): boolean {
  let outermost = access;
  while (
    ts.isPropertyAccessExpression(outermost.parent) &&
    outermost.parent.expression === outermost
  )
    outermost = outermost.parent;
  const parent = outermost.parent;
  const names = memberNames(ts, outermost);
  if (names[0] !== "db") return false;
  const remaining = names.slice(1);
  const direct = remaining[0];
  const supported =
    remaining.length === 0 ||
    (remaining.length === 1 && direct !== undefined && DIRECT_CLIENT_OPERATIONS.has(direct)) ||
    (direct === "query" &&
      remaining.every((name) => name === "query" || !DIRECT_CLIENT_OPERATIONS.has(name)));
  return (
    rootIdentifier(ts, outermost) === moduleName &&
    supported &&
    ((ts.isCallExpression(parent) && parent.expression === outermost && remaining.length > 0) ||
      (ts.isTaggedTemplateExpression(parent) && parent.tag === outermost))
  );
}

function isDeclarationName(ts: TypeScriptAdapter, node: tsNS.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) || ts.isBindingElement(parent) || ts.isParameter(parent)) &&
    parent.name === node
  );
}

function assertSupportedDbAliasUses(
  ts: TypeScriptAdapter,
  callback: tsNS.FunctionLikeDeclaration,
  dbNames: ReadonlySet<string>
): void {
  if (callback.body === undefined) return;
  const visit = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && dbNames.has(node.text)) {
      if (!isDeclarationName(ts, node)) {
        const parent = node.parent;
        if (!ts.isPropertyAccessExpression(parent) || parent.expression !== node)
          fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    if (ts.isPropertyAccessExpression(node)) {
      const root = rootIdentifier(ts, node);
      if (root !== null && dbNames.has(root)) {
        let outermost = node;
        while (
          ts.isPropertyAccessExpression(outermost.parent) &&
          outermost.parent.expression === outermost
        )
          outermost = outermost.parent;
        const parent = outermost.parent;
        const supported =
          (ts.isCallExpression(parent) &&
            parent.expression === outermost &&
            isSupportedClientCall(ts, outermost, dbNames)) ||
          (ts.isTaggedTemplateExpression(parent) && parent.tag === outermost);
        if (!supported) fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
}

function bindingDeclaresName(
  ts: TypeScriptAdapter,
  binding: tsNS.BindingName,
  name: string
): boolean {
  if (ts.isIdentifier(binding)) return binding.text === name;
  return binding.elements.some(
    (element) => ts.isBindingElement(element) && bindingDeclaresName(ts, element.name, name)
  );
}

function nestedFunctionCapturesParameter(
  ts: TypeScriptAdapter,
  node: tsNS.SignatureDeclaration,
  parameterName: string
): boolean {
  if (node.parameters.some((parameter) => bindingDeclaresName(ts, parameter.name, parameterName)))
    return false;
  if (
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
    node.name?.text === parameterName
  )
    return false;
  let captured = false;
  const visit = (candidate: tsNS.Node): void => {
    if (captured) return;
    if (candidate !== node && ts.isFunctionLike(candidate)) {
      if (nestedFunctionCapturesParameter(ts, candidate, parameterName)) captured = true;
      return;
    }
    if (
      ts.isIdentifier(candidate) &&
      candidate.text === parameterName &&
      !isDeclarationName(ts, candidate)
    ) {
      captured = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  for (const parameter of node.parameters)
    if (parameter.initializer !== undefined) visit(parameter.initializer);
  if ("body" in node && node.body !== undefined) visit(node.body);
  return captured;
}

function isExactModuleDbReference(
  ts: TypeScriptAdapter,
  node: tsNS.Identifier,
  parameterName: string
): boolean {
  const parent = node.parent;
  return (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node &&
    isDirectModuleDbAccess(ts, parent, parameterName)
  );
}

function callbackUsesClientDb(
  ts: TypeScriptAdapter,
  callback: tsNS.FunctionLikeDeclaration,
  parameter: tsNS.ParameterDeclaration,
  allowsDirectDbReturn: boolean
): boolean {
  if (callback.body === undefined) return false;
  const destructuredDbName = exactDbBindingName(ts, parameter.name);
  if (destructuredDbName !== null) {
    assertSupportedDbAliasUses(ts, callback, new Set([destructuredDbName]));
    return true;
  }
  const parameterName = parameter.name;
  if (!ts.isIdentifier(parameterName)) fail("query_inventory_scan_invalid", "dynamic-db-import");
  const dbNames = new Set<string>();
  let reachesDb = false;
  const visit = (node: tsNS.Node): void => {
    if (ts.isFunctionLike(node)) {
      if (nestedFunctionCapturesParameter(ts, node, parameterName.text))
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      return;
    }
    if (
      ts.isIdentifier(node) &&
      node.text === parameterName.text &&
      !isDeclarationName(ts, node) &&
      !isExactModuleDbReference(ts, node, parameterName.text)
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === parameterName.text
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.right) &&
      node.right.text === parameterName.text
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      isDirectModuleDbAccess(ts, node, parameterName.text)
    ) {
      reachesDb = true;
      const parent = node.parent;
      if (
        ts.isVariableDeclaration(parent) &&
        parent.initializer === node &&
        ts.isIdentifier(parent.name)
      )
        dbNames.add(parent.name.text);
      else if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        parent.right === node &&
        ts.isIdentifier(parent.left)
      )
        dbNames.add(parent.left.text);
      else if (callback.body !== node || !allowsDirectDbReturn) {
        if (!isSupportedDirectModuleDbUse(ts, node, parameterName.text))
          fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  assertSupportedDbAliasUses(ts, callback, dbNames);
  return reachesDb;
}

function thenPropertyForLiteralDynamicImport(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): tsNS.PropertyAccessExpression | null {
  let expression: tsNS.Expression = node;
  while (
    ts.isParenthesizedExpression(expression.parent) ||
    ts.isAsExpression(expression.parent) ||
    ts.isTypeAssertionExpression(expression.parent) ||
    ts.isNonNullExpression(expression.parent) ||
    ts.isSatisfiesExpression(expression.parent)
  ) {
    expression = expression.parent;
  }
  const parent = expression.parent;
  return ts.isPropertyAccessExpression(parent) &&
    parent.expression === expression &&
    parent.name.text === "then"
    ? parent
    : null;
}

/** Identifies any `.then` property route rooted in a literal dynamic import. */
export function hasLiteralDynamicThenProperty(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): boolean {
  return thenPropertyForLiteralDynamicImport(ts, node) !== null;
}

/** Identifies a literal dynamic import whose module promise is consumed by `.then(...)`. */
export function isLiteralDynamicThenRoute(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): boolean {
  const property = thenPropertyForLiteralDynamicImport(ts, node);
  return (
    property !== null &&
    ts.isCallExpression(property.parent) &&
    property.parent.expression === property
  );
}

function isExactCachedDbProjection(ts: TypeScriptAdapter, node: tsNS.CallExpression): boolean {
  const property = thenPropertyForLiteralDynamicImport(ts, node);
  if (property === null || !ts.isCallExpression(property.parent)) return false;
  const parent = property.parent.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken &&
    parent.right === property.parent &&
    ts.isIdentifier(parent.left) &&
    parent.left.text === "dbPromise"
  );
}

/** Returns callback bindings for `import("../db/client").then(...)`, or null when not a `.then` route. */
export function collectLiteralDynamicClientThenBinding(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): LiteralDynamicClientThenBinding | null {
  if (!isLiteralDynamicThenRoute(ts, node)) return null;
  const property = thenPropertyForLiteralDynamicImport(ts, node);
  if (property === null || !ts.isCallExpression(property.parent)) return null;
  const callback = property.parent.arguments[0];
  if (
    callback === undefined ||
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
  )
    fail("query_inventory_scan_invalid", "dynamic-db-import");
  if (callback.parameters.length !== 1) fail("query_inventory_scan_invalid", "dynamic-db-import");
  const [parameter] = callback.parameters;
  if (
    parameter === undefined ||
    parameter.dotDotDotToken !== undefined ||
    parameter.initializer !== undefined
  )
    fail("query_inventory_scan_invalid", "dynamic-db-import");
  if (ts.isIdentifier(parameter.name)) {
    const names = Object.freeze([parameter.name.text]);
    callbackUsesClientDb(ts, callback, parameter, isExactCachedDbProjection(ts, node));
    return Object.freeze({
      declarations: Object.freeze([parameter.name]),
      node,
      names,
      namespaceNames: names,
      namespaceDeclaration: parameter.name,
      dbBindingNames: Object.freeze([]),
    });
  }
  const dbBindingDeclaration = exactDbBindingDeclaration(ts, parameter.name);
  if (dbBindingDeclaration === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
  const dbBindingName = dbBindingDeclaration.text;
  const names = Object.freeze([dbBindingName]);
  callbackUsesClientDb(ts, callback, parameter, false);
  return Object.freeze({
    declarations: Object.freeze([dbBindingDeclaration]),
    node,
    names,
    namespaceNames: Object.freeze([]),
    namespaceDeclaration: null,
    dbBindingNames: names,
  });
}
