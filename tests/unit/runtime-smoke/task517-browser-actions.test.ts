import { describe, expect, test } from "bun:test";

import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import {
  TASK517_FIXTURE_KINDS,
  TASK517_SCENARIOS,
  TASK517_SCENARIO_IDS,
  TASK517_SCENARIO_VARIANTS,
  assertTask517BrowserReceipt,
  buildTask517BrowserActionConfig,
  buildTask517FixtureSpecs,
  buildTask517ScenarioAssertions,
  deriveTask517FixtureSpec,
  materializeTask517BrowserAction,
  type Task517BrowserActionConfig,
  type Task517BrowserReceipt,
  type Task517ScenarioId,
} from "../../../scripts/runtime-smoke/adapters/task-517/browser-actions";
import { buildTask517AdminVariantAssertions } from "../../../scripts/runtime-smoke/adapters/task-517/admin-actions";
import { buildTask517PublicVariantAssertions } from "../../../scripts/runtime-smoke/adapters/task-517/public-actions";

function fixtureSpecs() {
  return {
    public: deriveTask517FixtureSpec("unit1", "task-517-fixture-1"),
    private: deriveTask517FixtureSpec("unit1", "task-517-fixture-2"),
    passA: deriveTask517FixtureSpec("unit1", "task-517-fixture-3"),
    passB: deriveTask517FixtureSpec("unit1", "task-517-fixture-4"),
  };
}

function configInput(
  overrides: Partial<Parameters<typeof buildTask517BrowserActionConfig>[0]> = {}
) {
  return {
    scenarioId: "publish-front-admin-parity" as Task517ScenarioId,
    theme: "light" as const,
    runMarker: "unit1",
    fixtures: fixtureSpecs(),
    contentTypeSlug: "posts",
    contentTypeName: "Post",
    entryIds: { public: "e1", private: "e2", passA: "e3", passB: "e4" },
    adminPath: "/admin",
    adminEmail: "admin@example.com",
    adminPassword: "unit-secret",
    screenshotPath: null,
    ...overrides,
  };
}

/** Complete receipt with all pinned keys; overrides let tests break invariants. */
function validReceipt(overrides: Partial<Record<string, unknown>> = {}): Task517BrowserReceipt {
  const receipt: Record<string, unknown> = {
    scenarioId: "publish-front-admin-parity",
    theme: "light",
    consoleErrors: [],
    pageErrors: [],
    anonPublicStatus: 200,
    anonPublicSecondStatus: 200,
    anonPublicFirstMs: 5,
    anonPublicSecondMs: 2,
    anonPublicSecondFaster: true,
    anonPublicBodyMatches: true,
    anonPublicH1: "public title",
    anonPublicPreVisible: true,
    anonPublicPreHeight: 12,
    privateAnonStatus: 404,
    missingAnonStatus: 404,
    privateAnonBodyEqualMissing: true,
    privateAnonBodyIsNotFound: true,
    adminAuthedStatus: 200,
    adminAuthedH1: "private title",
    adminAuthedPreVisible: true,
    darkAuthedH1: "private title",
    darkAuthedPreVisible: true,
    passAInitialH1: "pass-a title",
    passAInitialPrompt: true,
    passAInitialHasMarker: false,
    wrongUnlockStatus: 401,
    wrongRetryPrompt: true,
    passAUnlockedStatus: 302,
    passAUnlockedH1: "pass-a title",
    passAUnlockedPreVisible: true,
    passAUnlockedHasMarker: true,
    passAUnlockedReloadH1: "pass-a title",
    passBInitialH1: "pass-b title",
    passBInitialPrompt: true,
    passBInitialHasMarkerA: false,
    passBInitialHasMarkerB: false,
    passBUnlockedH1: "pass-b title",
    passBUnlockedPreVisible: true,
    passBUnlockedHasMarkerB: true,
    passBUnlockedReloadH1: "pass-b title",
    passBUnlockedStatus: 302,
    ungatedAStatus: 200,
    ungatedAIsPrompt: true,
    ungatedAHasMarker: false,
    ungatedPrivateStatus: 404,
    ungatedPrivateIsNotFound: true,
    listH1: "Post",
    listHasPublicLink: true,
    listHasPrivateLink: false,
    listHasPassALink: false,
    listHasPassBLink: false,
    listEmptyMarkerAbsent: true,
    searchStatus: 200,
    searchHasPublic: true,
    searchHasPrivate: false,
    searchHasPassA: false,
    searchHasPassB: false,
    editorHeading: "Edit Post",
    editorTitleValue: "TASK-517 private unit1",
    editorTitleVisible: true,
    editorSlugValue: "task517-private-unit1",
    editorSlugVisible: true,
    darkEditorTitleValue: "TASK-517 private unit1",
    darkEditorTitleVisible: true,
    darkEditorSlugValue: "task517-private-unit1",
    darkEditorSlugVisible: true,
    ...overrides,
  };
  return receipt as Task517BrowserReceipt;
}

describe("TASK-517 fixtures module", () => {
  test("identity matrix is stable", () => {
    expect(buildTask517FixtureSpecs()).toEqual([
      { fixtureId: "task-517-fixture-1", kind: "public" },
      { fixtureId: "task-517-fixture-2", kind: "private" },
      { fixtureId: "task-517-fixture-3", kind: "password-a" },
      { fixtureId: "task-517-fixture-4", kind: "password-b" },
    ]);
    expect(TASK517_FIXTURE_KINDS).toEqual(["public", "private", "password-a", "password-b"]);
  });

  test("deriveTask517FixtureSpec derives marker-scoped slugs, titles and passwords", () => {
    const publicSpec = deriveTask517FixtureSpec("unit1", "task-517-fixture-1");
    expect(publicSpec.kind).toBe("public");
    expect(publicSpec.slug).toBe("task517-public-unit1");
    expect(publicSpec.title).toBe("TASK-517 public unit1");
    expect(publicSpec.bodyMarker).toMatch(/^[a-f0-9]{20}$/u);
    expect(publicSpec.accessPassword).toBeNull();

    const passSpec = deriveTask517FixtureSpec("unit1", "task-517-fixture-3");
    expect(passSpec.kind).toBe("password-a");
    expect(passSpec.slug).toBe("task517-pass-a-unit1");
    expect(passSpec.accessPassword).toBe("task517-pass-a-unit1");

    const privateSpec = deriveTask517FixtureSpec("unit1", "task-517-fixture-2");
    expect(privateSpec.accessPassword).toBeNull();
  });

  test("markers are deterministic per marker and fixture id", () => {
    const a1 = deriveTask517FixtureSpec("m", "task-517-fixture-1").bodyMarker;
    const a2 = deriveTask517FixtureSpec("m", "task-517-fixture-1").bodyMarker;
    const b = deriveTask517FixtureSpec("m", "task-517-fixture-2").bodyMarker;
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  test("unregistered fixture id fails closed", () => {
    expect(() => deriveTask517FixtureSpec("m", "task-517-fixture-99")).toThrow(SmokeError);
  });
});

describe("TASK-517 scenarios module", () => {
  test("scenario ids and descriptors are consistent", () => {
    expect(TASK517_SCENARIO_IDS).toHaveLength(6);
    expect(TASK517_SCENARIOS.map((descriptor) => descriptor.id)).toEqual(
      Array.from(TASK517_SCENARIO_IDS)
    );
    for (const descriptor of TASK517_SCENARIOS) {
      expect(TASK517_FIXTURE_KINDS).toContain(descriptor.fixtureKind);
    }
  });

  test("every variant id is unique and every scenario has at least one variant", () => {
    const allIds: string[] = [];
    for (const scenarioId of TASK517_SCENARIO_IDS) {
      const variants = TASK517_SCENARIO_VARIANTS[scenarioId];
      expect(variants.length).toBeGreaterThan(0);
      for (const variant of variants) {
        expect(variant.surface).toBeOneOf(["admin", "public"]);
        expect(variant.theme).toBeOneOf(["light", "dark"]);
        expect(variant.viewport.width).toBeGreaterThan(0);
        allIds.push(variant.id);
      }
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("TASK-517 config module", () => {
  test("builds marker-derived origins, urls, labels and passwords", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    expect(cfg.frontOrigin).toBe("http://127.0.0.1:3000");
    expect(cfg.adminOrigin).toBe("http://127.0.0.1:5173");
    expect(cfg.editorLabel).toBe("Edit Post");
    expect(cfg.urls.public).toBe("http://127.0.0.1:3000/content/posts/task517-public-unit1");
    expect(cfg.urls.editor).toBe("http://127.0.0.1:5173/admin/advanced/entries/posts/e2");
    expect(cfg.urls.search).toBe(
      "http://127.0.0.1:5173/admin/api/search/public-preview?q=task+public+unit1"
    );
    expect(cfg.passwords.passA).toBe("task517-pass-a-unit1");
    expect(cfg.passwords.wrong).toBe("task517-0000-wrong-password");
    expect(cfg.titles.public).toBe("TASK-517 public unit1");
  });

  test("rejects unregistered scenario variants", () => {
    expect(() =>
      buildTask517BrowserActionConfig(
        configInput({ scenarioId: "password-unlock-cycle", theme: "dark" })
      )
    ).toThrow(SmokeError);
    // An unregistered scenario id crashes fail-closed before variant lookup; the
    // materialize/receipt layers guard with SmokeError. Preserve original behavior.
    expect(() =>
      buildTask517BrowserActionConfig(
        configInput({ scenarioId: "no-such-scenario" as Task517ScenarioId })
      )
    ).toThrow();
  });
});

describe("TASK-517 materialize module", () => {
  test("materializes a compilable async browser action", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    const script = materializeTask517BrowserAction(cfg);
    const compiled = new Function(`return ${script}`)() as (page: unknown) => Promise<unknown>;
    expect(typeof compiled).toBe("function");
  });

  test("rejects drifted configs fail-closed", () => {
    const base = buildTask517BrowserActionConfig(configInput());
    expect(() =>
      materializeTask517BrowserAction({ ...base, scenarioId: "unknown" as Task517ScenarioId })
    ).toThrow(SmokeError);
    expect(() => materializeTask517BrowserAction({ ...base, theme: "sepia" as never })).toThrow(
      SmokeError
    );
    expect(() =>
      materializeTask517BrowserAction({ ...base, screenshotPath: "screenshot.txt" })
    ).toThrow(SmokeError);
    expect(() =>
      materializeTask517BrowserAction({ ...base, screenshotPath: "../escape.png" })
    ).toThrow(SmokeError);
  });
});

describe("TASK-517 receipt module", () => {
  test("accepts a valid receipt", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    const receipt = validReceipt();
    expect(() => assertTask517BrowserReceipt(receipt, cfg)).not.toThrow();
  });

  test("rejects an exact-keys drift", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    const receipt = validReceipt() as Record<string, unknown>;
    delete receipt.listH1;
    expect(() => assertTask517BrowserReceipt(receipt, cfg)).toThrow(/keys are invalid/u);
  });

  test("rejects console errors and page errors", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    expect(() =>
      assertTask517BrowserReceipt(validReceipt({ consoleErrors: ["boom"] }), cfg)
    ).toThrow(/console errors surfaced/u);
    expect(() => assertTask517BrowserReceipt(validReceipt({ pageErrors: ["boom"] }), cfg)).toThrow(
      /console errors surfaced/u
    );
  });

  test("rejects scenario invariant violations", () => {
    const cfg = buildTask517BrowserActionConfig(configInput());
    expect(() =>
      assertTask517BrowserReceipt(validReceipt({ searchHasPublic: false }), cfg)
    ).toThrow(/parity proof failed/u);
    expect(() =>
      assertTask517BrowserReceipt(
        validReceipt({ scenarioId: "publish-front-admin-parity", theme: "dark" }),
        cfg
      )
    ).toThrow(/theme drifted/u);
  });
});

describe("TASK-517 assertion builders", () => {
  test("every registered variant receives assertions for every scenario", () => {
    for (const scenarioId of TASK517_SCENARIO_IDS) {
      const receipt = validReceipt({ scenarioId });
      const variants = buildTask517ScenarioAssertions(scenarioId, receipt);
      expect(variants.map((variant) => variant.id).sort()).toEqual(
        TASK517_SCENARIO_VARIANTS[scenarioId].map((variant) => variant.id).sort()
      );
      for (const variant of variants) {
        expect(variant.assertions.length).toBeGreaterThan(0);
        for (const assertion of variant.assertions) {
          expect(assertion.kind).toBeOneOf(["computed-style", "geometry", "dom-state", "aria"]);
          expect(assertion.pass).toBe(true);
        }
        expect(variant.consoleErrors).toEqual([]);
      }
    }
  });

  test("public and admin builders together cover exactly the registered variants", () => {
    const receipt = validReceipt();
    const covered = new Set<string>();
    for (const scenarioId of TASK517_SCENARIO_IDS) {
      for (const variantId of Object.keys(
        buildTask517PublicVariantAssertions(scenarioId, receipt)
      )) {
        covered.add(variantId);
      }
      for (const variantId of Object.keys(
        buildTask517AdminVariantAssertions(scenarioId, receipt)
      )) {
        covered.add(variantId);
      }
    }
    const registered = new Set<string>();
    for (const scenarioId of TASK517_SCENARIO_IDS) {
      for (const variant of TASK517_SCENARIO_VARIANTS[scenarioId]) {
        registered.add(variant.id);
      }
    }
    expect(covered).toEqual(registered);
  });

  test("unregistered scenario fails closed", () => {
    expect(() =>
      buildTask517ScenarioAssertions("no-such-scenario" as Task517ScenarioId, validReceipt())
    ).toThrow(SmokeError);
  });

  test("config input shape stays stable for adapter consumers", () => {
    const cfg: Task517BrowserActionConfig = buildTask517BrowserActionConfig(configInput());
    expect(cfg.urls.passB).toContain("task517-pass-b-unit1");
    expect(cfg.urls.missing).toContain("task517-missing-unit1");
  });
});
