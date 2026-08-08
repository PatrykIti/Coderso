export interface ExactPredicateContext {
  readonly root: string;
  readonly plan: unknown;
  readonly captures: ReadonlyMap<string, string>;
  readonly priorOutputs: ReadonlyMap<string, unknown>;
  readonly variables: ReadonlyMap<string, unknown>;
  readonly currentOutput: unknown;
}

export function evaluateExactPredicate(
  predicate: unknown,
  context: ExactPredicateContext,
  label?: string
): boolean;
