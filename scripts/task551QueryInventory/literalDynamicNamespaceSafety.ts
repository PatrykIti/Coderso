/**
 * Source-only safety checks for literal dynamic database-client namespaces.
 *
 * A namespace returned by `await import("../db/client")` is not a database
 * executor by itself. The scanner accepts only its exact `db` capability path;
 * every other value escape is rejected before caller classification.
 */
import type * as tsNS from "typescript";

import { fail } from "./contracts";
import { dynamicImportBindingName } from "./nonliteralDynamicImports";

type TypeScriptAdapter = typeof tsNS;
type TransparentExpression =
  | tsNS.ParenthesizedExpression
  | tsNS.AsExpression
  | tsNS.TypeAssertion
  | tsNS.NonNullExpression
  | tsNS.SatisfiesExpression
  | tsNS.AwaitExpression;

export type LiteralDynamicNamespaceKind = "client" | "session" | "postgres" | "drizzle";

export type LiteralDynamicNamespaceBinding = Readonly<{
  declaration: tsNS.Identifier;
  kind: LiteralDynamicNamespaceKind;
  name: string;
  origin: tsNS.CallExpression;
}>;

export type LiteralDynamicCapabilityBinding = Readonly<{
  declaration: tsNS.Identifier;
  kind: string;
  name: string;
}>;

type ScopeKind = "block" | "function" | "source";
type Scope = Readonly<{
  bindings: Map<string, Set<tsNS.Identifier>>;
  kind: ScopeKind;
  parent: Scope | null;
}>;

/** A conservative lexical gate that never skips an ambiguous dynamic import. */
export function hasPossibleDynamicImportSyntax(text: string): boolean {
  let offset = 0;
  while ((offset = text.indexOf("import", offset)) >= 0) {
    const before = text[offset - 1];
    const after = text[offset + "import".length];
    if (
      (before === undefined || !/[A-Za-z0-9_$]/.test(before)) &&
      (after === undefined || !/[A-Za-z0-9_$]/.test(after))
    ) {
      let cursor = offset + "import".length;
      while (cursor < text.length) {
        while (/\s/.test(text[cursor] ?? "")) cursor += 1;
        if (text.startsWith("/*", cursor)) {
          const end = text.indexOf("*/", cursor + 2);
          if (end < 0) return true;
          cursor = end + 2;
          continue;
        }
        // A line comment may end with CR, LF, CRLF, LS, or PS. Preserve this
        // ambiguous shape for the AST instead of treating it as static import.
        if (text.startsWith("//", cursor)) return true;
        break;
      }
      if (text[cursor] === "(") return true;
    }
    offset += "import".length;
  }
  return false;
}

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

export function bindingIdentifiers(
  ts: TypeScriptAdapter,
  name: tsNS.BindingName
): readonly tsNS.Identifier[] {
  if (ts.isIdentifier(name)) return [name];
  const identifiers: tsNS.Identifier[] = [];
  const visit = (pattern: tsNS.BindingName): void => {
    if (ts.isIdentifier(pattern)) {
      identifiers.push(pattern);
      return;
    }
    for (const element of pattern.elements) if (ts.isBindingElement(element)) visit(element.name);
  };
  visit(name);
  return identifiers;
}

function bindingContainsIdentifier(
  ts: TypeScriptAdapter,
  name: tsNS.BindingName,
  identifier: tsNS.Identifier
): boolean {
  return bindingIdentifiers(ts, name).includes(identifier);
}

function addBinding(scope: Scope, identifier: tsNS.Identifier): void {
  const entries = scope.bindings.get(identifier.text) ?? new Set<tsNS.Identifier>();
  entries.add(identifier);
  scope.bindings.set(identifier.text, entries);
}

function nearestFunctionScope(scope: Scope): Scope {
  let cursor: Scope | null = scope;
  while (cursor !== null && cursor.kind === "block") cursor = cursor.parent;
  return cursor ?? scope;
}

function isVarDeclaration(ts: TypeScriptAdapter, declaration: tsNS.VariableDeclaration): boolean {
  const list = declaration.parent;
  return (
    ts.isVariableDeclarationList(list) &&
    (list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) === 0
  );
}

function declarationScope(
  ts: TypeScriptAdapter,
  declaration: tsNS.VariableDeclaration,
  scope: Scope
): Scope {
  return isVarDeclaration(ts, declaration) ? nearestFunctionScope(scope) : scope;
}

function isScopeNode(ts: TypeScriptAdapter, node: tsNS.Node): ScopeKind | null {
  if (ts.isSourceFile(node)) return "source";
  if (ts.isFunctionLike(node)) return "function";
  if (
    ts.isBlock(node) ||
    ts.isCatchClause(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  )
    return "block";
  return null;
}

function isBindingName(ts: TypeScriptAdapter, node: tsNS.Identifier): boolean {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent))
    return bindingContainsIdentifier(ts, parent.name, node);
  if (
    (ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isEnumDeclaration(parent)) &&
    parent.name === node
  )
    return true;
  if (ts.isImportClause(parent)) return parent.name === node && !parent.isTypeOnly;
  if (ts.isNamespaceImport(parent)) return parent.name === node && !parent.parent.isTypeOnly;
  if (ts.isImportSpecifier(parent))
    return parent.name === node && !parent.isTypeOnly && !parent.parent.parent.isTypeOnly;
  return false;
}

export function isReferenceIdentifier(ts: TypeScriptAdapter, node: tsNS.Identifier): boolean {
  if (isBindingName(ts, node)) return false;
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (
    ts.isPropertyAssignment(parent) &&
    parent.name === node &&
    !ts.isComputedPropertyName(parent.name)
  )
    return false;
  if (
    (ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === node
  )
    return false;
  if (
    ts.isLabeledStatement(parent) ||
    ts.isBreakStatement(parent) ||
    ts.isContinueStatement(parent)
  )
    return false;
  if (ts.isTypeReferenceNode(parent) || ts.isQualifiedName(parent)) return false;
  return true;
}

function buildScopes(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): ReadonlyMap<tsNS.Node, Scope> {
  const scopes = new Map<tsNS.Node, Scope>();
  const create = (kind: ScopeKind, parent: Scope | null): Scope => ({
    bindings: new Map(),
    kind,
    parent,
  });
  const visit = (node: tsNS.Node, inherited: Scope | null): void => {
    const kind = isScopeNode(ts, node);
    const scope = kind === null ? inherited : create(kind, inherited);
    if (scope === null) return;
    scopes.set(node, scope);
    if (ts.isFunctionDeclaration(node) && node.name !== undefined && inherited !== null)
      addBinding(inherited, node.name);
    if (ts.isClassDeclaration(node) && node.name !== undefined && inherited !== null)
      addBinding(inherited, node.name);
    if (ts.isEnumDeclaration(node) && inherited !== null) addBinding(inherited, node.name);
    if (ts.isFunctionExpression(node) && node.name !== undefined) addBinding(scope, node.name);
    if (ts.isParameter(node))
      for (const identifier of bindingIdentifiers(ts, node.name)) addBinding(scope, identifier);
    if (ts.isVariableDeclaration(node))
      for (const identifier of bindingIdentifiers(ts, node.name))
        addBinding(declarationScope(ts, node, scope), identifier);
    if (ts.isCatchClause(node) && node.variableDeclaration !== undefined) {
      for (const identifier of bindingIdentifiers(ts, node.variableDeclaration.name))
        addBinding(scope, identifier);
    }
    if (ts.isImportDeclaration(node) && node.importClause !== undefined) {
      const clause = node.importClause;
      if (clause.isTypeOnly) {
        ts.forEachChild(node, (child) => visit(child, scope));
        return;
      }
      if (clause.name !== undefined) addBinding(scope, clause.name);
      if (clause.namedBindings !== undefined) {
        if (ts.isNamespaceImport(clause.namedBindings))
          addBinding(scope, clause.namedBindings.name);
        else
          for (const element of clause.namedBindings.elements)
            if (!element.isTypeOnly) addBinding(scope, element.name);
      }
    }
    ts.forEachChild(node, (child) => visit(child, scope));
  };
  visit(sourceFile, null);
  return scopes;
}

function scopeForNode(scopes: ReadonlyMap<tsNS.Node, Scope>, node: tsNS.Node): Scope | null {
  let cursor: tsNS.Node | undefined = node;
  while (cursor !== undefined) {
    const scope = scopes.get(cursor);
    if (scope !== undefined) return scope;
    cursor = cursor.parent;
  }
  return null;
}

/** Resolves one runtime reference to its lexical declaration without type-checking. */
export function createLexicalBindingResolver(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): (reference: tsNS.Identifier) => tsNS.Identifier | null {
  const scopes = buildScopes(ts, sourceFile);
  return (reference) => {
    let scope = scopeForNode(scopes, reference);
    while (scope !== null) {
      const declarations = scope.bindings.get(reference.text);
      if (declarations !== undefined) return declarations.values().next().value ?? null;
      scope = scope.parent;
    }
    return null;
  };
}

function resolvesToBinding(
  scopes: ReadonlyMap<tsNS.Node, Scope>,
  node: tsNS.Identifier,
  bindings: ReadonlyMap<tsNS.Identifier, LiteralDynamicNamespaceBinding>
): LiteralDynamicNamespaceBinding | null {
  let scope = scopeForNode(scopes, node);
  while (scope !== null) {
    const declarations = scope.bindings.get(node.text);
    if (declarations !== undefined) {
      for (const declaration of declarations) return bindings.get(declaration) ?? null;
      return null;
    }
    scope = scope.parent;
  }
  return null;
}

function exactDbBinding(ts: TypeScriptAdapter, name: tsNS.BindingName): boolean {
  if (!ts.isObjectBindingPattern(name) || name.elements.length !== 1) return false;
  const [element] = name.elements;
  if (
    element === undefined ||
    element.dotDotDotToken !== undefined ||
    element.initializer !== undefined ||
    !ts.isIdentifier(element.name)
  )
    return false;
  const property = element.propertyName;
  return property === undefined
    ? element.name.text === "db"
    : (ts.isIdentifier(property) || ts.isStringLiteral(property)) && property.text === "db";
}

function exactDbAssignment(ts: TypeScriptAdapter, expression: tsNS.Expression): boolean {
  let target = expression;
  while (ts.isParenthesizedExpression(target)) target = target.expression;
  if (!ts.isObjectLiteralExpression(target) || target.properties.length !== 1) return false;
  const [property] = target.properties;
  if (property === undefined) return false;
  if (ts.isShorthandPropertyAssignment(property))
    return property.name.text === "db" && property.objectAssignmentInitializer === undefined;
  if (
    !ts.isPropertyAssignment(property) ||
    (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) ||
    property.name.text !== "db"
  )
    return false;
  return ts.isIdentifier(property.initializer);
}

function outerTransparentExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let outer = expression;
  while (isTransparentExpression(ts, outer.parent) && outer.parent.expression === outer) {
    outer = outer.parent;
  }
  return outer;
}

function outerPropertyAccess(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): readonly string[] {
  const members: string[] = [];
  let outer = outerTransparentExpression(ts, expression);
  while (true) {
    const parent = outer.parent;
    if (!ts.isPropertyAccessExpression(parent) || parent.expression !== outer) break;
    outer = parent;
    members.push(parent.name.text);
  }
  return members;
}

function directUseParent(ts: TypeScriptAdapter, expression: tsNS.Expression): tsNS.Node {
  let outer = outerTransparentExpression(ts, expression);
  while (ts.isPropertyAccessExpression(outer.parent) && outer.parent.expression === outer)
    outer = outer.parent;
  return outer.parent;
}

function isDirectCallOrTag(ts: TypeScriptAdapter, expression: tsNS.Expression): boolean {
  const parent = expression.parent;
  return (
    (ts.isCallExpression(parent) && parent.expression === expression) ||
    (ts.isTaggedTemplateExpression(parent) && parent.tag === expression)
  );
}

function isExactLocalExtraction(ts: TypeScriptAdapter, expression: tsNS.Expression): boolean {
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

function isAllowedDbUse(ts: TypeScriptAdapter, access: tsNS.PropertyAccessExpression): boolean {
  if (isExactLocalExtraction(ts, access)) return true;
  const members = outerPropertyAccess(ts, access);
  const directMember = members[0];
  if (directMember === undefined) {
    const directAccess = outerTransparentExpression(ts, access);
    return (
      ts.isTaggedTemplateExpression(directAccess.parent) && directAccess.parent.tag === directAccess
    );
  }
  if (
    !new Set([
      "select",
      "execute",
      "insert",
      "update",
      "delete",
      "transaction",
      "batch",
      "query",
    ]).has(directMember)
  )
    return false;
  if (directMember !== "query" && members.length !== 1) return false;
  const parent = directUseParent(ts, access);
  return ts.isCallExpression(parent) || ts.isTaggedTemplateExpression(parent);
}

function isAllowedConstructorOrSessionUse(
  ts: TypeScriptAdapter,
  access: tsNS.PropertyAccessExpression
): boolean {
  return (
    isExactLocalExtraction(ts, access) ||
    isDirectCallOrTag(ts, outerTransparentExpression(ts, access))
  );
}

function expectedNamespaceMember(kind: LiteralDynamicNamespaceKind): ReadonlySet<string> {
  if (kind === "postgres") return new Set(["default", "postgres"]);
  if (kind === "drizzle") return new Set(["drizzle"]);
  if (kind === "session") return new Set(["withSessionDatabaseClient"]);
  return new Set(["db"]);
}

function isAllowedNamespaceUse(
  ts: TypeScriptAdapter,
  binding: LiteralDynamicNamespaceBinding,
  access: tsNS.PropertyAccessExpression
): boolean {
  if (!expectedNamespaceMember(binding.kind).has(access.name.text)) return false;
  return binding.kind === "client"
    ? isAllowedDbUse(ts, access)
    : isAllowedConstructorOrSessionUse(ts, access);
}

function isExactNamespaceDestructure(ts: TypeScriptAdapter, identifier: tsNS.Identifier): boolean {
  const parent = identifier.parent;
  if (ts.isVariableDeclaration(parent) && parent.initializer === identifier)
    return exactDbBinding(ts, parent.name);
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.right === identifier &&
    exactDbAssignment(ts, parent.left)
  );
}

function isTopLevelFunctionReturn(ts: TypeScriptAdapter, identifier: tsNS.Identifier): boolean {
  if (!ts.isReturnStatement(identifier.parent)) return false;
  let cursor: tsNS.Node | undefined = identifier.parent.parent;
  while (cursor !== undefined && !ts.isFunctionLike(cursor)) cursor = cursor.parent;
  if (cursor === undefined) return false;
  cursor = cursor.parent;
  while (cursor !== undefined && !ts.isSourceFile(cursor)) {
    if (ts.isFunctionLike(cursor)) return false;
    cursor = cursor.parent;
  }
  return cursor !== undefined;
}

/** Collects exact direct literal dynamic namespace bindings without evaluating source. */
export function collectLiteralDynamicNamespaceBindings(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  classify: (node: tsNS.CallExpression) => LiteralDynamicNamespaceKind | null
): readonly LiteralDynamicNamespaceBinding[] {
  if (!hasPossibleDynamicImportSyntax(sourceFile.text)) return Object.freeze([]);
  const bindings: LiteralDynamicNamespaceBinding[] = [];
  const visit = (node: tsNS.Node): void => {
    if (ts.isCallExpression(node)) {
      const kind = classify(node);
      const binding = kind === null ? null : dynamicImportBindingName(ts, node);
      if (kind !== null && binding !== null && ts.isIdentifier(binding)) {
        bindings.push(
          Object.freeze({ declaration: binding, kind, name: binding.text, origin: node })
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze(bindings);
}

/** Rejects same-spelling bindings that the string-keyed classifier cannot distinguish safely. */
export function assertNoLiteralDynamicNamespaceNameCollision(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  bindings: readonly LiteralDynamicNamespaceBinding[]
): void {
  const declarationsByName = new Map<string, Set<tsNS.Identifier>>();
  const kindsByName = new Map<string, Set<LiteralDynamicNamespaceKind>>();
  for (const binding of bindings) {
    const declarations = declarationsByName.get(binding.name) ?? new Set<tsNS.Identifier>();
    declarations.add(binding.declaration);
    declarationsByName.set(binding.name, declarations);
    const kinds = kindsByName.get(binding.name) ?? new Set<LiteralDynamicNamespaceKind>();
    kinds.add(binding.kind);
    kindsByName.set(binding.name, kinds);
  }
  if (declarationsByName.size === 0) return;
  const visit = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && isBindingName(ts, node)) {
      const dynamicDeclarations = declarationsByName.get(node.text);
      if (dynamicDeclarations !== undefined && !dynamicDeclarations.has(node))
        fail("query_inventory_scan_invalid", "dynamic-db-import");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if ([...kindsByName.values()].some((kinds) => kinds.size !== 1))
    fail("query_inventory_scan_invalid", "dynamic-db-import");
}

/** Rejects capability aliases whose string-keyed provenance would cross a lexical boundary. */
export function assertNoLiteralDynamicCapabilityAliasNameCollision(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  literalBindings: readonly LiteralDynamicCapabilityBinding[],
  aliasNames: ReadonlySet<string>,
  aliasDeclarations: ReadonlySet<tsNS.Identifier>,
  aliasKinds: ReadonlyMap<tsNS.Identifier, string>
): void {
  const names = new Set(aliasNames);
  const knownDeclarationsByName = new Map<string, Set<tsNS.Identifier>>();
  const knownKinds = new Map<tsNS.Identifier, string>();
  for (const binding of literalBindings) {
    names.add(binding.name);
    const declarations = knownDeclarationsByName.get(binding.name) ?? new Set<tsNS.Identifier>();
    declarations.add(binding.declaration);
    knownDeclarationsByName.set(binding.name, declarations);
    knownKinds.set(binding.declaration, binding.kind);
  }
  for (const declaration of aliasDeclarations) {
    names.add(declaration.text);
    const declarations =
      knownDeclarationsByName.get(declaration.text) ?? new Set<tsNS.Identifier>();
    declarations.add(declaration);
    knownDeclarationsByName.set(declaration.text, declarations);
    const kind = aliasKinds.get(declaration);
    if (kind === undefined) fail("query_inventory_scan_invalid", "dynamic-db-import");
    knownKinds.set(declaration, kind);
  }
  if (names.size === 0) return;
  const declarationsByName = new Map<string, Set<tsNS.Identifier>>();
  const visit = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && names.has(node.text) && isBindingName(ts, node)) {
      const declarations = declarationsByName.get(node.text) ?? new Set<tsNS.Identifier>();
      declarations.add(node);
      declarationsByName.set(node.text, declarations);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const name of names) {
    const declarations = declarationsByName.get(name);
    if (declarations === undefined || declarations.size === 0)
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    if (declarations.size === 1) continue;
    const known = knownDeclarationsByName.get(name) ?? new Set<tsNS.Identifier>();
    if ([...declarations].some((declaration) => !known.has(declaration)))
      fail("query_inventory_scan_invalid", "dynamic-db-import");
    if (new Set([...declarations].map((declaration) => knownKinds.get(declaration))).size !== 1)
      fail("query_inventory_scan_invalid", "dynamic-db-import");
  }
}

/** Rejects all literal dynamic namespace escapes that are not exact supported uses. */
export function assertNoLiteralDynamicClientNamespaceEscape(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  bindings: readonly LiteralDynamicNamespaceBinding[]
): void {
  const byDeclaration = new Map<tsNS.Identifier, LiteralDynamicNamespaceBinding>();
  for (const binding of bindings) byDeclaration.set(binding.declaration, binding);
  if (byDeclaration.size === 0) return;
  const scopes = buildScopes(ts, sourceFile);
  const visit = (node: tsNS.Node): void => {
    if (ts.isIdentifier(node) && isReferenceIdentifier(ts, node)) {
      const binding = resolvesToBinding(scopes, node, byDeclaration);
      if (binding !== null) {
        const parent = node.parent;
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
          if (!isAllowedNamespaceUse(ts, binding, parent))
            fail("query_inventory_scan_invalid", "dynamic-db-import");
        } else if (binding.kind === "client" && isExactNamespaceDestructure(ts, node)) {
          // Exact direct client `{ db }` extraction remains the only whole-module use.
        } else if (binding.kind !== "client" && isTopLevelFunctionReturn(ts, node)) {
          // A top-level factory may return an unused external namespace; nested forwarding is unsafe.
        } else {
          fail("query_inventory_scan_invalid", "dynamic-db-import");
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
