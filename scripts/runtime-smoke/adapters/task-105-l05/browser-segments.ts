import { SmokeError } from "../../contracts";
import {
  TASK105_L05_BOOTSTRAP_ENDPOINTS,
  TASK105_L05_FORBIDDEN_ROUTE_FRAGMENTS,
  isTask105L05ExpectedSemanticResponse,
  validateTask105L05BrowserReceipt,
  type Task105L05BootstrapEpoch,
  type Task105L05BrowserReceipt,
  type Task105L05RequestFact,
  type Task105L05ScenarioId,
} from "./descriptors";
import type { Task105L05FixturePage } from "./fixture";

/**
 * TASK-105 L05 browser observation producer (contract: TASK-105-08-05-L04).
 *
 * The observer retains only classified facts. Each bootstrap epoch is sealed
 * independently, so the receipt can prove the initial Page-A boot, Page-A's
 * controlled dashboard reload, and Page-B's lazy boot without retaining
 * browser locations, storage, payloads, or request paths.
 */

const PENDING_LIMIT = 32;

type ObserverState =
  | { readonly phase: "bootstrap"; readonly sealed: ReadonlySet<string> }
  | { readonly phase: "semantic" };

export interface Task105L05ObservationInput {
  readonly endpointId: string;
  readonly method: string;
  readonly status: number;
}

function factKey(fact: Pick<Task105L05RequestFact, "endpointId" | "method" | "status">): string {
  return `${fact.method}\u0000${fact.endpointId}\u0000${fact.status}`;
}

export class Task105L05PageObserver {
  #state: ObserverState;
  readonly #pending: Task105L05RequestFact[] = [];
  readonly #bootstrapFacts = new Map<string, Task105L05RequestFact>();
  readonly #bootstrapEpochs: Task105L05BootstrapEpoch[] = [];
  readonly #semanticFacts = new Map<string, Task105L05RequestFact>();
  #consoleErrors = 0;
  #pageErrors = 0;

  constructor() {
    this.#state = { phase: "bootstrap", sealed: new Set<string>() };
  }

  #fail(message: string): never {
    throw new SmokeError("smoke_output_invalid", message);
  }

  #assertNotForbidden(endpointId: string): void {
    if (TASK105_L05_FORBIDDEN_ROUTE_FRAGMENTS.some((fragment) => endpointId.includes(fragment))) {
      this.#fail(`TASK-105 L05 forbids classified endpoint ${endpointId}`);
    }
  }

  /** Classifies one application API response. Unknown or forbidden traffic fails closed. */
  observeResponse(input: Task105L05ObservationInput): void {
    const safeKey = `${input.method} ${input.endpointId}:${input.status}`;
    this.#assertNotForbidden(input.endpointId);
    if (this.#state.phase === "bootstrap") {
      const expected = TASK105_L05_BOOTSTRAP_ENDPOINTS.find(
        ({ endpointId, method }) => endpointId === input.endpointId && method === input.method
      );
      if (expected === undefined) {
        if (this.#isSemantic(input)) {
          if (this.#pending.length >= PENDING_LIMIT) {
            this.#fail("TASK-105 L05 pending semantic queue overflowed");
          }
          this.#pushFact(this.#pending, input);
          return;
        }
        this.#fail(`TASK-105 L05 observed unknown pre-seal traffic ${safeKey}`);
      }
      if (input.status !== expected.status) {
        this.#fail(`TASK-105 L05 bootstrap ${safeKey} status is invalid`);
      }
      this.#recordFact(this.#bootstrapFacts, input);
      const sealed = new Set(this.#state.sealed);
      sealed.add(expected.endpointId);
      if (sealed.size === TASK105_L05_BOOTSTRAP_ENDPOINTS.length) {
        const facts = Object.freeze(
          [...this.#bootstrapFacts.values()].map((fact) => Object.freeze({ ...fact }))
        );
        this.#bootstrapEpochs.push(Object.freeze({ facts }));
        for (const fact of this.#pending) this.#recordFact(this.#semanticFacts, fact);
        this.#pending.length = 0;
        this.#bootstrapFacts.clear();
        this.#state = { phase: "semantic" };
      } else {
        this.#state = { phase: "bootstrap", sealed };
      }
      return;
    }
    if (!this.#isSemantic(input)) {
      this.#fail(`TASK-105 L05 observed unknown post-seal traffic ${safeKey}`);
    }
    this.#recordFact(this.#semanticFacts, input);
  }

  #isSemantic(input: Task105L05ObservationInput): boolean {
    return isTask105L05ExpectedSemanticResponse(input);
  }

  #pushFact(target: Task105L05RequestFact[], input: Task105L05ObservationInput): void {
    target.push(Object.freeze({ ...input, count: 1 }));
  }

  #recordFact(target: Map<string, Task105L05RequestFact>, input: Task105L05ObservationInput): void {
    const key = factKey(input);
    const existing = target.get(key);
    if (existing === undefined) {
      target.set(key, Object.freeze({ ...input, count: 1 }));
      return;
    }
    target.set(key, Object.freeze({ ...existing, count: existing.count + 1 }));
  }

  /** Starts the only permitted subsequent Page-A bootstrap epoch after a reload. */
  beginNextBootstrapEpoch(): void {
    if (this.#state.phase !== "semantic" || this.#bootstrapEpochs.length !== 1) {
      this.#fail("TASK-105 L05 bootstrap epoch restart is invalid");
    }
    this.#state = { phase: "bootstrap", sealed: new Set<string>() };
  }

  observeConsoleError(): void {
    this.#consoleErrors += 1;
  }

  observePageError(): void {
    this.#pageErrors += 1;
  }

  isSealed(): boolean {
    return this.#state.phase === "semantic";
  }

  epochCount(): number {
    return this.#bootstrapEpochs.length;
  }

  produceReceipt(scenarioIds: readonly string[]): Task105L05BrowserReceipt {
    if (!this.isSealed()) this.#fail("TASK-105 L05 receipt attempted before bootstrap sealed");
    return validateTask105L05BrowserReceipt({
      scenarioIds: [...scenarioIds],
      consoleErrorCount: this.#consoleErrors,
      pageErrorCount: this.#pageErrors,
      bootstrapEpochs: this.#bootstrapEpochs.map((epoch) => ({
        facts: epoch.facts.map((fact) => ({ ...fact })),
      })),
      semanticFacts: [...this.#semanticFacts.values()].map((fact) => ({ ...fact })),
      authFactTotal: [
        ...this.#bootstrapEpochs.flatMap(({ facts }) => facts),
        ...this.#semanticFacts.values(),
      ]
        .filter((fact) => fact.endpointId.startsWith("auth-"))
        .reduce((total, fact) => total + fact.count, 0),
    });
  }
}

/**
 * Finite semantic port. The segment plan cannot submit arbitrary selectors,
 * URLs, CSS properties, DOM text, or browser-evaluation sources to the real
 * Playwright transport. Locator details and bounded DOM observations belong to
 * the private implementation in `browser-page-driver.ts`.
 */
export interface Task105L05PageDriver {
  createMenuForFixture(fixturePage: Task105L05FixturePage): Promise<{ readonly menuId: string }>;
  configureSiteShellNavigation(menuId: string): Promise<void>;
  applyMenuDesignFontSizeTwenty(): Promise<void>;
  createConfigureSaveQuickActions(): Promise<void>;
  reloadDashboardAndSealNextBootstrap(): Promise<void>;
  assertPersistedQuickActions(): Promise<void>;
  openSolutionKitGuide(): Promise<void>;
  prepareDirtyDashboardDraft(): Promise<void>;
  persistRemoteDashboardMutation(): Promise<void>;
  assertStaleDirtyDraft(): Promise<void>;
  assertPublicMenuParity(fixturePage: Task105L05FixturePage): Promise<void>;
  screenshot(scenarioId: Task105L05ScenarioId): Promise<void>;
}

export interface Task105L05SegmentContext {
  readonly fixturePage: Task105L05FixturePage;
  readonly driver: Task105L05PageDriver;
  readonly observer: Task105L05PageObserver;
}

function requireSealed(observer: Task105L05PageObserver): void {
  if (!observer.isSealed()) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 bootstrap facts did not seal");
  }
}

const SCENARIO_IDS = Object.freeze([
  "menu-structure-save-publish-parity",
  "menu-design-appearance-visible-effect",
  "dashboard-edit-configure-save",
  "dashboard-dirty-remote-stale",
  "solution-kit-select-reviewed-handoff",
] as const);

/**
 * Executes the five real user-visible flows. Page B is deliberately absent from
 * the API until Page A has a dirty dashboard draft; the lazy opener is one-shot
 * and returns a separately sealed Page-B context.
 */
export async function executeTask105L05Segments(input: {
  readonly pageA: Task105L05SegmentContext;
  readonly openPageB: () => Promise<Task105L05SegmentContext>;
  readonly bindUiMenuId: (menuId: string) => void;
  readonly claimSiteShellRows: (menuId: string) => Promise<void>;
}): Promise<{
  readonly receiptA: Task105L05BrowserReceipt;
  readonly receiptB: Task105L05BrowserReceipt;
  readonly createdMenuId: string;
}> {
  const { pageA, openPageB, bindUiMenuId } = input;
  requireSealed(pageA.observer);

  // Scenario 1 setup: the fixture page was created by the fixture only; this
  // menu is created through the real Menus UI and bound immediately for cleanup.
  const created = await pageA.driver.createMenuForFixture(pageA.fixturePage);
  if (typeof created.menuId !== "string" || created.menuId.length === 0) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 UI menu identity is invalid");
  }
  bindUiMenuId(created.menuId);
  await pageA.driver.configureSiteShellNavigation(created.menuId);
  await input.claimSiteShellRows(created.menuId);

  // Scenario 2: native range keyboard interaction plus computed visible proof.
  await pageA.driver.applyMenuDesignFontSizeTwenty();
  await pageA.driver.screenshot("menu-design-appearance-visible-effect");

  // Scenario 3: real Quick Actions widget configure/save and the single A reload.
  await pageA.driver.createConfigureSaveQuickActions();
  await pageA.driver.reloadDashboardAndSealNextBootstrap();
  requireSealed(pageA.observer);
  if (pageA.observer.epochCount() !== 2) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 Page A reload bootstrap is absent");
  }
  await pageA.driver.assertPersistedQuickActions();
  await pageA.driver.screenshot("dashboard-edit-configure-save");

  // Scenario 5 executes while Page A is still the sole authenticated document.
  await pageA.driver.openSolutionKitGuide();
  await pageA.driver.screenshot("solution-kit-select-reviewed-handoff");

  // Scenario 4: an unsaved A draft must exist before B can open.
  await pageA.driver.prepareDirtyDashboardDraft();
  const pageB = await openPageB();
  requireSealed(pageB.observer);
  if (pageB.observer.epochCount() !== 1) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-105 L05 Page B bootstrap topology is invalid"
    );
  }
  await pageB.driver.persistRemoteDashboardMutation();
  await pageA.driver.assertStaleDirtyDraft();
  await pageA.driver.screenshot("dashboard-dirty-remote-stale");

  // Public navigation happens only after all authenticated work is complete.
  await pageA.driver.assertPublicMenuParity(pageA.fixturePage);
  await pageA.driver.screenshot("menu-structure-save-publish-parity");

  return Object.freeze({
    receiptA: pageA.observer.produceReceipt(SCENARIO_IDS),
    receiptB: pageB.observer.produceReceipt(SCENARIO_IDS),
    createdMenuId: created.menuId,
  });
}
