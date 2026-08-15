import type { SmokeProfileId } from "../../contracts";

/**
 * TASK-487 (entry revision history + restore) runtime-smoke suite descriptors.
 *
 * The suite exercises the Admin entry editor's revision drawer against a real
 * dev host: login, editor navigation, revision rows, confirm-gated restore
 * (POST + visible data restoration), SEO metadata visibility, and dark-mode
 * parity. Fixtures (a scoped content type + per-scenario content entries with
 * two published revisions each) are bootstrapped through the real admin API in
 * the `admin-login` scenario and torn down by the database worker.
 */

export const TASK487_SCENARIO_IDS = Object.freeze([
  "admin-login",
  "editor-nav",
  "history-drawer-revisions",
  "confirm-gated-restore",
  "seo-fields-visible",
  "dark-parity",
] as const);

export type Task487ScenarioId = (typeof TASK487_SCENARIO_IDS)[number];

export type Task487VariantId = "light-1440x900" | "dark-1440x900";

export interface Task487Variant {
  readonly id: Task487VariantId;
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: 1440; readonly height: 900 }>;
}

export const TASK487_VARIANTS: readonly Task487Variant[] = Object.freeze([
  Object.freeze({
    id: "light-1440x900",
    theme: "light",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
  Object.freeze({
    id: "dark-1440x900",
    theme: "dark",
    viewport: Object.freeze({ width: 1440, height: 900 }),
  }),
] as const satisfies readonly Task487Variant[]);

export interface Task487ScenarioDescriptor {
  readonly id: Task487ScenarioId;
  readonly title: string;
  readonly canonicalVariant: Task487VariantId;
}

export const TASK487_SCENARIOS: readonly Task487ScenarioDescriptor[] = Object.freeze([
  Object.freeze({
    id: "admin-login",
    title: "Admin login bootstraps the revision fixtures",
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "editor-nav",
    title: "Entry editor navigation hydrates title, History and SEO surfaces",
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "history-drawer-revisions",
    title: "History drawer lists both published revisions with preview",
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "confirm-gated-restore",
    title: "Confirm-gated restore POSTs 200 and re-hydrates restored data",
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "seo-fields-visible",
    title: "SEO fields render the persisted metadata values",
    canonicalVariant: "light-1440x900",
  }),
  Object.freeze({
    id: "dark-parity",
    title: "Revision drawer parity under the dark color scheme",
    canonicalVariant: "dark-1440x900",
  }),
] as const satisfies readonly Task487ScenarioDescriptor[]);

const BY_ID = new Map<string, Task487ScenarioDescriptor>(
  TASK487_SCENARIOS.map((descriptor) => [descriptor.id, descriptor])
);

export function task487ScenarioDescriptor(id: string): Task487ScenarioDescriptor {
  const descriptor = BY_ID.get(id);
  if (descriptor === undefined) {
    throw new Error("TASK-487 scenario descriptor is unknown");
  }
  return descriptor;
}

/**
 * Fast: one light variant per scenario, with the dark-parity scenario running
 * dark (its canonical variant) so the manifest screenshot stays dark.
 * Certification: both variants of every scenario, including dark parity.
 * The admin-login scenario always runs exactly once: it is the fixture
 * bootstrap and creating the same slugs twice would conflict, and dark
 * coverage of the revision drawer lives in the dark-parity scenario.
 */
export function task487VariantsFor(
  profile: SmokeProfileId,
  scenarioId: Task487ScenarioId
): readonly Task487Variant[] {
  if (scenarioId === "admin-login") return Object.freeze([TASK487_VARIANTS[0]!]);
  if (profile === "certification") return TASK487_VARIANTS;
  const canonical =
    task487ScenarioDescriptor(scenarioId).canonicalVariant === "dark-1440x900"
      ? TASK487_VARIANTS[1]!
      : TASK487_VARIANTS[0]!;
  return Object.freeze([canonical]);
}

export interface Task487FixtureSpec {
  readonly scenarioId: Task487ScenarioId;
  readonly variantId: Task487VariantId;
}

/** One fixture (entry) per scenario; variants share their scenario's entry. */
export function buildTask487FixtureSpecs(profile: SmokeProfileId): readonly Task487FixtureSpec[] {
  return Object.freeze(
    TASK487_SCENARIO_IDS.flatMap((scenarioId) =>
      task487VariantsFor(profile, scenarioId).map((variant) =>
        Object.freeze({ scenarioId, variantId: variant.id })
      )
    )
  );
}

/** Distinct scenarios for the profile (certification doubles variants, never scenarios). */
export function task487ScenariosFor(profile: SmokeProfileId): readonly Task487ScenarioId[] {
  return TASK487_SCENARIO_IDS;
}
