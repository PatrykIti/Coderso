/**
 * AST-only classification of known database constructors and client values.
 *
 * Assignment analysis uses this stricter surface than call-site discovery so
 * extracting an uncalled driver method cannot silently become a client alias.
 */
import type * as tsNS from "typescript";

import { fail } from "./contracts";

export type TypeScriptAdapter = typeof tsNS;
export type ClientKind =
  "drizzle-executor" | "postgres-client" | "session-client" | "transaction-executor";
export type ConstructorKind = "postgres" | "drizzle";
export type CapabilityReferenceAcceptance = (reference: tsNS.Identifier) => boolean;
export type ClientReferenceAcceptance = CapabilityReferenceAcceptance;

export function rootIdentifierNode(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Identifier | null {
  let cursor: tsNS.Expression = expression;
  while (true) {
    if (ts.isIdentifier(cursor)) return cursor;
    if (ts.isPropertyAccessExpression(cursor)) {
      cursor = cursor.expression;
      continue;
    }
    if (ts.isCallExpression(cursor)) {
      cursor = cursor.expression;
      continue;
    }
    if (
      ts.isParenthesizedExpression(cursor) ||
      ts.isAsExpression(cursor) ||
      ts.isTypeAssertionExpression(cursor) ||
      ts.isNonNullExpression(cursor) ||
      ts.isSatisfiesExpression(cursor)
    ) {
      cursor = cursor.expression;
      continue;
    }
    return null;
  }
}

export function rootIdentifier(ts: TypeScriptAdapter, expression: tsNS.Expression): string | null {
  return rootIdentifierNode(ts, expression)?.text ?? null;
}

export function memberNames(ts: TypeScriptAdapter, expression: tsNS.Expression): readonly string[] {
  const names: string[] = [];
  let cursor: tsNS.Expression = expression;
  while (ts.isPropertyAccessExpression(cursor)) {
    names.unshift(cursor.name.text);
    cursor = cursor.expression;
  }
  return names;
}

export function unwrapExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression
): tsNS.Expression {
  let unwrapped = expression;
  while (
    ts.isParenthesizedExpression(unwrapped) ||
    ts.isAsExpression(unwrapped) ||
    ts.isTypeAssertionExpression(unwrapped) ||
    ts.isNonNullExpression(unwrapped) ||
    ts.isSatisfiesExpression(unwrapped) ||
    ts.isAwaitExpression(unwrapped)
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped;
}

export function constructorKindForExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): ConstructorKind | null {
  const unwrapped = unwrapExpression(ts, expression);
  if (ts.isIdentifier(unwrapped))
    return acceptsReference !== undefined && !acceptsReference(unwrapped)
      ? null
      : (constructors.get(unwrapped.text) ?? null);
  if (!ts.isPropertyAccessExpression(unwrapped) || !ts.isIdentifier(unwrapped.expression))
    return null;
  if (acceptsReference !== undefined && !acceptsReference(unwrapped.expression)) return null;
  const kind = constructorNamespaces.get(unwrapped.expression.text);
  if (kind === undefined) return null;
  const member = unwrapped.name.text;
  if (kind === "postgres" && (member === "default" || member === "postgres")) return kind;
  if (kind === "drizzle" && member === "drizzle") return kind;
  return null;
}

export function clientKindForExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  acceptsReference?: ClientReferenceAcceptance
): ClientKind | null {
  const root = rootIdentifierNode(ts, expression);
  if (root === null || (acceptsReference !== undefined && !acceptsReference(root))) return null;
  const direct = bindings.get(root.text);
  if (direct !== undefined) return direct;
  if (!clientNamespaces.has(root.text)) return null;
  return memberNames(ts, expression).at(0) === "db" ? clientNamespaces.get(root.text)! : null;
}

function referencedClientKind(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  acceptsReference?: ClientReferenceAcceptance
): ClientKind | null {
  if (ts.isIdentifier(expression))
    return acceptsReference !== undefined && !acceptsReference(expression)
      ? null
      : (bindings.get(expression.text) ?? null);
  if (
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    return (
      referencedClientKind(ts, expression.left, bindings, acceptsReference) ??
      referencedClientKind(ts, expression.right, bindings, acceptsReference)
    );
  }
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return referencedClientKind(ts, expression.expression, bindings, acceptsReference);
  }
  return null;
}

export function constructorResultClientKind(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): ClientKind | null {
  const unwrapped = unwrapExpression(ts, expression);
  if (!ts.isCallExpression(unwrapped)) return null;
  const constructor = constructorKindForExpression(
    ts,
    unwrapped.expression,
    constructors,
    constructorNamespaces,
    acceptsReference
  );
  return constructor === null
    ? null
    : constructor === "postgres"
      ? "postgres-client"
      : "drizzle-executor";
}

export function containsConstructorResult(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): boolean {
  if (ts.isFunctionLike(expression)) return false;
  let found = false;
  const visit = (node: tsNS.Node): void => {
    if (found || ts.isFunctionLike(node)) return;
    if (
      ts.isCallExpression(node) &&
      constructorKindForExpression(
        ts,
        node.expression,
        constructors,
        constructorNamespaces,
        acceptsReference
      ) !== null
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

export function clientAliasKindForExpression(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): ClientKind | null {
  const direct = referencedClientKind(ts, expression, bindings, acceptsReference);
  if (direct !== null) return direct;
  const unwrapped = unwrapExpression(ts, expression);
  if (!ts.isPropertyAccessExpression(unwrapped)) return null;
  const root = rootIdentifierNode(ts, unwrapped);
  if (
    root === null ||
    (acceptsReference !== undefined && !acceptsReference(root)) ||
    !clientNamespaces.has(root.text)
  )
    return null;
  const names = memberNames(ts, unwrapped);
  return names.length === 1 && names[0] === "db" ? clientNamespaces.get(root.text)! : null;
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

function directConditionalBranchClientKind(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): ClientKind | null {
  const branch = unwrapTransparentExpression(ts, expression);
  if (ts.isIdentifier(branch))
    return acceptsReference !== undefined && !acceptsReference(branch)
      ? null
      : (bindings.get(branch.text) ?? null);
  if (
    ts.isPropertyAccessExpression(branch) &&
    ts.isIdentifier(branch.expression) &&
    branch.name.text === "db"
  ) {
    if (acceptsReference !== undefined && !acceptsReference(branch.expression)) return null;
    return clientNamespaces.get(branch.expression.text) ?? null;
  }
  if (!ts.isCallExpression(branch)) return null;
  const constructor = constructorKindForExpression(
    ts,
    branch.expression,
    constructors,
    constructorNamespaces,
    acceptsReference
  );
  return constructor === null
    ? null
    : constructor === "postgres"
      ? "postgres-client"
      : "drizzle-executor";
}

/**
 * Resolves the only conditional client form accepted by the inventory: one
 * transparent conditional whose two direct branches classify identically.
 */
export function transparentConditionalClientKindOrThrow(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): ClientKind | null {
  const conditional = unwrapTransparentExpression(ts, expression);
  if (!ts.isConditionalExpression(conditional)) return null;
  const whenTrue = directConditionalBranchClientKind(
    ts,
    conditional.whenTrue,
    bindings,
    clientNamespaces,
    constructors,
    constructorNamespaces,
    acceptsReference
  );
  const whenFalse = directConditionalBranchClientKind(
    ts,
    conditional.whenFalse,
    bindings,
    clientNamespaces,
    constructors,
    constructorNamespaces,
    acceptsReference
  );
  if (whenTrue === null && whenFalse === null) return null;
  if (whenTrue === null || whenFalse === null || whenTrue !== whenFalse) {
    fail("query_inventory_scan_invalid", "client-conditional");
  }
  return whenTrue;
}

export function isUnsupportedKnownClientValueExtraction(
  ts: TypeScriptAdapter,
  expression: tsNS.Expression,
  bindings: ReadonlyMap<string, ClientKind>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  acceptsReference?: CapabilityReferenceAcceptance
): boolean {
  const unwrapped = unwrapExpression(ts, expression);
  if (!ts.isPropertyAccessExpression(unwrapped)) return false;
  const root = rootIdentifierNode(ts, unwrapped);
  if (root === null || (acceptsReference !== undefined && !acceptsReference(root))) return false;
  if (bindings.has(root.text)) return true;
  if (!clientNamespaces.has(root.text)) return false;
  const names = memberNames(ts, unwrapped);
  return names.length !== 1 || names[0] !== "db";
}
