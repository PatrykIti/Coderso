/** Declaration-aware fail-closed safety for direct literal dynamic capabilities. */
import type * as tsNS from "typescript";

import { fail } from "./contracts";
import { hasOnlySafeGscClientUses } from "./gscDynamicCapabilitySafety";
import {
  collectLiteralDynamicCapabilityFactoryAnalysis,
  hasOnlyClassifierVisibleFactoryCapabilities,
  isClassifierVisibleFactoryCapability,
  type LiteralDynamicCapabilityFactoryAnalysis,
  type LiteralDynamicCapabilityKind,
  type ObjectFactoryContainer,
} from "./literalDynamicCapabilityFactories";
import { assertNoUnprovenLiteralDynamicDatabaseTypeFlow } from "./literalDynamicCapabilityTypeFlow";
import {
  createLexicalBindingResolver,
  isReferenceIdentifier,
  type LiteralDynamicCapabilityBinding,
} from "./literalDynamicNamespaceSafety";

type TypeScriptAdapter = typeof tsNS;
type TransparentExpression =
  | tsNS.ParenthesizedExpression
  | tsNS.AsExpression
  | tsNS.TypeAssertion
  | tsNS.NonNullExpression
  | tsNS.SatisfiesExpression
  | tsNS.AwaitExpression;

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

function innerTransparentExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let inner = expression;
  while (isTransparentExpression(ts, inner)) inner = inner.expression;
  return inner;
}

function literalDynamicCapabilityKind(kind: string): LiteralDynamicCapabilityKind | null {
  return kind === "drizzle-executor" ||
    kind === "postgres" ||
    kind === "drizzle" ||
    kind === "session-wrapper"
    ? kind
    : null;
}

function trackedCapabilityForReference(
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  reference: tsNS.Identifier
): LiteralDynamicCapabilityKind | null {
  const declaration = resolver(reference);
  return declaration === null ? null : (bindings.get(declaration) ?? null);
}

function exactTrackedCapabilityAlias(
  ts: TypeScriptAdapter,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  expression: tsNS.Expression
): LiteralDynamicCapabilityKind | null {
  const unwrapped = outerTransparentExpression(ts, expression);
  return ts.isIdentifier(unwrapped)
    ? trackedCapabilityForReference(resolver, bindings, unwrapped)
    : null;
}

function collectExactLiteralDynamicCapabilityAliases(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  bindings: Map<tsNS.Identifier, LiteralDynamicCapabilityKind>
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
        const kind = exactTrackedCapabilityAlias(ts, resolver, bindings, node.initializer);
        if (kind !== null) add(node.name, kind);
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
      ) {
        const kind = exactTrackedCapabilityAlias(ts, resolver, bindings, node.right);
        const declaration = resolver(node.left);
        if (kind !== null && declaration !== null) add(declaration, kind);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
}

function directCapabilityUse(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  kind: LiteralDynamicCapabilityKind
): boolean {
  let outer: tsNS.Expression = expression;
  const members: string[] = [];
  while (true) {
    outer = outerTransparentExpression(ts, outer);
    const parent = outer.parent;
    if (!ts.isPropertyAccessExpression(parent) || parent.expression !== outer) break;
    outer = parent;
    members.push(parent.name.text);
  }
  const parent = outer.parent;
  if (kind !== "drizzle-executor") {
    return (
      members.length === 0 &&
      ((ts.isCallExpression(parent) && parent.expression === outer) ||
        (kind === "postgres" && ts.isTaggedTemplateExpression(parent) && parent.tag === outer))
    );
  }
  const operation = members[0];
  if (
    operation === undefined ||
    !new Set([
      "select",
      "query",
      "execute",
      "insert",
      "update",
      "delete",
      "transaction",
      "batch",
    ]).has(operation)
  )
    return false;
  if (operation !== "query" && members.length !== 1) return false;
  return (
    (ts.isCallExpression(parent) && parent.expression === outer) ||
    (ts.isTaggedTemplateExpression(parent) && parent.tag === outer)
  );
}

function directLocalCapabilityAlias(ts: TypeScriptAdapter, expression: tsNS.Expression): boolean {
  const outer = outerTransparentExpression(ts, expression);
  const parent = outer.parent;
  if (ts.isVariableDeclaration(parent) && parent.initializer === outer)
    return ts.isIdentifier(parent.name);
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.right === outer &&
    ts.isIdentifier(parent.left)
  );
}

function directLocalCapabilityAliasTarget(
  ts: TypeScriptAdapter,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  reference: tsNS.Identifier
): boolean {
  const parent = reference.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.left === reference &&
    exactTrackedCapabilityAlias(ts, resolver, bindings, parent.right) !== null
  );
}

function typedParameterUsesDirectCapability(
  ts: TypeScriptAdapter,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  factory: tsNS.FunctionLikeDeclaration,
  parameter: tsNS.ParameterDeclaration,
  kind: LiteralDynamicCapabilityKind
): boolean {
  if (!ts.isIdentifier(parameter.name) || factory.body === undefined) return false;
  let used = false;
  let valid = true;
  const declaration = parameter.name;
  const visit = (node: tsNS.Node): void => {
    if (!valid || ts.isTypeNode(node)) return;
    if (node !== factory && ts.isFunctionLike(node)) {
      const capturesCapability = (candidate: tsNS.Node): boolean => {
        if (candidate !== node && ts.isFunctionLike(candidate)) return false;
        if (
          ts.isIdentifier(candidate) &&
          isReferenceIdentifier(ts, candidate) &&
          resolver(candidate) === declaration
        )
          return true;
        let captured = false;
        ts.forEachChild(candidate, (child) => {
          if (!captured && capturesCapability(child)) captured = true;
        });
        return captured;
      };
      if (capturesCapability(node)) valid = false;
      return;
    }
    if (
      ts.isIdentifier(node) &&
      node !== declaration &&
      isReferenceIdentifier(ts, node) &&
      resolver(node) === declaration
    ) {
      used = true;
      if (!directCapabilityUse(ts, node, kind)) valid = false;
    }
    ts.forEachChild(node, visit);
  };
  visit(factory.body);
  return used && valid;
}

function isTypedCapabilityHandoff(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  functions: ReadonlyMap<tsNS.Identifier, tsNS.FunctionLikeDeclaration>,
  access: tsNS.PropertyAccessExpression,
  kind: LiteralDynamicCapabilityKind
): boolean {
  const outer = outerTransparentExpression(ts, access);
  const call = outer.parent;
  if (
    !ts.isCallExpression(call) ||
    !call.arguments.includes(outer) ||
    !ts.isIdentifier(call.expression)
  )
    return false;
  const declaration = resolver(call.expression);
  const factory = declaration === null ? undefined : functions.get(declaration);
  const parameter = factory?.parameters[call.arguments.indexOf(outer)];
  if (factory === undefined || parameter === undefined) return false;
  return (
    parameter.type?.getText(sourceFile).replace(/\s/g, "") === `typeof${access.name.text}` &&
    typedParameterUsesDirectCapability(ts, resolver, factory, parameter, kind)
  );
}

function dependencyContainerTypeAlias(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  container: ObjectFactoryContainer
): tsNS.TypeAliasDeclaration | null {
  const annotation = container.parameter.type;
  if (
    annotation === undefined ||
    !ts.isTypeReferenceNode(annotation) ||
    !ts.isIdentifier(annotation.typeName) ||
    annotation.typeArguments?.length
  )
    return null;
  const typeName = annotation.typeName;
  const declaration = sourceFile.statements.find(
    (statement): statement is tsNS.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName.text
  );
  return declaration?.typeParameters?.length ? null : (declaration ?? null);
}

function isClassifierVisibleDependencyContainer(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  container: ObjectFactoryContainer
): boolean {
  if (!hasOnlyClassifierVisibleFactoryCapabilities(container.properties)) return false;
  const declaration = dependencyContainerTypeAlias(ts, sourceFile, container);
  if (declaration === null || !ts.isTypeLiteralNode(declaration.type)) return false;
  let dbPropertyFound = false;
  for (const member of declaration.type.members) {
    if (
      !ts.isPropertySignature(member) ||
      member.questionToken !== undefined ||
      member.type === undefined ||
      !ts.isIdentifier(member.name)
    )
      return false;
    if (member.name.text !== "db") continue;
    if (
      dbPropertyFound ||
      !ts.isTypeQueryNode(member.type) ||
      !ts.isIdentifier(member.type.exprName) ||
      member.type.exprName.text !== "db"
    )
      return false;
    dbPropertyFound = true;
  }
  return dbPropertyFound;
}

function typeQueryRootIdentifier(ts: TypeScriptAdapter, name: tsNS.EntityName): tsNS.Identifier {
  let current = name;
  while (ts.isQualifiedName(current)) current = current.left;
  return current;
}

function isDatabaseCapabilityImportBinding(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  name: tsNS.EntityName
): boolean {
  const root = typeQueryRootIdentifier(ts, name).text;
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      return false;
    const specifier = statement.moduleSpecifier.text;
    if (
      specifier !== "postgres" &&
      specifier !== "drizzle-orm/postgres-js" &&
      !/(?:^|\/)db\/(?:client|sessionClient)$/.test(specifier)
    )
      return false;
    const clause = statement.importClause;
    if (clause?.name?.text === root) return true;
    const bindings = clause?.namedBindings;
    return (
      bindings !== undefined &&
      (ts.isNamespaceImport(bindings)
        ? bindings.name.text === root
        : bindings.elements.some((element) => element.name.text === root))
    );
  });
}

function isClearlyNonCapabilityContainerPropertyType(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  type: tsNS.TypeNode
): boolean {
  if (ts.isParenthesizedTypeNode(type))
    return isClearlyNonCapabilityContainerPropertyType(ts, sourceFile, type.type);
  if (ts.isFunctionTypeNode(type))
    return isClearlyNonCapabilityContainerPropertyType(ts, sourceFile, type.type);
  if (ts.isLiteralTypeNode(type)) return true;
  if (ts.isTypeQueryNode(type))
    return !isDatabaseCapabilityImportBinding(ts, sourceFile, type.exprName);
  return (
    type.kind === ts.SyntaxKind.StringKeyword ||
    type.kind === ts.SyntaxKind.NumberKeyword ||
    type.kind === ts.SyntaxKind.BooleanKeyword ||
    type.kind === ts.SyntaxKind.BigIntKeyword ||
    type.kind === ts.SyntaxKind.SymbolKeyword ||
    type.kind === ts.SyntaxKind.VoidKeyword ||
    type.kind === ts.SyntaxKind.UndefinedKeyword ||
    type.kind === ts.SyntaxKind.NullKeyword ||
    type.kind === ts.SyntaxKind.NeverKeyword
  );
}

function isUnsafeUnknownTypedContainerProperty(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  container: ObjectFactoryContainer,
  propertyName: string
): boolean {
  const declaration = dependencyContainerTypeAlias(ts, sourceFile, container);
  if (declaration === null || !ts.isTypeLiteralNode(declaration.type)) return true;
  const property = declaration.type.members.find(
    (member): member is tsNS.PropertySignature =>
      ts.isPropertySignature(member) &&
      ts.isIdentifier(member.name) &&
      member.name.text === propertyName
  );
  return (
    property?.type === undefined ||
    !isClearlyNonCapabilityContainerPropertyType(ts, sourceFile, property.type)
  );
}

function typeElementNamed(ts: TypeScriptAdapter, member: tsNS.TypeElement, name: string): boolean {
  return (
    (ts.isPropertySignature(member) || ts.isMethodSignature(member)) &&
    ts.isIdentifier(member.name) &&
    member.name.text === name
  );
}

function exactTypeLiteralProperty(
  ts: TypeScriptAdapter,
  declaration: tsNS.TypeAliasDeclaration,
  name: string
): tsNS.PropertySignature | null {
  if (!ts.isTypeLiteralNode(declaration.type)) return null;
  const members = declaration.type.members.filter((member) => typeElementNamed(ts, member, name));
  return members.length === 1 && ts.isPropertySignature(members[0]!) ? members[0]! : null;
}

function hasUnshadowedTypeName(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  name: string,
  moduleSpecifier?: string
): boolean {
  let exact = 0;
  let conflicting = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const bindings = clause?.namedBindings;
      if (
        clause?.name?.text === name ||
        (bindings !== undefined && ts.isNamespaceImport(bindings) && bindings.name.text === name)
      )
        conflicting = true;
      else if (bindings !== undefined && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          if (element.name.text === name) {
            if (
              moduleSpecifier !== undefined &&
              clause?.isTypeOnly === true &&
              ts.isStringLiteral(statement.moduleSpecifier) &&
              statement.moduleSpecifier.text === moduleSpecifier &&
              element.propertyName === undefined &&
              !element.isTypeOnly
            )
              exact += 1;
            else conflicting = true;
          }
    } else if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name?.text === name
    )
      conflicting = true;
  }
  return moduleSpecifier === undefined ? !conflicting : exact === 1 && !conflicting;
}

function directContainerPropertyCall(
  ts: TypeScriptAdapter,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): tsNS.CallExpression | null {
  const call = access.parent;
  return access.expression === reference &&
    access.questionDotToken === undefined &&
    ts.isCallExpression(call) &&
    call.expression === access &&
    call.questionDotToken === undefined &&
    !call.typeArguments?.length
    ? call
    : null;
}

function exactGscClientResultBinding(
  ts: TypeScriptAdapter,
  call: tsNS.CallExpression
): tsNS.Identifier | null {
  const awaited = call.parent;
  const declaration = awaited.parent;
  return ts.isAwaitExpression(awaited) &&
    awaited.expression === call &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === awaited &&
    declaration.type === undefined &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "client"
    ? declaration.name
    : null;
}

function hasOnlySafeResultUses(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  declaration: tsNS.Identifier,
  members: ReadonlySet<string>,
  allowForOf: boolean
): boolean {
  let valid = true;
  let used = false;
  const visit = (node: tsNS.Node): void => {
    if (!valid) return;
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      resolver(node) === declaration
    ) {
      used = true;
      const access = node.parent;
      const safeMember =
        ts.isPropertyAccessExpression(access) &&
        access.expression === node &&
        access.questionDotToken === undefined &&
        members.has(access.name.text);
      if (!safeMember && !(allowForOf && ts.isForOfStatement(access) && access.expression === node))
        valid = false;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used && valid;
}

function exactSitemapUrlsResultBinding(
  ts: TypeScriptAdapter,
  call: tsNS.CallExpression
): tsNS.Identifier | null {
  const awaited = call.parent;
  const grouped = awaited.parent;
  const slice = grouped.parent;
  const sliceCall = slice.parent;
  const declaration = sliceCall.parent;
  const [start, maximum] = ts.isCallExpression(sliceCall) ? sliceCall.arguments : [];
  const valid =
    ts.isAwaitExpression(awaited) &&
    awaited.expression === call &&
    ts.isParenthesizedExpression(grouped) &&
    grouped.expression === awaited &&
    ts.isPropertyAccessExpression(slice) &&
    slice.expression === grouped &&
    slice.questionDotToken === undefined &&
    slice.name.text === "slice" &&
    ts.isCallExpression(sliceCall) &&
    sliceCall.expression === slice &&
    sliceCall.questionDotToken === undefined &&
    !sliceCall.typeArguments?.length &&
    ts.isNumericLiteral(start) &&
    start.text === "0" &&
    ts.isIdentifier(maximum) &&
    maximum.text === "maxUrls" &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === sliceCall &&
    declaration.type === undefined &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "urls";
  return valid ? (declaration.name as tsNS.Identifier) : null;
}

function isExactSitemapSubmissionGscClientContainerUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  container: ObjectFactoryContainer,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): boolean {
  if (access.name.text !== "getGscClient") return false;
  const call = directContainerPropertyCall(ts, reference, access);
  if (call === null || call.arguments.length !== 1) return false;
  const [scopeArgument] = call.arguments;
  if (scopeArgument === undefined || !ts.isStringLiteral(scopeArgument)) return false;
  const acceptedScope =
    sourceFile.fileName === "core/services/seo/sitemapSubmissionService.ts"
      ? scopeArgument.text === "webmasters" || scopeArgument.text === "webmasters.readonly"
      : sourceFile.fileName === "core/services/seo/gscSyncService.ts" &&
        scopeArgument.text === "webmasters.readonly";
  if (!acceptedScope) return false;
  const declaration = dependencyContainerTypeAlias(ts, sourceFile, container);
  if (declaration === null) return false;
  const property = exactTypeLiteralProperty(ts, declaration, "getGscClient");
  const type = property?.type;
  if (
    type === undefined ||
    !ts.isFunctionTypeNode(type) ||
    type.typeParameters?.length ||
    type.parameters.length !== 1
  )
    return false;
  const [scope] = type.parameters;
  if (
    scope === undefined ||
    scope.questionToken === undefined ||
    !ts.isIdentifier(scope.name) ||
    scope.name.text !== "scope" ||
    scope.type?.kind !== ts.SyntaxKind.StringKeyword
  )
    return false;
  const result = type.type;
  const resultArguments = ts.isTypeReferenceNode(result) ? result.typeArguments : undefined;
  if (
    !ts.isTypeReferenceNode(result) ||
    !ts.isIdentifier(result.typeName) ||
    result.typeName.text !== "Promise" ||
    resultArguments === undefined ||
    resultArguments.length !== 1
  )
    return false;
  const [value] = resultArguments;
  if (
    value === undefined ||
    !ts.isTypeReferenceNode(value) ||
    !ts.isIdentifier(value.typeName) ||
    value.typeName.text !== "GscClient" ||
    value.typeArguments?.length
  )
    return false;
  const client = exactGscClientResultBinding(ts, call);
  return (
    client !== null &&
    hasUnshadowedTypeName(ts, sourceFile, "Promise") &&
    hasUnshadowedTypeName(ts, sourceFile, "GscClient", "./gscClient") &&
    hasOnlySafeGscClientUses(ts, sourceFile, resolver, client)
  );
}

function isExactGscSyncSitemapUrlsContainerUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  container: ObjectFactoryContainer,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): boolean {
  if (
    sourceFile.fileName !== "core/services/seo/gscSyncService.ts" ||
    access.name.text !== "collectSitemapUrls"
  )
    return false;
  const call = directContainerPropertyCall(ts, reference, access);
  if (call === null || call.arguments.length !== 0) return false;
  const declaration = dependencyContainerTypeAlias(ts, sourceFile, container);
  if (declaration === null) return false;
  const property = exactTypeLiteralProperty(ts, declaration, "collectSitemapUrls");
  const type = property?.type;
  if (
    type === undefined ||
    !ts.isFunctionTypeNode(type) ||
    type.typeParameters?.length ||
    type.parameters.length !== 0
  )
    return false;
  const result = type.type;
  const resultArguments = ts.isTypeReferenceNode(result) ? result.typeArguments : undefined;
  if (
    !ts.isTypeReferenceNode(result) ||
    !ts.isIdentifier(result.typeName) ||
    result.typeName.text !== "Promise" ||
    resultArguments === undefined ||
    resultArguments.length !== 1
  )
    return false;
  const [value] = resultArguments;
  if (
    value === undefined ||
    !ts.isArrayTypeNode(value) ||
    !ts.isTypeReferenceNode(value.elementType) ||
    !ts.isIdentifier(value.elementType.typeName) ||
    value.elementType.typeName.text !== "SitemapEntry" ||
    value.elementType.typeArguments?.length
  )
    return false;
  const urls = exactSitemapUrlsResultBinding(ts, call);
  return (
    urls !== null &&
    hasUnshadowedTypeName(ts, sourceFile, "Promise") &&
    hasUnshadowedTypeName(ts, sourceFile, "SitemapEntry", "./sitemapService") &&
    hasOnlySafeResultUses(ts, sourceFile, resolver, urls, new Set(["length"]), true)
  );
}

function isDiscardedClearlyNonCapabilityContainerCall(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  container: ObjectFactoryContainer,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): boolean {
  const call = directContainerPropertyCall(ts, reference, access);
  return (
    call !== null &&
    ts.isExpressionStatement(call.parent) &&
    call.parent.expression === call &&
    !isUnsafeUnknownTypedContainerProperty(ts, sourceFile, container, access.name.text)
  );
}

function isAllowedObjectFactoryContainerUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  functions: ReadonlyMap<tsNS.Identifier, tsNS.FunctionLikeDeclaration>,
  reference: tsNS.Identifier,
  container: ObjectFactoryContainer
): boolean {
  const outer = outerTransparentExpression(ts, reference);
  const access = outer.parent;
  if (!ts.isPropertyAccessExpression(access) || access.expression !== outer) return false;
  const kind = container.properties.get(access.name.text);
  if (kind === undefined) {
    if (outer !== reference || access.questionDotToken !== undefined) return false;
    return (
      isExactSitemapSubmissionGscClientContainerUse(
        ts,
        sourceFile,
        resolver,
        container,
        reference,
        access
      ) ||
      isExactGscSyncSitemapUrlsContainerUse(
        ts,
        sourceFile,
        resolver,
        container,
        reference,
        access
      ) ||
      isDiscardedClearlyNonCapabilityContainerCall(ts, sourceFile, container, reference, access)
    );
  }
  if (
    isClassifierVisibleDependencyContainer(ts, sourceFile, container) &&
    directCapabilityUse(ts, access, kind)
  )
    return true;
  return isTypedCapabilityHandoff(ts, sourceFile, resolver, functions, access, kind);
}

function directFactoryCalleeReference(ts: TypeScriptAdapter, reference: tsNS.Identifier): boolean {
  return ts.isCallExpression(reference.parent) && reference.parent.expression === reference;
}

function isClassifierVisibleScalarFactoryResultAlias(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): boolean {
  const awaited = expression.parent;
  const declaration = awaited.parent;
  return (
    ts.isAwaitExpression(awaited) &&
    awaited.expression === expression &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === awaited &&
    ts.isIdentifier(declaration.name)
  );
}

function discardedFactoryResult(ts: TypeScriptAdapter, expression: tsNS.Expression): boolean {
  const outer = outerTransparentExpression(ts, expression);
  return ts.isExpressionStatement(outer.parent) && outer.parent.expression === outer;
}

function exactSecuritySettingsCachedFactoryResult(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  expression: tsNS.Expression
): boolean {
  if (sourceFile.fileName !== "core/services/settings/securitySettings.ts") return false;
  const outer = outerTransparentExpression(ts, expression);
  const parent = outer.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken &&
    parent.right === outer &&
    ts.isIdentifier(parent.left) &&
    parent.left.text === "dbPromise"
  );
}

function isExactTrackedFactoryContainerValue(
  ts: TypeScriptAdapter,
  resolver: (reference: tsNS.Identifier) => tsNS.Identifier | null,
  analysis: LiteralDynamicCapabilityFactoryAnalysis,
  expression: tsNS.Expression
): boolean {
  const trackedFactory = (candidate: tsNS.Expression): boolean => {
    const factory = analysis.objectFactoryCall(candidate);
    return factory !== null && hasOnlyClassifierVisibleFactoryCapabilities(factory);
  };
  const initializerIsExact = (initializer: tsNS.Expression): boolean => {
    if (trackedFactory(initializer)) return true;
    const value = innerTransparentExpression(ts, initializer);
    if (
      !ts.isBinaryExpression(value) ||
      value.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken ||
      !ts.isIdentifier(innerTransparentExpression(ts, value.left))
    )
      return false;
    const parameter = resolver(innerTransparentExpression(ts, value.left) as tsNS.Identifier);
    return parameter !== null && ts.isParameter(parameter.parent) && trackedFactory(value.right);
  };
  const value = innerTransparentExpression(ts, expression);
  if (ts.isIdentifier(value)) {
    const declaration = resolver(value);
    return (
      declaration !== null &&
      ts.isVariableDeclaration(declaration.parent) &&
      declaration.parent.initializer !== undefined &&
      initializerIsExact(declaration.parent.initializer)
    );
  }
  const outer = outerTransparentExpression(ts, expression);
  const parent = outer.parent;
  const initializer =
    ts.isVariableDeclaration(parent) && parent.initializer === outer
      ? parent.initializer
      : ts.isBinaryExpression(parent) &&
          parent.right === outer &&
          ts.isVariableDeclaration(parent.parent)
        ? parent.parent.initializer
        : undefined;
  return initializer !== undefined && initializerIsExact(initializer);
}

/** Rejects unclassified wrapper and forwarding escapes of literal dynamic capabilities. */
export function assertNoLiteralDynamicCapabilityEscape(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  literalBindings: readonly LiteralDynamicCapabilityBinding[]
): void {
  const bindings = new Map<tsNS.Identifier, LiteralDynamicCapabilityKind>();
  for (const binding of literalBindings) {
    if (!ts.isBindingElement(binding.declaration.parent)) continue;
    const kind = literalDynamicCapabilityKind(binding.kind);
    if (kind !== null) bindings.set(binding.declaration, kind);
  }
  if (bindings.size === 0) return;
  const sourceBindings = new Set(bindings.keys());
  const resolver = createLexicalBindingResolver(ts, sourceFile);
  collectExactLiteralDynamicCapabilityAliases(ts, sourceFile, resolver, bindings);
  const factoryAnalysis = collectLiteralDynamicCapabilityFactoryAnalysis(
    ts,
    sourceFile,
    resolver,
    bindings,
    sourceBindings
  );
  const { factories, objectContainers, namedFunctions, objectFactories } = factoryAnalysis;
  assertNoUnprovenLiteralDynamicDatabaseTypeFlow(
    ts,
    sourceFile,
    resolver,
    bindings,
    factoryAnalysis,
    (expression) => {
      const outer = outerTransparentExpression(ts, expression);
      const receiver = ts.isPropertyAccessExpression(outer)
        ? innerTransparentExpression(ts, outer.expression)
        : null;
      if (
        !ts.isPropertyAccessExpression(outer) ||
        outer.questionDotToken !== undefined ||
        outer.name.text !== "db" ||
        receiver === null ||
        !ts.isIdentifier(receiver)
      )
        return false;
      if (isExactTrackedFactoryContainerValue(ts, resolver, factoryAnalysis, receiver)) return true;
      const declaration = resolver(receiver);
      const container = declaration === null ? undefined : objectContainers.get(declaration);
      return (
        container !== undefined &&
        container.properties.get("db") === "drizzle-executor" &&
        (isClassifierVisibleDependencyContainer(ts, sourceFile, container) ||
          isTypedCapabilityHandoff(
            ts,
            sourceFile,
            resolver,
            namedFunctions,
            outer,
            "drizzle-executor"
          ))
      );
    },
    (expression) => {
      if (isExactTrackedFactoryContainerValue(ts, resolver, factoryAnalysis, expression))
        return true;
      const factory = factoryAnalysis.objectFactoryCall(expression);
      if (
        factory !== null &&
        hasOnlyClassifierVisibleFactoryCapabilities(factory) &&
        factoryAnalysis.isAllowedObjectFactoryCallResult(expression)
      )
        return true;
      const outer = outerTransparentExpression(ts, expression);
      if (!ts.isIdentifier(outer)) return false;
      const declaration = resolver(outer);
      const container = declaration === null ? undefined : objectContainers.get(declaration);
      return (
        container !== undefined &&
        container.properties.get("db") === "drizzle-executor" &&
        hasOnlyClassifierVisibleFactoryCapabilities(container.properties)
      );
    },
    () => fail("query_inventory_scan_invalid", "dynamic-db-import")
  );
  const visit = (node: tsNS.Node): void => {
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      !ts.isTypeQueryNode(node.parent)
    ) {
      const kind = trackedCapabilityForReference(resolver, bindings, node);
      if (
        kind !== null &&
        !directCapabilityUse(ts, node, kind) &&
        !directLocalCapabilityAlias(ts, node) &&
        !directLocalCapabilityAliasTarget(ts, resolver, bindings, node) &&
        !factoryAnalysis.directFactoryReturn(node, kind) &&
        !factoryAnalysis.directFactoryObjectReturn(node, kind)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      const declaration = resolver(node);
      const container = declaration === null ? undefined : objectContainers.get(declaration);
      if (
        container !== undefined &&
        !isAllowedObjectFactoryContainerUse(
          ts,
          sourceFile,
          resolver,
          namedFunctions,
          node,
          container
        )
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      if (
        kind === null &&
        declaration !== null &&
        (factories.has(declaration) || objectFactories.has(declaration)) &&
        !directFactoryCalleeReference(ts, node)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    if (ts.isCallExpression(node)) {
      const kind = factoryAnalysis.factoryCallKind(node);
      if (
        kind !== null &&
        !discardedFactoryResult(ts, node) &&
        !exactSecuritySettingsCachedFactoryResult(ts, sourceFile, node) &&
        (!isClassifierVisibleFactoryCapability(kind) ||
          !isClassifierVisibleScalarFactoryResultAlias(ts, node))
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      const objectFactory = factoryAnalysis.objectFactoryCall(node);
      if (
        objectFactory !== null &&
        !discardedFactoryResult(ts, node) &&
        (!hasOnlyClassifierVisibleFactoryCapabilities(objectFactory) ||
          (!factoryAnalysis.isAllowedObjectFactoryCallResult(node) &&
            !isExactTrackedFactoryContainerValue(ts, resolver, factoryAnalysis, node)))
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
