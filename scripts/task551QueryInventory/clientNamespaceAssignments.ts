/**
 * Assignment helpers for known client namespaces.
 *
 * Static and dynamic imports share the exact assignment mechanics. Dynamic
 * namespace values additionally use a narrow escape boundary: only exact
 * direct `.db` or exact `{ db }` extraction may continue into alias analysis.
 */
import path from "node:path";
import type * as tsNS from "typescript";

import { fail } from "./contracts";
import {
  clientAliasKindForExpression,
  clientKindForExpression,
  containsConstructorResult,
  constructorKindForExpression,
  constructorResultClientKind,
  isUnsupportedKnownClientValueExtraction,
  memberNames,
  rootIdentifier,
  transparentConditionalClientKindOrThrow,
  type ClientKind,
  type ConstructorKind,
} from "./clientExpressions";
import { dynamicCapabilityAliasKind } from "./dynamicCapabilityAliases";
import {
  collectDynamicClientFactoryOrigins,
  collectExactSecuritySettingsGetDbOriginsOrThrow,
  createContainedDynamicClientKindFinder,
  directIifeDynamicClientOrigins,
} from "./dynamicImportOrigins";
import {
  createDynamicImportProvenance,
  type DynamicImportProvenance,
} from "./dynamicImportProvenance";
import {
  collectDatabaseLifecycleClientLoaderImportsOrThrow,
  collectLiteralDynamicClientThenBinding,
} from "./literalDynamicClientImports";
import {
  bindingIdentifiers,
  hasPossibleDynamicImportSyntax,
  type LiteralDynamicNamespaceBinding,
} from "./literalDynamicNamespaceSafety";
import {
  collectNonliteralDynamicImportBinding,
  dynamicImportBindingName,
} from "./nonliteralDynamicImports";

type TypeScriptAdapter = typeof tsNS;

const DIRECT_STATIC_CLIENT_OPERATIONS = new Set([
  "select",
  "query",
  "execute",
  "insert",
  "update",
  "delete",
  "transaction",
  "batch",
]);

export function assignmentTargetIdentifiers(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): readonly string[] | null {
  if (ts.isIdentifier(target)) return [target.text];
  if (ts.isParenthesizedExpression(target))
    return assignmentTargetIdentifiers(ts, target.expression);
  return null;
}

function assignmentTargetBindingNames(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): readonly string[] | null {
  if (ts.isParenthesizedExpression(target))
    return assignmentTargetBindingNames(ts, target.expression);
  const identifiers = assignmentTargetIdentifiers(ts, target);
  if (identifiers !== null) return identifiers;
  if (ts.isArrayLiteralExpression(target)) {
    const names: string[] = [];
    for (const element of target.elements) {
      if (ts.isOmittedExpression(element)) continue;
      const nested = assignmentTargetBindingNames(
        ts,
        ts.isSpreadElement(element) ? element.expression : element
      );
      if (nested === null) return null;
      names.push(...nested);
    }
    return names;
  }
  if (!ts.isObjectLiteralExpression(target)) return null;
  const names: string[] = [];
  for (const property of target.properties) {
    if (ts.isShorthandPropertyAssignment(property)) {
      names.push(property.name.text);
      continue;
    }
    if (ts.isPropertyAssignment(property)) {
      const nested = assignmentTargetBindingNames(ts, property.initializer);
      if (nested === null) return null;
      names.push(...nested);
      continue;
    }
    if (ts.isSpreadAssignment(property)) {
      const nested = assignmentTargetBindingNames(ts, property.expression);
      if (nested === null) return null;
      names.push(...nested);
      continue;
    }
    return null;
  }
  return names;
}

export function assignClientAliases(
  ts: TypeScriptAdapter,
  target: tsNS.Expression,
  kind: ClientKind,
  bindings: Map<string, ClientKind>
): void {
  const names = assignmentTargetIdentifiers(ts, target);
  if (names === null) fail("query_inventory_scan_invalid", "client-assignment");
  for (const name of names) bindings.set(name, kind);
}

export function assignClientNamespaceAliases(
  ts: TypeScriptAdapter,
  target: tsNS.Expression,
  clientNamespaces: Map<string, ClientKind>,
  bindings: Map<string, ClientKind>
): void {
  const names = assignmentTargetIdentifiers(ts, target);
  if (names !== null) {
    for (const name of names) clientNamespaces.set(name, "drizzle-executor");
    return;
  }
  let unwrapped = target;
  while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
  if (!ts.isObjectLiteralExpression(unwrapped) || unwrapped.properties.length !== 1)
    fail("query_inventory_scan_invalid", "namespace-capability");
  const [property] = unwrapped.properties;
  if (property === undefined) fail("query_inventory_scan_invalid", "namespace-capability");
  if (
    ts.isShorthandPropertyAssignment(property) &&
    property.name.text === "db" &&
    property.objectAssignmentInitializer === undefined
  ) {
    bindings.set(property.name.text, "drizzle-executor");
    return;
  }
  if (
    !ts.isPropertyAssignment(property) ||
    (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) ||
    property.name.text !== "db"
  ) {
    fail("query_inventory_scan_invalid", "namespace-capability");
  }
  assignClientAliases(ts, property.initializer, "drizzle-executor", bindings);
}

export function exactDbAssignmentTargetIdentifier(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): tsNS.Identifier | null {
  let unwrapped = target;
  while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
  if (!ts.isObjectLiteralExpression(unwrapped) || unwrapped.properties.length !== 1) return null;
  const [property] = unwrapped.properties;
  if (property === undefined) return null;
  if (ts.isShorthandPropertyAssignment(property))
    return property.name.text === "db" && property.objectAssignmentInitializer === undefined
      ? property.name
      : null;
  if (
    !ts.isPropertyAssignment(property) ||
    (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) ||
    property.name.text !== "db"
  )
    return null;
  return ts.isIdentifier(property.initializer) ? property.initializer : null;
}

export function exactDbAssignmentTargetName(
  ts: TypeScriptAdapter,
  target: tsNS.Expression
): string | null {
  return exactDbAssignmentTargetIdentifier(ts, target)?.text ?? null;
}

export function hasKnownClientAssignmentTarget(
  ts: TypeScriptAdapter,
  target: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>
): boolean {
  const names = assignmentTargetBindingNames(ts, target);
  return names !== null && names.some((name) => bindings.has(name) || clientNamespaces.has(name));
}
export type DynamicDatabaseModule = "client" | "session" | "postgres" | "drizzle";
export type DynamicImportBinding = Readonly<{
  declarations: readonly tsNS.Identifier[];
  node: tsNS.CallExpression;
  names: readonly string[];
}>;
type VariableAliasScan = Readonly<{
  dynamicImports: readonly DynamicImportBinding[];
  dynamicCapabilityAliasNames: ReadonlySet<string>;
  dynamicCapabilityAliasDeclarations: ReadonlySet<tsNS.Identifier>;
  dynamicCapabilityAliasKinds: ReadonlyMap<tsNS.Identifier, string>;
  dynamicImportProvenance: DynamicImportProvenance;
  isClientReferenceAllowed: (reference: tsNS.Identifier) => boolean;
  literalDynamicThenNamespaces: readonly LiteralDynamicNamespaceBinding[];
  nonliteralDynamicImportBindings: ReadonlySet<string>;
}>;

function modulePathFromSpecifier(file: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const parent = path.posix.dirname(file);
  const normalized = path.posix.normalize(path.posix.join(parent, specifier));
  if (normalized.startsWith("../") || normalized === ".") return null;
  return normalized.replace(/\.(?:ts|tsx|mts|cts|js|jsx)$/, "");
}

function moduleKind(file: string, specifier: string): "client" | "session" | null {
  const modulePath = modulePathFromSpecifier(file, specifier);
  if (modulePath === "core/db/client") return "client";
  if (modulePath === "core/db/sessionClient") return "session";
  return null;
}

function isKnownDbExternal(specifier: string): boolean {
  return specifier === "postgres" || specifier === "drizzle-orm/postgres-js";
}

export function isDbLikeSpecifier(specifier: string): boolean {
  return (
    /(?:^|\/)(?:db\/client|db\/sessionClient)(?:$|\.)/.test(specifier) ||
    isKnownDbExternal(specifier)
  );
}

export function bindingNames(ts: TypeScriptAdapter, pattern: tsNS.BindingName): readonly string[] {
  return bindingIdentifiers(ts, pattern).map((identifier) => identifier.text);
}

function callbackFromArguments(
  ts: TypeScriptAdapter,
  args: readonly tsNS.Expression[]
): tsNS.FunctionLikeDeclaration | null {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    const candidate = args[index]!;
    if (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) return candidate;
  }
  return null;
}

function registerCallbackBinding(
  ts: TypeScriptAdapter,
  callback: tsNS.FunctionLikeDeclaration,
  kind: ClientKind,
  bindings: Map<string, ClientKind>
): void {
  const first = callback.parameters[0];
  if (first === undefined) return;
  if (!ts.isIdentifier(first.name)) fail("query_inventory_scan_invalid", "callback-capability");
  bindings.set(first.name.text, kind);
}

function addObjectDbBindings(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName,
  kind: ClientKind,
  bindings: Map<string, ClientKind>
): void {
  const name = exactDbBindingName(ts, pattern);
  if (name !== null) bindings.set(name, kind);
}

export function collectStaticCapabilityBindings(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): {
  clients: Map<string, ClientKind>;
  constructors: Map<string, ConstructorKind>;
  constructorNamespaces: Map<string, ConstructorKind>;
  sessionWrappers: Set<string>;
  sessionWrapperNamespaces: Set<string>;
  clientNamespaces: Map<string, ClientKind>;
} {
  const clients = new Map<string, ClientKind>();
  const constructors = new Map<string, ConstructorKind>();
  const constructorNamespaces = new Map<string, ConstructorKind>();
  const sessionWrappers = new Set<string>();
  const sessionWrapperNamespaces = new Set<string>();
  const clientNamespaces = new Map<string, ClientKind>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const specifier = statement.moduleSpecifier.text;
    const classification = moduleKind(sourceFile.fileName, specifier);
    if (isDbLikeSpecifier(specifier) && classification === null && !isKnownDbExternal(specifier))
      fail("query_inventory_scan_invalid", "db-import");
    const clause = statement.importClause;
    if (clause === undefined || clause.isTypeOnly) continue;
    if (classification === "client") {
      if (clause.name !== undefined) clients.set(clause.name.text, "drizzle-executor");
      if (clause.namedBindings !== undefined) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            const imported = element.propertyName?.text ?? element.name.text;
            if (imported === "db") clients.set(element.name.text, "drizzle-executor");
            else fail("query_inventory_scan_invalid", "db-import-binding");
          }
        } else if (ts.isNamespaceImport(clause.namedBindings)) {
          clientNamespaces.set(clause.namedBindings.name.text, "drizzle-executor");
        }
      }
    }
    if (classification === "session" && clause.namedBindings !== undefined) {
      if (ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          if (imported === "withSessionDatabaseClient") sessionWrappers.add(element.name.text);
          else fail("query_inventory_scan_invalid", "session-import-binding");
        }
      } else if (ts.isNamespaceImport(clause.namedBindings)) {
        sessionWrapperNamespaces.add(clause.namedBindings.name.text);
      }
    }
    if (specifier === "postgres") {
      if (clause.name !== undefined) constructors.set(clause.name.text, "postgres");
      if (clause.namedBindings !== undefined) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements)
            constructors.set(element.name.text, "postgres");
        } else if (ts.isNamespaceImport(clause.namedBindings)) {
          constructorNamespaces.set(clause.namedBindings.name.text, "postgres");
        }
      }
    }
    if (specifier === "drizzle-orm/postgres-js") {
      if (clause.name !== undefined) constructors.set(clause.name.text, "drizzle");
      if (clause.namedBindings !== undefined) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            const imported = element.propertyName?.text ?? element.name.text;
            if (imported !== "drizzle")
              fail("query_inventory_scan_invalid", "drizzle-import-binding");
            constructors.set(element.name.text, "drizzle");
          }
        } else if (ts.isNamespaceImport(clause.namedBindings)) {
          constructorNamespaces.set(clause.namedBindings.name.text, "drizzle");
        }
      }
    }
  }
  return {
    clients,
    constructors,
    constructorNamespaces,
    sessionWrappers,
    sessionWrapperNamespaces,
    clientNamespaces,
  };
}

export function dynamicImportModule(
  ts: TypeScriptAdapter,
  node: tsNS.CallExpression,
  file: string
): DynamicDatabaseModule | null {
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return null;
  const [argument] = node.arguments;
  if (argument === undefined || !ts.isStringLiteral(argument)) return null;
  const local = moduleKind(file, argument.text);
  if (local !== null) return local;
  if (argument.text === "postgres") return "postgres";
  if (argument.text === "drizzle-orm/postgres-js") return "drizzle";
  return null;
}

function bindingPropertyName(ts: TypeScriptAdapter, element: tsNS.BindingElement): string | null {
  const property = element.propertyName;
  if (property === undefined) return ts.isIdentifier(element.name) ? element.name.text : null;
  return ts.isIdentifier(property) || ts.isStringLiteral(property) ? property.text : null;
}

function exactModuleExportBindingName(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName,
  expectedProperties: ReadonlySet<string>
): string | null {
  if (!ts.isObjectBindingPattern(pattern) || pattern.elements.length !== 1) return null;
  const [element] = pattern.elements;
  if (
    element === undefined ||
    element.dotDotDotToken !== undefined ||
    !expectedProperties.has(bindingPropertyName(ts, element) ?? "") ||
    !ts.isIdentifier(element.name) ||
    element.initializer !== undefined
  )
    return null;
  return element.name.text;
}

function exactDbBindingName(ts: TypeScriptAdapter, pattern: tsNS.BindingName): string | null {
  return exactModuleExportBindingName(ts, pattern, new Set(["db"]));
}

function factoryClientBindingNames(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName
): readonly string[] {
  if (ts.isIdentifier(pattern)) return [pattern.text];
  if (!ts.isObjectBindingPattern(pattern))
    fail("query_inventory_scan_invalid", "client-assignment");
  let dbName: string | null = null;
  for (const element of pattern.elements) {
    const property = bindingPropertyName(ts, element);
    if (
      element.dotDotDotToken !== undefined ||
      property === null ||
      !ts.isIdentifier(element.name) ||
      element.initializer !== undefined
    ) {
      fail("query_inventory_scan_invalid", "client-assignment");
    }
    if (property === "db") {
      if (dbName !== null) fail("query_inventory_scan_invalid", "client-assignment");
      dbName = element.name.text;
    }
    if (
      property !== "db" &&
      /^(?:database|client|session|sql|query|select|execute|insert|update|delete|transaction|batch)$/i.test(
        property
      )
    ) {
      fail("query_inventory_scan_invalid", "client-assignment");
    }
  }
  return dbName === null ? [] : [dbName];
}

function bindingPatternHasClientCapability(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName
): boolean {
  if (!ts.isObjectBindingPattern(pattern)) return false;
  return pattern.elements.some((element) => {
    const property = bindingPropertyName(ts, element);
    return (
      element.dotDotDotToken !== undefined ||
      !ts.isIdentifier(element.name) ||
      property === null ||
      /^(?:db|database|client|session|sql|query|select|execute|insert|update|delete|transaction|batch)$/i.test(
        property
      )
    );
  });
}

function typedDependencyDbFallbackName(
  ts: TypeScriptAdapter,
  pattern: tsNS.BindingName,
  initializer: tsNS.Expression,
  typedCapabilityBindings: ReadonlySet<string>,
  bindings: ReadonlyMap<string, ClientKind>
): string | null {
  if (
    !ts.isIdentifier(initializer) ||
    !typedCapabilityBindings.has(initializer.text) ||
    !ts.isObjectBindingPattern(pattern)
  )
    return null;
  let dbName: string | null = null;
  for (const element of pattern.elements) {
    const property = bindingPropertyName(ts, element);
    if (element.dotDotDotToken !== undefined || property === null || !ts.isIdentifier(element.name))
      return null;
    if (property === "db") {
      const fallback = element.initializer;
      if (
        dbName !== null ||
        fallback === undefined ||
        !ts.isIdentifier(fallback) ||
        fallback.text !== "db" ||
        !bindings.has("db")
      )
        return null;
      dbName = element.name.text;
    }
  }
  return dbName;
}

function addDynamicModuleBindings(
  ts: TypeScriptAdapter,
  binding: tsNS.BindingName,
  node: tsNS.CallExpression,
  kind: DynamicDatabaseModule,
  clients: Map<string, ClientKind>,
  constructors: Map<string, ConstructorKind>,
  constructorNamespaces: Map<string, ConstructorKind>,
  sessionWrappers: Set<string>,
  sessionWrapperNamespaces: Set<string>,
  clientNamespaces: Map<string, ClientKind>
): DynamicImportBinding {
  const names = bindingNames(ts, binding);
  const declarations = bindingIdentifiers(ts, binding);
  if (kind === "postgres" || kind === "drizzle") {
    if (ts.isIdentifier(binding)) {
      constructors.set(binding.text, kind);
      constructorNamespaces.set(binding.text, kind);
    } else {
      const constructorName = exactModuleExportBindingName(
        ts,
        binding,
        kind === "postgres" ? new Set(["default", "postgres"]) : new Set(["drizzle"])
      );
      if (constructorName === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
      constructors.set(constructorName, kind);
    }
  } else if (ts.isIdentifier(binding)) {
    if (kind === "client") clientNamespaces.set(binding.text, "drizzle-executor");
    else sessionWrapperNamespaces.add(binding.text);
  } else if (ts.isObjectBindingPattern(binding)) {
    if (kind === "client") {
      const dbName = exactDbBindingName(ts, binding);
      if (dbName === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
      clients.set(dbName, "drizzle-executor");
    } else {
      const wrapperName = exactModuleExportBindingName(
        ts,
        binding,
        new Set(["withSessionDatabaseClient"])
      );
      if (wrapperName === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
      sessionWrappers.add(wrapperName);
    }
  } else {
    fail("query_inventory_scan_invalid", "dynamic-db-import");
  }
  return Object.freeze({
    declarations: Object.freeze([...declarations]),
    node,
    names: Object.freeze([...names]),
  });
}

export function isSessionWrapperCall(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  isClientReferenceAllowed?: (reference: tsNS.Identifier) => boolean
): boolean {
  if (ts.isIdentifier(expression))
    return (
      (isClientReferenceAllowed === undefined || isClientReferenceAllowed(expression)) &&
      sessionWrappers.has(expression.text)
    );
  if (!ts.isPropertyAccessExpression(expression) || !ts.isIdentifier(expression.expression))
    return false;
  return (
    (isClientReferenceAllowed === undefined || isClientReferenceAllowed(expression.expression)) &&
    sessionWrapperNamespaces.has(expression.expression.text) &&
    expression.name.text === "withSessionDatabaseClient"
  );
}

export function assertSupportedNamespaceCapability(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  isClientReferenceAllowed?: (reference: tsNS.Identifier) => boolean
): void {
  const root = rootIdentifier(ts, expression);
  if (root === null) return;
  if (
    constructorNamespaces.has(root) &&
    constructorKindForExpression(
      ts,
      expression,
      constructors,
      constructorNamespaces,
      isClientReferenceAllowed
    ) === null
  ) {
    fail("query_inventory_scan_invalid", "namespace-capability");
  }
  if (
    sessionWrapperNamespaces.has(root) &&
    !isSessionWrapperCall(
      ts,
      expression,
      sessionWrappers,
      sessionWrapperNamespaces,
      isClientReferenceAllowed
    )
  ) {
    fail("query_inventory_scan_invalid", "namespace-capability");
  }
  if (
    clientNamespaces.has(root) &&
    clientKindForExpression(
      ts,
      expression,
      new Map<string, ClientKind>(),
      clientNamespaces,
      isClientReferenceAllowed
    ) === null
  ) {
    fail("query_inventory_scan_invalid", "namespace-capability");
  }
}

export function collectVariableCapabilityAliases(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  bindings: Map<string, ClientKind>,
  constructors: Map<string, ConstructorKind>,
  constructorNamespaces: Map<string, ConstructorKind>,
  sessionWrappers: Set<string>,
  sessionWrapperNamespaces: Set<string>,
  clientNamespaces: Map<string, ClientKind>,
  precollectedDynamicNamespaces: readonly LiteralDynamicNamespaceBinding[]
): VariableAliasScan {
  const lifecycleLoaderImports = collectDatabaseLifecycleClientLoaderImportsOrThrow(ts, sourceFile);
  const hasPossibleDynamicImport = hasPossibleDynamicImportSyntax(sourceFile.text);
  const dynamicImportProvenance = createDynamicImportProvenance(ts, sourceFile);
  const staticClientDeclarations = new Set<tsNS.Identifier>();
  const staticClientNamespaces = new Set<tsNS.Identifier>();
  const staticCapabilityBindingsByName = new Map<string, Set<tsNS.Identifier>>();
  const addStaticCapabilityBinding = (declaration: tsNS.Identifier): void => {
    const declarations =
      staticCapabilityBindingsByName.get(declaration.text) ?? new Set<tsNS.Identifier>();
    declarations.add(declaration);
    staticCapabilityBindingsByName.set(declaration.text, declarations);
  };
  const addStaticClientBinding = (declaration: tsNS.Identifier, namespace = false): void => {
    (namespace ? staticClientNamespaces : staticClientDeclarations).add(declaration);
    addStaticCapabilityBinding(declaration);
  };
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.importClause?.isTypeOnly
    )
      continue;
    const classification = moduleKind(sourceFile.fileName, statement.moduleSpecifier.text);
    if (
      classification === null &&
      statement.moduleSpecifier.text !== "postgres" &&
      statement.moduleSpecifier.text !== "drizzle-orm/postgres-js"
    )
      continue;
    const clause = statement.importClause;
    if (clause?.name !== undefined) {
      if (classification === "client") addStaticClientBinding(clause.name);
      else addStaticCapabilityBinding(clause.name);
    }
    if (clause?.namedBindings !== undefined) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        if (classification === "client") addStaticClientBinding(clause.namedBindings.name, true);
        else addStaticCapabilityBinding(clause.namedBindings.name);
      } else
        for (const element of clause.namedBindings.elements) {
          if (
            classification === "client" &&
            (element.propertyName?.text ?? element.name.text) === "db"
          )
            addStaticClientBinding(element.name);
          else addStaticCapabilityBinding(element.name);
        }
    }
  }
  const isClientReferenceAllowed = (reference: tsNS.Identifier): boolean => {
    const declarations = staticCapabilityBindingsByName.get(reference.text);
    return (
      declarations === undefined ||
      declarations.has(dynamicImportProvenance.declarationForReference(reference) ?? reference)
    );
  };
  const classifyDynamicClientModule = (node: tsNS.CallExpression): "client" | "session" | null => {
    if (lifecycleLoaderImports.has(node)) return null;
    const dynamic = dynamicImportModule(ts, node, sourceFile.fileName);
    return dynamic === "client" || dynamic === "session" ? dynamic : null;
  };
  const exactSecuritySettingsFactoryOrigins =
    sourceFile.fileName === "core/services/settings/securitySettings.ts"
      ? collectExactSecuritySettingsGetDbOriginsOrThrow(ts, sourceFile, classifyDynamicClientModule)
      : null;
  const hasStaticCapabilitySeed =
    bindings.size > 0 ||
    constructors.size > 0 ||
    constructorNamespaces.size > 0 ||
    sessionWrappers.size > 0 ||
    sessionWrapperNamespaces.size > 0 ||
    clientNamespaces.size > 0;
  // The source is still fully parsed and candidate-scanned below. Alias
  // propagation only has a seed through a known import, dynamic import, or
  // the existing typed-capability annotation forms.
  if (
    !hasPossibleDynamicImport &&
    !hasStaticCapabilitySeed &&
    !/(?:typeof\s+db|\b[A-Za-z0-9_]*(?:Transaction|Executor)\b|\bSql\b)/.test(sourceFile.text)
  ) {
    return Object.freeze({
      dynamicImports: Object.freeze([]),
      dynamicCapabilityAliasNames: new Set<string>(),
      dynamicCapabilityAliasDeclarations: new Set<tsNS.Identifier>(),
      dynamicCapabilityAliasKinds: new Map<tsNS.Identifier, string>(),
      dynamicImportProvenance,
      isClientReferenceAllowed,
      literalDynamicThenNamespaces: Object.freeze([]),
      nonliteralDynamicImportBindings: new Set<string>(),
    });
  }
  const databaseTypeAliases = new Set<string>();
  const clientFactoryOrigins =
    exactSecuritySettingsFactoryOrigins ??
    (hasPossibleDynamicImport
      ? collectDynamicClientFactoryOrigins(ts, sourceFile, classifyDynamicClientModule)
      : new Map<tsNS.Identifier, readonly tsNS.CallExpression[]>());
  const directIifeOrigins = (node: tsNS.CallExpression): readonly tsNS.CallExpression[] =>
    directIifeDynamicClientOrigins(ts, node, (candidate) => {
      if (lifecycleLoaderImports.has(candidate)) return null;
      const dynamic = dynamicImportModule(ts, candidate, sourceFile.fileName);
      return dynamic === "client" || dynamic === "session" ? dynamic : null;
    });
  const dynamicImports: DynamicImportBinding[] = [];
  const literalDynamicThenNamespaces: LiteralDynamicNamespaceBinding[] = [];
  const nonliteralDynamicImportBindings = new Set<string>();
  const typedCapabilityBindings = new Set<string>();
  const dynamicCapabilityAliasNames = new Set<string>();
  const dynamicCapabilityAliasDeclarations = new Set<tsNS.Identifier>();
  const dynamicCapabilityAliasKinds = new Map<tsNS.Identifier, string>();
  const addDynamicCapabilityOrigins = (
    name: string,
    origins: readonly tsNS.CallExpression[],
    declaration?: tsNS.Identifier,
    capabilityKind?: string
  ): void => {
    if (origins.length === 0) return;
    dynamicCapabilityAliasNames.add(name);
    if (declaration !== undefined) {
      dynamicCapabilityAliasDeclarations.add(declaration);
      const kind =
        capabilityKind ??
        dynamicCapabilityAliasKind(
          name,
          bindings,
          constructors,
          constructorNamespaces,
          sessionWrappers,
          sessionWrapperNamespaces,
          clientNamespaces
        );
      if (kind === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
      dynamicCapabilityAliasKinds.set(declaration, kind);
      dynamicImportProvenance.add(declaration, origins);
    }
  };
  for (const binding of precollectedDynamicNamespaces) {
    dynamicImportProvenance.add(binding.declaration, [binding.origin]);
    if (binding.kind === "client") {
      clientNamespaces.set(binding.name, "drizzle-executor");
    } else if (binding.kind === "session") {
      sessionWrapperNamespaces.add(binding.name);
    } else {
      constructors.set(binding.name, binding.kind);
      constructorNamespaces.set(binding.name, binding.kind);
    }
  }
  const dynamicOriginsForExpression = dynamicImportProvenance.originsForExpression;
  const bindingIdentifierNamed = (
    pattern: tsNS.BindingName,
    name: string
  ): tsNS.Identifier | undefined =>
    bindingIdentifiers(ts, pattern).find((identifier) => identifier.text === name);
  const assignmentDeclaration = (target: tsNS.Expression): tsNS.Identifier | null =>
    ts.isIdentifier(target) ? dynamicImportProvenance.declarationForReference(target) : null;
  const unwrapStaticClientExpression = (expression: tsNS.Expression): tsNS.Expression => {
    let unwrapped = expression;
    while (
      ts.isParenthesizedExpression(unwrapped) ||
      ts.isAsExpression(unwrapped) ||
      ts.isTypeAssertionExpression(unwrapped) ||
      ts.isNonNullExpression(unwrapped) ||
      ts.isSatisfiesExpression(unwrapped)
    )
      unwrapped = unwrapped.expression;
    return unwrapped;
  };
  const isStaticClientValue = (expression: tsNS.Expression): boolean => {
    const value = unwrapStaticClientExpression(expression);
    if (ts.isIdentifier(value))
      return staticClientDeclarations.has(
        dynamicImportProvenance.declarationForReference(value) ?? value
      );
    return (
      ts.isPropertyAccessExpression(value) &&
      value.questionDotToken === undefined &&
      value.name.text === "db" &&
      ts.isIdentifier(value.expression) &&
      staticClientNamespaces.has(
        dynamicImportProvenance.declarationForReference(value.expression) ?? value.expression
      )
    );
  };
  const isStaticClientNamespaceValue = (expression: tsNS.Expression): boolean => {
    const value = unwrapStaticClientExpression(expression);
    return (
      ts.isIdentifier(value) &&
      staticClientNamespaces.has(dynamicImportProvenance.declarationForReference(value) ?? value)
    );
  };
  let staticAliasesChanged = true;
  while (staticAliasesChanged) {
    staticAliasesChanged = false;
    const collectStaticAliases = (node: tsNS.Node): void => {
      const bind = (names: readonly tsNS.Identifier[]): void => {
        for (const name of names)
          if (!staticClientDeclarations.has(name)) {
            addStaticClientBinding(name);
            staticAliasesChanged = true;
          }
      };
      const bindNamespace = (names: readonly tsNS.Identifier[]): void => {
        for (const name of names)
          if (!staticClientNamespaces.has(name)) {
            addStaticClientBinding(name, true);
            staticAliasesChanged = true;
          }
      };
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer !== undefined &&
        isStaticClientValue(node.initializer)
      )
        bind(bindingIdentifiers(ts, node.name));
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer !== undefined &&
        isStaticClientNamespaceValue(node.initializer) &&
        ts.isIdentifier(node.name)
      )
        bindNamespace([node.name]);
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isStaticClientValue(node.right) &&
        ts.isIdentifier(node.left)
      ) {
        const declaration = dynamicImportProvenance.declarationForReference(node.left);
        if (declaration !== null) bind([declaration]);
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isStaticClientNamespaceValue(node.right) &&
        ts.isIdentifier(node.left)
      ) {
        const declaration = dynamicImportProvenance.declarationForReference(node.left);
        if (declaration !== null) bindNamespace([declaration]);
      }
      ts.forEachChild(node, collectStaticAliases);
    };
    collectStaticAliases(sourceFile);
  }
  const precollectedDirectImports = new Map<tsNS.CallExpression, DynamicImportBinding>();
  const precollectDirectImports = (node: tsNS.Node): void => {
    if (ts.isCallExpression(node)) {
      const dynamic = dynamicImportModule(ts, node, sourceFile.fileName);
      const binding = dynamic === null ? null : dynamicImportBindingName(ts, node);
      if (dynamic !== null && binding !== null) {
        const dynamicImport = addDynamicModuleBindings(
          ts,
          binding,
          node,
          dynamic,
          bindings,
          constructors,
          constructorNamespaces,
          sessionWrappers,
          sessionWrapperNamespaces,
          clientNamespaces
        );
        precollectedDirectImports.set(node, dynamicImport);
        for (const declaration of dynamicImport.declarations)
          dynamicImportProvenance.add(declaration, [node]);
        if (!ts.isIdentifier(binding))
          for (const declaration of dynamicImport.declarations)
            addDynamicCapabilityOrigins(
              declaration.text,
              [node],
              declaration,
              dynamic === "client"
                ? "drizzle-executor"
                : dynamic === "session"
                  ? "session-wrapper"
                  : dynamic
            );
      }
    }
    ts.forEachChild(node, precollectDirectImports);
  };
  precollectDirectImports(sourceFile);
  const findContainedDynamicClientKind: (node: tsNS.Node) => ClientKind | null =
    hasPossibleDynamicImport
      ? createContainedDynamicClientKindFinder(ts, (node) => {
          const dynamic = dynamicImportModule(ts, node, sourceFile.fileName);
          return dynamic === "client" || dynamic === "session" ? dynamic : null;
        })
      : () => null;
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      /typeof\s+db/.test(statement.type.getText(sourceFile))
    )
      databaseTypeAliases.add(statement.name.text);
  }
  const isTypedCapabilityParameter = (parameter: tsNS.ParameterDeclaration): boolean => {
    const annotation = parameter.type?.getText(sourceFile) ?? "";
    return (
      databaseTypeAliases.has(annotation.trim()) ||
      /(?:typeof\s+db|\b[A-Za-z0-9_]*Transaction\b|\b[A-Za-z0-9_]*Executor\b|\bSql\b)/.test(
        annotation
      )
    );
  };
  const typedFunctionParameters = new Map<tsNS.Identifier, readonly tsNS.ParameterDeclaration[]>();
  const typedFunctionDeclarations = new Map<tsNS.Identifier, tsNS.FunctionLikeDeclaration>();
  const collectTypedFunctions = (node: tsNS.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      typedFunctionParameters.set(node.name, node.parameters);
      typedFunctionDeclarations.set(node.name, node);
    } else if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      ts.isVariableDeclaration(node.parent) &&
      node.parent.initializer === node &&
      ts.isIdentifier(node.parent.name)
    ) {
      typedFunctionParameters.set(node.parent.name, node.parameters);
      typedFunctionDeclarations.set(node.parent.name, node);
    }
    ts.forEachChild(node, collectTypedFunctions);
  };
  collectTypedFunctions(sourceFile);
  const isImportedFunctionReference = (expression: tsNS.Expression): boolean => {
    if (!ts.isIdentifier(expression)) return false;
    const declaration = dynamicImportProvenance.declarationForReference(expression);
    return (
      declaration !== null &&
      (ts.isImportSpecifier(declaration.parent) ||
        ts.isNamespaceImport(declaration.parent) ||
        ts.isImportClause(declaration.parent))
    );
  };
  const selectsCallResult = (call: tsNS.CallExpression): boolean => {
    let cursor: tsNS.Node = call;
    while (
      (ts.isParenthesizedExpression(cursor.parent) ||
        ts.isAsExpression(cursor.parent) ||
        ts.isTypeAssertionExpression(cursor.parent) ||
        ts.isNonNullExpression(cursor.parent) ||
        ts.isSatisfiesExpression(cursor.parent)) &&
      cursor.parent.expression === cursor
    )
      cursor = cursor.parent;
    return (
      (ts.isPropertyAccessExpression(cursor.parent) ||
        ts.isElementAccessExpression(cursor.parent)) &&
      cursor.parent.expression === cursor
    );
  };
  const provenTypedDependencies = new Map<tsNS.ParameterDeclaration, boolean>();
  const provingTypedDependencies = new Set<tsNS.ParameterDeclaration>();
  const isProvenTypedDependency = (
    callee: tsNS.Identifier,
    parameter: tsNS.ParameterDeclaration
  ): boolean => {
    const cached = provenTypedDependencies.get(parameter);
    if (cached !== undefined) return cached;
    if (provingTypedDependencies.has(parameter)) return false;
    const functionLike = typedFunctionDeclarations.get(
      dynamicImportProvenance.declarationForReference(callee) ?? callee
    );
    const declarations = bindingIdentifiers(ts, parameter.name);
    const [declaration] = declarations;
    if (
      functionLike === undefined ||
      declarations.length !== 1 ||
      declaration === undefined ||
      !isTypedCapabilityParameter(parameter)
    )
      return false;
    provingTypedDependencies.add(parameter);
    let used = false;
    let valid = true;
    const visitParameterUse = (node: tsNS.Node): void => {
      if (ts.isTypeNode(node)) return;
      if (
        ts.isIdentifier(node) &&
        node !== declaration &&
        dynamicImportProvenance.declarationForReference(node) === declaration
      ) {
        used = true;
        let owner: tsNS.Node | undefined = node.parent;
        while (owner !== undefined && !ts.isFunctionLike(owner)) owner = owner.parent;
        let cursor: tsNS.Node = node;
        while (
          (ts.isParenthesizedExpression(cursor.parent) ||
            ts.isAsExpression(cursor.parent) ||
            ts.isTypeAssertionExpression(cursor.parent) ||
            ts.isNonNullExpression(cursor.parent) ||
            ts.isSatisfiesExpression(cursor.parent) ||
            (ts.isPropertyAccessExpression(cursor.parent) &&
              cursor.parent.expression === cursor)) &&
          cursor.parent.expression === cursor
        )
          cursor = cursor.parent;
        const call = ts.isCallExpression(cursor.parent) ? cursor.parent : null;
        const direct =
          call !== null &&
          call.expression === cursor &&
          DIRECT_STATIC_CLIENT_OPERATIONS.has(memberNames(ts, cursor as tsNS.Expression)[0] ?? "");
        const callee = call !== null && ts.isIdentifier(call.expression) ? call.expression : null;
        const handoff =
          call === null || callee === null
            ? undefined
            : typedFunctionParameters.get(
                dynamicImportProvenance.declarationForReference(callee) ?? callee
              )?.[call.arguments.indexOf(cursor as tsNS.Expression)];
        if (
          owner !== functionLike ||
          (!direct &&
            (handoff === undefined || callee === null || !isProvenTypedDependency(callee, handoff)))
        )
          valid = false;
      }
      ts.forEachChild(node, visitParameterUse);
    };
    visitParameterUse(functionLike);
    const proven = used && valid;
    provingTypedDependencies.delete(parameter);
    provenTypedDependencies.set(parameter, proven);
    return proven;
  };
  const isStaticClientUsedByAcceptedOperation = (expression: tsNS.Expression): boolean => {
    let cursor: tsNS.Node = expression;
    while (cursor.parent !== undefined) {
      const parent = cursor.parent;
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
      if (ts.isPropertyAccessExpression(parent) && parent.expression === cursor) {
        cursor = parent;
        continue;
      }
      if (!ts.isCallExpression(parent)) return false;
      if (parent.expression === cursor) {
        const members = memberNames(ts, cursor as tsNS.Expression);
        return (
          DIRECT_STATIC_CLIENT_OPERATIONS.has(members[0] ?? "") ||
          (members[0] === "db" && DIRECT_STATIC_CLIENT_OPERATIONS.has(members[1] ?? ""))
        );
      }
      if (
        !parent.arguments.includes(cursor as tsNS.Expression) ||
        !ts.isIdentifier(parent.expression) ||
        selectsCallResult(parent)
      )
        return false;
      const parameters = typedFunctionParameters.get(
        dynamicImportProvenance.declarationForReference(parent.expression) ?? parent.expression
      );
      const parameter = parameters?.[parent.arguments.indexOf(cursor as tsNS.Expression)];
      return (
        (parameter !== undefined && isProvenTypedDependency(parent.expression, parameter)) ||
        isImportedFunctionReference(parent.expression)
      );
    }
    return false;
  };
  const containsUnsupportedStaticClientValue = (expression: tsNS.Expression): boolean => {
    if (ts.isFunctionLike(expression)) return false;
    let found = false;
    const visitStaticClientValue = (node: tsNS.Node): void => {
      if (found || ts.isTypeNode(node) || (node !== expression && ts.isFunctionLike(node))) return;
      const isPropertyName =
        ts.isIdentifier(node) &&
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.name === node;
      if (
        ts.isExpression(node) &&
        !isPropertyName &&
        isStaticClientValue(node) &&
        !isStaticClientUsedByAcceptedOperation(node)
      ) {
        found = true;
        return;
      }
      ts.forEachChild(node, visitStaticClientValue);
    };
    visitStaticClientValue(expression);
    return found;
  };
  const factoryOriginsInExpression = (
    expression: tsNS.Expression
  ): readonly tsNS.CallExpression[] => {
    const origins: tsNS.CallExpression[] = [];
    const visit = (node: tsNS.Node): void => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isCallExpression(node))
        for (const origin of ts.isIdentifier(node.expression)
          ? (clientFactoryOrigins.get(
              dynamicImportProvenance.declarationForReference(node.expression) ?? node.expression
            ) ?? [])
          : directIifeOrigins(node))
          if (!origins.includes(origin)) origins.push(origin);
      ts.forEachChild(node, visit);
    };
    visit(expression);
    return origins;
  };
  const visit = (node: tsNS.Node): void => {
    if (
      ts.isArrowFunction(node) &&
      ts.isExpression(node.body) &&
      containsUnsupportedStaticClientValue(node.body)
    ) {
      fail("query_inventory_scan_invalid", "client-factory-return");
    }
    if (
      ts.isReturnStatement(node) &&
      node.expression !== undefined &&
      containsUnsupportedStaticClientValue(node.expression)
    ) {
      fail("query_inventory_scan_invalid", "client-factory-return");
    }
    if (ts.isFunctionLike(node)) {
      for (const parameter of node.parameters) {
        if (isTypedCapabilityParameter(parameter)) {
          for (const name of bindingNames(ts, parameter.name)) {
            bindings.set(name, "transaction-executor");
            typedCapabilityBindings.add(name);
          }
        }
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const initializer = node.initializer;
      if (ts.isIdentifier(node.name))
        for (const origin of factoryOriginsInExpression(initializer))
          dynamicImportProvenance.add(node.name, [origin]);
      const namespaceKind =
        ts.isIdentifier(initializer) && isClientReferenceAllowed(initializer)
          ? clientNamespaces.has(initializer.text)
            ? "client"
            : sessionWrapperNamespaces.has(initializer.text)
              ? "session"
              : (constructorNamespaces.get(initializer.text) ?? null)
          : null;
      if (namespaceKind !== null) {
        const namespaceOrigins = dynamicOriginsForExpression(initializer);
        if (ts.isIdentifier(node.name)) {
          if (namespaceKind !== "client" && namespaceOrigins.length > 0)
            fail("query_inventory_scan_invalid", "dynamic-db-import");
          if (namespaceKind === "client") {
            clientNamespaces.set(node.name.text, "drizzle-executor");
          } else if (namespaceKind === "session") sessionWrapperNamespaces.add(node.name.text);
          else constructorNamespaces.set(node.name.text, namespaceKind);
          addStaticCapabilityBinding(node.name);
          addDynamicCapabilityOrigins(
            node.name.text,
            namespaceOrigins,
            node.name,
            namespaceKind === "client"
              ? "client-namespace"
              : namespaceKind === "session"
                ? "session-namespace"
                : `${namespaceKind}-namespace`
          );
        } else {
          const name =
            namespaceKind === "client"
              ? exactDbBindingName(ts, node.name)
              : namespaceKind === "session"
                ? exactModuleExportBindingName(
                    ts,
                    node.name,
                    new Set(["withSessionDatabaseClient"])
                  )
                : namespaceKind === "postgres"
                  ? exactModuleExportBindingName(ts, node.name, new Set(["default", "postgres"]))
                  : exactModuleExportBindingName(ts, node.name, new Set(["drizzle"]));
          if (name === null) fail("query_inventory_scan_invalid", "namespace-capability");
          if (namespaceKind === "client") bindings.set(name, "drizzle-executor");
          else if (namespaceKind === "session") sessionWrappers.add(name);
          else constructors.set(name, namespaceKind);
          addDynamicCapabilityOrigins(
            name,
            namespaceOrigins,
            bindingIdentifierNamed(node.name, name),
            namespaceKind === "client"
              ? "drizzle-executor"
              : namespaceKind === "session"
                ? "session-wrapper"
                : namespaceKind
          );
        }
      }
      const conditionalKind = transparentConditionalClientKindOrThrow(
        ts,
        initializer,
        bindings,
        clientNamespaces,
        constructors,
        constructorNamespaces,
        isClientReferenceAllowed
      );
      const referencedKind =
        conditionalKind ??
        clientAliasKindForExpression(
          ts,
          initializer,
          bindings,
          clientNamespaces,
          isClientReferenceAllowed
        );
      if (
        referencedKind === null &&
        !isStaticClientValue(initializer) &&
        containsUnsupportedStaticClientValue(initializer)
      ) {
        fail("query_inventory_scan_invalid", "client-assignment");
      }
      if (referencedKind !== null) {
        if (ts.isIdentifier(node.name)) {
          bindings.set(node.name.text, referencedKind);
          addDynamicCapabilityOrigins(
            node.name.text,
            dynamicOriginsForExpression(initializer),
            node.name,
            referencedKind
          );
        } else {
          const fallbackName = typedDependencyDbFallbackName(
            ts,
            node.name,
            initializer,
            typedCapabilityBindings,
            bindings
          );
          const fallbackKind = bindings.get("db");
          if (fallbackName !== null && fallbackKind !== undefined)
            bindings.set(fallbackName, fallbackKind);
          else if (bindingPatternHasClientCapability(ts, node.name))
            fail("query_inventory_scan_invalid", "client-assignment");
        }
      }
      const destructuredDbName = exactDbBindingName(ts, node.name);
      if (namespaceKind === "client" && destructuredDbName !== null)
        addDynamicCapabilityOrigins(
          destructuredDbName,
          dynamicOriginsForExpression(initializer),
          bindingIdentifierNamed(node.name, destructuredDbName),
          "drizzle-executor"
        );
      const referencedConstructor =
        namespaceKind === null
          ? constructorKindForExpression(
              ts,
              initializer,
              constructors,
              constructorNamespaces,
              isClientReferenceAllowed
            )
          : null;
      if (referencedConstructor !== null) {
        if (!ts.isIdentifier(node.name)) fail("query_inventory_scan_invalid", "client-assignment");
        constructors.set(node.name.text, referencedConstructor);
        addStaticCapabilityBinding(node.name);
        addDynamicCapabilityOrigins(
          node.name.text,
          dynamicOriginsForExpression(initializer),
          node.name,
          referencedConstructor
        );
      }
      if (
        isSessionWrapperCall(
          ts,
          initializer,
          sessionWrappers,
          sessionWrapperNamespaces,
          isClientReferenceAllowed
        )
      ) {
        if (!ts.isIdentifier(node.name)) fail("query_inventory_scan_invalid", "client-assignment");
        sessionWrappers.add(node.name.text);
        addStaticCapabilityBinding(node.name);
        addDynamicCapabilityOrigins(
          node.name.text,
          dynamicOriginsForExpression(initializer),
          node.name,
          "session-wrapper"
        );
      }
      const dynamicKind =
        hasPossibleDynamicImport && hasPossibleDynamicImportSyntax(initializer.getText(sourceFile))
          ? findContainedDynamicClientKind(initializer)
          : null;
      if (
        dynamicKind !== null &&
        ts.isIdentifier(node.name) &&
        /^(?:db|database|tx|session)$/i.test(node.name.text)
      ) {
        bindings.set(node.name.text, dynamicKind);
      }
      const importedDb = bindings.get("db");
      if (importedDb !== undefined) addObjectDbBindings(ts, node.name, importedDb, bindings);
      const constructedClient =
        conditionalKind === null
          ? constructorResultClientKind(
              ts,
              initializer,
              constructors,
              constructorNamespaces,
              isClientReferenceAllowed
            )
          : null;
      if (constructedClient !== null) {
        if (!ts.isIdentifier(node.name)) fail("query_inventory_scan_invalid", "client-assignment");
        bindings.set(node.name.text, constructedClient);
        addDynamicCapabilityOrigins(
          node.name.text,
          dynamicOriginsForExpression(initializer),
          node.name,
          constructedClient
        );
      } else if (
        conditionalKind === null &&
        (containsConstructorResult(
          ts,
          initializer,
          constructors,
          constructorNamespaces,
          isClientReferenceAllowed
        ) ||
          isUnsupportedKnownClientValueExtraction(
            ts,
            initializer,
            bindings,
            clientNamespaces,
            isClientReferenceAllowed
          ))
      ) {
        fail("query_inventory_scan_invalid", "client-assignment");
      }
      const awaitedFactory = ts.isAwaitExpression(initializer)
        ? initializer.expression
        : initializer;
      if (ts.isCallExpression(awaitedFactory)) {
        const origins = ts.isIdentifier(awaitedFactory.expression)
          ? (clientFactoryOrigins.get(
              dynamicImportProvenance.declarationForReference(awaitedFactory.expression) ??
                awaitedFactory.expression
            ) ?? [])
          : directIifeOrigins(awaitedFactory);
        if (origins.length > 0) {
          for (const name of factoryClientBindingNames(ts, node.name)) {
            bindings.set(name, "drizzle-executor");
            addDynamicCapabilityOrigins(
              name,
              origins,
              bindingIdentifierNamed(node.name, name),
              "drizzle-executor"
            );
          }
        }
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const conditionalKind = transparentConditionalClientKindOrThrow(
        ts,
        node.right,
        bindings,
        clientNamespaces,
        constructors,
        constructorNamespaces,
        isClientReferenceAllowed
      );
      const referencedKind =
        conditionalKind ??
        clientAliasKindForExpression(
          ts,
          node.right,
          bindings,
          clientNamespaces,
          isClientReferenceAllowed
        );
      if (
        referencedKind === null &&
        !isStaticClientValue(node.right) &&
        containsUnsupportedStaticClientValue(node.right)
      ) {
        fail("query_inventory_scan_invalid", "client-assignment");
      }
      const referencedConstructor = constructorKindForExpression(
        ts,
        node.right,
        constructors,
        constructorNamespaces,
        isClientReferenceAllowed
      );
      const constructedClient =
        conditionalKind === null
          ? constructorResultClientKind(
              ts,
              node.right,
              constructors,
              constructorNamespaces,
              isClientReferenceAllowed
            )
          : null;
      if (referencedKind !== null) {
        assignClientAliases(ts, node.left, referencedKind, bindings);
        const names = assignmentTargetIdentifiers(ts, node.left);
        const declaration = assignmentDeclaration(node.left);
        if (names !== null)
          for (const name of names)
            addDynamicCapabilityOrigins(
              name,
              dynamicOriginsForExpression(node.right),
              declaration ?? undefined,
              referencedKind
            );
      } else if (referencedConstructor !== null) {
        if (!ts.isIdentifier(node.left)) fail("query_inventory_scan_invalid", "client-assignment");
        constructors.set(node.left.text, referencedConstructor);
        const declaration = assignmentDeclaration(node.left);
        if (declaration !== null) addStaticCapabilityBinding(declaration);
        addDynamicCapabilityOrigins(
          node.left.text,
          dynamicOriginsForExpression(node.right),
          declaration ?? undefined,
          referencedConstructor
        );
      } else if (constructedClient !== null) {
        assignClientAliases(ts, node.left, constructedClient, bindings);
        const names = assignmentTargetIdentifiers(ts, node.left);
        const declaration = assignmentDeclaration(node.left);
        if (names !== null)
          for (const name of names)
            addDynamicCapabilityOrigins(
              name,
              dynamicOriginsForExpression(node.right),
              declaration ?? undefined,
              constructedClient
            );
      } else if (
        ts.isIdentifier(node.right) &&
        clientNamespaces.has(node.right.text) &&
        isClientReferenceAllowed(node.right)
      ) {
        assignClientNamespaceAliases(ts, node.left, clientNamespaces, bindings);
        const destructuredDb = exactDbAssignmentTargetIdentifier(ts, node.left);
        if (destructuredDb !== null)
          addDynamicCapabilityOrigins(
            destructuredDb.text,
            dynamicOriginsForExpression(node.right),
            dynamicImportProvenance.declarationForReference(destructuredDb) ?? undefined,
            "drizzle-executor"
          );
      } else if (
        isSessionWrapperCall(
          ts,
          node.right,
          sessionWrappers,
          sessionWrapperNamespaces,
          isClientReferenceAllowed
        )
      ) {
        if (!ts.isIdentifier(node.left)) fail("query_inventory_scan_invalid", "client-assignment");
        sessionWrappers.add(node.left.text);
        const declaration = assignmentDeclaration(node.left);
        if (declaration !== null) addStaticCapabilityBinding(declaration);
        addDynamicCapabilityOrigins(
          node.left.text,
          dynamicOriginsForExpression(node.right),
          declaration ?? undefined,
          "session-wrapper"
        );
      } else if (
        (conditionalKind === null &&
          (containsConstructorResult(
            ts,
            node.right,
            constructors,
            constructorNamespaces,
            isClientReferenceAllowed
          ) ||
            isUnsupportedKnownClientValueExtraction(
              ts,
              node.right,
              bindings,
              clientNamespaces,
              isClientReferenceAllowed
            ))) ||
        hasKnownClientAssignmentTarget(ts, node.left, bindings, clientNamespaces) ||
        (ts.isIdentifier(node.right) &&
          (constructorNamespaces.has(node.right.text) ||
            sessionWrapperNamespaces.has(node.right.text)))
      ) {
        fail("query_inventory_scan_invalid", "client-assignment");
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const parameters = typedFunctionParameters.get(
          dynamicImportProvenance.declarationForReference(node.expression) ?? node.expression
        );
        if (parameters !== undefined)
          for (const [index, parameter] of parameters.entries()) {
            const argument = node.arguments[index];
            if (argument !== undefined && isTypedCapabilityParameter(parameter))
              for (const origin of dynamicOriginsForExpression(argument))
                for (const declaration of bindingIdentifiers(ts, parameter.name))
                  dynamicImportProvenance.add(declaration, [origin]);
          }
      }
      collectNonliteralDynamicImportBinding(ts, node, nonliteralDynamicImportBindings);
      const dynamic = dynamicImportModule(ts, node, sourceFile.fileName);
      const dynamicBinding = dynamic === null ? null : dynamicImportBindingName(ts, node);
      const thenBinding =
        dynamic === "client" ? collectLiteralDynamicClientThenBinding(ts, node) : null;
      if (lifecycleLoaderImports.has(node)) {
        // The verified zero-argument lifecycle loader is intentionally not a
        // caller or a capability origin.
      } else if (dynamic !== null && dynamicBinding !== null) {
        const dynamicImport = precollectedDirectImports.get(node);
        if (dynamicImport === undefined) fail("query_inventory_scan_invalid", "dynamic-db-import");
        dynamicImports.push(dynamicImport);
      } else if (thenBinding !== null) {
        for (const name of thenBinding.namespaceNames) {
          clientNamespaces.set(name, "drizzle-executor");
        }
        if (thenBinding.namespaceDeclaration !== null) {
          literalDynamicThenNamespaces.push(
            Object.freeze({
              declaration: thenBinding.namespaceDeclaration,
              kind: "client",
              name: thenBinding.namespaceDeclaration.text,
              origin: thenBinding.node,
            })
          );
        }
        for (const [index, name] of thenBinding.dbBindingNames.entries()) {
          bindings.set(name, "drizzle-executor");
          addDynamicCapabilityOrigins(
            name,
            [thenBinding.node],
            thenBinding.declarations[index],
            "drizzle-executor"
          );
        }
        dynamicImports.push(
          Object.freeze({
            declarations: thenBinding.declarations,
            node: thenBinding.node,
            names: thenBinding.names,
          })
        );
        for (const declaration of thenBinding.declarations)
          dynamicImportProvenance.add(declaration, [thenBinding.node]);
      } else if (dynamic !== null) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      const root = rootIdentifier(ts, node.expression);
      const terminal = ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : null;
      const transactionClient = clientKindForExpression(
        ts,
        node.expression,
        bindings,
        clientNamespaces,
        isClientReferenceAllowed
      );
      if (root !== null && terminal === "transaction" && transactionClient !== null) {
        const callback = callbackFromArguments(ts, node.arguments);
        if (callback !== null)
          registerCallbackBinding(ts, callback, "transaction-executor", bindings);
      }
      if (
        isSessionWrapperCall(
          ts,
          node.expression,
          sessionWrappers,
          sessionWrapperNamespaces,
          isClientReferenceAllowed
        )
      ) {
        const callback = callbackFromArguments(ts, node.arguments);
        if (callback !== null) registerCallbackBinding(ts, callback, "session-client", bindings);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze({
    dynamicImports: Object.freeze(dynamicImports),
    dynamicCapabilityAliasNames,
    dynamicCapabilityAliasDeclarations,
    dynamicCapabilityAliasKinds,
    dynamicImportProvenance,
    isClientReferenceAllowed,
    literalDynamicThenNamespaces: Object.freeze(literalDynamicThenNamespaces),
    nonliteralDynamicImportBindings,
  });
}
