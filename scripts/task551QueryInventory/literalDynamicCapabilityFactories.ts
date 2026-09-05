/** Factory and dependency-container analysis for literal dynamic capabilities. */
import type * as tsNS from "typescript";

type TypeScriptAdapter = typeof tsNS;
type Resolver = (reference: tsNS.Identifier) => tsNS.Identifier | null;
type TransparentExpression =
  | tsNS.ParenthesizedExpression
  | tsNS.AsExpression
  | tsNS.TypeAssertion
  | tsNS.NonNullExpression
  | tsNS.SatisfiesExpression
  | tsNS.AwaitExpression;

export type LiteralDynamicCapabilityKind =
  "drizzle-executor" | "postgres" | "drizzle" | "session-wrapper";
export type LiteralDynamicCapabilityObjectFactory = ReadonlyMap<
  string,
  LiteralDynamicCapabilityKind
>;
export type ObjectFactoryContainer = Readonly<{
  properties: LiteralDynamicCapabilityObjectFactory;
  parameter: tsNS.ParameterDeclaration;
}>;
export type LiteralDynamicCapabilityFactoryAnalysis = Readonly<{
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>;
  objectFactories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>;
  objectContainers: ReadonlyMap<tsNS.Identifier, ObjectFactoryContainer>;
  namedFunctions: ReadonlyMap<tsNS.Identifier, tsNS.FunctionLikeDeclaration>;
  directFactoryObjectReturn: (
    reference: tsNS.Identifier,
    kind: LiteralDynamicCapabilityKind
  ) => boolean;
  directFactoryReturn: (reference: tsNS.Identifier, kind: LiteralDynamicCapabilityKind) => boolean;
  factoryCallKind: (expression: tsNS.Expression) => LiteralDynamicCapabilityKind | null;
  isAllowedObjectFactoryCallResult: (expression: tsNS.Expression) => boolean;
  objectFactoryCall: (expression: tsNS.Expression) => LiteralDynamicCapabilityObjectFactory | null;
}>;

export type IsProvenLiteralDynamicDatabaseExpression = (expression: tsNS.Expression) => boolean;

function isTransparentExpression(
  ts: TypeScriptAdapter,
  node: tsNS.Node
): node is TransparentExpression {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isAwaitExpression(node)
  );
}

function outerTransparentExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let outer = expression;
  while (isTransparentExpression(ts, outer.parent) && outer.parent.expression === outer)
    outer = outer.parent;
  return outer;
}

function unwrapCapabilityValue(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let current = expression;
  while (isTransparentExpression(ts, current)) current = current.expression;
  return current;
}

function isExecutableFunctionLike(
  ts: TypeScriptAdapter,
  node: tsNS.Node
): node is tsNS.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

function capabilityForReference(
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  reference: tsNS.Identifier
): LiteralDynamicCapabilityKind | null {
  const declaration = resolver(reference);
  return declaration === null ? null : (bindings.get(declaration) ?? null);
}

function exactCapabilityAlias(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  expression: tsNS.Expression
): LiteralDynamicCapabilityKind | null {
  const unwrapped = outerTransparentExpression(ts, expression);
  return ts.isIdentifier(unwrapped) ? capabilityForReference(resolver, bindings, unwrapped) : null;
}

function functionBinding(
  ts: TypeScriptAdapter,
  node: tsNS.FunctionLikeDeclaration
): tsNS.Identifier | null {
  if (ts.isFunctionDeclaration(node)) return node.name ?? null;
  const parent = node.parent;
  return ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name)
    ? parent.name
    : null;
}

function directFunctionIife(ts: TypeScriptAdapter, node: tsNS.FunctionLikeDeclaration): boolean {
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
  const parent = node.parent;
  if (ts.isCallExpression(parent)) return parent.expression === node;
  return (
    ts.isParenthesizedExpression(parent) &&
    parent.expression === node &&
    ts.isCallExpression(parent.parent) &&
    parent.parent.expression === parent
  );
}

function exportedFunction(ts: TypeScriptAdapter, node: tsNS.FunctionLikeDeclaration): boolean {
  const hasExport = (candidate: tsNS.Node): boolean =>
    ts.canHaveModifiers(candidate) &&
    ts
      .getModifiers(candidate)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
  if (ts.isFunctionDeclaration(node)) return hasExport(node);
  const parent = node.parent;
  const statement =
    ts.isVariableDeclaration(parent) &&
    ts.isVariableDeclarationList(parent.parent) &&
    ts.isVariableStatement(parent.parent.parent)
      ? parent.parent.parent
      : null;
  return statement !== null && hasExport(statement);
}

function enclosingFunction(
  ts: TypeScriptAdapter,
  node: tsNS.Node
): tsNS.FunctionLikeDeclaration | null {
  let cursor: tsNS.Node | undefined = node.parent;
  while (cursor !== undefined) {
    if (isExecutableFunctionLike(ts, cursor)) return cursor;
    cursor = cursor.parent;
  }
  return null;
}

function factoryOwnsDirectCapabilityBinding(
  ts: TypeScriptAdapter,
  factory: tsNS.FunctionLikeDeclaration,
  sourceBindings: ReadonlySet<tsNS.Identifier>
): boolean {
  for (const declaration of sourceBindings)
    if (enclosingFunction(ts, declaration) === factory) return true;
  return false;
}

function functionReturnedCapabilityKind(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  factory: tsNS.FunctionLikeDeclaration
): LiteralDynamicCapabilityKind | null {
  if (factory.body === undefined) return null;
  if (!ts.isBlock(factory.body)) return exactCapabilityAlias(ts, resolver, bindings, factory.body);
  let returned: LiteralDynamicCapabilityKind | null = null;
  let valid = true;
  let count = 0;
  const visit = (node: tsNS.Node): void => {
    if (!valid || (node !== factory.body && ts.isFunctionLike(node))) return;
    if (ts.isReturnStatement(node)) {
      count += 1;
      const kind =
        node.expression === undefined
          ? null
          : exactCapabilityAlias(ts, resolver, bindings, node.expression);
      if (kind === null || (returned !== null && returned !== kind)) valid = false;
      else returned = kind;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(factory.body);
  return valid && count > 0 ? returned : null;
}

function collectFactories(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  sourceBindings: ReadonlySet<tsNS.Identifier>
): ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind> {
  const factories = new Map<tsNS.Identifier, LiteralDynamicCapabilityKind>();
  const visit = (node: tsNS.Node): void => {
    if (
      isExecutableFunctionLike(ts, node) &&
      !directFunctionIife(ts, node) &&
      !exportedFunction(ts, node) &&
      factoryOwnsDirectCapabilityBinding(ts, node, sourceBindings)
    ) {
      const declaration = functionBinding(ts, node);
      const kind =
        declaration === null ? null : functionReturnedCapabilityKind(ts, resolver, bindings, node);
      if (declaration !== null && kind !== null) factories.set(declaration, kind);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return factories;
}

function sameObjectFactoryProperties(
  left: ReadonlyMap<string, LiteralDynamicCapabilityKind>,
  right: ReadonlyMap<string, LiteralDynamicCapabilityKind>
): boolean {
  return left.size === right.size && [...left].every(([name, kind]) => right.get(name) === kind);
}

function objectFactoryProperties(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  sourceBindings: ReadonlySet<tsNS.Identifier>,
  factory: tsNS.FunctionLikeDeclaration
): LiteralDynamicCapabilityObjectFactory | null {
  if (factory.body === undefined || !ts.isBlock(factory.body)) return null;
  let returned: ReadonlyMap<string, LiteralDynamicCapabilityKind> | null = null;
  let valid = true;
  let count = 0;
  const visit = (node: tsNS.Node): void => {
    if (!valid || (node !== factory.body && ts.isFunctionLike(node))) return;
    if (ts.isReturnStatement(node)) {
      count += 1;
      const expression =
        node.expression === undefined ? null : unwrapCapabilityValue(ts, node.expression);
      if (expression === null || !ts.isObjectLiteralExpression(expression)) {
        valid = false;
        return;
      }
      const properties = new Map<string, LiteralDynamicCapabilityKind>();
      for (const property of expression.properties) {
        if (
          !ts.isShorthandPropertyAssignment(property) ||
          property.objectAssignmentInitializer !== undefined
        )
          continue;
        const declaration = resolver(property.name);
        const kind =
          declaration === null ||
          !sourceBindings.has(declaration) ||
          enclosingFunction(ts, declaration) !== factory
            ? null
            : (bindings.get(declaration) ?? null);
        if (kind !== null) properties.set(property.name.text, kind);
      }
      if (
        properties.size === 0 ||
        (returned !== null && !sameObjectFactoryProperties(returned, properties))
      )
        valid = false;
      else returned = properties;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(factory.body);
  return valid && count > 0 ? returned : null;
}

function collectObjectFactories(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  sourceBindings: ReadonlySet<tsNS.Identifier>
): ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory> {
  const factories = new Map<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>();
  const visit = (node: tsNS.Node): void => {
    if (
      isExecutableFunctionLike(ts, node) &&
      !directFunctionIife(ts, node) &&
      !exportedFunction(ts, node) &&
      factoryOwnsDirectCapabilityBinding(ts, node, sourceBindings)
    ) {
      const declaration = functionBinding(ts, node);
      const properties =
        declaration === null
          ? null
          : objectFactoryProperties(ts, resolver, bindings, sourceBindings, node);
      if (declaration !== null && properties !== null) factories.set(declaration, properties);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return factories;
}

function factoryCallKind(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  expression: tsNS.Expression
): LiteralDynamicCapabilityKind | null {
  const value = unwrapCapabilityValue(ts, expression);
  if (!ts.isCallExpression(value)) return null;
  const callee = value.expression;
  if (ts.isIdentifier(callee)) {
    const declaration = resolver(callee);
    return declaration === null ? null : (factories.get(declaration) ?? null);
  }
  const iife =
    ts.isArrowFunction(callee) || ts.isFunctionExpression(callee)
      ? callee
      : ts.isParenthesizedExpression(callee) &&
          (ts.isArrowFunction(callee.expression) || ts.isFunctionExpression(callee.expression))
        ? callee.expression
        : null;
  return iife !== null && directFunctionIife(ts, iife)
    ? functionReturnedCapabilityKind(ts, resolver, bindings, iife)
    : null;
}

function collectFactoryResultAliases(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: Map<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>
): void {
  let changed = true;
  while (changed) {
    changed = false;
    const add = (declaration: tsNS.Identifier, kind: LiteralDynamicCapabilityKind): void => {
      if (bindings.has(declaration)) return;
      bindings.set(declaration, kind);
      changed = true;
    };
    const visit = (node: tsNS.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer !== undefined &&
        ts.isIdentifier(node.name)
      ) {
        const kind = factoryCallKind(ts, resolver, bindings, factories, node.initializer);
        if (kind !== null) add(node.name, kind);
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
      ) {
        const kind = factoryCallKind(ts, resolver, bindings, factories, node.right);
        const declaration = resolver(node.left);
        if (kind !== null && declaration !== null) add(declaration, kind);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
}

function directFactoryReturn(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  reference: tsNS.Identifier,
  kind: LiteralDynamicCapabilityKind
): boolean {
  const outer = outerTransparentExpression(ts, reference);
  if (!(
    (ts.isReturnStatement(outer.parent) && outer.parent.expression === outer) ||
    (ts.isArrowFunction(outer.parent) && outer.parent.body === outer)
  ))
    return false;
  const factory = enclosingFunction(ts, reference);
  if (factory === null) return false;
  if (directFunctionIife(ts, factory))
    return functionReturnedCapabilityKind(ts, resolver, bindings, factory) === kind;
  const declaration = functionBinding(ts, factory);
  return declaration !== null && factories.get(declaration) === kind;
}

function directFactoryObjectReturn(
  ts: TypeScriptAdapter,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>,
  reference: tsNS.Identifier,
  kind: LiteralDynamicCapabilityKind
): boolean {
  const property = reference.parent;
  if (
    !ts.isShorthandPropertyAssignment(property) ||
    property.name !== reference ||
    property.objectAssignmentInitializer !== undefined
  )
    return false;
  const object = property.parent;
  if (!ts.isObjectLiteralExpression(object)) return false;
  const outer = outerTransparentExpression(ts, object);
  if (!ts.isReturnStatement(outer.parent) || outer.parent.expression !== outer) return false;
  const factory = enclosingFunction(ts, object);
  if (factory === null) return false;
  const declaration = functionBinding(ts, factory);
  return declaration !== null && factories.get(declaration)?.get(property.name.text) === kind;
}

function objectFactoryCall(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>,
  expression: tsNS.Expression
): LiteralDynamicCapabilityObjectFactory | null {
  const value = unwrapCapabilityValue(ts, expression);
  if (!ts.isCallExpression(value) || !ts.isIdentifier(value.expression)) return null;
  const declaration = resolver(value.expression);
  return declaration === null ? null : (factories.get(declaration) ?? null);
}

function objectFactoryBindingPropertyName(
  ts: TypeScriptAdapter,
  element: tsNS.BindingElement
): string | null {
  if (element.propertyName === undefined)
    return ts.isIdentifier(element.name) ? element.name.text : null;
  return ts.isIdentifier(element.propertyName) || ts.isStringLiteral(element.propertyName)
    ? element.propertyName.text
    : null;
}

function exactObjectFactoryDestructure(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.ObjectBindingPattern | null {
  const outer = outerTransparentExpression(ts, expression);
  const declaration = outer.parent;
  return ts.isVariableDeclaration(declaration) &&
    declaration.initializer === outer &&
    ts.isObjectBindingPattern(declaration.name)
    ? declaration.name
    : null;
}

function isExactObjectFactoryDestructure(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): boolean {
  const pattern = exactObjectFactoryDestructure(ts, expression);
  return (
    pattern !== null &&
    pattern.elements.every(
      (element) =>
        element.dotDotDotToken === undefined &&
        element.initializer === undefined &&
        ts.isIdentifier(element.name) &&
        objectFactoryBindingPropertyName(ts, element) !== null
    )
  );
}

function collectObjectFactoryDestructureAliases(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: Map<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>
): void {
  const visit = (node: tsNS.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const properties = objectFactoryCall(ts, resolver, factories, node.initializer);
      const pattern =
        properties === null ? null : exactObjectFactoryDestructure(ts, node.initializer);
      if (
        properties !== null &&
        pattern !== null &&
        isExactObjectFactoryDestructure(ts, node.initializer)
      )
        for (const element of pattern.elements) {
          const property = objectFactoryBindingPropertyName(ts, element);
          const kind = property === null ? undefined : properties.get(property);
          if (kind !== undefined && ts.isIdentifier(element.name)) bindings.set(element.name, kind);
        }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function objectFactoryDependencyDefaultDeclaration(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  expression: tsNS.Expression
): Readonly<{ declaration: tsNS.Identifier; parameter: tsNS.ParameterDeclaration }> | null {
  const outer = outerTransparentExpression(ts, expression);
  const fallback = outer.parent;
  if (
    !ts.isBinaryExpression(fallback) ||
    fallback.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken ||
    fallback.right !== outer ||
    !ts.isIdentifier(fallback.left)
  )
    return null;
  const declaration = fallback.parent;
  const parameter = resolver(fallback.left);
  return ts.isVariableDeclaration(declaration) &&
    declaration.initializer === fallback &&
    ts.isIdentifier(declaration.name) &&
    parameter !== null &&
    ts.isParameter(parameter.parent)
    ? Object.freeze({ declaration: declaration.name, parameter: parameter.parent })
    : null;
}

function collectObjectFactoryContainers(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  factories: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityObjectFactory>
): ReadonlyMap<tsNS.Identifier, ObjectFactoryContainer> {
  const containers = new Map<tsNS.Identifier, ObjectFactoryContainer>();
  const visit = (node: tsNS.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const fallback =
        ts.isBinaryExpression(node.initializer) &&
        node.initializer.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ? node.initializer.right
          : null;
      const properties =
        fallback === null ? null : objectFactoryCall(ts, resolver, factories, fallback);
      const defaultBinding =
        properties === null || fallback === null
          ? null
          : objectFactoryDependencyDefaultDeclaration(ts, resolver, fallback);
      if (
        properties !== null &&
        hasOnlyClassifierVisibleFactoryCapabilities(properties) &&
        defaultBinding !== null
      )
        containers.set(
          defaultBinding.declaration,
          Object.freeze({ properties, parameter: defaultBinding.parameter })
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return containers;
}

function collectNamedFunctions(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): ReadonlyMap<tsNS.Identifier, tsNS.FunctionLikeDeclaration> {
  const functions = new Map<tsNS.Identifier, tsNS.FunctionLikeDeclaration>();
  const visit = (node: tsNS.Node): void => {
    if (isExecutableFunctionLike(ts, node)) {
      const declaration = functionBinding(ts, node);
      if (declaration !== null) functions.set(declaration, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return functions;
}

export function isClassifierVisibleFactoryCapability(kind: LiteralDynamicCapabilityKind): boolean {
  return kind === "drizzle-executor";
}

export function hasOnlyClassifierVisibleFactoryCapabilities(
  properties: LiteralDynamicCapabilityObjectFactory
): boolean {
  return [...properties.values()].every(isClassifierVisibleFactoryCapability);
}

/** Collects the fixed-point factory aliases and exact dependency-container shape. */
export function collectLiteralDynamicCapabilityFactoryAnalysis(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: Map<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  sourceBindings: ReadonlySet<tsNS.Identifier>
): LiteralDynamicCapabilityFactoryAnalysis {
  const factories = collectFactories(ts, sourceFile, resolver, bindings, sourceBindings);
  const objectFactories = collectObjectFactories(
    ts,
    sourceFile,
    resolver,
    bindings,
    sourceBindings
  );
  collectFactoryResultAliases(ts, sourceFile, resolver, bindings, factories);
  collectObjectFactoryDestructureAliases(ts, sourceFile, resolver, bindings, objectFactories);
  const objectContainers = collectObjectFactoryContainers(
    ts,
    sourceFile,
    resolver,
    objectFactories
  );
  const namedFunctions = collectNamedFunctions(ts, sourceFile);
  return Object.freeze({
    factories,
    objectFactories,
    objectContainers,
    namedFunctions,
    directFactoryObjectReturn: (reference, kind) =>
      directFactoryObjectReturn(ts, objectFactories, reference, kind),
    directFactoryReturn: (reference, kind) =>
      directFactoryReturn(ts, resolver, bindings, factories, reference, kind),
    factoryCallKind: (expression) => factoryCallKind(ts, resolver, bindings, factories, expression),
    isAllowedObjectFactoryCallResult: (expression) =>
      objectFactoryDependencyDefaultDeclaration(ts, resolver, expression) !== null ||
      isExactObjectFactoryDestructure(ts, expression),
    objectFactoryCall: (expression) => objectFactoryCall(ts, resolver, objectFactories, expression),
  });
}
