/**
 * Fail-closed taint analysis for non-literal dynamic-import capabilities.
 *
 * The inventory accepts generic dynamic imports only when their values never
 * reach a database-shaped capability. Alias propagation is deliberately
 * source-only and conservative: unsupported escape forms retain no silent
 * database-call path.
 */
import type * as tsNS from "typescript";

import { fail } from "./contracts";

type TypeScriptAdapter = typeof tsNS;

const POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS = new Set([
  "db",
  "database",
  "client",
  "session",
  "sql",
  "query",
  "select",
  "execute",
  "insert",
  "update",
  "delete",
  "transaction",
  "batch",
  "postgres",
  "drizzle",
  "withSessionDatabaseClient",
]);

function bindingNames(ts: TypeScriptAdapter, pattern: tsNS.BindingName): readonly string[] {
  if (ts.isIdentifier(pattern)) return [pattern.text];
  const names: string[] = [];
  const visit = (node: tsNS.BindingName): void => {
    if (ts.isIdentifier(node)) {
      names.push(node.text);
      return;
    }
    for (const element of node.elements) if (ts.isBindingElement(element)) visit(element.name);
  };
  visit(pattern);
  return names;
}

function bindingPropertyName(ts: TypeScriptAdapter, element: tsNS.BindingElement): string | null {
  const property = element.propertyName;
  if (property === undefined) return ts.isIdentifier(element.name) ? element.name.text : null;
  return ts.isIdentifier(property) || ts.isStringLiteral(property) ? property.text : null;
}

function unwrapExpressionParents(ts: TypeScriptAdapter, node: tsNS.Node): tsNS.Node {
  let cursor: tsNS.Node = node;
  while (
    ts.isAwaitExpression(cursor.parent) ||
    ts.isParenthesizedExpression(cursor.parent) ||
    ts.isAsExpression(cursor.parent) ||
    ts.isTypeAssertionExpression(cursor.parent) ||
    ts.isNonNullExpression(cursor.parent) ||
    ts.isSatisfiesExpression(cursor.parent)
  ) {
    cursor = cursor.parent;
  }
  return cursor;
}

function isPromiseAllCall(ts: TypeScriptAdapter, node: tsNS.Node): node is tsNS.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "Promise" &&
    node.expression.name.text === "all"
  );
}

function isAwaitedThroughTransparentWrappers(ts: TypeScriptAdapter, node: tsNS.Node): boolean {
  let cursor = node;
  while (true) {
    const parent = cursor.parent;
    if (ts.isAwaitExpression(parent)) return parent.expression === cursor;
    if (
      (ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isNonNullExpression(parent) ||
        ts.isSatisfiesExpression(parent)) &&
      parent.expression === cursor
    ) {
      cursor = parent;
      continue;
    }
    return false;
  }
}

/** Returns the local binding that receives a directly awaited or awaited Promise.all import. */
export function dynamicImportBindingName(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): tsNS.BindingName | null {
  const direct = unwrapExpressionParents(ts, node);
  if (ts.isVariableDeclaration(direct.parent) && isAwaitedThroughTransparentWrappers(ts, node))
    return direct.parent.name;
  if (!ts.isArrayLiteralExpression(node.parent)) return null;
  const elementIndex = node.parent.elements.findIndex((element) => element === node);
  if (elementIndex < 0 || !isPromiseAllCall(ts, node.parent.parent)) return null;
  if (!isAwaitedThroughTransparentWrappers(ts, node.parent.parent)) return null;
  const promise = unwrapExpressionParents(ts, node.parent.parent);
  if (!ts.isVariableDeclaration(promise.parent) || !ts.isArrayBindingPattern(promise.parent.name))
    return null;
  const binding = promise.parent.name.elements[elementIndex];
  return binding !== undefined &&
    ts.isBindingElement(binding) &&
    binding.dotDotDotToken === undefined &&
    binding.initializer === undefined
    ? binding.name
    : null;
}

function rootIdentifier(ts: TypeScriptAdapter, expression: tsNS.Expression): string | null {
  let cursor: tsNS.Expression = expression;
  while (true) {
    if (ts.isIdentifier(cursor)) return cursor.text;
    if (ts.isPropertyAccessExpression(cursor) || ts.isElementAccessExpression(cursor)) {
      cursor = cursor.expression;
      continue;
    }
    if (
      ts.isParenthesizedExpression(cursor) ||
      ts.isAsExpression(cursor) ||
      ts.isTypeAssertionExpression(cursor) ||
      ts.isNonNullExpression(cursor) ||
      ts.isSatisfiesExpression(cursor) ||
      ts.isAwaitExpression(cursor)
    ) {
      cursor = cursor.expression;
      continue;
    }
    return null;
  }
}

function addNames(bindings: Set<string>, names: readonly string[]): boolean {
  let changed = false;
  for (const name of names) {
    if (!bindings.has(name)) {
      bindings.add(name);
      changed = true;
    }
  }
  return changed;
}

function expressionUsesTrackedBinding(
  ts: TypeScriptAdapter,
  node: tsNS.Node,
  bindings: ReadonlySet<string>
): boolean {
  if (ts.isSpreadElement(node)) return expressionUsesTrackedBinding(ts, node.expression, bindings);
  if (!ts.isExpression(node)) return false;
  const expression = node;
  const root = rootIdentifier(ts, expression);
  if (root !== null && bindings.has(root)) return true;
  if (ts.isPropertyAccessExpression(expression))
    return expressionUsesTrackedBinding(ts, expression.expression, bindings);
  if (ts.isElementAccessExpression(expression)) {
    return (
      expressionUsesTrackedBinding(ts, expression.expression, bindings) ||
      (expression.argumentExpression !== undefined &&
        expressionUsesTrackedBinding(ts, expression.argumentExpression, bindings))
    );
  }
  if (ts.isCallExpression(expression)) {
    return (
      expressionUsesTrackedBinding(ts, expression.expression, bindings) ||
      expression.arguments.some((argument) => expressionUsesTrackedBinding(ts, argument, bindings))
    );
  }
  if (ts.isNewExpression(expression)) {
    return (
      expressionUsesTrackedBinding(ts, expression.expression, bindings) ||
      (expression.arguments?.some((argument) =>
        expressionUsesTrackedBinding(ts, argument, bindings)
      ) ??
        false)
    );
  }
  if (
    ts.isAwaitExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return expressionUsesTrackedBinding(ts, expression.expression, bindings);
  }
  if (
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      expression.operatorToken.kind === ts.SyntaxKind.CommaToken)
  ) {
    return (
      expressionUsesTrackedBinding(ts, expression.left, bindings) ||
      expressionUsesTrackedBinding(ts, expression.right, bindings)
    );
  }
  if (ts.isConditionalExpression(expression)) {
    return (
      expressionUsesTrackedBinding(ts, expression.whenTrue, bindings) ||
      expressionUsesTrackedBinding(ts, expression.whenFalse, bindings)
    );
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.some(
      (element) =>
        (ts.isExpression(element) || ts.isSpreadElement(element)) &&
        expressionUsesTrackedBinding(ts, element, bindings)
    );
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      if (ts.isPropertyAssignment(property))
        return expressionUsesTrackedBinding(ts, property.initializer, bindings);
      if (ts.isShorthandPropertyAssignment(property)) return bindings.has(property.name.text);
      return (
        ts.isSpreadAssignment(property) &&
        expressionUsesTrackedBinding(ts, property.expression, bindings)
      );
    });
  }
  return false;
}

function expressionHasPotentialCapabilityMember(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): boolean {
  if (ts.isPropertyAccessExpression(expression)) {
    return (
      POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS.has(expression.name.text) ||
      expressionHasPotentialCapabilityMember(ts, expression.expression)
    );
  }
  if (ts.isElementAccessExpression(expression)) return true;
  if (ts.isCallExpression(expression) || ts.isNewExpression(expression)) {
    return (
      expressionHasPotentialCapabilityMember(ts, expression.expression) ||
      (expression.arguments?.some((argument) =>
        expressionHasPotentialCapabilityMember(ts, argument)
      ) ??
        false)
    );
  }
  if (
    ts.isAwaitExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return expressionHasPotentialCapabilityMember(ts, expression.expression);
  }
  return false;
}

function hasInlineCallback(
  ts: TypeScriptAdapter,
  argumentsList: readonly tsNS.Expression[]
): boolean {
  let found = false;
  const visit = (node: tsNS.Node): void => {
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  for (const argument of argumentsList) visit(argument);
  return found;
}

function bindingPatternContainsPotentialCapability(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName
): boolean {
  if (ts.isIdentifier(pattern)) return false;
  if (ts.isArrayBindingPattern(pattern)) {
    return pattern.elements.some(
      (element) =>
        element !== undefined &&
        ts.isBindingElement(element) &&
        bindingPatternContainsPotentialCapability(ts, element.name)
    );
  }
  return pattern.elements.some((element) => {
    const property = bindingPropertyName(ts, element);
    return (
      (property !== null && POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS.has(property)) ||
      bindingPatternContainsPotentialCapability(ts, element.name)
    );
  });
}

function assignmentTargetNames(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): readonly string[] | null {
  if (ts.isIdentifier(target)) return [target.text];
  if (ts.isParenthesizedExpression(target)) return assignmentTargetNames(ts, target.expression);
  if (ts.isArrayLiteralExpression(target)) {
    const names: string[] = [];
    for (const element of target.elements) {
      if (element === undefined || ts.isOmittedExpression(element)) continue;
      const elementNames = ts.isSpreadElement(element)
        ? assignmentTargetNames(ts, element.expression)
        : assignmentTargetNames(ts, element);
      if (elementNames === null) return null;
      names.push(...elementNames);
    }
    return names;
  }
  if (ts.isObjectLiteralExpression(target)) {
    const names: string[] = [];
    for (const property of target.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        names.push(property.name.text);
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const propertyNames = assignmentTargetNames(ts, property.initializer);
        if (propertyNames === null) return null;
        names.push(...propertyNames);
        continue;
      }
      if (ts.isSpreadAssignment(property)) {
        const propertyNames = assignmentTargetNames(ts, property.expression);
        if (propertyNames === null) return null;
        names.push(...propertyNames);
        continue;
      }
      return null;
    }
    return names;
  }
  return null;
}

function assignmentTargetContainsPotentialCapability(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): boolean {
  if (ts.isParenthesizedExpression(target))
    return assignmentTargetContainsPotentialCapability(ts, target.expression);
  if (ts.isArrayLiteralExpression(target)) {
    return target.elements.some(
      (element) =>
        element !== undefined &&
        !ts.isOmittedExpression(element) &&
        assignmentTargetContainsPotentialCapability(
          ts,
          ts.isSpreadElement(element) ? element.expression : element
        )
    );
  }
  if (!ts.isObjectLiteralExpression(target)) return false;
  return target.properties.some((property) => {
    if (ts.isShorthandPropertyAssignment(property))
      return POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS.has(property.name.text);
    if (ts.isPropertyAssignment(property)) {
      const name =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : null;
      return (
        (name !== null && POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS.has(name)) ||
        assignmentTargetContainsPotentialCapability(ts, property.initializer)
      );
    }
    return (
      ts.isSpreadAssignment(property) &&
      assignmentTargetContainsPotentialCapability(ts, property.expression)
    );
  });
}

function isDirectSafeDefaultExport(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  sourceBindings: ReadonlySet<string>
): boolean {
  if (
    ts.isAwaitExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return isDirectSafeDefaultExport(ts, expression.expression, sourceBindings);
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    sourceBindings.has(expression.expression.text) &&
    expression.name.text === "default"
  );
}

function expressionEscapesTrackedBinding(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlySet<string>,
  sourceBindings: ReadonlySet<string>
): boolean {
  return (
    !isDirectSafeDefaultExport(ts, expression, sourceBindings) &&
    expressionUsesTrackedBinding(ts, expression, bindings)
  );
}

function functionReturnsTrackedEscape(
  ts: TypeScriptAdapter,
  node: tsNS.FunctionLikeDeclaration,
  bindings: ReadonlySet<string>,
  sourceBindings: ReadonlySet<string>
): boolean {
  if (node.body === undefined) return false;
  if (!ts.isBlock(node.body))
    return expressionEscapesTrackedBinding(ts, node.body, bindings, sourceBindings);
  let escapes = false;
  const visit = (candidate: tsNS.Node): void => {
    if (escapes || (candidate !== node.body && ts.isFunctionLike(candidate))) return;
    if (
      ts.isReturnStatement(candidate) &&
      candidate.expression !== undefined &&
      expressionEscapesTrackedBinding(ts, candidate.expression, bindings, sourceBindings)
    ) {
      escapes = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node.body);
  return escapes;
}

function isFunctionWithBody(
  ts: TypeScriptAdapter,
  node: tsNS.Node
): node is tsNS.FunctionLikeDeclaration {
  return ts.isFunctionLike(node) && "body" in node && node.body !== undefined;
}

function assignmentTargetContainsTrackedDefault(
  ts: TypeScriptAdapter,
  node: tsNS.Node,
  bindings: ReadonlySet<string>
): boolean {
  let found = false;
  const visit = (candidate: tsNS.Node): void => {
    if (found) return;
    if (
      ts.isShorthandPropertyAssignment(candidate) &&
      candidate.objectAssignmentInitializer !== undefined &&
      expressionUsesTrackedBinding(ts, candidate.objectAssignmentInitializer, bindings)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

type SafeDefaultFactories = Readonly<{
  identifiers: ReadonlySet<string>;
  members: ReadonlySet<string>;
  sourceBindings: ReadonlySet<string>;
}>;

function returnsSafeDefault(
  ts: TypeScriptAdapter,
  node: tsNS.FunctionLikeDeclaration,
  sourceBindings: ReadonlySet<string>
): boolean {
  if (node.body === undefined) return false;
  if (!ts.isBlock(node.body)) return isDirectSafeDefaultExport(ts, node.body, sourceBindings);
  let found = false;
  const visit = (candidate: tsNS.Node): void => {
    if (found || (candidate !== node.body && ts.isFunctionLike(candidate))) return;
    if (
      ts.isReturnStatement(candidate) &&
      candidate.expression !== undefined &&
      isDirectSafeDefaultExport(ts, candidate.expression, sourceBindings)
    )
      found = true;
    else ts.forEachChild(candidate, visit);
  };
  visit(node.body);
  return found;
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

function directSafeDefaultFactories(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  sourceBindings: ReadonlySet<string>
): SafeDefaultFactories {
  const identifiers = new Set<string>();
  const members = new Set<string>();
  const visit = (node: tsNS.Node): void => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      returnsSafeDefault(ts, node, sourceBindings)
    )
      identifiers.add(node.name.text);
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      if (
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
        returnsSafeDefault(ts, node.initializer, sourceBindings)
      )
        identifiers.add(node.name.text);
      if (ts.isObjectLiteralExpression(node.initializer))
        for (const property of node.initializer.properties) {
          if (
            (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) ||
            (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
          )
            continue;
          const factory = ts.isPropertyAssignment(property) ? property.initializer : property;
          if (
            (ts.isArrowFunction(factory) ||
              ts.isFunctionExpression(factory) ||
              ts.isMethodDeclaration(factory)) &&
            returnsSafeDefault(ts, factory, sourceBindings)
          )
            members.add(`${node.name.text}.${property.name.text}`);
        }
    }
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      returnsSafeDefault(ts, node, sourceBindings) &&
      !isDirectFactoryIife(ts, node)
    ) {
      const parent = node.parent;
      const named =
        ts.isVariableDeclaration(parent) &&
        parent.initializer === node &&
        ts.isIdentifier(parent.name);
      const member = ts.isPropertyAssignment(parent) && parent.initializer === node;
      if (!named && !member) fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze({ identifiers, members, sourceBindings });
}

function unwrapFactoryCall(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.CallExpression | null {
  let current = expression;
  while (
    ts.isAwaitExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  )
    current = current.expression;
  return ts.isCallExpression(current) ? current : null;
}

function isSafeDefaultFactoryCall(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  factories: SafeDefaultFactories
): boolean {
  const call = unwrapFactoryCall(ts, expression);
  if (call === null) return false;
  let callee: tsNS.Expression = call.expression;
  while (
    ts.isParenthesizedExpression(callee) ||
    ts.isAsExpression(callee) ||
    ts.isTypeAssertionExpression(callee) ||
    ts.isNonNullExpression(callee) ||
    ts.isSatisfiesExpression(callee)
  )
    callee = callee.expression;
  if (
    (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee)) &&
    returnsSafeDefault(ts, callee, factories.sourceBindings)
  )
    return true;
  if (ts.isIdentifier(callee)) return factories.identifiers.has(callee.text);
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    factories.members.has(`${callee.expression.text}.${callee.name.text}`)
  );
}

function isSafeDefaultFactoryValue(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  factories: SafeDefaultFactories
): boolean {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  )
    return isSafeDefaultFactoryValue(ts, expression.expression, factories);
  const call = unwrapFactoryCall(ts, expression);
  if (call !== null) return isSafeDefaultFactoryCall(ts, expression, factories);
  if (ts.isIdentifier(expression))
    return (
      factories.identifiers.has(expression.text) ||
      [...factories.members].some((member) => member.startsWith(`${expression.text}.`))
    );
  if (ts.isPropertyAccessExpression(expression))
    return (
      isSafeDefaultFactoryValue(ts, expression.expression, factories) ||
      (ts.isIdentifier(expression.expression) &&
        factories.members.has(`${expression.expression.text}.${expression.name.text}`))
    );
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.CommaToken
  )
    return (
      isSafeDefaultFactoryValue(ts, expression.left, factories) ||
      isSafeDefaultFactoryValue(ts, expression.right, factories)
    );
  return false;
}

function callResultReachesPotentialCapability(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression
): boolean {
  let cursor: tsNS.Node = node;
  while (true) {
    const parent = cursor.parent;
    if (
      (ts.isAwaitExpression(parent) ||
        ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isNonNullExpression(parent) ||
        ts.isSatisfiesExpression(parent)) &&
      parent.expression === cursor
    ) {
      cursor = parent;
      continue;
    }
    if (ts.isPropertyAccessExpression(parent) && parent.expression === cursor) {
      if (POTENTIAL_DYNAMIC_CAPABILITY_MEMBERS.has(parent.name.text)) return true;
      cursor = parent;
      continue;
    }
    if (ts.isCallExpression(parent))
      return parent.expression === cursor || parent.arguments.includes(cursor as tsNS.Expression);
    if (ts.isTaggedTemplateExpression(parent)) return parent.tag === cursor;
    if (
      ts.isArrayLiteralExpression(parent) ||
      ts.isObjectLiteralExpression(parent) ||
      ts.isSpreadElement(parent)
    )
      return true;
    return ts.isElementAccessExpression(parent) && parent.expression === cursor;
  }
}

export function collectNonliteralDynamicImportBinding(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression,
  bindings: Set<string>
): void {
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return;
  const [argument] = node.arguments;
  if (argument === undefined || ts.isStringLiteral(argument)) return;
  const binding = dynamicImportBindingName(ts, node);
  if (binding === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
  addNames(bindings, bindingNames(ts, binding));
}

function propagateAliases(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  bindings: Set<string>,
  sourceBindings: ReadonlySet<string>,
  safeDefaultFactories: SafeDefaultFactories
): void {
  let changed = true;
  while (changed) {
    changed = false;
    const visit = (node: tsNS.Node): void => {
      if (
        (ts.isParameter(node) || ts.isBindingElement(node)) &&
        node.initializer !== undefined &&
        expressionUsesTrackedBinding(ts, node.initializer, bindings)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        isFunctionWithBody(ts, node) &&
        functionReturnsTrackedEscape(ts, node, bindings, sourceBindings)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer !== undefined &&
        isSafeDefaultFactoryValue(ts, node.initializer, safeDefaultFactories) &&
        !isSafeDefaultFactoryCall(ts, node.initializer, safeDefaultFactories)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer !== undefined &&
        (expressionUsesTrackedBinding(ts, node.initializer, bindings) ||
          isSafeDefaultFactoryCall(ts, node.initializer, safeDefaultFactories))
      ) {
        if (bindingPatternContainsPotentialCapability(ts, node.name))
          fail("query_inventory_scan_invalid", "dynamic-db-import");
        changed = addNames(bindings, bindingNames(ts, node.name)) || changed;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        (expressionUsesTrackedBinding(ts, node.right, bindings) ||
          isSafeDefaultFactoryCall(ts, node.right, safeDefaultFactories))
      ) {
        if (assignmentTargetContainsPotentialCapability(ts, node.left))
          fail("query_inventory_scan_invalid", "dynamic-db-import");
        const names = assignmentTargetNames(ts, node.left);
        if (names === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
        changed = addNames(bindings, names) || changed;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isSafeDefaultFactoryValue(ts, node.right, safeDefaultFactories) &&
        !isSafeDefaultFactoryCall(ts, node.right, safeDefaultFactories)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
}

/** Rejects any non-literal dynamic-import route that reaches a DB capability. */
export function assertNoPotentialNonliteralDynamicCapabilityUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  collectedBindings: ReadonlySet<string> = new Set<string>()
): void {
  const sourceBindings = new Set(collectedBindings);
  const bindings = new Set(sourceBindings);
  if (bindings.size === 0) return;
  const safeDefaultFactories = directSafeDefaultFactories(ts, sourceFile, sourceBindings);
  propagateAliases(ts, sourceFile, bindings, sourceBindings, safeDefaultFactories);
  const visit = (node: tsNS.Node): void => {
    if (ts.isForOfStatement(node) && expressionUsesTrackedBinding(ts, node.expression, bindings))
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    if (
      ts.isThrowStatement(node) &&
      node.expression !== undefined &&
      expressionUsesTrackedBinding(ts, node.expression, bindings)
    )
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    if (
      ts.isYieldExpression(node) &&
      node.expression !== undefined &&
      expressionUsesTrackedBinding(ts, node.expression, bindings)
    )
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (
        (operator === ts.SyntaxKind.BarBarEqualsToken ||
          operator === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
          operator === ts.SyntaxKind.QuestionQuestionEqualsToken) &&
        expressionUsesTrackedBinding(ts, node.right, bindings)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      if (
        operator === ts.SyntaxKind.EqualsToken &&
        assignmentTargetContainsTrackedDefault(ts, node.left, bindings)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isNewExpression(node) &&
      (expressionUsesTrackedBinding(ts, node.expression, bindings) ||
        (node.arguments?.some((argument) => expressionUsesTrackedBinding(ts, argument, bindings)) ??
          false))
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (ts.isCallExpression(node)) {
      if (
        isSafeDefaultFactoryValue(ts, node.expression, safeDefaultFactories) &&
        !isSafeDefaultFactoryCall(ts, node, safeDefaultFactories)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      if (
        isSafeDefaultFactoryCall(ts, node, safeDefaultFactories) &&
        callResultReachesPotentialCapability(ts, node)
      )
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      if (ts.isIdentifier(node.expression) && bindings.has(node.expression.text)) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        expressionUsesTrackedBinding(ts, node.expression, bindings) &&
        expressionHasPotentialCapabilityMember(ts, node.expression)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        node.arguments.length > 0 &&
        expressionUsesTrackedBinding(ts, node.expression, bindings) &&
        !isDirectSafeDefaultExport(ts, node.expression, sourceBindings)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        ts.isElementAccessExpression(node.expression) &&
        expressionUsesTrackedBinding(ts, node.expression, bindings)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        node.expression.kind !== ts.SyntaxKind.ImportKeyword &&
        node.arguments.some((argument) => expressionUsesTrackedBinding(ts, argument, bindings))
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        expressionUsesTrackedBinding(ts, node.expression, bindings) &&
        hasInlineCallback(ts, node.arguments)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    if (
      ts.isTaggedTemplateExpression(node) &&
      expressionUsesTrackedBinding(ts, node.tag, bindings)
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      expressionUsesTrackedBinding(ts, node, bindings) &&
      expressionHasPotentialCapabilityMember(ts, node)
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    if (
      ts.isElementAccessExpression(node) &&
      expressionUsesTrackedBinding(ts, node.expression, bindings)
    ) {
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
