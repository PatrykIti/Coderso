/** Declaration-aware provenance for literal dynamic-import capability values. */
import type * as tsNS from "typescript";

import { createLexicalBindingResolver } from "./literalDynamicNamespaceSafety";

type TypeScriptAdapter = typeof tsNS;

export type DynamicImportProvenance = Readonly<{
  add: (declaration: tsNS.Identifier, origins: readonly tsNS.CallExpression[]) => void;
  declarationForReference: (reference: tsNS.Identifier) => tsNS.Identifier | null;
  originsForExpression: (expression: tsNS.Expression) => readonly tsNS.CallExpression[];
}>;

function unwrapExpression(ts: TypeScriptAdapter, expression: tsNS.Expression): tsNS.Expression {
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

/** Keeps literal-import reachability tied to one lexical declaration. */
export function createDynamicImportProvenance(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): DynamicImportProvenance {
  const originsByDeclaration = new Map<tsNS.Identifier, tsNS.CallExpression[]>();
  const declarationForReference = createLexicalBindingResolver(ts, sourceFile);
  const add = (declaration: tsNS.Identifier, origins: readonly tsNS.CallExpression[]): void => {
    if (origins.length === 0) return;
    const existing = originsByDeclaration.get(declaration) ?? [];
    for (const origin of origins) if (!existing.includes(origin)) existing.push(origin);
    originsByDeclaration.set(declaration, existing);
  };
  const originsForExpression = (expression: tsNS.Expression): readonly tsNS.CallExpression[] => {
    const current = unwrapExpression(ts, expression);
    if (ts.isIdentifier(current)) {
      const declaration = declarationForReference(current);
      return declaration === null ? [] : (originsByDeclaration.get(declaration) ?? []);
    }
    if (ts.isPropertyAccessExpression(current) || ts.isCallExpression(current))
      return originsForExpression(current.expression);
    return [];
  };
  return Object.freeze({ add, declarationForReference, originsForExpression });
}
