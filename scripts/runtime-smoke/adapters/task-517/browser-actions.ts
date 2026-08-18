// Thin adapter/exports surface for the TASK-517 browser action family. The
// cohesive responsibilities live in sibling modules: fixtures (identity
// provisioning), scenarios (registry), config (action config), materialize
// (inline browser script), receipt (validation), and the public/admin
// assertion builders assembled by scenario-assertions. Keep this file as an
// index only; consumers import "./browser-actions".

export {
  TASK517_FIXTURE_KINDS,
  buildTask517FixtureSpecs,
  deriveTask517FixtureSpec,
  type Task517FixtureKind,
  type Task517FixtureSpec,
} from "./fixtures";
export {
  TASK517_SCENARIOS,
  TASK517_SCENARIO_IDS,
  TASK517_SCENARIO_VARIANTS,
  type Task517ScenarioDescriptor,
  type Task517ScenarioId,
  type Task517Variant,
} from "./scenarios";
export { buildTask517BrowserActionConfig, type Task517BrowserActionConfig } from "./config";
export { materializeTask517BrowserAction } from "./materialize";
export { assertTask517BrowserReceipt, type Task517BrowserReceipt } from "./receipt";
export { buildTask517ScenarioAssertions } from "./scenario-assertions";
