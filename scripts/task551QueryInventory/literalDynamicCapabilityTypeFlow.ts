/** Type-flow safety for literal dynamic database capabilities. */
import type * as tsNS from "typescript";

import { isReferenceIdentifier } from "./literalDynamicNamespaceSafety";
import { assertNoUnprovenOpaqueLiteralDynamicDatabaseTypeFlow } from "./literalDynamicCapabilityOpaqueTypeFlow";
import type {
  IsProvenLiteralDynamicDatabaseExpression,
  LiteralDynamicCapabilityFactoryAnalysis,
  LiteralDynamicCapabilityKind,
} from "./literalDynamicCapabilityFactories";

type TypeScriptAdapter = typeof tsNS;
type Resolver = (reference: tsNS.Identifier) => tsNS.Identifier | null;
type TypeDeclaration =
  tsNS.TypeAliasDeclaration | tsNS.InterfaceDeclaration | tsNS.ClassDeclaration;
type TypeDeclarations = ReadonlyMap<string, TypeDeclaration | null>;

function isDatabaseTypeModule(specifier: string): boolean {
  return /(?:^|\/)db\/(?:client|sessionClient)$/.test(specifier);
}

function leftmostEntityName(ts: TypeScriptAdapter, name: tsNS.EntityName): tsNS.Identifier {
  let current = name;
  while (ts.isQualifiedName(current)) current = current.left;
  return current;
}

function isDatabaseTypeQuery(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  query: tsNS.TypeQueryNode
): boolean {
  const root = leftmostEntityName(ts, query.exprName);
  const resolved = resolver(root);
  if (resolved !== null && bindings.get(resolved) === "drizzle-executor") return true;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (!isDatabaseTypeModule(statement.moduleSpecifier.text)) continue;
    const clause = statement.importClause;
    if (ts.isIdentifier(query.exprName)) {
      if (clause?.name?.text === root.text) return true;
      const named = clause?.namedBindings;
      if (
        named !== undefined &&
        ts.isNamedImports(named) &&
        named.elements.some(
          (element) =>
            element.name.text === root.text &&
            (element.propertyName?.text ?? element.name.text) === "db"
        )
      )
        return true;
    } else if (
      ts.isQualifiedName(query.exprName) &&
      query.exprName.right.text === "db" &&
      clause?.namedBindings !== undefined &&
      ts.isNamespaceImport(clause.namedBindings) &&
      clause.namedBindings.name.text === root.text
    )
      return true;
  }
  return false;
}

function collectTypeDeclarations(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): TypeDeclarations {
  const declarations = new Map<string, TypeDeclaration | null>();
  const visit = (node: tsNS.Node): void => {
    if (
      (ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.name !== undefined
    ) {
      const existing = declarations.get(node.name.text);
      declarations.set(node.name.text, existing === undefined ? node : null);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
}

function collectTypeParameters(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): ReadonlyMap<string, tsNS.TypeParameterDeclaration | null> {
  const parameters = new Map<string, tsNS.TypeParameterDeclaration | null>();
  const visit = (node: tsNS.Node): void => {
    if (ts.isTypeParameterDeclaration(node)) {
      const existing = parameters.get(node.name.text);
      parameters.set(node.name.text, existing === undefined ? node : null);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return parameters;
}

const safeGlobalTypeReferences = new Set([
  "Array",
  "AsyncGenerator",
  "AsyncIterable",
  "AsyncIterator",
  "Awaited",
  "BigInt",
  "Boolean",
  "Capitalize",
  "ConstructorParameters",
  "Date",
  "Error",
  "Exclude",
  "Extract",
  "Function",
  "Generator",
  "InstanceType",
  "Iterable",
  "Iterator",
  "Lowercase",
  "Map",
  "NonNullable",
  "Number",
  "Omit",
  "OmitThisParameter",
  "Parameters",
  "Partial",
  "Pick",
  "Promise",
  "PromiseLike",
  "Readonly",
  "ReadonlyArray",
  "ReadonlyMap",
  "ReadonlySet",
  "Record",
  "RegExp",
  "Required",
  "ReturnType",
  "Set",
  "String",
  "TemplateStringsArray",
  "ThisParameterType",
  "ThisType",
  "URL",
  "URLSearchParams",
  "Uncapitalize",
  "Uppercase",
  "WeakMap",
  "WeakSet",
]);

function importTypeModuleSpecifier(
  ts: TypeScriptAdapter,
  type: tsNS.ImportTypeNode
): string | null {
  return ts.isLiteralTypeNode(type.argument) && ts.isStringLiteral(type.argument.literal)
    ? type.argument.literal.text
    : null;
}

function typeTextMentionsDatabase(sourceFile: tsNS.SourceFile, type: tsNS.TypeNode): boolean {
  return /(?:typeof\s+import\([^)]*\bdb\/(?:client|sessionClient)[^)]*\)\s*\.\s*db|\b(?:Database|Db|Drizzle|Postgres|Sql|Transaction|Executor)\b)/.test(
    type.getText(sourceFile)
  );
}

function opaqueTypeImportMayBeDatabase(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  name: string
): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (!/(?:^|\/)(?:db|database|sql|postgres|drizzle)/i.test(statement.moduleSpecifier.text))
      continue;
    const clause = statement.importClause;
    if (clause?.name?.text === name) return true;
    const bindings = clause?.namedBindings;
    if (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some((entry) => entry.name.text === name)
    )
      return true;
  }
  return false;
}

function memberMatchesRisk(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  member: tsNS.TypeElement | tsNS.ClassElement,
  risk: "database" | "any",
  seen: ReadonlySet<string>
): boolean {
  const candidate =
    ts.isPropertySignature(member) ||
    ts.isPropertyDeclaration(member) ||
    ts.isMethodSignature(member) ||
    ts.isMethodDeclaration(member) ||
    ts.isCallSignatureDeclaration(member) ||
    ts.isConstructSignatureDeclaration(member) ||
    ts.isIndexSignatureDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member)
      ? member.type
      : undefined;
  if (
    candidate !== undefined &&
    typeMatchesRisk(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      candidate,
      risk,
      seen
    )
  )
    return true;
  return (
    "parameters" in member &&
    (member as tsNS.SignatureDeclaration).parameters.some(
      (parameter: tsNS.ParameterDeclaration) =>
        parameter.type !== undefined &&
        typeMatchesRisk(
          ts,
          sourceFile,
          resolver,
          bindings,
          declarations,
          typeParameters,
          parameter.type,
          risk,
          seen
        )
    )
  );
}

function declarationMatchesRisk(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  declaration: TypeDeclaration,
  risk: "database" | "any",
  seen: ReadonlySet<string>
): boolean {
  if (ts.isTypeAliasDeclaration(declaration))
    return typeMatchesRisk(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      declaration.type,
      risk,
      seen
    );
  const heritage = declaration.heritageClauses?.some((clause) =>
    clause.types.some((entry) =>
      typeMatchesRisk(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        entry,
        risk,
        seen
      )
    )
  );
  return (
    heritage === true ||
    declaration.members.some((member) =>
      memberMatchesRisk(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        member,
        risk,
        seen
      )
    )
  );
}

function functionTypeMatchesRisk(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  type: tsNS.FunctionOrConstructorTypeNode,
  risk: "database" | "any",
  seen: ReadonlySet<string>
): boolean {
  return (
    (type.type !== undefined &&
      typeMatchesRisk(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        type.type,
        risk,
        seen
      )) ||
    type.parameters.some(
      (parameter) =>
        parameter.type !== undefined &&
        typeMatchesRisk(
          ts,
          sourceFile,
          resolver,
          bindings,
          declarations,
          typeParameters,
          parameter.type,
          risk,
          seen
        )
    )
  );
}

function typeMatchesRisk(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  type: tsNS.TypeNode,
  risk: "database" | "any",
  seen: ReadonlySet<string> = new Set<string>()
): boolean {
  const unwrapped = ts.isParenthesizedTypeNode(type) ? type.type : type;
  if (risk === "any" && unwrapped.kind === ts.SyntaxKind.AnyKeyword) return true;
  if (risk === "database" && typeTextMentionsDatabase(sourceFile, unwrapped)) return true;
  if (risk === "database" && ts.isTypeQueryNode(unwrapped))
    return isDatabaseTypeQuery(ts, sourceFile, resolver, bindings, unwrapped);
  if (ts.isImportTypeNode(unwrapped)) {
    const specifier = importTypeModuleSpecifier(ts, unwrapped);
    return risk === "database" && specifier !== null && isDatabaseTypeModule(specifier);
  }
  if (ts.isTypeLiteralNode(unwrapped))
    return unwrapped.members.some((member) =>
      memberMatchesRisk(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        member,
        risk,
        seen
      )
    );
  if (ts.isFunctionTypeNode(unwrapped) || ts.isConstructorTypeNode(unwrapped))
    return functionTypeMatchesRisk(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      unwrapped,
      risk,
      seen
    );
  if (ts.isTypeReferenceNode(unwrapped)) {
    const argumentsMatch =
      unwrapped.typeArguments?.some((argument) =>
        typeMatchesRisk(
          ts,
          sourceFile,
          resolver,
          bindings,
          declarations,
          typeParameters,
          argument,
          risk,
          seen
        )
      ) ?? false;
    if (argumentsMatch) return true;
    if (!ts.isIdentifier(unwrapped.typeName)) return false;
    const name = unwrapped.typeName.text;
    const typeParameter = typeParameters.get(name);
    if (typeParameter !== undefined) {
      if (typeParameter === null) return false;
      return (
        typeParameter.constraint !== undefined &&
        typeMatchesRisk(
          ts,
          sourceFile,
          resolver,
          bindings,
          declarations,
          typeParameters,
          typeParameter.constraint,
          risk,
          seen
        )
      );
    }
    const declaration = declarations.get(name);
    if (declaration === undefined)
      return (
        risk === "database" &&
        !safeGlobalTypeReferences.has(name) &&
        opaqueTypeImportMayBeDatabase(ts, sourceFile, name)
      );
    if (declaration === null || seen.has(name)) return risk === "database";
    const next = new Set(seen);
    next.add(name);
    return declarationMatchesRisk(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      declaration,
      risk,
      next
    );
  }
  let matched = false;
  ts.forEachChild(unwrapped, (child) => {
    if (!matched && ts.isTypeNode(child))
      matched = typeMatchesRisk(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        child,
        risk,
        seen
      );
  });
  return matched;
}

function typeMemberHasOpaqueCapability(
  ts: TypeScriptAdapter,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  member: tsNS.TypeElement | tsNS.ClassElement,
  seen: ReadonlySet<string>
): boolean {
  const candidate =
    ts.isPropertySignature(member) ||
    ts.isPropertyDeclaration(member) ||
    ts.isMethodSignature(member) ||
    ts.isMethodDeclaration(member) ||
    ts.isCallSignatureDeclaration(member) ||
    ts.isConstructSignatureDeclaration(member) ||
    ts.isIndexSignatureDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member)
      ? member.type
      : undefined;
  return (
    (candidate !== undefined &&
      typeHasOpaqueCapability(ts, declarations, typeParameters, candidate, seen)) ||
    ("parameters" in member &&
      (member as tsNS.SignatureDeclaration).parameters.some(
        (parameter: tsNS.ParameterDeclaration) =>
          parameter.type !== undefined &&
          typeHasOpaqueCapability(ts, declarations, typeParameters, parameter.type, seen)
      ))
  );
}

function typeHasOpaqueCapability(
  ts: TypeScriptAdapter,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  type: tsNS.TypeNode,
  seen: ReadonlySet<string> = new Set<string>()
): boolean {
  const value = ts.isParenthesizedTypeNode(type) ? type.type : type;
  if (
    ts.isTypeQueryNode(value) ||
    ts.isLiteralTypeNode(value) ||
    value.kind === ts.SyntaxKind.AnyKeyword ||
    value.kind === ts.SyntaxKind.UnknownKeyword ||
    value.kind === ts.SyntaxKind.NeverKeyword ||
    value.kind === ts.SyntaxKind.VoidKeyword ||
    value.kind === ts.SyntaxKind.StringKeyword ||
    value.kind === ts.SyntaxKind.NumberKeyword ||
    value.kind === ts.SyntaxKind.BooleanKeyword ||
    value.kind === ts.SyntaxKind.BigIntKeyword ||
    value.kind === ts.SyntaxKind.SymbolKeyword ||
    value.kind === ts.SyntaxKind.ObjectKeyword
  )
    return false;
  if (ts.isImportTypeNode(value))
    return !isDatabaseTypeModule(importTypeModuleSpecifier(ts, value) ?? "");
  if (ts.isTypeLiteralNode(value))
    return value.members.some((member) =>
      typeMemberHasOpaqueCapability(ts, declarations, typeParameters, member, seen)
    );
  if (ts.isFunctionTypeNode(value) || ts.isConstructorTypeNode(value))
    return (
      typeHasOpaqueCapability(ts, declarations, typeParameters, value.type, seen) ||
      value.parameters.some(
        (parameter) =>
          parameter.type !== undefined &&
          typeHasOpaqueCapability(ts, declarations, typeParameters, parameter.type, seen)
      )
    );
  if (ts.isTypeReferenceNode(value)) {
    if (
      value.typeArguments?.some((argument) =>
        typeHasOpaqueCapability(ts, declarations, typeParameters, argument, seen)
      )
    )
      return true;
    if (!ts.isIdentifier(value.typeName)) return true;
    const name = value.typeName.text;
    const parameter = typeParameters.get(name);
    if (parameter !== undefined)
      return (
        parameter === null ||
        parameter.constraint === undefined ||
        typeHasOpaqueCapability(ts, declarations, typeParameters, parameter.constraint, seen)
      );
    const declaration = declarations.get(name);
    if (declaration === undefined) return !safeGlobalTypeReferences.has(name);
    if (declaration === null || seen.has(name)) return true;
    const next = new Set(seen);
    next.add(name);
    if (ts.isTypeAliasDeclaration(declaration))
      return typeHasOpaqueCapability(ts, declarations, typeParameters, declaration.type, next);
    return declaration.members.some((member) =>
      typeMemberHasOpaqueCapability(ts, declarations, typeParameters, member, next)
    );
  }
  let opaque = false;
  ts.forEachChild(value, (child) => {
    if (!opaque && ts.isTypeNode(child))
      opaque = typeHasOpaqueCapability(ts, declarations, typeParameters, child, seen);
  });
  return opaque;
}

function isDirectDatabaseCapabilityType(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  declarations: TypeDeclarations,
  typeParameters: ReadonlyMap<string, tsNS.TypeParameterDeclaration | null>,
  type: tsNS.TypeNode,
  seen = new Set<string>()
): boolean {
  const unwrapped = ts.isParenthesizedTypeNode(type) ? type.type : type;
  if (ts.isTypeQueryNode(unwrapped))
    return isDatabaseTypeQuery(ts, sourceFile, resolver, bindings, unwrapped);
  if (ts.isImportTypeNode(unwrapped)) {
    const specifier = importTypeModuleSpecifier(ts, unwrapped);
    return specifier !== null && isDatabaseTypeModule(specifier);
  }
  if (ts.isIntersectionTypeNode(unwrapped) || ts.isUnionTypeNode(unwrapped))
    return unwrapped.types.some((part) =>
      isDirectDatabaseCapabilityType(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        part,
        seen
      )
    );
  if (!ts.isTypeReferenceNode(unwrapped) || !ts.isIdentifier(unwrapped.typeName)) return false;
  const name = unwrapped.typeName.text;
  const typeParameter = typeParameters.get(name);
  if (typeParameter !== undefined)
    return (
      typeParameter !== null &&
      typeParameter.constraint !== undefined &&
      isDirectDatabaseCapabilityType(
        ts,
        sourceFile,
        resolver,
        bindings,
        declarations,
        typeParameters,
        typeParameter.constraint,
        seen
      )
    );
  const declaration = declarations.get(name);
  if (declaration === undefined || declaration === null || seen.has(name)) return false;
  if (!ts.isTypeAliasDeclaration(declaration)) return false;
  const next = new Set(seen);
  next.add(name);
  return isDirectDatabaseCapabilityType(
    ts,
    sourceFile,
    resolver,
    bindings,
    declarations,
    typeParameters,
    declaration.type,
    next
  );
}

function unwrapCapabilityValue(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isAwaitExpression(current)
  )
    current = current.expression;
  return current;
}

function inlineFunctionCallee(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.ArrowFunction | tsNS.FunctionExpression | null {
  const callee = unwrapCapabilityValue(ts, expression);
  return ts.isArrowFunction(callee) || ts.isFunctionExpression(callee) ? callee : null;
}

function isDirectInlineFunctionCall(
  ts: TypeScriptAdapter,
  functionLike: tsNS.ArrowFunction | tsNS.FunctionExpression
): boolean {
  let outer: tsNS.Expression = functionLike;
  while (ts.isParenthesizedExpression(outer.parent) && outer.parent.expression === outer)
    outer = outer.parent;
  return ts.isCallExpression(outer.parent) && outer.parent.expression === outer;
}

function functionReturnExpressions(
  ts: TypeScriptAdapter,
  functionLike: tsNS.FunctionLikeDeclaration
): readonly tsNS.Expression[] {
  if (functionLike.body === undefined) return [];
  if (!ts.isBlock(functionLike.body)) return [functionLike.body];
  const expressions: tsNS.Expression[] = [];
  const visit = (node: tsNS.Node): void => {
    if (node !== functionLike.body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression !== undefined)
      expressions.push(node.expression);
    else ts.forEachChild(node, visit);
  };
  visit(functionLike.body);
  return expressions;
}

function functionDeclaration(
  analysis: LiteralDynamicCapabilityFactoryAnalysis,
  functionLike: tsNS.FunctionLikeDeclaration
): tsNS.Identifier | null {
  for (const [declaration, target] of analysis.namedFunctions)
    if (target === functionLike) return declaration;
  return null;
}

function isTrackedFactoryReturn(
  analysis: LiteralDynamicCapabilityFactoryAnalysis,
  functionLike: tsNS.FunctionLikeDeclaration
): boolean {
  const declaration = functionDeclaration(analysis, functionLike);
  return (
    declaration !== null &&
    (analysis.factories.get(declaration) === "drizzle-executor" ||
      analysis.objectFactories.get(declaration)?.get("db") === "drizzle-executor")
  );
}

function isExactSecuritySettingsDbPromise(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  declaration: tsNS.VariableDeclaration
): boolean {
  return (
    sourceFile.fileName === "core/services/settings/securitySettings.ts" &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "dbPromise" &&
    declaration.type !== undefined &&
    declaration.initializer?.kind === ts.SyntaxKind.NullKeyword &&
    /^Promise<\s*typeof\s+import\(\s*["']\.\.\/\.\.\/db\/client["']\s*\)\s*\.\s*db\s*>\s*\|\s*null$/.test(
      declaration.type.getText(sourceFile)
    )
  );
}

/**
 * Rejects type-only manufacture of a dynamic DB capability. A source scanner
 * has no checker-backed proof that an arbitrary value cast to `typeof db` is
 * the imported database executor, so only tracked values may receive that type.
 */
export function assertNoUnprovenLiteralDynamicDatabaseTypeFlow(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicCapabilityKind>,
  analysis: LiteralDynamicCapabilityFactoryAnalysis,
  isProvenDatabaseValue: IsProvenLiteralDynamicDatabaseExpression,
  isProvenDatabaseContainerValue: IsProvenLiteralDynamicDatabaseExpression,
  onInvalid: () => void
): void {
  const declarations = collectTypeDeclarations(ts, sourceFile);
  const typeParameters = collectTypeParameters(ts, sourceFile);
  const hasDatabaseType = (type: tsNS.TypeNode): boolean =>
    typeMatchesRisk(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      type,
      "database"
    );
  const hasAnyType = (type: tsNS.TypeNode): boolean =>
    typeMatchesRisk(ts, sourceFile, resolver, bindings, declarations, typeParameters, type, "any");
  const isDirectDatabaseType = (type: tsNS.TypeNode): boolean =>
    isDirectDatabaseCapabilityType(
      ts,
      sourceFile,
      resolver,
      bindings,
      declarations,
      typeParameters,
      type
    );
  const capabilityFunctionParameters = new Map<
    tsNS.Identifier,
    Readonly<{ functionLike: tsNS.FunctionLikeDeclaration; indexes: readonly number[] }>
  >();
  const namedFunctionBodies = new Set(analysis.namedFunctions.values());
  for (const [declaration, functionLike] of analysis.namedFunctions) {
    const indexes = functionLike.parameters.flatMap((parameter, index) =>
      parameter.type !== undefined &&
      (isDirectDatabaseType(parameter.type) || hasAnyType(parameter.type))
        ? [index]
        : []
    );
    if (indexes.length > 0)
      capabilityFunctionParameters.set(declaration, Object.freeze({ functionLike, indexes }));
  }
  const known = new Set<tsNS.Identifier>();
  for (const [declaration, kind] of bindings)
    if (kind === "drizzle-executor") known.add(declaration);
  const typedAssignments = new Set<tsNS.Identifier>();
  const collectTypedDeclarations = (node: tsNS.Node): void => {
    if (ts.isParameter(node) && ts.isIdentifier(node.name) && node.type !== undefined) {
      if (isDirectDatabaseType(node.type)) known.add(node.name);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.type !== undefined) {
      if (
        !isExactSecuritySettingsDbPromise(ts, sourceFile, node) &&
        (hasDatabaseType(node.type) || hasAnyType(node.type))
      )
        typedAssignments.add(node.name);
    }
    ts.forEachChild(node, collectTypedDeclarations);
  };
  collectTypedDeclarations(sourceFile);
  const isKnownValue = (expression: tsNS.Expression): boolean => {
    const value = unwrapCapabilityValue(ts, expression);
    if (ts.isIdentifier(value)) {
      const declaration = resolver(value);
      return declaration !== null && known.has(declaration);
    }
    if (ts.isConditionalExpression(value))
      return isKnownValue(value.whenTrue) && isKnownValue(value.whenFalse);
    return (
      analysis.factoryCallKind(value) === "drizzle-executor" || isProvenDatabaseValue(expression)
    );
  };
  let changed = true;
  while (changed) {
    changed = false;
    const collectAliases = (node: tsNS.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        isKnownValue(node.initializer) &&
        !known.has(node.name)
      ) {
        known.add(node.name);
        changed = true;
      }
      ts.forEachChild(node, collectAliases);
    };
    collectAliases(sourceFile);
  }
  const validateCapabilityFunctionCall = (
    functionLike: tsNS.FunctionLikeDeclaration,
    capabilityIndexes: readonly number[],
    call: tsNS.CallExpression
  ): void => {
    if (call.typeArguments?.some((type) => hasDatabaseType(type) || hasAnyType(type))) onInvalid();
    for (const index of capabilityIndexes) {
      const parameter = functionLike.parameters[index];
      const argument = call.arguments[index];
      if (
        parameter === undefined ||
        argument === undefined ||
        !ts.isExpression(argument) ||
        !isKnownValue(argument)
      )
        onInvalid();
    }
  };
  const returnValueIsProven = (
    functionLike: tsNS.FunctionLikeDeclaration,
    expression: tsNS.Expression
  ): boolean =>
    isKnownValue(expression) ||
    isProvenDatabaseContainerValue(expression) ||
    isTrackedFactoryReturn(analysis, functionLike);
  assertNoUnprovenOpaqueLiteralDynamicDatabaseTypeFlow({
    ts,
    sourceFile,
    resolver,
    analysis,
    typeIsOpaque: (type) => typeHasOpaqueCapability(ts, declarations, typeParameters, type),
    isProvenValue: (expression) =>
      isKnownValue(expression) || isProvenDatabaseContainerValue(expression),
    unwrap: (expression) => unwrapCapabilityValue(ts, expression),
    onInvalid,
  });
  const validate = (node: tsNS.Node): void => {
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      (() => {
        const declaration = resolver(node);
        return declaration === null ? undefined : capabilityFunctionParameters.get(declaration);
      })() !== undefined
    ) {
      const call = node.parent;
      if (!ts.isCallExpression(call) || call.expression !== node) onInvalid();
    }
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node)
    ) {
      if (
        hasAnyType(node.type) ||
        (hasDatabaseType(node.type) &&
          !isKnownValue(node.expression) &&
          (isDirectDatabaseType(node.type) || !isProvenDatabaseContainerValue(node.expression)))
      )
        onInvalid();
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.type !== undefined &&
      !isExactSecuritySettingsDbPromise(ts, sourceFile, node)
    ) {
      if (
        hasAnyType(node.type) ||
        (hasDatabaseType(node.type) &&
          (node.initializer === undefined ||
            (!isKnownValue(node.initializer) &&
              (isDirectDatabaseType(node.type) ||
                !isProvenDatabaseContainerValue(node.initializer)))))
      )
        onInvalid();
    }
    if (ts.isFunctionLike(node) && node.type !== undefined) {
      const returnTypeIsRisky = hasDatabaseType(node.type) || hasAnyType(node.type);
      if (
        returnTypeIsRisky &&
        !isTrackedFactoryReturn(analysis, node as tsNS.FunctionLikeDeclaration) &&
        functionReturnExpressions(ts, node as tsNS.FunctionLikeDeclaration).some(
          (expression) => !returnValueIsProven(node as tsNS.FunctionLikeDeclaration, expression)
        )
      )
        onInvalid();
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      const declaration = resolver(node.left);
      if (declaration !== null && typedAssignments.has(declaration) && !isKnownValue(node.right))
        onInvalid();
    }
    if (ts.isCallExpression(node)) {
      if (node.typeArguments?.some((type) => hasDatabaseType(type) || hasAnyType(type)))
        onInvalid();
      if (ts.isIdentifier(node.expression)) {
        const declaration = resolver(node.expression);
        const target =
          declaration === null ? undefined : capabilityFunctionParameters.get(declaration);
        if (target !== undefined)
          validateCapabilityFunctionCall(target.functionLike, target.indexes, node);
      } else {
        const inline = inlineFunctionCallee(ts, node.expression);
        if (inline !== null) {
          const indexes = inline.parameters.flatMap((parameter, index) =>
            parameter.type !== undefined &&
            (isDirectDatabaseType(parameter.type) || hasAnyType(parameter.type))
              ? [index]
              : []
          );
          if (indexes.length > 0) validateCapabilityFunctionCall(inline, indexes, node);
        }
      }
    }
    if (
      (ts.isTaggedTemplateExpression(node) || ts.isNewExpression(node)) &&
      node.typeArguments?.some((type) => hasDatabaseType(type) || hasAnyType(type))
    )
      onInvalid();
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      !namedFunctionBodies.has(node) &&
      !isDirectInlineFunctionCall(ts, node) &&
      node.parameters.some(
        (parameter) =>
          parameter.type !== undefined &&
          (isDirectDatabaseType(parameter.type) || hasAnyType(parameter.type))
      )
    ) {
      onInvalid();
    }
    ts.forEachChild(node, validate);
  };
  validate(sourceFile);
}
