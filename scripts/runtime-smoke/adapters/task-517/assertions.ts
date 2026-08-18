import type { SmokeVisibleAssertionResult, SmokeScenarioVariantResult } from "../types";
import { TASK517_SCENARIO_VARIANTS, type Task517ScenarioId } from "./scenarios";

/** Builds one manifestable visible assertion from its parts. */
export function assertion(
  kind: SmokeVisibleAssertionResult["kind"],
  target: string,
  property: string,
  expected: string,
  actual: string,
  pass: boolean
): SmokeVisibleAssertionResult {
  return Object.freeze({ kind, target, property, expected, actual, pass });
}

/** Wraps per-variant assertion maps into manifestable variant results. */
export function variantsFor(
  scenarioId: Task517ScenarioId,
  assertionsByVariant: Readonly<Record<string, readonly SmokeVisibleAssertionResult[]>>
): readonly SmokeScenarioVariantResult[] {
  return Object.freeze(
    TASK517_SCENARIO_VARIANTS[scenarioId].map((variant) =>
      Object.freeze({
        id: variant.id,
        surface: variant.surface,
        theme: variant.theme,
        viewport: variant.viewport,
        assertions: assertionsByVariant[variant.id] ?? [],
        consoleErrors: Object.freeze([]),
      })
    )
  );
}
