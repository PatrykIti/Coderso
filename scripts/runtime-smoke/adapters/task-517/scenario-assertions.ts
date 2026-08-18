import type { SmokeScenarioVariantResult } from "../types";
import { buildTask517AdminVariantAssertions } from "./admin-actions";
import { variantsFor } from "./assertions";
import { buildTask517PublicVariantAssertions } from "./public-actions";
import type { Task517BrowserReceipt } from "./receipt";
import type { Task517ScenarioId } from "./scenarios";

/** Builds the manifestable per-variant assertions from a validated receipt. */
export function buildTask517ScenarioAssertions(
  scenarioId: Task517ScenarioId,
  receipt: Task517BrowserReceipt
): readonly SmokeScenarioVariantResult[] {
  const assertionsByVariant = {
    ...buildTask517PublicVariantAssertions(scenarioId, receipt),
    ...buildTask517AdminVariantAssertions(scenarioId, receipt),
  };
  return variantsFor(scenarioId, assertionsByVariant);
}
